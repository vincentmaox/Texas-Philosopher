/* ============================================================
   daily.js — 每日激励系统 (多邻国式)
   ============================================================ */

const DAILY_QUESTS = [
  {
    id: 'fold_10',
    name: '弃掉10手烂牌',
    desc: '训练及时止损意识。只有弃掉该弃的牌，资金池才安全。',
    target: 10, type: 'fold', reward: { xp: 25, mind: 10 }
  },
  {
    id: 'probe_3_ponds',
    name: '探测3个新鱼塘',
    desc: '训练低成本试错：先观察再深入。',
    target: 3, type: 'ponds_explored', reward: { xp: 30, mind: 15 }
  },
  {
    id: 'win_fog_pond',
    name: '在密度迷雾鱼塘赢1局',
    desc: '训练不确定性承受力。',
    target: 1, type: 'fog_pond_win', reward: { xp: 40, mind: 25 }
  },
  {
    id: 'independent_5',
    name: '连续5手不受上局结果影响',
    desc: '强制独立事件思维。Scoring 检测你的独立事件得分 ≥5。',
    target: 5, type: 'independent_streak', reward: { xp: 50, mind: 30 }
  },
  {
    id: 'premium_only_win',
    name: '用捡钱法则赢2手',
    desc: '只打 Premium 手牌并获胜，体会"捡钱而非挣钱"。',
    target: 2, type: 'premium_win', reward: { xp: 35, mind: 20 }
  },
  {
    id: 'play_30_min',
    name: '今日累计游戏30分钟',
    desc: '持之以恒胜过偶尔爆发。',
    target: 30, type: 'minutes_played', reward: { xp: 20, mind: 5 }
  },
  {
    id: 'no_tilt',
    name: '连输3手后仍冷静弃牌',
    desc: '情绪隔离训练。连输后做出正确弃牌 = 成功。',
    target: 1, type: 'tilt_fold', reward: { xp: 45, mind: 35 }
  },
  {
    id: 'time_manager',
    name: '剩余时间池 > 10分钟时结束游戏',
    desc: '训练成本管理：知道何时离开比何时参与更重要。',
    target: 1, type: 'good_exit', reward: { xp: 25, mind: 15 }
  }
];

const WEEKLY_EVENTS = [
  { name: '弃牌大师赛', desc: '只能弃牌或 All-in 的特殊鱼塘', icon: '🃏' },
  { name: '频率猎手周', desc: '赢得最多独立事件 +XP 的人获胜', icon: '📊' },
  { name: '真空建筑师挑战', desc: '仅使用虚空建筑师策略打完5局', icon: '🔮' }
];

const DailySystem = {
  _key: 'tp_daily',

  load() {
    try { return JSON.parse(localStorage.getItem(this._key)) || this._create(); }
    catch(e) { return this._create(); }
  },

  save(d) { localStorage.setItem(this._key, JSON.stringify(d)); },

  _create() {
    const today = new Date().toISOString().slice(0, 10);
    // Pick 3 random quests
    const shuffled = [...DAILY_QUESTS].sort(() => Math.random() - 0.5).slice(0, 3);
    return {
      date: today,
      quests: shuffled.map(q => ({ ...q, progress: 0, completed: false })),
      streak: 0,
      lastLoginDate: null,
      rewardClaimed: false,
      weeklyEventIndex: Math.floor(Date.now() / 604800000) % WEEKLY_EVENTS.length
    };
  },

  checkDay() {
    const d = this.load();
    const today = new Date().toISOString().slice(0, 10);
    if (d.date !== today) {
      // New day
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const streakBroken = d.lastLoginDate && d.lastLoginDate !== yesterday;
      const prevStreak = streakBroken ? 0 : (d.streak || 0);

      const fresh = this._create();
      fresh.streak = prevStreak + 1;
      fresh.lastLoginDate = today;
      this.save(fresh);
      return { isNewDay: true, streakBroken, streak: fresh.streak, quests: fresh.quests };
    }
    return { isNewDay: false, streak: d.streak, quests: d.quests };
  },

  updateProgress(type, amount = 1) {
    const d = this.load();
    let changed = false;
    for (const q of d.quests) {
      if (q.type === type && !q.completed) {
        q.progress = Math.min(q.target, q.progress + amount);
        if (q.progress >= q.target) q.completed = true;
        changed = true;
      }
    }
    if (changed) this.save(d);
    return d.quests;
  },

  claimReward() {
    const d = this.load();
    if (!d.rewardClaimed) {
      d.rewardClaimed = true;
      this.save(d);
      return { streak: d.streak, bonusMind: d.streak * 5 };
    }
    return null;
  },

  getWeeklyEvent() {
    const d = this.load();
    return WEEKLY_EVENTS[d.weeklyEventIndex || 0];
  }
};
