# 13. Student Learning Interface
## Adaptive Learning Intelligence Platform

**Document type:** Product Design Specification  
**Scope:** Student-facing UI — layout, interaction patterns, visual teaching tools, engagement  
**MVP target:** Hybrid teach-then-practice loop with whiteboard videos  
**Design principle:** Every UI decision must serve cognitive clarity, not visual novelty.

---

## 1. Design Philosophy

The student interface has one job: reduce friction between a student's thinking and the system's ability to measure it.

This means:

- **Cognitive load stays low.** One thing at a time — one video, one question, one piece of feedback. No competing elements.
- **Explanation precedes practice.** Students are never asked to answer a question they haven't been equipped to attempt.
- **Feedback is immediate and targeted.** Not just right/wrong — the student understands *why*, shown through the specific misconception they demonstrated.
- **Progress is visible but not gamified.** Mastery is shown honestly, not inflated for engagement.
- **The system feels like a patient tutor, not a quiz app.** Tone, pacing, and explanation quality determine this more than any visual design choice.

What the interface must never become:
- A reward machine (badges, streaks, leaderboards)
- A passive content library (video after video with no practice)
- A source of anxiety (timers, failure states, harsh feedback)

---

## 2. The Core Learning Loop — Hybrid (Option C)

This is the architectural heart of the student experience. Every screen and component in this document exists to serve this loop.

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   SKILL UNLOCKED                                    │
│         ↓                                           │
│   INTRO EXPLANATION                                 │
│   Whiteboard video (60–90 sec)                      │
│   "Here is how this works"                          │
│         ↓                                           │
│   PRACTICE QUESTION 1                               │
│         ↓                                           │
│      ┌──────────┬──────────────┐                    │
│      │ CORRECT  │  INCORRECT   │                    │
│      │          │              │                    │
│      │ +mastery │ Misconception│                    │
│      │ next Q   │ detected?    │                    │
│      │          │    ↓         │                    │
│      │          │ REMEDIATION  │                    │
│      │          │ CLIP (30sec) │                    │
│      │          │ targeted to  │                    │
│      │          │ exact error  │                    │
│      └──────────┴──────┬───────┘                    │
│                        ↓                            │
│   PRACTICE QUESTION 2, 3, 4...                      │
│         ↓                                           │
│   MASTERY ≥ 0.80 → SKILL MASTERED                  │
│         ↓                                           │
│   NEXT SKILL UNLOCKED                               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**The two video types are fundamentally different in purpose:**

| | Intro Explanation | Remediation Clip |
|---|---|---|
| **Trigger** | Skill first unlocked | Wrong answer with misconception detected |
| **Length** | 60–90 seconds | 20–40 seconds |
| **Tone** | Teaching, forward-looking | Corrective, non-shaming |
| **Content** | How the skill works with example | Why this specific error happens, visual proof |
| **Skippable?** | Yes, after 10 seconds | No — must watch before next attempt |
| **Quantity (MVP)** | 8 (one per micro-skill) | 6 (one per M1–M6) |

---

## 3. Screen Architecture

```
┌─────────────────────────────────────────────────────┐
│  /                   Home / Student Select          │  MVP
│  /session            Active Learning Screen         │  MVP ★ core
│  /progress           Mastery Overview               │  MVP
│                                                     │
│  /learn/:conceptId   Concept Entry                  │  V2+
│  /review             Spaced Review                  │  V2+
│  /profile            Student Profile                │  V3+
└─────────────────────────────────────────────────────┘
```

The session screen (`/session`) is the entire product at MVP. Engineering effort: 70% session screen, 20% progress screen, 10% home.

---

## 4. Home Screen — `/`  *(MVP)*

**Purpose:** Get the student into a session in one tap. Nothing else.

```
┌──────────────────────────────────┐
│                                  │
│   👋  Welcome back, Amir         │
│                                  │
│   You are working on:            │
│   ┌──────────────────────────┐   │
│   │  Fractions               │   │
│   │  Adding (same denom.)    │   │
│   │  Mastery: 61%  ████░░░   │   │
│   └──────────────────────────┘   │
│                                  │
│   ┌──────────────────────────┐   │
│   │   Continue Learning  →   │   │
│   └──────────────────────────┘   │
│                                  │
│   [ View my progress ]           │
│                                  │
└──────────────────────────────────┘
```

