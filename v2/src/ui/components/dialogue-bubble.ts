import type { AIDecision } from '@/types/ai';
import type { Seat } from '@/types/game';
import { PALETTE } from '@/ui/theme/palette';
import { TIMING } from '@/ui/theme/timing';

export function showDialogueBubble(seat: Seat, decision: AIDecision, anchorEl: HTMLElement): void {
  const bubble = document.createElement('div');
  bubble.style.cssText = `
    position: absolute;
    background: ${PALETTE.bgCard};
    border: 1px solid ${PALETTE.bgElevated};
    border-radius: 10px;
    padding: 8px 12px;
    max-width: 200px;
    z-index: 50;
    opacity: 0;
    transform: translateY(8px);
    transition: opacity ${TIMING.dialogueAppear}ms, transform ${TIMING.dialogueAppear}ms;
    pointer-events: none;
  `;

  const nameDiv = document.createElement('div');
  nameDiv.style.cssText = `font-size: 11px; color: ${PALETTE.achievement}; margin-bottom: 4px; font-weight: 600;`;
  nameDiv.textContent = seat.name;
  bubble.appendChild(nameDiv);

  const textDiv = document.createElement('div');
  textDiv.style.cssText = `font-size: 13px; color: ${PALETTE.textPrimary};`;
  textDiv.textContent = decision.dialogue;
  bubble.appendChild(textDiv);

  if (decision.thinking) {
    const thinkDiv = document.createElement('div');
    thinkDiv.style.cssText = `font-size: 11px; color: ${PALETTE.textDim}; margin-top: 4px; font-style: italic;`;
    thinkDiv.textContent = decision.thinking;
    bubble.appendChild(thinkDiv);
  }

  anchorEl.appendChild(bubble);

  requestAnimationFrame(() => {
    bubble.style.opacity = '1';
    bubble.style.transform = 'translateY(0)';
  });

  setTimeout(() => {
    bubble.style.opacity = '0';
    bubble.style.transform = 'translateY(8px)';
    setTimeout(() => bubble.remove(), TIMING.dialogueFade);
  }, TIMING.dialogueDuration);
}
