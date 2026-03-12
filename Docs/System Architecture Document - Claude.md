# 16. System Architecture
## Adaptive Learning Intelligence Platform

**Document type:** Technical Architecture Specification  
**Scope:** Full system architecture — current state, MVP implementation, and scaling path  
**MVP reality:** Next.js + Supabase. No separate microservices. No standalone AI orchestrator.  
**Design principle:** Build the simplest architecture that can serve 10 beta students today and 10,000 students at V3 without a full rewrite.

---

## 1. Architecture Philosophy

Two failure modes exist for early-stage platform architecture:

**Over-engineering:** Building distributed microservices, message queues, and ML pipelines before you have paying users. This kills momentum and burns the part-time hours available.

**Under-engineering:** Hardcoding logic, skipping separation of concerns, and building in a way that requires a full rewrite to scale. This kills momentum later.

The right path is deliberate simplicity with clear extension points. At MVP: monolithic Next.js app backed by Supabase. Business logic lives in PostgreSQL functions — not in application code — which means it is database-portable and independently testable from day one. When scale demands it, services are extracted from the monolith along the seams already defined.

**The seams are already defined.** The schema, functions, views, and TypeScript types built in migrations 001 and 002 are the foundation. Everything above the database is a UI layer over what already exists.

---

## 2. Current State — What Exists Today

Nothing has been deployed or executed yet. Development starts from scratch.

**What exists as designed artefacts (not yet deployed):**

| Artefact | Status | Location |
|---|---|---|
| `001_initial_schema.sql` | Written, not executed | `schema/001_initial_schema.sql` |
| `002_seed_data.sql` | Written, not executed | `schema/002_seed_data.sql` |
| `types_v2.ts` | Written, not integrated | `src/types/database.ts` |
| Fractions data model | Designed, not in DB | Defined in seed file |

**What does not exist yet:**

- Supabase project (not created)
- Next.js project (not initialised)
- Database tables, views, functions (not executed)
- Any frontend pages or components
- API route handlers
- Video files
- Parent dashboard
- Any running infrastructure

**The starting sequence before any code is written:**

```
Step 1  Create Supabase project at supabase.com
Step 2  Run 001_initial_schema.sql in Supabase SQL editor
Step 3  Run 002_seed_data.sql in Supabase SQL editor
Step 4  Verify: Tables, views, functions, seed data all present
Step 5  Initialise Next.js project: npx create-next-app@latest alip
Step 6  Install Supabase client: npm install @supabase/supabase-js
Step 7  Copy types_v2.ts → src/types/database.ts
Step 8  Configure .env.local with Supabase URL and keys
Step 9  Begin building API routes and services
```

Steps 1–8 are pre-development setup. Steps 1–4 happen in the Supabase dashboard. Steps 5–8 happen in the AI IDE. Only at Step 9 does feature development begin.

This document describes the architecture that will be built through that process.

---

## 3. System Layers

The platform has five logical layers. At MVP, layers 1–3 are collapsed into a single Next.js application. Layers 4 and 5 are external services.

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Student Interface                                 │
│  Next.js pages + React components                           │
│  /session  /progress  /  /dashboard/[token]                 │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: API Routes                                        │
│  Next.js App Router API handlers                            │
│  POST /api/sessions  POST /api/answers  GET /api/progress   │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: Application Services                              │
│  TypeScript service modules                                 │
│  SessionService  MasteryService  MisconceptionClassifier    │
├─────────────────────────────────────────────────────────────┤
│  Layer 4: Data Layer                                        │
│  Supabase / PostgreSQL                                      │
│  Schema + functions + views (already built)                 │
├─────────────────────────────────────────────────────────────┤
│  Layer 5: External Services                                 │
│  Cloudflare Stream  ElevenLabs  LLM API  FFmpeg pipeline    │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Layer 1 — Student Interface

**Technology:** Next.js 14 App Router, React, TypeScript, TailwindCSS

**Pages (MVP):**

