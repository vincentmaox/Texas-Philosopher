type Listener = () => void;

export class Store<T extends object> {
  private state: T;
  private listeners = new Set<Listener>();

  constructor(initial: T) {
    this.state = initial;
  }

  get(): T {
    return this.state;
  }

  set(partial: Partial<T>): void {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  update(fn: (state: T) => Partial<T>): void {
    this.set(fn(this.state));
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }
}
