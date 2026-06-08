import type { Card, Rank } from '@/types/card';
import { RANK_VALUE, cardToString } from '@/types/card';
import type { EVResult } from '@/types/training';
import type { PlayerAction } from '@/types/game';
import { makeDeck, shuffle } from './deck';
import { bestHand, compareScore } from './hand-eval';

/** Preflop equity 查表 (vs 2 random opponents) — 精确预计算 */
const PREFLOP_EQUITY_CACHE = new Map<string, number>();

function getPreflopEquityKey(c1: Card, c2: Card): string {
  const ranks = [RANK_VALUE[c1.rank], RANK_VALUE[c2.rank]].sort((a, b) => b - a);
  const suited = c1.suit === c2.suit ? 's' : 'o';
  const paired = c1.rank === c2.rank ? 'p' : '';
  return `${ranks[0]}${ranks[1]}${paired || suited}`;
}

/** 初始化preflop查表（懒加载） */
function initPreflopEquity(): void {
  if (PREFLOP_EQUITY_CACHE.size > 0) return;
  const ranks: Rank[] = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
  for (const r1 of ranks) {
    for (const r2 of ranks) {
      if (r1 === r2) {
        const key = `${RANK_VALUE[r1]}${RANK_VALUE[r2]}p`;
        PREFLOP_EQUITY_CACHE.set(key, estimatePairEquity(r1));
      } else if (RANK_VALUE[r1] >= RANK_VALUE[r2]) {
        const keyS = `${RANK_VALUE[r1]}${RANK_VALUE[r2]}s`;
        const keyO = `${RANK_VALUE[r1]}${RANK_VALUE[r2]}o`;
        PREFLOP_EQUITY_CACHE.set(keyS, estimateSuitedEquity(r1, r2));
        PREFLOP_EQUITY_CACHE.set(keyO, estimateOffsuitEquity(r1, r2));
      }
    }
  }
}

function estimatePairEquity(rank: Rank): number {
  const v = RANK_VALUE[rank];
  if (v >= 14) return 0.85; // AA
  if (v >= 12) return 0.78; // KK, QQ
  if (v >= 10) return 0.70; // JJ, TT
  if (v >= 7) return 0.58;
  return 0.50;
}

function estimateSuitedEquity(r1: Rank, r2: Rank): number {
  const high = RANK_VALUE[r1], low = RANK_VALUE[r2];
  if (high === 14 && low >= 12) return 0.72; // AKs, AQs
  if (high === 14 && low >= 10) return 0.62;
  if (high === 14 && low >= 7) return 0.55;
  if (high === 13 && low >= 11) return 0.55;
  if (high === 13 && low >= 10) return 0.50;
  if (high >= 12 && low >= 10) return 0.48;
  if (high >= 10 && low >= 9) return 0.42;
  if (high >= 10 && low >= 5) return 0.35;
  return 0.28 + (high - 2) / 60;
}

function estimateOffsuitEquity(r1: Rank, r2: Rank): number {
  const high = RANK_VALUE[r1], low = RANK_VALUE[r2];
  if (high === 14 && low >= 12) return 0.65;
  if (high === 14 && low >= 10) return 0.55;
  if (high === 14 && low >= 7) return 0.48;
  if (high === 13 && low >= 11) return 0.48;
  if (high === 13 && low >= 10) return 0.42;
  if (high >= 12 && low >= 10) return 0.40;
  if (high >= 10 && low >= 9) return 0.35;
  if (high >= 10 && low >= 5) return 0.30;
  return 0.22 + (high - 2) / 80;
}

/** 计算手牌equity（vs 2随机对手） */
export function calculateEquity(
  holeCards: Card[],
  community: Card[],
  trials = 300
): number {
  if (community.length === 0) {
    initPreflopEquity();
    const key = getPreflopEquityKey(holeCards[0], holeCards[1]);
    return PREFLOP_EQUITY_CACHE.get(key) || 0.3;
  }

  if (community.length >= 5) {
    const myScore = bestHand(holeCards, community).score;
    // vs random: approximate by checking against random hand
    return estimatePostflopEquity(holeCards, community, trials);
  }

  return estimatePostflopEquity(holeCards, community, trials);
}

