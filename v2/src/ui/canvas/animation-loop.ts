export type AnimCallback = (time: number, delta: number) => void;

export class AnimationLoop {
  private running = false;
  private callbacks = new Set<AnimCallback>();
  private lastTime = 0;
  private rafId = 0;

  add(cb: AnimCallback): () => void {
    this.callbacks.add(cb);
    return () => this.callbacks.delete(cb);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.tick(this.lastTime);
  }

  stop(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  private tick = (time: number): void => {
    if (!this.running) return;
    const delta = time - this.lastTime;
    this.lastTime = time;

    for (const cb of this.callbacks) {
      cb(time, delta);
    }

    this.rafId = requestAnimationFrame(this.tick);
  };
}
