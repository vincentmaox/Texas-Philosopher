export const PALETTE = {
  // Table — AAA casino feel
  feltGreen: '#0F4C3A',
  feltGreenLight: '#1A6B52',
  feltGreenDark: '#073026',
  woodTrim: '#3E2817',
  woodTrimLight: '#5A3A22',
  goldTrim: '#D4AF37',
  goldTrimBright: '#F4CF57',

  // Background — warm dark room, not GitHub editor
  bgDeep: '#1A0F0A',
  bgMid: '#241510',
  bgCard: '#2E1D16',
  bgElevated: '#3D2A20',

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
  hotPink: '#FF3B7C',

  // Cards
  cardWhite: '#FEFEFE',
  cardCream: '#FAF7F0',
  cardRed: '#C8102E',
  cardBlack: '#0A0A0A',
  cardBorder: '#E8E0D0',

  // Chips
  chipRed: '#C8102E',
  chipBlue: '#1E5BA8',
  chipGreen: '#2F8F58',
  chipBlack: '#1A1A1A',
  chipGold: '#D4AF37',
  chipWhite: '#F0EBE0',

  // Text
  textPrimary: '#F7FAFC',
  textSecondary: '#C7B8A8',
  textDim: '#8A7E70',
} as const;

export type PaletteColor = keyof typeof PALETTE;