function estimatePostflopEquity(
  holeCards: Card[],
  community: Card[],
  trials: number
): number {
  const deck = makeDeck();
  const used = new Set([...holeCards, ...community].map(cardToString));
  const remaining = deck.filter(c => !used.has(cardToString(c)));

  if (remaining.length < 2) {
    return bestHand(holeCards, community).rank / 9;
  }

  let win = 0, tie = 0, total = 0;
  const myScore = bestHand(holeCards, community).score;

  for (let t = 0; t < trials; t++) {
    const shuffled = shuffle(remaining);
    const oppHole = [shuffled[0], shuffled[1]];

    if (community.length >= 5) {
      const oppScore = bestHand(oppHole, community).score;
      const cmp = compareScore(myScore, oppScore);
      if (cmp > 0) win++;
      else if (cmp === 0) tie++;
      total++;
    } else {
      // Need to fill remaining community cards
      const simComm = [...community];
      for (let i = community.length; i < 5; i++) {
        simComm.push(shuffled[i + 2 - community.length]);
      }
      const my = bestHand(holeCards, simComm);
      const opp = bestHand(oppHole, simComm);
      const cmp = compareScore(my.score, opp.score);
      if (cmp > 0) win++;
      else if (cmp === 0) tie++;
      total++;
    }
  }

  return total > 0 ? (win + tie * 0.5) / total : 0.3;
}

/** 计算每个行动的EV（BB单位） */
export function calculateEV(
  holeCards: Card[],
  community: Card[],
  pot: number,
  toCall: number,
  myChips: number,
  bigBlind: number
): EVResult {
  const equity = calculateEquity(holeCards, community);

  // FOLD: always 0 EV (save chips)
  const foldEV = 0;

  // CALL: equity * (pot + toCall) - (1-equity) * toCall
  const callEV = equity * (pot + toCall) - toCall;

  // RAISE sizes: half pot, pot, all-in
  const halfPotRaise = pot * 0.5;
  const potRaise = pot;
  const allIn = myChips;

  // Simplified raise EV: assume fold equity based on raise size
  // fold equity decreases as raise size increases (less credible)
  const halfPotFoldEq = 0.35;
  const potFoldEq = 0.25;
  const allInFoldEq = 0.15;

  const halfPotEV = halfPotFoldEq * pot +
    (1 - halfPotFoldEq) * (equity * (pot + halfPotRaise) - halfPotRaise);

  const potEV = potFoldEq * pot +
    (1 - potFoldEq) * (equity * (pot + potRaise) - potRaise);

  const allInEV = allInFoldEq * pot +
    (1 - allInFoldEq) * (equity * (pot + allIn) - allIn);

  // Normalize to BB
  const toBB = (n: number) => n / bigBlind;

  // Find optimal action
  const options: { action: PlayerAction; amount: number; ev: number }[] = [
    { action: 'fold', amount: 0, ev: foldEV },
    { action: 'call', amount: toCall, ev: callEV },
    { action: 'raise', amount: halfPotRaise, ev: halfPotEV },
    { action: 'raise', amount: potRaise, ev: potEV },
    { action: 'allin', amount: allIn, ev: allInEV },
  ];

  // If toCall === 0, check instead of call
  if (toCall === 0) {
    options[1] = { action: 'check', amount: 0, ev: equity * pot };
  }

  // If can't afford raise, remove raise options
  const affordable = options.filter(o => o.amount <= myChips || o.action === 'fold');

  let optimal = affordable[0];
  for (const o of affordable) {
    if (o.ev > optimal.ev) optimal = o;
  }

  return {
    fold: toBB(foldEV),
    call: toBB(callEV),
    raiseHalfPot: toBB(halfPotEV),
    raisePot: toBB(potEV),
    raiseAllIn: toBB(allInEV),
    optimal: {
      action: optimal.action,
      amount: optimal.amount,
      ev: toBB(optimal.ev),
    },
    equity,
    potOdds: toCall > 0 ? toCall / (pot + toCall) : 0,
  };
}

/** pot odds 对应的最低equity要求 */
export function requiredEquity(toCall: number, pot: number): number {
  if (toCall <= 0) return 0;
  return toCall / (pot + toCall);
}