| Route | Purpose | Data sources |
|---|---|---|
| `/` | Home — student select, current skill, start session | `student_skill_state`, `get_next_skill()` |
| `/session` | Active learning screen — video, question, feedback | `questions`, `update_mastery()`, `check_and_unlock_skills()` |
| `/progress` | Skill-by-skill mastery overview | `v_student_skill_profile` |
| `/dashboard/[token]` | Parent dashboard — read-only, no login | `v_concept_mastery`, `v_active_misconceptions`, `sessions` |

**Component architecture:**

```
app/
  page.tsx                    → Home screen
  session/
    page.tsx                  → Session screen (state machine)
    components/
      VideoPlayer.tsx         → Phase 1A intro / Phase 1B remediation
      QuestionCard.tsx        → Zone 2 + 3: visual + question
      FractionBar.tsx         → SVG fraction visualisation
      AnswerOptions.tsx       → Multiple choice input
      FeedbackPanel.tsx       → Phase 3: correct/incorrect/misconception
      MasteryBar.tsx          → Progress indicator
      SkillUnlock.tsx         → Mastery celebration screen
      SessionSummary.tsx      → End of session summary
  progress/
    page.tsx                  → Skill progress screen
  dashboard/
    [token]/
      page.tsx                → Parent dashboard
      components/
        LearningSummary.tsx
        ConceptProgress.tsx
        MisconceptionInsights.tsx
        SessionActivity.tsx
```

The session screen is a client component managing the session state machine (8 states defined in doc 13). All other pages are server components that fetch data at render time.

---

## 5. Layer 2 — API Routes

**Technology:** Next.js App Router API handlers (`/app/api/`)

At MVP, API routes are thin — they validate input, call a service function, and return a response. No business logic lives in the route handlers themselves.

### 5.1 Core API Endpoints

**POST `/api/sessions/start`**
```typescript
// Request
{ studentId: string }

// Response
{
  sessionId: string,
  skillId: string,        // from get_next_skill()
  skill: MicroSkill,
  introVideoUrl: string | null,   // null if returning to in-progress skill
  firstQuestion: Question
}
```

**POST `/api/answers/submit`**
```typescript
// Request
{
  sessionId: string,
  studentId: string,
  skillId: string,
  conceptId: string,
  questionId: string,
  studentAnswer: string,
  hintUsed: boolean,
  responseTimeMs?: number
}

// Response
{
  isCorrect: boolean,
  masteryBefore: number,
  masteryAfter: number,
  masteryDelta: number,
  masteryStatus: MasteryStatus,
  misconceptionDetected: MisconceptionType | null,
  classifierType: 'rule_based' | 'llm',
  remediationVideoUrl: string | null,
  explanation: string,
  nextSkillId: string | null,
  newSkillUnlocked: boolean,
  nextQuestion: Question | null    // null if skill mastered
}
```

**GET `/api/sessions/[sessionId]/next-question`**
```typescript
// Response
{
  question: Question,
  skillId: string,
  visualType: 'fraction_bar' | 'number_line' | 'step_reference' | 'none',
  visualParams: Record<string, unknown> | null
}
```

**GET `/api/students/[studentId]/progress`**
```typescript
// Response
{
  conceptMastery: ConceptMasteryRow[],
  skills: StudentSkillProfileRow[],
  activeMisconceptions: ActiveMisconceptionRow[]
}
```

**POST `/api/sessions/[sessionId]/end`**
```typescript
// Request
{ studentId: string }

// Response
{
  summary: {
    questionsAnswered: number,
    skillsImproved: Array<{ skillName: string, before: number, after: number }>,
    skillsMastered: string[],
    activeMisconceptions: ActiveMisconceptionRow[],
    sessionDurationMin: number
  }
}
```

**GET `/api/dashboard/[token]`**
```typescript
// Response — parent dashboard data, no auth required
{
  student: { name: string },
  conceptMastery: ConceptMasteryRow[],
  skills: StudentSkillProfileRow[],
  misconceptions: ActiveMisconceptionRow[],
  sessionsThisWeek: Session[],
  lastUpdated: string
}
```

---

## 6. Layer 3 — Application Services

**Technology:** TypeScript modules, called by API routes

