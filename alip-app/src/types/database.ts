// ============================================================
// ALIP — TypeScript Types v2
// Reflects schema v2: subjects → domains → concepts → micro_skills
// ============================================================

// ── ENUMS ────────────────────────────────────────────────────

export type DifficultyLevel   = 'foundational' | 'developing' | 'advanced';
export type MasteryStatus     = 'weak' | 'developing' | 'mastered';
export type MisconceptionSeverity = 'low' | 'medium' | 'high';
export type SessionStatus     = 'active' | 'completed' | 'abandoned';
export type ClassifierType    = 'rule_based' | 'llm';

export type AnswerEvent =
  | 'correct_no_hint'
  | 'correct_with_hint'
  | 'correct_explanation'
  | 'incorrect_conceptual'
  | 'incorrect_repeated';

// ── CONSTANTS ────────────────────────────────────────────────

export const MASTERY_DELTAS: Record<AnswerEvent, number> = {
  correct_no_hint:        0.15,
  correct_with_hint:      0.08,
  correct_explanation:    0.20,
  incorrect_conceptual:  -0.10,
  incorrect_repeated:    -0.15,
};

export const MASTERY_THRESHOLDS = {
  mastered:   0.80,
  developing: 0.50,
} as const;

export const SUBJECT_IDS   = ['MATH', 'SCI', 'ENG'] as const;
export const CONCEPT_IDS   = ['FRAC', 'DEC', 'PCT', 'RATIO', 'INT'] as const;
export const SKILL_IDS     = ['MS-01','MS-02','MS-03','MS-04','MS-05','MS-06','MS-07','MS-08'] as const;
export const MISCONCEPTION_IDS = ['M1','M2','M3','M4','M5','M6'] as const;

export type SubjectId     = typeof SUBJECT_IDS[number];
export type ConceptId     = typeof CONCEPT_IDS[number];
export type SkillId       = typeof SKILL_IDS[number];
export type MisconceptionId = typeof MISCONCEPTION_IDS[number];

// ── DOMAIN HIERARCHY TABLES ──────────────────────────────────

export interface Subject {
  id:          string;
  name:        string;
  description: string | null;
  is_active:   boolean;
  position:    number;
  created_at:  string;
  updated_at:  string;
}

export interface Domain {
  id:          string;
  subject_id:  string;
  name:        string;
  description: string | null;
  is_active:   boolean;
  position:    number;
  created_at:  string;
  updated_at:  string;
}

export interface Concept {
  id:          string;
  domain_id:   string;
  name:        string;
  description: string | null;
  is_active:   boolean;
  position:    number;
  grade_min:   number | null;
  grade_max:   number | null;
  created_at:  string;
  updated_at:  string;
}

// ── KNOWLEDGE GRAPH TABLES ───────────────────────────────────

export interface MicroSkill {
  id:             string;
  concept_id:     string;
  name:           string;
  description:    string;
  mastery_goal:   string;
  difficulty:     DifficultyLevel;
  position:       number;
  is_entry_point:  boolean;
  intro_video_url: string | null;
  created_at:      string;
  updated_at:      string;
}

export interface Prerequisite {
  id:                 string;
  skill_id:           string;
  requires_skill_id:  string;
  relationship_type:  'requires' | 'supports';
  created_at:         string;
}

export interface MisconceptionType {
  id:            string;
  concept_id:    string;
  name:          string;
  description:   string;
  example_error: string;
  root_cause:    string;
  remediation:   string;
  severity:      MisconceptionSeverity;
  created_at:    string;
  updated_at:    string;
}

export interface SkillMisconception {
  skill_id:         string;
  misconception_id: string;
}

// ── STUDENT TABLES ───────────────────────────────────────────

export interface Student {
  id:           string;
  name:         string;
  age:          number | null;
  grade:        string | null;
  parent_email: string | null;
  parent_name:  string | null;
  timezone:     string;
  is_active:    boolean;
  created_at:   string;
  updated_at:   string;
}

export interface StudentSkillState {
  id:                 string;
  student_id:         string;
  skill_id:           string;
  mastery_score:      number;
  mastery_status:     MasteryStatus;
  is_unlocked:        boolean;
  is_active:          boolean;
  attempts_total:     number;
  attempts_correct:   number;
  last_practiced_at:  string | null;
  unlocked_at:        string | null;
  mastered_at:        string | null;
  created_at:         string;
  updated_at:         string;
}

