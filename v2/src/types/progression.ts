export type AscensionLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
  | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20;

export type MapNodeType = 'fish_pond' | 'elite_pond' | 'boss' | 'harbor' | 'treasure';

export interface MapNode {
  id: string;
  type: MapNodeType;
  floor: number;
  label: string;
  description: string;
  buyIn: number;
  blinds: [number, number];
  opponentTypes: string[];
  mutationCount: number;
  densityEstimate: number;
  completed: boolean;
  connections: string[];
}

export interface MapFloor {
  floor: number;
  nodes: MapNode[];
}

export type PhilosophyToolId =
  | 'independent_shield'
  | 'ev_calculator'
  | 'pond_radar'
  | 'fold_refund'
  | 'range_vision'
  | 'tilt_detector'
  | 'chip_shield'
  | 'time_weaver'
  | 'frequency_counter'
  | 'value_hunter';

export interface PhilosophyTool {
  id: PhilosophyToolId;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}

export interface RunState {
  floor: number;
  currentNodeId: string | null;
  completedNodeIds: string[];
  floors: MapFloor[];
  tools: PhilosophyToolId[];
  toolSlots: number;
  ascension: AscensionLevel;
  pool: number;
  time: number;
  mind: number;
}

export type LeagueTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master';

export interface PlayerProfile {
  xp: number;
  level: number;
  totalHandsPlayed: number;
  streak: number;
  streakFreeze: boolean;
  streakLastDate: string;
  hearts: number;
  heartsLastRefill: number;
  league: LeagueTier;
  leagueScore: number;
  unlockedTools: PhilosophyToolId[];
  ascensionUnlocked: AscensionLevel;
  currentRun: RunState | null;
}
