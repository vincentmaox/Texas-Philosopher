export const PALETTE = {
  // Table
  feltGreen: '#1a4731',
  feltGreenLight: '#1f563b',
  goldTrim: '#c9a227',

  // Background
  bgDeep: '#0d1117',
  bgMid: '#161b22',
  bgCard: '#21262d',
  bgElevated: '#30363d',

  // Feedback
  correct: '#48BB78',
  good: '#68D391',
  acceptable: '#F6AD55',
  bad: '#FC8181',
  error: '#E53E3E',

  // Info
  info: '#4299E1',
  achievement: '#ECC94B',
  warning: '#F6AD55',
  premium: '#CE82FF',

  // Cards
  cardWhite: '#FEFEFE',
  cardRed: '#E53E3E',
  cardBlack: '#1A202C',

  // Chips
  chipRed: '#E53E3E',
  chipBlue: '#3182CE',
  chipGreen: '#38A169',
  chipBlack: '#2D3748',
  chipGold: '#D69E2E',
  chipWhite: '#f0f0f0',

  // Text
  textPrimary: '#F7FAFC',
  textSecondary: '#A0AEC0',
  textDim: '#718096',
} as const;

export type PaletteColor = keyof typeof PALETTE;
