import { PokerEngine } from '@/engine/poker-engine';
import { TableRenderer } from '@/ui/canvas/table-renderer';
import { AnimationLoop } from '@/ui/canvas/animation-loop';
import type { GameMode, Seat } from '@/types/game';
import { PALETTE } from '@/ui/theme/palette';

export class GameScreen {
  private container: HTMLElement;
  private engine: PokerEngine;
  private renderer: TableRenderer;
  private animLoop: AnimationLoop;
  private canvas: HTMLCanvasElement;

  // UI elements
  private actionBar: HTMLElement | null = null;
  private feedbackPanel: HTMLElement | null = null;

  // Callbacks
  private onLeaveTable: (() => void) | null = null;

  constructor(container: HTMLElement, mode: GameMode = 'learning') {
    this.container = container;
    this.engine = new PokerEngine(mode);
    this.animLoop = new AnimationLoop();

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

    // Feedback panel (right side)
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
    leaveBtn.addEventListener('click', () => this.onLeaveTable?.());
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

    this.container.appendChild(topBar);

    // Resize handler
    window.addEventListener('resize', () => {
      this.renderer.resize();
    });
  }

  private getModeLabel(): string {
    const mode = this.engine.getState().mode;
    switch (mode) {
      case 'learning': return '📚 学习模式';
      case 'training': return '⚡ 训练模式';
      case 'competitive': return '🏆 竞技模式';
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
          break;
        case 'turnStarted':
          this.onTurnStarted(event.seatId);
          break;
        case 'action':
          this.onAction(event.seatId, event.action, event.amount);
          break;
        case 'feedback':
          this.showFeedback(event.record);
          break;
        case 'handResult':
          this.showHandResult(event.result);
          break;
      }
    });
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

    // Fold button
    const foldBtn = this.createActionBtn('弃牌', PALETTE.bad, () => {
      this.engine.playerAction({ seatId: seat.id, action: 'fold' });
    });
    this.actionBar.appendChild(foldBtn);

    if (toCall === 0) {
      // Check button
      const checkBtn = this.createActionBtn('过牌', PALETTE.correct, () => {
        this.engine.playerAction({ seatId: seat.id, action: 'check' });
      });
      this.actionBar.appendChild(checkBtn);
    } else {
      // Call button
      const callBtn = this.createActionBtn(`跟注 ${toCall}`, PALETTE.info, () => {
        this.engine.playerAction({ seatId: seat.id, action: 'call' });
      });
      this.actionBar.appendChild(callBtn);
    }

    // Raise button
    const raiseBtn = this.createActionBtn(`加注 ${minRaise}`, PALETTE.achievement, () => {
      this.engine.playerAction({ seatId: seat.id, action: 'raise', amount: minRaise });
    });
    this.actionBar.appendChild(raiseBtn);

    // All-in button
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
  }

  private onAction(seatId: string, action: string, amount: number): void {
    // Brief delay for visual feedback
    this.updateActionBar();
  }

  private showFeedback(record: import('@/types/game').DecisionRecord): void {
    if (!this.feedbackPanel) return;

    const div = document.createElement('div');
    const isGood = record.evDifference >= -0.5;
    const color = isGood ? PALETTE.correct : PALETTE.bad;

    div.style.cssText = `
      padding: 10px 14px;
      margin-bottom: 8px;
      border-radius: 8px;
      background: ${PALETTE.bgCard};
      border-left: 3px solid ${color};
      font-size: 13px;
      animation: slideIn 0.3s ease-out;
    `;

    div.innerHTML = `
      <div style="color: ${PALETTE.textSecondary}; margin-bottom: 4px;">${this.streetLabel(record.street)}</div>
      <div style="color: ${PALETTE.textPrimary};">
        你: ${record.action.toUpperCase()} <span style="color: ${color};">${record.evDifference.toFixed(1)} BB</span>
      </div>
      <div style="color: ${PALETTE.textDim}; font-size: 11px;">
        胜率 ${Math.round(record.equity * 100)}% · 底池赔率 ${Math.round(record.potOdds * 100)}%
      </div>
    `;

    this.feedbackPanel.appendChild(div);

    // Auto remove after 5s
    setTimeout(() => {
      div.style.opacity = '0';
      div.style.transition = 'opacity 0.5s';
      setTimeout(() => div.remove(), 500);
    }, 5000);
  }

  private showHandResult(result: import('@/types/game').HandResult): void {
    // TODO: show modal
    console.log('Hand result:', result);
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

  destroy(): void {
    this.animLoop.stop();
    this.engine.reset();
    this.container.innerHTML = '';
  }
}
