import type { Card } from './card';

export type GamePhase =
  | 'idle'
  | 'dealing'
  | 'preflop'
  | 'flop'
  | 'turn'
  | 'river'
  | 'showdown'
  | 'result';

export type Street = 'preflop' | 'flop' | 'turn' | 'river';

export type PlayerAction = 'fold' | 'check' | 'call' | 'raise' | 'allin';

export type Position = 'SB' | 'BB' | 'UTG' | 'MP' | 'CO' | 'BTN';

export type GameMode = 'learning' | 'training' | 'competitive';

export interface Seat {
  id: string;
  isHuman: boolean;
  name: string;
  chips: number;
  holeCards: Card[];
  currentBet: number;
  totalBetThisHand: number;
  folded: boolean;
  allIn: boolean;
  actedThisRound: boolean;
  position?: Position;
  mbtiType?: string;
  opponentRef?: unknown;
}

export interface Pot {
  amount: number;
  eligibleSeatIds: string[];
  isSide: boolean;
}

export interface GameState {
  phase: GamePhase;
  seats: Seat[];
  community: Card[];
  pot: number;
  pots: Pot[];
  currentBet: number;
  minRaise: number;
  dealerIndex: number;
  activeSeatIndex: number;
  street: Street;
  handNumber: number;
  bigBlind: number;
  smallBlind: number;
  mode: GameMode;
}

export interface ActionPayload {
  seatId: string;
  action: PlayerAction;
  amount?: number;
}

export interface HandResult {
  winnerIds: string[];
  potAmount: number;
  handName: string;
  handScore: number[];
  showdown: { seatId: string; cards: Card[]; handName: string }[];
}

export interface DecisionRecord {
  street: Street;
  action: PlayerAction;
  amount: number;
  evActual: number;
  evOptimal: number;
  evDifference: number;
  equity: number;
  potOdds: number;
  optimalAction: PlayerAction;
  optimalAmount: number;
}
