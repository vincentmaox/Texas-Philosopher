import type { Card } from '@/types/card';
import type { Seat, GameState } from '@/types/game';
import { PALETTE } from '@/ui/theme/palette';
import { drawCard, drawCardBack, type CardAnimState, CARD_W, CARD_H } from './card-sprite';
import { drawChipStack } from './chip-sprite';

export interface SeatLayout {
  x: number;
  y: number;
  angle: number;
  bettingX: number;
  bettingY: number;
}

export class TableRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;

  private cardAnims = new Map<string, CardAnimState>();

  // Table geometry
  private tableCX = 0;
  private tableCY = 0;
  private tableRx = 0;
  private tableRy = 0;
  private seatLayouts: SeatLayout[] = [];

  // Active seat ID for pulsing highlight
  private activeSeatId: string | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D not supported');
    this.ctx = ctx;
    this.resize();
  }

  setActiveSeat(seatId: string | null): void {
    this.activeSeatId = seatId;
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
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    // Bigger table, leave room for right sidebar (320px) + bottom action bar (180px)
    const usableW = this.width - 340;  // sidebar
    const usableH = this.height - 200;  // action bar
    this.tableCX = usableW / 2 + 10;
    this.tableCY = usableH / 2 + 40;
    this.tableRx = Math.min(usableW * 0.48, 560);
    this.tableRy = Math.min(usableH * 0.42, 340);
  }

  calculateSeatLayouts(seatCount: number): SeatLayout[] {
    const layouts: SeatLayout[] = [];
    const bottomAngle = Math.PI / 2;
    const arcSize = Math.PI * 1.4;

    for (let i = 0; i < seatCount; i++) {
      let angle: number;
      if (i === 0) {
        angle = bottomAngle;
      } else {
        const others = seatCount - 1;
        const idx = i - 1;
        if (others === 1) {
          angle = -Math.PI / 2; // top
        } else {
          angle = bottomAngle + Math.PI - arcSize / 2 + (idx / (others - 1)) * arcSize;
        }
      }

      // Seat sits OUTSIDE the felt
      const seatRx = this.tableRx + 60;
      const seatRy = this.tableRy + 50;
      const x = this.tableCX + Math.cos(angle) * seatRx;
      const y = this.tableCY + Math.sin(angle) * seatRy;

      // Betting chip position halfway between seat and table center
      const betRx = this.tableRx - 40;
      const betRy = this.tableRy - 30;
      const bettingX = this.tableCX + Math.cos(angle) * betRx;
      const bettingY = this.tableCY + Math.sin(angle) * betRy;

      layouts.push({ x, y, angle, bettingX, bettingY });
    }
    return layouts;
  }

  render(state: GameState, time: number): void {
    this.drawBackground();

    this.seatLayouts = this.calculateSeatLayouts(state.seats.length);

    this.drawTable();
    this.drawCommunityCards(state.community, time);

    if (state.pot > 0) {
      this.drawPot(state.pot);
    }

    state.seats.forEach((seat, i) => {
      const layout = this.seatLayouts[i];
      this.drawSeat(seat, layout, time);
    });

    // Vignette on top of everything for cinematic feel
    this.drawVignette();
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    // Warm dark room gradient
    const bg = ctx.createRadialGradient(
      this.width / 2, this.height / 2, 50,
      this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.7
    );
    bg.addColorStop(0, PALETTE.bgCard);
    bg.addColorStop(0.6, PALETTE.bgMid);
    bg.addColorStop(1, PALETTE.bgDeep);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.width, this.height);

    // Subtle wood grain texture (vertical lines)
    ctx.strokeStyle = 'rgba(255,255,255,0.012)';
    ctx.lineWidth = 1;
    for (let x = 0; x < this.width; x += 7) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
  }

  private drawVignette(): void {
    const ctx = this.ctx;
    const grad = ctx.createRadialGradient(
      this.tableCX, this.tableCY, Math.min(this.tableRx, this.tableRy) * 0.4,
      this.tableCX, this.tableCY, Math.max(this.width, this.height) * 0.75
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.55, 'rgba(0,0,0,0.25)');
    grad.addColorStop(1, 'rgba(0,0,0,0.78)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawTable(): void {
    const ctx = this.ctx;

    // Outer wood trim (deep brown)
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 15;
    ctx.beginPath();
    ctx.ellipse(this.tableCX, this.tableCY, this.tableRx + 36, this.tableRy + 36, 0, 0, Math.PI * 2);
    const woodGrad = ctx.createRadialGradient(
      this.tableCX, this.tableCY - 30, this.tableRx * 0.5,
      this.tableCX, this.tableCY, this.tableRx + 36
    );
    woodGrad.addColorStop(0, PALETTE.woodTrimLight);
    woodGrad.addColorStop(1, PALETTE.woodTrim);
    ctx.fillStyle = woodGrad;
    ctx.fill();
    ctx.restore();

    // Gold inner trim
    ctx.beginPath();
    ctx.ellipse(this.tableCX, this.tableCY, this.tableRx + 10, this.tableRy + 10, 0, 0, Math.PI * 2);
    ctx.strokeStyle = PALETTE.goldTrim;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(this.tableCX, this.tableCY, this.tableRx + 6, this.tableRy + 6, 0, 0, Math.PI * 2);
    ctx.strokeStyle = PALETTE.goldTrimBright;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Felt — radial gradient with spotlight from top
    ctx.beginPath();
    ctx.ellipse(this.tableCX, this.tableCY, this.tableRx, this.tableRy, 0, 0, Math.PI * 2);
    const feltGrad = ctx.createRadialGradient(
      this.tableCX, this.tableCY - 60, 30,
      this.tableCX, this.tableCY, Math.max(this.tableRx, this.tableRy) * 1.1
    );
    feltGrad.addColorStop(0, PALETTE.feltGreenLight);
    feltGrad.addColorStop(0.6, PALETTE.feltGreen);
    feltGrad.addColorStop(1, PALETTE.feltGreenDark);
    ctx.fillStyle = feltGrad;
    ctx.fill();

    // Subtle inner shadow on felt edge
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(this.tableCX, this.tableCY, this.tableRx, this.tableRy, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.ellipse(this.tableCX, this.tableCY, this.tableRx, this.tableRy, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Faint TEXAS PHILOSOPHER text on felt
    ctx.save();
    ctx.fillStyle = 'rgba(212, 175, 55, 0.08)';
    ctx.font = 'bold 22px "Playfair Display", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('德州哲学家 · TEXAS PHILOSOPHER', this.tableCX, this.tableCY + this.tableRy * 0.55);
    ctx.restore();
  }

  private drawCommunityCards(community: Card[], time: number): void {
    const count = community.length;
    if (count === 0) return;

    const cardSpacing = CARD_W * 0.85 + 14;
    const totalW = (count - 1) * cardSpacing;
    const startX = this.tableCX - totalW / 2;
    const y = this.tableCY - 20;

    for (let i = 0; i < count; i++) {
      const cx = startX + i * cardSpacing;
      const key = `comm_${i}`;
      let anim = this.cardAnims.get(key);

      if (!anim) {
        anim = {
          x: this.tableCX, y: this.tableCY - 80,
          targetX: cx, targetY: y,
          rotation: 0, targetRotation: 0,
          scale: 0.3, flipProgress: 1,
          opacity: 0, visible: true,
          startTime: time, duration: 350,
        };
        this.cardAnims.set(key, anim);
      }
      anim.targetX = cx;
      anim.targetY = y;

      drawCard(this.ctx, community[i], anim, time, 0.85);
    }
  }

  private drawPot(amount: number): void {
    const ctx = this.ctx;
    const x = this.tableCX;
    const y = this.tableCY + CARD_H * 0.55;

    // Pot label background
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRectPath(ctx, x - 90, y - 22, 180, 44, 22);
    ctx.fill();
    ctx.strokeStyle = PALETTE.goldTrim;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Chips icon on left
    drawChipStack(ctx, x - 70, y, Math.min(amount, 500));

    // Amount text
    ctx.fillStyle = PALETTE.goldTrimBright;
    ctx.font = 'bold 22px "Oswald", "Arial Narrow", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`$${amount}`, x - 40, y);

    // POT label above
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '11px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('POT', x, y - 30);
  }

  private drawSeat(seat: Seat, layout: SeatLayout, time: number): void {
    const ctx = this.ctx;
    const { x, y } = layout;
    const isActive = seat.id === this.activeSeatId;

    // Avatar plate
    const plateW = 150;
    const plateH = 64;
    const plateY = y - plateH / 2;

    // Active seat: pulsing gold glow
    if (isActive && !seat.folded) {
      const pulse = (Math.sin(time / 300) + 1) / 2; // 0..1
      ctx.save();
      ctx.shadowColor = PALETTE.goldTrimBright;
      ctx.shadowBlur = 20 + pulse * 16;
      ctx.fillStyle = `rgba(212, 175, 55, ${0.15 + pulse * 0.15})`;
      roundRectPath(ctx, x - plateW / 2 - 4, plateY - 4, plateW + 8, plateH + 8, 12);
      ctx.fill();
      ctx.restore();
    }

    // Plate background
    ctx.save();
    ctx.fillStyle = seat.folded ? 'rgba(20,15,12,0.55)' : 'rgba(20,15,12,0.85)';
    roundRectPath(ctx, x - plateW / 2, plateY, plateW, plateH, 10);
    ctx.fill();

    // Plate border
    ctx.strokeStyle = isActive ? PALETTE.goldTrimBright :
                      seat.isHuman ? PALETTE.goldTrim : PALETTE.bgElevated;
    ctx.lineWidth = isActive ? 2.2 : 1.4;
    ctx.stroke();
    ctx.restore();

    // Avatar circle (left side of plate)
    const avatarR = 22;
    const avatarX = x - plateW / 2 + avatarR + 8;
    const avatarY = y;

    ctx.save();
    ctx.fillStyle = seat.isHuman ? '#2E5A8C' : this.colorForName(seat.name);
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.goldTrim;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Avatar initial
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(seat.name.charAt(0), avatarX, avatarY);
    ctx.restore();

    // Name + position
    const textX = avatarX + avatarR + 10;
    ctx.fillStyle = seat.isHuman ? PALETTE.goldTrimBright : PALETTE.textPrimary;
    ctx.font = 'bold 13px "Inter", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(this.truncate(seat.name, 10), textX, plateY + 10);

    // Chips
    ctx.fillStyle = PALETTE.goldTrim;
    ctx.font = 'bold 16px "Oswald", sans-serif';
    ctx.fillText(`$${seat.chips}`, textX, plateY + 28);

    // Position badge
    if (seat.position) {
      ctx.fillStyle = PALETTE.bgElevated;
      const badgeW = 26;
      roundRectPath(ctx, x + plateW / 2 - badgeW - 4, plateY + 4, badgeW, 16, 4);
      ctx.fill();
      ctx.fillStyle = PALETTE.textSecondary;
      ctx.font = 'bold 9px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(seat.position, x + plateW / 2 - badgeW / 2 - 4, plateY + 12);
    }

    // Status badges
    if (seat.folded) {
      ctx.fillStyle = PALETTE.bad;
      ctx.font = 'bold 11px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('FOLDED', x, plateY + plateH + 14);
    } else if (seat.allIn) {
      ctx.fillStyle = PALETTE.warning;
      ctx.font = 'bold 11px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ALL-IN', x, plateY + plateH + 14);
    }

    // Current bet chips on table
    if (!seat.folded && seat.currentBet > 0) {
      const bx = layout.bettingX;
      const by = layout.bettingY;
      drawChipStack(ctx, bx - 12, by, Math.min(seat.currentBet, 500));
      ctx.fillStyle = PALETTE.goldTrimBright;
      ctx.font = 'bold 13px "Oswald", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`$${seat.currentBet}`, bx + 10, by);
    }

    // Hole cards
    if (seat.holeCards.length > 0 && !seat.folded) {
      this.drawHoleCards(seat, layout, time);
    }
  }

  private drawHoleCards(seat: Seat, layout: SeatLayout, time: number): void {
    const { x, y, angle } = layout;
    const isHuman = seat.isHuman;
    const scale = isHuman ? 1 : 0.55;

    // Position cards: in front of plate, towards table center
    const dirX = Math.cos(angle + Math.PI); // toward center
    const dirY = Math.sin(angle + Math.PI);
    const offsetDist = isHuman ? 100 : 50;
    const baseCardX = x + dirX * offsetDist;
    const baseCardY = y + dirY * offsetDist;

    const cardSpacing = CARD_W * scale * 0.6;

    for (let i = 0; i < seat.holeCards.length; i++) {
      const key = `${seat.id}_card_${i}`;
      const offset = (i - 0.5) * cardSpacing;
      // Cards lean apart slightly
      const cx = baseCardX + offset;
      const cy = baseCardY;
      const rot = isHuman ? (i === 0 ? -0.06 : 0.06) : (i === 0 ? -0.1 : 0.1);

      let anim = this.cardAnims.get(key);
      if (!anim) {
        anim = {
          x: this.tableCX, y: this.tableCY - 60,
          targetX: cx, targetY: cy,
          rotation: 0, targetRotation: rot,
          scale: 0.2, flipProgress: isHuman ? 1 : 0,
          opacity: 0, visible: true,
          startTime: time + i * 140, duration: 320,
        };
        this.cardAnims.set(key, anim);
      }
      anim.targetX = cx;
      anim.targetY = cy;
      anim.targetRotation = rot;

      if (isHuman) {
        drawCard(this.ctx, seat.holeCards[i], anim, time, scale);
      } else {
        // AI: draw card back at animated position
        drawCard(this.ctx, null, anim, time, scale);
      }
    }
  }

  private colorForName(name: string): string {
    // Deterministic warm color from name hash
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
    const hue = h % 360;
    return `hsl(${hue}, 45%, 35%)`;
  }

  private truncate(s: string, n: number): string {
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }

  clearCardAnims(): void {
    this.cardAnims.clear();
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