Services are pure TypeScript functions with no framework dependency. They can be unit tested independently of Next.js.

### 6.1 SessionService

Manages session lifecycle. Wraps Supabase calls for session creation, state transitions, and summary generation.

```typescript
// src/services/SessionService.ts

export const SessionService = {
  startSession: async (studentId: string): Promise<SessionStartResult>,
  endSession: async (sessionId: string): Promise<SessionSummary>,
  getNextQuestion: async (sessionId: string, skillId: string): Promise<Question>,
  updateSkillsPracticed: async (sessionId: string, skillId: string): Promise<void>,
}
```

### 6.2 MasteryService

Wraps the four core PostgreSQL functions. The only place in the application where mastery state is modified.

```typescript
// src/services/MasteryService.ts

export const MasteryService = {
  // Calls update_mastery(), check_and_unlock_skills()
  // Logs the full interaction row
  // Returns InteractionResult
  processAnswer: async (payload: SubmitAnswerPayload): Promise<InteractionResult>,

  // Calls get_next_skill()
  getNextSkill: async (studentId: string, conceptId?: string): Promise<string | null>,

  // Calls init_student_skills()
  initStudentSkills: async (studentId: string): Promise<void>,
}
```

### 6.3 MisconceptionClassifier

The misconception detection engine. Rule-based at MVP. LLM-augmented at V2. The interface does not change between versions — only the implementation.

```typescript
// src/services/MisconceptionClassifier.ts

export interface ClassifierResult {
  misconceptionId: string | null,
  confidence: number | null,       // null for rule_based
  classifierType: ClassifierType,
  reasoning: string | null,        // null for rule_based
}

export const MisconceptionClassifier = {
  classify: async (
    skillId: string,
    correctAnswer: string,
    studentAnswer: string,
    questionId: string
  ): Promise<ClassifierResult>
}
```

**Rule-based classifier (MVP):**

The rule-based classifier is a deterministic mapping. Every multiple choice distractor was pre-mapped to a misconception when the question was written. Classification is a lookup, not inference.

```typescript
// Rule-based: if student answer matches a known distractor,
// return the pre-mapped misconception ID

const classify_rule_based = (
  questionId: string,
  studentAnswer: string
): ClassifierResult => {
  const mapping = DISTRACTOR_MISCONCEPTION_MAP[questionId]
  const match = mapping?.[studentAnswer]
  return {
    misconceptionId: match ?? null,
    confidence: null,
    classifierType: 'rule_based',
    reasoning: null
  }
}
```

`DISTRACTOR_MISCONCEPTION_MAP` is seeded from the questions table at startup — it is not hardcoded in the service.

**LLM classifier (V2):**

When the student uses free-text input (V2 feature), the rule-based classifier cannot operate. The LLM classifier handles open-ended answers.

```typescript
// V2: LLM classifier for free-text answers
const classify_llm = async (
  skillId: string,
  correctAnswer: string,
  studentAnswer: string,
  misconceptionTypes: MisconceptionType[]
): Promise<ClassifierResult> => {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    system: CLASSIFIER_SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: buildClassifierPrompt(skillId, correctAnswer, studentAnswer, misconceptionTypes)
    }]
  })
  // Parse structured JSON response
  return parseClassifierResponse(response)
}
```

The classifier system prompt instructs the model to return structured JSON with `misconception_id`, `confidence` (0.0–1.0), and `reasoning`. The reasoning field is stored in `interactions.llm_reasoning` for audit purposes.

### 6.4 QuestionSelector

Selects the next question for a given skill, avoiding recently seen questions and adjusting for difficulty.

```typescript
// src/services/QuestionSelector.ts

export const QuestionSelector = {
  // Returns a question the student hasn't seen in this session
  // Adjusts difficulty_weight based on current mastery_score
  selectQuestion: async (
    skillId: string,
    studentId: string,
    sessionId: string,
    masteryScore: number
  ): Promise<Question>
}
```

**Difficulty selection logic:**

