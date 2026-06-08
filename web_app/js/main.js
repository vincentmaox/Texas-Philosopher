/* ============================================================
   main.js — 启动 + 事件绑定
   ============================================================ */

window.addEventListener('DOMContentLoaded', () => {
  // Initialize game state
  Game.init();
  LLM.loadConfig();

  // Daily check
  const dailyCheck = DailySystem.checkDay();

  // First time? Show intro
  const isFirstTime = !localStorage.getItem('tp_intro_done');
  if (isFirstTime) {
    UISystem.showModal('introModal');
  } else if (dailyCheck.isNewDay) {
    // Show daily reward modal
    document.getElementById('rewardDay').textContent = dailyCheck.streak;
    const bonus = dailyCheck.streak * 5;
    document.getElementById('streakBonus').textContent =
      dailyCheck.streakBroken
        ? '😞 连胜中断，重新开始。'
        : `🔥 连续登录奖励: +${bonus} 思维评分`;
    UISystem.showModal('dailyRewardModal');

    // Refill time pool
    const timeBonus = 30 + (Game.player.unlockedSkills.includes('time_weaver') ? 10 : 0);
    Game.player.time = Math.min(120, Game.player.time + timeBonus);
    if (!dailyCheck.streakBroken) Game.player.mind += bonus;
    Game.save();
  }

  // Render initial views
  UISystem.updateStatusBar();
  UISystem.renderMap();
  UISystem.renderDaily();
  UISystem.renderSkillTree();
  UISystem.renderSettings();

  // ===== Nav buttons =====
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => {
      const view = btn.dataset.view;
      UISystem.switchView(view);
      if (view === 'map') UISystem.renderMap();
      if (view === 'daily') UISystem.renderDaily();
      if (view === 'skills') UISystem.renderSkillTree();
      if (view === 'settings') UISystem.renderSettings();
    };
  });

  // ===== Intro =====
  document.getElementById('introOkBtn').onclick = () => {
    localStorage.setItem('tp_intro_done', '1');
    UISystem.hideModal('introModal');
  };

  // ===== Daily reward claim =====
  document.getElementById('claimRewardBtn').onclick = () => {
    DailySystem.claimReward();
    UISystem.hideModal('dailyRewardModal');
    UISystem.updateStatusBar();
  };

  // ===== Hand result modal =====
  document.getElementById('nextHandBtn').onclick = () => {
    UISystem.hideModal('handResultModal');
    if (Game.player.pool <= 0) {
      alert('💀 Game Over: 资金池归零。系统给你最后 100 金币，从训练码头重新开始。');
      Game.player.pool = 100;
      Game.save();
      Game.leaveTable();
      return;
    }
    if (Game.playerSeat && Game.playerSeat.chips <= 0) {
      UISystem.showToast('🚪 本桌筹码用完，离开。', 'minus');
      Game.leaveTable();
      return;
    }
    if (Game.player.time <= 0) {
      alert('⏳ 时间池耗尽。明天再来训练。');
      Game.leaveTable();
      return;
    }
    Game.dealerIndex = (Game.dealerIndex + 1) % Game.seats.length;
    Game.player.time = Math.max(0, Game.player.time - 1);
    DailySystem.updateProgress('minutes_played', 1);
    Game.startHand();
  };

  document.getElementById('leaveAfterHandBtn').onclick = () => {
    UISystem.hideModal('handResultModal');
    Game.leaveTable();
  };

  document.getElementById('leaveTableBtn').onclick = () => Game.leaveTable();

  // ===== Action buttons =====
  document.querySelectorAll('.action-btn').forEach(btn => {
    btn.onclick = () => {
      const action = btn.dataset.action;
      if (!action) return;
      let amount = 0;
      if (action === 'raise') {
        amount = parseInt(document.getElementById('raiseInput').value) || Game.minRaise;
      } else if (action === 'allin') {
        amount = Game.playerSeat ? Game.playerSeat.chips : 0;
      }
      Game.playerAct(action, amount);
    };
  });

  // Raise slider <-> input sync
  document.getElementById('raiseSlider').oninput = (e) => {
    document.getElementById('raiseInput').value = e.target.value;
  };
  document.getElementById('raiseInput').oninput = (e) => {
    document.getElementById('raiseSlider').value = e.target.value;
  };

  // ===== Keyboard shortcuts =====
  document.addEventListener('keydown', (e) => {
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
    if (!Game.handInProgress || !Game.playerSeat) return;
    const isPlayerTurn = Game.seats[Game.activeSeatIndex]?.isHuman;
    if (!isPlayerTurn) return;
    const key = e.key.toLowerCase();
    const toCall = Math.max(0, Game.currentBet - Game.playerSeat.currentBet);
    if (key === 'f') Game.playerAct('fold', 0);
    else if (key === 'c') Game.playerAct(toCall > 0 ? 'call' : 'check', toCall);
    else if (key === 'r') Game.playerAct('raise', parseInt(document.getElementById('raiseInput').value) || Game.minRaise);
    else if (key === 'a') Game.playerAct('allin', Game.playerSeat.chips);
  });

  // ===== Player chat to AI =====
  document.getElementById('chatToggleBtn').onclick = () => {
    const box = document.getElementById('playerChatBox');
    box.style.display = box.style.display === 'none' ? 'block' : 'none';
    if (box.style.display === 'block') document.getElementById('playerChatInput').focus();
  };

  document.getElementById('playerChatInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const v = e.target.value.trim();
      if (v) {
        Game.playerTalkToAI(v);
        e.target.value = '';
      }
    }
  });

  // ===== Map footer =====
  document.getElementById('harborEventBtn').onclick = () => {
    if (Game.player.time < 3) { UISystem.showToast('时间池不足', 'minus'); return; }
    Game.player.time -= 3;
    Game.runHarborEvent();
    UISystem.updateStatusBar();
  };

  document.getElementById('refreshMapBtn').onclick = () => {
    if (Game.player.time < 5) { UISystem.showToast('时间池不足', 'minus'); return; }
    Game.player.time -= 5;
    Game.save();
    UISystem.renderMap();
    UISystem.showToast('🌊 海域已刷新', 'info');
  };

  // ===== Settings =====
  document.getElementById('saveApiBtn').onclick = () => {
    const cfg = {
      baseUrl: document.getElementById('apiBaseInput').value.trim(),
      apiKey: document.getElementById('apiKeyInput').value.trim(),
      model: document.getElementById('apiModelInput').value.trim(),
      enabled: document.getElementById('aiEnabled').checked
    };
    LLM.saveConfig(cfg);
    UISystem.showToast('✓ 设置已保存', 'plus');
  };

  document.getElementById('testApiBtn').onclick = async () => {
    const cfg = {
      baseUrl: document.getElementById('apiBaseInput').value.trim(),
      apiKey: document.getElementById('apiKeyInput').value.trim(),
      model: document.getElementById('apiModelInput').value.trim(),
      enabled: true
    };
    LLM.saveConfig(cfg);
    const result = document.getElementById('apiTestResult');
    result.className = 'api-result';
    result.textContent = '测试中...';
    const r = await LLM.test();
    result.className = 'api-result ' + (r.ok ? 'ok' : 'err');
    result.textContent = r.msg;
  };

  document.getElementById('exportSaveBtn').onclick = () => {
    const data = {
      game: Game.loadSave(),
      daily: DailySystem.load(),
      llm: LLM.config,
      intro: localStorage.getItem('tp_intro_done')
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'texas-philosopher-save.json';
    a.click();
  };

  document.getElementById('importSaveBtn').onclick = () => {
    document.getElementById('importFile').click();
  };
  document.getElementById('importFile').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.game) localStorage.setItem('tp_save', JSON.stringify(data.game));
        if (data.daily) localStorage.setItem('tp_daily', JSON.stringify(data.daily));
        if (data.llm) localStorage.setItem('tp_llm_config', JSON.stringify(data.llm));
        if (data.intro) localStorage.setItem('tp_intro_done', data.intro);
        location.reload();
      } catch (err) {
        UISystem.showToast('导入失败: ' + err.message, 'minus');
      }
    };
    reader.readAsText(file);
  };

  document.getElementById('resetSaveBtn').onclick = () => {
    if (confirm('⚠️ 确定要重置全部进度？此操作不可逆。')) {
      localStorage.removeItem('tp_save');
      localStorage.removeItem('tp_daily');
      localStorage.removeItem('tp_intro_done');
      location.reload();
    }
  };

  // ===== Periodic save =====
  setInterval(() => Game.save(), 30000);
});
