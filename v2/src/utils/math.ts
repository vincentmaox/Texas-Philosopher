/** Number of combinations C(n, k) */
export function combinations(n: number, k: number): number {
  if (k > n) return 0;
  if (k === 0 || k === n) return 1;
  let result = 1;
  for (let i = 0; i < k; i++) {
    result = result * (n - i) / (i + 1);
  }
  return Math.round(result);
}

/** Probability of making a hand with N outs from remaining cards */
export function outsProbability(outs: number, remaining: number, streetsLeft: number): number {
  const miss1 = (remaining - outs) / remaining;
  if (streetsLeft === 1) return 1 - miss1;
  const miss2 = (remaining - outs - 1) / (remaining - 1);
  return 1 - miss1 * miss2;
}

/** Pot odds required equity to call */
export function potOddsRequired(toCall: number, pot: number): number {
  if (toCall <= 0) return 0;
  return toCall / (pot + toCall);
}

/** Expected value of a call */
export function evCall(equity: number, pot: number, toCall: number): number {
  return equity * (pot + toCall) - (1 - equity) * toCall;
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Linear interpolation */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Ease out cubic */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Ease in out cubic */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