**Behaviour:**
- "Continue Learning" calls `get_next_skill()` and starts a session
- Returning to in-progress skill: goes straight to practice
- Arriving at newly unlocked skill: plays intro video first
- No topic selection at MVP — the system decides what is next
- Single student, no login at MVP

---

## 5. Session Screen — `/session`  *(MVP — primary focus)*

The session screen renders differently depending on which phase of the learning loop the student is in. Three distinct phase layouts.

### 5.1 Phase Layout Overview

```
┌──────────────────────────────────────────────────────┐
│  Phase 1A: Intro Explanation  (new skill)            │
│  Phase 1B: Remediation Clip   (misconception hit)    │
├──────────────────────────────────────────────────────┤
│  Phase 2:  Practice           (question + answer)    │
├──────────────────────────────────────────────────────┤
│  Phase 3:  Feedback           (after submission)     │
└──────────────────────────────────────────────────────┘
```

Each phase occupies the full screen. Transitions are student-controlled — the student taps to proceed after an explanation or feedback. Nothing advances automatically.

---

### 5.2 Phase 1A — Intro Explanation Screen

Triggered when a student reaches a new micro-skill for the first time.

```
┌────────────────────────────────────────┐
│  Fractions  ›  Simplifying Fractions   │
├────────────────────────────────────────┤
│                                        │
│  ┌──────────────────────────────────┐  │
│  │                                  │  │
│  │                                  │  │
│  │      [  WHITEBOARD VIDEO  ]      │  │
│  │                                  │  │
│  │      Simplifying Fractions       │  │
│  │         ▶  1:24                  │  │
│  │                                  │  │
│  └──────────────────────────────────┘  │
│                                        │
│  In this lesson:                       │
│  • What simplifying means              │
│  • How to find the GCF                 │
│  • Worked example: 6/8 → 3/4          │
│                                        │
│  [ Skip ]          [ I'm ready → ]    │
│                                        │
└────────────────────────────────────────┘
```

**Design rules:**
- Video autoplays, sound off, captions on by default
- "I'm ready" activates only after 10 seconds — prevents reflexive skipping
- "Skip" always available — students who already understand are not blocked
- Bullet summary below video sets expectations, reduces anxiety for weaker students
- Skip is logged in `session_notes` — becomes a signal for comprehension risk

**Whiteboard video structure:**
```
0:00–0:15   Hook: "You have seen fractions like 6/8 —
                   but there is a simpler way to write it"
0:15–0:50   Core concept with visual drawn in real time
0:50–1:15   Worked example, step by step
1:15–1:24   Bridge: "Now let's try one together"
```

---

### 5.3 Phase 1B — Remediation Clip Screen

Triggered when a misconception is detected in the practice phase. This is not a replay of the intro — it is a short, targeted clip addressing the *specific error* the student just made.

```
┌────────────────────────────────────────┐
│  Let's look at this together.          │
├────────────────────────────────────────┤
│                                        │
│  You answered:  2/7                    │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │                                  │  │
│  │      [  REMEDIATION CLIP  ]      │  │
│  │                                  │  │
│  │  Why we don't add denominators   │  │
│  │         ▶  0:32                  │  │
│  │                                  │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ────────────────────────────────────  │
│  [ Try again → ]                       │  ← appears only after video ends
└────────────────────────────────────────┘
```

**Design rules:**
- "Try again" is hidden until video ends — remediation must be watched
- Student's wrong answer is shown at top — anchors explanation to their specific mistake
- Clip title describes the concept being corrected, not the internal label (student never sees "M1")
- After watching, student gets a fresh question on the same skill — not the same question
- Remediation clip count logged per session for parent summary

**Remediation clip structure:**
```
0:00–0:08   Show the error: "Here is what happened with 1/3 + 1/4 = 2/7"
0:08–0:22   Visual proof of why it is wrong:
             "Thirds and quarters are different sizes —
              you cannot just count them together"
0:22–0:32   Correct approach in 2 steps:
             "First make them the same size, then add"
```

---

### 5.4 Phase 2 — Practice Phase

The core question-and-answer interface. Four zones.