export interface StudentMisconception {
  id:                string;
  student_id:        string;
  misconception_id:  string;
  skill_id:          string;
  occurrence_count:  number;
  last_occurred_at:  string;
  resolved_at:       string | null;
  created_at:        string;
  updated_at:        string;
}

// ── SESSION + INTERACTION TABLES ─────────────────────────────

export interface Session {
  id:                 string;
  student_id:         string;
  status:             SessionStatus;
  started_at:         string;
  ended_at:           string | null;
  questions_answered: number;
  skills_practiced:   string[];
  session_notes:      string | null;
  created_at:         string;
  updated_at:         string;
}

export interface Question {
  id:                  string;
  skill_id:            string;
  concept_id:          string;
  question_text:       string;
  correct_answer:      string;
  explanation:         string;
  hint_text:           string | null;
  difficulty_weight:   number;
  irt_difficulty:      number | null;     // null until V2 calibration
  irt_discrimination:  number | null;     // null until V2 calibration
  distractors:         Array<{ answer: string; misconception_id: string | null }> | null;
  tags:                string[];
  is_active:           boolean;
  times_answered:      number;
  times_correct:       number;
  created_at:          string;
  updated_at:          string;
}

export interface Interaction {
  id:                       string;
  session_id:               string;
  student_id:               string;
  skill_id:                 string;
  concept_id:               string;
  question_id:              string;            // FK to questions
  student_answer:           string | null;
  is_correct:               boolean | null;
  hint_used:                boolean;
  event_type:               AnswerEvent | null;
  misconception_id:         string | null;
  classifier_type:          ClassifierType | null;
  misconception_confidence: number | null;     // 0.0–1.0, llm only
  llm_reasoning:            string | null;     // llm audit trail
  mastery_before:           number | null;
  mastery_after:            number | null;
  mastery_delta:            number | null;
  response_time_ms:         number | null;
  created_at:               string;
}

// ── VIEW TYPES ───────────────────────────────────────────────

export interface StudentSkillProfileRow {
  student_id:         string;
  student_name:       string;
  subject_name:       string;
  domain_name:        string;
  concept_id:         string;
  concept_name:       string;
  skill_id:           string;
  skill_name:         string;
  difficulty:         DifficultyLevel;
  mastery_score:      number;
  mastery_status:     MasteryStatus;
  is_unlocked:        boolean;
  attempts_total:     number;
  attempts_correct:   number;
  last_practiced_at:  string | null;
  mastered_at:        string | null;
}

export interface ConceptMasteryRow {
  student_id:             string;
  student_name:           string;
  concept_id:             string;
  concept_name:           string;
  domain_name:            string;
  subject_name:           string;
  total_skills:           number;
  skills_mastered:        number;
  skills_developing:      number;
  skills_weak:            number;
  concept_mastery_score:  number;
  concept_mastery_status: MasteryStatus;
  pct_skills_mastered:    number;
}

export interface ActiveMisconceptionRow {
  student_id:          string;
  student_name:        string;
  misconception_id:    string;
  misconception_name:  string;
  severity:            MisconceptionSeverity;
  remediation:         string;
  skill_id:            string;
  skill_name:          string;
  concept_name:        string;
  occurrence_count:    number;
  last_occurred_at:    string;
}

export interface QuestionDifficultyStatsRow {
  question_id:         string;
  skill_id:            string;
  skill_name:          string;
  concept_id:          string;
  difficulty_weight:   number;
  irt_difficulty:      number | null;
  irt_discrimination:  number | null;
  times_answered:      number;
  times_correct:       number;
  pct_correct:         number | null;
  unique_students:     number;
}

// ── HELPER / APPLICATION TYPES ───────────────────────────────

/** Full cognitive profile for one student */
export interface StudentCognitiveProfile {
  student:         Student;
  conceptMastery:  ConceptMasteryRow[];
  skills:          StudentSkillState[];
  misconceptions:  ActiveMisconceptionRow[];
  currentSkillId:  string | null;
}

/** Result returned to UI after one interaction */
export interface InteractionResult {
  isCorrect:              boolean;
  masteryBefore:          number;
  masteryAfter:           number;
  masteryDelta:           number;
  masteryStatus:          MasteryStatus;
  misconceptionDetected:  MisconceptionType | null;
  classifierType:         ClassifierType;
  confidence:             number | null;
  explanation:            string;
  hintAvailable:          boolean;
  nextSkillId:            string | null;
  newSkillUnlocked:       boolean;
}

