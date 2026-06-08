import { PokerEngine } from '@/engine/poker-engine';
import { AIDecisionEngine } from '@/ai/decision-engine';
import { TableRenderer } from '@/ui/canvas/table-renderer';
import { AnimationLoop } from '@/ui/canvas/animation-loop';
import { EVReveal } from '@/training/ev-reveal';
import { AidController } from '@/training/aid-controller';
import { buildFeedbackItem } from '@/training/feedback-engine';
import { showReportModal } from '@/ui/components/report-modal';
import { showToast } from '@/ui/components/toast';
import { DialoguePanel } from '@/ui/components/dialogue-panel';
import { TutorialOverlay } from '@/ui/components/tutorial-overlay';
import type { GameMode, Seat, DecisionRecord, HandResult, PlayerAction } from '@/types/game';
import type { AIDecision } from '@/types/ai';
import { PALETTE } from '@/ui/theme/palette';
import { soundManager } from '@/audio/sound-manager';

export class GameScreen {
  private container: HTMLElement;
  private engine: PokerEngine;
  private aiEngine: AIDecisionEngine;
  private renderer: TableRenderer;
  private animLoop: AnimationLoop;
  private canvas: HTMLCanvasElement;
  private evReveal: EVReveal;
  private aidController: AidController;
  private dialoguePanel: DialoguePanel;
  private tutorial: TutorialOverlay | null = null;

  // UI elements
  private actionBar: HTMLElement | null = null;
  private feedbackPanel: HTMLElement | null = null;
  private handSummary: HTMLElement | null = null;
  private raiseSliderContainer: HTMLElement | null = null;
  private streetBanner: HTMLElement | null = null;

  // Session tracking
  private sessionRecords: DecisionRecord[] = [];
  private handActions: DecisionRecord[] = [];
  private handsPlayed = 0;

  // Callbacks
  private onLeaveTable: (() => void) | null = null;

  constructor(container: HTMLElement, mode: GameMode = 'learning') {
    this.container = container;
    this.engine = new PokerEngine(mode);
    this.aiEngine = new AIDecisionEngine();
    this.animLoop = new AnimationLoop();
    this.evReveal = new EVReveal();
    this.aidController = new AidController(mode === 'learning' ? 1 : mode === 'training' ? 4 : 10);
    this.dialoguePanel = new DialoguePanel();

    this.canvas = document.createElement('canvas');
    this.canvas.id = 'poker-canvas';
    this.canvas.style.display = 'block';

    this.renderer = new TableRenderer(this.canvas);

    this.setupUI();
    this.bindEngine();
    this.startRenderLoop();
  }

