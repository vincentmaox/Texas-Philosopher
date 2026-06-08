import type { AIDecision, AIPersona } from '@/types/ai';
import type { GameState, PlayerAction, Seat } from '@/types/game';
import { calculateEV } from '@/engine/ev-calc';
import { RANK_VALUE } from '@/types/card';

export function decideByRules(persona: AIPersona, seat: Seat, state: GameState): AIDecision {
  switch (persona.group) {
    case 'NT': return decideNT(persona, seat, state);
    case 'NF': return decideNF(persona, seat, state);
    case 'SJ': return decideSJ(persona, seat, state);
    case 'SP': return decideSP(persona, seat, state);
  }
}

function decideNT(persona: AIPersona, seat: Seat, state: GameState): AIDecision {
  const ev = calculateEV(seat.holeCards, state.community, state.pot, toCall(seat, state), seat.chips, state.bigBlind);
  const action = ev.optimal.action;
  return withPersonaLine(persona, action, {
    action,
    amount: action === 'raise' || action === 'allin' ? ev.optimal.amount : undefined,
    thinking: `EV=${ev.optimal.ev.toFixed(1)}BB，执行最优。`,
    dialogue: lineForAction(persona, action),
    emotion: ev.optimal.ev > 1 ? 'confident' : 'neutral',
  });
}

function decideNF(persona: AIPersona, seat: Seat, state: GameState): AIDecision {
  const pressure = tablePressure(state);
  const strength = handTexture(seat);
  const call = toCall(seat, state);
  let action: PlayerAction = call > 0 ? 'call' : 'check';

  if (strength < persona.tightness && call > 0) action = 'fold';
  if (pressure > 0.65 && Math.random() < persona.bluffRate) action = seat.chips > state.minRaise ? 'raise' : 'allin';
  if (strength > 0.72 && Math.random() < persona.aggression) action = seat.chips > state.minRaise ? 'raise' : 'allin';

  return withPersonaLine(persona, action, {
    action,
    amount: raiseAmount(action, seat, state, persona.aggression),
    thinking: pressure > 0.6 ? '他们在害怕，我能感觉到。' : '先读人，再行动。',
    dialogue: lineForAction(persona, action),
    emotion: pressure > 0.7 ? 'confident' : 'anxious',
  });
}

function decideSJ(persona: AIPersona, seat: Seat, state: GameState): AIDecision {
  const strength = handTexture(seat);
  const call = toCall(seat, state);
  let action: PlayerAction;

  if (call > 0 && strength < persona.tightness) action = 'fold';
  else if (call === 0 && strength < 0.78) action = 'check';
  else if (strength > 0.82 && Math.random() < persona.aggression) action = 'raise';
  else action = call > 0 ? 'call' : 'check';

  if (Math.random() < persona.bluffRate && call === 0 && seat.chips > state.bigBlind * 4) action = 'raise';

  return withPersonaLine(persona, action, {
    action,
    amount: raiseAmount(action, seat, state, persona.aggression * 0.7),
    thinking: '按表格执行，不偏离。',
    dialogue: lineForAction(persona, action),
    emotion: action === 'fold' ? 'neutral' : 'confident',
  });
}

function decideSP(persona: AIPersona, seat: Seat, state: GameState): AIDecision {
  const strength = handTexture(seat);
  const call = toCall(seat, state);
  const opportunity = immediateOpportunity(seat, state);
  let action: PlayerAction = call > 0 ? 'call' : 'check';

  if (strength + opportunity < persona.tightness && call > 0) action = 'fold';
  if (strength > 0.65 || opportunity > 0.45 || Math.random() < persona.bluffRate) {
    action = seat.chips <= state.bigBlind * 8 && persona.aggression > 0.75 ? 'allin' : 'raise';
  }
  if (call > seat.chips * 0.35 && strength < 0.72) action = Math.random() < persona.aggression ? 'allin' : 'fold';

  return withPersonaLine(persona, action, {
    action,
    amount: raiseAmount(action, seat, state, persona.aggression),
    thinking: opportunity > 0.5 ? '机会出现，立刻出手。' : '看见空档就打。',
    dialogue: lineForAction(persona, action),
    emotion: action === 'raise' || action === 'allin' ? 'confident' : 'neutral',
  });
}

function withPersonaLine(persona: AIPersona, action: PlayerAction, decision: AIDecision): AIDecision {
  return { ...decision, dialogue: lineForAction(persona, action) || decision.dialogue };
}

function lineForAction(persona: AIPersona, action: PlayerAction): string {
  const key = action === 'raise' || action === 'allin' ? 'onBluff' : action === 'fold' ? 'onPlayerFold' : 'onPlayerCall';
  const lines = persona.lines[key] || persona.catchphrases;
  return lines[Math.floor(Math.random() * lines.length)];
}

function toCall(seat: Seat, state: GameState): number {
  return Math.max(0, state.currentBet - seat.currentBet);
}

function raiseAmount(action: PlayerAction, seat: Seat, state: GameState, aggression: number): number | undefined {
  if (action === 'allin') return seat.currentBet + seat.chips;
  if (action !== 'raise') return undefined;
  const min = state.currentBet + state.minRaise;
  const target = Math.max(min, state.currentBet + Math.round(state.pot * (0.45 + aggression * 0.6)));
  return Math.min(seat.currentBet + seat.chips, target);
}

function handTexture(seat: Seat): number {
  const [a, b] = seat.holeCards;
  if (!a || !b) return 0.3;
  const high = Math.max(RANK_VALUE[a.rank], RANK_VALUE[b.rank]);
  const low = Math.min(RANK_VALUE[a.rank], RANK_VALUE[b.rank]);
  const pair = a.rank === b.rank ? 0.28 : 0;
  const suited = a.suit === b.suit ? 0.08 : 0;
  const connected = Math.abs(RANK_VALUE[a.rank] - RANK_VALUE[b.rank]) <= 2 ? 0.08 : 0;
  return Math.min(1, high / 18 + low / 28 + pair + suited + connected);
}

function tablePressure(state: GameState): number {
  const active = state.seats.filter(s => !s.folded).length || 1;
  const committed = state.seats.reduce((sum, s) => sum + s.currentBet, 0);
  return Math.min(1, committed / Math.max(state.bigBlind, active * state.bigBlind * 4));
}

function immediateOpportunity(seat: Seat, state: GameState): number {
  const latePosition = seat.position === 'BTN' || seat.position === 'CO' ? 0.25 : 0;
  const checkedTo = state.currentBet === 0 ? 0.25 : 0;
  const shortTable = state.seats.filter(s => !s.folded).length <= 3 ? 0.15 : 0;
  return latePosition + checkedTo + shortTable;
}
