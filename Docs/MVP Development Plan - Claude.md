# 17. MVP Development Plan
## Adaptive Learning Intelligence Platform

**Document type:** Engineering Execution Plan  
**IDE:** Google Antigravity (agent-first, multi-model, browser-verified)  
**Scope:** Pure engineering task breakdown — 8 weeks, fractions MVP, beta-ready  
**Model recommendation:** Gemini 3 Pro for architecture and multi-file tasks. Claude Sonnet 4.6 for TypeScript service logic and DB integration. Flash for quick fixes and isolated components.

---

## 1. How to Use This Document in Antigravity

Antigravity agents operate best with task-level instructions, not line-by-line prompts. Each task in this document is written as an agent-ready brief:

- **Goal** — what the agent is building, in one sentence
- **Context** — which docs, files, and prior tasks to load into context
- **Acceptance criteria** — what the browser or terminal must show for the task to be complete
- **Parallel safe** — whether this task can run alongside other tasks in Manager View

**Before starting any task:**
1. Load the relevant architecture docs into the agent's knowledge base (docs 13, 14, 15, 16)
2. Load the SQL schema files (`001_initial_schema.sql`, `002_seed_data.sql`)
3. Load `types_v2.ts` as the TypeScript ground truth
4. Set Terminal Command Auto Execution to **Review-driven** — agent proposes commands, you approve before execution

**Pattern discipline:** The first three tasks establish naming, file structure, and service patterns. Review the plan artifact on each of these carefully and leave inline feedback before the agent proceeds. Every subsequent task will learn from these patterns — getting them right early compounds significantly.

---

## 2. Pre-Development Setup
### Not in Antigravity — done manually before opening the IDE

These steps happen outside the IDE. Complete all of them before Task 1.

**Step 1 — Create Supabase project**
- Go to supabase.com → New project
- Region: **ap-southeast-1 (Singapore)** — lowest latency for Malaysia
- Note down: Project URL, anon key, service role key

**Step 2 — Deploy schema**
- In Supabase SQL editor, run `001_initial_schema.sql`
- Then run `002_seed_data.sql`

**Step 3 — Verify deployment**
```sql
select count(*) from subjects;            -- expect 3
select count(*) from domains;             -- expect 10
select count(*) from concepts;            -- expect 8
select count(*) from micro_skills;        -- expect 8
select count(*) from misconception_types; -- expect 6
select count(*) from questions;           -- expect 28
select count(*) from prerequisites;       -- expect 10
```

If any count is wrong, do not proceed. Fix the seed data first.

**Step 4 — Initialise Next.js project**
```bash
npx create-next-app@latest alip \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*"

cd alip
npm install @supabase/supabase-js
```

**Step 5 — Configure environment**

Create `.env.local`:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Step 6 — Copy type definitions**

Copy `types_v2.ts` into `types/database.ts` at the project root.

**Step 7 — Open project in Antigravity**
```bash
agy .
```

Pre-development setup is complete. Begin Task 1.

---

## 3. Week 1 — Foundation Layer

**Goal for the week:** A working data pipeline from Supabase to the application layer. By end of week, submitting a hardcoded answer updates a mastery score visible in the Supabase table editor.

---

### Task 1.1 — Project Structure and Supabase Client
**Parallel safe:** No — establishes foundation for all other tasks

**Agent goal:**
Set up the project file structure, Supabase client instances, and shared constants exactly as defined in the architecture document.

**Context to load:**
- `docs/16_system_architecture.md` (Sections 6, 7.4, 11)
- `types/database.ts`
- `.env.local`

**Deliverables:**
```
lib/
  supabase.ts          server + client Supabase instances
  constants.ts         mastery deltas, thresholds, status enums
types/
  database.ts          (already copied — verify import works)
  index.ts             re-exports for application use
```

**`lib/constants.ts` must define:**
```typescript
export const MASTERY_DELTA = {
  correct_no_hint:       0.15,
  correct_with_hint:     0.08,
  correct_explanation:   0.20,
  incorrect_conceptual: -0.10,
  incorrect_repeated:   -0.15,
} as const

export const MASTERY_THRESHOLD = {
  mastered:    0.80,
  developing:  0.50,
  weak:        0.00,
} as const

export const MASTERY_STATUS = {
  mastered:    'mastered',
  developing:  'developing',
  weak:        'weak',
  locked:      'locked',
  not_started: 'not_started',
} as const
```

**Acceptance criteria:**
- `npm run build` passes with zero TypeScript errors
- `supabaseServer` can query `select * from subjects` and return 3 rows
- All constants are typed — no `any`

---

### Task 1.2 — MasteryService
**Parallel safe:** No — other services depend on this

**Agent goal:**
Build the MasteryService that wraps the four core PostgreSQL functions. This is the only place in the application where mastery state is modified.

