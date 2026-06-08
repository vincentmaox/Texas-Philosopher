/* ============================================================
   mutations.js — 小丑牌风格突变规则
   ============================================================ */

const MUTATIONS = {
  sunk_cost: {
    id: 'sunk_cost',
    name: '沉没成本诅咒',
    icon: '⚓',
    desc: '弃牌后，下一手参与时强制多投入50%底注。',
    apply(gs, hooks) {
      hooks.onPlayerFold = () => { gs._sunkCostFlag = true; };
      hooks.onHandStart = () => {
        if (gs._sunkCostFlag && gs.playerWantsToPlay) {
          gs.player.forcedExtra = Math.floor(gs.bigBlind * 0.5);
        }
        gs._sunkCostFlag = false;
      };
    }
  },
  forced_allin: {
    id: 'forced_allin',
    name: '梭哈狂热',
    icon: '🔥',
    desc: '每手随机1名玩家本手必须 All-in。',
    apply(gs, hooks) {
      hooks.onHandStart = () => {
        const active = gs.activePlayers.filter(p => p.chips > 0);
        if (active.length > 0) {
          const victim = active[Math.floor(Math.random() * active.length)];
          gs._forcedAllinId = victim.id;
        }
      };
    }
  },
  info_blackhole: {
    id: 'info_blackhole',
    name: '信息黑洞',
    icon: '🕳️',
    desc: '看不到自己的一张底牌（位置随机）。',
    apply(gs, hooks) {
      hooks.onCardDeal = () => {
        if (gs.player && gs.player.holeCards.length === 2) {
          gs.player.hiddenCardIndex = Math.random() < 0.5 ? 0 : 1;
        }
      };
    }
  },
  density_fog: {
    id: 'density_fog',
    name: '密度迷雾',
    icon: '🌫️',
    desc: '进入鱼塘前看不到对手身份，必须打1手才能探测。',
    apply(gs, hooks) {
      gs.hideOpponentTags = true;
      hooks.onHandEnd = () => { gs.hideOpponentTags = false; };
    }
  },
  time_speed: {
    id: 'time_speed',
    name: '时间加速',
    icon: '⏱️',
    desc: '玩家每次行动思考时间限制15秒，超时强制弃牌。',
    apply(gs, hooks) {
      gs.actionTimeLimit = 15000;
    }
  },
  independence_seal: {
    id: 'independence_seal',
    name: '独立事件封印',
    icon: '🔒',
    desc: '上一手的结果会以浮动通知干扰本手判断。',
    apply(gs, hooks) {
      hooks.onHandStart = () => {
        if (gs.lastHandResult) {
          gs._showLastResultNoise = true;
        }
      };
    }
  },
  premium_only: {
    id: 'premium_only',
    name: '捡钱法则',
    icon: '💎',
    desc: '只有 AA/KK/QQ/AK/AKs 允许参与，否则强制弃牌。',
    apply(gs, hooks) {
      hooks.onPlayerActionRequest = (player) => {
        if (player !== gs.player) return;
        const [c1, c2] = player.holeCards;
        const v1 = RANK_VALUE[c1.rank], v2 = RANK_VALUE[c2.rank];
        const isPremium =
          (c1.rank === c2.rank && v1 >= 12) ||  // QQ+
          (v1 === 14 && v2 === 13) || (v2 === 14 && v1 === 13);  // AK
        if (!isPremium && gs.round === 'preflop') {
          gs._forcePlayerFold = true;
        }
      };
    }
  },
  reverse_blinds: {
    id: 'reverse_blinds',
    name: '颠倒盲注',
    icon: '🔄',
    desc: '盲注金额翻倍，逼迫主动决策。',
    apply(gs, hooks) {
      gs.smallBlind *= 2;
      gs.bigBlind *= 2;
    }
  },
  shark_school: {
    id: 'shark_school',
    name: '鲨群进食',
    icon: '🦈',
    desc: '所有AI对手紧度+0.1，激进度+0.15。',
    apply(gs, hooks) {
      gs.opponents.forEach(opp => {
        opp.persona = { ...opp.persona, params: { ...opp.persona.params } };
        opp.persona.params.tightness = Math.min(1, opp.persona.params.tightness + 0.1);
        opp.persona.params.aggression = Math.min(1, opp.persona.params.aggression + 0.15);
      });
    }
  },
  fish_school: {
    id: 'fish_school',
    name: '鱼群密集',
    icon: '🐟',
    desc: '所有AI对手紧度-0.15，更易被击败（鱼塘密度高）。',
    apply(gs, hooks) {
      gs.opponents.forEach(opp => {
        opp.persona = { ...opp.persona, params: { ...opp.persona.params } };
        opp.persona.params.tightness = Math.max(0, opp.persona.params.tightness - 0.15);
        opp.persona.params.bluffRate = Math.min(1, opp.persona.params.bluffRate + 0.10);
      });
    }
  },
  blind_river: {
    id: 'blind_river',
    name: '盲眼河牌',
    icon: '🌊',
    desc: '河牌被遮蔽，只能凭转牌+心理推断决策。',
    apply(gs, hooks) {
      hooks.onCommunityDeal = (round) => {
        if (round === 'river') gs.hideRiver = true;
      };
    }
  },
  mind_reader: {
    id: 'mind_reader',
    name: '读心术',
    icon: '👁️',
    desc: '本手可看到1名随机AI对手的底牌。福利型突变。',
    apply(gs, hooks) {
      hooks.onHandStart = () => {
        const active = gs.opponents.filter(o => o.chips > 0);
        if (active.length > 0) {
          gs._revealedOpponentId = active[Math.floor(Math.random() * active.length)].id;
        }
      };
    }
  }
};

function randomMutations(count, exclude = []) {
  const pool = Object.keys(MUTATIONS).filter(k => !exclude.includes(k));
  const picked = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked.map(id => MUTATIONS[id]);
}
