import type {
  MicroSkill,
  Question,
  ClassifierType,
  ActiveMisconceptionRow,
} from './database'

// Re-export all database types for application use
export type {
  Database,
  Student,
  MicroSkill,
  Concept,
  Domain,
  Subject,
  Session,
  Interaction,
  Question,
  StudentSkillState,
  StudentMisconception,
  MisconceptionType,
  Prerequisite,
  SkillMisconception,
  StudentSkillProfileRow,
  ConceptMasteryRow,
  ActiveMisconceptionRow,
  QuestionDifficultyStatsRow,
  StudentCognitiveProfile,
  InteractionResult,
  SubmitAnswerPayload,
  WeeklySummary,
  // Enum types
  AnswerEvent,
  MasteryStatus,
  ClassifierType,
  DifficultyLevel,
} from './database'

// Session state machine states
export type SessionState =
  | 'IDLE'
  | 'INTRO_VIDEO'
  | 'QUESTION_ACTIVE'
  | 'HINT_SHOWN'
  | 'EVALUATING'
  | 'FEEDBACK_CORRECT'
  | 'FEEDBACK_MISCONCEPTION'
  | 'FEEDBACK_INCORRECT'
  | 'SKILL_MASTERED'
  | 'SESSION_COMPLETE'

// Classifier result
export interface ClassifierResult {
  misconceptionId:  string | null
  confidence:       number | null   // null for rule_based
  classifierType:   ClassifierType
  reasoning:        string | null   // null for rule_based
}

// Session start result
export interface SessionStartResult {
  sessionId:      string
  skillId:        string
  skill:          MicroSkill
  isNewSkill:     boolean
  introVideoUrl:  string | null
  firstQuestion:  Question
}

// Session summary
export interface SessionSummary {
  questionsAnswered:    number
  skillsImproved:       Array<{ skillName: string; before: number; after: number }>
  skillsMastered:       string[]
  activeMisconceptions: ActiveMisconceptionRow[]
  sessionDurationMin:   number
  aiInsight:            string | null  // Claude-generated session insight
}

// Distractor entry from questions.distractors JSONB column
export interface Distractor {
  answer:           string
  misconception_id: string
}
