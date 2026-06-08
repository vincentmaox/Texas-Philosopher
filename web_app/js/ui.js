/* ============================================================
   ui.js — DOM 渲染 + Toast + Modal
   ============================================================ */

const UISystem = {
  // ===== View Switching =====
  switchView(name) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const el = document.getElementById('view-' + name);
    if (el) el.classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  },

  // ===== Status Bar =====
  updateStatusBar() {
    if (!Game.player) return;
    const p = Game.player;
    document.getElementById('poolValue').textContent = p.pool;
    document.getElementById('timeValue').textContent = p.time + ':00';
    document.getElementById('mindValue').textContent = p.mind;
    document.getElementById('streakValue').textContent = DailySystem.load().streak;

    const lvl = getLevel(p.xp);
    const title = getTitle(lvl);
    document.getElementById('levelBadge').textContent = title + ' Lv.' + lvl;
  },

  // ===== Map =====
  renderMap() {
    const level = getLevel(Game.player.xp);
    const nodes = generateMap(level, Game.player.unlockedHidden);
    this._mapNodes = nodes;
    const container = document.getElementById('mapNodes');
    container.innerHTML = '';

    for (const node of nodes) {
      const div = document.createElement('div');
      div.className = 'map-node' + (node.danger ? ' danger' : '') + (node.elite ? ' elite' : '');

      // Density pips
      const totalPips = node.density.fish + node.density.shark;
      let pips = '';
      for (let i = 0; i < node.density.fish; i++) pips += '<div class="density-pip fish"></div>';
      for (let i = 0; i < node.density.shark; i++) pips += '<div class="density-pip shark"></div>';

      // Mutation tags
      const muts = node.mutations.map(m => `<span class="mutation-tag">${m.icon} ${m.name}</span>`).join('');

      div.innerHTML = `
        <div class="node-name">${node.elite ? '★ ' : ''}${node.name}</div>
        <div class="node-tagline">${node.tagline}</div>
        <div class="node-stats">
          <div>买入 <strong>${node.free ? '免费' : node.buyIn}</strong></div>
          <div>盲注 <strong>${node.smallBlind}/${node.bigBlind}</strong></div>
          <div>耗时 <strong>${node.timeCost}分钟</strong></div>
          <div>对手 <strong>${node.opponents.length}人</strong></div>
        </div>
        <div class="node-density">${pips}</div>
        ${muts ? '<div class="node-mutations">' + muts + '</div>' : ''}
      `;

      div.onclick = () => {
        const result = Game.enterTable(node);
        if (result.ok) {
          this.switchView('game');
          this.renderGame();
          Game.startHand();
        } else {
          this.showToast(result.msg, 'minus');
        }
      };

      container.appendChild(div);
    }

    this.updateStatusBar();
  },

  // ===== Game Table =====
  renderGame() {
    if (!Game.currentTable) return;

    // Community cards
    const ccEl = document.getElementById('communityCards');
    ccEl.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      if (i < Game.community.length) {
        // Check if river is hidden
        if (Game.hideRiver && i === 4) {
          ccEl.appendChild(renderCard(null, true));
        } else {
          ccEl.appendChild(renderCard(Game.community[i]));
        }
      } else {
        ccEl.appendChild(renderCard(null));
      }
    }

    // Pot
    document.getElementById('potValue').textContent = Game.pot;

    // Round indicator
    document.getElementById('roundIndicator').textContent =
      Game.round ? Game.round.toUpperCase() : '等待发牌';

    // Mutations display
    const mutsEl = document.getElementById('mutationsDisplay');
    if (Game.currentMutations && Game.currentMutations.length > 0) {
      mutsEl.innerHTML = Game.currentMutations.map(m =>
        `<span class="mutation-active">${m.icon} ${m.name}</span>`
      ).join('');
    } else {
      mutsEl.innerHTML = '';
    }

    // Player cards
    const pcEl = document.getElementById('playerCards');
    pcEl.innerHTML = '';
    const pseat = Game.playerSeat;
    if (pseat && pseat.holeCards && pseat.holeCards.length > 0) {
      pseat.holeCards.forEach((card, i) => {
        if (pseat.hiddenCardIndex === i) {
          pcEl.appendChild(renderCard(null, true));
        } else {
          pcEl.appendChild(renderCard(card));
        }
      });
    }

    document.getElementById('playerChips').textContent = pseat ? pseat.chips : 0;

    // Opponents
    this.renderOpponents();

    // Call amount
    const toCall = pseat ? Math.max(0, Game.currentBet - pseat.currentBet) : 0;
    document.getElementById('callAmount').textContent = toCall;

    // Raise slider — increment above current bet
    const slider = document.getElementById('raiseSlider');
    const input = document.getElementById('raiseInput');
    const maxChips = pseat ? pseat.chips : 0;
    slider.max = maxChips;
    const def = Math.min(Math.max(Game.minRaise + toCall, Math.floor(Game.pot * 0.5)), maxChips);
    slider.value = def;
    input.max = maxChips;
    input.value = def;

    this.updateStatusBar();
  },

  renderOpponents() {
    const container = document.getElementById('opponentsArea');
    container.innerHTML = '';

    const oppSeats = Game.seats.filter(s => !s.isHuman);
    for (const seat of oppSeats) {
      const opp = seat.opponent;
      const seatIndex = Game.seats.indexOf(seat);
      const div = document.createElement('div');
      div.className = 'opponent' + (seat.folded ? ' folded' : '') + (Game.activeSeatIndex === seatIndex ? ' active' : '');
      div.id = 'opp-' + seat.id;

      const isRevealed = Game._revealedOpponentSeatIndex === seatIndex;
      const tagVisible = !Game.hideOpponentTagsThisHand;
      const showCards = Game.round === 'showdown' || isRevealed;

      let cardsHtml = '';
      if (seat.holeCards && seat.holeCards.length === 2) {
        if (seat.folded) {
          cardsHtml = '';
        } else if (showCards) {
          cardsHtml = seat.holeCards.map(c => renderCard(c).outerHTML).join('');
        } else {
          cardsHtml = '<div class="card back"></div><div class="card back"></div>';
        }
      }

      div.innerHTML = `
        <div class="opp-name">${opp.name}${seat.allIn ? ' · ALL-IN' : ''}</div>
        <div class="opp-tag">${tagVisible ? opp.tag : '??? 密度未知'}</div>
        <div class="opp-chips">筹码: ${seat.chips}${seat.currentBet > 0 ? ' (下注 '+seat.currentBet+')' : ''}</div>
        <div class="opp-action" id="opp-action-${seat.id}"></div>
        <div class="opp-cards">${cardsHtml}</div>
      `;

      container.appendChild(div);
    }
  },

  showOpponentActive(oppId) {
    // Highlight the active opponent
    document.querySelectorAll('.opponent').forEach(el => el.classList.remove('active'));
    const el = document.getElementById('opp-' + oppId);
    if (el) el.classList.add('active');
  },

  setOpponentAction(oppId, text) {
    const el = document.getElementById('opp-action-' + oppId);
    if (el) el.textContent = text;

    // Also show a bubble
    const oppEl = document.getElementById('opp-' + oppId);
    if (oppEl) {
      const existing = oppEl.querySelector('.opp-bubble');
      if (existing) existing.remove();
      const bubble = document.createElement('div');
      bubble.className = 'opp-bubble';
      bubble.textContent = text;
      oppEl.appendChild(bubble);
      setTimeout(() => bubble.remove(), 4000);
    }
  },

  hideOpponentCards(oppId) {
    const oppEl = document.getElementById('opp-' + oppId);
    if (!oppEl) return;
    const cardsEl = oppEl.querySelector('.opp-cards');
    if (cardsEl) {
      cardsEl.querySelectorAll('.card').forEach(c => {
        c.className = 'card back';
        c.innerHTML = '';
      });
    }
  },

  // ===== Action Bar =====
  showActions() {
    document.getElementById('actionBar').style.display = 'flex';
    const toCall = Game.playerSeat ? Math.max(0, Game.currentBet - Game.playerSeat.currentBet) : 0;

    document.querySelector('[data-action="check"]').style.display = toCall > 0 ? 'none' : 'inline-block';
    document.querySelector('[data-action="call"]').style.display = toCall > 0 ? 'inline-block' : 'none';
    document.getElementById('callAmount').textContent = toCall;
  },

  hideActions() {
    document.getElementById('actionBar').style.display = 'none';
  },

  // ===== Dialogue Stream =====
  addDialogue(text, who, extraClass) {
    const stream = document.getElementById('dialogueStream');
    const div = document.createElement('div');
    div.className = 'dlg-line' + (who === 'system' ? ' system' : '') + (who === 'player' ? ' player' : '') + (extraClass ? ' ' + extraClass : '');
    div.innerHTML = `<span class="dlg-who">${who}</span>${text}`;
    stream.appendChild(div);
    stream.scrollTop = stream.scrollHeight;
  },

  clearDialogue() {
    document.getElementById('dialogueStream').innerHTML = '';
  },

  // ===== Toasts =====
  showToast(msg, kind) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast ' + (kind || 'info');
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('fading'), 2500);
    setTimeout(() => toast.remove(), 3200);
  },

  // ===== Modals =====
  showModal(id) {
    document.getElementById(id).style.display = 'flex';
  },

  hideModal(id) {
    document.getElementById(id).style.display = 'none';
  },

  // ===== Daily View =====
  renderDaily() {
    const d = DailySystem.load();
    document.getElementById('dailyStreakBig').textContent = d.streak;

    const warn = document.getElementById('streakWarn');
    const today = new Date().toISOString().slice(0, 10);
    if (d.lastLoginDate !== today) {
      warn.textContent = '⚠️ 今天还没登录！连胜即将归零！';
      warn.style.color = 'var(--accent-red)';
    } else {
      warn.textContent = '';
    }

    const list = document.getElementById('dailyQuestList');
    list.innerHTML = '';
    for (const q of d.quests) {
      const card = document.createElement('div');
      card.className = 'quest-card' + (q.completed ? ' completed' : '');
      const pct = Math.min(100, (q.progress / q.target) * 100);
      card.innerHTML = `
        <div class="quest-title">${q.completed ? '✅ ' : ''}${q.name}</div>
        <div class="quest-desc">${q.desc}</div>
        <div class="quest-progress"><div class="quest-progress-fill" style="width:${pct}%"></div></div>
        <div class="quest-reward">+${q.reward.xp} XP / +${q.reward.mind} 思维评分 | ${q.progress}/${q.target}</div>
      `;
      list.appendChild(card);
    }

    // Weekly event
    const weekly = DailySystem.getWeeklyEvent();
    const box = document.getElementById('weeklyEventBox');
    box.innerHTML = `<h3>${weekly.icon} ${weekly.name}</h3><p>${weekly.desc}</p>`;
  },

  // ===== Skill Tree =====
  renderSkillTree() {
    const p = Game.player;
    const lvl = getLevel(p.xp);
    const xpInfo = levelProgress(p.xp);

    document.getElementById('xpDisplay').textContent = `${xpInfo.current} / ${xpInfo.max}`;
    document.getElementById('xpFill').style.width = `${xpInfo.current}%`;

    const grid = document.getElementById('skillTreeGrid');
    grid.innerHTML = '';

    for (const skill of SKILL_TREE) {
      const unlocked = p.unlockedSkills.includes(skill.id);
      const canUnlock = !unlocked && p.xp >= skill.cost && skill.prereq.every(pid => p.unlockedSkills.includes(pid));

      const card = document.createElement('div');
      card.className = 'skill-card' + (unlocked ? ' unlocked' : '') + (!unlocked && !canUnlock ? ' locked' : '');
      card.innerHTML = `
        <div class="skill-name">${skill.icon} ${skill.name}</div>
        <div class="skill-desc">${skill.desc}</div>
        <div class="skill-cost">${unlocked ? '已解锁' : '消耗 ' + skill.cost + ' XP'}</div>
      `;

      if (canUnlock) {
        card.onclick = () => {
          Game.player.xp -= skill.cost;
          Game.player.unlockedSkills.push(skill.id);
          Game.save();
          this.renderSkillTree();
          this.showToast(`🔓 解锁技能: ${skill.name}`, 'plus');
        };
      }

      grid.appendChild(card);
    }
  },

  // ===== Settings =====
  renderSettings() {
    const c = LLM.loadConfig();
    if (c) {
      document.getElementById('apiBaseInput').value = c.baseUrl || '';
      document.getElementById('apiKeyInput').value = c.apiKey || '';
      document.getElementById('apiModelInput').value = c.model || '';
      document.getElementById('aiEnabled').checked = !!c.enabled;
    }
  }
};
