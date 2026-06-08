import type { Card } from '@/types/card';
import { isRed, RANK_VALUE } from '@/types/card';
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

const CARD_W = 56;
const CARD_H = 80;
const CORNER_R = 4;

/** 创建初始动画状态 */
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

/** 绘制单张牌到Canvas */
export function drawCard(
  ctx: CanvasRenderingContext2D,
  card: Card | null,
  anim: CardAnimState,
  time: number
): void {
  if (!anim.visible) return;

  // Interpolate with ease-out
  const t = Math.min(1, Math.max(0, (time - anim.startTime) / anim.duration));
  const ease = 1 - Math.pow(1 - t, 3);

  const x = anim.x + (anim.targetX - anim.x) * ease;
  const y = anim.y + (anim.targetY - anim.y) * ease;
  const rot = anim.rotation + (anim.targetRotation - anim.rotation) * ease;
  const scale = anim.scale + (1 - anim.scale) * ease;
  const opacity = anim.opacity + (1 - anim.opacity) * ease;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(x + CARD_W / 2, y + CARD_H / 2);
  ctx.rotate(rot);
  ctx.scale(scale, scale);

  // Card body (white rect with rounded corners)
  ctx.fillStyle = PALETTE.cardWhite;
  roundRect(ctx, -CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, CORNER_R);
  ctx.fill();

  // Shadow
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 3;
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // Border
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  if (anim.flipProgress < 0.5) {
    // Draw back
    drawCardBack(ctx);
  } else if (card) {
    // Draw face
    drawCardFace(ctx, card);
  }

  ctx.restore();
}

export function drawCardBack(ctx: CanvasRenderingContext2D): void {
  const w = CARD_W - 4, h = CARD_H - 4;
  ctx.fillStyle = '#1e3a5f';
  roundRect(ctx, -w / 2, -h / 2, w, h, 2);
  ctx.fill();

  // Pattern
  ctx.strokeStyle = '#2d5a87';
  ctx.lineWidth = 0.8;
  for (let i = -w / 2; i < w / 2; i += 6) {
    ctx.beginPath();
    ctx.moveTo(i, -h / 2);
    ctx.lineTo(i + h * 0.3, h / 2);
    ctx.stroke();
  }

  // Center diamond
  ctx.fillStyle = '#c9a227';
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(8, 0);
  ctx.lineTo(0, 10);
  ctx.lineTo(-8, 0);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawCardFace(ctx: CanvasRenderingContext2D, card: Card): void {
  const isR = isRed(card.suit);
  ctx.fillStyle = isR ? PALETTE.cardRed : PALETTE.cardBlack;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const rankStr = card.rank === 'T' ? '10' : card.rank;
  const fontSize = 14;

  // Top-left rank
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.fillText(rankStr, -CARD_W / 2 + 9, -CARD_H / 2 + 12);

  // Top-left suit
  ctx.font = `${fontSize}px sans-serif`;
  ctx.fillText(card.suit, -CARD_W / 2 + 9, -CARD_H / 2 + 26);

  // Bottom-right rank (rotated)
  ctx.save();
  ctx.translate(CARD_W / 2 - 9, CARD_H / 2 - 12);
  ctx.rotate(Math.PI);
  ctx.fillText(rankStr, 0, 0);
  ctx.restore();

  // Center suit (larger)
  ctx.font = `24px sans-serif`;
  ctx.fillText(card.suit, 0, 0);
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