```
┌────────────────────────────────────────┐
│  ZONE 1: Session Context Bar           │  Fixed top
├────────────────────────────────────────┤
│                                        │
│  ZONE 2: Visual Teaching Space         │  Dynamic per question type
│                                        │
├────────────────────────────────────────┤
│  ZONE 3: Question + Answer Input       │  Always visible
├────────────────────────────────────────┤
│  [ Need a hint? ]                      │  Subtle, below input
└────────────────────────────────────────┘
```

**Zone 1 — Context Bar:**
```
┌────────────────────────────────────────┐
│  Fractions  ›  Simplifying Fractions   │
│  ████████░░  Q4 of ~8                  │
└────────────────────────────────────────┘
```
- Skill breadcrumb always visible
- Soft progress indicator — "~8" not "8 exactly"
- No timer — timers create anxiety and degrade answer quality

**Zone 2 — Visual Teaching Space:**

This is the primary teaching surface, not decoration. Content varies by question type.

*Fraction bar (addition/subtraction/comparison):*
```
┌──┬──┬──┬──┐   ┌──┬──┬──┐
│██│██│██│  │   │██│██│  │
└──┴──┴──┴──┘   └──┴──┴──┘
     3/4              2/3
Which fraction is larger?
```

*Step reference (multi-step operations):*
```
How to simplify:
1. Find the GCF of numerator and denominator
2. Divide both by the GCF
3. Check: can it be simplified further?
```

*Number line (V2):*
```
0────┬────┬────┬────1
     1/4  1/2  3/4
Where does 2/3 go?
```

*Clean question only (simple identification):*
```
In the fraction 3/5,
what does the 5 represent?
```

**Zone 3 — Question + Answer Input:**

Multiple choice is the MVP default.

```
┌────────────────────────────────────────┐
│  Calculate: 2/7 + 3/7                 │
│                                        │
│  ○  5/14                              │  ← M1: added denominators
│  ○  5/7                               │  ← correct
│  ○  6/7                               │  ← arithmetic error
│  ○  2/7                               │  ← subtracted instead
│                                        │
│  [  Submit Answer  ]                  │
└────────────────────────────────────────┘
```

Multiple choice at MVP:
- Makes misconception detection deterministic
- Each wrong answer pre-mapped to a specific misconception
- Removes keyboard friction on mobile
- Keeps evaluation fast and reliable

**Distractor design rule:** Every wrong answer option must map to a specific misconception or error type. Never use random wrong answers — this is what makes the classifier work without AI.

**Hint button:**
Present but not prominent. Sits below answer options. One tap reveals hint text inline. Hint usage logs `correct_with_hint` event (+0.08 instead of +0.15). Students should feel mild effort to use it — not hidden, but not encouraged.

**V2 — Fraction input widget:**
```
  ┌───┐
  │   │  ← numerator
──┼───┼──
  │   │  ← denominator
  └───┘
```
Two touch-friendly number fields. Better than text box for fraction answers. Implement in V2 once core loop is validated.

---

### 5.5 Phase 3 — Feedback Phase

Shown immediately after submission. Full screen. Student controls when to proceed.

**State A — Correct answer:**
```
┌────────────────────────────────────────┐
│  ✓  That's right.                     │
│                                        │
│  2/7 + 3/7 = 5/7                      │
│  Same denominator — just add the      │
│  top numbers. The bottom stays.       │
│                                        │
│  ──────────────────────────────────   │
│  Simplifying Fractions                │
│  ████████░░  +15  →  71%             │
│  ──────────────────────────────────   │
│                                        │
│  [ Next Question → ]                  │
└────────────────────────────────────────┘
```

**State B — Incorrect, misconception detected:**
```
┌────────────────────────────────────────┐
│  Not quite.  You answered 5/14.       │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  Watch: Why we don't add         │  │
│  │  denominators  ▶  0:32           │  │
│  └──────────────────────────────────┘  │
│                                        │
│  [ Watch and try again → ]            │
└────────────────────────────────────────┘
```
Routes to Phase 1B (remediation clip).

**State C — Incorrect, no misconception detected:**
```
┌────────────────────────────────────────┐
│  Not quite.  The answer is 5/7.       │
│                                        │
│  2/7 + 3/7:                           │
│  Step 1: Same denominator ✓           │
│  Step 2: Add numerators: 2+3 = 5      │
│  Step 3: Keep denominator: 7          │
│  Result: 5/7                          │
│                                        │
│  [ Try another one → ]                │
└────────────────────────────────────────┘
```

