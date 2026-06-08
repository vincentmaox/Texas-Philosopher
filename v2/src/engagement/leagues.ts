import type { LeagueTier, PlayerProfile } from '@/types/progression';

export const LEAGUE_ORDER: LeagueTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master'];

export const LEAGUE_LABELS: Record<LeagueTier, string> = {
  bronze: '青铜',
  silver: '白银',
  gold: '黄金',
  platinum: '铂金',
  diamond: '钻石',
  master: '大师',
};

export const LEAGUE_ICONS: Record<LeagueTier, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  platinum: '💎',
  diamond: '💠',
  master: '👑',
};

export const LEAGUE_COLORS: Record<LeagueTier, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
  diamond: '#B9F2FF',
  master: '#FF6B6B',
};

export interface LeagueStanding {
  rank: number;
  name: string;
  score: number;
  tier: LeagueTier;
}

export function getLeagueThresholds(tier: LeagueTier): { promote: number; demote: number } {
  const idx = LEAGUE_ORDER.indexOf(tier);
  const base = idx * 100;
  return {
    promote: base + 80,
    demote: base + 20,
  };
}

export function addLeagueScore(profile: PlayerProfile, delta: number): PlayerProfile {
  const newScore = profile.leagueScore + delta;
  const idx = LEAGUE_ORDER.indexOf(profile.league);

  // Promote
  if (newScore >= 100 && idx < LEAGUE_ORDER.length - 1) {
    return {
      ...profile,
      league: LEAGUE_ORDER[idx + 1],
      leagueScore: newScore - 100,
    };
  }

  // Demote
  if (newScore < 0 && idx > 0) {
    return {
      ...profile,
      league: LEAGUE_ORDER[idx - 1],
      leagueScore: 100 + newScore,
    };
  }

  return {
    ...profile,
    leagueScore: Math.max(0, Math.min(99, newScore)),
  };
}

export function getWeeklyScoreForAction(action: 'hand_played' | 'good_decision' | 'run_complete' | 'daily_done'): number {
  switch (action) {
    case 'hand_played': return 1;
    case 'good_decision': return 3;
    case 'run_complete': return 15;
    case 'daily_done': return 10;
  }
}

export function generateFakeLeaderboard(playerScore: number, tier: LeagueTier): LeagueStanding[] {
  const names = ['虚空旅者', '概率猎手', '筹码工匠', '哲学新手', '鱼塘之王',
    'EV信徒', '弃牌大师', '加注狂人', '读牌者', '冷酷计算',
    '温暖牧羊', '闪电快手', '深思者', '赌博诗人', '纪律执行',
    '直觉驱动', '混沌玩家', '稳如磐石', '机会主义者', '聚光明星',
    '慢热型', '激进派', '保守派', '均衡手', '数据控',
    '鱼苗', '赌徒', '观察者', '新手', '路人甲'];

  const standings: LeagueStanding[] = [];
  for (let i = 0; i < 30; i++) {
    standings.push({
      rank: i + 1,
      name: names[i],
      score: Math.round(100 - i * 3 + (Math.random() - 0.5) * 10),
      tier,
    });
  }

  // Insert player at appropriate position
  const playerRank = Math.max(1, Math.min(30, Math.round(30 - playerScore / 4)));
  standings.splice(playerRank - 1, 0, {
    rank: playerRank,
    name: '你',
    score: playerScore,
    tier,
  });

  return standings.slice(0, 31).map((s, i) => ({ ...s, rank: i + 1 }));
}
