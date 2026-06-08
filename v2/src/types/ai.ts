export type MBTIType =
  | 'INTJ' | 'INTP' | 'ENTJ' | 'ENTP'
  | 'INFJ' | 'INFP' | 'ENFJ' | 'ENFP'
  | 'ISTJ' | 'ISFJ' | 'ESTJ' | 'ESFJ'
  | 'ISTP' | 'ISFP' | 'ESTP' | 'ESFP';

export type MBTIGroup = 'NT' | 'NF' | 'SJ' | 'SP';

export type CognitiveFunction = 'Ni' | 'Ne' | 'Si' | 'Se' | 'Ti' | 'Te' | 'Fi' | 'Fe';

export interface AIPersona {
  mbti: MBTIType;
  group: MBTIGroup;
  name: string;
  tagline: string;
  tightness: number;
  aggression: number;
  bluffRate: number;
  tiltFactor: number;
  temperature: number;
  cogStack: [CognitiveFunction, CognitiveFunction, CognitiveFunction, CognitiveFunction];
  bio: string;
  bluffPhilosophy: string;
  tiltTriggers: string[];
  calmTriggers: string[];
  speechStyle: string;
  catchphrases: string[];
  speechBans: string[];
  lines: Record<string, string[]>;
}

export interface AIDecision {
  action: 'fold' | 'check' | 'call' | 'raise' | 'allin';
  amount?: number;
  thinking: string;
  dialogue: string;
  emotion: 'neutral' | 'happy' | 'angry' | 'confident' | 'surprised' | 'anxious';
}

export interface LLMConfig {
  endpoint: string;
  apiKey: string;
  model: string;
  enabled: boolean;
}
