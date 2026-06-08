import type { Seat } from '@/types/game';
import type { AIDecision } from '@/types/ai';
import { PALETTE } from '@/ui/theme/palette';

interface DialogueEntry {
  el: HTMLElement;
  timestamp: number;
}

const MAX_HISTORY = 8;
const ACTION_LABEL: Record<string, string> = {
  fold: '弃牌',
  check: '过牌',
  call: '跟注',
  raise: '加注',
  allin: '全下',
};

const MBTI_COLOR: Record<string, string> = {
  INTJ: '#7B68EE', INTP: '#6495ED', ENTJ: '#FF6347', ENTP: '#FFA07A',
  INFJ: '#9370DB', INFP: '#DDA0DD', ENFJ: '#FFB6C1', ENFP: '#FFD700',
  ISTJ: '#708090', ISFJ: '#B0C4DE', ESTJ: '#CD5C5C', ESFJ: '#F4A460',
  ISTP: '#5F9EA0', ISFP: '#98FB98', ESTP: '#FF4500', ESFP: '#FF69B4',
};

export class DialoguePanel {
  private root: HTMLElement;
  private list: HTMLElement;
  private thinkingEl: HTMLElement | null = null;
  private history: DialogueEntry[] = [];

  constructor() {
    this.root = document.createElement('div');
    this.root.style.cssText = `
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 10px 12px;
      gap: 6px;
    `;

    this.list = document.createElement('div');
    this.list.style.cssText = `
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column-reverse;
      gap: 8px;
      padding-right: 4px;
    `;
    this.root.appendChild(this.list);
  }

  getElement(): HTMLElement {
    return this.root;
  }

  showThinking(seat: Seat): void {
    this.removeThinking();

    const el = document.createElement('div');
    el.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      background: rgba(212, 175, 55, 0.08);
      border-left: 3px solid ${PALETTE.goldTrim};
      border-radius: 6px;
      animation: tp-pulse 1.4s ease-in-out infinite;
    `;

    const avatar = this.makeAvatar(seat);
    el.appendChild(avatar);

    const text = document.createElement('div');
    text.style.cssText = `flex:1;color:${PALETTE.textSecondary};font-size:12px;font-style:italic;`;
    text.innerHTML = `<strong style="color:${PALETTE.goldTrimBright};">${escapeHtml(seat.name)}</strong> 正在思考<span class="tp-dots">...</span>`;
    el.appendChild(text);

    this.thinkingEl = el;
    this.list.insertBefore(el, this.list.firstChild);

    this.ensurePulseStyle();
  }

  private removeThinking(): void {
    if (this.thinkingEl) {
      this.thinkingEl.remove();
      this.thinkingEl = null;
    }
  }

  addMessage(seat: Seat, decision: AIDecision): void {
    this.removeThinking();

    // Dim existing messages
    for (const entry of this.history) {
      entry.el.style.opacity = '0.55';
    }

    const el = document.createElement('div');
    const mbti = seat.mbtiType || '';
    const mbtiColor = mbti ? MBTI_COLOR[mbti] || PALETTE.info : PALETTE.info;

    el.style.cssText = `
      display: flex;
      gap: 10px;
      padding: 10px 12px;
      background: rgba(30, 20, 15, 0.6);
      border-left: 3px solid ${mbtiColor};
      border-radius: 6px;
      animation: tp-slidein 0.3s ease-out;
    `;

    const avatar = this.makeAvatar(seat);
    el.appendChild(avatar);

    const body = document.createElement('div');
    body.style.cssText = 'flex:1;min-width:0;';

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap;';
    header.innerHTML = `
      <strong style="color:${PALETTE.goldTrimBright};font-size:12px;">${escapeHtml(seat.name)}</strong>
      ${mbti ? `<span style="font-size:9px;padding:1px 6px;background:${mbtiColor}33;color:${mbtiColor};border-radius:8px;font-weight:bold;letter-spacing:1px;">${mbti}</span>` : ''}
      <span style="font-size:10px;padding:1px 6px;background:rgba(212,175,55,0.15);color:${PALETTE.goldTrim};border-radius:8px;">${ACTION_LABEL[decision.action] || decision.action}${decision.amount ? ` $${decision.amount}` : ''}</span>
    `;
    body.appendChild(header);

    const dialogue = document.createElement('div');
    dialogue.style.cssText = `color:${PALETTE.textPrimary};font-size:13px;line-height:1.5;margin-bottom:4px;`;
    dialogue.textContent = `"${decision.dialogue}"`;
    body.appendChild(dialogue);

    if (decision.thinking) {
      const thinking = document.createElement('div');
      thinking.style.cssText = `color:${PALETTE.textDim};font-size:11px;line-height:1.4;font-style:italic;`;
      thinking.textContent = `💭 ${decision.thinking}`;
      body.appendChild(thinking);
    }

    el.appendChild(body);

    this.list.insertBefore(el, this.list.firstChild);
    this.history.push({ el, timestamp: Date.now() });

    // Trim old messages
    while (this.history.length > MAX_HISTORY) {
      const old = this.history.shift();
      if (old) old.el.remove();
    }

    this.ensurePulseStyle();
  }

  private makeAvatar(seat: Seat): HTMLElement {
    const avatar = document.createElement('div');
    const color = this.colorForName(seat.name);
    avatar.style.cssText = `
      flex: 0 0 36px;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: ${color};
      border: 2px solid ${PALETTE.goldTrim};
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-weight: bold;
      font-size: 15px;
    `;
    avatar.textContent = seat.name.charAt(0);
    return avatar;
  }

  private colorForName(name: string): string {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
    return `hsl(${h % 360}, 50%, 38%)`;
  }

  private ensurePulseStyle(): void {
    if (document.getElementById('tp-dialogue-style')) return;
    const style = document.createElement('style');
    style.id = 'tp-dialogue-style';
    style.textContent = `
      @keyframes tp-pulse {
        0%, 100% { opacity: 0.7; }
        50% { opacity: 1; }
      }
      @keyframes tp-slidein {
        from { transform: translateX(20px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      .tp-dots::after {
        content: '';
        animation: tp-ellipsis 1.4s infinite;
      }
      @keyframes tp-ellipsis {
        0% { content: '.'; }
        33% { content: '..'; }
        66% { content: '...'; }
      }
    `;
    document.head.appendChild(style);
  }

  clear(): void {
    this.list.innerHTML = '';
    this.history = [];
    this.thinkingEl = null;
  }

  destroy(): void {
    this.clear();
    this.root.remove();
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
