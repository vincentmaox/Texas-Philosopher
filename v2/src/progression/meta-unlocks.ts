import type { PhilosophyToolId, PlayerProfile, AscensionLevel } from '@/types/progression';
import { PHILOSOPHY_TOOLS, getRandomTool } from './philosophy-tools';

const UNLOCK_THRESHOLDS: { level: number; tool: PhilosophyToolId }[] = [
  { level: 1, tool: 'independent_shield' },
  { level: 2, tool: 'fold_refund' },
  { level: 3, tool: 'tilt_detector' },
  { level: 4, tool: 'time_weaver' },
  { level: 5, tool: 'ev_calculator' },
  { level: 6, tool: 'pond_radar' },
  { level: 7, tool: 'chip_shield' },
  { level: 8, tool: 'range_vision' },
  { level: 9, tool: 'frequency_counter' },
  { level: 10, tool: 'value_hunter' },
];

export function createDefaultProfile(): PlayerProfile {
  return {
    xp: 0,
    level: 1,
    totalHandsPlayed: 0,
    streak: 0,
    streakFreeze: false,
    streakLastDate: new Date().toISOString().slice(0, 10),
    hearts: 5,
    heartsLastRefill: Date.now(),
    league: 'bronze',
    leagueScore: 0,
    unlockedTools: ['independent_shield'],
    ascensionUnlocked: 1 as AscensionLevel,
    currentRun: null,
  };
}

export function xpForLevel(level: number): number {
  return Math.round(100 * Math.pow(1.3, level - 1));
}

export function addXP(profile: PlayerProfile, amount: number): PlayerProfile {
  let xp = profile.xp + amount;
  let level = profile.level;

  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level);
    level++;
  }

  const newTools = [...profile.unlockedTools];
  for (const unlock of UNLOCK_THRESHOLDS) {
    if (level >= unlock.level && !newTools.includes(unlock.tool)) {
      newTools.push(unlock.tool);
    }
  }

  return {
    ...profile,
    xp,
    level,
    unlockedTools: newTools,
  };
}

export function awardRunCompletion(profile: PlayerProfile, floorReached: number, chipTotal: number): PlayerProfile {
  const baseXP = floorReached * 50 + Math.floor(chipTotal / 10);
  const toolAward = floorReached >= 5 ? getRandomTool(profile.unlockedTools) : null;

  let updated = addXP(profile, baseXP);
  updated.totalHandsPlayed += 0; // Hand count is tracked elsewhere
  updated.ascensionUnlocked = Math.max(
    updated.ascensionUnlocked,
    (floorReached >= 5 ? Math.min(20, updated.ascensionUnlocked + 1) : updated.ascensionUnlocked)
  ) as AscensionLevel;

  if (toolAward && !updated.unlockedTools.includes(toolAward.id)) {
    updated.unlockedTools.push(toolAward.id);
  }

  return updated;
}

export function getUnlockProgress(profile: PlayerProfile): { nextUnlock: PhilosophyToolId | null; levelsNeeded: number } {
  const nextThreshold = UNLOCK_THRESHOLDS.find(t => t.level > profile.level);
  if (!nextThreshold) return { nextUnlock: null, levelsNeeded: 0 };
  return { nextUnlock: nextThreshold.tool, levelsNeeded: nextThreshold.level - profile.level };
}
