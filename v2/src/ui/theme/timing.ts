export const TIMING = {
  // Card animations
  cardDeal: 300,
  cardDealStagger: 120,
  cardFlip: 300,
  communityDealGap: 200,

  // Chip animations
  chipMove: 250,
  chipToPot: 300,

  // Feedback
  feedbackCorrect: 200,
  feedbackError: 400,
  celebration: 1500,

  // EV pipeline
  evStep: 100,
  evStagger: 100,
  evRevealDelay: 2000,

  // Dialogue
  dialogueAppear: 200,
  dialogueDuration: 4000,
  dialogueFade: 500,

  // Toast
  toastDuration: 3000,
  toastFade: 500,

  // Modal
  modalOpen: 250,
  modalClose: 200,

  // AI thinking
  aiMinThink: 600,
  aiMaxThink: 1500,
} as const;