**Context to load:**
- `docs/16_system_architecture.md` (Section 6.2)
- `lib/supabase.ts`
- `lib/constants.ts`
- `types/database.ts`

**Deliverables:**
```
services/
  MasteryService.ts
  MasteryService.test.ts
```

**Service interface:**
```typescript
// services/MasteryService.ts

export type AnswerEvent =
  | 'correct_no_hint'
  | 'correct_with_hint'
  | 'correct_explanation'
  | 'incorrect_conceptual'
  | 'incorrect_repeated'

export interface InteractionResult {
  isCorrect:          boolean
  masteryBefore:      number
  masteryAfter:       number
  masteryDelta:       number
  masteryStatus:      string
  newSkillUnlocked:   boolean
  unlockedSkillIds:   string[]
}

export const MasteryService = {
  processAnswer: async (
    studentId: string,
    skillId: string,
    questionId: string,
    conceptId: string,
    sessionId: string,
    studentAnswer: string,
    correctAnswer: string,
    isCorrect: boolean,
    hintUsed: boolean,
    misconceptionId: string | null,
    classifierType: 'rule_based' | 'llm',
    responseTimeMs?: number
  ): Promise<InteractionResult>,

  initStudentSkills: async (studentId: string, conceptId?: string): Promise<void>,
  getNextSkill:      async (studentId: string, conceptId?: string): Promise<string | null>,
}
```

**Implementation notes for the agent:**
- `processAnswer` must: determine the `AnswerEvent` from `isCorrect` and `hintUsed`, call `update_mastery()` PostgreSQL function via Supabase RPC, call `check_and_unlock_skills()`, call `log_misconception()` if `misconceptionId` is not null, call `update_question_stats()`, then insert a complete row into the `interactions` table
- The `interactions` table is immutable — never update or delete rows
- Fetch mastery before and after the update to compute delta and return in result

**Acceptance criteria:**
- Call `MasteryService.processAnswer()` with a hardcoded student ID and skill `MS-01`
- Open Supabase table editor → `student_skill_state` → mastery_score has updated
- Open `interactions` table → one new row exists with all fields populated
- No row exists in `interactions` with null `session_id` or null `question_id`

---

### Task 1.3 — MisconceptionClassifier (Rule-Based)
**Parallel safe:** Yes — can run after 1.1, parallel with 1.2

**Agent goal:**
Build the rule-based misconception classifier. At MVP this is a deterministic lookup — every multiple choice distractor was pre-mapped to a misconception when the question was written. No AI inference at this stage.

**Context to load:**
- `docs/16_system_architecture.md` (Section 6.3)
- `types/database.ts`
- `lib/supabase.ts`

**Deliverables:**
```
services/
  MisconceptionClassifier.ts
  MisconceptionClassifier.test.ts
```

**Service interface:**
```typescript
export interface ClassifierResult {
  misconceptionId:  string | null
  confidence:       number | null   // always null for rule_based
  classifierType:   'rule_based' | 'llm'
  reasoning:        string | null   // always null for rule_based
}

export const MisconceptionClassifier = {
  classify: async (
    questionId: string,
    studentAnswer: string,
    correctAnswer: string
  ): Promise<ClassifierResult>
}
```

**Implementation notes:**
- On first call, load the distractor-to-misconception mapping from the `questions` table
- The questions table has a `distractors` JSONB field containing `[{answer, misconception_id}]`
- Cache the mapping in memory for the process lifetime — do not re-query on every classification
- If student answer matches a distractor with a `misconception_id`, return it
- If no match, return `{ misconceptionId: null, ... }`
- Never throw — always return a result

**Acceptance criteria:**
- Given `questionId` for an addition question, answer `"2/7"` returns `misconceptionId: "M1"`
- Given the correct answer, returns `misconceptionId: null`
- Given an answer not in the distractor list, returns `misconceptionId: null`
- Cache is populated on first call, not re-queried on subsequent calls

---

### Task 1.4 — SessionService
**Parallel safe:** No — depends on 1.2 and 1.3

**Agent goal:**
Build the SessionService that manages session lifecycle — creation, question selection, and summary generation.

**Context to load:**
- `docs/16_system_architecture.md` (Section 6.1, 6.4)
- `services/MasteryService.ts`
- `types/database.ts`

**Deliverables:**
```
services/
  SessionService.ts
  QuestionSelector.ts
  SessionService.test.ts
```

**SessionService interface:**
```typescript
export interface SessionStartResult {
  sessionId:      string
  skillId:        string
  skill:          MicroSkill
  isNewSkill:     boolean       // true if student has never attempted this skill
  introVideoUrl:  string | null // non-null only if isNewSkill = true
  firstQuestion:  Question
}

export interface SessionSummary {
  questionsAnswered:  number
  skillsImproved:     Array<{ skillName: string; before: number; after: number }>
  skillsMastered:     string[]
  activeMisconceptions: ActiveMisconception[]
  sessionDurationMin: number
}

export const SessionService = {
  startSession: async (studentId: string): Promise<SessionStartResult>,
  endSession:   async (sessionId: string, studentId: string): Promise<SessionSummary>,
}
```

