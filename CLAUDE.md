# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ALIP** — Adaptive Learning Intelligence Platform. An AI-powered tutoring app for K-8 mathematics. MVP scope: fractions concept only (8 micro-skills, 6 misconception types), single hardcoded student, no auth.

The Next.js application lives in `alip-app/`. All docs and specs are in `Docs/`.

---

## Commands

All commands must be run from inside `alip-app/`:

```bash
npm run dev       # Start dev server (localhost:3000)
npm run build     # TypeScript compile + production build
npm run lint      # ESLint check
npm run start     # Start production server
```

There is no test runner configured yet. Services are designed to be tested independently of Next.js.

---

## Architecture

### Five-Layer System

```
Layer 1: Student UI      → Next.js pages + React components
Layer 2: API Routes      → Next.js App Router handlers (thin — validate, call service, return)
Layer 3: Services        → TypeScript modules (pure, no framework dependency)
Layer 4: Data Layer      → Supabase / PostgreSQL (schema + functions + views)
Layer 5: External        → Cloudflare Stream (video), Anthropic Claude (V2+)
```

No business logic lives in API route handlers. All logic is in services.

### Implemented File Structure

```
alip-app/src/
├── app/
│   ├── layout.tsx                              # Root layout (server component)
│   ├── page.tsx                                # Home screen (server component)
│   ├── session/page.tsx                        # Session screen (client — owns state machine)
│   ├── progress/page.tsx                       # Progress screen (server component)
│   ├── dashboard/[token]/page.tsx              # Parent dashboard (server component, no auth)
│   └── api/
│       ├── sessions/
│       │   ├── start/route.ts                  # POST — create session, init skills, first question
│       │   ├── [id]/end/route.ts               # POST — mark complete, compute summary
│       │   └── [id]/next-question/route.ts     # GET  — select next adaptive question
│       ├── answers/submit/route.ts             # POST — classify, update mastery, log interaction
│       ├── students/[id]/progress/route.ts     # GET  — skill profile + mastery overview
│       └── dashboard/[token]/route.ts          # GET  — parent dashboard data (public, no auth)
├── components/
│   ├── FractionBar.tsx                         # SVG fraction visualization + FractionBarGroup
│   └── session/
│       ├── index.ts                            # Barrel re-exports
│       ├── AnswerOptions.tsx                   # Multiple-choice buttons with keyboard nav
│       ├── FeedbackPanel.tsx                   # Correct/incorrect/misconception feedback
│       ├── MasteryBar.tsx                      # Progress bar (weak/developing/mastered)
│       ├── QuestionCard.tsx                    # Three-zone question layout
│       ├── SessionSummary.tsx                  # End-of-session stats + skill progress
│       ├── SkillUnlock.tsx                     # Skill mastered celebration + confetti
│       └── VideoPlayer.tsx                     # Intro / remediation video player
├── hooks/
│   └── useSession.ts                           # 10-state session machine + all session logic
├── services/
│   ├── MasteryService.ts                       # ONLY place mastery state is modified
│   ├── MisconceptionClassifier.ts              # Rule-based lookup with module-level cache
│   ├── QuestionSelector.ts                     # Difficulty-aware question selection
│   └── SessionService.ts                       # Session lifecycle (create, end, summary)
├── lib/
│   ├── supabase.ts                             # supabaseServer + supabaseClient
│   └── constants.ts                            # MASTERY_DELTAS, MASTERY_THRESHOLDS, SESSION_CONSTANTS
└── types/
    ├── database.ts                             # Single source of truth for all TypeScript types
    └── index.ts                                # Re-exports from database.ts
```

---

## Database Design (Supabase PostgreSQL)

Schema files are in `alip-app/schema/` — deploy to Supabase SQL editor in order before developing:
1. `001_initial_schema_v2.sql` — tables, views, indexes, PostgreSQL functions
2. `002_seed_data_v2.sql` — subjects, domains, concepts, 8 micro-skills, 6 misconceptions, ~28 questions

**Domain hierarchy:** `subjects → domains → concepts → micro_skills`

**Core PostgreSQL functions** (called via Supabase RPC — never replicate this logic in application code):
- `init_student_skills(student_id, concept_id?)` — seeds skill state for new student
- `update_mastery(student_id, skill_id, event)` — updates mastery score + status
- `check_and_unlock_skills(student_id)` — unlocks newly eligible skills
- `get_next_skill(student_id, concept_id?)` — adaptive routing
- `log_misconception(student_id, misconception_id, skill_id)` — upserts misconception record
- `update_question_stats(question_id, is_correct)` — increments attempt counts

