import type { DecisionRecord, Street, PlayerAction } from '@/types/game';
import type { FeedbackItem, AidLevel, SessionReport, LeakCategory } from '@/types/training';

export function verdictFromEV(evDiff: number): FeedbackItem['verdict'] {
  if (evDiff >= -0.3) return 'perfect';
  if (evDiff >= -1.0) return 'good';
  if (evDiff >= -2.0) return 'acceptable';
  return 'bad';
}

export function generateTakeaway(
  street: Street,
  action: PlayerAction,
  optimalAction: PlayerAction,
  evDiff: number,
  equity: number,
  potOdds: number
): string {
  if (action === optimalAction) {
    if (equity > 0.65) return '强牌价值下注，正确。';
    if (equity < 0.3) return '弱牌果断弃牌，纪律性好。';
    return '决策与最优一致。';
  }

  const streetLabel = streetLabelMap[street] || street;

  if (action === 'fold' && optimalAction !== 'fold') {
    return `${streetLabel}弃牌太保守，胜率${Math.round(equity * 100)}%足够继续。`;
  }
  if (action === 'call' && optimalAction === 'raise') {
    return `${streetLabel}应该加注而不是跟注，你的牌值得施压。`;
  }
  if (action === 'call' && optimalAction === 'fold') {
    return `${streetLabel}跟注是-EV的，底池赔率${Math.round(potOdds * 100)}%不够。`;
  }
  if (action === 'raise' && optimalAction === 'fold') {
    return `${streetLabel}加注是虚张声势，最优是弃牌。`;
  }
  if (action === 'raise' && optimalAction === 'call') {
    return `${streetLabel}加注过激，跟注更合理。`;
  }
  return `${streetLabel}偏差${evDiff.toFixed(1)}BB，注意调整。`;
}

const streetLabelMap: Record<Street, string> = {
  preflop: '翻牌前',
  flop: '翻牌圈',
  turn: '转牌圈',
  river: '河牌圈',
};

export function buildFeedbackItem(record: DecisionRecord): FeedbackItem {
  return {
    street: record.street,
    playerAction: record.action,
    playerAmount: record.amount,
    optimalAction: record.optimalAction,
    optimalAmount: record.optimalAmount,
    evDifference: record.evDifference,
    equity: record.equity,
    potOdds: record.potOdds,
    verdict: verdictFromEV(record.evDifference),
    takeaway: generateTakeaway(
      record.street, record.action, record.optimalAction,
      record.evDifference, record.equity, record.potOdds
    ),
  };
}

export function generateSessionReport(records: DecisionRecord[]): SessionReport {
  if (records.length === 0) {
    return { handsPlayed: 0, totalEVDifference: 0, leakCategories: [], strengths: [], improvements: [] };
  }

  const totalEVDiff = records.reduce((sum, r) => sum + r.evDifference, 0);
  const leaks = detectLeaks(records);
  const perfectRate = records.filter(r => r.evDifference >= -0.3).length / records.length;

  const strengths: string[] = [];
  const improvements: string[] = [];

  if (perfectRate > 0.7) strengths.push('整体决策质量高，大部分行动接近最优。');
  else if (perfectRate > 0.4) strengths.push('部分决策合理，但仍有提升空间。');

  if (leaks.length === 0) strengths.push('未检测到明显漏洞。');

  const preflopRecords = records.filter(r => r.street === 'preflop');
  const preflopGood = preflopRecords.filter(r => r.evDifference >= -0.5).length;
  if (preflopRecords.length > 0 && preflopGood / preflopRecords.length > 0.7) {
    strengths.push('翻牌前决策稳健。');
  }

  for (const leak of leaks) {
    improvements.push(`${leak.description}（出现${leak.frequency}次，严重度${leak.severity.toFixed(1)}）`);
  }

  if (improvements.length === 0) improvements.push('保持当前水准，继续训练。');

  return {
    handsPlayed: records.length,
    totalEVDifference: totalEVDiff,
    leakCategories: leaks,
    strengths,
    improvements,
  };
}

function detectLeaks(records: DecisionRecord[]): LeakCategory[] {
  const leaks: LeakCategory[] = [];

  const preflop = records.filter(r => r.street === 'preflop');
  if (preflop.length >= 3) {
    const overFold = preflop.filter(r => r.action === 'fold' && r.evDifference < -1.5);
    if (overFold.length >= 2) {
      leaks.push({
        name: '翻牌前过度弃牌',
        description: '你在翻牌前弃牌过于保守，丢失了+EV的机会',
        frequency: overFold.length,
        severity: Math.abs(overFold.reduce((s, r) => s + r.evDifference, 0)),
        example: `弃牌时EV偏差最大为${Math.abs(Math.min(...overFold.map(r => r.evDifference))).toFixed(1)}BB`,
      });
    }
  }

  const postflop = records.filter(r => r.street !== 'preflop');
  if (postflop.length >= 3) {
    const overCall = postflop.filter(r => r.action === 'call' && r.evDifference < -1.5);
    if (overCall.length >= 2) {
      leaks.push({
        name: '翻牌后过度跟注',
        description: '你在翻牌后跟注过多，面对压力时应该更多弃牌',
        frequency: overCall.length,
        severity: Math.abs(overCall.reduce((s, r) => s + r.evDifference, 0)),
        example: `最差跟注偏差${Math.abs(Math.min(...overCall.map(r => r.evDifference))).toFixed(1)}BB`,
      });
    }
  }

  const raises = records.filter(r => r.action === 'raise' || r.action === 'allin');
  if (raises.length >= 3) {
    const badRaise = raises.filter(r => r.evDifference < -2.0);
    if (badRaise.length >= 2) {
      leaks.push({
        name: '不合理加注',
        description: '你的部分加注时机不对，在不该施压时加注',
        frequency: badRaise.length,
        severity: Math.abs(badRaise.reduce((s, r) => s + r.evDifference, 0)),
        example: `最大偏差${Math.abs(Math.min(...badRaise.map(r => r.evDifference))).toFixed(1)}BB`,
      });
    }
  }

  return leaks;
}

export function shouldShowFeedback(aidLevel: AidLevel, street: Street): boolean {
  if (aidLevel === 'full') return true;
  if (aidLevel === 'delayed') return true;
  if (aidLevel === 'minimal') return true;
  return false;
}

export function shouldShowEVNumbers(aidLevel: AidLevel): boolean {
  return aidLevel === 'full' || aidLevel === 'delayed';
}

export function feedbackDelay(aidLevel: AidLevel): number {
  if (aidLevel === 'full') return 0;
  if (aidLevel === 'delayed') return 2000;
  return 0;
}