**QuestionSelector interface:**
```typescript
export const QuestionSelector = {
  selectQuestion: async (
    skillId: string,
    studentId: string,
    sessionId: string,
    masteryScore: number
  ): Promise<Question>
}
```

**QuestionSelector difficulty logic:**
```
masteryScore < 0.30   → prefer difficulty_weight ≤ 0.7
masteryScore 0.30–0.60 → prefer difficulty_weight 0.8–1.2
masteryScore 0.60–0.80 → prefer difficulty_weight 1.2–1.6
```
Exclude questions already answered in the current session. Fall back to any unanswered question if no difficulty-matched question is available.

**Acceptance criteria:**
- `startSession()` returns a valid `SessionStartResult` with a real question from the DB
- `isNewSkill = true` returns a non-null `introVideoUrl` (even if the URL is a placeholder)
- `endSession()` returns a summary with accurate `questionsAnswered` count
- `QuestionSelector` never returns the same question twice in one session

---

### Task 1.5 — Core API Routes
**Parallel safe:** No — depends on 1.4

**Agent goal:**
Build the five core API route handlers. Routes are thin — validate input, call a service, return typed response. No business logic in route handlers.

**Context to load:**
- `docs/16_system_architecture.md` (Section 5)
- All services from Tasks 1.2–1.4

**Deliverables:**
```
app/api/
  sessions/
    start/route.ts
    [id]/
      end/route.ts
      next-question/route.ts
  answers/
    submit/route.ts
  students/
    [id]/
      progress/route.ts
  dashboard/
    [token]/route.ts
```

**Route contracts — implement exactly as defined in doc 16, Section 5.1**

Key implementation rules:
- All routes use the Supabase service role key (server-side only)
- `POST /api/answers/submit` calls `MisconceptionClassifier.classify()` then `MasteryService.processAnswer()` — in that order
- `GET /api/dashboard/[token]` looks up student by `students.dashboard_token`, returns 401 if not found
- All routes return typed JSON — no untyped `any` in response bodies
- All routes catch errors and return structured `{ error: string }` with appropriate HTTP status

**Acceptance criteria:**
- `POST /api/sessions/start` with a valid `studentId` returns HTTP 200 with a session ID and first question
- `POST /api/answers/submit` with a correct answer returns `isCorrect: true` and a positive `masteryDelta`
- `POST /api/answers/submit` with answer `"2/7"` for a denominator-addition question returns `misconceptionDetected.id: "M1"`
- `GET /api/dashboard/[token]` with a valid token returns student progress data
- All routes return HTTP 400 for missing required fields
- Browser agent can verify all routes via the Antigravity browser subagent

**Week 1 completion gate:**
Before starting Week 2, verify end-to-end:
```
POST /api/sessions/start → session created
POST /api/answers/submit (correct) → mastery updates in Supabase
POST /api/answers/submit (answer "2/7") → misconception M1 detected
GET /api/students/[id]/progress → returns skill states
```
If any of these fail, do not start UI work.

---

## 4. Week 2 — Session Screen Core

**Goal for the week:** A functional session screen that a student can use to answer questions and receive feedback. Ugly is fine. Functional is required.

---

### Task 2.1 — Session State Machine
**Parallel safe:** No — all session components depend on this

**Agent goal:**
Build the client-side session state machine as a React hook. This is the core logic of the student experience — it owns the 8-state session flow.

**Context to load:**
- `docs/13_student_learning_interface.md` (Section 9 — state machine)
- `app/api/sessions/start/route.ts`
- `app/api/answers/submit/route.ts`

**Deliverables:**
```
hooks/
  useSession.ts
```

**State machine:**
```typescript
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

export interface UseSessionReturn {
  state:                SessionState
  currentQuestion:      Question | null
  currentSkill:         MicroSkill | null
  introVideoUrl:        string | null
  remediationVideoUrl:  string | null
  feedbackData:         InteractionResult | null
  sessionSummary:       SessionSummary | null
  startSession:         (studentId: string) => Promise<void>
  submitAnswer:         (answer: string) => Promise<void>
  requestHint:          () => void
  proceedToNext:        () => Promise<void>
  endSession:           () => Promise<void>
}
```