```
mastery_score < 0.30  → prefer difficulty_weight ≤ 0.7 (easier questions)
mastery_score 0.30–0.60 → prefer difficulty_weight 0.8–1.2 (standard)
mastery_score 0.60–0.80 → prefer difficulty_weight 1.2–1.6 (harder)
mastery_score ≥ 0.80   → mastery confirmed, no new questions needed
```

---

## 7. Layer 4 — Data Layer

**Technology:** Supabase (PostgreSQL 15, PostgREST, Supabase Auth, Supabase Storage)

The data layer is the most complete layer in the system. Migrations 001 and 002 have already established the full schema.

### 7.1 Schema Summary

The full schema is designed and exists in SQL migration files. It has not been executed yet. Once deployed to Supabase, the schema will create:

```
Domain hierarchy:    subjects → domains → concepts → micro_skills
Knowledge graph:     prerequisites, skill_misconceptions, misconception_types
Student model:       students, student_skill_state, student_misconceptions
Session layer:       sessions, interactions
Question bank:       questions
```

Full schema detail: `schema/001_initial_schema.sql` and `schema/002_seed_data.sql`.

**Deploy sequence:**
```sql
-- In Supabase SQL editor, run in order:
-- 1. 001_initial_schema.sql  → creates all tables, views, functions, indexes
-- 2. 002_seed_data.sql       → seeds subjects, domains, concepts, skills,
--                               misconceptions, and 28 starter questions
```

**Verify after deployment:**
```sql
select count(*) from subjects;           -- expect 3
select count(*) from domains;            -- expect 10
select count(*) from concepts;           -- expect 8
select count(*) from micro_skills;       -- expect 8
select count(*) from misconception_types;-- expect 6
select count(*) from questions;          -- expect 28+
```

### 7.2 Core Functions (Designed — Not Yet Deployed)

These functions are defined in `001_initial_schema.sql`. Once the schema is deployed they become callable from application services.

| Function | Purpose | Called by |
|---|---|---|
| `init_student_skills(student_id)` | Seeds skill state for new student | MasteryService on student create |
| `update_mastery(student_id, skill_id, event)` | Updates mastery score + status | MasteryService.processAnswer() |
| `check_and_unlock_skills(student_id)` | Unlocks newly eligible skills | MasteryService.processAnswer() |
| `get_next_skill(student_id, concept_id?)` | Adaptive routing — next skill | SessionService.startSession() |
| `log_misconception(student_id, misconception_id, skill_id)` | Upserts misconception record | MasteryService.processAnswer() |
| `update_question_stats(question_id, is_correct)` | Increments question attempt counts | MasteryService.processAnswer() |

### 7.3 Core Views (Designed — Not Yet Deployed)

These views are defined in `001_initial_schema.sql`. Once deployed they are queried directly by the API layer.

| View | Purpose | Used by |
|---|---|---|
| `v_student_skill_profile` | Full skill state with hierarchy context | Progress screen, parent dashboard |
| `v_concept_mastery` | Aggregated concept-level mastery | Home screen, parent dashboard |
| `v_active_misconceptions` | Active misconceptions with remediation | Parent dashboard, session summary |
| `v_question_difficulty_stats` | Question performance data for IRT | V2 calibration |

### 7.4 Supabase Client Initialisation

```typescript
// src/lib/supabase.ts

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Server-side client (API routes, server components)
export const supabaseServer = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!   // service role — bypasses RLS
)

// Client-side client (client components)
export const supabaseClient = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!  // anon key — respects RLS
)
```

**Row Level Security (RLS) policy (V2):**

At MVP with a single hardcoded student, RLS is not required. Before any multi-student public launch, enable RLS on `student_skill_state`, `interactions`, `sessions`, and `student_misconceptions` to ensure students cannot access each other's data.

---

## 8. Layer 5 — External Services

### 8.1 Video Delivery — Cloudflare Stream

Hosts and delivers the 14 MVP whiteboard videos and all future AI-generated videos.

```
Video URL format:
https://customer-{hash}.cloudflarestream.com/{video-id}/manifest/video.m3u8

Delivery:
  - Adaptive bitrate streaming (HLS)
  - Global CDN — low latency for Malaysian students
  - Fallback: direct MP4 download if HLS fails
```

