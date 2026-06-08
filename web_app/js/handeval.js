/* ============================================================
   handeval.js — 德州扑克手牌评估（7选5最优 + 排名）
   ============================================================ */

function scoreHand(hand) {
  // hand = [card, card, card, card, card]  (5张)
  const vals = hand.map(c => RANK_VALUE[c.rank]).sort((a,b)=>b-a);
  const suits = hand.map(c => c.suit);
  const isFlush = suits.every(s => s === suits[0]);

  // Check straight
  let straightHigh = 0;
  const uvals = [...new Set(vals)].sort((a,b)=>b-a);
  if (uvals.length >= 5) {
    for (let i = 0; i <= uvals.length - 5; i++) {
      if (uvals[i] - uvals[i+4] === 4) { straightHigh = uvals[i]; break; }
    }
    // A-2-3-4-5 (wheel)
    if (!straightHigh && uvals[0] === 14 && uvals[uvals.length-1] === 2) {
      let wheel = true;
      for (let i=0; i<4; i++) if (uvals[uvals.length-1-i] - uvals[uvals.length-5] !== i) { wheel=false; break; }
      if (wheel) straightHigh = 5;
    }
  }

  const rankCounts = {};
  for (const v of vals) rankCounts[v] = (rankCounts[v] || 0) + 1;
  const groups = Object.entries(rankCounts).map(([v,c])=>({v:+v,c})).sort((a,b)=>b.c-a.c||b.v-a.v);

  // Rankings: 9=SF, 8=4K, 7=FH, 6=Flush, 5=Straight, 4=3K, 3=2P, 2=1P, 1=HC
  if (straightHigh && isFlush) return { rank:9, name:'同花顺', score: [9, straightHigh] };
  if (groups[0].c === 4) return { rank:8, name:'四条', score: [8, groups[0].v, groups[1].v] };
  if (groups[0].c === 3 && groups[1].c === 2) return { rank:7, name:'葫芦', score: [7, groups[0].v, groups[1].v] };
  if (isFlush) return { rank:6, name:'同花', score: [6, ...uvals.slice(0,5)] };
  if (straightHigh) return { rank:5, name:'顺子', score: [5, straightHigh] };
  if (groups[0].c === 3) return { rank:4, name:'三条', score: [4, groups[0].v, ...uvals.filter(v=>v!==groups[0].v).slice(0,2)] };
  if (groups[0].c === 2 && groups[1] && groups[1].c === 2) {
    const pairs = [groups[0].v, groups[1].v].sort((a,b)=>b-a);
    const kicker = uvals.find(v => !pairs.includes(v));
    return { rank:3, name:'两对', score: [3, ...pairs, kicker] };
  }
  if (groups[0].c === 2) return { rank:2, name:'一对', score: [2, groups[0].v, ...uvals.filter(v=>v!==groups[0].v).slice(0,3)] };
  return { rank:1, name:'高牌', score: [1, ...uvals.slice(0,5)] };
}

function bestHand(holeCards, community) {
  const all = [...holeCards, ...community];
  if (all.length < 5) return scoreHand(all);
  let best = null;
  // C(7,5) = 21 combos
  for (let a=0; a<all.length; a++) for (let b=a+1; b<all.length; b++)
  for (let c=b+1; c<all.length; c++) for (let d=c+1; d<all.length; d++)
  for (let e=d+1; e<all.length; e++) {
    const hand = [all[a], all[b], all[c], all[d], all[e]];
    const s = scoreHand(hand);
    if (!best || compareScore(s.score, best.score) > 0) best = s;
  }
  return best;
}

function compareScore(a, b) {
  for (let i=0; i<Math.min(a.length,b.length); i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

function compareHands(h1, h2) { return compareScore(h1.score, h2.score); }

// Hand strength estimation (for AI decision making)
function estimateHandStrength(holeCards, community) {
  // Monte Carlo: simulate river if we're pre-river, evaluate hand rank
  const deck = makeDeck();
  const used = new Set([...holeCards, ...community].map(cardToString));
  const remaining = deck.filter(c => !used.has(cardToString(c)));

  if (community.length >= 5 || remaining.length === 0) {
    return bestHand(holeCards, community).rank / 9;
  }

  // Full simulation if only preflop
  if (community.length === 0) {
    // Preflop hand strength based on known rankings
    const v1 = RANK_VALUE[holeCards[0].rank];
    const v2 = RANK_VALUE[holeCards[1].rank];
    const paired = holeCards[0].rank === holeCards[1].rank;
    const suited = holeCards[0].suit === holeCards[1].suit;
    const high = Math.max(v1,v2), low = Math.min(v1,v2);

    if (paired && high >= 12) return 0.85;
    if (paired && high >= 10) return 0.75;
    if (paired) return 0.60;
    if (high >= 14 && low >= 12) return 0.72;
    if (high >= 14 && low >= 10) return suited ? 0.62 : 0.55;
    if (high >= 13 && low >= 11) return suited ? 0.55 : 0.48;
    if (high >= 12) return suited ? 0.45 : 0.38;
    if (high >= 10 && low >= 10) return suited ? 0.40 : 0.33;
    if (high >= 10 && low >= 5 && suited) return 0.32;
    return 0.25 + (high-2) / 48;
  }

  // For flop/turn: run Monte Carlo
  const trials = Math.min(50, Math.floor(2000 / remaining.length));
  let win = 0, total = 0;
  for (let t=0; t<trials; t++) {
    const sample = [...remaining].sort(()=>Math.random()-0.5);
    const simulated = [...community];
    for (let i=community.length; i<5 && i<community.length+sample.length; i++) {
      simulated.push(sample[i-community.length]);
    }
    const myScore = bestHand(holeCards, simulated).score;
    // Compare against random opponents (just estimate top 40%)
    const opp1 = bestHand([sample[5],sample[6]], simulated);
    const opp2 = bestHand([sample[7],sample[8]], simulated);
    if (compareScore(myScore, opp1.score) >= 0 && compareScore(myScore, opp2.score) >= 0) win++;
    total++;
  }
  return total > 0 ? win / total : 0.3;
}