**State transition rules — implement exactly:**
- `IDLE → INTRO_VIDEO`: `startSession()` called, `isNewSkill = true`
- `IDLE → QUESTION_ACTIVE`: `startSession()` called, `isNewSkill = false`
- `INTRO_VIDEO → QUESTION_ACTIVE`: `proceedToNext()` called (skip or ready)
- `QUESTION_ACTIVE → HINT_SHOWN`: `requestHint()` called
- `HINT_SHOWN → EVALUATING`: `submitAnswer()` called
- `QUESTION_ACTIVE → EVALUATING`: `submitAnswer()` called
- `EVALUATING → FEEDBACK_CORRECT`: API returns `isCorrect: true`, mastery < 0.80
- `EVALUATING → SKILL_MASTERED`: API returns `isCorrect: true`, mastery ≥ 0.80
- `EVALUATING → FEEDBACK_MISCONCEPTION`: API returns `misconceptionDetected !== null`
- `EVALUATING → FEEDBACK_INCORRECT`: API returns `isCorrect: false`, no misconception
- `FEEDBACK_MISCONCEPTION → INTRO_VIDEO`: `proceedToNext()` called (loads remediation clip)
- All FEEDBACK states → `QUESTION_ACTIVE`: `proceedToNext()` called
- `SKILL_MASTERED → QUESTION_ACTIVE`: `proceedToNext()` called (loads next skill)
- Any state → `SESSION_COMPLETE`: `endSession()` called

**Acceptance criteria:**
- State transitions are deterministic — same inputs always produce same state
- `EVALUATING` never lasts more than 300ms before transitioning (loading state, not stuck)
- Hook re-renders only on state change — no unnecessary renders
- Hook is testable without rendering a component

---

### Task 2.2 — FractionBar SVG Component
**Parallel safe:** Yes — can run parallel with 2.1

**Agent goal:**
Build the FractionBar SVG component. This is the primary visual teaching tool and must render correctly on a 320px wide phone screen.

**Context to load:**
- `docs/13_student_learning_interface.md` (Section 7.1)

**Deliverables:**
```
components/
  FractionBar.tsx
```

**Component interface:**
```typescript
interface FractionBarProps {
  numerator:   number
  denominator: number
  label?:      string         // defaults to "numerator/denominator"
  highlighted?: number[]      // segment indices to highlight differently
  size?:       'sm' | 'md' | 'lg'   // default 'md'
  color?:      string         // filled segment color, default blue
}
```

**Rendering rules:**
- Each segment is a rectangle with a visible border
- Filled segments (index < numerator) use the fill color
- Empty segments use white with grey border
- Label renders below the bar, centered, in format "3/5"
- At 320px container width: segments must be at least 20px wide — if `denominator > 12`, reduce segment width proportionally
- Two FractionBars can be rendered side by side for comparison questions

**Acceptance criteria:**
- `<FractionBar numerator={3} denominator={5} />` renders 5 segments, 3 filled
- `<FractionBar numerator={1} denominator={8} />` renders correctly at 320px width
- No segment overlaps or overflows at any denominator from 1 to 12
- Browser agent verifies rendering at mobile viewport (375px)

---

### Task 2.3 — VideoPlayer Component
**Parallel safe:** Yes — can run parallel with 2.1

**Agent goal:**
Build the VideoPlayer component used for both intro explanation videos (Phase 1A) and remediation clips (Phase 1B).

**Context to load:**
- `docs/13_student_learning_interface.md` (Sections 5.2, 5.3)

**Deliverables:**
```
components/
  VideoPlayer.tsx
```

**Component interface:**
```typescript
interface VideoPlayerProps {
  videoUrl:       string
  title:          string
  durationSec:    number
  type:           'intro' | 'remediation'
  onReady?:       () => void    // fires after 10s for intro, on end for remediation
  onSkip?:        () => void    // only available for intro type
  studentAnswer?: string        // shown above video for remediation type
}
```

**Behaviour rules:**
- **Intro type:** autoplay, captions on, sound off by default. "Skip" button visible from start. "I'm ready" button activates only after 10 seconds. Both buttons call `onReady()`.
- **Remediation type:** autoplay. No skip. `onReady()` fires only when video ends — not before. `studentAnswer` prop renders above the player in format "You answered: [answer]".
- If video URL fails to load within 5 seconds: hide the player, render a text-based step explanation fallback (static text, not fetched).
- Captions: if the video has a `.vtt` file at `videoUrl.replace('.mp4', '.vtt')`, load it. If not, no captions — do not error.

**Acceptance criteria:**
- Intro video: "I'm ready" button is disabled for first 10 seconds, then enables
- Remediation video: "Try again" button does not appear until video ends
- Load failure: fallback text renders within 5 seconds, no broken video element
- Browser agent verifies both types at mobile viewport

---

### Task 2.4 — Session Screen Page
**Parallel safe:** No — depends on 2.1, 2.2, 2.3

**Agent goal:**
Build the session screen page (`/session`) wiring together the state machine hook and all visual components. This is the core product screen.

**Context to load:**
- `docs/13_student_learning_interface.md` (Sections 5.1–5.5)
- `hooks/useSession.ts`
- `components/FractionBar.tsx`
- `components/VideoPlayer.tsx`