Integration: URLs stored in `micro_skills.intro_video_url` and `misconception_types.remediation_video_url`. The VideoPlayer component requests the URL from the API and passes it to the player.

### 8.2 AI Video Generation Pipeline (V2)

The pipeline defined in doc 15. Runs as a background job triggered when a new concept is seeded with `is_active = false`.

```
Trigger:     New skill row inserted with is_active = false
Pipeline:    LLM script → Visual renderer → ElevenLabs → FFmpeg → Review queue
Output:      MP4 uploaded to Cloudflare Stream
Completion:  URL written to micro_skills.intro_video_url
             is_active remains false until human review approves
```

**Subject-specific renderers:**

| Subject | Visual renderer | Technology |
|---|---|---|
| MATH | Parametric animation | Manim (Python) |
| SCIENCE | Diagram generation | DALL-E / Stable Diffusion + FFmpeg |
| ENGLISH | Text animation | Remotion (React → MP4) |

**Narration:** ElevenLabs TTS with consistent voice per subject. Timestamped output synced to visual cues via FFmpeg.

**Human review gate:** No video goes live without explicit approval. `video_assets.review_status` must be `approved` before URL is written to the skill record.

### 8.3 LLM API — Anthropic Claude (V2)

Used for two purposes:

**Misconception classification (free-text answers):**
```
Model:      claude-sonnet-4-20250514
Max tokens: 300
Input:      skill context + correct answer + student answer + misconception taxonomy
Output:     structured JSON { misconception_id, confidence, reasoning }
Latency:    1–2 seconds acceptable — show subtle loading state
```

**Video script generation (pipeline Step 1):**
```
Model:      claude-sonnet-4-20250514
Max tokens: 1000
Input:      skill metadata from database
Output:     structured JSON { narration, duration_sec, visuals[] }
Latency:    not time-sensitive — background job
```

### 8.4 WhatsApp — Weekly Parent Summary (MVP)

At MVP, the weekly parent summary is sent manually by the founder via WhatsApp using a template generated from dashboard data. No API integration required.

At V2, automate via Twilio WhatsApp Business API or 360dialog (lower cost, better for Malaysia market).

---

## 9. Complete Data Flow — Core Interaction Loop

This is the critical path. Every other data flow is secondary.

```
┌──────────────────────────────────────────────────────────────┐
│                  CORE INTERACTION LOOP                       │
│                                                              │
│  1. Student opens /session                                   │
│            ↓                                                 │
│  2. GET /api/sessions/start                                  │
│     → calls get_next_skill(student_id)                       │
│     → fetches skill + intro video URL (if new skill)        │
│     → calls QuestionSelector.selectQuestion()               │
│     → returns { sessionId, skill, introVideoUrl, question } │
│            ↓                                                 │
│  3. Frontend renders Phase 1A (if intro video)              │
│     OR Phase 2 directly (if returning skill)                │
│            ↓                                                 │
│  4. Student submits answer                                   │
│     POST /api/answers/submit                                 │
│            ↓                                                 │
│  5. MisconceptionClassifier.classify()                      │
│     → rule_based: distractor lookup                         │
│     → returns { misconceptionId, classifierType }           │
│            ↓                                                 │
│  6. MasteryService.processAnswer()                          │
│     → determines answer_event type                          │
│     → calls update_mastery(student_id, skill_id, event)     │
│     → calls check_and_unlock_skills(student_id)             │
│     → calls log_misconception() if misconception detected   │
│     → calls update_question_stats(question_id, is_correct)  │
│     → inserts full row into interactions table              │
│            ↓                                                 │
│  7. API returns InteractionResult                           │
│     { isCorrect, masteryBefore, masteryAfter,               │
│       misconceptionDetected, remediationVideoUrl,           │
│       newSkillUnlocked, nextQuestion }                      │
│            ↓                                                 │
│  8. Frontend renders Phase 3 feedback                       │
│     → State A: correct                                      │
│     → State B: misconception → routes to Phase 1B           │
│     → State C: incorrect, no misconception                  │
│     → State D: skill mastered                               │
│            ↓                                                 │
│  9. Student taps Next → loop repeats from Step 3/4          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Performance targets:**
- Steps 2–7 (server round-trip): ≤300ms for rule-based classifier
- Steps 2–7 with LLM classifier (V2): ≤2 seconds
- Video load (Step 3): ≤3 seconds on Malaysian 4G

---

## 10. Deployment Architecture

### 10.1 MVP Deployment (Weeks 1–8)

Minimal infrastructure. Everything on free tiers until beta validation.

```
┌─────────────────────────────────────────────────────────────┐
│                    MVP DEPLOYMENT                           │
│                                                             │
│  Student Browser (Android / Desktop)                        │
│          │  HTTPS                                           │
│          ▼                                                  │
│  Vercel  (Next.js — free tier)                             │
│  ├── Static pages (SSG)                                    │
│  ├── Server components (SSR)                               │
│  └── API routes (serverless functions)                     │
│          │                                                  │
│          ▼                                                  │
│  Supabase  (free tier — 500MB DB, 1GB storage)             │
│  ├── PostgreSQL (schema + data)                            │
│  ├── PostgREST (auto-generated REST API)                   │
│  └── Supabase Storage (video files — MVP fallback)         │
│          │                                                  │
│          ▼                                                  │
│  Cloudflare Stream  (video delivery)                       │
│  └── 14 MVP videos                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**MVP infrastructure cost: ~$0/month**

