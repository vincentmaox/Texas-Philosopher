/* ============================================================
   map.js — 探宝航海图 (鱼塘节点 + 港口事件)
   ============================================================ */

const POND_TEMPLATES = [
  {
    id: 'shallow_dock',
    name: '近海浅滩',
    tagline: '新手鱼塘，密度极高。',
    buyIn: 50, smallBlind: 1, bigBlind: 2,
    minOpps: 2, maxOpps: 3,
    density: { fish: 4, shark: 0 },
    mutationCount: 0,
    timeCost: 5,
    weights: { fisherman: 1, scout: 3, youngwave: 3 }
  },
  {
    id: 'fish_school_bay',
    name: '鱼群密集湾',
    tagline: '鱼塘密度爆表，但偶有鲨鱼。',
    buyIn: 100, smallBlind: 2, bigBlind: 4,
    minOpps: 3, maxOpps: 4,
    density: { fish: 3, shark: 1 },
    mutationCount: 1,
    timeCost: 8,
    weights: { gambler: 3, youngwave: 2, scout: 1 }
  },
  {
    id: 'mixed_currents',
    name: '混合洋流',
    tagline: '密度未知，鱼鲨混杂。',
    buyIn: 200, smallBlind: 5, bigBlind: 10,
    minOpps: 3, maxOpps: 5,
    density: { fish: 2, shark: 2 },
    mutationCount: 2,
    timeCost: 12,
    weights: { fisherman: 1, gambler: 1, scout: 1, academic: 1, youngwave: 1 }
  },
  {
    id: 'shark_reef',
    name: '鲨鱼礁',
    tagline: '高手聚集，但奖励丰厚。',
    buyIn: 400, smallBlind: 10, bigBlind: 20,
    minOpps: 3, maxOpps: 4,
    density: { fish: 1, shark: 3 },
    mutationCount: 2,
    timeCost: 15,
    danger: true,
    weights: { academic: 2, fisherman: 2, voidarchitect: 1 }
  },
  {
    id: 'void_abyss',
    name: '虚空深渊',
    tagline: '传说中的频率竞技场。',
    buyIn: 800, smallBlind: 20, bigBlind: 40,
    minOpps: 2, maxOpps: 3,
    density: { fish: 0, shark: 4 },
    mutationCount: 3,
    timeCost: 20,
    elite: true,
    danger: true,
    weights: { voidarchitect: 3, academic: 2, fisherman: 1 }
  },
  {
    id: 'tutorial_pond',
    name: '训练码头',
    tagline: '免费训练场，无资金损失风险。',
    buyIn: 0, smallBlind: 1, bigBlind: 2,
    minOpps: 2, maxOpps: 2,
    density: { fish: 4, shark: 0 },
    mutationCount: 0,
    timeCost: 3,
    free: true,
    weights: { scout: 1, youngwave: 1 }
  }
];

