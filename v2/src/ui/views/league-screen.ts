import type { LeagueTier, PlayerProfile } from '@/types/progression';
import { LEAGUE_LABELS, LEAGUE_ICONS, LEAGUE_COLORS, generateFakeLeaderboard } from '@/engagement/leagues';
import { PALETTE } from '@/ui/theme/palette';

export class LeagueScreen {
  private container: HTMLElement;
  private profile: PlayerProfile | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  setProfile(profile: PlayerProfile): void {
    this.profile = profile;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = '';
    this.container.style.position = 'relative';
    this.container.style.overflowY = 'auto';

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `max-width: 480px; margin: 0 auto; padding: 24px 20px;`;

    const tier = this.profile?.league || 'bronze';
    const score = this.profile?.leagueScore || 0;
    const icon = LEAGUE_ICONS[tier];
    const label = LEAGUE_LABELS[tier];
    const color = LEAGUE_COLORS[tier];

    // Header
    const header = document.createElement('div');
    header.style.cssText = `text-align: center; margin-bottom: 24px;`;
    header.innerHTML = `
      <div style="font-size: 48px;">${icon}</div>
      <div style="font-size: 20px; font-weight: 700; color: ${color}; margin-top: 8px;">${label}联赛</div>
      <div style="font-size: 13px; color: ${PALETTE.textSecondary}; margin-top: 4px;">
        联赛积分: ${score}/100
      </div>
      <div style="margin-top: 8px; height: 6px; border-radius: 3px; background: ${PALETTE.bgElevated}; max-width: 200px; margin-left: auto; margin-right: auto; overflow: hidden;">
        <div style="height: 100%; width: ${score}%; background: ${color}; border-radius: 3px;"></div>
      </div>
    `;
    wrapper.appendChild(header);

    // League tiers
    const tiersDiv = document.createElement('div');
    tiersDiv.style.cssText = `display: flex; justify-content: center; gap: 8px; margin-bottom: 24px; flex-wrap: wrap;`;
    for (const t of ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master'] as LeagueTier[]) {
      const chip = document.createElement('span');
      const isActive = t === tier;
      chip.style.cssText = `
        padding: 4px 10px; border-radius: 6px; font-size: 12px;
        background: ${isActive ? LEAGUE_COLORS[t] + '33' : PALETTE.bgCard};
        border: 1px solid ${isActive ? LEAGUE_COLORS[t] : PALETTE.bgElevated};
        color: ${isActive ? LEAGUE_COLORS[t] : PALETTE.textDim};
        font-weight: ${isActive ? '600' : '400'};
      `;
      chip.textContent = `${LEAGUE_ICONS[t]} ${LEAGUE_LABELS[t]}`;
      tiersDiv.appendChild(chip);
    }
    wrapper.appendChild(tiersDiv);

    // Leaderboard
    const board = generateFakeLeaderboard(score, tier);
    const boardHeader = document.createElement('h2');
    boardHeader.textContent = '本周排名';
    boardHeader.style.cssText = `font-size: 16px; font-weight: 600; color: ${PALETTE.textPrimary}; margin-bottom: 12px;`;
    wrapper.appendChild(boardHeader);

    for (const entry of board.slice(0, 10)) {
      const row = document.createElement('div');
      const isPlayer = entry.name === '你';
      row.style.cssText = `
        display: flex; align-items: center; gap: 12px;
        padding: 8px 12px; margin-bottom: 4px; border-radius: 8px;
        background: ${isPlayer ? PALETTE.achievement + '22' : PALETTE.bgCard};
        border: 1px solid ${isPlayer ? PALETTE.achievement + '44' : 'transparent'};
      `;

      const rankColor = entry.rank <= 3 ? PALETTE.achievement : PALETTE.textSecondary;
      row.innerHTML = `
        <span style="font-size: 14px; font-weight: 700; color: ${rankColor}; min-width: 24px;">${entry.rank}</span>
        <span style="font-size: 13px; color: ${isPlayer ? PALETTE.achievement : PALETTE.textPrimary}; flex: 1;">${entry.name}</span>
        <span style="font-size: 13px; color: ${PALETTE.textSecondary};">${entry.score}分</span>
      `;
      wrapper.appendChild(row);
    }

    // Demotion warning
    const demoteDiv = document.createElement('div');
    demoteDiv.style.cssText = `
      margin-top: 16px; padding: 10px 16px; border-radius: 8px;
      background: ${PALETTE.bad}11; border: 1px solid ${PALETTE.bad}33;
      font-size: 12px; color: ${PALETTE.textSecondary};
    `;
    demoteDiv.textContent = '每周日后5名降级，前10名晋级。保持活跃！';
    wrapper.appendChild(demoteDiv);

    this.container.appendChild(wrapper);
  }
}