**Core views** (query directly from API layer):
- `v_student_skill_profile` — full skill state with hierarchy context
- `v_concept_mastery` — aggregated concept-level mastery
- `v_active_misconceptions` — current misconceptions with remediation info

**The `interactions` table is immutable** — rows are only inserted, never updated or deleted.

---

## Student Identity (MVP)

No login or auth at MVP. A single student is hardcoded by UUID in both `page.tsx` and `session/page.tsx`:

```typescript
const DEFAULT_STUDENT_ID = '00000000-0000-0000-0000-000000000001';
const DEFAULT_STUDENT_NAME = 'Alex';
```

This UUID must match a row in the `students` table (seeded by `002_seed_data_v2.sql`).

The parent dashboard at `/dashboard/[token]` treats `token` as the student ID directly — no real token validation at MVP.

> Enable RLS and replace these hardcoded IDs with real auth before any multi-student public launch.

---

## Mastery System

Mastery scores are numeric `0.000–1.000`. Thresholds (from `lib/constants.ts`):
- `mastered`: ≥ 0.80
- `developing`: ≥ 0.50
- `weak`: < 0.50

Answer events and mastery deltas:

| Event                  | Delta  |
|------------------------|--------|
| `correct_no_hint`      | +0.15  |
| `correct_with_hint`    | +0.08  |
| `correct_explanation`  | +0.20  |
| `incorrect_conceptual` | −0.10  |
| `incorrect_repeated`   | −0.15  |

---

## Session State Machine (10 states)

The session screen (`/session`) is the only client component with complex state. The entire machine lives in `hooks/useSession.ts`.

```
IDLE
  → INTRO_VIDEO           (if introVideoUrl present on session start)
  → QUESTION_ACTIVE       (if no intro video)

INTRO_VIDEO
  → QUESTION_ACTIVE       (on skip / "I'm Ready" — reuses preselected first question)

QUESTION_ACTIVE
  → HINT_SHOWN            (on requestHint)
  → EVALUATING            (on submitAnswer)

HINT_SHOWN
  → EVALUATING            (on submitAnswer)

EVALUATING
  → FEEDBACK_CORRECT      (correct answer, mastery < 0.80)
  → SKILL_MASTERED        (correct answer, mastery ≥ 0.80)
  → FEEDBACK_MISCONCEPTION (wrong answer + misconception detected)
  → FEEDBACK_INCORRECT    (wrong answer, no misconception)

FEEDBACK_CORRECT
  → QUESTION_ACTIVE       (on proceedToNext)

FEEDBACK_MISCONCEPTION
  → INTRO_VIDEO           (on proceedToNext — plays remediation video)
  → QUESTION_ACTIVE       (on proceedToNext — if no remediation video)

FEEDBACK_INCORRECT
  → QUESTION_ACTIVE       (on proceedToNext)

SKILL_MASTERED
  → QUESTION_ACTIVE       (on proceedToNext — continues with next skill or same)

SESSION_COMPLETE          (terminal — max questions reached or endSession called)
```

**Hook actions:** `startSession(studentId)`, `submitAnswer(answer)`, `requestHint()`, `proceedToNext()`, `endSession()`

**Hook state exports:**
```typescript
state, currentQuestion, currentSkill, introVideoUrl, remediationVideoUrl,
feedbackData, sessionSummary, questionsAnswered, currentMastery,
isLoading, error, hintUsed, sessionId, skillId, conceptId
```

**Key implementation notes:**
- `currentMasteryRef` is kept in sync after every `setCurrentMastery()` call to prevent stale-closure bugs in async callbacks
- The INTRO_VIDEO → QUESTION_ACTIVE transition reuses the first question already fetched by `startSession()`; it does **not** make a new network request
- `proceedToNext()` checks `state === 'INTRO_VIDEO'` first before falling through to feedback-state handling
- Answering resets `selectedAnswer` only when `currentQuestion?.id` changes (not on state change), so the answer is preserved during HINT_SHOWN

---

## Services

### MasteryService
Sole owner of mastery state mutations. All changes go through this service.

**Methods:**
- `processAnswer()` — critical path (see Answer Submit Flow below)
- `getNextSkill(studentId, conceptId?)` — calls `get_next_skill()` RPC
- `initStudentSkills(studentId, conceptId?)` — calls `init_student_skills()` RPC

### MisconceptionClassifier
Rule-based distractor lookup at MVP. Uses a **module-level in-memory cache** per architecture spec ("Cache the mapping in memory at startup — do not re-query per request").

```typescript
// Cache structure
let distractorCache: Map<string, DistractorMapping[]> | null = null;
// Lazy-initialized on first classify() call via initialize()
```

