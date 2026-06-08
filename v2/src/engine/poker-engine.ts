import type { Card } from '@/types/card';
import type {
  GamePhase, Street, Seat, GameState, PlayerAction,
  ActionPayload, HandResult, GameMode, DecisionRecord,
} from '@/types/game';
import { shuffleDeck, removeCards } from './deck';
import { bestHand } from './hand-eval';
import { calculatePots, distributePot } from './pot-manager';
import { calculateEV } from './ev-calc';
import { DEFAULT_BIG_BLIND, DEFAULT_SMALL_BLIND, DEFAULT_STARTING_CHIPS } from './constants';

export type EngineEvent =
  | { type: 'phaseChange'; phase: GamePhase }
  | { type: 'cardDealt'; seatId: string; card: Card; index: number }
  | { type: 'communityDealt'; cards: Card[]; street: Street }
  | { type: 'action'; seatId: string; action: PlayerAction; amount: number }
  | { type: 'turnStarted'; seatId: string }
  | { type: 'potUpdated'; amount: number }
  | { type: 'showdown'; results: { seatId: string; cards: Card[]; handName: string }[] }
  | { type: 'handResult'; result: HandResult }
  | { type: 'feedback'; record: DecisionRecord };

type EventCallback = (e: EngineEvent) => void;

export class PokerEngine {
  private state: GameState;
  private deck: Card[] = [];
  private listeners: EventCallback[] = [];
  private decisionRecords: DecisionRecord[] = [];
  private bb = DEFAULT_BIG_BLIND;
  private sb = DEFAULT_SMALL_BLIND;

  constructor(mode: GameMode = 'learning') {
    this.state = {
      phase: 'idle',
      seats: [],
      community: [],
      pot: 0,
      pots: [],
      currentBet: 0,
      minRaise: 0,
      dealerIndex: 0,
      activeSeatIndex: -1,
      street: 'preflop',
      handNumber: 0,
      bigBlind: this.bb,
      smallBlind: this.sb,
      mode,
    };
  }

  subscribe(cb: EventCallback): () => void {
    this.listeners.push(cb);
    return () => {
      const i = this.listeners.indexOf(cb);
      if (i >= 0) this.listeners.splice(i, 1);
    };
  }

  private emit(e: EngineEvent): void {
    for (const cb of this.listeners) cb(e);
  }

  getState(): GameState {
    return this.state;
  }

  getPhase(): GamePhase {
    return this.state.phase;
  }

  getDecisionRecords(): DecisionRecord[] {
    return [...this.decisionRecords];
  }

  clearDecisionRecords(): void {
    this.decisionRecords = [];
  }

  // ==================== Setup ====================

  setBlinds(bb: number, sb: number): void {
    this.bb = bb;
    this.sb = sb;
    this.state.bigBlind = bb;
    this.state.smallBlind = sb;
  }

  addSeat(seat: Seat): void {
    this.state.seats.push(seat);
  }

  setDealer(index: number): void {
    this.state.dealerIndex = index % this.state.seats.length;
    this.assignPositions();
  }

  private assignPositions(): void {
    const n = this.state.seats.length;
    const d = this.state.dealerIndex;
    if (n === 2) {
      this.state.seats[d].position = 'SB';
      this.state.seats[(d + 1) % n].position = 'BB';
    } else {
      this.state.seats[(d + 1) % n].position = 'SB';
      this.state.seats[(d + 2) % n].position = 'BB';
      this.state.seats[(d + 3) % n].position = 'UTG';
      if (n >= 5) this.state.seats[(d + 4) % n].position = 'MP';
      if (n >= 6) this.state.seats[(d + 5) % n].position = 'CO';
      this.state.seats[d].position = 'BTN';
    }
  }

  // ==================== Hand Lifecycle ====================

