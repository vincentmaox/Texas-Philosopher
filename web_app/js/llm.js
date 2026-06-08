/* ============================================================
   llm.js — OpenAI-compatible LLM 客户端
   ============================================================ */

const LLM = {
  config: null,

  loadConfig() {
    try {
      this.config = JSON.parse(localStorage.getItem('tp_llm_config') || 'null');
    } catch (e) { this.config = null; }
    return this.config;
  },

  saveConfig(cfg) {
    this.config = cfg;
    localStorage.setItem('tp_llm_config', JSON.stringify(cfg));
  },

  isEnabled() {
    const c = this.config || this.loadConfig();
    return c && c.enabled && c.apiKey && c.baseUrl && c.model;
  },

  async test() {
    const c = this.config;
    if (!c || !c.apiKey) return { ok: false, msg: '未配置 API Key' };
    try {
      const url = c.baseUrl.replace(/\/+$/, '') + '/chat/completions';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + c.apiKey
        },
        body: JSON.stringify({
          model: c.model,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 8
        })
      });
      if (!res.ok) {
        const txt = await res.text();
        return { ok: false, msg: `HTTP ${res.status}: ${txt.slice(0,200)}` };
      }
      return { ok: true, msg: '连接成功 ✓' };
    } catch (e) {
      return { ok: false, msg: '网络错误: ' + e.message };
    }
  },

  /**
   * Ask AI opponent to generate dialogue.
   * Returns { dialogue: string, decision?: 'fold'|'call'|'raise', amount?: number }
   */
  async askAIOpponent(opponent, gameState, trigger, playerMessage = null) {
    if (!this.isEnabled()) return null;
    const c = this.config;
    const sys = this._buildPersonaPrompt(opponent.persona);
    const userMsg = this._buildGameStatePrompt(opponent, gameState, trigger, playerMessage);

    try {
      const url = c.baseUrl.replace(/\/+$/, '') + '/chat/completions';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + c.apiKey
        },
        body: JSON.stringify({
          model: c.model,
          messages: [
            { role: 'system', content: sys },
            { role: 'user', content: userMsg }
          ],
          max_tokens: 200,
          temperature: 0.85
        })
      });
      if (!res.ok) {
        console.warn('LLM error', res.status);
        return null;
      }
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || '';
      return this._parseLLMResponse(text);
    } catch (e) {
      console.warn('LLM exception', e);
      return null;
    }
  },

  _buildPersonaPrompt(persona) {
    return `你正在扮演德州扑克游戏中的对手角色：${persona.name}（${persona.tag}）。
背景：${persona.bio}
策略风格：${persona.style}

# 哲学锚定（必须在台词中体现）
- 独立事件：每一局都是独立的，不要被上一局影响
- 成本管理：资金池+时间池比单局收益更重要
- 鱼塘密度：要会判断牌桌值不值得继续
- 捡钱而非挣钱：只在正期望值时参与
- 快速试错：低成本探测胜过高投入梭哈

# 输出格式（严格）
你必须输出一行 JSON，包含：
{"dialogue": "对玩家说的中文台词，必须≤25字，符合角色性格", "emotion": "neutral|happy|angry|confident|surprised"}

如果场景需要你做决策，额外加入 decision 字段，可选值 fold/check/call/raise/allin，raise 时再加 amount。

只输出 JSON 单行，不要任何额外说明、Markdown、思考过程。`;
  },

  _buildGameStatePrompt(opp, gs, trigger, playerMessage) {
    const triggerDesc = {
      onPlayerAllin: '玩家刚 All-in，作为对手你要反应。',
      onPlayerFold: '玩家刚弃牌。',
      onPlayerFoldStreak: '玩家已连续弃牌超过5手。',
      onPlayerRaise: '玩家刚加注。',
      onPlayerCall: '玩家刚跟注。',
      onSelfAllin: '你即将 All-in，给出豪言。',
      onWinBig: '你刚赢下一个大锅。',
      onLoseBig: '你刚输了一个大锅。',
      onPlayerChat: '玩家直接对你说话，回应他。',
      onHandStart: '新一手开始，可以暖个场。',
      onShowdown: '到了摊牌阶段。'
    };

    return `# 当前牌局
- 你的手牌: ${opp.holeCards.map(cardToString).join(' ')}
- 公共牌: ${gs.community.map(cardToString).join(' ') || '(无)'}
- 底池: ${gs.pot}
- 当前下注额: ${gs.currentBet}
- 你的剩余筹码: ${opp.chips}
- 玩家最近行动: ${gs.lastPlayerAction || '(无)'}
- 你的情绪状态(tilt): ${opp.tiltLevel.toFixed(2)} (0=冷静, 1=情绪化)

# 触发场景
${triggerDesc[trigger] || trigger}

${playerMessage ? '# 玩家刚对你说\n"' + playerMessage + '"\n请用1句话回应他（≤25字），保持你的角色性格。' : ''}

输出 JSON。`;
  },

  _parseLLMResponse(text) {
    // Strip code fences, find JSON
    text = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    // Try to extract first JSON object
    const match = text.match(/\{[\s\S]*?\}/);
    if (!match) return { dialogue: text.slice(0, 60), emotion: 'neutral' };
    try {
      const obj = JSON.parse(match[0]);
      return obj;
    } catch (e) {
      return { dialogue: text.slice(0, 60), emotion: 'neutral' };
    }
  }
};
