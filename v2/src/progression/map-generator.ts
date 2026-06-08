import type { MapNode, MapFloor, MapNodeType, RunState, AscensionLevel } from '@/types/progression';
import { getAscensionConfig } from './ascension';
import { ALL_PERSONAS } from '@/ai/personas';

const FLOOR_STRUCTURE: FloorTemplate[] = [
  { floor: 1, nodes: [{ type: 'fish_pond', count: 3 }, { type: 'harbor', count: 1 }] },
  { floor: 2, nodes: [{ type: 'fish_pond', count: 2 }, { type: 'elite_pond', count: 1 }, { type: 'harbor', count: 1 }] },
  { floor: 3, nodes: [{ type: 'boss', count: 1 }] },
  { floor: 4, nodes: [{ type: 'fish_pond', count: 2 }, { type: 'elite_pond', count: 1 }, { type: 'harbor', count: 1 }, { type: 'treasure', count: 1 }] },
  { floor: 5, nodes: [{ type: 'boss', count: 1 }] },
];

interface FloorTemplate {
  floor: number;
  nodes: { type: MapNodeType; count: number }[];
}

const NODE_LABELS: Record<MapNodeType, string> = {
  fish_pond: '鱼塘',
  elite_pond: '精英鱼塘',
  boss: 'Boss遭遇',
  harbor: '港口',
  treasure: '宝藏',
};

const NODE_DESCRIPTIONS: Record<MapNodeType, string> = {
  fish_pond: '松散对手，低买入。适合积累筹码。',
  elite_pond: '强力对手，高奖金。需要真功夫。',
  boss: '特殊Boss，独特机制。击败解锁飞升。',
  harbor: '休息点。可以交换哲学工具或恢复资源。',
  treasure: '获得一件随机哲学工具。',
};

export function generateMap(ascension: AscensionLevel): MapFloor[] {
  const config = getAscensionConfig(ascension);
  const floors: MapFloor[] = [];
  let nodeCounter = 0;

  for (const template of FLOOR_STRUCTURE) {
    const nodes: MapNode[] = [];

    for (const slot of template.nodes) {
      for (let i = 0; i < slot.count; i++) {
        const id = `node_${++nodeCounter}`;
        const buyIn = buyInFor(slot.type, template.floor);
        const blinds = blindsFor(slot.type, template.floor);
        const opponents = pickOpponents(slot.type, template.floor);
        const mutationCount = mutationCountFor(slot.type, ascension);
        const densityEstimate = densityFor(slot.type, config.mapDensity);

        nodes.push({
          id,
          type: slot.type,
          floor: template.floor,
          label: `${NODE_LABELS[slot.type]} ${i + 1 > 1 ? i + 1 : ''}`.trim(),
          description: NODE_DESCRIPTIONS[slot.type],
          buyIn,
          blinds,
          opponentTypes: opponents,
          mutationCount,
          densityEstimate,
          completed: false,
          connections: [],
        });
      }
    }

    // Connect nodes to next floor
    if (floors.length > 0) {
      const prevNodes = floors[floors.length - 1].nodes;
      for (const node of nodes) {
        // Each node connects to 1-2 nodes from previous floor
        const connectedFrom = pickConnections(prevNodes, 1 + Math.floor(Math.random() * 2));
        for (const prev of connectedFrom) {
          prev.connections.push(node.id);
        }
      }
    }

    floors.push({ floor: template.floor, nodes });
  }

  return floors;
}

export function createNewRun(ascension: AscensionLevel): RunState {
  const config = getAscensionConfig(ascension);
  const floors = generateMap(ascension);
  const firstNode = floors[0].nodes[0];

  return {
    floor: 1,
    currentNodeId: firstNode.id,
    completedNodeIds: [],
    floors,
    tools: [],
    toolSlots: config.toolSlots,
    ascension,
    pool: config.startingChips,
    time: 300,
    mind: 0,
  };
}

