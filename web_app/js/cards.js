/* ============================================================
   cards.js — 牌组、洗牌、渲染
   ============================================================ */

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
const RANK_VALUE = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'T':10,'J':11,'Q':12,'K':13,'A':14 };

function makeDeck() {
  const deck = [];
  for (const s of SUITS) for (const r of RANKS) deck.push({ rank: r, suit: s });
  return deck;
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function cardToString(c) { return c.rank + c.suit; }

function renderCard(card, hidden = false) {
  if (!card) {
    const div = document.createElement('div');
    div.className = 'card empty';
    return div;
  }
  if (hidden) {
    const div = document.createElement('div');
    div.className = 'card back';
    return div;
  }
  const div = document.createElement('div');
  div.className = 'card dealt';
  if (card.suit === '♥' || card.suit === '♦') div.classList.add('red');
  const rankSpan = document.createElement('div');
  rankSpan.className = 'card-rank';
  rankSpan.textContent = card.rank;
  const suitSpan = document.createElement('div');
  suitSpan.className = 'card-suit';
  suitSpan.textContent = card.suit;
  div.appendChild(rankSpan);
  div.appendChild(suitSpan);
  return div;
}