  async startHand(): Promise<void> {
    if (this.state.phase !== 'idle' && this.state.phase !== 'result') {
      throw new Error(`Cannot start hand from phase ${this.state.phase}`);
    }

    this.state.handNumber++;
    this.state.community = [];
    this.state.pot = 0;
    this.state.pots = [];
    this.state.currentBet = 0;
    this.state.minRaise = this.bb;
    this.state.street = 'preflop';
    this.decisionRecords = [];

    // Reset seat state
    for (const seat of this.state.seats) {
      seat.holeCards = [];
      seat.currentBet = 0;
      seat.totalBetThisHand = 0;
      seat.folded = false;
      seat.allIn = false;
      seat.actedThisRound = false;
    }

    this.setPhase('dealing');

    // Shuffle
    this.deck = shuffleDeck();

    // Deal hole cards
    const activeSeats = this.state.seats.filter(s => s.chips > 0);
    for (let i = 0; i < 2; i++) {
      for (const seat of activeSeats) {
        const card = this.deck.pop()!;
        seat.holeCards.push(card);
        this.emit({ type: 'cardDealt', seatId: seat.id, card, index: i });
      }
    }

    // Post blinds — index against state.seats (dealerIndex semantics), not activeSeats
    const n = this.state.seats.length;
    const nextEligible = (start: number): number => {
      let i = start % n;
      for (let k = 0; k < n; k++) {
        if (this.state.seats[i].chips > 0 && this.state.seats[i].holeCards.length === 2) return i;
        i = (i + 1) % n;
      }
      return start % n;
    };

    const numActive = activeSeats.length;
    let sbIdx: number;
    let bbIdx: number;
    let firstActorIdx: number;
    if (numActive === 2) {
      // Heads-up: dealer is SB, other is BB, dealer acts first preflop
      sbIdx = nextEligible(this.state.dealerIndex);
      bbIdx = nextEligible(sbIdx + 1);
      firstActorIdx = sbIdx;
    } else {
      sbIdx = nextEligible(this.state.dealerIndex + 1);
      bbIdx = nextEligible(sbIdx + 1);
      firstActorIdx = nextEligible(bbIdx + 1);
    }

    this.postBet(this.state.seats[sbIdx], Math.min(this.sb, this.state.seats[sbIdx].chips));
    this.postBet(this.state.seats[bbIdx], Math.min(this.bb, this.state.seats[bbIdx].chips));

    this.state.currentBet = this.bb;
    this.state.minRaise = this.bb;

    // Set active to one before first actor, so proceedToNextActor lands on it
    this.state.activeSeatIndex = (firstActorIdx - 1 + n) % n;

    this.setPhase('preflop');
    await this.proceedToNextActor();
  }

  private setPhase(phase: GamePhase): void {
    this.state.phase = phase;
    this.emit({ type: 'phaseChange', phase });
  }

  // ==================== Betting Actions ====================

  async playerAction(payload: ActionPayload): Promise<void> {
    const seat = this.state.seats[this.state.activeSeatIndex];
    if (!seat || seat.id !== payload.seatId) {
      throw new Error('Not your turn');
    }

    // Record EV before executing action
    if (seat.isHuman && this.state.mode !== 'competitive') {
      this.recordDecision(seat, payload.action, payload.amount || 0);
    }

    await this.executeAction(seat, payload.action, payload.amount || 0);
  }

  private async executeAction(seat: Seat, action: PlayerAction, amount: number): Promise<void> {
    const toCall = this.state.currentBet - seat.currentBet;

    switch (action) {
      case 'fold':
        seat.folded = true;
        seat.actedThisRound = true;
        this.emit({ type: 'action', seatId: seat.id, action, amount: 0 });
        break;

      case 'check':
        if (toCall > 0) {
          // Invalid check, convert to call
          await this.executeAction(seat, 'call', 0);
          return;
        }
        seat.actedThisRound = true;
        this.emit({ type: 'action', seatId: seat.id, action, amount: 0 });
        break;

      case 'call':
        if (toCall <= 0) {
          seat.actedThisRound = true;
          this.emit({ type: 'action', seatId: seat.id, action: 'check', amount: 0 });
        } else {
          this.postBet(seat, Math.min(toCall, seat.chips));
          seat.actedThisRound = true;
          this.emit({ type: 'action', seatId: seat.id, action, amount: toCall });
        }
        break;

      case 'raise': {
        const minRaise = this.state.currentBet + this.state.minRaise;
        const actualRaise = Math.max(amount, minRaise);
        const totalNeeded = actualRaise - seat.currentBet;

        if (totalNeeded >= seat.chips) {
          // Not enough chips, convert to all-in
          await this.executeAction(seat, 'allin', 0);
          return;
        }

        this.postBet(seat, totalNeeded);
        this.state.minRaise = actualRaise - this.state.currentBet;
        this.state.currentBet = actualRaise;
        this.resetActedThisRound(seat.id);
        seat.actedThisRound = true;
        this.emit({ type: 'action', seatId: seat.id, action, amount: actualRaise });
        break;
      }

      case 'allin': {
        const allInAmount = seat.chips;
        const totalBet = seat.currentBet + allInAmount;
        if (totalBet > this.state.currentBet) {
          const raiseSize = totalBet - this.state.currentBet;
          if (raiseSize > this.state.minRaise) {
            this.state.minRaise = raiseSize;
          }
          this.state.currentBet = totalBet;
          this.resetActedThisRound(seat.id);
        }
        this.postBet(seat, allInAmount);
        seat.allIn = true;
        seat.actedThisRound = true;
        this.emit({ type: 'action', seatId: seat.id, action, amount: totalBet });
        break;
      }
    }

    await this.delay(200);
    await this.proceedToNextActor();
  }

