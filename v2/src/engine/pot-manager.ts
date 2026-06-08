import type { Seat } from '@/types/game';

export interface Pot {
  amount: number;
  eligibleSeatIds: string[];
  isSide: boolean;
}

/**
 * 计算所有边池（含主池）。处理多All-in场景。
 */
export function calculatePots(seats: Seat[]): Pot[] {
  const activeSeats = seats.filter(s => !s.folded && s.totalBetThisHand > 0);
  if (activeSeats.length === 0) return [];

  // Sort by total bet ascending
  const sorted = [...activeSeats].sort((a, b) => a.totalBetThisHand - b.totalBetThisHand);

  const pots: Pot[] = [];
  let processedAmount = 0;

  for (let i = 0; i < sorted.length; i++) {
    const seat = sorted[i];
    const contribution = seat.totalBetThisHand - processedAmount;
    if (contribution <= 0) continue;

    const eligible = sorted.slice(i).map(s => s.id);
    const potAmount = contribution * eligible.length;

    pots.push({
      amount: potAmount,
      eligibleSeatIds: eligible,
      isSide: pots.length > 0,
    });

    processedAmount = seat.totalBetThisHand;
  }

  return pots;
}

/**
 * 将筹码分配给赢家（支持平分）
 */
export function distributePot(
  pots: Pot[],
  seatHandScores: Map<string, number[]>
): Map<string, number> {
  const winnings = new Map<string, number>();

  for (const pot of pots) {
    const eligibleScores = pot.eligibleSeatIds
      .map(id => ({ id, score: seatHandScores.get(id)! }))
      .filter(s => s.score !== undefined);

    if (eligibleScores.length === 0) continue;

    // Find best score
    let bestScore = eligibleScores[0].score;
    for (const s of eligibleScores) {
      if (compareScores(s.score, bestScore) > 0) bestScore = s.score;
    }

    const winners = eligibleScores.filter(s => compareScores(s.score, bestScore) === 0);
    const share = Math.floor(pot.amount / winners.length);

    for (const w of winners) {
      winnings.set(w.id, (winnings.get(w.id) || 0) + share);
    }
  }

  return winnings;
}

function compareScores(a: number[], b: number[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}