Each question's `distractors` JSONB is an array of `{ answer, misconception_id }` objects. The classifier does a case-insensitive, trimmed string match.

V2: LLM-based (Anthropic `claude-sonnet-4-20250514`) for free-text answers — same interface, new implementation.

### QuestionSelector
Selects the next question for a student, never repeating within a session.

**Difficulty ranges:**

| Mastery score      | Target `difficulty_weight` |
|--------------------|---------------------------|
| < 0.30             | 0.0 – 0.7                 |
| 0.30 – 0.60        | 0.8 – 1.2                 |
| 0.60 – 0.80        | 1.2 – 1.6                 |
| ≥ 0.80             | 1.6 – 2.0                 |

Fallback: any unseen question → least-recently-seen question.

### SessionService
Manages session lifecycle.

**Methods:**
- `startSession(studentId, conceptId?)` → `SessionStartResult`
- `endSession(sessionId)` → `SessionSummary`
- `getNextQuestion(sessionId, skillId, studentId, conceptId, mastery)` → `Question`
- `updateSkillsPracticed(sessionId, skillId)` — tracks skills practiced
- `incrementQuestionCount(sessionId)` — increments counter

**`SessionStartResult`:**
```typescript
{
  sessionId: string;
  skillId: string;
  skill: MicroSkill;
  introVideoUrl: string | null;   // null if skill already practiced
  firstQuestion: Question;
  currentMastery: number;
}
```

---

## Answer Submit Flow (Critical Path)

`POST /api/answers/submit` orchestrates:

1. Fetch question from DB
2. Check correctness (case-insensitive trim comparison)
3. `MisconceptionClassifier.classify()` — distractor cache lookup
4. `MasteryService.processAnswer()` which calls in order:
   - `update_mastery()` RPC
   - `check_and_unlock_skills()` RPC
   - `log_misconception()` RPC (if misconception detected)
   - `update_question_stats()` RPC
   - Insert row into `interactions` table
5. `SessionService.incrementQuestionCount()`
6. `SessionService.updateSkillsPracticed()`
7. `QuestionSelector.selectQuestion()` (fetch next question, if session not ended)
8. Look up `remediationVideoUrl` (if misconception detected)
9. Return extended `InteractionResult` with `remediationVideoUrl` and `nextQuestion`

---

## Answer Options (Multiple Choice)

Derive options from `question.distractors` JSONB **plus** `question.correct_answer`, shuffled:

```typescript
const distractors = questionData.distractors as Array<{ answer: string }> | null;
const options = [...distractors.map(d => d.answer), question.correct_answer]
    .sort(() => Math.random() - 0.5);
```

Do **not** use `question.tags` — that field holds metadata labels, not answer choices.

---

## Session Constants (`lib/constants.ts`)

```typescript
SESSION_CONSTANTS = {
  MAX_QUESTIONS_PER_SESSION: 10,
  MIN_QUESTIONS_BEFORE_SUMMARY: 6,
  INTRO_VIDEO_SKIP_DELAY_MS: 10_000,  // "I'm ready" button activates after 10s
}
```

---

## Key Conventions

- **Student ID:** Hardcoded UUID `'00000000-0000-0000-0000-000000000001'` — no login, no auth at MVP
- **`supabaseServer`** (service role key) for all API routes and server components
- **`supabaseClient`** (anon key) for client components only
- **Env var validation:** `supabase.ts` uses `getRequiredEnvVar()` — throws immediately on missing or placeholder values
- **RLS** is not enabled at MVP — enable before any multi-student public launch
- All API routes return `{ error: string }` with appropriate HTTP status on failure; never leak internal error messages to the client
- API routes log per-query errors and return partial data gracefully (500 only when all queries fail)
- No `any` types — all responses typed via `src/types/database.ts`
- No middleware — routing is purely file-based + client-side `useRouter()`
- The `Docs/` directory contains the authoritative specs — reference `System Architecture Document - Claude.md` and `MVP Development Plan - Claude.md` for implementation details

---

## Environment Variables

```
SUPABASE_URL=                    # Server-side only
SUPABASE_SERVICE_KEY=            # Server-side only (service role — bypasses RLS)
NEXT_PUBLIC_SUPABASE_URL=        # Client-side
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Client-side
```

Copy `.env.example` to `.env.local` and fill in credentials from your Supabase project.

> **Security:** Never commit files containing `SUPABASE_SERVICE_KEY`. The `.gitignore` excludes `query.mjs`, `query.ts`, and `.claude/` to prevent accidental credential exposure. If a service-role key is ever committed, rotate it immediately in the Supabase dashboard.
