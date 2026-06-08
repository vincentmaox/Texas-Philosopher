export class SoundManager {
  private ctx: AudioContext | null = null;
  private enabled = true;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  playDeal(): void {
    if (!this.enabled) return;
    this.noise(0.06, 800, 0.15);
  }

  playChip(): void {
    if (!this.enabled) return;
    this.noise(0.04, 2000, 0.1);
  }

  playFold(): void {
    if (!this.enabled) return;
    this.tone(300, 0.1, 0.08);
  }

  playRaise(): void {
    if (!this.enabled) return;
    this.tone(600, 0.08, 0.1);
  }

  playAllIn(): void {
    if (!this.enabled) return;
    this.tone(150, 0.3, 0.15);
    setTimeout(() => this.tone(200, 0.2, 0.1), 100);
  }

  playWin(): void {
    if (!this.enabled) return;
    this.tone(523, 0.12, 0.08);
    setTimeout(() => this.tone(659, 0.12, 0.08), 120);
    setTimeout(() => this.tone(784, 0.2, 0.1), 240);
  }

  playLose(): void {
    if (!this.enabled) return;
    this.tone(200, 0.3, 0.06);
  }

  playCorrect(): void {
    if (!this.enabled) return;
    this.tone(880, 0.06, 0.08);
  }

  playError(): void {
    if (!this.enabled) return;
    this.tone(220, 0.15, 0.06);
  }

  playStreakBreak(): void {
    if (!this.enabled) return;
    this.tone(400, 0.2, 0.08);
    setTimeout(() => this.tone(300, 0.3, 0.06), 200);
  }

  private tone(freq: number, duration: number, volume: number): void {
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio not available
    }
  }

  private noise(duration: number, filterFreq: number, volume: number): void {
    try {
      const ctx = this.getCtx();
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * volume;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterFreq;
      source.connect(filter);
      filter.connect(ctx.destination);
      source.start();
    } catch {
      // Audio not available
    }
  }
}

export const soundManager = new SoundManager();
