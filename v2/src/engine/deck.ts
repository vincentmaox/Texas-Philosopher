import { SUITS, RANKS, type Card, type Rank, type Suit } from '@/types/card';

export function makeDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of SUITS) {
    for (const r of RANKS) {
      deck.push({ rank: r as Rank, suit: s as Suit });
    }
  }
  return deck;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function shuffleDeck(): Card[] {
  return shuffle(makeDeck());
}

export function removeCards(deck: Card[], cards: Card[]): Card[] {
  const used = new Set(cards.map(c => c.rank + c.suit));
  return deck.filter(c => !used.has(c.rank + c.suit));
}
