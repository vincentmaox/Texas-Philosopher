/* ============================================================
   scoring.js — 决策评分（核心哲学训练）
   每次玩家行动后调用，给出 +/- XP 和反馈
   ============================================================ */

const Scoring = {
  /**
   * Score a single player action.
   * @param {Object} ctx - { action, holeCards, community, pot, toCall, bigBlind,
   *                          lastHandResult, foldStreak, callStreak, raiseStreak,
   *                          tableHandsPlayed, hadPremium }
   * @returns {Array} feedback [{ delta, reason, kind: 'plus'|'minus' }]
   */
  scoreAction(ctx) {
    const feedback = [];
    const strength = estimateHandStrength(ctx.holeCards, ctx.community);
    const potOdds = ctx.toCall > 0 ? ctx.toCall / (ctx.pot + ctx.toCall) : 0;
    const a = ctx.action;

    // ===== 独立事件原则 =====
    if (ctx.lastHandResult === 'loss_big') {
      if (a === 'allin' && strength < 0.5) {
        feedback.push({ delta: -15, reason: '心理账户污染！上局输大锅没有让你冷静，强行翻本。', kind: 'minus' });
      } else if (a === 'fold' && strength < 0.4) {
        feedback.push({ delta: +8, reason: '独立事件思维！上局输光没有让你慌乱报复。', kind: 'plus' });
      }
    }
    if (ctx.lastHandResult === 'win_big') {
      if (a === 'raise' && strength < 0.35) {
        feedback.push({ delta: -10, reason: '过度自信警告！上局赢了让你跌入"我手感来了"陷阱。', kind: 'minus' });
      }
      if (a === 'fold' && strength < 0.35) {
        feedback.push({ delta: +5, reason: '赢钱后仍保持纪律，不被胜利冲昏。', kind: 'plus' });
      }
    }

    // ===== 期望值检查 =====
    if (a === 'fold' && strength < 0.32 && ctx.toCall > 0) {
      feedback.push({ delta: +5, reason: '完美弃牌！避免了 -EV 陷阱。', kind: 'plus' });
    }
    if (a === 'call' && strength < 0.28 && ctx.toCall > ctx.bigBlind * 2) {
      feedback.push({ delta: -12, reason: '-EV 跟注！你在为别人的期望值买单。', kind: 'minus' });
    }
    if (a === 'call' && strength > potOdds + 0.15) {
      feedback.push({ delta: +3, reason: 'pot odds 合理，跟注 +EV。', kind: 'plus' });
    }

    // ===== 捡钱原则 =====
    if (strength > 0.78 && (a === 'raise' || a === 'allin')) {
      feedback.push({ delta: +8, reason: '捡钱模式！好牌就要敢于价值下注。', kind: 'plus' });
    }
    if (strength > 0.75 && a === 'check' && ctx.toCall === 0) {
      feedback.push({ delta: -5, reason: '错失价值！强牌应该下注收钱，不是慢玩到弃光。', kind: 'minus' });
    }
    if (strength > 0.65 && a === 'fold') {
      feedback.push({ delta: -8, reason: '弃掉了强牌！这正是"勉强参与"的反面错误。', kind: 'minus' });
    }

    // ===== 快速试错原则 =====
    if (ctx.foldStreak >= 8) {
      feedback.push({ delta: -3, reason: '过度保守！连弃8手，你只负责捡钱，但鱼游走了。换桌？', kind: 'minus' });
    }
    if (ctx.callStreak >= 4 && a === 'call') {
      feedback.push({ delta: -4, reason: '被动跟注链！跟跟跟不是策略，是被牌桌牵着走。', kind: 'minus' });
    }

    // ===== 鱼塘密度信号 =====
    if (ctx.tableHandsPlayed === 3 && a === 'fold') {
      feedback.push({ delta: +2, reason: '低成本探测：先观察3手再决定是否深入。', kind: 'plus' });
    }

    // ===== 梭哈惩罚 =====
    if (a === 'allin' && strength < 0.45 && ctx.community.length < 3) {
      feedback.push({ delta: -20, reason: 'preflop 梭哈烂牌！这就是文章中讽刺的"梭哈"反面教材。', kind: 'minus' });
    }
    if (a === 'allin' && strength > 0.85) {
      feedback.push({ delta: +12, reason: '非对称风险：下行有限，上行凸性。出手正确。', kind: 'plus' });
    }

    if (feedback.length === 0) {
      feedback.push({ delta: 0, reason: '中性决策。', kind: 'plus' });
    }

    return feedback;
  },

  totalDelta(feedback) {
    return feedback.reduce((s, f) => s + f.delta, 0);
  }
};
