import type { Card } from '@/types/card';
import type { Seat, GameState } from '@/types/game';
import { PALETTE } from '@/ui/theme/palette';
import { drawCard, drawCardBack, type CardAnimState, CARD_W, CARD_H } from './card-sprite';
import { drawChipStack } from './chip-sprite';

export interface SeatLayout {
  x: number;
  y: number;
  angle: number;
}

export class TableRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;

  // Card animations by seatId + cardIndex
  private cardAnims = new Map<string, CardAnimState>();
  private pendingCardAnims: { seatId: string; card: Card; index: number; startTime: number }[] = [];

  // Table geometry
  private tableCX = 0;
  private tableCY = 0;
  private tableRx = 0;
  private tableRy = 0;
  private seatLayouts: SeatLayout[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D not supported');
    this.ctx = ctx;
    this.resize();
  }

  resize(): void {
    const rect = this.canvas.parentElement?.getBoundingClientRect();
    this.width = rect?.width || window.innerWidth;
    this.height = rect?.height || window.innerHeight;

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.scale(dpr, dpr);

    // Recalculate table geometry
    this.tableCX = this.width / 2;
    this.tableCY = this.height / 2 + 20;
    this.tableRx = Math.min(this.width * 0.42, 420);
    this.tableRy = Math.min(this.height * 0.38, 280);
  }

  /** 计算座位在椭圆上的位置 */
  calculateSeatLayouts(seatCount: number): SeatLayout[] {
    const layouts: SeatLayout[] = [];
    // Bottom (human) is at index 0, going clockwise
    const bottomAngle = Math.PI / 2;
    const arcSize = Math.PI * 0.7; // seats spread over 70% of ellipse top

    for (let i = 0; i < seatCount; i++) {
      let angle: number;
      if (seatCount <= 3) {
        // Even spread for few seats
        angle = bottomAngle - Math.PI * 0.3 + (i / (seatCount - 1)) * Math.PI * 0.6;
      } else {
        // Human at bottom, others across top
        if (i === 0) {
          angle = bottomAngle;
        } else {
          const others = seatCount - 1;
          const idx = i - 1;
          angle = bottomAngle - arcSize / 2 - 0.2 + (idx / (others - 1)) * arcSize;
        }
      }

      const x = this.tableCX + Math.cos(angle) * this.tableRx;
      const y = this.tableCY + Math.sin(angle) * this.tableRy;
      layouts.push({ x, y, angle });
    }
    return layouts;
  }

  /** 主渲染循环 */
  render(state: GameState, time: number): void {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Calculate seat layouts
    this.seatLayouts = this.calculateSeatLayouts(state.seats.length);

    // Draw table
    this.drawTable();

    // Draw community cards
    this.drawCommunityCards(state.community, time);

    // Draw pot
    if (state.pot > 0) {
      this.drawPot(state.pot);
    }

    // Draw seats
    state.seats.forEach((seat, i) => {
      const layout = this.seatLayouts[i];
      this.drawSeat(seat, layout, time);
    });

    // Process pending card animations
    this.processPendingAnims(time);
  }

  private drawTable(): void {
    const ctx = this.ctx;

    // Outer shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 10;

    // Table ellipse
    ctx.beginPath();
    ctx.ellipse(this.tableCX, this.tableCY, this.tableRx + 8, this.tableRy + 8, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#0a1f12';
    ctx.fill();
    ctx.restore();

    // Gold trim
    ctx.beginPath();
    ctx.ellipse(this.tableCX, this.tableCY, this.tableRx + 4, this.tableRy + 4, 0, 0, Math.PI * 2);
    ctx.strokeStyle = PALETTE.goldTrim;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Felt
    ctx.beginPath();
    ctx.ellipse(this.tableCX, this.tableCY, this.tableRx, this.tableRy, 0, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(
      this.tableCX, this.tableCY - 30, 20,
      this.tableCX, this.tableCY, Math.max(this.tableRx, this.tableRy)
    );
    gradient.addColorStop(0, PALETTE.feltGreenLight);
    gradient.addColorStop(1, PALETTE.feltGreen);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Subtle grid lines on felt
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 0.5;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(this.tableCX + i * 60, this.tableCY - this.tableRy);
      ctx.lineTo(this.tableCX + i * 60, this.tableCY + this.tableRy);
      ctx.stroke();
    }
  }

  private drawCommunityCards(community: Card[], time: number): void {
    const count = community.length;
    if (count === 0) return;

    const totalW = count * CARD_W + (count - 1) * 8;
    const startX = this.tableCX - totalW / 2;
    const y = this.tableCY - 10;

    for (let i = 0; i < count; i++) {
      const x = startX + i * (CARD_W + 8);
      const key = `comm_${i}`;
      let anim = this.cardAnims.get(key);

      if (!anim) {
        anim = {
          x: this.tableCX, y: this.tableCY - 60,
          targetX: x, targetY: y,
          rotation: 0, targetRotation: 0,
          scale: 1, flipProgress: 1,
          opacity: 1, visible: true,
          startTime: time, duration: 300,
        } as CardAnimState & { startTime: number; duration: number };
        this.cardAnims.set(key, anim);
      }

      // Cast for extra properties
      const a = anim as CardAnimState & { startTime: number; duration: number };
      drawCard(this.ctx, community[i], a, time);
    }
  }

  private drawPot(amount: number): void {
    const ctx = this.ctx;
    const x = this.tableCX;
    const y = this.tableCY - 60;

    // Draw chips
    drawChipStack(ctx, x - 20, y, amount);

    // Amount text
    ctx.fillStyle = PALETTE.achievement;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`底池: ${amount}`, x + 30, y);
  }

  private drawSeat(seat: Seat, layout: SeatLayout, time: number): void {
    const ctx = this.ctx;
    const { x, y } = layout;

    // Seat area background
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(x, y, 50, 35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Name
    ctx.fillStyle = seat.isHuman ? PALETTE.achievement : PALETTE.textPrimary;
    ctx.font = seat.isHuman ? 'bold 13px sans-serif' : '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(seat.name, x, y - 22);

    // Position label
    if (seat.position) {
      ctx.fillStyle = PALETTE.textDim;
      ctx.font = '10px sans-serif';
      ctx.fillText(seat.position, x, y - 10);
    }

    // Chips
    ctx.fillStyle = PALETTE.textSecondary;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(String(seat.chips), x, y + 6);

    // Action indicator
    if (!seat.folded && seat.currentBet > 0) {
      ctx.fillStyle = PALETTE.achievement;
      ctx.font = '10px sans-serif';
      ctx.fillText(`下注: ${seat.currentBet}`, x, y + 18);
    }
    if (seat.folded) {
      ctx.fillStyle = PALETTE.bad;
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('弃牌', x, y + 18);
    }
    if (seat.allIn) {
      ctx.fillStyle = PALETTE.warning;
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('All-in', x, y + 18);
    }

    // Active indicator
    const isActive = false; // TODO: get from game state
    if (isActive) {
      ctx.strokeStyle = PALETTE.achievement;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y, 52, 37, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Hole cards
    if (seat.holeCards.length > 0) {
      const cardOffset = seat.isHuman ? 18 : 12;
      const cardScale = seat.isHuman ? 1 : 0.65;

      for (let i = 0; i < seat.holeCards.length; i++) {
        const key = `${seat.id}_card_${i}`;
        const cx = x + (i === 0 ? -cardOffset : cardOffset);
        const cy = y + (seat.isHuman ? 45 : 30);

        let anim = this.cardAnims.get(key);
        if (!anim) {
          anim = {
            x: this.tableCX, y: this.tableCY - 60,
            targetX: cx, targetY: cy,
            rotation: (i === 0 ? -0.1 : 0.1),
            targetRotation: (i === 0 ? -0.05 : 0.05),
            scale: 0, flipProgress: seat.isHuman ? 1 : 0,
            opacity: 0, visible: true,
            startTime: time + i * 120, duration: 300,
          } as CardAnimState & { startTime: number; duration: number };
          this.cardAnims.set(key, anim);
        }

        const a = anim as CardAnimState & { startTime: number; duration: number };
        // Override target in case of resize
        a.targetX = cx;
        a.targetY = cy;

        const card = seat.isHuman ? seat.holeCards[i] : null;
        if (seat.isHuman) {
          // Human cards: draw at scaled position with full animation
          drawCard(ctx, card, { ...a, targetX: cx, targetY: cy }, time);
        } else {
          // AI cards: draw scaled back at fixed position
          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(cardScale, cardScale);
          drawCardBack(ctx);
          ctx.restore();
        }
      }
    }
  }

  /** 安排一张牌的发牌动画 */
  dealCard(seatId: string, cardIndex: number, startTime: number): void {
    const key = `${seatId}_card_${cardIndex}`;
    this.pendingCardAnims.push({ seatId, card: { rank: 'A', suit: '♠' }, index: cardIndex, startTime });
  }

  private processPendingAnims(time: number): void {
    for (const pending of this.pendingCardAnims) {
      const key = `${pending.seatId}_card_${pending.index}`;
      if (!this.cardAnims.has(key)) {
        // Find seat position
        const seatIdx = this.seatLayouts.findIndex((_, i) => {
          // This is a hack - we need to find the seat index from seatId
          return true; // placeholder
        });
      }
    }
    this.pendingCardAnims = [];
  }

  clearCardAnims(): void {
    this.cardAnims.clear();
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}