export function getNodeById(run: RunState, nodeId: string): MapNode | null {
  for (const floor of run.floors) {
    const node = floor.nodes.find(n => n.id === nodeId);
    if (node) return node;
  }
  return null;
}

export function getAvailableNodes(run: RunState): MapNode[] {
  if (run.completedNodeIds.length === 0) {
    return run.floors[0].nodes;
  }
  const available: MapNode[] = [];
  const completed = new Set(run.completedNodeIds);
  for (const floor of run.floors) {
    for (const node of floor.nodes) {
      if (completed.has(node.id)) continue;
      const isConnected = floor.floor === 1 ||
        node.connections.some(c => completed.has(c)) ||
        floor.nodes.some(n => completed.has(n.id) && n.connections.includes(node.id));
      if (isConnected) available.push(node);
    }
  }
  return available;
}

export function completeNode(run: RunState, nodeId: string, chipChange: number): RunState {
  const node = getNodeById(run, nodeId);
  if (!node) return run;

  const completedIds = [...run.completedNodeIds, nodeId];
  const nextFloor = run.floor + (node.type === 'boss' ? 1 : 0);

  return {
    ...run,
    currentNodeId: nodeId,
    completedNodeIds: completedIds,
    floor: nextFloor,
    pool: run.pool + chipChange,
  };
}

export function isRunComplete(run: RunState): boolean {
  const lastFloor = run.floors[run.floors.length - 1];
  const bossNode = lastFloor.nodes.find(n => n.type === 'boss');
  return bossNode ? run.completedNodeIds.includes(bossNode.id) : false;
}

export function isRunDead(run: RunState): boolean {
  return run.pool <= 0;
}

function buyInFor(type: MapNodeType, floor: number): number {
  const base = type === 'fish_pond' ? 20 : type === 'elite_pond' ? 50 : type === 'boss' ? 100 : 0;
  return Math.round(base * (1 + (floor - 1) * 0.3));
}

function blindsFor(type: MapNodeType, floor: number): [number, number] {
  const bb = type === 'fish_pond' ? 10 : type === 'elite_pond' ? 20 : type === 'boss' ? 25 : 10;
  const scaled = Math.round(bb * (1 + (floor - 1) * 0.25));
  return [Math.round(scaled / 2), scaled];
}

function pickOpponents(type: MapNodeType, _floor: number): string[] {
  const pool = ALL_PERSONAS.map(p => p.mbti);
  if (type === 'fish_pond') {
    const easy = pool.filter(t => ['ISFJ', 'ESFJ', 'ISFP', 'INFP'].includes(t));
    return shufflePick(easy, 2 + Math.floor(Math.random() * 2));
  }
  if (type === 'elite_pond') {
    const med = pool.filter(t => ['INTJ', 'ENTJ', 'INFJ', 'ISTP', 'ESTJ'].includes(t));
    return shufflePick(med, 2 + Math.floor(Math.random() * 2));
  }
  if (type === 'boss') {
    return ['INTJ', 'ENTP'];
  }
  return [];
}

function mutationCountFor(type: MapNodeType, ascension: AscensionLevel): number {
  if (type === 'harbor' || type === 'treasure') return 0;
  const base = type === 'boss' ? 3 : type === 'elite_pond' ? 2 : 1;
  return base + Math.floor((ascension - 1) / 5);
}

function densityFor(type: MapNodeType, mapDensity: number): number {
  const base = type === 'fish_pond' ? 0.3 : type === 'elite_pond' ? 0.5 : type === 'boss' ? 0.8 : 0;
  const noise = (Math.random() - 0.5) * 0.2;
  return Math.min(1, Math.max(0, base + mapDensity * 0.3 + noise));
}

function pickConnections(nodes: MapNode[], count: number): MapNode[] {
  const shuffled = [...nodes].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function shufflePick(arr: string[], count: number): string[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