**State D — Skill mastered:**
```
┌────────────────────────────────────────┐
│                                        │
│   ✓  Simplifying Fractions            │
│      Mastered                         │
│                                        │
│   New skill unlocked:                 │
│   Comparing Fractions                 │
│                                        │
│   [ Start → ]                         │
│                                        │
└────────────────────────────────────────┘
```

Full screen. Pause. Let it land. This is the most emotionally significant moment in the product.

**Feedback tone rules across all states:**
- Never "Wrong!" — use "Not quite" or "Let's look at this"
- Every state shows *why*, not just *what*
- Correct answers: explanation under 3 sentences
- Misconception states: route to video, not a wall of text
- Never show mastery score decreasing — mastery loss is backend only

---

## 6. Progress Screen — `/progress`  *(MVP)*

```
┌────────────────────────────────────────┐
│  Your Progress                         │
│                                        │
│  Fractions                            │
│  ──────────────────────────────────   │
│  ✓ What is a Fraction?      Mastered  │
│  ✓ Fractions on Number Line Mastered  │
│  ✓ Equivalent Fractions     Mastered  │
│  → Simplifying Fractions    71% ███░  │  ← active
│    Comparing Fractions      Locked 🔒  │
│    Adding (same denom.)     Locked 🔒  │
│    Adding (diff. denom.)    Locked 🔒  │
│    Subtracting Fractions    Locked 🔒  │
│                                        │
│  Overall: 3 of 8 skills mastered      │
│                                        │
│  [ Continue Learning → ]              │
└────────────────────────────────────────┘
```

**Design rules:**
- Show all 8 skills including locked — student sees the full path ahead
- Locked skills show lock icon, no mastery bar — no false progress
- Active skill highlighted — one at a time
- Mastered skills show checkmark — earned, permanent-feeling
- One CTA only — routes back to session

---

## 7. Visual Teaching Tools (Zone 2 Components)

### 7.1 Fraction Bar (MVP)

SVG component generated dynamically from question parameters.

**Inputs:** `numerator`, `denominator`, `label`, `highlighted[]`

```
denominator = 5, numerator = 3

┌──┬──┬──┬──┬──┐
│██│██│██│  │  │
└──┴──┴──┴──┴──┘
      3/5
```

Use cases: identify a fraction, compare two fractions side-by-side, visualise addition as two bars combining into a third.

Implementation: inline SVG, parameterised. ~40 lines. No library needed.

### 7.2 Misconception Highlight (MVP)

Shown in feedback State B alongside the remediation clip entry point. The highest-value teaching moment in the product.

```
┌──────────────────┬──────────────────┐
│  What you did    │  What to do      │
│  ──────────────  │  ──────────────  │
│  1/3 + 1/4       │  1/3 + 1/4       │
│  = 2/7  ✗        │  = 4/12 + 3/12   │
│  (added both)    │  = 7/12  ✓       │
└──────────────────┴──────────────────┘
```

Clear, non-shaming, visually unambiguous.

### 7.3 Number Line (V2)

Interactive drag-to-place in V2. Static reference at MVP where needed.

### 7.4 AI-Generated Visual (V2+)

Parameterised diagrams generated from the student's specific question values. Same visual vocabulary as MVP components but generated dynamically rather than hardcoded.

---

## 8. Video Content Requirements

### 8.1 MVP Video Inventory

**14 videos total.** Recordable in a weekend with a screen recorder and drawing tablet or physical whiteboard.

**8 Intro Explanation Videos:**

| Video ID | Skill | Target Length | Key concepts |
|---|---|---|---|
| V-MS01 | What is a Fraction? | 90s | Numerator/denominator meaning, real object examples |
| V-MS02 | Fractions on Number Line | 75s | Magnitude, placing between whole numbers |
| V-MS03 | Equivalent Fractions | 90s | Multiplying/dividing both parts, visual proof |
| V-MS04 | Simplifying Fractions | 90s | GCF, step-by-step reduction |
| V-MS05 | Comparing Fractions | 75s | Common denominator method, benchmarking vs 1/2 |
| V-MS06 | Adding (Same Denom.) | 60s | Add tops, keep bottom, why this works |
| V-MS07 | Adding (Diff. Denom.) | 90s | LCM, converting, then adding |
| V-MS08 | Subtracting Fractions | 75s | Same LCM logic applied to subtraction |