**Deliverables:**
```
app/session/
  page.tsx
  components/
    SessionContextBar.tsx
    QuestionCard.tsx
    AnswerOptions.tsx
    FeedbackPanel.tsx
    MasteryBar.tsx
    SkillUnlockScreen.tsx
    SessionSummaryScreen.tsx
    HintButton.tsx
```

**Component responsibilities:**

`SessionContextBar` — skill breadcrumb + soft progress indicator. Never shows a timer.

`QuestionCard` — Zone 2 (visual) + Zone 3 (question text). Selects visual type based on `question.visual_type` field: renders `FractionBar` for `fraction_bar`, plain text for `none`.

`AnswerOptions` — Renders multiple choice options. Disables all options after submission. Selected option highlighted before submission.

`FeedbackPanel` — Renders one of four states based on `useSession` state:
- `FEEDBACK_CORRECT`: green checkmark, explanation, mastery bar growth
- `FEEDBACK_MISCONCEPTION`: "Not quite. You answered X." + video player entry point
- `FEEDBACK_INCORRECT`: step walkthrough from `question.explanation`
- `SKILL_MASTERED`: full-screen celebration — skill name, "Mastered", next skill name

`MasteryBar` — Horizontal bar, fills based on `masteryAfter`. Never animates downward.

`HintButton` — Single tap reveals hint text inline. Logs hint usage via `requestHint()`.

**Layout rules (from doc 13):**
- Phase 1 (video): full screen, no competing elements
- Phase 2 (question): four zones stacked vertically — context bar, visual space, question+answer, hint
- Phase 3 (feedback): full screen, single CTA to proceed
- No timers anywhere on the screen

**Hardcode for MVP:** `studentId = 'student-001'`. No auth, no login.

**Acceptance criteria:**
- Browser agent can complete a full question cycle: load → answer → feedback → next question
- Answering "2/7" for an addition question triggers `FEEDBACK_MISCONCEPTION` state
- Answering correctly 6+ times on MS-01 triggers `SKILL_MASTERED` state
- "I'm ready" on intro video transitions to `QUESTION_ACTIVE`
- Remediation clip "Try again" only appears after video ends
- All transitions work on mobile viewport (375px)

---

## 5. Week 3 — Remaining Screens

**Goal for the week:** Progress screen, home screen, and parent dashboard. End-to-end navigation working.

---

### Task 3.1 — Progress Screen
**Parallel safe:** Yes

**Agent goal:**
Build the progress screen (`/progress`) showing skill-by-skill mastery status for a student.

**Context to load:**
- `docs/13_student_learning_interface.md` (Section 6)
- `app/api/students/[id]/progress/route.ts`

**Deliverables:**
```
app/progress/
  page.tsx
```

**Rendering rules (from doc 13):**
- Server component — fetch data at render time via `GET /api/students/[id]/progress`
- Show all 8 skills in `position` order
- Mastered: green checkmark + "Mastered"
- Active/developing: arrow + mastery % + bar
- Locked/not started: lock icon + "Not started" — no percentage
- One CTA: "Continue Learning" → routes to `/session`
- "Overall: X of 8 skills mastered" summary line at bottom

**Acceptance criteria:**
- Shows correct mastery status for each skill after test interactions
- "Not started" skills show lock icon, no percentage
- "Continue Learning" navigates to `/session`
- Renders correctly at 375px mobile viewport

---

### Task 3.2 — Home Screen
**Parallel safe:** Yes

**Agent goal:**
Build the home screen (`/`). One screen, one button, one purpose — get the student into a session.

**Context to load:**
- `docs/13_student_learning_interface.md` (Section 4)
- `app/api/students/[id]/progress/route.ts`

**Deliverables:**
```
app/
  page.tsx
```

**Rendering rules:**
- Server component
- Shows student name, current skill name, current mastery bar
- One primary CTA: "Continue Learning" → navigates to `/session`
- One secondary link: "View my progress" → navigates to `/progress`
- Hardcode `studentId = 'student-001'` at MVP

**Acceptance criteria:**
- Displays correct current skill name from `get_next_skill()` result
- Mastery bar reflects actual mastery score from DB
- Navigation to both `/session` and `/progress` works

---

### Task 3.3 — Parent Dashboard
**Parallel safe:** Yes

**Context to load:**
- `docs/14_parent_dashboard.md` (Sections 6, 7, 8, 9)
- `app/api/dashboard/[token]/route.ts`

**Deliverables:**
```
app/dashboard/
  [token]/
    page.tsx
    components/
      LearningSummary.tsx
      ConceptProgress.tsx
      MisconceptionInsights.tsx
      SessionActivity.tsx
```

**Rendering rules (from doc 14):**

`LearningSummary` — four metric tiles: skills mastered, concept mastery %, sessions completed, questions answered. "Currently working on" skill with mastery bar.

