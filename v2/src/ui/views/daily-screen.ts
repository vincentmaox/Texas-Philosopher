import type { DailyState, DailyHand } from '@/engagement/daily';
import { createDailyState, updateTaskProgress, getDailyReward } from '@/engagement/daily';
import { PALETTE } from '@/ui/theme/palette';
import { showToast } from '@/ui/components/toast';

export class DailyScreen {
  private container: HTMLElement;
  private state: DailyState;

  constructor(container: HTMLElement) {
    this.container = container;
    this.state = createDailyState();
    this.render();
  }

  refresh(): void {
    const today = new Date().toISOString().slice(0, 10);
    if (this.state.date !== today) {
      this.state = createDailyState();
    }
    this.render();
  }

  recordAction(type: 'hands' | 'good_decisions' | 'folds' | 'wins' | 'bluffs'): void {
    this.state = updateTaskProgress(this.state, type);
    this.render();
    if (this.state.completed) {
      const reward = getDailyReward(this.state);
      showToast(`每日任务完成! +${reward}XP`, 'success');
    }
  }

  private render(): void {
    this.container.innerHTML = '';
    this.container.style.position = 'relative';
    this.container.style.overflowY = 'auto';

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `max-width: 480px; margin: 0 auto; padding: 24px 20px;`;

    // Header
    const header = document.createElement('h1');
    header.textContent = '每日挑战';
    header.style.cssText = `font-size: 20px; font-weight: 700; color: ${PALETTE.textPrimary}; margin-bottom: 20px;`;
    wrapper.appendChild(header);

    // Daily hand
    if (this.state.dailyHand) {
      wrapper.appendChild(this.renderDailyHand(this.state.dailyHand));
    }

    // Tasks
    const taskHeader = document.createElement('h2');
    taskHeader.textContent = '今日任务';
    taskHeader.style.cssText = `font-size: 16px; font-weight: 600; color: ${PALETTE.textPrimary}; margin: 24px 0 12px;`;
    wrapper.appendChild(taskHeader);

    for (const task of this.state.tasks) {
      wrapper.appendChild(this.renderTask(task));
    }

    // Reward summary
    const reward = getDailyReward(this.state);
    const rewardDiv = document.createElement('div');
    rewardDiv.style.cssText = `
      margin-top: 20px; padding: 12px 16px; border-radius: 10px;
      background: ${PALETTE.bgCard}; text-align: center;
      color: ${this.state.completed ? PALETTE.achievement : PALETTE.textDim};
      font-size: 14px;
    `;
    rewardDiv.textContent = this.state.completed
      ? `全部完成! 获得 ${reward} XP`
      : `当前奖励: ${reward} XP`;
    wrapper.appendChild(rewardDiv);

    this.container.appendChild(wrapper);
  }

  private renderDailyHand(hand: DailyHand): HTMLElement {
    const el = document.createElement('div');
    el.style.cssText = `
      padding: 16px; border-radius: 12px;
      background: ${PALETTE.bgCard}; border: 1px solid ${PALETTE.achievement}44;
    `;

    el.innerHTML = `
      <div style="font-size: 14px; font-weight: 600; color: ${PALETTE.achievement}; margin-bottom: 12px;">
        🃏 每日一手
      </div>
      <div style="font-size: 20px; font-weight: 700; color: ${PALETTE.textPrimary}; margin-bottom: 8px; letter-spacing: 2px;">
        ${hand.holeCards.join(' ')}
      </div>
      <div style="font-size: 12px; color: ${PALETTE.textSecondary}; margin-bottom: 4px;">
        位置: ${hand.position} · 底池: ${hand.potSize} · 跟注: ${hand.toCall}
      </div>
      ${hand.community.length > 0 ? `
        <div style="font-size: 14px; color: ${PALETTE.textPrimary}; margin: 8px 0;">
          公共牌: ${hand.community.join(' ')}
        </div>
      ` : ''}
      <div style="font-size: 12px; color: ${PALETTE.textDim}; margin-top: 8px; font-style: italic;">
        正确答案: ${hand.correctAction} — ${hand.explanation}
      </div>
    `;

    return el;
  }

  private renderTask(task: DailyState['tasks'][0]): HTMLElement {
    const done = task.progress >= task.target;
    const pct = Math.min(100, Math.round((task.progress / task.target) * 100));

    const el = document.createElement('div');
    el.style.cssText = `
      padding: 12px 16px; margin-bottom: 8px; border-radius: 10px;
      background: ${PALETTE.bgCard}; border-left: 3px solid ${done ? PALETTE.correct : PALETTE.textDim};
    `;

    el.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 13px; color: ${done ? PALETTE.correct : PALETTE.textPrimary};">
          ${done ? '✓ ' : ''}${task.description}
        </span>
        <span style="font-size: 12px; color: ${PALETTE.achievement};">+${task.reward} XP</span>
      </div>
      <div style="margin-top: 6px; height: 4px; border-radius: 2px; background: ${PALETTE.bgElevated}; overflow: hidden;">
        <div style="height: 100%; width: ${pct}%; background: ${done ? PALETTE.correct : PALETTE.info}; border-radius: 2px; transition: width 0.3s;"></div>
      </div>
      <div style="font-size: 11px; color: ${PALETTE.textDim}; margin-top: 4px;">
        ${task.progress}/${task.target}
      </div>
    `;

    return el;
  }
}
