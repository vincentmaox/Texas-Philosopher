import type { AIPersona, AIDecision } from '@/types/ai';
import type { GameState, Seat } from '@/types/game';
import { cardToString } from '@/types/card';

export interface PromptPayload {
  system: string;
  user: string;
  schema: Record<string, unknown>;
}

export function buildDecisionPrompt(persona: AIPersona, seat: Seat, state: GameState): PromptPayload {
  const toCall = state.currentBet - seat.currentBet;
  const opponents = state.seats
    .filter(s => s.id !== seat.id && !s.folded)
    .map(s => ({
      name: s.name,
      chips: s.chips,
      currentBet: s.currentBet,
      position: s.position,
      folded: s.folded,
      allIn: s.allIn,
      mbtiType: s.mbtiType,
    }));

  const system = [
    `你是德州扑克AI对手「${persona.name}」(${persona.mbti})。`,
    `人格标签：${persona.tagline}。`,
    `认知功能栈：${persona.cogStack.join(' > ')}。`,
    `牌风参数：紧度${persona.tightness}，激进度${persona.aggression}，诈唬率${persona.bluffRate}。`,
    `人物简介：${persona.bio}`,
    `诈唬哲学：${persona.bluffPhilosophy}`,
    `说话风格：${persona.speechStyle}`,
    `禁止使用这些表达：${persona.speechBans.join('、')}`,
    '你必须只输出JSON，不要输出Markdown，不要解释JSON外的内容。',
  ].join('\n');

  const user = JSON.stringify({
    task: '选择当前德州扑克行动，并给出短思考与一句牌桌台词。',
    game: {
      phase: state.phase,
      street: state.street,
      pot: state.pot,
      currentBet: state.currentBet,
      minRaise: state.minRaise,
      bigBlind: state.bigBlind,
      smallBlind: state.smallBlind,
      community: state.community.map(cardToString),
    },
    self: {
      name: seat.name,
      chips: seat.chips,
      currentBet: seat.currentBet,
      position: seat.position,
      holeCards: seat.holeCards.map(cardToString),
      toCall,
    },
    opponents,
    legalActions: legalActionsForSeat(seat, state),
    output: {
      action: 'fold | check | call | raise | allin',
      amount: 'raise/allin时给总下注额；其他行动可省略',
      thinking: '20字以内，符合人格的内心思考',
      dialogue: '20字以内，符合人格的牌桌台词',
      emotion: 'neutral | happy | angry | confident | surprised | anxious',
    },
  });

  return { system, user, schema: decisionSchema };
}

export function legalActionsForSeat(seat: Seat, state: GameState): string[] {
  const toCall = state.currentBet - seat.currentBet;
  const actions = toCall > 0 ? ['fold', 'call'] : ['check'];
  if (seat.chips > toCall && seat.chips > 0) actions.push('raise');
  if (seat.chips > 0) actions.push('allin');
  return actions;
}

export function coerceDecision(raw: Partial<AIDecision>, seat: Seat, state: GameState): AIDecision {
  const legal = legalActionsForSeat(seat, state);
  const action = raw.action && legal.includes(raw.action) ? raw.action : legal[0] as AIDecision['action'];
  const minRaise = state.currentBet + state.minRaise;
  const amount = action === 'raise'
    ? Math.min(seat.currentBet + seat.chips, Math.max(raw.amount || minRaise, minRaise))
    : action === 'allin'
      ? seat.currentBet + seat.chips
      : undefined;

  return {
    action,
    amount,
    thinking: sanitizeLine(raw.thinking, '观察局势。'),
    dialogue: sanitizeLine(raw.dialogue, '我行动。'),
    emotion: isEmotion(raw.emotion) ? raw.emotion : 'neutral',
  };
}

function sanitizeLine(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  return value.replace(/[\r\n]/g, ' ').trim().slice(0, 60) || fallback;
}

function isEmotion(value: unknown): value is AIDecision['emotion'] {
  return value === 'neutral' || value === 'happy' || value === 'angry' ||
    value === 'confident' || value === 'surprised' || value === 'anxious';
}

const decisionSchema = {
  type: 'object',
  properties: {
    action: { type: 'string', enum: ['fold', 'check', 'call', 'raise', 'allin'] },
    amount: { type: 'number' },
    thinking: { type: 'string' },
    dialogue: { type: 'string' },
    emotion: { type: 'string', enum: ['neutral', 'happy', 'angry', 'confident', 'surprised', 'anxious'] },
  },
  required: ['action', 'thinking', 'dialogue', 'emotion'],
};