`ConceptProgress` — full skill list with mastered/developing/locked states. Mirrors progress screen but in parent language — "Not started" not "Locked".

`MisconceptionInsights` — maximum 2 active misconceptions. Each card shows: plain-language name (from language translation table in doc 14), occurrence count, concrete wrong answer example, what the system is doing, what parent can do at home. If zero misconceptions: "No active misconceptions — great sign."

`SessionActivity` — current week, day by day. Tick for session completed, dash for no session. Each session row shows question count and approximate duration.

**Access model:** Route handler looks up student by `dashboard_token` UUID in URL. Returns 404 page if token not found. No login required.

**Generate a test token:**
```sql
update students
  set dashboard_token = 'test-token-001'
  where id = 'student-001';
```
Test at `/dashboard/test-token-001`.

**Acceptance criteria:**
- `/dashboard/invalid-token` renders a 404 page, not an error
- `MisconceptionInsights` shows plain-language names, not internal labels (e.g. "Adding denominators together" not "Denominator Addition Error")
- `SessionActivity` shows correct tick/dash for each day of the current week
- Renders correctly at 375px mobile viewport

---

## 6. Week 4 — Integration and Question Bank

**Goal for the week:** Full end-to-end flow verified. Question bank expanded to 8 per skill. All content gaps closed before video production begins.

---

### Task 4.1 — End-to-End Integration Test
**Parallel safe:** No

**Agent goal:**
Use Antigravity's browser subagent to walk through the complete student journey from home screen to skill mastery, verifying every state transition and data update.

**Test sequence for the browser agent:**
```
1. Navigate to /
   → Verify: student name, current skill, mastery bar visible

2. Click "Continue Learning"
   → Verify: intro video plays (or question loads if returning skill)

3. Answer 8 questions on MS-01
   → Mix: 5 correct (no hint), 2 with hint, 1 wrong (answer "2/7")
   → Verify after wrong answer: FEEDBACK_MISCONCEPTION state, remediation clip loads
   → Verify after hint: HINT_SHOWN state, hint text visible, hint button gone
   → Verify mastery bar increases on correct answers

4. Achieve mastery on MS-01 (masteryScore ≥ 0.80)
   → Verify: SKILL_MASTERED screen appears
   → Verify: MS-02 is now unlocked in Supabase student_skill_state

5. Navigate to /progress
   → Verify: MS-01 shows "Mastered" with checkmark
   → Verify: MS-02 shows "Developing" or appropriate status
   → Verify: MS-03 through MS-08 show "Not started" with lock icon

6. Navigate to /dashboard/test-token-001
   → Verify: skills mastered count = 1
   → Verify: MisconceptionInsights shows M1 if it was triggered in step 3
   → Verify: SessionActivity shows today's session with tick
```

**Acceptance criteria:**
- All 6 steps complete without errors
- Supabase `interactions` table has correct rows for every answer submitted
- Supabase `student_skill_state` reflects correct mastery for both MS-01 and MS-02
- Zero console errors in browser during entire flow

---

### Task 4.2 — Question Bank Completion
**Parallel safe:** Yes — no code changes, DB only

**Not an Antigravity agent task.** Done manually in Supabase Table Editor.

Write and insert questions until each skill has minimum 8:

| Skill | Current | Need | Priority |
|---|---|---|---|
| MS-01: What is a Fraction? | 4 | 4 more | High |
| MS-02: Fractions on Number Line | 3 | 5 more | High |
| MS-03: Equivalent Fractions | 3 | 5 more | High |
| MS-04: Simplifying Fractions | 4 | 4 more | High |
| MS-05: Comparing Fractions | 3 | 5 more | High |
| MS-06: Adding (Same Denom.) | 3 | 5 more | High |
| MS-07: Adding (Diff. Denom.) | 4 | 4 more | High |
| MS-08: Subtracting Fractions | 4 | 4 more | High |

**For each new question, ensure:**
- Every wrong answer maps to a known misconception ID in the `distractors` JSONB field
- `explanation` field teaches the concept, not just states the answer
- `hint_text` narrows the problem without giving it away
- `difficulty_weight` is set (0.5 / 1.0 / 1.5 / 2.0)

**Question format in Supabase:**
```json
{
  "question_text": "Calculate: 3/8 + 2/8",
  "correct_answer": "5/8",
  "explanation": "Same denominator — add the top numbers: 3+2=5. Keep the bottom: 8. Answer: 5/8.",
  "hint_text": "The denominators are the same. What do you do with the top numbers?",
  "difficulty_weight": 1.0,
  "distractors": [
    {"answer": "5/16", "misconception_id": "M1"},
    {"answer": "6/8",  "misconception_id": null},
    {"answer": "1/8",  "misconception_id": null}
  ]
}
```

