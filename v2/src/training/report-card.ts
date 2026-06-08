import type { DecisionRecord } from '@/types/game';
import type { SessionReport } from '@/types/training';
import { generateSessionReport } from './feedback-engine';
import { PALETTE } from '@/ui/theme/palette';

export function renderReportCard(container: HTMLElement, records: DecisionRecord[]): void {
  const report = generateSessionReport(records);
  container.innerHTML = '';

  const card = document.createElement('div');
  card.style.cssText = `
    background: ${PALETTE.bgCard};
    border-radius: 16px;
    padding: 24px;
    max-width: 420px;
    margin: 0 auto;
    border: 1px solid ${PALETTE.bgElevated};
  `;

  card.innerHTML = `
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="font-size: 14px; color: ${PALETTE.textSecondary}; margin-bottom: 4px;">会话报告</div>
      <div style="font-size: 32px; font-weight: 800; color: ${reportScoreColor(report)};">
        ${reportScoreLabel(report)}
      </div>
      <div style="font-size: 13px; color: ${PALETTE.textDim}; margin-top: 4px;">
        ${report.handsPlayed}手 · EV ${report.totalEVDifference >= 0 ? '+' : ''}${report.totalEVDifference.toFixed(1)} BB
      </div>
    </div>

    ${report.strengths.length > 0 ? `
      <div style="margin-bottom: 16px;">
        <div style="font-size: 13px; font-weight: 600; color: ${PALETTE.correct}; margin-bottom: 8px;">闪光点</div>
        ${report.strengths.map(s => `
          <div style="font-size: 12px; color: ${PALETTE.textPrimary}; padding: 4px 0; padding-left: 12px;
                      border-left: 2px solid ${PALETTE.correct};">${s}</div>
        `).join('')}
      </div>
    ` : ''}

    ${report.leakCategories.length > 0 ? `
      <div style="margin-bottom: 16px;">
        <div style="font-size: 13px; font-weight: 600; color: ${PALETTE.bad}; margin-bottom: 8px;">漏洞检测</div>
        ${report.leakCategories.map(l => `
          <div style="font-size: 12px; color: ${PALETTE.textPrimary}; padding: 6px 0; padding-left: 12px;
                      border-left: 2px solid ${PALETTE.bad};">
            <div style="font-weight: 600;">${l.name}</div>
            <div style="color: ${PALETTE.textDim}; margin-top: 2px;">${l.description}</div>
          </div>
        `).join('')}
      </div>
    ` : ''}

    ${report.improvements.length > 0 ? `
      <div>
        <div style="font-size: 13px; font-weight: 600; color: ${PALETTE.achievement}; margin-bottom: 8px;">改进建议</div>
        ${report.improvements.map(i => `
          <div style="font-size: 12px; color: ${PALETTE.textPrimary}; padding: 4px 0; padding-left: 12px;
                      border-left: 2px solid ${PALETTE.achievement};">${i}</div>
        `).join('')}
      </div>
    ` : ''}
  `;

  container.appendChild(card);
}

function reportScoreColor(report: SessionReport): string {
  const avg = report.handsPlayed > 0 ? report.totalEVDifference / report.handsPlayed : 0;
  if (avg >= -0.3) return PALETTE.correct;
  if (avg >= -1.5) return PALETTE.warning;
  return PALETTE.bad;
}

function reportScoreLabel(report: SessionReport): string {
  const avg = report.handsPlayed > 0 ? report.totalEVDifference / report.handsPlayed : 0;
  if (avg >= -0.3) return 'S';
  if (avg >= -0.8) return 'A';
  if (avg >= -1.5) return 'B';
  if (avg >= -2.5) return 'C';
  return 'D';
}
