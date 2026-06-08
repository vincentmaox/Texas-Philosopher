import type { AidLevel, PlayerSkillLevel } from '@/types/training';
import { aidLevelFromSkill } from '@/types/training';

export class AidController {
  private level: AidLevel;
  private revealCount = 0;
  private readonly REVEALS_BEFORE_DOWNGRADE = 30;
  private readonly REVEALS_BEFORE_UPGRADE = 50;

  constructor(skillLevel: PlayerSkillLevel = 1) {
    this.level = aidLevelFromSkill(skillLevel);
  }

  getAidLevel(): AidLevel {
    return this.level;
  }

  recordReveal(): void {
    this.revealCount++;

    if (this.level === 'full' && this.revealCount >= this.REVEALS_BEFORE_DOWNGRADE) {
      this.level = 'delayed';
      this.revealCount = 0;
    } else if (this.level === 'delayed' && this.revealCount >= this.REVEALS_BEFORE_DOWNGRADE) {
      this.level = 'minimal';
      this.revealCount = 0;
    } else if (this.level === 'minimal' && this.revealCount >= this.REVEALS_BEFORE_UPGRADE) {
      this.level = 'none';
      this.revealCount = 0;
    }
  }

  forceLevel(level: AidLevel): void {
    this.level = level;
    this.revealCount = 0;
  }

  showEVNumbers(): boolean {
    return this.level === 'full' || this.level === 'delayed';
  }

  showVerdictOnly(): boolean {
    return this.level === 'minimal';
  }

  feedbackDelay(): number {
    if (this.level === 'delayed') return 2000;
    return 0;
  }

  shouldShowPostHand(): boolean {
    return this.level !== 'none';
  }
}
