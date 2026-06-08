import type { FeedbackItem, AidLevel } from '@/types/training';
import { TIMING } from '@/ui/theme/timing';
import { PALETTE } from '@/ui/theme/palette';

type RevealCallback = (element: HTMLElement) => void;

export class EVReveal {
  private container: HTMLElement | null = null;
  private pendingTimeout: ReturnType<typeof setTimeout> | null = null;

  attach(container: HTMLElement): void {
    this.container = container;
  }

  detach(): void {
    this.cancelPending();
    this.container = null;
  }

  reveal(
    item: FeedbackItem,
    aidLevel: AidLevel,
    onComplete?: RevealCallback
  ): HTMLElement {
    const el = document.createElement('div');
    el.style.cssText = `
      padding: 12px 16px;
      margin-bottom: 10px;
      border-radius: 10px;
      background: ${PALETTE.bgCard};
      overflow: hidden;
      opacity: 0;
      transform: translateX(20px);
      transition: opacity 0.3s, transform 0.3s;
    `;

    const verdictColor = verdictColorOf(item.verdict);
    el.style.borderLeft = `3px solid ${verdictColor}`;

    const showNumbers = aidLevel === 'full' || aidLevel === 'delayed';

    const header = document.createElement('div');
    header.style.cssText = `color: ${PALETTE.textSecondary}; font-size: 11px; margin-bottom: 6px;`;
    header.textContent = streetLabel(item.street);
    el.appendChild(header);

    if (showNumbers) {
      const pipeline = buildPipeline(item);
      for (let i = 0; i < pipeline.length; i++) {
        const step = pipeline[i];
        const stepEl = document.createElement('div');
        stepEl.style.cssText = `
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 3px 0;
          opacity: 0;
          transform: translateY(8px);
          transition: opacity 0.2s, transform 0.2s;
          font-size: 13px;
        `;
        stepEl.innerHTML = `
          <span style="color: ${step.color}; min-width: 24px; text-align: center;">${step.icon}</span>
          <span style="color: ${PALETTE.textPrimary};">${step.label}</span>
          <span style="color: ${step.color}; margin-left: auto; font-weight: 600;">${step.value}</span>
        `;
        el.appendChild(stepEl);

        setTimeout(() => {
          stepEl.style.opacity = '1';
          stepEl.style.transform = 'translateY(0)';
        }, TIMING.evStagger * (i + 1));
      }
    }

    const takeaway = document.createElement('div');
    takeaway.style.cssText = `
      margin-top: 8px;
      padding-top: 6px;
      border-top: 1px solid ${PALETTE.bgElevated};
      color: ${verdictColor};
      font-size: 12px;
      opacity: 0;
      transition: opacity 0.3s;
    `;
    takeaway.textContent = item.takeaway;
    el.appendChild(takeaway);

    const showDelay = aidLevel === 'delayed' ? TIMING.evRevealDelay : 0;

    this.cancelPending();
    this.pendingTimeout = setTimeout(() => {
      if (!this.container) return;
      this.container.appendChild(el);

      requestAnimationFrame(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateX(0)';
      });

      setTimeout(() => {
        takeaway.style.opacity = '1';
      }, TIMING.evStagger * 5);

      onComplete?.(el);

      setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateX(20px)';
        setTimeout(() => el.remove(), 300);
      }, 8000);
    }, showDelay);

    return el;
  }

  cancelPending(): void {
    if (this.pendingTimeout) {
      clearTimeout(this.pendingTimeout);
      this.pendingTimeout = null;
    }
  }
}

interface PipelineStep {
  icon: string;
  label: string;
  value: string;
  color: string;
}

function buildPipeline(item: FeedbackItem): PipelineStep[] {
  const steps: PipelineStep[] = [];

  steps.push({
    icon: '🎯',
    label: '手牌胜率',
    value: `${Math.round(item.equity * 100)}%`,
    color: item.equity > 0.5 ? PALETTE.correct : PALETTE.bad,
  });

  steps.push({
    icon: '💰',
    label: '底池赔率',
    value: `${Math.round(item.potOdds * 100)}%`,
    color: PALETTE.info,
  });

  steps.push({
    icon: '👆',
    label: '你的选择',
    value: actionLabel(item.playerAction),
    color: item.playerAction === item.optimalAction ? PALETTE.correct : PALETTE.warning,
  });

  steps.push({
    icon: '⭐',
    label: '最优选择',
    value: actionLabel(item.optimalAction),
    color: PALETTE.achievement,
  });

  const evColor = item.evDifference >= -0.3 ? PALETTE.correct
    : item.evDifference >= -1.0 ? PALETTE.warning : PALETTE.bad;
  steps.push({
    icon: '📊',
    label: 'EV偏差',
    value: `${item.evDifference >= 0 ? '+' : ''}${item.evDifference.toFixed(1)} BB`,
    color: evColor,
  });

  return steps;
}

function verdictColorOf(v: FeedbackItem['verdict']): string {
  switch (v) {
    case 'perfect': return PALETTE.correct;
    case 'good': return '#68D391';
    case 'acceptable': return PALETTE.warning;
    case 'bad': return PALETTE.bad;
  }
}

function streetLabel(s: string): string {
  switch (s) {
    case 'preflop': return '翻牌前';
    case 'flop': return '翻牌圈';
    case 'turn': return '转牌圈';
    case 'river': return '河牌圈';
    default: return s;
  }
}

function actionLabel(a: string): string {
  switch (a) {
    case 'fold': return '弃牌';
    case 'check': return '过牌';
    case 'call': return '跟注';
    case 'raise': return '加注';
    case 'allin': return 'All-in';
    default: return a;
  }
}
