import type { PlayerAction, Street } from './game';

export interface EVResult {
  fold: number;
  call: number;
  raiseHalfPot: number;
  raisePot: number;
  raiseAllIn: number;
  optimal: { action: PlayerAction; amount: number; ev: number };
  equity: number;
  potOdds: number;
}

export interface FeedbackItem {
  street: Street;
  playerAction: PlayerAction;
  playerAmount: number;
  optimalAction: PlayerAction;
  optimalAmount: number;
  evDifference: number;
  equity: number;
  potOdds: number;
  verdict: 'perfect' | 'good' | 'acceptable' | 'bad';
  takeaway: string;
}

export type AidLevel = 'full' | 'delayed' | 'minimal' | 'none';

export interface SessionReport {
  handsPlayed: number;
  totalEVDifference: number;
  leakCategories: LeakCategory[];
  strengths: string[];
  improvements: string[];
}

export interface LeakCategory {
  name: string;
  description: string;
  frequency: number;
  severity: number;
  example: string;
}

export type PlayerSkillLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export function aidLevelFromSkill(level: PlayerSkillLevel): AidLevel {
  if (level <= 3) return 'full';
  if (level <= 6) return 'delayed';
  if (level <= 9) return 'minimal';
  return 'none';
}
