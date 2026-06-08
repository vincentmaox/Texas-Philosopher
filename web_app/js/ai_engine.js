/* ============================================================
   ai_engine.js — AI 对手核心 (角色 + 决策逻辑)
   每个角色 = 性格参数 × 策略偏好 × 台词模板
   ============================================================ */

const AI_PERSONAS = {
  fisherman: {
    id: 'fisherman',
    name: '老渔夫',
    tag: '极致耐心 · Premium Only',
    bio: '我等了3小时就为这一手。鱼塘密度不够，我宁可晒太阳。',
    // tightness 0..1 (越高越紧)；aggression 0..1；bluffRate；emotionVolatility
    params: { tightness: 0.88, aggression: 0.35, bluffRate: 0.04, tilt: 0.05 },
    style: '只玩前12%的起手牌。中后期看见疑似强牌一定不让步。',
    lines: {
      onPlayerAllin: ['你确定？这鱼塘还有别的鱼，没必要梭哈。', '梭哈是急的人玩的，我不急。'],
      onPlayerFold: ['对，没机会就走。下一桌见。', '弃得好，独立事件，下一手再来。'],
      onPlayerFoldStreak: ['你只负责捡钱，我也只负责捡钱。但你今天捡得太少了。'],
      onSelfAllin: ['我等了一晚上，就这一手。'],
      onWinBig: ['这就是耐心的代价。'],
      onLoseBig: ['没关系，下一桌密度更好。pool还在。']
    }
  },
  gambler: {
    id: 'gambler',
    name: '梭哈狂人',
    tag: '情绪驱动 · 高频All-in',
    bio: '人生就是一场梭哈。这一把我要翻本！',
    params: { tightness: 0.25, aggression: 0.85, bluffRate: 0.30, tilt: 0.7 },
    style: '高频加注+诈唬，连输3手必梭哈翻本。',
    lines: {
      onPlayerAllin: ['好！男人就该梭！跟！', '终于来了硬骨头，跟你死磕到底！'],
      onPlayerFold: ['又怂了？这局明明有戏！', '弃牌的不是哲学家，是缩头乌龟。'],
      onPlayerFoldStreak: ['你一晚上没出手了，你来干嘛的？'],
      onSelfAllin: ['ALL IN！这一手不是输就是赢！'],
      onWinBig: ['哈！我说的吧，这把必赢！'],
      onLoseBig: ['妈的！下一局必须翻本！加倍！']
    }
  },
  scout: {
    id: 'scout',
    name: '密度探测者',
    tag: '低成本试错 · 灵活',
    bio: '我先扔个饵，看看池子里是鱼还是鲨鱼。',
    params: { tightness: 0.55, aggression: 0.55, bluffRate: 0.18, tilt: 0.20 },
    style: '前几手小成本探测对手风格，识别后调整策略。',
    lines: {
      onPlayerAllin: ['不错，让我看看你的底。'],
      onPlayerFold: ['一次弃牌等于一次免费的观察。'],
      onPlayerFoldStreak: ['你的弃牌频率告诉我你只玩前15%。我记下了。'],
      onSelfAllin: ['信息足够了。出手。'],
      onWinBig: ['观察了三圈，就为这一手。'],
      onLoseBig: ['情报错了。下次重新校准。']
    }
  },
  academic: {
    id: 'academic',
    name: '学院派',
    tag: 'GTO · 严格概率',
    bio: '根据ICM模型，你的跟注EV为负。',
    params: { tightness: 0.65, aggression: 0.55, bluffRate: 0.12, tilt: 0.05 },
    style: '严格按pot odds和equity决策，理论最优。',
    lines: {
      onPlayerAllin: ['你的all-in EV为-2.3 BB。我建议你重新计算。'],
      onPlayerFold: ['正确决策。MDF阈值在这个spot是38%。'],
      onPlayerFoldStreak: ['你的VPIP过低，长期-EV。'],
      onSelfAllin: ['equity 67%, fold equity 28%, +EV jam.'],
      onWinBig: ['GTO never lies long term.'],
      onLoseBig: ['这是方差，不是错误。']
    }
  },
  youngwave: {
    id: 'youngwave',
    name: '后浪',
    tag: '激进学习 · 模仿玩家',
    bio: '你这套过时了，新打法是换桌找软鱼塘。',
    params: { tightness: 0.40, aggression: 0.70, bluffRate: 0.22, tilt: 0.40 },
    style: '观察你前几手然后反向利用。',
    lines: {
      onPlayerAllin: ['我学过你这招。但我比你更敢。'],
      onPlayerFold: ['你弃牌频率太规律了，太好读了。'],
      onPlayerFoldStreak: ['老一辈都这样，等好牌等到天荒地老。'],
      onSelfAllin: ['年轻人就是要敢。'],
      onWinBig: ['看，新一代的胜利。'],
      onLoseBig: ['没关系，下一桌见。']
    }
  },
  voidarchitect: {
    id: 'voidarchitect',
    name: '虚空建筑师',
    tag: '频域思维 · 频率套利',
    bio: '我不看这一手，我看一百手的频谱。',
    params: { tightness: 0.55, aggression: 0.60, bluffRate: 0.15, tilt: 0.02 },
    style: '不预测单局，按频率出击。在特定振幅点暴露。',
    lines: {
      onPlayerAllin: ['你的all-in频率突破了我的采样阈值。我跟。'],
      onPlayerFold: ['独立事件。下一局归零。'],
      onPlayerFoldStreak: ['你在低频带停留太久，错过了中频的捡钱窗口。'],
      onSelfAllin: ['振幅到了。下行有限，上行凸性。出手。'],
      onWinBig: ['这不是运气，是频率。'],
      onLoseBig: ['单局噪音。我看的是1000局的均值。']
    }
  }
};

