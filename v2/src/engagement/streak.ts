import type { PlayerProfile } from '@/types/progression';

const STREAK_MILESTONES = [3, 10, 30, 100, 365];

export function getStreakDays(profile: PlayerProfile): number {
  const today = new Date().toISOString().slice(0, 10);
  const last = profile.streakLastDate;

  if (last === today) return profile.streak;

  const lastDate = new Date(last);
  const todayDate = new Date(today);
  const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return profile.streak;
  if (diffDays === 2 && profile.streakFreeze) return profile.streak;
  return 0;
}

export function recordDailyPlay(profile: PlayerProfile): PlayerProfile {
  const today = new Date().toISOString().slice(0, 10);
  const currentStreak = getStreakDays(profile);

  if (profile.streakLastDate === today) return profile;

  return {
    ...profile,
    streak: currentStreak + 1,
    streakLastDate: today,
    streakFreeze: false,
  };
}

export function useStreakFreeze(profile: PlayerProfile): PlayerProfile {
  if (profile.streakFreeze) return profile;
  return { ...profile, streakFreeze: true };
}

export function getNextMilestone(streak: number): number {
  for (const m of STREAK_MILESTONES) {
    if (streak < m) return m;
  }
  return STREAK_MILESTONES[STREAK_MILESTONES.length - 1] * 2;
}

export function getStreakLabel(streak: number): string {
  if (streak === 0) return '无连胜';
  if (streak < 3) return `${streak}天连胜`;
  if (streak < 10) return `${streak}天连胜 🔥`;
  if (streak < 30) return `${streak}天连焰 🔥🔥`;
  if (streak < 100) return `${streak}天烈焰 🔥🔥🔥`;
  return `${streak}天永恒之焰 🔥🔥🔥🔥`;
}

export function isStreakAtRisk(profile: PlayerProfile): boolean {
  const streak = getStreakDays(profile);
  if (streak < 3) return false;

  const last = new Date(profile.streakLastDate);
  const now = new Date();
  const hoursSinceLast = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
  return hoursSinceLast > 20 && !profile.streakFreeze;
}
