import './style.css';
import { App } from './App';
import { MapScreen } from '@/ui/views/map-screen';
import { GameScreen } from '@/ui/views/game-screen';
import { DailyScreen } from '@/ui/views/daily-screen';
import { LeagueScreen } from '@/ui/views/league-screen';
import { SettingsScreen } from '@/ui/views/settings-screen';
import type { MapNode, RunState, PlayerProfile } from '@/types/progression';
import type { Seat } from '@/types/game';
import type { LLMConfig } from '@/types/ai';
import { completeNode } from '@/progression/map-generator';
import { getBossForNode } from '@/progression/boss-encounters';
import { awardRunCompletion } from '@/progression/meta-unlocks';
import { showToast } from '@/ui/components/toast';
import {
  loadProfile, saveProfile,
  loadRun, saveRun,
  loadLLMConfig, saveLLMConfig,
} from '@/persistence/save-system';

const container = document.getElementById('app');
if (!container) throw new Error('#app not found');

const app = new App(container);

// ==================== Bootstrap (async load) ====================

let profile: PlayerProfile;
let llmConfig: LLMConfig | null;
let activeGameScreen: GameScreen | null = null;

async function bootstrap() {
  // Load persistent state
  profile = await loadProfile();
  llmConfig = await loadLLMConfig();
  const savedRun = await loadRun();

  updateHeaderStats();

  // ==================== Map Screen ====================
  const mapView = app.getViewContainer('map');
  if (mapView) {
    const mapScreen = new MapScreen(mapView);

    mapScreen.setOnNodeSelect((node: MapNode, run: RunState) => {
      app.switchView('game');
      const gameView = app.getViewContainer('game');
      if (!gameView) return;

      const seats = createSeatsForNode(node, run);
      const gameScreen = new GameScreen(gameView, 'learning');
      activeGameScreen = gameScreen;
      gameScreen.setupTable(seats, 0, node.blinds[1], node.blinds[0]);

      // Apply LLM config if available
      if (llmConfig && llmConfig.enabled) {
        gameScreen.getAIEngine().setLLMConfig(llmConfig);
      }

      const boss = getBossForNode(node);
      if (boss) {
        showToast(`Boss遭遇: ${boss.name} — ${boss.mechanicDescription}`, 'warning');
      }

      gameScreen.setOnLeaveTable(async () => {
        const finalChips = gameScreen.getHumanChips();
        const chipChange = finalChips - run.pool;

        const updatedRun = completeNode(run, node.id, chipChange);
        mapScreen.loadRun(updatedRun);
        await saveRun(updatedRun);

        gameScreen.destroy();
        activeGameScreen = null;
        app.switchView('map');

        if (chipChange > 0) {
          showToast(`+${chipChange} 筹码！`, 'success');
        } else if (chipChange < 0) {
          showToast(`${chipChange} 筹码`, 'warning');
        }

        // Award XP, save profile
        if (updatedRun.pool <= 0 || updatedRun.completedNodeIds.length >= updatedRun.floors.length * 3) {
          profile = awardRunCompletion(profile, updatedRun.floor, updatedRun.pool);
          await saveProfile(profile);
          updateHeaderStats();
        }
      });

      gameScreen.startHand();
      gameScreen.maybeAutoTutorial();
    });

    // Restore previous run or start a new one
    if (savedRun && savedRun.pool > 0) {
      mapScreen.loadRun(savedRun);
      showToast('已恢复上次进度', 'info');
    } else {
      mapScreen.startRun(profile.ascensionUnlocked);
      const newRun = mapScreen.getRun();
      if (newRun) await saveRun(newRun);
    }
  }

  // ==================== Daily Screen ====================
  const dailyView = app.getViewContainer('daily');
  if (dailyView) {
    new DailyScreen(dailyView);
  }

  // ==================== League Screen ====================
  const leagueView = app.getViewContainer('league');
  if (leagueView) {
    const leagueScreen = new LeagueScreen(leagueView);
    leagueScreen.setProfile(profile);
  }

  // ==================== Settings Screen ====================
  const settingsView = app.getViewContainer('settings');
  if (settingsView) {
    const settingsScreen = new SettingsScreen(settingsView);
    settingsScreen.setOnLLMConfigChange(async (config: LLMConfig) => {
      llmConfig = config;
      await saveLLMConfig(config);
      if (activeGameScreen && config.enabled) {
        activeGameScreen.getAIEngine().setLLMConfig(config);
      }
      showToast(config.enabled ? 'DeepSeek V4 已启用' : 'LLM 已禁用', 'success');
    });
  }
}

function updateHeaderStats() {
  const poolEl = document.getElementById('stat-pool');
  const mindEl = document.getElementById('stat-mind');
  const streakEl = document.getElementById('stat-streak');
  const levelEl = document.getElementById('level-badge');

  if (poolEl) poolEl.textContent = `💰 ${profile.xp}`;
  if (mindEl) mindEl.textContent = `🧠 ${profile.totalHandsPlayed}`;
  if (streakEl) streakEl.textContent = `🔥 ${profile.streak}`;
  if (levelEl) levelEl.textContent = `Lv.${profile.level} ${levelLabel(profile.level)}`;
}

function levelLabel(level: number): string {
  if (level <= 3) return '鱼苗';
  if (level <= 7) return '学徒';
  if (level <= 12) return '熟手';
  if (level <= 18) return '高手';
  if (level <= 25) return '宗师';
  return '哲学家';
}

bootstrap().catch(err => {
  console.error('Bootstrap failed:', err);
  showToast(`启动失败: ${err.message}`, 'error');
});

// Dev marker
console.log('%c♠ 德州哲学家 v2 %c已启动', 'color: #c9a227; font-size: 16px; font-weight: bold', 'color: #48BB78');

function createSeatsForNode(node: MapNode, run: RunState): Seat[] {
  const seats: Seat[] = [
    {
      id: 'p1', isHuman: true, name: '你', chips: run.pool,
      holeCards: [], currentBet: 0, totalBetThisHand: 0,
      folded: false, allIn: false, actedThisRound: false, position: 'BTN' as const,
    },
  ];

  const personaNames: Record<string, string> = {
    INTJ: '棋局设计师', INTP: '薛定谔的赌徒', ENTJ: '牌桌指挥官', ENTP: '苏格拉底的陷阱',
    INFJ: '镜中预言者', INFP: '月光下的堂吉诃德', ENFJ: '温暖牧羊人', ENFP: '烟花赌徒',
    ISTJ: '铁律执行者', ISFJ: '守财灯塔', ESTJ: '标准化将军', ESFJ: '和气生财',
    ISTP: '拆牌师', ISFP: '牌面诗人', ESTP: '闪电猎手', ESFP: '聚光灯',
  };

  const positions: Array<'SB' | 'BB' | 'UTG' | 'MP' | 'CO'> = ['SB', 'BB', 'UTG', 'MP', 'CO'];
  for (let i = 0; i < node.opponentTypes.length; i++) {
    const mbti = node.opponentTypes[i];
    seats.push({
      id: `ai${i + 1}`,
      isHuman: false,
      name: personaNames[mbti] || mbti,
      chips: node.buyIn * 20,
      holeCards: [],
      currentBet: 0,
      totalBetThisHand: 0,
      folded: false,
      allIn: false,
      actedThisRound: false,
      position: positions[i % positions.length] as 'SB' | 'BB' | 'UTG' | 'MP' | 'CO',
      mbtiType: mbti,
    });
  }

  return seats;
}
