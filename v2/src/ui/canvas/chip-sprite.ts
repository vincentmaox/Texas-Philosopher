import { PALETTE } from '@/ui/theme/palette';

const CHIP_R = 14;
const CHIP_COLORS: Record<number, string> = {
  1: PALETTE.chipWhite || '#f0f0f0',
  5: PALETTE.chipRed,
  10: PALETTE.chipBlue,
  25: PALETTE.chipGreen,
  100: PALETTE.chipBlack,
  500: PALETTE.chipGold,
};

export function drawChip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  value: number,
  scale = 1
): void {
  const color = CHIP_COLORS[value] || PALETTE.chipBlue;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Outer ring
  ctx.beginPath();
  ctx.arc(0, 0, CHIP_R, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // Edge dots
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const dx = Math.cos(angle) * (CHIP_R - 3);
    const dy = Math.sin(angle) * (CHIP_R - 3);
    ctx.beginPath();
    ctx.arc(dx, dy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Inner ring
  ctx.beginPath();
  ctx.arc(0, 0, CHIP_R - 5, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Value text
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${value >= 100 ? 8 : 9}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(value), 0, 0);

  ctx.restore();
}

export function drawChipStack(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  amount: number
): void {
  // Break amount into standard denominations
  const denominations = [500, 100, 25, 10, 5, 1];
  const chips: number[] = [];
  let remaining = amount;

  for (const d of denominations) {
    while (remaining >= d) {
      chips.push(d);
      remaining -= d;
    }
  }

  // Draw stack (max 8 visible, overlapping)
  const visible = chips.slice(0, 8);
  const offset = 3;
  for (let i = 0; i < visible.length; i++) {
    drawChip(ctx, x, y - i * offset, visible[i]);
  }

  // If more, show +N
  if (chips.length > 8) {
    ctx.fillStyle = PALETTE.achievement;
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`+${chips.length - 8}`, x, y + CHIP_R + 8);
  }
}