  private postBet(seat: Seat, amount: number): void {
    const actual = Math.min(amount, seat.chips);
    seat.chips -= actual;
    seat.currentBet += actual;
    seat.totalBetThisHand += actual;
    this.state.pot += actual;
    this.emit({ type: 'potUpdated', amount: this.state.pot });
  }

  private resetActedThisRound(exceptSeatId: string): void {
    for (const s of this.state.seats) {
      if (s.id !== exceptSeatId && !s.folded && !s.allIn) {
        s.actedThisRound = false;
      }
    }
  }

  private async proceedToNextActor(): Promise<void> {
    const active = this.state.seats.filter(s => !s.folded && s.chips >= 0);
    const notAllIn = active.filter(s => !s.allIn);

    // If only one player left, they win
    if (active.length === 1) {
      await this.endHand('fold');
      return;
    }

    // Betting round complete check.
    // Special case: if 0 or 1 player can still act, but a non-allin player owes
    // chips to match currentBet, they still get one decision (call/fold).
    if (notAllIn.length === 0 || this.isBettingRoundComplete()) {
      await this.advanceStreet();
      return;
    }
    if (notAllIn.length === 1) {
      const last = notAllIn[0];
      if (last.actedThisRound && last.currentBet >= this.state.currentBet) {
        await this.advanceStreet();
        return;
      }
    }

    // Find next actor
    const n = this.state.seats.length;
    let idx = this.state.activeSeatIndex;
    let found = false;
    for (let i = 0; i < n; i++) {
      idx = (idx + 1) % n;
      const seat = this.state.seats[idx];
      if (!seat.folded && !seat.allIn && seat.chips > 0) {
        found = true;
        break;
      }
    }

    if (!found) {
      await this.advanceStreet();
      return;
    }

    this.state.activeSeatIndex = idx;
    const seat = this.state.seats[idx];
    this.emit({ type: 'turnStarted', seatId: seat.id });
  }

  private isBettingRoundComplete(): boolean {
    const active = this.state.seats.filter(s => !s.folded && !s.allIn);
    if (active.length === 0) return true;

    // Everyone must have acted and matched current bet
    for (const seat of active) {
      if (!seat.actedThisRound) return false;
      if (seat.currentBet < this.state.currentBet) return false;
    }
    return true;
  }

  // ==================== Street Advancement ====================

  private async advanceStreet(): Promise<void> {
    // Collect bets into pots
    this.state.pots = calculatePots(this.state.seats);

    // Reset bets for next street
    for (const seat of this.state.seats) {
      seat.currentBet = 0;
      seat.actedThisRound = false;
    }
    this.state.currentBet = 0;
    this.state.minRaise = this.bb;

    const active = this.state.seats.filter(s => !s.folded);

    switch (this.state.street) {
      case 'preflop':
        this.state.street = 'flop';
        this.setPhase('flop');
        await this.dealCommunity(3);
        break;
      case 'flop':
        this.state.street = 'turn';
        this.setPhase('turn');
        await this.dealCommunity(1);
        break;
      case 'turn':
        this.state.street = 'river';
        this.setPhase('river');
        await this.dealCommunity(1);
        break;
      case 'river':
        await this.endHand('showdown');
        return;
    }

    // Find first actor postflop: first active after dealer
    const n = this.state.seats.length;
    let firstIdx = (this.state.dealerIndex + 1) % n;
    while (this.state.seats[firstIdx].folded) {
      firstIdx = (firstIdx + 1) % n;
    }
    this.state.activeSeatIndex = (firstIdx - 1 + n) % n;
    await this.proceedToNextActor();
  }

  private async dealCommunity(count: number): Promise<void> {
    const cards: Card[] = [];
    for (let i = 0; i < count; i++) {
      cards.push(this.deck.pop()!);
    }
    this.state.community.push(...cards);
    this.emit({ type: 'communityDealt', cards, street: this.state.street });
  }

  // ==================== Hand End ====================