**Completion gate:** Do not start Week 5 (video production) until all 64 questions are in the DB and the integration test in Task 4.1 passes with the full question bank.

---

## 7. Weeks 5–6 — Video Production and Delivery

**Goal for the weeks:** All 14 MVP videos recorded, uploaded, and verified playing in the student interface on a mobile device.

---

### Task 5.1 — Video Storage Setup
**Parallel safe:** Yes — setup before recording

**Agent goal:**
Add video URL columns to the database and create the video URL configuration in the application.

**Deliverables:**
SQL migration to run in Supabase:
```sql
alter table micro_skills
  add column if not exists intro_video_url        text,
  add column if not exists intro_video_length_sec integer;

alter table misconception_types
  add column if not exists remediation_video_url        text,
  add column if not exists remediation_video_length_sec integer;
```

**Acceptance criteria:**
- Both `alter table` statements execute without error
- `types_v2.ts` is updated to include the new columns

---

### Task 5.2 — Record 14 Videos
**Not an Antigravity task.** Done by the founder.

Record in this order — skills first, misconceptions second:

**Intro videos (record in skill order):**
1. `V-MS01` — What is a Fraction? (90s)
2. `V-MS02` — Fractions on a Number Line (75s)
3. `V-MS03` — Equivalent Fractions (90s)
4. `V-MS04` — Simplifying Fractions (90s)
5. `V-MS05` — Comparing Fractions (75s)
6. `V-MS06` — Adding Same Denominator (60s)
7. `V-MS07` — Adding Different Denominators (90s)
8. `V-MS08` — Subtracting Fractions (75s)

**Remediation clips:**
9. `R-M1` — Why we don't add denominators (35s)
10. `R-M2` — Numerator vs denominator (30s)
11. `R-M3` — Both parts must change (30s)
12. `R-M4` — Always simplify (25s)
13. `R-M5` — Finding the right LCM (30s)
14. `R-M6` — Comparing by denominator not numerator (35s)

Each video: compress to 720p, ≤5MB. Full production guidelines in `docs/15_content_authoring_system.md`, Section 8.2.

---

### Task 5.3 — Video Upload and URL Population
**Parallel safe:** No — depends on 5.2

**Agent goal:**
Upload videos to Supabase Storage and write URLs back to the database.

**Upload to Supabase Storage:**
- Bucket name: `teaching-videos`
- Folder structure: `intro/` and `remediation/`
- File naming: `intro_MS-01_what-is-a-fraction.mp4`

**After upload, update DB:**
```sql
update micro_skills set
  intro_video_url = 'https://[project].supabase.co/storage/v1/object/public/teaching-videos/intro/intro_MS-01_what-is-a-fraction.mp4',
  intro_video_length_sec = 84
where id = 'MS-01';
-- repeat for MS-02 through MS-08

update misconception_types set
  remediation_video_url = 'https://[project].supabase.co/storage/v1/object/public/teaching-videos/remediation/remediation_M1_denominator-addition-error.mp4',
  remediation_video_length_sec = 32
where id = 'M1';
-- repeat for M2 through M6
```

**Acceptance criteria:**
- All 14 video URLs are populated in the DB
- Browser agent plays each video at `/session` — no broken video elements
- Videos load within 3 seconds on a mobile connection (test with Chrome DevTools throttling → Fast 4G)
- VideoPlayer fallback text does NOT appear for any video (confirms successful load)

---

## 8. Weeks 7–8 — Mobile Polish and Beta Readiness

**Goal for the weeks:** Product is usable by a real student on a mid-range Android phone. No known errors. First 3 beta students onboarded.

---

### Task 7.1 — Mobile Optimisation Pass
**Parallel safe:** No — requires all screens complete

**Agent goal:**
Use the Antigravity browser subagent to audit all screens at 375px viewport and fix every mobile issue.

**Browser agent audit checklist:**
```
□ All tap targets ≥ 44×44px
□ FractionBar renders correctly for all denominators 1–12 at 320px
□ Answer options readable at 14px minimum font size
□ FeedbackPanel fully readable without scrolling at 375px
□ VideoPlayer controls are tap-friendly (no tiny buttons)
□ Progress screen skill list scrolls smoothly
□ Parent dashboard sections are readable without horizontal scroll
□ No text overflows container boundaries
□ No hover-only interactions — all interactions work on touch
```

**Acceptance criteria:**
- Browser agent screenshots show zero layout breaks at 375px
- All checklist items pass

---

### Task 7.2 — Error Handling and Fallbacks
**Parallel safe:** Yes — can run parallel with 7.1

**Agent goal:**
Implement all error handling and fallback states defined in the architecture document.

**Context to load:**
- `docs/16_system_architecture.md` (Section 13.3)

**Fallbacks to implement:**