| Service | Tier | Limit | Cost |
|---|---|---|---|
| Vercel | Hobby (free) | 100GB bandwidth | $0 |
| Supabase | Free | 500MB DB, 50k MAU | $0 |
| Cloudflare Stream | Pay-as-you-go | ~$1–2 for 14 videos | ~$2 |
| Domain | — | — | ~$12/year |

**Upgrade triggers:**

| Service | Upgrade when | Cost |
|---|---|---|
| Supabase | >500MB DB or >50k monthly active users | $25/month |
| Vercel | >100GB bandwidth or need team features | $20/month |
| Cloudflare Stream | Scales linearly with usage | ~$5/1000 min viewed |

### 10.2 V2 Deployment (Post-validation, 100+ students)

```
┌─────────────────────────────────────────────────────────────┐
│                     V2 DEPLOYMENT                           │
│                                                             │
│  Vercel (Pro)          Next.js app                         │
│          │                                                  │
│          ▼                                                  │
│  Supabase (Pro)        PostgreSQL + read replica            │
│          │                                                  │
│          ├─────────────────────┐                           │
│          ▼                     ▼                           │
│  Cloudflare Stream      AI Pipeline Server                 │
│  Video delivery         (Render.com or Railway)            │
│                         Manim + FFmpeg + ElevenLabs        │
│                         Background job queue               │
└─────────────────────────────────────────────────────────────┘
```

**V2 estimated infrastructure cost: ~$75–100/month**

### 10.3 V3 Deployment (School channel, 1,000+ students)

```
Vercel (Pro or Enterprise)
Supabase (Pro with read replicas)
Cloudflare Stream (scaled)
AI pipeline: dedicated server or containerised (Railway / Fly.io)
Separate analytics database (read-only replica or ClickHouse)
Redis cache for hot student state queries
```

**V3 estimated infrastructure cost: ~$300–500/month**

---

## 11. Project Structure

```
alip/
├── app/                          Next.js App Router
│   ├── page.tsx                  Home screen
│   ├── session/
│   │   ├── page.tsx
│   │   └── components/
│   ├── progress/
│   │   └── page.tsx
│   ├── dashboard/
│   │   └── [token]/page.tsx
│   └── api/
│       ├── sessions/
│       │   ├── start/route.ts
│       │   └── [id]/
│       │       ├── end/route.ts
│       │       └── next-question/route.ts
│       ├── answers/
│       │   └── submit/route.ts
│       ├── students/
│       │   └── [id]/progress/route.ts
│       └── dashboard/
│           └── [token]/route.ts
├── src/
│   ├── services/
│   │   ├── SessionService.ts
│   │   ├── MasteryService.ts
│   │   ├── MisconceptionClassifier.ts
│   │   └── QuestionSelector.ts
│   ├── lib/
│   │   ├── supabase.ts           Client initialisation
│   │   └── constants.ts          MASTERY_DELTAS, MASTERY_THRESHOLDS
│   └── types/
│       └── database.ts           Database interface (types_v2.ts)
├── components/                   Shared UI components
├── public/
├── schema/
│   ├── 001_initial_schema.sql
│   └── 002_seed_data.sql
├── .env.local
└── package.json
```

