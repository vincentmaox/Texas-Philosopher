import type { PhilosophyTool, PhilosophyToolId } from '@/types/progression';

export const PHILOSOPHY_TOOLS: Record<PhilosophyToolId, PhilosophyTool> = {
  independent_shield: {
    id: 'independent_shield',
    name: '独立事件之盾',
    description: '隐藏上一手结果，防止结果偏差影响决策',
    icon: '🛡️',
    rarity: 'common',
  },
  ev_calculator: {
    id: 'ev_calculator',
    name: 'EV计算器',
    description: '决策时显示各行动EV值（学习模式效果）',
    icon: '🧮',
    rarity: 'uncommon',
  },
  pond_radar: {
    id: 'pond_radar',
    name: '鱼塘雷达',
    description: '地图上显示对手的MBTI类型（可能有误差）',
    icon: '📡',
    rarity: 'uncommon',
  },
  fold_refund: {
    id: 'fold_refund',
    name: '弃牌返现',
    description: '弃牌时退回已投注筹码的10%',
    icon: '💸',
    rarity: 'common',
  },
  range_vision: {
    id: 'range_vision',
    name: '范围透视',
    description: '显示对手的估计手牌范围',
    icon: '👁️',
    rarity: 'rare',
  },
  tilt_detector: {
    id: 'tilt_detector',
    name: '倾斜探测器',
    description: '你的操作偏离常态时发出警告',
    icon: '⚖️',
    rarity: 'common',
  },
  chip_shield: {
    id: 'chip_shield',
    name: '筹码护盾',
    description: '每层首次All-in损失上限50%',
    icon: '🔰',
    rarity: 'uncommon',
  },
  time_weaver: {
    id: 'time_weaver',
    name: '时间编织者',
    description: '每层+5分钟时间限制',
    icon: '⏳',
    rarity: 'common',
  },
  frequency_counter: {
    id: 'frequency_counter',
    name: '频率计',
    description: '显示对手行动频率统计（VPIP/PFR/AF）',
    icon: '📊',
    rarity: 'rare',
  },
  value_hunter: {
    id: 'value_hunter',
    name: '价值猎手',
    description: '高亮+EV情境，提醒你抓住价值',
    icon: '🎯',
    rarity: 'legendary',
  },
};

export function getTool(id: PhilosophyToolId): PhilosophyTool {
  return PHILOSOPHY_TOOLS[id];
}

export function getRandomTool(exclude: PhilosophyToolId[]): PhilosophyTool {
  const available = Object.values(PHILOSOPHY_TOOLS).filter(t => !exclude.includes(t.id));
  if (available.length === 0) return PHILOSOPHY_TOOLS.independent_shield;
  return available[Math.floor(Math.random() * available.length)];
}

export function getToolsByRarity(rarity: PhilosophyTool['rarity']): PhilosophyTool[] {
  return Object.values(PHILOSOPHY_TOOLS).filter(t => t.rarity === rarity);
}

/** 检查工具是否激活（已装备且未满槽位） */
export function isToolEquipped(toolId: PhilosophyToolId, equipped: PhilosophyToolId[]): boolean {
  return equipped.includes(toolId);
}

/** 装备工具，返回新的装备列表 */
export function equipTool(toolId: PhilosophyToolId, equipped: PhilosophyToolId[], maxSlots: number): PhilosophyToolId[] {
  if (equipped.includes(toolId)) return equipped;
  if (equipped.length >= maxSlots) return equipped;
  return [...equipped, toolId];
}

/** 卸下工具 */
export function unequipTool(toolId: PhilosophyToolId, equipped: PhilosophyToolId[]): PhilosophyToolId[] {
  return equipped.filter(t => t !== toolId);
}

/** 工具效果：弃牌返现 */
export function foldRefundAmount(betThisHand: number, equipped: PhilosophyToolId[]): number {
  if (!equipped.includes('fold_refund')) return 0;
  return Math.round(betThisHand * 0.1);
}

/** 工具效果：筹码护盾 */
export function chipShieldReduction(loss: number, shieldUsedThisFloor: boolean, equipped: PhilosophyToolId[]): { reduced: number; shieldUsed: boolean } {
  if (!equipped.includes('chip_shield') || shieldUsedThisFloor) return { reduced: 0, shieldUsed: shieldUsedThisFloor };
  return { reduced: Math.round(loss * 0.5), shieldUsed: true };
}