  private async endHand(reason: 'fold' | 'showdown'): Promise<void> {
    this.setPhase('showdown');

    const activeSeats = this.state.seats.filter(s => !s.folded);

    if (reason === 'fold') {
      // Single winner
      const winner = activeSeats[0];
      const pots = calculatePots(this.state.seats);
      let totalWon = 0;
      for (const p of pots) totalWon += p.amount;
      winner.chips += totalWon;

      this.emit({
        type: 'handResult',
        result: {
          winnerIds: [winner.id],
          potAmount: totalWon,
          handName: '对手弃牌',
          handScore: [],
          showdown: [],
        },
      });
    } else {
      // Showdown: evaluate all hands
      const seatScores = new Map<string, number[]>();
      const showdown: { seatId: string; cards: Card[]; handName: string }[] = [];

      for (const seat of activeSeats) {
        const hand = bestHand(seat.holeCards, this.state.community);
        seatScores.set(seat.id, hand.score);
        showdown.push({ seatId: seat.id, cards: seat.holeCards, handName: hand.name });
      }

      const pots = calculatePots(this.state.seats);
      const winnings = distributePot(pots, seatScores);

      for (const [seatId, amount] of winnings) {
        const seat = this.state.seats.find(s => s.id === seatId)!;
        seat.chips += amount;
      }

      // Find best hand for display
      let bestScore: number[] | null = null;
      for (const [, score] of seatScores) {
        if (!bestScore || score[0] > bestScore[0]) bestScore = score;
      }
      const winnerIds = [...seatScores.entries()]
        .filter(([, s]) => s[0] === bestScore![0])
        .map(([id]) => id);

      this.emit({ type: 'showdown', results: showdown });
      this.emit({
        type: 'handResult',
        result: {
          winnerIds,
          potAmount: this.state.pot,
          handName: showdown.find(s => winnerIds.includes(s.seatId))?.handName || '',
          handScore: bestScore || [],
          showdown,
        },
      });
    }

    this.setPhase('result');
  }

  // ==================== EV Recording ====================

  private recordDecision(seat: Seat, action: PlayerAction, amount: number): void {
    const toCall = this.state.currentBet - seat.currentBet;
    const ev = calculateEV(
      seat.holeCards,
      this.state.community,
      this.state.pot,
      toCall,
      seat.chips,
      this.bb
    );

    let evActual = 0;
    switch (action) {
      case 'fold': evActual = ev.fold; break;
      case 'check': evActual = 0; break;
      case 'call': evActual = ev.call; break;
      case 'raise':
        if (amount >= seat.chips) evActual = ev.raiseAllIn;
        else if (amount >= this.state.pot) evActual = ev.raisePot;
        else evActual = ev.raiseHalfPot;
        break;
      case 'allin': evActual = ev.raiseAllIn; break;
    }

    const record: DecisionRecord = {
      street: this.state.street,
      action,
      amount,
      evActual,
      evOptimal: ev.optimal.ev,
      evDifference: evActual - ev.optimal.ev,
      equity: ev.equity,
      potOdds: ev.potOdds,
      optimalAction: ev.optimal.action,
      optimalAmount: ev.optimal.amount,
    };

    this.decisionRecords.push(record);
    this.emit({ type: 'feedback', record });
  }

  // ==================== Utility ====================

  private delay(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }

  getActiveSeat(): Seat | null {
    if (this.state.activeSeatIndex < 0) return null;
    return this.state.seats[this.state.activeSeatIndex] || null;
  }

  getHumanSeat(): Seat | null {
    return this.state.seats.find(s => s.isHuman) || null;
  }

  getOpponentSeats(): Seat[] {
    return this.state.seats.filter(s => !s.isHuman);
  }

  getCallAmount(): number {
    const active = this.getActiveSeat();
    if (!active) return 0;
    return this.state.currentBet - active.currentBet;
  }

  getMinRaise(): number {
    return this.state.currentBet + this.state.minRaise;
  }

  rotateDealer(): void {
    this.state.dealerIndex = (this.state.dealerIndex + 1) % this.state.seats.length;
    this.assignPositions();
  }

  reset(): void {
    this.state.phase = 'idle';
    this.state.community = [];
    this.state.pot = 0;
    this.state.pots = [];
    this.state.currentBet = 0;
    this.state.minRaise = this.bb;
    this.state.activeSeatIndex = -1;
    this.state.handNumber = 0;
    this.decisionRecords = [];
    for (const seat of this.state.seats) {
      seat.holeCards = [];
      seat.currentBet = 0;
      seat.totalBetThisHand = 0;
      seat.folded = false;
      seat.allIn = false;
      seat.actedThisRound = false;
    }
  }
}
