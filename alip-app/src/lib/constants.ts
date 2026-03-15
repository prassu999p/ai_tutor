import type { AnswerEvent, MasteryStatus } from '@/types/database';

// ── Mastery Deltas ──────────────────────────────────────────
// How much mastery changes per answer event type
export const MASTERY_DELTAS: Record<AnswerEvent, number> = {
    correct_no_hint: 0.15,
    correct_with_hint: 0.08,
    correct_explanation: 0.20,
    incorrect_conceptual: -0.10,
    incorrect_repeated: -0.15,
};

// ── Mastery Thresholds ──────────────────────────────────────
// Score boundaries for mastery status transitions
export const MASTERY_THRESHOLDS = {
    mastered: 0.80,
    developing: 0.50,
} as const;

// ── Mastery Status Labels ───────────────────────────────────
export const MASTERY_STATUS_LABELS: Record<MasteryStatus, string> = {
    mastered: 'Mastered',
    developing: 'Developing',
    weak: 'Weak',
};

// ── Session Constants ───────────────────────────────────────
export const SESSION_CONSTANTS = {
    MAX_QUESTIONS_PER_SESSION: 10,
    MIN_QUESTIONS_BEFORE_SUMMARY: 6,
    INTRO_VIDEO_SKIP_DELAY_MS: 10_000, // "I'm ready" activates after 10s
} as const;

// ── Difficulty Selection Ranges ─────────────────────────────
// Used by QuestionSelector to pick appropriate difficulty
export const DIFFICULTY_RANGES = {
    weak: { min: 0.0, max: 0.7 },   // easier questions
    developing: { min: 0.8, max: 1.2 },   // standard questions
    advanced: { min: 1.2, max: 1.6 },   // harder questions
    mastering: { min: 1.6, max: 2.0 },   // mastery confirmation
} as const;

// ── Default Concept ID ──────────────────────────────────────
// MVP focuses on Fractions only
export const DEFAULT_CONCEPT_ID = 'FRAC';

// ── Parent Dashboard ────────────────────────────────────────
// Misconception labels: internal → parent-facing
export const MISCONCEPTION_PARENT_LABELS: Record<string, string> = {
    M1: 'Adding denominators together',
    M2: 'Mixing up the top and bottom of a fraction',
    M3: 'Only changing half of the fraction',
    M4: 'Not simplifying the final answer',
    M5: 'Using the wrong common denominator',
    M6: 'Comparing fractions by the top number only',
};
