import type { AIDecision, AIPersona, LLMConfig } from '@/types/ai';
import type { GameState, Seat } from '@/types/game';
import { buildDecisionPrompt, coerceDecision } from './prompt-builder';

interface ChatResponse {
  choices?: { message?: { content?: string } }[];
}

export class DeepSeekClient {
  constructor(private config: LLMConfig) {}

  isEnabled(): boolean {
    return Boolean(this.config.enabled && this.config.endpoint && this.config.apiKey && this.config.model);
  }

  async decide(persona: AIPersona, seat: Seat, state: GameState): Promise<AIDecision | null> {
    if (!this.isEnabled()) return null;

    const prompt = buildDecisionPrompt(persona, seat, state);
    const res = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        temperature: persona.temperature,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
      }),
    });

    if (!res.ok) return null;
    const data = await res.json() as ChatResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    try {
      return coerceDecision(JSON.parse(content), seat, state);
    } catch {
      return null;
    }
  }
}