  private setupUI(): void {
    this.container.innerHTML = '';
    this.container.style.position = 'relative';
    this.container.style.background = PALETTE.bgDeep;
    this.container.style.overflow = 'hidden';

    // Canvas layer — leave 320px right for sidebar
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.right = '320px';
    this.canvas.style.bottom = '0';
    this.canvas.style.width = 'calc(100% - 320px)';
    this.canvas.style.height = '100%';
    this.container.appendChild(this.canvas);

    // Right sidebar — AI dialogue + EV feedback
    const sidebar = document.createElement('div');
    sidebar.style.cssText = `
      position: absolute;
      top: 0;
      right: 0;
      width: 320px;
      height: 100%;
      background: linear-gradient(180deg, ${PALETTE.bgMid} 0%, ${PALETTE.bgDeep} 100%);
      border-left: 2px solid ${PALETTE.goldTrim};
      display: flex;
      flex-direction: column;
      z-index: 10;
      box-shadow: -8px 0 24px rgba(0,0,0,0.4);
    `;

    // Sidebar header
    const sidebarHeader = document.createElement('div');
    sidebarHeader.style.cssText = `
      padding: 14px 18px;
      border-bottom: 1px solid ${PALETTE.bgElevated};
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(0,0,0,0.3);
    `;
    sidebarHeader.innerHTML = `
      <div style="color: ${PALETTE.goldTrimBright}; font-weight: bold; font-size: 13px; letter-spacing: 1px;">
        💬 牌桌对话
      </div>
      <div id="sidebar-mode-badge" style="color: ${PALETTE.textDim}; font-size: 11px;">
        ${this.getModeLabel()}
      </div>
    `;
    sidebar.appendChild(sidebarHeader);

    // Dialogue panel (top half of sidebar)
    const dialogueWrap = document.createElement('div');
    dialogueWrap.style.cssText = `
      flex: 0 0 55%;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    `;
    dialogueWrap.appendChild(this.dialoguePanel.getElement());
    sidebar.appendChild(dialogueWrap);

    // Feedback panel (bottom half of sidebar) — EV reveal
    const feedbackHeader = document.createElement('div');
    feedbackHeader.style.cssText = `
      padding: 10px 18px;
      border-top: 1px solid ${PALETTE.bgElevated};
      color: ${PALETTE.goldTrimBright};
      font-weight: bold;
      font-size: 12px;
      letter-spacing: 1px;
      background: rgba(0,0,0,0.3);
    `;
    feedbackHeader.textContent = '📊 决策反馈';
    sidebar.appendChild(feedbackHeader);

    this.feedbackPanel = document.createElement('div');
    this.feedbackPanel.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 12px 14px;
      scrollbar-width: thin;
    `;
    sidebar.appendChild(this.feedbackPanel);
    this.evReveal.attach(this.feedbackPanel);

    this.container.appendChild(sidebar);

    // Top control bar (left side, above canvas)
    const topBar = document.createElement('div');
    topBar.style.cssText = `
      position: absolute;
      top: 14px;
      left: 16px;
      display: flex;
      gap: 8px;
      z-index: 10;
    `;

    const leaveBtn = this.createTopBtn('← 离开牌桌', () => {
      if (this.sessionRecords.length >= 3) {
        showReportModal(this.sessionRecords);
      }
      this.onLeaveTable?.();
    });
    topBar.appendChild(leaveBtn);

    const tutorialBtn = this.createTopBtn('🎓 教程', () => {
      this.startTutorial();
    });
    topBar.appendChild(tutorialBtn);

    const reportBtn = this.createTopBtn('📊 报告', () => {
      if (this.sessionRecords.length > 0) {
        showReportModal(this.sessionRecords);
      } else {
        showToast('至少打一手牌才能查看报告', 'info');
      }
    });
    topBar.appendChild(reportBtn);

    this.container.appendChild(topBar);

    // Street banner (top center) — shows current street + pot
    this.streetBanner = document.createElement('div');
    this.streetBanner.style.cssText = `
      position: absolute;
      top: 18px;
      left: 50%;
      transform: translateX(-50%);
      padding: 8px 22px;
      background: rgba(0,0,0,0.65);
      border: 1px solid ${PALETTE.goldTrim};
      border-radius: 18px;
      color: ${PALETTE.goldTrimBright};
      font-weight: bold;
      font-size: 13px;
      letter-spacing: 2px;
      z-index: 10;
      pointer-events: none;
    `;
    this.streetBanner.textContent = '准备中...';
    this.container.appendChild(this.streetBanner);

    // Action bar (bottom center)
    this.actionBar = document.createElement('div');
    this.actionBar.className = 'action-bar';
    this.actionBar.style.cssText = `
      position: absolute;
      bottom: 28px;
      left: calc((100% - 320px) / 2);
      transform: translateX(-50%);
      display: flex;
      gap: 12px;
      padding: 14px 22px;
      background: linear-gradient(180deg, rgba(40,25,18,0.95), rgba(20,12,8,0.95));
      border: 1px solid ${PALETTE.goldTrim};
      border-radius: 14px;
      z-index: 10;
      opacity: 0;
      transition: opacity 0.25s;
      box-shadow: 0 10px 32px rgba(0,0,0,0.55);
    `;
    this.container.appendChild(this.actionBar);

    // Raise slider (above action bar, hidden until shown)
    this.raiseSliderContainer = document.createElement('div');
    this.raiseSliderContainer.style.cssText = `
      position: absolute;
      bottom: 110px;
      left: calc((100% - 320px) / 2);
      transform: translateX(-50%);
      padding: 14px 20px;
      background: rgba(20,12,8,0.95);
      border: 1px solid ${PALETTE.goldTrim};
      border-radius: 12px;
      z-index: 11;
      display: none;
      min-width: 380px;
      box-shadow: 0 10px 32px rgba(0,0,0,0.6);
    `;
    this.container.appendChild(this.raiseSliderContainer);

    // Hand summary (bottom left)
    this.handSummary = document.createElement('div');
    this.handSummary.style.cssText = `
      position: absolute;
      bottom: 28px;
      left: 16px;
      max-width: 280px;
      z-index: 10;
    `;
    this.container.appendChild(this.handSummary);

    // Resize handler
    const onResize = () => {
      this.renderer.resize();
    };
    window.addEventListener('resize', onResize);
  }

  private createTopBtn(text: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
      padding: 8px 16px;
      border-radius: 8px;
      border: 1px solid ${PALETTE.bgElevated};
      background: rgba(20,12,8,0.85);
      color: ${PALETTE.textSecondary};
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      transition: all 0.15s;
    `;
    btn.addEventListener('mouseenter', () => {
      btn.style.borderColor = PALETTE.goldTrim;
      btn.style.color = PALETTE.goldTrimBright;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.borderColor = PALETTE.bgElevated;
      btn.style.color = PALETTE.textSecondary;
    });
    btn.addEventListener('click', onClick);
    return btn;
  }

