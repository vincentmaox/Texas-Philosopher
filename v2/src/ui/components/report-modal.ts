import type { DecisionRecord } from '@/types/game';
import { renderReportCard } from '@/training/report-card';
import { PALETTE } from '@/ui/theme/palette';
import { TIMING } from '@/ui/theme/timing';

export function showReportModal(records: DecisionRecord[]): void {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.7); z-index: 1000;
    display: flex; align-items: center; justify-content: center;
    opacity: 0; transition: opacity ${TIMING.modalOpen}ms;
  `;

  const modal = document.createElement('div');
  modal.style.cssText = `
    background: ${PALETTE.bgMid};
    border-radius: 16px;
    max-width: 480px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    padding: 20px;
    transform: scale(0.95);
    transition: transform ${TIMING.modalOpen}ms;
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 16px;
  `;

  const title = document.createElement('h2');
  title.textContent = '会话报告';
  title.style.cssText = `color: ${PALETTE.textPrimary}; font-size: 18px; font-weight: 700; margin: 0;`;

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = `
    background: none; border: none; color: ${PALETTE.textSecondary};
    font-size: 20px; cursor: pointer; padding: 4px 8px;
  `;

  header.appendChild(title);
  header.appendChild(closeBtn);
  modal.appendChild(header);

  const body = document.createElement('div');
  renderReportCard(body, records);
  modal.appendChild(body);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    modal.style.transform = 'scale(1)';
  });

  function close(): void {
    overlay.style.opacity = '0';
    modal.style.transform = 'scale(0.95)';
    setTimeout(() => overlay.remove(), TIMING.modalClose);
  }

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
}
