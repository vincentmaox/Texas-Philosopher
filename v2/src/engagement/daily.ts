import type { PlayerProfile } from '@/types/progression';

export interface DailyTask {
  id: string;
  description: string;
  target: number;
  progress: number;
  reward: number;
  type: 'hands' | 'good_decisions' | 'folds' | 'wins' | 'bluffs';
}

export interface DailyState {
  date: string;
  tasks: DailyTask[];
  dailyHand: DailyHand | null;
  completed: boolean;
}

export interface DailyHand {
  holeCards: [string, string];
  position: string;
  potSize: number;
  toCall: number;
  community: string[];
  correctAction: string;
  explanation: string;
}

export function generateDailyTasks(): DailyTask[] {
  const templates: Omit<DailyTask, 'progress'>[] = [
    { id: 'd1', description: '打5手牌', target: 5, reward: 15, type: 'hands' },
    { id: 'd2', description: '做出3个正确决策（EV偏差<0.5BB）', target: 3, reward: 20, type: 'good_decisions' },
    { id: 'd3', description: '正确弃牌2次', target: 2, reward: 10, type: 'folds' },
  ];

  return templates.map(t => ({ ...t, progress: 0 }));
}

export function generateDailyHand(): DailyHand {
  const hands: DailyHand[] = [
    {
      holeCards: ['A♠', 'K♠'],
      position: 'BTN',
      potSize: 30,
      toCall: 10,
      community: ['Q♠', '7♥', '2♦'],
      correctAction: 'raise',
      explanation: 'AKs在Q高牌面有超强equity，加注获取价值。',
    },
    {
      holeCards: ['7♦', '2♣'],
      position: 'UTG',
      potSize: 20,
      toCall: 10,
      community: ['A♠', 'K♥', 'Q♦'],
      correctAction: 'fold',
      explanation: '72o面对AKQ牌面毫无胜算，弃牌省筹码。',
    },
    {
      holeCards: ['J♥', 'T♥'],
      position: 'CO',
      potSize: 40,
      toCall: 15,
      community: ['9♥', '8♠', '2♣'],
      correctAction: 'raise',
      explanation: 'JT在982牌面是顺子听牌+后门同花，加注半诈唬。',
    },
    {
      holeCards: ['A♣', '5♣'],
      position: 'BB',
      potSize: 30,
      toCall: 10,
      community: ['K♠', '7♣', '3♣'],
      correctAction: 'call',
      explanation: 'A5s在后门坚果同花听牌+overcard，跟注看转牌。',
    },
  ];

  return hands[Math.floor(Math.random() * hands.length)];
}

export function createDailyState(): DailyState {
  return {
    date: new Date().toISOString().slice(0, 10),
    tasks: generateDailyTasks(),
    dailyHand: generateDailyHand(),
    completed: false,
  };
}

export function updateTaskProgress(state: DailyState, type: DailyTask['type'], amount: number = 1): DailyState {
  const tasks = state.tasks.map(t =>
    t.type === type ? { ...t, progress: Math.min(t.target, t.progress + amount) } : t
  );
  const completed = tasks.every(t => t.progress >= t.target);
  return { ...state, tasks, completed };
}

export function getDailyReward(state: DailyState): number {
  return state.tasks
    .filter(t => t.progress >= t.target)
    .reduce((sum, t) => sum + t.reward, 0);
}