  private getModeLabel(): string {
    const mode = this.engine.getState().mode;
    switch (mode) {
      case 'learning': return '学习模式';
      case 'training': return '训练模式';
      case 'competitive': return '竞技模式';
    }
  }

  private bindEngine(): void {
    this.engine.subscribe((event) => {
      switch (event.type) {
        case 'phaseChange':
          this.updateStreetBanner();
          if (event.phase === 'preflop' || event.phase === 'flop' ||
              event.phase === 'turn' || event.phase === 'river') {
            this.updateActionBar();
          }
          if (event.phase === 'result') {
            this.onHandEnd();
          }
          break;
        case 'cardDealt':
          soundManager.playDeal();
          break;
        case 'communityDealt':
          soundManager.playDeal();
          this.updateStreetBanner();
          break;
        case 'turnStarted':
          this.onTurnStarted(event.seatId);
          break;
        case 'action':
          this.playActionSound(event.action);
          this.onAction(event.seatId, event.action, event.amount);
          break;
        case 'feedback':
          this.onFeedback(event.record);
          break;
        case 'handResult':
          this.showHandResult(event.result);
          break;
      }
    });
  }

  private updateStreetBanner(): void {
    if (!this.streetBanner) return;
    const state = this.engine.getState();
    const labels: Record<string, string> = {
      idle: '准备中',
      dealing: '发牌中',
      preflop: '翻牌前 · PRE-FLOP',
      flop: '翻牌圈 · FLOP',
      turn: '转牌圈 · TURN',
      river: '河牌圈 · RIVER',
      showdown: '摊牌 · SHOWDOWN',
      result: '结算',
    };
    const phase = state.phase;
    const pot = state.pot;
    this.streetBanner.textContent = `${labels[phase] || phase}${pot > 0 ? `  ·  底池 $${pot}` : ''}`;
  }

  private playActionSound(action: PlayerAction): void {
    switch (action) {
      case 'fold': soundManager.playFold(); break;
      case 'call':
      case 'check': soundManager.playChip(); break;
      case 'raise': soundManager.playRaise(); break;
      case 'allin': soundManager.playAllIn(); break;
    }
  }

  private startRenderLoop(): void {
    this.animLoop.add((time) => {
      const state = this.engine.getState();
      const active = this.engine.getActiveSeat();
      this.renderer.setActiveSeat(active?.id ?? null);
      this.renderer.render(state, time);
    });
    this.animLoop.start();
  }

  // ==================== Game Setup ====================

  setupTable(seats: Seat[], dealerIndex: number, bb: number, sb: number): void {
    this.engine.setBlinds(bb, sb);
    for (const seat of seats) {
      this.engine.addSeat(seat);
    }
    this.engine.setDealer(dealerIndex);
  }