/** Payload for submitting a student answer */
export interface SubmitAnswerPayload {
  sessionId:        string;
  studentId:        string;
  skillId:          string;
  conceptId:        string;
  questionId:       string;
  studentAnswer:    string;
  hintUsed:         boolean;
  responseTimeMs?:  number;
}

/** Parent-facing weekly summary */
export interface WeeklySummary {
  studentName:        string;
  weekStartDate:      string;
  sessionsCompleted:  number;
  questionsAnswered:  number;
  conceptProgress:    ConceptMasteryRow[];
  skillsImproved: Array<{
    skillName:    string;
    scoreBefore:  number;
    scoreAfter:   number;
  }>;
  skillsMastered:     string[];
  activeMisconceptions: Array<{
    name:         string;
    occurrences:  number;
    severity:     MisconceptionSeverity;
    remediation:  string;
  }>;
}

// ── SUPABASE DATABASE INTERFACE ──────────────────────────────

export interface Database {
  public: {
    Tables: {
      subjects:              { Row: Subject;            Insert: Omit<Subject, 'created_at'|'updated_at'>;           Update: Partial<Omit<Subject, 'id'|'created_at'>>; };
      domains:               { Row: Domain;             Insert: Omit<Domain, 'created_at'|'updated_at'>;            Update: Partial<Omit<Domain, 'id'|'created_at'>>; };
      concepts:              { Row: Concept;            Insert: Omit<Concept, 'created_at'|'updated_at'>;           Update: Partial<Omit<Concept, 'id'|'created_at'>>; };
      micro_skills:          { Row: MicroSkill;         Insert: Omit<MicroSkill, 'created_at'|'updated_at'>;        Update: Partial<Omit<MicroSkill, 'id'|'created_at'>>; };
      prerequisites:         { Row: Prerequisite;       Insert: Omit<Prerequisite, 'id'|'created_at'>;              Update: never; };
      misconception_types:   { Row: MisconceptionType;  Insert: Omit<MisconceptionType, 'created_at'|'updated_at'>; Update: Partial<Omit<MisconceptionType, 'id'|'created_at'>>; };
      skill_misconceptions:  { Row: SkillMisconception; Insert: SkillMisconception;                                  Update: never; };
      students:              { Row: Student;            Insert: Omit<Student, 'id'|'created_at'|'updated_at'>;      Update: Partial<Omit<Student, 'id'|'created_at'>>; };
      student_skill_state:   { Row: StudentSkillState;  Insert: Omit<StudentSkillState, 'id'|'created_at'|'updated_at'>; Update: Partial<Omit<StudentSkillState, 'id'|'created_at'>>; };
      student_misconceptions:{ Row: StudentMisconception; Insert: Omit<StudentMisconception, 'id'|'created_at'|'updated_at'>; Update: Partial<Omit<StudentMisconception, 'id'|'created_at'>>; };
      sessions:              { Row: Session;            Insert: Omit<Session, 'id'|'created_at'|'updated_at'>;      Update: Partial<Omit<Session, 'id'|'created_at'>>; };
      questions:             { Row: Question;           Insert: Omit<Question, 'id'|'created_at'|'updated_at'>;     Update: Partial<Omit<Question, 'id'|'created_at'>>; };
      interactions:          { Row: Interaction;        Insert: Omit<Interaction, 'id'|'created_at'>;               Update: never; };
    };
    Views: {
      v_student_skill_profile:     { Row: StudentSkillProfileRow };
      v_concept_mastery:           { Row: ConceptMasteryRow };
      v_active_misconceptions:     { Row: ActiveMisconceptionRow };
      v_question_difficulty_stats: { Row: QuestionDifficultyStatsRow };
    };
    Functions: {
      init_student_skills: {
        Args: { p_student_id: string; p_concept_id?: string };
        Returns: void;
      };
      update_mastery: {
        Args: { p_student_id: string; p_skill_id: string; p_event: AnswerEvent };
        Returns: number;
      };
      check_and_unlock_skills: {
        Args: { p_student_id: string };
        Returns: void;
      };
      get_next_skill: {
        Args: { p_student_id: string; p_concept_id?: string };
        Returns: string | null;
      };
      log_misconception: {
        Args: { p_student_id: string; p_misconception_id: string; p_skill_id: string };
        Returns: void;
      };
      update_question_stats: {
        Args: { p_question_id: string; p_is_correct: boolean };
        Returns: void;
      };
    };
  };
}