const HARBOR_EVENTS = [
  {
    id: 'old_fisher',
    title: '🎣 遇到老渔夫',
    desc: '一位皱纹满面的老渔夫坐在码头修补渔网。他看了你一眼："想听听我的故事吗？"',
    choices: [
      { label: '听他讲（+5 思维评分，消耗2分钟）', effect: (p) => { p.mind += 5; p.time -= 2; return '老渔夫："独立事件，年轻人。每一网都是独立事件。"' } },
      { label: '请教鱼塘情报（消耗3分钟+10金币）', effect: (p) => { if(p.pool>=10){p.pool-=10; p.time-=3; p.intel = (p.intel||0)+1; return '获得1个海域情报标记。'} return '资金不足。'; } },
      { label: '走开', effect: () => '你转身离开。' }
    ]
  },
  {
    id: 'storm',
    title: '🌪️ 风暴来临',
    desc: '海平面阴云密布，狂风骤起。你必须躲避或硬闯。',
    choices: [
      { label: '躲避（消耗5分钟）', effect: (p) => { p.time -= 5; return '风暴过去了。' } },
      { label: '硬闯（消耗2分钟，下一局收益翻倍）', effect: (p) => { p.time -= 2; p.nextHandBonus = 2; return '你的船在风暴中颠簸前行。' } }
    ]
  },
  {
    id: 'lost_coin',
    title: '💰 漂浮的钱袋',
    desc: '水面上漂着一个鼓鼓的钱袋。',
    choices: [
      { label: '捡起（+30金币）', effect: (p) => { p.pool += 30; return '+30 💰 捡钱模式 +1' } },
      { label: '检查再决定（+5思维评分，可能是空的）', effect: (p) => { p.mind += 5; if (Math.random() < 0.5) { p.pool += 50; return '里面有50金币！你冷静的判断带来回报。'; } return '果然是空的。但你的判断没有被贪心带偏。'; } }
    ]
  },
  {
    id: 'repair',
    title: '⚒️ 修船人',
    desc: '一位修船人提议用资金换取额外时间。',
    choices: [
      { label: '花50金币恢复10分钟', effect: (p) => { if(p.pool>=50){p.pool-=50; p.time+=10; return '+10分钟时间池。'} return '资金不足。'; } },
      { label: '花100金币恢复25分钟', effect: (p) => { if(p.pool>=100){p.pool-=100; p.time+=25; return '+25分钟时间池。'} return '资金不足。'; } },
      { label: '不需要', effect: () => '你拒绝了。' }
    ]
  },
  {
    id: 'hidden_pond',
    title: '🗺️ 发现新海域',
    desc: '一张破旧地图浮在水面，标记着一片隐藏海域。',
    choices: [
      { label: '解锁隐藏鱼塘', effect: (p) => { p.unlockedHidden = true; return '虚空深渊节点已可见。' } }
    ]
  },
  {
    id: 'philosophical_test',
    title: '🧠 哲学考验',
    desc: '一位神秘人提问："上一局你输了大锅，这一局你的牌：22。pot 100，需要跟 50。你怎么做？"',
    choices: [
      { label: '弃牌（独立事件 + EV 思维）', effect: (p) => { p.mind += 15; return '+15 思维评分。你证明了你不被沉没成本绑架。' } },
      { label: '跟注翻本', effect: (p) => { p.mind -= 5; return '-5 思维评分。这就是赌徒谬误。' } },
      { label: 'All-in 报复', effect: (p) => { p.mind -= 15; return '-15 思维评分。情绪驱动决策是 -EV 的根源。' } }
    ]
  }
];

function generateMap(playerLevel, hasHiddenUnlocked) {
  // 生成 6 个节点（含 1 训练码头 + 4-5 鱼塘 + 可能的隐藏）
  const nodes = [];
  nodes.push(generateNode(POND_TEMPLATES.find(t => t.id === 'tutorial_pond')));

  // 主流节点：根据玩家等级筛选
  const available = POND_TEMPLATES.filter(t =>
    t.id !== 'tutorial_pond' &&
    !t.elite &&
    (playerLevel >= 2 || t.buyIn <= 200) &&
    (playerLevel >= 4 || t.buyIn <= 400)
  );

  // 随机选择4个
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(4, shuffled.length); i++) {
    nodes.push(generateNode(shuffled[i]));
  }

  if (hasHiddenUnlocked) {
    nodes.push(generateNode(POND_TEMPLATES.find(t => t.id === 'void_abyss')));
  }

  return nodes;
}

function generateNode(template) {
  const opps = template.minOpps + Math.floor(Math.random() * (template.maxOpps - template.minOpps + 1));
  const mutations = template.mutationCount > 0 ? randomMutations(template.mutationCount) : [];

  // Pick opponent personas based on weights
  const opponents = [];
  const weightedPool = [];
  for (const [persona, weight] of Object.entries(template.weights)) {
    for (let i = 0; i < weight; i++) weightedPool.push(persona);
  }
  const personaKeys = Object.keys(template.weights);
  const seenPersonas = new Set();
  for (let i = 0; i < opps; i++) {
    let pick;
    let tries = 0;
    do {
      pick = weightedPool[Math.floor(Math.random() * weightedPool.length)];
      tries++;
    } while (seenPersonas.has(pick) && tries < 20 && seenPersonas.size < personaKeys.length);
    if (seenPersonas.has(pick) && seenPersonas.size >= personaKeys.length) {
      // pool exhausted — allow duplicate as last resort
    }
    seenPersonas.add(pick);
    opponents.push(pick);
  }

  return {
    id: template.id + '_' + Math.random().toString(36).slice(2, 8),
    template: template.id,
    name: template.name,
    tagline: template.tagline,
    buyIn: template.buyIn,
    smallBlind: template.smallBlind,
    bigBlind: template.bigBlind,
    density: template.density,
    mutations: mutations,
    timeCost: template.timeCost,
    opponents: opponents,
    danger: template.danger,
    elite: template.elite,
    free: template.free
  };
}

function triggerHarborEvent() {
  return HARBOR_EVENTS[Math.floor(Math.random() * HARBOR_EVENTS.length)];
}