---

## 12. Security

### 12.1 Child Data Protection

ALIP collects data about minors. This is the highest-priority compliance consideration.

**Malaysia — PDPA 2010:**
- Personal data (student name, age, grade, parent email) requires explicit consent from parent
- Data must not be used for purposes beyond the stated learning purpose
- Parents have the right to access and correct their child's data
- At beta: collect minimum necessary data — name and grade only, parent email optional

**If expanding to US market — COPPA:**
- Verifiable parental consent required before collecting data from children under 13
- No behavioural advertising permitted
- Stricter data retention limits
- Address before any US marketing, not after

**Practical measures at MVP:**
- No third-party analytics scripts (no Google Analytics, Facebook Pixel) on any page where student data is displayed
- Parent dashboard accessed via UUID token — not indexed, not shareable without the link
- Student data never referenced in any marketing material without explicit parent consent

### 12.2 API Security

```
MVP:
  Service role key: server-side only, never exposed to browser
  Anon key: client-side, read-only with RLS (V2)
  Parent dashboard: UUID token in URL — not guessable, not truly private
  No authentication required at MVP — single student, controlled access

V2:
  Row Level Security on all student tables
  Parent login via magic link (OTP to email/phone)
  Rate limiting on /api/answers/submit (prevent automated abuse)
  JWT session tokens with 24h expiry

V3:
  Role-based access control (student, parent, teacher, admin)
  Audit logging for all data access
  Data encryption at rest for PII fields
```

### 12.3 AI Output Safety

AI-generated content (video scripts, LLM classifier outputs) must not reach students without human review.

**Rule:** No AI-generated video goes live without `video_assets.review_status = 'approved'`.  
**Rule:** LLM classifier outputs are logged in `interactions.llm_reasoning` for retrospective audit.  
**Rule:** If LLM classifier confidence < 0.7, fall back to no misconception detected rather than a low-confidence classification.

---

## 13. Observability

### 13.1 Metrics That Matter for ALIP

Generic infrastructure metrics (CPU, memory, uptime) are table stakes. These are the ALIP-specific metrics that indicate whether the product is working:

| Metric | Why it matters | Alert threshold |
|---|---|---|
| Answer submission latency (p95) | Student experience — must feel instant | >500ms |
| Mastery update success rate | Data integrity — every answer must be logged | <99.9% |
| Video load success rate | Teaching layer reliability | <95% |
| Session completion rate | Product engagement signal | <50% (investigate) |
| Misconception detection rate | Classifier coverage — how often M1–M6 maps to an answer | <40% (review distractor mapping) |
| Skills mastered per student per week | Learning outcome signal | 0 for 2 consecutive weeks (flag for founder) |
| Mastery score drift | Calibration signal — are scores moving in expected direction | Monitor weekly at beta |

### 13.2 Logging

At MVP: Vercel function logs + Supabase logs are sufficient. The `interactions` table is the primary audit log — every answer, every mastery delta, every misconception detection is a permanent immutable row.

At V2: Add structured logging with a tool like Axiom or Datadog. Key events to log:
- Session start/end with student ID and concept
- Every classifier call with input and output
- Every mastery update with before/after values
- Every video load attempt (success/failure)
- Every API error with full context

### 13.3 Error Handling and Fallbacks

