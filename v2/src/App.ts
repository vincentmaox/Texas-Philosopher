import { PALETTE } from '@/ui/theme/palette';

export type ViewName = 'map' | 'game' | 'daily' | 'league' | 'settings';

export class App {
  private currentView: ViewName = 'map';
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div id="app-shell" class="h-screen flex flex-col" style="background: ${PALETTE.bgDeep}">
        <header id="app-header" class="flex items-center justify-between px-4 py-2 border-b"
                style="background: ${PALETTE.bgMid}; border-color: ${PALETTE.bgElevated}">
          <div class="flex items-center gap-3">
            <span class="text-lg font-bold" style="color: ${PALETTE.goldTrim}">♠ 德州哲学家</span>
            <span id="level-badge" class="px-2 py-0.5 rounded text-xs font-bold"
                  style="background: ${PALETTE.bgElevated}; color: ${PALETTE.achievement}">Lv.1 鱼苗</span>
          </div>
          <div class="flex items-center gap-4 text-sm" style="color: ${PALETTE.textSecondary}">
            <span id="stat-pool">💰 1000</span>
            <span id="stat-time">⏱ 30</span>
            <span id="stat-mind">🧠 0</span>
            <span id="stat-streak">🔥 0</span>
          </div>
          <nav class="flex gap-2">
            <button class="nav-btn active" data-view="map">🗺️ 地图</button>
            <button class="nav-btn" data-view="daily">📅 每日</button>
            <button class="nav-btn" data-view="league">🏆 联赛</button>
            <button class="nav-btn" data-view="settings">⚙️ 设置</button>
          </nav>
        </header>
        <main id="app-main" class="flex-1 overflow-hidden relative">
          <div id="view-map" class="view active"></div>
          <div id="view-game" class="view"></div>
          <div id="view-daily" class="view"></div>
          <div id="view-league" class="view"></div>
          <div id="view-settings" class="view"></div>
        </main>
      </div>
    `;

    this.bindNav();
  }

  private bindNav(): void {
    const buttons = this.container.querySelectorAll('.nav-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const view = (btn as HTMLElement).dataset.view as ViewName;
        this.switchView(view);
      });
    });
  }

  switchView(name: ViewName): void {
    this.currentView = name;
    const views = this.container.querySelectorAll('.view');
    views.forEach(v => v.classList.remove('active'));
    const target = this.container.querySelector(`#view-${name}`);
    if (target) target.classList.add('active');

    const buttons = this.container.querySelectorAll('.nav-btn');
    buttons.forEach(b => {
      b.classList.toggle('active', (b as HTMLElement).dataset.view === name);
    });
  }

  getViewContainer(name: ViewName): HTMLElement | null {
    return this.container.querySelector(`#view-${name}`);
  }
}
