// Mastery delta values — how much a mastery score changes per answer event
export const MASTERY_DELTA = {
  correct_no_hint:      0.15,
  correct_with_hint:    0.08,
  correct_explanation:  0.20,
  incorrect_conceptual: -0.10,
  incorrect_repeated:   -0.15,
} as const

// Mastery status thresholds
export const MASTERY_THRESHOLD = {
  mastered:   0.80,
  developing: 0.50,
  weak:       0.00,
} as const

// Mastery status labels (matches DB enum)
export const MASTERY_STATUS = {
  mastered:   'mastered',
  developing: 'developing',
  weak:       'weak',
} as const

// Subject IDs (matches seed data)
export const SUBJECT_IDS = {
  MATH: 'MATH',
  SCI:  'SCI',
  ENG:  'ENG',
} as const

// Concept IDs (matches seed data)
export const CONCEPT_IDS = {
  FRAC:  'FRAC',
  DEC:   'DEC',
  PCT:   'PCT',
  RATIO: 'RATIO',
  INT:   'INT',
} as const

// Answer event types (matches DB enum)
export const ANSWER_EVENT = {
  CORRECT_NO_HINT:      'correct_no_hint',
  CORRECT_WITH_HINT:    'correct_with_hint',
  CORRECT_EXPLANATION:  'correct_explanation',
  INCORRECT_CONCEPTUAL: 'incorrect_conceptual',
  INCORRECT_REPEATED:   'incorrect_repeated',
} as const

// Session stop conditions
export const SESSION_LIMITS = {
  MAX_QUESTIONS:    15,
  MAX_DURATION_MIN: 20,
} as const

// Classifier types
export const CLASSIFIER_TYPE = {
  RULE_BASED: 'rule_based',
  LLM:        'llm',
} as const