| Failure | Fallback | User impact |
|---|---|---|
| Video fails to load | Show text-based step explanation | Minor — student sees text instead of video |
| LLM classifier timeout | Fall back to rule-based classifier | None — transparent to student |
| `update_mastery()` fails | Retry once, then log error, continue session | Student answer not counted — low probability |
| `get_next_skill()` returns null | Show concept complete screen | Correct behaviour — no fallback needed |
| Supabase connection error | Return cached question if available, else show "Connection issue, try again" | Session interrupted — must be rare |
| AI pipeline failure (V2) | Flag skill for manual video production | No student impact — video not yet live |

---

## 14. Implementation Sequence

```
PRE-DEVELOPMENT SETUP  (before opening the AI IDE)
  ├── Create Supabase project (supabase.com)
  ├── Run 001_initial_schema.sql in Supabase SQL editor
  ├── Run 002_seed_data.sql in Supabase SQL editor
  ├── Verify row counts (subjects: 3, skills: 8, questions: 28+)
  └── Note down: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY

WEEK 1  (project scaffold + data layer)
  ├── npx create-next-app@latest alip --typescript --tailwind --app
  ├── npm install @supabase/supabase-js
  ├── Copy types_v2.ts → src/types/database.ts
  ├── Configure .env.local with Supabase credentials
  ├── src/lib/supabase.ts — server + client instances
  ├── src/lib/constants.ts — mastery deltas, thresholds
  ├── MasteryService: processAnswer() with end-to-end DB test
  └── Verify: submit answer → mastery updates in Supabase table editor

WEEK 2  (core services + API routes)
  ├── SessionService: startSession(), endSession()
  ├── MisconceptionClassifier: rule-based implementation
  ├── QuestionSelector: basic difficulty-aware selection
  └── API routes: /sessions/start, /answers/submit, /sessions/[id]/end

WEEK 3–4  (session screen UI)
  ├── Session screen state machine (8 states)
  ├── VideoPlayer component (Phase 1A + 1B)
  ├── FractionBar SVG component
  ├── AnswerOptions + FeedbackPanel
  ├── MasteryBar + SkillUnlock components
  └── SessionSummary screen

WEEK 5–6  (remaining screens + videos)
  ├── Progress screen (/progress)
  ├── Home screen (/)
  ├── Parent dashboard (/dashboard/[token])
  ├── Student token generation on student create
  ├── Record 14 MVP whiteboard videos
  └── Upload videos → write URLs to micro_skills + misconception_types

WEEK 7–8  (beta readiness)
  ├── Mobile optimisation pass
  ├── Error handling + fallbacks (video load fail, DB timeout)
  ├── End-to-end test: one student completes full fractions path
  ├── First parent dashboard link sent to beta family
  └── 3–5 beta students onboarded

V2  (post-fractions validation)
  ├── RLS policies enabled on student tables
  ├── LLM classifier integrated (free-text answers)
  ├── AI video pipeline: Manim + ElevenLabs + FFmpeg
  ├── Basic authoring UI for question management
  └── Automated WhatsApp parent summary (Twilio / 360dialog)

V3  (school channel)
  ├── Role-based access control
  ├── Teacher class dashboard
  ├── Science content + AI image renderer
  └── Read replica + Redis caching layer
```

---

## 15. Open Questions

| # | Question | Impact | Resolve by |
|---|---|---|---|
| 1 | Supabase project region — which region? Singapore is closest for Malaysia | DB latency for students | Pre-development setup |
| 2 | Session state: React client state or persisted to DB on every transition? | Offline resilience, complexity | Week 1 |
| 3 | RLS: enable from day one or after MVP validation? | Security vs setup time | Week 1 |
| 4 | Distractor-misconception map: derive from questions table at startup or hardcode in classifier? | Classifier architecture | Week 2 |
| 5 | Video hosting at MVP: Supabase Storage (simpler) or Cloudflare Stream (better delivery)? | Setup time vs performance | Week 5 |
| 6 | AI pipeline server at V2: Render.com, Railway, or Fly.io? | Python + Manim support, cost | V2 planning |
| 7 | PDPA consent flow: when and how to collect explicit parental consent? | Legal compliance | Before public launch |

---

*Document version: 1.0*  
*Scope: MVP (V1) with V2/V3 scaling path*  
*Last updated: March 2026*
