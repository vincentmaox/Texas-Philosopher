export const DEFAULT_BIG_BLIND = 10;
export const DEFAULT_SMALL_BLIND = 5;
export const DEFAULT_STARTING_CHIPS = 1000;
export const STARTING_POOL = 1000;
export const STARTING_TIME = 30;
export const TIME_PER_HAND = 1;

export const SEAT_COUNT_MIN = 2;
export const SEAT_COUNT_MAX = 6;

export const RAISE_MIN_MULTIPLIER = 2;
export const ANTE_MULTIPLIER = 1.5;

export const XP_PER_CORRECT = 10;
export const XP_PER_NEAR = 5;
export const XP_PER_HAND = 2;

export const LEVEL_THRESHOLDS = [0, 50, 150, 350, 700, 1200, 2000, 3200, 5000, 7500, 11000];

export const LEVEL_TITLES = [
  '鱼苗', '浅水虾', '跟注鱼', '概率学徒', '弃牌修行者',
  '读人者', '范围大师', 'EV计算者', '牌桌哲学家', '虚空建筑师',
] as const;
