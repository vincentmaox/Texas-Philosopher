import type { AIDecision, LLMConfig, MBTIType } from '@/types/ai';
import type { GameState, Seat } from '@/types/game';
import { getPersona } from './personas';
import { DeepSeekClient } from './deepseek-client';
import { decideByRules } from './rule-fallback';

export class AIDecisionEngine {
  private deepseek?: DeepSeekClient;

  constructor(config?: LLMConfig) {
    if (config) this.deepseek = new DeepSeekClient(config);
  }

  setLLMConfig(config: LLMConfig): void {
    this.deepseek = new DeepSeekClient(config);
  }

  async decide(seat: Seat, state: GameState): Promise<AIDecision> {
    const persona = getPersona((seat.mbtiType || 'INTJ') as MBTIType);
    const fallback = decideByRules(persona, seat, state);

    const llmDecision = await this.deepseek?.decide(persona, seat, state);
    return llmDecision || fallback;
  }
}

export function createAIDecisionEngine(config?: LLMConfig): AIDecisionEngine {
  return new AIDecisionEngine(config);
}
