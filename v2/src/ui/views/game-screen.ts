import { PokerEngine } from '@/engine/poker-engine';
import { AIDecisionEngine } from '@/ai/decision-engine';
import { TableRenderer } from '@/ui/canvas/table-renderer';
import { AnimationLoop } from '@/ui/canvas/animation-loop';
import { EVReveal } from '@/training/ev-reveal';
import { AidController } from '@/training/aid-controller';
import { buildFeedbackItem } from '@/training/feedback-engine';
import { showReportModal } from '@/ui/components/report-modal';
import { showToast } from '@/ui/components/toast';
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

  // UI elements
  private actionBar: HTMLElement | null = null;
  private feedbackPanel: HTMLElement | null = null;
  private handSummary: HTMLElement | null = null;

  // Session tracking
  private sessionRecords: DecisionRecord[] = [];
  private handActions: DecisionRecord[] = [];

  // Callbacks
  private onLeaveTable: (() => void) | null = null;

  constructor(container: HTMLElement, mode: GameMode = 'learning') {
    this.container = container;
    this.engine = new PokerEngine(mode);
    this.aiEngine = new AIDecisionEngine();
    this.animLoop = new AnimationLoop();
    this.evReveal = new EVReveal();
    this.aidController = new AidController(mode === 'learning' ? 1 : mode === 'training' ? 4 : 10);

    this.canvas = document.createElement('canvas');
    this.canvas.id = 'poker-canvas';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';

    this.renderer = new TableRenderer(this.canvas);

    this.setupUI();
    this.bindEngine();
    this.startRenderLoop();
  }

  private setupUI(): void {
    this.container.innerHTML = '';
    this.container.style.position = 'relative';

    // Canvas layer
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.container.appendChild(this.canvas);

    // Action bar overlay (bottom)
    this.actionBar = document.createElement('div');
    this.actionBar.className = 'action-bar';
    this.actionBar.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 12px;
      padding: 12px 20px;
      background: ${PALETTE.bgMid};
      border-radius: 12px;
      border: 1px solid ${PALETTE.bgElevated};
      z-index: 10;
      opacity: 0;
      transition: opacity 0.2s;
    `;
    this.container.appendChild(this.actionBar);

    // Feedback panel (right side) — EV reveal + AI dialogue
    this.feedbackPanel = document.createElement('div');
    this.feedbackPanel.style.cssText = `
      position: absolute;
      right: 16px;
      top: 80px;
      width: 280px;
      max-height: 60%;
      overflow-y: auto;
      z-index: 10;
    `;
    this.container.appendChild(this.feedbackPanel);
    this.evReveal.attach(this.feedbackPanel);

    // Hand summary bar (bottom-left, above action bar)
    this.handSummary = document.createElement('div');
    this.handSummary.style.cssText = `
      position: absolute;
      bottom: 80px;
      left: 16px;
      max-width: 360px;
      z-index: 10;
    `;
    this.container.appendChild(this.handSummary);

    // Top controls
    const topBar = document.createElement('div');
    topBar.style.cssText = `
      position: absolute;
      top: 12px;
      left: 16px;
      display: flex;
      gap: 12px;
      z-index: 10;
    `;

    const leaveBtn = document.createElement('button');
    leaveBtn.textContent = '← 离开牌桌';
    leaveBtn.style.cssText = `
      padding: 6px 14px;
      border-radius: 8px;
      border: none;
      background: ${PALETTE.bgElevated};
      color: ${PALETTE.textSecondary};
      cursor: pointer;
      font-size: 13px;
    `;
    leaveBtn.addEventListener('click', () => {
      if (this.sessionRecords.length >= 3) {
        showReportModal(this.sessionRecords);
      }
      this.onLeaveTable?.();
    });
    topBar.appendChild(leaveBtn);

    const modeLabel = document.createElement('span');
    modeLabel.textContent = this.getModeLabel();
    modeLabel.style.cssText = `
      padding: 6px 14px;
      border-radius: 8px;
      background: ${PALETTE.bgElevated};
      color: ${PALETTE.achievement};
      font-size: 13px;
    `;
    topBar.appendChild(modeLabel);

    // Report button
    const reportBtn = document.createElement('button');
    reportBtn.textContent = '📊 报告';
    reportBtn.style.cssText = `
      padding: 6px 14px;
      border-radius: 8px;
      border: none;
      background: ${PALETTE.bgElevated};
      color: ${PALETTE.textSecondary};
      cursor: pointer;
      font-size: 13px;
    `;
    reportBtn.addEventListener('click', () => {
      if (this.sessionRecords.length > 0) {
        showReportModal(this.sessionRecords);
      } else {
        showToast('至少打一手牌才能查看报告', 'info');
      }
    });
    topBar.appendChild(reportBtn);

    this.container.appendChild(topBar);

    // Resize handler
    window.addEventListener('resize', () => {
      this.renderer.resize();
    });
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
      this.renderer.render(this.engine.getState(), time);
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
      return;
    }

    this.actionBar.style.opacity = '1';
    this.actionBar.style.pointerEvents = 'auto';
    this.actionBar.innerHTML = '';

    const toCall = this.engine.getCallAmount();
    const minRaise = this.engine.getMinRaise();

    const foldBtn = this.createActionBtn('弃牌', PALETTE.bad, () => {
      this.engine.playerAction({ seatId: seat.id, action: 'fold' });
    });
    this.actionBar.appendChild(foldBtn);

    if (toCall === 0) {
      const checkBtn = this.createActionBtn('过牌', PALETTE.correct, () => {
        this.engine.playerAction({ seatId: seat.id, action: 'check' });
      });
      this.actionBar.appendChild(checkBtn);
    } else {
      const callBtn = this.createActionBtn(`跟注 ${toCall}`, PALETTE.info, () => {
        this.engine.playerAction({ seatId: seat.id, action: 'call' });
      });
      this.actionBar.appendChild(callBtn);
    }

    const raiseBtn = this.createActionBtn(`加注 ${minRaise}`, PALETTE.achievement, () => {
      this.engine.playerAction({ seatId: seat.id, action: 'raise', amount: minRaise });
    });
    this.actionBar.appendChild(raiseBtn);

    const allInBtn = this.createActionBtn('All-in', PALETTE.warning, () => {
      this.engine.playerAction({ seatId: seat.id, action: 'allin' });
    });
    this.actionBar.appendChild(allInBtn);
  }

  private createActionBtn(text: string, color: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
      padding: 10px 20px;
      border-radius: 8px;
      border: 2px solid ${color};
      background: ${color}22;
      color: ${color};
      font-weight: bold;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.15s;
      min-width: 80px;
    `;
    btn.addEventListener('mouseenter', () => {
      btn.style.background = color;
      btn.style.color = '#fff';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = `${color}22`;
      btn.style.color = color;
    });
    btn.addEventListener('click', onClick);
    return btn;
  }

  // ==================== Event Handlers ====================

  private onTurnStarted(seatId: string): void {
    this.updateActionBar();

    const seat = this.engine.getState().seats.find(s => s.id === seatId);
    if (!seat || seat.isHuman) return;

    window.setTimeout(() => {
      this.playAITurn(seat.id);
    }, 450);
  }

  private async playAITurn(seatId: string): Promise<void> {
    const seat = this.engine.getState().seats.find(s => s.id === seatId);
    const active = this.engine.getActiveSeat();
    if (!seat || !active || active.id !== seatId || seat.isHuman) return;

    const decision = await this.aiEngine.decide(seat, this.engine.getState());
    this.showAIDialogue(seat, decision);
    await this.engine.playerAction({ seatId, action: decision.action, amount: decision.amount });
  }

  private onAction(seatId: string, action: string, amount: number): void {
    this.updateActionBar();
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
    if (this.handActions.length > 0 && this.aidController.shouldShowPostHand()) {
      this.showHandSummary(this.handActions);
    }
  }

  private showAIDialogue(seat: Seat, decision: AIDecision): void {
    if (!this.feedbackPanel) return;

    const div = document.createElement('div');
    div.style.cssText = `
      padding: 10px 14px;
      margin-bottom: 8px;
      border-radius: 8px;
      background: ${PALETTE.bgCard};
      border-left: 3px solid ${PALETTE.info};
      font-size: 13px;
    `;
    div.innerHTML = `
      <div style="color: ${PALETTE.achievement}; margin-bottom: 4px;">${seat.name}</div>
      <div style="color: ${PALETTE.textPrimary};">${decision.dialogue}</div>
      <div style="color: ${PALETTE.textDim}; font-size: 11px; margin-top: 4px;">${decision.thinking}</div>
    `;
    this.feedbackPanel.appendChild(div);

    setTimeout(() => {
      div.style.opacity = '0';
      div.style.transition = 'opacity 0.5s';
      setTimeout(() => div.remove(), 500);
    }, 4000);
  }

  private showHandResult(result: HandResult): void {
    const humanSeat = this.engine.getHumanSeat();
    const isWinner = humanSeat && result.winnerIds.includes(humanSeat.id);

    if (isWinner) {
      soundManager.playWin();
      showToast(`赢了! +${result.potAmount} 筹码`, 'success');
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
      padding: 10px 16px;
      border-radius: 10px;
      background: ${PALETTE.bgCard};
      border: 1px solid ${PALETTE.bgElevated};
      font-size: 12px;
      opacity: 0;
      transform: translateY(10px);
      transition: opacity 0.3s, transform 0.3s;
    `;

    const evColor = totalEV >= -0.5 ? PALETTE.correct : totalEV >= -2 ? PALETTE.warning : PALETTE.bad;

    div.innerHTML = `
      <div style="color: ${PALETTE.textSecondary}; margin-bottom: 4px;">本手摘要</div>
      <div style="color: ${PALETTE.textPrimary};">
        ${records.length}个决策 ·
        <span style="color: ${PALETTE.correct};">${perfectCount}正确</span> ·
        EV <span style="color: ${evColor};">${totalEV >= 0 ? '+' : ''}${totalEV.toFixed(1)} BB</span>
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

  private streetLabel(street: string): string {
    switch (street) {
      case 'preflop': return '翻牌前';
      case 'flop': return '翻牌圈';
      case 'turn': return '转牌圈';
      case 'river': return '河牌圈';
      default: return street;
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
    this.engine.reset();
    this.container.innerHTML = '';
  }
}
