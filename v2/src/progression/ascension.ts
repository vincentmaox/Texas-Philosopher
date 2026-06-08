import type { AscensionLevel, RunState } from '@/types/progression';

export const ASCENSION_CONFIG: Record<AscensionLevel, AscensionModifier> = {
  1:  { startingChips: 1000, toolSlots: 5, aiBonus: 0, evFeedback: true,  mapDensity: 0,  bossPower: 0 },
  2:  { startingChips: 900,  toolSlots: 5, aiBonus: 0.05, evFeedback: true,  mapDensity: 0,  bossPower: 0 },
  3:  { startingChips: 800,  toolSlots: 5, aiBonus: 0.1, evFeedback: true,  mapDensity: 0.05, bossPower: 0 },
  4:  { startingChips: 750,  toolSlots: 5, aiBonus: 0.12, evFeedback: true,  mapDensity: 0.05, bossPower: 0.1 },
  5:  { startingChips: 700,  toolSlots: 4, aiBonus: 0.15, evFeedback: true,  mapDensity: 0.1,  bossPower: 0.1 },
  6:  { startingChips: 650,  toolSlots: 4, aiBonus: 0.18, evFeedback: true,  mapDensity: 0.1,  bossPower: 0.15 },
  7:  { startingChips: 600,  toolSlots: 4, aiBonus: 0.2, evFeedback: true,  mapDensity: 0.15, bossPower: 0.15 },
  8:  { startingChips: 550,  toolSlots: 3, aiBonus: 0.22, evFeedback: true,  mapDensity: 0.15, bossPower: 0.2 },
  9:  { startingChips: 500,  toolSlots: 3, aiBonus: 0.25, evFeedback: true,  mapDensity: 0.2,  bossPower: 0.2 },
  10: { startingChips: 450,  toolSlots: 3, aiBonus: 0.28, evFeedback: false, mapDensity: 0.2,  bossPower: 0.25 },
  11: { startingChips: 400,  toolSlots: 3, aiBonus: 0.3, evFeedback: false, mapDensity: 0.25, bossPower: 0.25 },
  12: { startingChips: 380,  toolSlots: 3, aiBonus: 0.32, evFeedback: false, mapDensity: 0.25, bossPower: 0.3 },
  13: { startingChips: 350,  toolSlots: 3, aiBonus: 0.35, evFeedback: false, mapDensity: 0.3,  bossPower: 0.3 },
  14: { startingChips: 320,  toolSlots: 3, aiBonus: 0.38, evFeedback: false, mapDensity: 0.35, bossPower: 0.35 },
  15: { startingChips: 300,  toolSlots: 3, aiBonus: 0.4, evFeedback: false, mapDensity: 0.35, bossPower: 0.4 },
  16: { startingChips: 280,  toolSlots: 3, aiBonus: 0.42, evFeedback: false, mapDensity: 0.4,  bossPower: 0.5 },
  17: { startingChips: 260,  toolSlots: 3, aiBonus: 0.45, evFeedback: false, mapDensity: 0.4,  bossPower: 0.6 },
  18: { startingChips: 240,  toolSlots: 3, aiBonus: 0.48, evFeedback: false, mapDensity: 0.45, bossPower: 0.7 },
  19: { startingChips: 200,  toolSlots: 2, aiBonus: 0.5, evFeedback: false, mapDensity: 0.5,  bossPower: 0.8 },
  20: { startingChips: 150,  toolSlots: 2, aiBonus: 0.55, evFeedback: false, mapDensity: 0.6,  bossPower: 1.0 },
};

export interface AscensionModifier {
  startingChips: number;
  toolSlots: number;
  aiBonus: number;
  evFeedback: boolean;
  mapDensity: number;
  bossPower: number;
}

export function getAscensionConfig(level: AscensionLevel): AscensionModifier {
  return ASCENSION_CONFIG[level];
}

export function applyAscensionToRun(run: RunState): RunState {
  const config = ASCENSION_CONFIG[run.ascension];
  return {
    ...run,
    toolSlots: config.toolSlots,
  };
}

export function ascensionLabel(level: AscensionLevel): string {
  if (level <= 3) return `飞升${level} · 新手`;
  if (level <= 6) return `飞升${level} · 进阶`;
  if (level <= 9) return `飞升${level} · 困难`;
  if (level <= 12) return `飞升${level} · 噩梦`;
  if (level <= 15) return `飞升${level} · 地狱`;
  if (level <= 18) return `飞升${level} · 炼狱`;
  return `飞升${level} · 虚空`;
}
