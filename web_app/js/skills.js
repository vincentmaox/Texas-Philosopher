/* ============================================================
   skills.js — 思维技能树（杀戮尖塔式被动技能）
   ============================================================ */

const SKILL_TREE = [
  {
    id: 'quick_fold',
    name: '快速弃牌',
    desc: '弃牌不消耗时间池（训练及时止损）',
    icon: '🏃',
    cost: 30,
    unlocked: false,
    prereq: []
  },
  {
    id: 'pond_radar',
    name: '鱼塘雷达',
    desc: '进入前看到对手等级标签（提升信息收集）',
    icon: '📡',
    cost: 60,
    unlocked: false,
    prereq: ['quick_fold']
  },
  {
    id: 'emotion_shield',
    name: '情绪隔离',
    desc: '连输3手后，第4手资金损失减少40%',
    icon: '🛡️',
    cost: 100,
    unlocked: false,
    prereq: ['pond_radar']
  },
  {
    id: 'luck_sniffer',
    name: '乌龙指嗅觉',
    desc: '每局有8%概率发现捡钱机会（直接获小额奖励）',
    icon: '👃',
    cost: 80,
    unlocked: false,
    prereq: ['quick_fold']
  },
  {
    id: 'independence_shield',
    name: '独立事件护盾',
    desc: '上局结果不会显示为本局干扰（强制的独立事件思维）',
    icon: '🔰',
    cost: 120,
    unlocked: false,
    prereq: ['emotion_shield', 'luck_sniffer']
  },
  {
    id: 'low_cost_probe',
    name: '低成本探测',
    desc: '每局第一手买入减半（鼓励快速试错）',
    icon: '🎣',
    cost: 50,
    unlocked: false,
    prereq: ['quick_fold']
  },
  {
    id: 'frequency_eye',
    name: '频域之眼',
    desc: '能看到所有对手的弃牌/加注频率统计（虚空建筑师的馈赠）',
    icon: '👁️',
    cost: 150,
    unlocked: false,
    prereq: ['independence_shield']
  },
  {
    id: 'time_weaver',
    name: '时间编织者',
    desc: '每天时间池恢复量+10分钟',
    icon: '⏳',
    cost: 100,
    unlocked: false,
    prereq: ['low_cost_probe']
  },
  {
    id: 'void_resonance',
    name: '虚空谐振',
    desc: '三频共振时（资金/时间/思维同时良好），下局+15%手牌强度',
    icon: '🔮',
    cost: 200,
    unlocked: false,
    prereq: ['frequency_eye', 'time_weaver']
  }
];

const XP_PER_LEVEL = 100;

function getLevel(xp) {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

function levelProgress(xp) {
  const cur = xp % XP_PER_LEVEL;
  return { current: cur, max: XP_PER_LEVEL, level: getLevel(xp) };
}

const LEVEL_TITLES = {
  1: '鱼苗', 2: '见习渔民', 3: '老渔夫',
  4: '探宝船长', 5: '测距水手', 6: '深海领航员',
  7: '频域航行者', 8: '虚空建筑师'
};

function getTitle(level) {
  return LEVEL_TITLES[level] || '虚空大师';
}