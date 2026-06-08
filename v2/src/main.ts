import './style.css';
import { App } from './App';
import { GameScreen } from '@/ui/views/game-screen';

const container = document.getElementById('app');
if (!container) throw new Error('#app not found');

const app = new App(container);

// Dev: add quick test button to map view
const mapView = app.getViewContainer('map');
if (mapView) {
  mapView.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full gap-4">
      <h1 style="font-size: 24px; font-weight: bold; color: #c9a227;"
        >🗺️ 地图系统 (开发中)</h1>
      <p style="color: #718096;">Phase 1: 核心扑克引擎测试</p>
      <button id="btn-test-game"
        style="padding: 12px 24px; border-radius: 10px; border: 2px solid #c9a227;
               background: #c9a22722; color: #c9a227; font-weight: bold;
               font-size: 16px; cursor: pointer;"
      >▶ 开始测试牌局 (2人桌)</button>
    </div>
  `;

  mapView.querySelector('#btn-test-game')?.addEventListener('click', () => {
    app.switchView('game');
    const gameView = app.getViewContainer('game');
    if (!gameView) return;

    const screen = new GameScreen(gameView, 'learning');
    screen.setupTable([
      { id: 'p1', isHuman: true, name: '你', chips: 1000, holeCards: [], currentBet: 0, totalBetThisHand: 0, folded: false, allIn: false, actedThisRound: false, position: 'BTN' },
      { id: 'ai1', isHuman: false, name: 'AI 测试', chips: 1000, holeCards: [], currentBet: 0, totalBetThisHand: 0, folded: false, allIn: false, actedThisRound: false, position: 'BB' },
    ], 0, 10, 5);

    screen.setOnLeaveTable(() => {
      screen.destroy();
      app.switchView('map');
    });

    screen.startHand();
  });
}

// Dev marker
console.log('%c♠ 德州哲学家 v2 %c已启动', 'color: #c9a227; font-size: 16px; font-weight: bold', 'color: #48BB78');
