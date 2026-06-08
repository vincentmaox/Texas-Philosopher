import type { MapNode } from '@/types/progression';

export interface BossEncounter {
  id: string;
  name: string;
  mbtiTypes: string[];
  mechanic: string;
  mechanicDescription: string;
  reward: string;
}

const BOSSES: BossEncounter[] = [
  {
    id: 'boss_intj',
    name: '棋局设计师 — 最终形态',
    mbtiTypes: ['INTJ'],
    mechanic: 'adaptive',
    mechanicDescription: '每3手牌后，Boss适应你的打法模式，调整策略反制你',
    reward: '解锁飞升下一级 + EV计算器工具',
  },
  {
    id: 'boss_entj',
    name: '牌桌指挥官 — 绝对统御',
    mbtiTypes: ['ENTJ'],
    mechanic: 'force_first',
    mechanicDescription: '你被迫在每手牌中先行动，无法利用位置优势',
    reward: '解锁飞升下一级 + 筹码护盾工具',
  },
  {
    id: 'boss_infj',
    name: '镜中预言者 — 全知之眼',
    mbtiTypes: ['INFJ'],
    mechanic: 'see_hole_cards',
    mechanicDescription: 'Boss能看到你的底牌（公开信息），你需要反套路',
    reward: '解锁飞升下一级 + 范围透视工具',
  },
  {
    id: 'boss_estp',
    name: '闪电猎手 — 双倍下注',
    mbtiTypes: ['ESTP'],
    mechanic: 'double_bet',
    mechanicDescription: 'Boss的所有下注量翻倍，跟注成本翻倍',
    reward: '解锁飞升下一级 + 价值猎手工具',
  },
  {
    id: 'boss_fusion',
    name: '虚空建筑师 — 终极融合',
    mbtiTypes: ['INTJ', 'ENTP'],
    mechanic: 'fusion',
    mechanicDescription: '融合INTJ的计算力与ENTP的混沌，每5手切换人格',
    reward: '通关！解锁虚空称号',
  },
];

export function getBossForFloor(floor: number): BossEncounter {
  if (floor === 3) return BOSSES[0];
  if (floor === 5) return BOSSES[4];
  return BOSSES[Math.min(floor - 1, BOSSES.length - 1)];
}

export function getBossForNode(node: MapNode): BossEncounter | null {
  if (node.type !== 'boss') return null;
  return getBossForFloor(node.floor);
}

export function applyBossMechanic(encounter: BossEncounter, gameState: {
  handNumber: number;
  playerActedFirst: boolean;
  currentBet: number;
  bigBlind: number;
}): { modifiedBet?: number; forcePlayerFirst?: boolean; showPlayerCards?: boolean; switchPersona?: boolean } {
  switch (encounter.mechanic) {
    case 'adaptive':
      return {};
    case 'force_first':
      return { forcePlayerFirst: true };
    case 'see_hole_cards':
      return { showPlayerCards: true };
    case 'double_bet':
      return { modifiedBet: gameState.currentBet * 2 };
    case 'fusion':
      return { switchPersona: gameState.handNumber % 5 === 0 && gameState.handNumber > 0 };
    default:
      return {};
  }
}
