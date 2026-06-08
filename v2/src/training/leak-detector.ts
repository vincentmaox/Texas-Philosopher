import type { DecisionRecord } from '@/types/game';
import type { LeakCategory } from '@/types/training';

export interface LeakSummary {
  categories: LeakCategory[];
  worstStreet: string;
  worstAction: string;
  overallScore: number;
}

export function analyzeLeaks(records: DecisionRecord[]): LeakSummary {
  if (records.length === 0) {
    return { categories: [], worstStreet: 'none', worstAction: 'none', overallScore: 100 };
  }

  const byStreet = new Map<string, DecisionRecord[]>();
  const byAction = new Map<string, DecisionRecord[]>();

  for (const r of records) {
    const streetList = byStreet.get(r.street) || [];
    streetList.push(r);
    byStreet.set(r.street, streetList);

    const actionList = byAction.get(r.action) || [];
    actionList.push(r);
    byAction.set(r.action, actionList);
  }

  let worstStreet = 'none';
  let worstStreetEV = 0;
  for (const [street, recs] of byStreet) {
    const avg = recs.reduce((s, r) => s + r.evDifference, 0) / recs.length;
    if (avg < worstStreetEV) {
      worstStreetEV = avg;
      worstStreet = street;
    }
  }

  let worstAction = 'none';
  let worstActionEV = 0;
  for (const [action, recs] of byAction) {
    const avg = recs.reduce((s, r) => s + r.evDifference, 0) / recs.length;
    if (avg < worstActionEV) {
      worstActionEV = avg;
      worstAction = action;
    }
  }

  const avgEVDiff = records.reduce((s, r) => s + r.evDifference, 0) / records.length;
  const score = Math.max(0, Math.min(100, 100 + avgEVDiff * 10));
  const categories = detectLeaksInline(records);

  return { categories, worstStreet, worstAction, overallScore: Math.round(score) };
}

function detectLeaksInline(records: DecisionRecord[]): LeakCategory[] {
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