class AIOpponent {
  constructor(personaId, chips, seatIndex) {
    this.persona = AI_PERSONAS[personaId];
    this.id = personaId + '_' + seatIndex;
    this.name = this.persona.name;
    this.tag = this.persona.tag;
    this.chips = chips;
    this.seatIndex = seatIndex;
    this.holeCards = [];
    this.currentBet = 0;
    this.folded = false;
    this.allIn = false;
    this.actedThisRound = false;
    this.tiltLevel = 0;        // accumulates after losses
    this.observations = {};    // observations about human player
    this.lastDialogue = '';
  }

  reset() {
    this.holeCards = [];
    this.currentBet = 0;
    this.folded = false;
    this.allIn = false;
    this.actedThisRound = false;
    this.lastDialogue = '';
  }

  // Rule-based decision (also used as fallback if LLM unavailable)
  decideAction(gameState) {
    const { community, pot, currentBet, minRaise, bigBlind } = gameState;
    const toCall = Math.max(0, currentBet - this.currentBet);

    let strength = estimateHandStrength(this.holeCards, community);
    const p = this.persona.params;

    // Apply tilt (lose calibration)
    const tiltedAggression = Math.min(1, p.aggression + this.tiltLevel * 0.3);
    const tiltedTightness = Math.max(0, p.tightness - this.tiltLevel * 0.4);

    // Bluff probability
    const wouldBluff = Math.random() < p.bluffRate;
    if (wouldBluff) strength = Math.max(strength, 0.55);

    // Pot odds
    const potOdds = toCall > 0 ? toCall / (pot + toCall) : 0;

    // Decision thresholds
    const playThreshold = tiltedTightness * 0.5;  // ~ 0.2 to 0.45
    const raiseThreshold = 0.55 + (1 - tiltedAggression) * 0.3;
    const allinThreshold = 0.82 - tiltedAggression * 0.15;

    let action = 'fold';
    let amount = 0;

    if (toCall === 0) {
      // Can check
      if (strength > raiseThreshold || (wouldBluff && community.length >= 3)) {
        action = 'raise';
        amount = Math.min(this.chips, Math.floor(pot * (0.4 + Math.random()*0.6)) + minRaise);
      } else {
        action = 'check';
      }
    } else {
      // Must call, raise, fold, or allin
      if (strength >= allinThreshold && this.chips < pot * 1.2) {
        action = 'raise';
        amount = this.chips; // effectively all-in
      } else if (strength > raiseThreshold && Math.random() < tiltedAggression) {
        action = 'raise';
        const raiseSize = Math.floor(pot * (0.5 + Math.random()*0.7));
        amount = Math.min(this.chips, Math.max(minRaise + toCall, toCall + raiseSize));
      } else if (strength > playThreshold && strength > potOdds * 0.85) {
        action = 'call';
        amount = Math.min(this.chips, toCall);
      } else if (toCall <= bigBlind * 1.5 && strength > playThreshold * 0.7) {
        action = 'call';
        amount = Math.min(this.chips, toCall);
      } else {
        action = 'fold';
      }
    }

    return { action, amount, strength };
  }

  // Trigger-based dialogue from persona library
  getReactionLine(trigger) {
    const pool = this.persona.lines[trigger];
    if (!pool || !pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  updateTilt(handResult) {
    // handResult: 'win_big', 'win', 'loss', 'loss_big'
    const v = this.persona.params.tilt;
    if (handResult === 'loss_big') this.tiltLevel = Math.min(1, this.tiltLevel + v);
    else if (handResult === 'loss') this.tiltLevel = Math.min(1, this.tiltLevel + v * 0.3);
    else if (handResult === 'win_big') this.tiltLevel = Math.max(0, this.tiltLevel - v * 0.5);
    else this.tiltLevel = Math.max(0, this.tiltLevel - 0.05);
  }
}