  async startHand(): Promise<void> {
    this.handActions = [];
    this.renderer.clearCardAnims();
    await this.engine.startHand();
  }

  // ==================== Action Bar ====================

  private updateActionBar(): void {
    if (!this.actionBar) return;

    const seat = this.engine.getActiveSeat();
    const humanSeat = this.engine.getHumanSeat();

    if (!seat || !humanSeat || seat.id !== humanSeat.id) {
      this.actionBar.style.opacity = '0';
      this.actionBar.style.pointerEvents = 'none';
      this.hideRaiseSlider();
      return;
    }

    this.actionBar.style.opacity = '1';
    this.actionBar.style.pointerEvents = 'auto';
    this.actionBar.innerHTML = '';

    const toCall = this.engine.getCallAmount();
    const minRaise = this.engine.getMinRaise();
    const maxRaise = seat.chips;
    const pot = this.engine.getState().pot;

    // FOLD
    const foldBtn = this.createActionBtn('弃牌\nFOLD', PALETTE.bad, () => {
      this.engine.playerAction({ seatId: seat.id, action: 'fold' });
    });
    this.actionBar.appendChild(foldBtn);

    // CHECK / CALL
    if (toCall === 0) {
      const checkBtn = this.createActionBtn('过牌\nCHECK', PALETTE.correct, () => {
        this.engine.playerAction({ seatId: seat.id, action: 'check' });
      });
      this.actionBar.appendChild(checkBtn);
    } else {
      const callBtn = this.createActionBtn(`跟注\nCALL $${toCall}`, PALETTE.info, () => {
        this.engine.playerAction({ seatId: seat.id, action: 'call' });
      });
      this.actionBar.appendChild(callBtn);
    }

    // RAISE (opens slider)
    if (maxRaise > minRaise) {
      const raiseBtn = this.createActionBtn(`加注\nRAISE`, PALETTE.achievement, () => {
        this.showRaiseSlider(seat.id, minRaise, maxRaise, pot);
      });
      this.actionBar.appendChild(raiseBtn);
    }

    // ALL-IN
    const allInBtn = this.createActionBtn(`全下\nALL-IN $${seat.chips}`, PALETTE.warning, () => {
      this.engine.playerAction({ seatId: seat.id, action: 'allin' });
    });
    this.actionBar.appendChild(allInBtn);
  }

  private createActionBtn(text: string, color: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.innerHTML = text.split('\n').map((l, i) =>
      i === 0
        ? `<div style="font-size:14px;font-weight:bold;">${l}</div>`
        : `<div style="font-size:11px;opacity:0.85;margin-top:2px;">${l}</div>`
    ).join('');
    btn.style.cssText = `
      padding: 12px 18px;
      border-radius: 10px;
      border: 2px solid ${color};
      background: linear-gradient(180deg, ${color}33, ${color}11);
      color: ${color};
      cursor: pointer;
      transition: all 0.15s;
      min-width: 110px;
      font-family: inherit;
    `;
    btn.addEventListener('mouseenter', () => {
      btn.style.background = color;
      btn.style.color = '#fff';
      btn.style.transform = 'translateY(-2px)';
      btn.style.boxShadow = `0 6px 16px ${color}66`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = `linear-gradient(180deg, ${color}33, ${color}11)`;
      btn.style.color = color;
      btn.style.transform = 'translateY(0)';
      btn.style.boxShadow = 'none';
    });
    btn.addEventListener('click', onClick);
    return btn;
  }