| Failure scenario | Implementation |
|---|---|
| Video fails to load in 5s | Hide player, show `question.explanation` as step-by-step text |
| `POST /api/answers/submit` fails | Show "Connection issue — try again" inline, do not lose the student's selected answer |
| `GET /api/sessions/start` fails | Show "Something went wrong — refresh to try again" |
| LLM classifier timeout (V2 prep) | Already falls back to rule-based in `MisconceptionClassifier.classify()` — verify this works |
| Question bank exhausted for a skill | Return the least-recently-seen question rather than throwing |

**Acceptance criteria:**
- Simulate video load failure: fallback text appears within 5 seconds
- Simulate API failure with DevTools offline mode: "try again" message appears, no crash
- No unhandled promise rejections in browser console under any failure condition

---

### Task 7.3 — Student Onboarding Script
**Not an Antigravity task.** SQL run in Supabase, done by founder.

Run for each beta student before their first session:
```sql
-- Create student record
insert into students (id, name, grade, dashboard_token)
values (
  uuid_generate_v4(),
  'Student Name',
  5,
  uuid_generate_v4()    -- becomes their parent dashboard token
);

-- Initialise skill states for fractions
select init_student_skills('[student-uuid]', 'FRAC');

-- Retrieve their dashboard token to send to parent
select name, dashboard_token from students where name = 'Student Name';
```

Send the parent their dashboard link:
```
https://alip.app/dashboard/[dashboard_token]
```

---

### Task 7.4 — Final Pre-Beta Verification
**Parallel safe:** No — final gate

**Agent goal:**
Full browser agent regression test across all screens and all error states before the first beta student is onboarded.

**Full regression checklist:**

```
HOME SCREEN
□ Correct student name and current skill displayed
□ "Continue Learning" navigates to /session
□ "View my progress" navigates to /progress

SESSION SCREEN — happy path
□ Intro video plays for new skill
□ "I'm ready" activates after 10s
□ Question loads after video
□ Correct answer → FEEDBACK_CORRECT state
□ Mastery bar increases
□ "Next" loads next question
□ After 6–8 correct answers → SKILL_MASTERED state
□ Next skill unlocks and loads

SESSION SCREEN — misconception path
□ Wrong answer mapping to M1 → FEEDBACK_MISCONCEPTION
□ Remediation clip plays
□ "Try again" appears only after video ends
□ New question loads (not same question)

SESSION SCREEN — hint path
□ "Need a hint?" tap reveals hint text
□ Hint button disappears after use
□ Answer after hint → correct_with_hint event logged

PROGRESS SCREEN
□ MS-01 shows Mastered after mastery achieved
□ All other skills show correct status
□ "Continue Learning" navigates to /session

PARENT DASHBOARD
□ Valid token → dashboard loads with correct data
□ Invalid token → 404 page, no error
□ Misconceptions show plain-language names
□ Sessions this week shows correct day-by-day activity

MOBILE (375px)
□ All screens layout correctly
□ All tap targets functional
□ Videos play without buffering
```

**Acceptance criteria:**
- All checklist items pass in browser agent run
- Zero console errors across all screens
- Zero unhandled promise rejections
- First beta student can complete a full session without founder intervention

---

## 9. Definition of Done — MVP

The MVP is complete when all of the following are true:

```
□ Pre-development: Supabase schema deployed, all row counts verified
□ Week 1: Core API routes pass end-to-end test
□ Week 2: Session screen completes full question cycle in browser agent
□ Week 3: All three screens navigable
□ Week 4: End-to-end integration test passes, 64 questions in DB
□ Week 5–6: All 14 videos playing in interface on mobile
□ Week 7: Mobile audit passes, all tap targets and layouts verified
□ Week 8: Final regression checklist passes with zero errors
□ Week 8: First beta student completes a session without errors
□ Week 8: First parent dashboard link sent and verified loading
```

---

## 10. V2 Engineering Backlog

Not in scope for 8-week MVP. Defined here for planning continuity.

| Feature | Estimated effort | Trigger |
|---|---|---|
| Row Level Security (RLS) on student tables | 1 day | Before any public launch |
| Parent magic link login | 2 days | When parent count > 10 |
| LLM misconception classifier | 3 days | When free-text answers added |
| AI video pipeline (Manim + ElevenLabs + FFmpeg) | 2 weeks | When manual video production is the bottleneck |
| Basic authoring UI | 1 week | When first external content contributor joins |
| Automated WhatsApp summary (Twilio / 360dialog) | 2 days | When weekly manual sends take > 2 hours |
| Science content + renderer | 3 weeks | After fractions validation complete |
| Teacher class dashboard | 1 week | First tuition centre B2B customer |
| Skill mastery trend charts | 2 days | V2 parent dashboard upgrade |

---

*Document version: 1.0*  
*Scope: 8-week MVP engineering plan*  
*IDE: Google Antigravity*  
*Last updated: March 2026*
