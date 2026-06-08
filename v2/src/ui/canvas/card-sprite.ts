import type { Card } from '@/types/card';
import { isRed } from '@/types/card';
import { PALETTE } from '@/ui/theme/palette';

export interface CardAnimState {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  rotation: number;
  targetRotation: number;
  scale: number;
  flipProgress: number; // 0 = back, 1 = face
  opacity: number;
  visible: boolean;
  startTime: number;
  duration: number;
}

// AAA poker card dimensions (industry standard for 1080p)
const CARD_W = 130;
const CARD_H = 182;
const CORNER_R = 10;

const SUIT_GLYPH: Record<string, string> = {
  '♠': '♠',
  '♥': '♥',
  '♦': '♦',
  '♣': '♣',
};

export function createCardAnim(deckX: number, deckY: number): CardAnimState {
  return {
    x: deckX, y: deckY,
    targetX: deckX, targetY: deckY,
    rotation: 0, targetRotation: 0,
    scale: 0,
    flipProgress: 0,
    opacity: 0,
    visible: false,
    startTime: 0,
    duration: 300,
  };
}

export function drawCard(
  ctx: CanvasRenderingContext2D,
  card: Card | null,
  anim: CardAnimState,
  time: number,
  scaleMul: number = 1,
): void {
  if (!anim.visible) return;

  const t = Math.min(1, Math.max(0, (time - anim.startTime) / anim.duration));
  const ease = 1 - Math.pow(1 - t, 3);

  const x = anim.x + (anim.targetX - anim.x) * ease;
  const y = anim.y + (anim.targetY - anim.y) * ease;
  const rot = anim.rotation + (anim.targetRotation - anim.rotation) * ease;
  const scale = (anim.scale + (1 - anim.scale) * ease) * scaleMul;
  const opacity = anim.opacity + (1 - anim.opacity) * ease;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(scale, scale);

  // Drop shadow
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 5;

  // Card body (cream white with rounded corners)
  ctx.fillStyle = PALETTE.cardCream;
  roundRect(ctx, -CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, CORNER_R);
  ctx.fill();

  // Clear shadow for inner content
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Inner border (thin gold-ish trim)
  ctx.strokeStyle = PALETTE.cardBorder;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  if (anim.flipProgress < 0.5) {
    drawCardBack(ctx);
  } else if (card) {
    drawCardFace(ctx, card);
  }

  ctx.restore();
}

export function drawCardBack(ctx: CanvasRenderingContext2D): void {
  const w = CARD_W - 12, h = CARD_H - 12;
  // Inner panel
  ctx.fillStyle = '#7A1F2B';
  roundRect(ctx, -w / 2, -h / 2, w, h, 6);
  ctx.fill();

  // Diagonal stripe pattern
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, -w / 2, -h / 2, w, h, 6);
  ctx.clip();
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.18)';
  ctx.lineWidth = 1.2;
  for (let i = -h; i < w + h; i += 8) {
    ctx.beginPath();
    ctx.moveTo(-w / 2 + i, -h / 2);
    ctx.lineTo(-w / 2 + i - h, h / 2);
    ctx.stroke();
  }
  ctx.restore();

  // Outer gold frame
  ctx.strokeStyle = PALETTE.goldTrim;
  ctx.lineWidth = 2;
  roundRect(ctx, -w / 2 + 3, -h / 2 + 3, w - 6, h - 6, 4);
  ctx.stroke();

  // Center diamond logo
  ctx.fillStyle = PALETTE.goldTrim;
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(20, 0);
  ctx.lineTo(0, 24);
  ctx.lineTo(-20, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#7A1F2B';
  ctx.font = 'bold 22px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('哲', 0, 1);
}

function drawCardFace(ctx: CanvasRenderingContext2D, card: Card): void {
  const isR = isRed(card.suit);
  const color = isR ? PALETTE.cardRed : PALETTE.cardBlack;
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const rankStr = card.rank === 'T' ? '10' : card.rank;
  const suit = SUIT_GLYPH[card.suit] ?? card.suit;

  // Top-left rank (large bold serif)
  ctx.font = `bold 32px "Playfair Display", "Georgia", serif`;
  ctx.fillText(rankStr, -CARD_W / 2 + 10, -CARD_H / 2 + 8);

  // Top-left suit
  ctx.font = `26px serif`;
  ctx.fillText(suit, -CARD_W / 2 + 12, -CARD_H / 2 + 42);

  // Bottom-right rank + suit (rotated 180°)
  ctx.save();
  ctx.translate(CARD_W / 2 - 10, CARD_H / 2 - 8);
  ctx.rotate(Math.PI);
  ctx.font = `bold 32px "Playfair Display", "Georgia", serif`;
  ctx.fillText(rankStr, 0, 0);
  ctx.font = `26px serif`;
  ctx.fillText(suit, 2, 36);
  ctx.restore();

  // Center suit (massive)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `72px serif`;
  ctx.fillText(suit, 0, 6);
}

function roundRect(
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

export { CARD_W, CARD_H };
