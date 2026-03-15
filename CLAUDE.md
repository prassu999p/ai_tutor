# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ALIP** — Adaptive Learning Intelligence Platform. An AI-powered tutoring app for K-8 mathematics. MVP scope: fractions concept only (8 micro-skills, 6 misconception types), single student, no auth.

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

### Planned File Structure (not yet built)

```
alip-app/src/
├── app/
│   ├── page.tsx                       # Home screen (server component)
│   ├── session/page.tsx               # Session screen (client — owns state machine)
│   ├── progress/page.tsx              # Progress screen (server component)
│   ├── dashboard/[token]/page.tsx     # Parent dashboard (server component, no auth)
│   └── api/
│       ├── sessions/start/route.ts
│       ├── sessions/[id]/end/route.ts
│       ├── sessions/[id]/next-question/route.ts
│       ├── answers/submit/route.ts
│       ├── students/[id]/progress/route.ts
│       └── dashboard/[token]/route.ts
├── services/
│   ├── MasteryService.ts              # ONLY place mastery state is modified
│   ├── MisconceptionClassifier.ts     # Rule-based (MVP); LLM (V2)
│   ├── SessionService.ts              # Session lifecycle
│   └── QuestionSelector.ts           # Difficulty-aware question selection
├── lib/
│   ├── supabase.ts                    # supabaseServer (service key) + supabaseClient (anon key)
│   └── constants.ts                  # MASTERY_DELTA, MASTERY_THRESHOLD, MASTERY_STATUS
└── types/
    └── database.ts                   # Single source of truth for all TypeScript types
```

### Database Design (Supabase PostgreSQL)

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

### Mastery System

Mastery scores are numeric `0.000–1.000`. Thresholds:
- `mastered`: ≥ 0.80
- `developing`: ≥ 0.50
- `weak`: < 0.50

Answer events and mastery deltas (from `lib/constants.ts`):
- `correct_no_hint`: +0.15
- `correct_with_hint`: +0.08
- `correct_explanation`: +0.20
- `incorrect_conceptual`: −0.10
- `incorrect_repeated`: −0.15

### Session State Machine (8 states)

The session screen (`/session`) is the only client component with complex state. It owns an 8-state machine via `hooks/useSession.ts`:

```
IDLE → INTRO_VIDEO → QUESTION_ACTIVE ↔ HINT_SHOWN → EVALUATING
  → FEEDBACK_CORRECT | FEEDBACK_MISCONCEPTION | FEEDBACK_INCORRECT | SKILL_MASTERED
  → SESSION_COMPLETE
```

`FEEDBACK_MISCONCEPTION` triggers a remediation video (Phase 1B), then returns to `QUESTION_ACTIVE`.

### MisconceptionClassifier

MVP: rule-based deterministic lookup. Each question's `distractors` JSONB field maps wrong answers to misconception IDs. Cache the mapping in memory at startup — do not re-query per request.

V2: LLM-based (Anthropic `claude-sonnet-4-20250514`) for free-text answers. Interface stays the same; only implementation changes.

### QuestionSelector Difficulty Logic

```
mastery < 0.30    → prefer difficulty_weight ≤ 0.7
mastery 0.30–0.60 → prefer difficulty_weight 0.8–1.2
mastery 0.60–0.80 → prefer difficulty_weight 1.2–1.6
```

Never return the same question twice in one session.

### Answer Submit Flow (critical path)

`POST /api/answers/submit`:
1. `MisconceptionClassifier.classify()` (distractor lookup)
2. `MasteryService.processAnswer()` which calls in order: `update_mastery()`, `check_and_unlock_skills()`, `log_misconception()` (if applicable), `update_question_stats()`, then inserts into `interactions`

---

## Key Conventions

- **Hardcode `studentId = 'student-001'` at MVP** — no auth, no login
- **`supabaseServer`** (service role key) for all API routes and server components
- **`supabaseClient`** (anon key) for client components only
- RLS is not enabled at MVP — enable before any multi-student public launch
- All API routes return `{ error: string }` with appropriate HTTP status on failure
- No `any` types — all responses are typed via `src/types/database.ts`
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