**6 Remediation Clips:**

| Video ID | Misconception | Target Length | Core message |
|---|---|---|---|
| R-M1 | Denominator Addition Error | 35s | Denominators define piece size — you cannot add different sizes |
| R-M2 | Numerator/Denominator Confusion | 30s | Top = part you have, bottom = total parts, object proof |
| R-M3 | Equivalent Fraction Direction Error | 30s | Both top AND bottom must change together |
| R-M4 | Failure to Simplify | 25s | Always ask "can this be simpler?" |
| R-M5 | Wrong LCM | 30s | LCM vs any common multiple — why smallest matters |
| R-M6 | Comparison by Numerator Only | 35s | Different denominators = different piece sizes, visual proof |

### 8.2 Production Guidelines (MVP)

**Setup options:**
- Screen recorder (Loom, OBS) + drawing tablet with stylus app (Explain Everything, ShowMe)
- Physical whiteboard + phone camera — works equally well
- Resolution: 1280×720 minimum
- Audio: clear, no background noise, no music

**Tone:**
- Conversational, not lecture-style — speak to one student, not a class
- Use "you" not "everyone"
- Mistakes are normal and expected, not failures
- Never say "this is easy" or "obviously" — harmful to students who find it hard

**Visual style:**
- Dark marker on white background — high contrast
- Write while speaking, not before — students follow the drawing in real time
- One concept per frame — erase and redraw rather than crowding
- Two colours maximum: one for the problem, one for the answer/highlight

**File naming convention:**
```
intro_MS-01_what-is-a-fraction.mp4
intro_MS-07_adding-different-denominators.mp4
remediation_M1_denominator-addition-error.mp4
remediation_M6_comparison-numerator-only.mp4
```

### 8.3 Video Evolution Roadmap

```
V1 MVP
  Manually recorded whiteboard videos
  14 videos, recorded by founder
  Hosted on Supabase Storage or Cloudflare Stream
  Text fallback if video fails to load

V2
  AI-generated explanatory videos
  Parameterised to skill, difficulty level, and student grade
  Faster to produce, consistent visual style
  Candidate tools: Synthesia, HeyGen, or custom pipeline

V3
  Virtual AI tutor
  Conversational — responds to the student's specific answer in real time
  Real-time explanation generation
  Avatar-based or voice-only depending on engagement data from V2
  Each avatar instance reads from the same student cognitive model
```

### 8.4 Video Storage and Delivery

**Schema additions required (MVP):**

```sql
-- Add to micro_skills
alter table micro_skills
  add column intro_video_url        text,
  add column intro_video_length_sec integer;

-- Add to misconception_types
alter table misconception_types
  add column remediation_video_url        text,
  add column remediation_video_length_sec integer;
```

**Delivery requirements:**
- Compress to 720p, target under 5MB per clip
- Must play on Android Chrome without buffering on Malaysian 4G
- Fallback: if video fails to load, show text-based step explanation automatically — never a broken video state
- Hosting options in priority order: Cloudflare Stream (best delivery performance), Supabase Storage (simpler), YouTube unlisted (free but loses control)

---

## 9. Session State Machine

```
IDLE
  ↓ session started, new skill
INTRO_VIDEO          → Phase 1A: intro explanation screen
  ↓ "I'm ready" or skip
  ↓ session started, returning skill
QUESTION_ACTIVE      → Phase 2: question + answer
  ↓ hint requested
HINT_SHOWN           → hint text appears inline, stays in Phase 2
  ↓ answer submitted
EVALUATING           → loading state (≤300ms rule-based, ≤2s LLM)
  ↓ correct
FEEDBACK_CORRECT     → Phase 3 State A
  ↓ incorrect + misconception
FEEDBACK_MISCONCEPTION → Phase 3 State B → Phase 1B remediation clip
  ↓ incorrect + no misconception
FEEDBACK_INCORRECT   → Phase 3 State C
  ↓ mastery ≥ 0.80
SKILL_MASTERED       → Phase 3 State D: unlock celebration
  ↓ next question
QUESTION_ACTIVE      → cycle repeats
  ↓ session end condition
SESSION_COMPLETE     → session summary
```

