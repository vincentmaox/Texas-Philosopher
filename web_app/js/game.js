/* ============================================================
   game.js — 核心游戏引擎 (统一 seats 模型)
   - seats[0..N-1] = AI 对手, seats[N] = 人类玩家
   - 每个 seat: { id, isHuman, chips, holeCards, currentBet, folded,
                  allIn, actedThisRound, name, opponent? }
   ============================================================ */

const Game = {
  // ===== Persistent State =====
  player: null,        // { pool, time, mind, xp, unlockedSkills, ... }
  // ===== Per-table State =====
  currentTable: null,
  seats: [],           // unified array
  playerSeat: null,    // reference to player's seat
  dealerIndex: 0,
  community: [],
  deck: [],
  pot: 0,
  currentBet: 0,
  minRaise: 0,
  round: 'preflop',
  activeSeatIndex: 0,
  handInProgress: false,
  handCount: 0,
  lastHandResult: null,
  lastPlayerAction: null,
  // Streaks for scoring
  foldStreak: 0,
  callStreak: 0,
  raiseStreak: 0,
  independentStreak: 0,
  premiumWinCount: 0,
  // Mutations
  currentMutations: [],
  mutationHooks: {},
  hideRiver: false,
  hideOpponentTagsThisHand: false,
  _forcedAllinSeatIndex: -1,
  _forcePlayerFold: false,
  _revealedOpponentSeatIndex: -1,
  actionTimeLimit: 0,
  _actionTimer: null,

  KEY: 'tp_save',

  // ===== Persistence =====
  init() {
    const saved = this.loadSave();
    if (saved && saved.player) {
      this.player = saved.player;
    } else {
      this.player = {
        pool: 1000,
        time: 30,
        mind: 0,
        xp: 0,
        unlockedSkills: [],
        unlockedHidden: false,
        totalHandsPlayed: 0
      };
    }
    // Ensure required fields
    this.player.pool ??= 1000;
    this.player.time ??= 30;
    this.player.mind ??= 0;
    this.player.xp ??= 0;
    this.player.unlockedSkills ??= [];
  },

  loadSave() {
    try { return JSON.parse(localStorage.getItem(this.KEY) || 'null'); }
    catch (e) { return null; }
  },

  save() {
    localStorage.setItem(this.KEY, JSON.stringify({ player: this.player }));
  },

  // ===== Enter / Leave Table =====
  enterTable(node) {
    const isFree = node.free;
    if (!isFree && this.player.pool < node.buyIn) {
      return { ok: false, msg: '💰 资金不足。买入 ' + node.buyIn + '，当前 ' + this.player.pool };
    }
    if (this.player.time < node.timeCost) {
      return { ok: false, msg: '⏳ 时间池不足，需要 ' + node.timeCost + ' 分钟' };
    }

    if (!isFree) this.player.pool -= node.buyIn;
    this.player.time -= node.timeCost;

    this.currentTable = node;
    const startingChips = isFree ? 500 : node.buyIn * 20;

    // Build seats: opponents first, player last
    this.seats = [];
    node.opponents.forEach((personaId, i) => {
      const opp = new AIOpponent(personaId, startingChips, i);
      this.seats.push({
        id: 'opp_' + i,
        isHuman: false,
        chips: startingChips,
        holeCards: [],
        currentBet: 0,
        folded: false,
        allIn: false,
        actedThisRound: false,
        name: opp.name,
        opponent: opp,
        hiddenCardIndex: -1
      });
    });
    this.playerSeat = {
      id: 'player',
      isHuman: true,
      chips: startingChips,
      holeCards: [],
      currentBet: 0,
      folded: false,
      allIn: false,
      actedThisRound: false,
      name: '你',
      hiddenCardIndex: -1
    };
    this.seats.push(this.playerSeat);

    this.dealerIndex = 0;
    this.handCount = 0;
    this.foldStreak = 0;
    this.callStreak = 0;
    this.raiseStreak = 0;
    this.independentStreak = 0;
    this.premiumWinCount = 0;
    this.lastHandResult = null;
    this.community = [];

    this._setupMutations(node.mutations || []);

    return { ok: true };
  },

  leaveTable() {
    this.handInProgress = false;
    this._clearActionTimer();
    UISystem.hideModal('handResultModal');

    if (this.player.time > 10) {
      DailySystem.updateProgress('good_exit');
      UISystem.showToast('🕊️ 时间管理：剩余时间充裕，知道何时离开。', 'plus');
    }

    this.currentTable = null;
    this.seats = [];
    this.playerSeat = null;
    this.community = [];
    this.save();
    UISystem.switchView('map');
    UISystem.renderMap();
  },

  _setupMutations(mutations) {
    this.currentMutations = mutations;
    this.mutationHooks = {};
    // Mutations modify per-table parameters
    for (const mut of mutations) {
      if (mut.apply) {
        // Simplified: mutations can read this.currentTable, set hooks
        mut.apply(this, this.mutationHooks);
      }
    }
  },

  // ===== Hand Lifecycle =====
  startHand() {
    if (!this.currentTable || this.seats.length < 2) return;
    this.handInProgress = true;
    this.handCount++;
    this.player.totalHandsPlayed = (this.player.totalHandsPlayed || 0) + 1;

    this.community = [];
    this.pot = 0;
    this.currentBet = 0;
    this.round = 'preflop';
    this.deck = shuffle(makeDeck());

    // Reset seats
    this.seats.forEach(s => {
      s.holeCards = [];
      s.currentBet = 0;
      s.folded = false;
      s.allIn = false;
      s.actedThisRound = false;
      s.hiddenCardIndex = -1;
      if (s.opponent) s.opponent.reset();
    });
    this.playerSeat.hiddenCardIndex = -1;
    this._forcePlayerFold = false;
    this._forcedAllinSeatIndex = -1;
    this._revealedOpponentSeatIndex = -1;
    this.hideRiver = false;
    this.hideOpponentTagsThisHand = !!(this.currentTable && this.currentMutations.find(m => m.id === 'density_fog')) && this.handCount === 1;
    this.actionTimeLimit = this.currentMutations.find(m => m.id === 'time_speed') ? 15000 : 0;

    // Skip eliminated seats
    const liveSeats = this.seats.filter(s => s.chips > 0);
    if (liveSeats.length < 2) {
      UISystem.showToast('对手都被打光了，胜利！', 'plus');
      this.leaveTable();
      return;
    }

    // Deal hole cards
    for (let n = 0; n < 2; n++) {
      for (const s of this.seats) {
        if (s.chips > 0) s.holeCards.push(this.deck.pop());
      }
    }

    // Mutation: info blackhole (hide one of player's cards)
    if (this.currentMutations.find(m => m.id === 'info_blackhole')) {
      this.playerSeat.hiddenCardIndex = Math.floor(Math.random() * 2);
    }

    // Mutation: mind_reader (reveal one opponent's cards)
    if (this.currentMutations.find(m => m.id === 'mind_reader')) {
      const oppSeats = this.seats.filter(s => !s.isHuman && s.chips > 0);
      if (oppSeats.length > 0) {
        const target = oppSeats[Math.floor(Math.random() * oppSeats.length)];
        this._revealedOpponentSeatIndex = this.seats.indexOf(target);
      }
    }

    // Mutation: forced all-in
    if (this.currentMutations.find(m => m.id === 'forced_allin')) {
      const live = this.seats.filter(s => s.chips > 0);
      const victim = live[Math.floor(Math.random() * live.length)];
      this._forcedAllinSeatIndex = this.seats.indexOf(victim);
    }

    // Mutation: premium only (force fold if not premium)
    if (this.currentMutations.find(m => m.id === 'premium_only')) {
      if (!this._isPremiumHand(this.playerSeat.holeCards)) {
        this._forcePlayerFold = true;
      }
    }

    // Post blinds
    const mutDoubleBlinds = !!this.currentMutations.find(m => m.id === 'reverse_blinds');
    const sb = this.currentTable.smallBlind * (mutDoubleBlinds ? 2 : 1);
    const bb = this.currentTable.bigBlind * (mutDoubleBlinds ? 2 : 1);
    this.minRaise = bb;

    const live = this.seats.map((s, i) => s.chips > 0 ? i : -1).filter(i => i >= 0);
    const dealerLiveIdx = live.indexOf(this.dealerIndex);
    const dealerLive = dealerLiveIdx >= 0 ? dealerLiveIdx : 0;
    const sbSeat = this.seats[live[(dealerLive + 1) % live.length]];
    const bbSeat = this.seats[live[(dealerLive + 2) % live.length]];

    this._postBet(sbSeat, Math.min(sb, sbSeat.chips));
    this._postBet(bbSeat, Math.min(bb, bbSeat.chips));
    this.currentBet = bb;

    // Sunk cost mutation: charge extra if last hand was a fold
    if (this._sunkCostFlag) {
      const extra = Math.floor(bb * 0.5);
      this._postBet(this.playerSeat, Math.min(extra, this.playerSeat.chips));
      UISystem.showToast('⚓ 沉没成本诅咒激活：本手 +50% 底注', 'minus');
      this._sunkCostFlag = false;
    }

    // First to act: UTG (after BB). Set to "one before" so _proceedToNextActor advances onto UTG.
    const utgLiveIdx = (live.indexOf(this.seats.indexOf(bbSeat)) + 1) % live.length;
    const utgSeatIndex = live[utgLiveIdx];
    this.activeSeatIndex = (utgSeatIndex - 1 + this.seats.length) % this.seats.length;

    UISystem.clearDialogue();
    UISystem.addDialogue(`第 ${this.handCount} 手 — ${this.currentTable.name}`, 'system');
    UISystem.addDialogue(`SB ${sb} / BB ${bb} | 你的手牌已发出`, 'system');

    // Set player position label
    const playerSeatIdx = this.seats.indexOf(this.playerSeat);
    let pos = 'BTN';
    if (playerSeatIdx === this.seats.indexOf(sbSeat)) pos = 'SB';
    else if (playerSeatIdx === this.seats.indexOf(bbSeat)) pos = 'BB';
    else if (playerSeatIdx === this.dealerIndex) pos = 'BTN';
    else pos = 'UTG';
    const posEl = document.getElementById('playerPosition');
    if (posEl) posEl.textContent = pos;

    UISystem.renderGame();

    // 30% chance an AI says something on hand start
    if (Math.random() < 0.3) this._triggerRandomAI('onHandStart');

    this._proceedToNextActor();
  },

  _postBet(seat, amount) {
    const actual = Math.min(amount, seat.chips);
    seat.chips -= actual;
    seat.currentBet += actual;
    this.pot += actual;
    if (seat.chips === 0) seat.allIn = true;
  },

  // ===== Turn Loop =====
  _proceedToNextActor() {
    if (!this.handInProgress) return;

    // Check if hand should end (only one non-folded)
    const stillIn = this.seats.filter(s => !s.folded && s.chips >= 0 && s.holeCards.length > 0);
    if (stillIn.length <= 1) {
      this._endHand('one_left');
      return;
    }

    // Check if betting round complete
    if (this._isBettingRoundComplete()) {
      this._advanceStreet();
      return;
    }

    // Find next actor
    const totalSeats = this.seats.length;
    let attempts = 0;
    while (attempts < totalSeats * 2) {
      this.activeSeatIndex = (this.activeSeatIndex + 1) % totalSeats;
      attempts++;
      const seat = this.seats[this.activeSeatIndex];
      if (seat.folded || seat.chips === 0 || seat.allIn) continue;
      // Skip if seat hasn't been dealt
      if (seat.holeCards.length === 0) continue;

      // Found next actor
      if (seat.isHuman) {
        this._giveHumanTurn(seat);
      } else {
        this._giveAITurn(seat);
      }
      return;
    }

    // No one can act, advance
    this._advanceStreet();
  },

  _isBettingRoundComplete() {
    const active = this.seats.filter(s => !s.folded && s.holeCards.length > 0);
    const needAction = active.filter(s => !s.allIn);
    if (needAction.length === 0) return true;
    // All non-allin seats must have acted AND have matching bets
    const allActed = needAction.every(s => s.actedThisRound);
    const allMatched = needAction.every(s => s.currentBet === this.currentBet);
    return allActed && allMatched;
  },

  _giveHumanTurn(seat) {
    if (this._forcePlayerFold) {
      this._forcePlayerFold = false;
      UISystem.addDialogue('💎 捡钱法则：手牌不达 Premium 标准，强制弃牌。', 'system');
      this._executeAction(seat, 'fold', 0);
      return;
    }
    if (this._forcedAllinSeatIndex === this.seats.indexOf(seat)) {
      UISystem.addDialogue('🔥 梭哈狂热：你被强制 All-in', 'system');
      this._executeAction(seat, 'allin', seat.chips);
      return;
    }
    UISystem.renderGame();
    UISystem.showActions();
    this._startActionTimer();
  },

  _giveAITurn(seat) {
    UISystem.hideActions();
    UISystem.renderGame();
    UISystem.showOpponentActive(seat.id);

    setTimeout(() => {
      if (!this.handInProgress || seat.folded) return;

      // Forced allin mutation
      if (this._forcedAllinSeatIndex === this.seats.indexOf(seat)) {
        this._executeAction(seat, 'allin', seat.chips);
        return;
      }

      const gs = {
        community: this.community,
        pot: this.pot,
        currentBet: this.currentBet,
        minRaise: this.minRaise,
        bigBlind: this.currentTable.bigBlind,
        lastPlayerAction: this.lastPlayerAction
      };
      // AI engine uses opponent.holeCards/currentBet/chips, copy over
      seat.opponent.holeCards = seat.holeCards;
      seat.opponent.currentBet = seat.currentBet;
      seat.opponent.chips = seat.chips;
      seat.opponent.folded = seat.folded;
      seat.opponent.allIn = seat.allIn;

      const decision = seat.opponent.decideAction(gs);
      this._executeAction(seat, decision.action, decision.amount);
    }, 600 + Math.random() * 600);
  },

  // ===== Execute Action =====
  _executeAction(seat, action, amount) {
    this._clearActionTimer();
    if (!this.handInProgress) return;
    if (seat.folded) return;

    const toCall = Math.max(0, this.currentBet - seat.currentBet);

    // Score human player action
    if (seat.isHuman) {
      this._scorePlayerAction(action, amount, toCall);
    }

    let actionLabel = '';

    if (action === 'fold') {
      seat.folded = true;
      seat.actedThisRound = true;
      actionLabel = '弃牌';

      if (seat.isHuman) {
        this.foldStreak++;
        this.callStreak = 0;
        this.raiseStreak = 0;
        this._sunkCostFlag = !!this.currentMutations.find(m => m.id === 'sunk_cost');
        DailySystem.updateProgress('fold', 1);
        this.lastPlayerAction = 'fold';
        if (this.foldStreak >= 5) this._triggerRandomAI('onPlayerFoldStreak');
        else this._triggerRandomAI('onPlayerFold');
      } else {
        UISystem.hideOpponentCards(seat.id);
      }
    } else if (action === 'check') {
      seat.actedThisRound = true;
      actionLabel = '过牌';
      if (seat.isHuman) {
        this.foldStreak = 0;
        this.lastPlayerAction = 'check';
      }
    } else if (action === 'call') {
      const callAmt = Math.min(toCall, seat.chips);
      this._postBet(seat, callAmt);
      seat.actedThisRound = true;
      actionLabel = `跟注 ${callAmt}` + (seat.allIn ? ' (All-in)' : '');
      if (seat.isHuman) {
        this.foldStreak = 0;
        this.callStreak++;
        this.lastPlayerAction = 'call';
      }
    } else if (action === 'raise' || action === 'allin') {
      // For raise: `amount` is additional chips to put in (includes the call portion).
      //   We compute the additional outlay, but enforce min-raise above current bet.
      let additional;
      if (action === 'allin') {
        additional = seat.chips;
      } else {
        const minTotalBet = this.currentBet + this.minRaise;
        const proposedTotal = seat.currentBet + amount;
        const targetTotal = Math.max(minTotalBet, proposedTotal);
        additional = Math.min(seat.chips, targetTotal - seat.currentBet);
        if (additional < (this.currentBet - seat.currentBet)) {
          // Not enough to even call → degrade to call
          additional = Math.min(seat.chips, this.currentBet - seat.currentBet);
        }
      }
      this._postBet(seat, additional);

      if (seat.currentBet > this.currentBet) {
        const raiseAmount = seat.currentBet - this.currentBet;
        this.minRaise = Math.max(this.minRaise, raiseAmount);
        this.currentBet = seat.currentBet;
        // Reset others' actedThisRound
        this.seats.forEach(s => { if (s !== seat && !s.folded && !s.allIn) s.actedThisRound = false; });
      }
      seat.actedThisRound = true;
      actionLabel = (seat.allIn ? `All-in! ${seat.currentBet}` : `加注到 ${seat.currentBet}`);

      if (seat.isHuman) {
        this.foldStreak = 0;
        this.callStreak = 0;
        this.raiseStreak++;
        this.lastPlayerAction = action === 'allin' ? 'allin' : 'raise';
        if (action === 'allin') this._triggerRandomAI('onPlayerAllin');
        else this._triggerRandomAI('onPlayerRaise');
      } else {
        if (seat.allIn) this._triggerSpecificAI(seat.opponent, 'onSelfAllin');
      }
    }

    // UI feedback
    if (seat.isHuman) {
      UISystem.addDialogue(actionLabel, 'player');
    } else {
      UISystem.addDialogue(`${seat.name}: ${actionLabel}`, 'system');
      UISystem.setOpponentAction(seat.id, actionLabel);
    }

    this.save();
    UISystem.renderGame();
    setTimeout(() => this._proceedToNextActor(), 400);
  },

  _scorePlayerAction(action, amount, toCall) {
    const ctx = {
      action, amount,
      holeCards: this.playerSeat.holeCards,
      community: this.community,
      pot: this.pot,
      toCall,
      bigBlind: this.currentTable.bigBlind,
      lastHandResult: this.lastHandResult,
      foldStreak: this.foldStreak,
      callStreak: this.callStreak,
      raiseStreak: this.raiseStreak,
      tableHandsPlayed: this.handCount
    };
    const feedback = Scoring.scoreAction(ctx);
    const delta = Scoring.totalDelta(feedback);
    this.player.xp = Math.max(0, this.player.xp + delta);
    this.player.mind = Math.max(0, this.player.mind + delta);

    // Track quest: independent_streak
    if (feedback.some(f => f.reason.includes('独立事件') && f.delta > 0)) {
      this.independentStreak++;
      if (this.independentStreak >= 5) DailySystem.updateProgress('independent_streak', 1);
    } else if (feedback.some(f => f.reason.includes('心理账户') || f.reason.includes('沉没成本'))) {
      this.independentStreak = 0;
    }

    // Quest: tilt_fold
    if (action === 'fold' && (this.lastHandResult === 'loss' || this.lastHandResult === 'loss_big') && this.foldStreak >= 3) {
      DailySystem.updateProgress('tilt_fold');
    }

    // Show feedback toasts
    for (const f of feedback) {
      if (f.delta !== 0) {
        UISystem.showToast(`${f.delta > 0 ? '+' : ''}${f.delta}: ${f.reason}`, f.kind === 'plus' ? 'plus' : 'minus');
      }
    }
  },

  // ===== Street Advancement =====
  _advanceStreet() {
    // Collect bets into pot (already in pot, just reset currentBet for next round)
    this.seats.forEach(s => {
      s.currentBet = 0;
      s.actedThisRound = false;
    });
    this.currentBet = 0;
    this.minRaise = this.currentTable.bigBlind;

    if (this.round === 'preflop') {
      this.deck.pop();
      this.community.push(this.deck.pop(), this.deck.pop(), this.deck.pop());
      this.round = 'flop';
    } else if (this.round === 'flop') {
      this.deck.pop();
      this.community.push(this.deck.pop());
      this.round = 'turn';
    } else if (this.round === 'turn') {
      this.deck.pop();
      this.community.push(this.deck.pop());
      this.round = 'river';
      if (this.currentMutations.find(m => m.id === 'blind_river')) this.hideRiver = true;
    } else if (this.round === 'river') {
      this._endHand('showdown');
      return;
    }

    UISystem.addDialogue(`——— ${this.round.toUpperCase()} ———`, 'system');
    UISystem.renderGame();

    // First to act: first non-folded seat after dealer
    const live = this.seats.map((s,i) => (!s.folded && !s.allIn && s.holeCards.length > 0) ? i : -1).filter(i => i >= 0);
    if (live.length === 0) {
      // All allin, just deal out remaining streets fast
      setTimeout(() => this._advanceStreet(), 500);
      return;
    }
    // Start from seat after dealer
    let startIdx = (this.dealerIndex + 1) % this.seats.length;
    while (!live.includes(startIdx)) startIdx = (startIdx + 1) % this.seats.length;
    this.activeSeatIndex = (startIdx - 1 + this.seats.length) % this.seats.length;

    setTimeout(() => this._proceedToNextActor(), 500);
  },

  // ===== End Hand =====
  _endHand(reason) {
    this.handInProgress = false;
    UISystem.hideActions();
    this._clearActionTimer();

    const contenders = this.seats.filter(s => !s.folded && s.holeCards.length === 2);
    let winnerSeat = null;
    let detailHtml = '';

    if (contenders.length === 1) {
      winnerSeat = contenders[0];
      winnerSeat.chips += this.pot;
      detailHtml = `<p style="font-size:18px;font-weight:700;color:${winnerSeat.isHuman ? 'var(--accent-green)' : 'var(--accent-red)'}">${winnerSeat.name} 不战而胜，赢得 ${this.pot}</p>`;
    } else {
      // Showdown — evaluate all
      let bestScore = null;
      const evaluated = contenders.map(s => {
        const h = bestHand(s.holeCards, this.community);
        return { seat: s, hand: h };
      });
      evaluated.sort((a, b) => compareScore(b.hand.score, a.hand.score));
      winnerSeat = evaluated[0].seat;
      const winnerHand = evaluated[0].hand;

      // Check for ties (chop pot)
      const tied = evaluated.filter(e => compareScore(e.hand.score, winnerHand.score) === 0);
      const share = Math.floor(this.pot / tied.length);
      tied.forEach(e => e.seat.chips += share);

      detailHtml = `<p style="font-size:16px;font-weight:700;color:${winnerSeat.isHuman ? 'var(--accent-green)' : 'var(--accent-red)'}">
        ${tied.length > 1 ? '平池！' : '获胜：'}${tied.map(t => t.seat.name).join(', ')} — ${winnerHand.name}
      </p>`;
      detailHtml += '<div class="score-box">';
      for (const ev of evaluated) {
        const marker = tied.includes(ev) ? '🏆 ' : '';
        detailHtml += `<div>${marker}${ev.seat.name}: ${ev.seat.holeCards.map(cardToString).join(' ')} → ${ev.hand.name}</div>`;
      }
      detailHtml += '</div>';
    }

    // Determine player result
    const playerWon = winnerSeat && winnerSeat.isHuman;
    const playerInShowdown = contenders.includes(this.playerSeat);
    const potRelative = this.pot / Math.max(1, this.currentTable.buyIn);
    if (playerWon) {
      this.lastHandResult = potRelative > 5 ? 'win_big' : 'win';
      // Pool gain
      const gain = this.pot - this._playerInvestedThisHand();
      this.player.pool += gain;
      // Premium win tracking
      if (this._isPremiumHand(this.playerSeat.holeCards)) {
        this.premiumWinCount++;
        DailySystem.updateProgress('premium_win', 1);
      }
    } else if (playerInShowdown || this.playerSeat.folded === false) {
      this.lastHandResult = potRelative > 5 ? 'loss_big' : 'loss';
      this.player.pool -= this._playerInvestedThisHand();
    } else {
      // Player folded earlier — small loss (blinds)
      this.lastHandResult = 'loss';
      this.player.pool -= this._playerInvestedThisHand();
    }

    // Update opponent tilt
    this.seats.forEach(s => {
      if (s.opponent) {
        const oppWon = s === winnerSeat;
        s.opponent.updateTilt(oppWon ? 'win_big' : 'loss');
      }
    });

    // Show modal
    document.getElementById('handResultTitle').textContent = `第 ${this.handCount} 手结算`;
    document.getElementById('handResultBody').innerHTML = detailHtml;

    const scoreBox = document.getElementById('decisionScoreBox');
    scoreBox.innerHTML = `
      <div class="score-line">本桌已打: ${this.handCount} 手</div>
      <div class="score-line plus">资金池: 💰 ${this.player.pool}</div>
      <div class="score-line">时间池: ⏳ ${this.player.time} 分钟</div>
      <div class="score-line">思维评分: 🧠 ${this.player.mind}</div>
      <div class="score-line">本桌筹码: ${this.playerSeat.chips}</div>
      <div class="score-line ${this.independentStreak >= 5 ? 'plus' : ''}">独立事件连胜: ${this.independentStreak}</div>
    `;

    if (this.lastHandResult === 'win_big' || this.lastHandResult === 'loss_big') {
      this._triggerRandomAI(this.lastHandResult === 'win_big' ? 'onLoseBig' : 'onWinBig');
    }

    this.save();
    UISystem.showModal('handResultModal');
  },

  _playerInvestedThisHand() {
    return (this.playerSeat._initialChips || 0) - this.playerSeat.chips;
  },

  _isPremiumHand(holeCards) {
    if (!holeCards || holeCards.length < 2) return false;
    const v1 = RANK_VALUE[holeCards[0].rank], v2 = RANK_VALUE[holeCards[1].rank];
    const paired = holeCards[0].rank === holeCards[1].rank;
    return (paired && v1 >= 12) || (v1 === 14 && v2 === 13) || (v2 === 14 && v1 === 13);
  },

  // ===== AI Dialogue Triggers =====
  _triggerRandomAI(trigger) {
    const active = this.seats.filter(s => !s.isHuman && !s.folded);
    if (active.length === 0) return;
    const speaker = active[Math.floor(Math.random() * active.length)];
    this._triggerSpecificAI(speaker.opponent, trigger);
  },

  _triggerSpecificAI(opp, trigger) {
    if (!opp) return;
    if (LLM.isEnabled()) {
      const gs = { community: this.community, pot: this.pot, currentBet: this.currentBet, minRaise: this.minRaise, lastPlayerAction: this.lastPlayerAction };
      LLM.askAIOpponent(opp, gs, trigger).then(resp => {
        if (resp && resp.dialogue) {
          UISystem.addDialogue(resp.dialogue, opp.name);
        } else {
          this._emitRuleLine(opp, trigger);
        }
      }).catch(() => this._emitRuleLine(opp, trigger));
    } else {
      this._emitRuleLine(opp, trigger);
    }
  },

  _emitRuleLine(opp, trigger) {
    const line = opp.getReactionLine(trigger);
    if (line) {
      setTimeout(() => UISystem.addDialogue(line, opp.name), 200);
    }
  },

  // Public: player talks
  async playerTalkToAI(message) {
    UISystem.addDialogue(`"${message}"`, '你');
    const active = this.seats.filter(s => !s.isHuman && !s.folded);
    if (active.length === 0) return;
    const speaker = active[Math.floor(Math.random() * active.length)].opponent;

    if (LLM.isEnabled()) {
      const gs = { community: this.community, pot: this.pot, currentBet: this.currentBet, minRaise: this.minRaise, lastPlayerAction: this.lastPlayerAction };
      const resp = await LLM.askAIOpponent(speaker, gs, 'onPlayerChat', message);
      if (resp && resp.dialogue) {
        UISystem.addDialogue(resp.dialogue, speaker.name);
      } else {
        UISystem.addDialogue('(对方没有回应)', 'system');
      }
    } else {
      const responses = [
        '独立事件，先看牌再说话。',
        '说话不影响 EV。',
        '你这话术老套了。',
        '专心打牌。',
        '有意思。'
      ];
      setTimeout(() => UISystem.addDialogue(responses[Math.floor(Math.random() * responses.length)], speaker.name), 400);
    }
  },

  // ===== Player Action Public API =====
  playerAct(action, amount) {
    if (!this.handInProgress) return;
    const seat = this.seats[this.activeSeatIndex];
    if (!seat || !seat.isHuman) return;
    this._executeAction(seat, action, amount);
  },

  // ===== Timer =====
  _startActionTimer() {
    this._clearActionTimer();
    if (!this.actionTimeLimit) return;
    this._actionTimer = setTimeout(() => {
      if (this.handInProgress && this.seats[this.activeSeatIndex]?.isHuman) {
        UISystem.showToast('⏱️ 超时，强制弃牌！', 'minus');
        this.playerAct('fold', 0);
      }
    }, this.actionTimeLimit);
  },

  _clearActionTimer() {
    if (this._actionTimer) { clearTimeout(this._actionTimer); this._actionTimer = null; }
  },

  // ===== Harbor Event =====
  runHarborEvent() {
    const evt = triggerHarborEvent();
    document.getElementById('harborTitle').textContent = evt.title;
    document.getElementById('harborDesc').textContent = evt.desc;

    const box = document.getElementById('harborChoices');
    box.innerHTML = '';
    evt.choices.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'btn-primary';
      btn.style.display = 'block';
      btn.style.width = '100%';
      btn.style.margin = '8px 0';
      btn.textContent = c.label;
      btn.onclick = () => {
        const result = c.effect(this.player);
        UISystem.showToast(result, 'info');
        UISystem.hideModal('harborModal');
        this.save();
        UISystem.renderMap();
      };
      box.appendChild(btn);
    });
    UISystem.showModal('harborModal');
  }
};

// Patch: snapshot starting chips on hand start, so we can compute net change
const _origStartHand = Game.startHand.bind(Game);
Game.startHand = function() {
  _origStartHand();
  if (this.playerSeat) this.playerSeat._initialChips = this.playerSeat.chips + this.playerSeat.currentBet;
  this.seats.forEach(s => s._initialChips = s.chips + s.currentBet);
};
