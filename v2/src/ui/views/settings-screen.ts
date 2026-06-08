import type { LLMConfig } from '@/types/ai';
import { PALETTE } from '@/ui/theme/palette';
import { soundManager } from '@/audio/sound-manager';

export class SettingsScreen {
  private container: HTMLElement;
  private onLLMConfigChange?: (config: LLMConfig) => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  setOnLLMConfigChange(cb: (config: LLMConfig) => void): void {
    this.onLLMConfigChange = cb;
  }

  private render(): void {
    this.container.innerHTML = '';
    this.container.style.position = 'relative';
    this.container.style.overflowY = 'auto';

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `max-width: 480px; margin: 0 auto; padding: 24px 20px;`;

    const header = document.createElement('h1');
    header.textContent = '设置';
    header.style.cssText = `font-size: 20px; font-weight: 700; color: ${PALETTE.textPrimary}; margin-bottom: 24px;`;
    wrapper.appendChild(header);

    // Sound toggle
    wrapper.appendChild(this.createSection('音效', [
      this.createToggle('启用音效', soundManager.isEnabled(), (on) => {
        soundManager.setEnabled(on);
      }),
    ]));

    // LLM Configuration
    wrapper.appendChild(this.createSection('AI增强 (DeepSeek V4)', [
      this.createInput('API端点', 'https://api.deepseek.com/v1/chat/completions', 'endpoint'),
      this.createInput('模型', 'deepseek-chat', 'model'),
      this.createInput('API Key', '', 'apiKey', true),
      this.createToggle('启用LLM增强', false, (on) => {
        this.saveLLMConfig(on);
      }),
    ]));

    // Game mode
    wrapper.appendChild(this.createSection('游戏模式', [
      this.createInfo('学习模式', '全辅助 + EV即时揭示 + 无限制红心'),
      this.createInfo('训练模式', '延迟辅助 + 会话报告 + 红心消耗'),
      this.createInfo('竞技模式', '零辅助 + 排名积分 + 无红心消耗'),
    ]));

    // About
    wrapper.appendChild(this.createSection('关于', [
      this.createInfo('版本', 'v2.0 Alpha'),
      this.createInfo('项目', '德州哲学家 — 概率思维训练器'),
    ]));

    this.container.appendChild(wrapper);
  }

  private createSection(title: string, items: HTMLElement[]): HTMLElement {
    const section = document.createElement('div');
    section.style.cssText = `margin-bottom: 24px;`;

    const label = document.createElement('div');
    label.textContent = title;
    label.style.cssText = `font-size: 13px; font-weight: 600; color: ${PALETTE.achievement}; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;`;
    section.appendChild(label);

    for (const item of items) {
      section.appendChild(item);
    }

    return section;
  }

  private createToggle(label: string, initial: boolean, onChange: (value: boolean) => void): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = `
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 0; border-bottom: 1px solid ${PALETTE.bgElevated};
    `;

    const text = document.createElement('span');
    text.textContent = label;
    text.style.cssText = `font-size: 14px; color: ${PALETTE.textPrimary};`;
    row.appendChild(text);

    const toggle = document.createElement('button');
    toggle.style.cssText = `
      width: 44px; height: 24px; border-radius: 12px; border: none;
      background: ${initial ? PALETTE.correct : PALETTE.bgElevated};
      position: relative; cursor: pointer; transition: background 0.2s;
    `;
    toggle.innerHTML = `<span style="
      position: absolute; top: 2px; ${initial ? 'right: 2px' : 'left: 2px'};
      width: 20px; height: 20px; border-radius: 10px; background: white;
      transition: left 0.2s, right 0.2s;
    "></span>`;

    let isOn = initial;
    toggle.addEventListener('click', () => {
      isOn = !isOn;
      toggle.style.background = isOn ? PALETTE.correct : PALETTE.bgElevated;
      const dot = toggle.querySelector('span')!;
      dot.style.left = isOn ? '' : '2px';
      dot.style.right = isOn ? '2px' : '';
      onChange(isOn);
    });

    row.appendChild(toggle);
    return row;
  }

  private createInput(label: string, placeholder: string, field: string, isPassword = false): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = `padding: 8px 0;`;

    const text = document.createElement('div');
    text.textContent = label;
    text.style.cssText = `font-size: 12px; color: ${PALETTE.textSecondary}; margin-bottom: 4px;`;
    row.appendChild(text);

    const input = document.createElement('input');
    input.type = isPassword ? 'password' : 'text';
    input.placeholder = placeholder;
    input.dataset.field = field;
    input.style.cssText = `
      width: 100%; padding: 8px 12px; border-radius: 8px;
      border: 1px solid ${PALETTE.bgElevated}; background: ${PALETTE.bgCard};
      color: ${PALETTE.textPrimary}; font-size: 13px; outline: none;
    `;
    input.addEventListener('focus', () => {
      input.style.borderColor = PALETTE.achievement;
    });
    input.addEventListener('blur', () => {
      input.style.borderColor = PALETTE.bgElevated;
    });
    row.appendChild(input);

    return row;
  }

  private createInfo(label: string, value: string): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = `
      display: flex; justify-content: space-between;
      padding: 8px 0; border-bottom: 1px solid ${PALETTE.bgElevated};
    `;
    row.innerHTML = `
      <span style="font-size: 13px; color: ${PALETTE.textSecondary};">${label}</span>
      <span style="font-size: 13px; color: ${PALETTE.textPrimary};">${value}</span>
    `;
    return row;
  }

  private saveLLMConfig(enabled: boolean): void {
    const inputs = this.container.querySelectorAll('input[data-field]');
    const config: LLMConfig = {
      endpoint: '',
      apiKey: '',
      model: '',
      enabled,
    };
    inputs.forEach(input => {
      const el = input as HTMLInputElement;
      const field = el.dataset.field;
      if (field === 'endpoint') config.endpoint = el.value;
      else if (field === 'apiKey') config.apiKey = el.value;
      else if (field === 'model') config.model = el.value;
    });
    if (config.endpoint) config.enabled = enabled;
    this.onLLMConfigChange?.(config);
  }
}
