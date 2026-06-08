import { NT_PERSONAS } from './nt-strategists';
import { NF_PERSONAS } from './nf-empaths';
import { SJ_PERSONAS } from './sj-traditionalists';
import { SP_PERSONAS } from './sp-improvisers';
import type { AIPersona, MBTIType } from '@/types/ai';

export const ALL_PERSONAS: AIPersona[] = [
  ...NT_PERSONAS,
  ...NF_PERSONAS,
  ...SJ_PERSONAS,
  ...SP_PERSONAS,
];

export function getPersona(type: MBTIType): AIPersona {
  const persona = ALL_PERSONAS.find(p => p.mbti === type);
  if (!persona) throw new Error(`Unknown persona: ${type}`);
  return persona;
}

export function getPersonasByGroup(group: AIPersona['group']): AIPersona[] {
  return ALL_PERSONAS.filter(p => p.group === group);
}