**Transition rules:**
- INTRO_VIDEO → QUESTION_ACTIVE: student taps "I'm ready" or skip
- REMEDIATION_CLIP → QUESTION_ACTIVE: only after video ends — not skippable
- All other transitions: immediate on student action
- Nothing advances automatically — student always in control

---

## 10. Student Engagement Features

The engagement mechanism in ALIP is **visible mastery progress and the satisfaction of watching a misconception corrected in real time.** Not points or badges.

### 10.1 Mastery Bar

```
  Simplifying Fractions
  ████████░░  71%
```

- Grows visibly on correct answers in Phase 3
- Never shown decreasing — mastery loss is backend only
- Colour states: muted grey (weak), blue (developing), green (mastered)

### 10.2 Skill Unlock Moment

Full screen. Pause. The student earned this. Let it register before moving on.

### 10.3 Session Summary

```
┌────────────────────────────────────────┐
│  Good session, Amir.                  │
│                                        │
│  Today:                               │
│  • 8 questions answered               │
│  • 1 explanation watched              │
│  • Simplifying Fractions: 54% → 71%  │
│  • 1 thing to watch: you added        │
│    denominators twice today           │
│                                        │
│  [ Keep going ]  [ I'm done ]         │
└────────────────────────────────────────┘
```

"1 thing to watch" is generated from `v_active_misconceptions`. One item, plain language, non-alarming. This same sentence feeds the parent weekly summary.

### 10.4 What ALIP Does NOT Include (By Design)

| Feature | Why excluded |
|---|---|
| Streaks | Optimises for login frequency, not mastery |
| Leaderboards | Wrong competitive frame, creates anxiety |
| Badges / trophies | Extrinsic motivation undermines intrinsic |
| Stars / coins | No cognitive value |
| Countdown timers | Degrades answer quality |
| Animated mascots | Engagement cost outweighs learning benefit at MVP |
| Social features | Out of scope for cognitive personalisation |

---

## 11. Mobile Considerations

Primary device: mid-range Android phone, Malaysian mobile connection.

- All tap targets minimum 44×44px
- Fraction bar SVGs render correctly at 320px minimum width
- Video player works on Android Chrome — no Flash, no proprietary player
- Answer options readable at 14px minimum font size
- No hover states — touch interactions only
- Feedback zone readable without scrolling on a standard phone screen
- Session survives network drop — question already loaded must not be lost
- Videos ≤5MB, 720p — playable on 4G without buffering
- Video fallback: if load fails, show text explanation automatically

---

## 12. Implementation Priority

```
WEEK 1–2  (core session skeleton)
  ├── Session screen zones 1–3
  ├── Multiple choice input component
  ├── Fraction bar SVG component
  ├── Phase 1A: intro video player
  └── Phase 3 States A and C: correct/incorrect feedback

WEEK 3–4  (complete the loop)
  ├── Phase 1B: remediation clip screen
  ├── Phase 3 State B: misconception feedback + highlight
  ├── Mastery bar component
  ├── Skill unlock screen (State D)
  └── Session summary screen

WEEK 5–6  (remaining screens + content)
  ├── Progress screen
  ├── Home screen
  ├── End-to-end session flow
  ├── Record all 14 MVP videos
  └── Add video URL columns to Supabase tables

WEEK 7–8  (beta readiness)
  ├── Mobile optimisation pass
  ├── Video fallback (text if load fails)
  ├── Hint tracking and logging
  └── First 3 beta students onboarded
```

---

## 13. Open Questions

| # | Question | Impact | Resolve by |
|---|---|---|---|
| 1 | Session length target: 5 questions or 10? | Session summary trigger, parent reporting | Week 1 |
| 2 | Can students skip a question? | Mastery signal quality | Week 1 |
| 3 | Distractor count per question: 3 or 4? | Misconception mapping coverage | Week 1 |
| 4 | Hint: one-tap or confirm? | Hint usage rate, mastery delta accuracy | Week 2 |
| 5 | Progress screen: student-facing, parent-facing, or both? | Language and data density | Week 3 |
| 6 | Who records the MVP videos — founder or outsourced? | Week 5–6 content timeline | Week 2 |
| 7 | Video hosting: Cloudflare Stream, Supabase Storage, or YouTube unlisted? | Delivery speed, cost, control | Week 2 |

---

*Document version: 2.0*  
*Scope: MVP (V1) with V2/V3 extensions noted*  
*Last updated: March 2026*