  private showRaiseSlider(seatId: string, min: number, max: number, pot: number): void {
    if (!this.raiseSliderContainer) return;
    this.raiseSliderContainer.style.display = 'block';
    this.raiseSliderContainer.innerHTML = '';

    let current = min;

    const label = document.createElement('div');
    label.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    `;
    label.innerHTML = `
      <span style="color:${PALETTE.textSecondary};font-size:12px;">加注金额</span>
      <span id="raise-amount" style="color:${PALETTE.goldTrimBright};font-weight:bold;font-size:20px;">$${current}</span>
    `;
    this.raiseSliderContainer.appendChild(label);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.value = String(current);
    slider.step = '1';
    slider.style.cssText = `
      width: 100%;
      height: 6px;
      accent-color: ${PALETTE.goldTrim};
      margin: 6px 0 12px;
    `;
    slider.addEventListener('input', () => {
      current = parseInt(slider.value);
      const el = this.raiseSliderContainer?.querySelector('#raise-amount');
      if (el) el.textContent = `$${current}`;
    });
    this.raiseSliderContainer.appendChild(slider);

    // Quick presets
    const presets = document.createElement('div');
    presets.style.cssText = 'display:flex;gap:6px;margin-bottom:12px;';
    const buckets: { label: string; val: number }[] = [
      { label: '1/2池', val: Math.max(min, Math.floor(pot / 2)) },
      { label: '2/3池', val: Math.max(min, Math.floor(pot * 2 / 3)) },
      { label: '满池', val: Math.max(min, pot) },
      { label: 'Min', val: min },
    ];
    for (const b of buckets) {
      const v = Math.min(b.val, max);
      const btn = document.createElement('button');
      btn.textContent = b.label;
      btn.style.cssText = `
        flex:1;padding:6px;border-radius:6px;border:1px solid ${PALETTE.bgElevated};
        background:rgba(0,0,0,0.4);color:${PALETTE.textSecondary};cursor:pointer;font-size:11px;
      `;
      btn.addEventListener('click', () => {
        slider.value = String(v);
        current = v;
        const el = this.raiseSliderContainer?.querySelector('#raise-amount');
        if (el) el.textContent = `$${current}`;
      });
      presets.appendChild(btn);
    }
    this.raiseSliderContainer.appendChild(presets);

    // Confirm + Cancel buttons
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:8px;';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.style.cssText = `
      flex:1;padding:10px;border-radius:8px;border:1px solid ${PALETTE.bgElevated};
      background:transparent;color:${PALETTE.textSecondary};cursor:pointer;font-size:13px;
    `;
    cancelBtn.addEventListener('click', () => this.hideRaiseSlider());
    actions.appendChild(cancelBtn);

    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = '确认加注';
    confirmBtn.style.cssText = `
      flex:2;padding:10px;border-radius:8px;border:2px solid ${PALETTE.achievement};
      background:${PALETTE.achievement};color:#000;font-weight:bold;cursor:pointer;font-size:13px;
    `;
    confirmBtn.addEventListener('click', () => {
      this.hideRaiseSlider();
      this.engine.playerAction({ seatId, action: 'raise', amount: current });
    });
    actions.appendChild(confirmBtn);

    this.raiseSliderContainer.appendChild(actions);
  }

  private hideRaiseSlider(): void {
    if (this.raiseSliderContainer) this.raiseSliderContainer.style.display = 'none';
  }

  // ==================== Event Handlers ====================

  private onTurnStarted(seatId: string): void {
    this.updateActionBar();

    const seat = this.engine.getState().seats.find(s => s.id === seatId);
    if (!seat || seat.isHuman) return;

    // Show "thinking..." in dialogue panel before action
    this.dialoguePanel.showThinking(seat);

    window.setTimeout(() => {
      this.playAITurn(seat.id);
    }, 1200);  // 1.2s thinking time = tells reading window
  }

  private async playAITurn(seatId: string): Promise<void> {
    const seat = this.engine.getState().seats.find(s => s.id === seatId);
    const active = this.engine.getActiveSeat();
    if (!seat || !active || active.id !== seatId || seat.isHuman) return;

    const decision = await this.aiEngine.decide(seat, this.engine.getState());
    this.dialoguePanel.addMessage(seat, decision);
    await this.engine.playerAction({ seatId, action: decision.action, amount: decision.amount });
  }

  private onAction(_seatId: string, _action: string, _amount: number): void {
    this.updateActionBar();
    this.updateStreetBanner();
  }

  private onFeedback(record: DecisionRecord): void {
    this.sessionRecords.push(record);
    this.handActions.push(record);

    const aidLevel = this.aidController.getAidLevel();
    if (aidLevel === 'none') return;

    const item = buildFeedbackItem(record);
    this.evReveal.reveal(item, aidLevel);
    this.aidController.recordReveal();

    if (item.verdict === 'perfect' || item.verdict === 'good') {
      showToast(item.takeaway, 'success');
    } else if (item.verdict === 'bad') {
      showToast(item.takeaway, 'error');
    }
  }

  private onHandEnd(): void {
    this.handsPlayed++;
    if (this.handActions.length > 0 && this.aidController.shouldShowPostHand()) {
      this.showHandSummary(this.handActions);
    }
    // Auto-start next hand after 4s
    window.setTimeout(() => {
      const humanSeat = this.engine.getHumanSeat();
      if (humanSeat && humanSeat.chips > 0) {
        const aliveCount = this.engine.getState().seats.filter(s => s.chips > 0).length;
        if (aliveCount >= 2) {
          this.startHand().catch(err => console.error('start hand failed', err));
        }
      }
    }, 4000);
  }

  private showHandResult(result: HandResult): void {
    const humanSeat = this.engine.getHumanSeat();
    const isWinner = humanSeat && result.winnerIds.includes(humanSeat.id);

    if (isWinner) {
      soundManager.playWin();
      showToast(`赢了! +$${result.potAmount}`, 'success');
    } else {
      soundManager.playLose();
      showToast('这手输了', 'warning');
    }
  }

  private showHandSummary(records: DecisionRecord[]): void {
    if (!this.handSummary) return;
    this.handSummary.innerHTML = '';

    const totalEV = records.reduce((s, r) => s + r.evDifference, 0);
    const perfectCount = records.filter(r => r.evDifference >= -0.3).length;

    const div = document.createElement('div');
    div.style.cssText = `
      padding: 12px 18px;
      border-radius: 12px;
      background: linear-gradient(180deg, rgba(40,25,18,0.95), rgba(20,12,8,0.95));
      border: 1px solid ${PALETTE.goldTrim};
      font-size: 12px;
      opacity: 0;
      transform: translateY(10px);
      transition: opacity 0.3s, transform 0.3s;
      box-shadow: 0 6px 18px rgba(0,0,0,0.5);
    `;

    const evColor = totalEV >= -0.5 ? PALETTE.correct : totalEV >= -2 ? PALETTE.warning : PALETTE.bad;

    div.innerHTML = `
      <div style="color: ${PALETTE.goldTrimBright}; margin-bottom: 6px; font-weight:bold; letter-spacing:1px;">本手摘要</div>
      <div style="color: ${PALETTE.textPrimary}; line-height:1.6;">
        ${records.length} 个决策 ·
        <span style="color: ${PALETTE.correct};">${perfectCount} 正确</span><br>
        EV <span style="color: ${evColor}; font-weight:bold;">${totalEV >= 0 ? '+' : ''}${totalEV.toFixed(1)} BB</span>
      </div>
    `;

    this.handSummary.appendChild(div);

    requestAnimationFrame(() => {
      div.style.opacity = '1';
      div.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      div.style.opacity = '0';
      setTimeout(() => {
        if (this.handSummary) this.handSummary.innerHTML = '';
      }, 300);
    }, 6000);
  }

  // ==================== Tutorial ====================

  startTutorial(): void {
    if (this.tutorial) this.tutorial.destroy();
    this.tutorial = new TutorialOverlay(this.container);
    this.tutorial.start();
  }

  maybeAutoTutorial(force: boolean = false): void {
    const seen = localStorage.getItem('tp_v2_tutorial_done');
    if (force || !seen) {
      this.startTutorial();
      localStorage.setItem('tp_v2_tutorial_done', '1');
    }
  }

  // ==================== Public API ====================

  setOnLeaveTable(cb: () => void): void {
    this.onLeaveTable = cb;
  }

  getAIEngine(): AIDecisionEngine {
    return this.aiEngine;
  }

  getHumanChips(): number {
    return this.engine.getHumanSeat()?.chips ?? 0;
  }

  destroy(): void {
    this.animLoop.stop();
    this.evReveal.detach();
    this.dialoguePanel.destroy();
    if (this.tutorial) this.tutorial.destroy();
    this.engine.reset();
    this.container.innerHTML = '';
  }
}
