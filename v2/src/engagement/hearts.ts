import type { PlayerProfile } from '@/types/progression';

const MAX_HEARTS = 5;
const REFILL_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export function getMaxHearts(): number {
  return MAX_HEARTS;
}

export function getHearts(profile: PlayerProfile): number {
  return Math.min(MAX_HEARTS, profile.hearts + getRefilledHearts(profile));
}

function getRefilledHearts(profile: PlayerProfile): number {
  const now = Date.now();
  const elapsed = now - profile.heartsLastRefill;
  const refills = Math.floor(elapsed / REFILL_INTERVAL_MS);
  return Math.min(MAX_HEARTS - profile.hearts, refills);
}

export function getLastRefillTime(profile: PlayerProfile): number {
  const refills = getRefilledHearts(profile);
  return profile.heartsLastRefill + refills * REFILL_INTERVAL_MS;
}

export function consumeHeart(profile: PlayerProfile): PlayerProfile | null {
  const hearts = getHearts(profile);
  if (hearts <= 0) return null;

  const refills = getRefilledHearts(profile);
  const newBase = Math.min(MAX_HEARTS, profile.hearts + refills) - 1;
  const newLastRefill = profile.heartsLastRefill + refills * REFILL_INTERVAL_MS;

  return {
    ...profile,
    hearts: newBase,
    heartsLastRefill: newLastRefill,
  };
}

export function refillAllHearts(profile: PlayerProfile): PlayerProfile {
  return {
    ...profile,
    hearts: MAX_HEARTS,
    heartsLastRefill: Date.now(),
  };
}

export function getTimeUntilNextHeart(profile: PlayerProfile): number {
  const refills = getRefilledHearts(profile);
  const lastRefill = profile.heartsLastRefill + refills * REFILL_INTERVAL_MS;
  const nextAt = lastRefill + REFILL_INTERVAL_MS;
  return Math.max(0, nextAt - Date.now());
}

export function formatHeartTimer(ms: number): string {
  const minutes = Math.ceil(ms / 60000);
  return `${minutes}分钟`;
}
