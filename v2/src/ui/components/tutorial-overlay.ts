import { PALETTE } from '@/ui/theme/palette';

interface TutorialStep {
  title: string;
  desc: string;
  highlightId?: string;
  position: 'top' | 'bottom' | 'center';
}

const STEPS: TutorialStep[] = [
  {
    title: '欢迎来到德州哲学家',
    desc: '这不是普通的扑克游戏，而是训练你"独立事件思维"的哲学工具。你将通过德州扑克学会概率直觉、情绪控制和长期决策。',
    position: 'center',
  },
  {
    title: '你的底牌',
    desc: '橙色高亮的座位是你。这2张牌只有你能看到。点击右侧面板的"决策反馈"区域，稍后我们会解释每步决策的好坏。',
    position: 'bottom',
  },
  {
    title: '如何行动',
    desc: '当轮到你时，底部会出现操作栏：弃牌、过牌/跟注、加注、All-in。先试试点"过牌"看看会发生什么。',
    position: 'bottom',
  },
  {
    title: '公共牌 & 下注轮',
    desc: '牌桌中央会依次发5张公共牌（翻牌→转牌→河牌）。你的底牌 + 公共牌组成最佳5张牌。听牌时别急——学会在赔率有利时才投入。',
    position: 'center',
  },
  {
    title: '学习模式',
    desc: '每次行动后，右侧面板会揭示你的决策质量：最优/可接受/损失。目标不是每手都赢，而是长期做+EV决策。现在开始吧！',
    position: 'center',
  },
];

export class TutorialOverlay {
  private container: HTMLElement;
  private overlay: HTMLElement | null = null;
  private stepIndex = 0;
  private onComplete: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  start(): void {
    this.stepIndex = 0;
    this.render();
  }

  private render(): void {
    this.destroy();
    if (this.stepIndex >= STEPS.length) return;

    const step = STEPS[this.stepIndex];

    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 100;
      display: flex;
      align-items: ${step.position === 'center' ? 'center' : step.position === 'bottom' ? 'flex-end' : 'flex-start'};
      justify-content: center;
      pointer-events: none;
    `;

    // Semi-transparent backdrop (clickable area)
    const backdrop = document.createElement('div');
    backdrop.style.cssText = `
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.55);
    `;
    this.overlay.appendChild(backdrop);

    // Card
    const card = document.createElement('div');
    card.style.cssText = `
      position: relative;
      z-index: 101;
      pointer-events: auto;
      max-width: 520px;
      margin: ${step.position === 'center' ? '0' : '0 0 120px 0'};
      padding: 32px 36px 28px;
      background: linear-gradient(180deg, rgba(40,25,18,0.98), rgba(20,12,8,0.98));
      border: 2px solid ${PALETTE.goldTrim};
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.7), 0 0 40px rgba(212,175,55,0.1);
    `;

    // Step count
    const stepBadge = document.createElement('div');
    stepBadge.style.cssText = `
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 10px;
    `;
    stepBadge.innerHTML = `
      <span style="
        display:inline-block;padding:3px 12px;border-radius:20px;
        background:${PALETTE.goldTrim};color:#000;
        font-weight:bold;font-size:11px;letter-spacing:1px;
      ">第 ${this.stepIndex + 1}/${STEPS.length} 步</span>
      <span style="font-size:10px;color:${PALETTE.textDim};">
        ${'●'.repeat(this.stepIndex)}○${'●'.repeat(STEPS.length - this.stepIndex - 1)}
      </span>
    `;
    card.appendChild(stepBadge);

    // Title
    const title = document.createElement('div');
    title.style.cssText = `
      color: ${PALETTE.goldTrimBright};
      font-size: 22px;
      font-weight: bold;
      margin-bottom: 14px;
      font-family: "Playfair Display", "Noto Serif SC", Georgia, serif;
    `;
    title.textContent = step.title;
    card.appendChild(title);

    // Description
    const desc = document.createElement('div');
    desc.style.cssText = `
      color: ${PALETTE.textSecondary};
      font-size: 14.5px;
      line-height: 1.7;
      margin-bottom: 22px;
    `;
    desc.textContent = step.desc;
    card.appendChild(desc);

    // Progress bar
    const progress = document.createElement('div');
    progress.style.cssText = `
      width: 100%;
      height: 3px;
      background: ${PALETTE.bgElevated};
      border-radius: 2px;
      margin-bottom: 18px;
    `;
    const fill = document.createElement('div');
    fill.style.cssText = `
      width: ${((this.stepIndex + 1) / STEPS.length) * 100}%;
      height: 100%;
      background: ${PALETTE.goldTrim};
      border-radius: 2px;
      transition: width 0.4s;
    `;
    progress.appendChild(fill);
    card.appendChild(progress);

    // Button row
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;';

    if (this.stepIndex < STEPS.length - 1) {
      const skipBtn = document.createElement('button');
      skipBtn.textContent = '跳过教程';
      skipBtn.style.cssText = `
        padding: 10px 18px;border-radius:8px;border:1px solid ${PALETTE.bgElevated};
        background:transparent;color:${PALETTE.textDim};cursor:pointer;font-size:12px;
      `;
      skipBtn.addEventListener('click', () => this.complete());
      btnRow.appendChild(skipBtn);
    }

    const nextBtnText = this.stepIndex === STEPS.length - 1 ? '🎲 开始玩吧！' : '继续 →';
    const nextBtn = document.createElement('button');
    nextBtn.textContent = nextBtnText;
    nextBtn.style.cssText = `
      padding: 10px 24px;
      border-radius: 8px;
      border: 2px solid ${PALETTE.goldTrim};
      background: linear-gradient(180deg, ${PALETTE.goldTrim}, #B8962E);
      color: #000;
      font-weight: bold;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.15s;
    `;
    nextBtn.addEventListener('mouseenter', () => {
      nextBtn.style.transform = 'translateY(-1px)';
      nextBtn.style.boxShadow = `0 4px 12px ${PALETTE.goldTrim}66`;
    });
    nextBtn.addEventListener('mouseleave', () => {
      nextBtn.style.transform = '';
      nextBtn.style.boxShadow = '';
    });
    nextBtn.addEventListener('click', () => {
      this.stepIndex++;
      this.render();
    });
    btnRow.appendChild(nextBtn);

    card.appendChild(btnRow);
    this.overlay.appendChild(card);
    this.container.appendChild(this.overlay);
  }

  setOnComplete(cb: () => void): void {
    this.onComplete = cb;
  }

  private complete(): void {
    this.destroy();
    this.onComplete?.();
  }

  destroy(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }
}