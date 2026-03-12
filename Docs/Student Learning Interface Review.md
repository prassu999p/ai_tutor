# 13. Student Learning Interface
## Adaptive Learning Intelligence Platform

**Document type:** Product Design Specification  
**Scope:** Student-facing UI — layout, interaction patterns, visual teaching tools, engagement  
**MVP target:** Core session screen only. All other sections are V2+ unless marked MVP.  
**Design principle:** Every UI decision must serve cognitive clarity, not visual novelty.

---

## 1. Design Philosophy

The student interface has one job: reduce friction between a student's thinking and the system's ability to measure it.

This means:

- **Cognitive load stays low.** One question at a time. No competing elements. No visual noise.
- **Feedback is immediate and meaningful.** Not just right/wrong — the student understands *why*.
- **Progress is visible but not gamified.** Mastery is shown honestly, not inflated for engagement.
- **The system feels like a patient tutor, not a quiz app.** Tone, pacing, and explanation quality determine this more than any visual design choice.

What the interface must never become:
- A reward machine (badges, streaks, leaderboards)
- A passive content viewer (videos, slides, reading passages)
- A source of anxiety (timers, failure states, harsh feedback)

---

## 2. Screen Architecture

The student experience has three screens at MVP. Everything else is V2+.

```
┌─────────────────────────────────────────────┐
│  /                  Home / Student Select   │  MVP
│  /session           Active Learning Screen  │  MVP ★ core
│  /progress          Mastery Overview        │  MVP
│                                             │
│  /learn/:conceptId  Concept Entry (V2)      │  V2+
│  /review            Spaced Review (V2)      │  V2+
│  /profile           Student Profile (V3)    │  V3+
└─────────────────────────────────────────────┘
```

The session screen (`/session`) is the entire product at MVP. Design and engineering effort should be weighted accordingly: 70% session screen, 20% progress screen, 10% home.

---

## 3. Home Screen — `/`  *(MVP)*

**Purpose:** Get the student into a session in one tap. Nothing else.

**Layout:**

```
┌──────────────────────────────────┐
│                                  │
│   👋  Welcome back, Amir         │
│                                  │
│   You're working on:             │
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
- "Continue Learning" calls `get_next_skill()` and starts a session immediately
- Current skill and mastery score shown from `student_skill_state`
- No concept/topic selection at MVP — the system decides what's next
- Single student, no login at MVP. Student ID hardcoded or stored in localStorage

---

## 4. Session Screen — `/session`  *(MVP — primary focus)*

This is where learning happens. Every design decision on this screen has direct impact on data quality and mastery accuracy.

### 4.1 Layout Structure

The screen is divided into four vertical zones:

```
┌────────────────────────────────────────┐
│  ZONE 1: Session Context Bar           │  Fixed, minimal
├────────────────────────────────────────┤
│                                        │
│  ZONE 2: Teaching / Visual Space       │  Dynamic — changes per question type
│                                        │
├────────────────────────────────────────┤
│  ZONE 3: Question + Answer Input       │  Always visible
├────────────────────────────────────────┤
│  ZONE 4: Feedback / Explanation        │  Appears after submission
└────────────────────────────────────────┘
```

### 4.2 Zone 1 — Session Context Bar

Minimal. Fixed at the top. Never distracts from the question.

```
┌────────────────────────────────────────┐
│  Fractions  ›  Adding (same denom.)    │
│  ████████░░  Q4 of ~8                  │
└────────────────────────────────────────┘
```

- Skill name and concept breadcrumb
- Soft progress indicator (questions answered this session, not a hard count)
- No timer. Timers create anxiety and degrade answer quality.
- No score display during active session — score shown on progress screen only

### 4.3 Zone 2 — Teaching / Visual Space

This zone is the most important and most underbuilt component in most edtech products. It is not a decoration — it is the primary teaching surface.

**Content varies by question type:**

**Type A — Symbolic question (no visual needed)**
```
┌────────────────────────────────────────┐
│                                        │
│   What is the denominator in 3/5?     │
│                                        │
└────────────────────────────────────────┘
```
Zone 2 shows the question text large and clearly. No visual aid needed.

**Type B — Visual model (fraction bars / pie)**
```
┌────────────────────────────────────────┐
│  ┌──┬──┬──┬──┐   ┌──┬──┬──┐           │
│  │██│██│██│  │   │██│██│  │           │
│  └──┴──┴──┴──┘   └──┴──┴──┘           │
│      3/4              2/3             │
│                                        │
│   Which fraction is larger?           │
└────────────────────────────────────────┘
```

**Type C — Number line**
```
┌────────────────────────────────────────┐
│  0────────┼────────┼────────┼──────1   │
│           1/4      1/2      3/4        │
│                                        │
│   Where does 2/3 go on this line?     │
└────────────────────────────────────────┘
```

**Type D — Step-by-step worked example** (shown before a new skill's first question)
```
┌────────────────────────────────────────┐
│  How to add fractions with the same   │
│  denominator:                         │
│                                        │
│  2/5 + 1/5                            │
│   └─ Add the tops: 2 + 1 = 3         │
│   └─ Keep the bottom: 5               │
│   └─ Result: 3/5                      │
│                                        │
│  Now you try one.                     │
└────────────────────────────────────────┘
```

**Visual tool implementation priority:**
- MVP: Fraction bars (SVG, generated from question parameters)
- MVP: Step-by-step worked example (text-based)
- V2: Number line (interactive, draggable)
- V2: Pie chart model
- V2: Side-by-side comparison for fraction comparisons

### 4.4 Zone 3 — Question + Answer Input

The answer input must match the question type. Do not force all questions into a text box.

**Input type A — Multiple choice** (MVP default for most questions)
```
┌────────────────────────────────────────┐
│  Calculate: 2/7 + 3/7                 │
│                                        │
│  ○  5/14                              │
│  ○  5/7          ← correct            │
│  ○  6/7                               │
│  ○  2/7                               │
│                                        │
│  [  Submit Answer  ]                  │
└────────────────────────────────────────┘
```

Multiple choice at MVP is the right call. It:
- Makes misconception detection deterministic (you know exactly which wrong answer pattern)
- Removes ambiguity from answer parsing
- Reduces input friction on mobile
- Allows you to pre-encode distractor answers that map to specific misconceptions

**Distractor design rule:** Every wrong answer option must map to a specific misconception. Never use random wrong answers. Example for `2/7 + 3/7`:
- `5/14` → M1 (added denominators)
- `6/7` → arithmetic error
- `2/7` → subtracted instead of added

**Input type B — Fraction input** (V2)
```
  ┌───┐
  │ 5 │  ← numerator
──┼───┼──
  │ 7 │  ← denominator
  └───┘
```
Two separate number fields that render as a fraction. Better than a text box for fraction answers. Implement in V2 once core loop is validated.

**Input type C — Free text** (V2, for explanation questions)
```
  [ Explain why 1/3 + 1/4 does not equal 2/7 ]
  ┌────────────────────────────────┐
  │                                │
  └────────────────────────────────┘
```
Requires LLM to evaluate. V2 only.

### 4.5 Zone 4 — Feedback and Explanation

This zone is hidden until the student submits. It is the second most important surface in the product after the question itself.

**State A — Correct answer**
```
┌────────────────────────────────────────┐
│  ✓  That's right.                     │
│                                        │
│  2/7 + 3/7 = 5/7                      │
│  Same denominator — just add the      │
│  top numbers. The bottom stays.       │
│                                        │
│  Mastery: ████████░░  +15             │
│                                        │
│  [ Next Question → ]                  │
└────────────────────────────────────────┘
```

**State B — Incorrect answer, misconception detected**
```
┌────────────────────────────────────────┐
│  Not quite.  You answered 5/14.       │
│                                        │
│  It looks like you added the          │
│  denominators together.               │
│                                        │
│  Remember: the denominator tells      │
│  you the size of each piece.          │
│  Adding 1 third + 1 third doesn't     │
│  give you sixths — it gives you       │
│  two thirds.                          │
│                                        │
│  2/7 + 3/7 = 5/7                      │
│                                        │
│  [ Try a similar question → ]         │
└────────────────────────────────────────┘
```

**State C — Incorrect answer, no specific misconception detected**
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

**State D — Hint requested** (before submission)
```
┌────────────────────────────────────────┐
│  Hint: When denominators are the      │
│  same, you only need to add the       │
│  top numbers.                         │
└────────────────────────────────────────┘
```

Hint availability reduces the `answer_event` delta from +0.15 to +0.08. The hint button should be present but not prominent. Students should feel mild effort to find it — not hidden, but not encouraged. This is intentional friction that improves signal quality.

**Feedback tone rules:**
- Never say "Wrong!" or "Incorrect!" — use "Not quite" or "Let's look at this"
- Never skip the explanation — every feedback state shows why, not just what
- Keep explanations under 3 sentences for correct answers
- Misconception explanations may be longer — they need to reframe the concept, not just correct the answer
- Never show mastery score decreasing visibly to the student — show the current state, not the delta loss

---

## 5. Progress Screen — `/progress`  *(MVP)*

**Purpose:** Give the student (and parent via shoulder-surfing) a clear picture of where they stand.

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
- Show all 8 skills, even locked ones — students should see the full path ahead
- Locked skills show a lock icon, not a mastery bar — no false progress
- Active skill is highlighted — one at a time
- Mastered skills show a checkmark — clear, earned, permanent-feeling
- No percentages on locked skills — nothing to misinterpret
- "Overall" count is skills mastered, not a score or grade
- One CTA only — "Continue Learning" — routes back to the session

---

## 6. Visual Teaching Tools

These are the components that make ALIP a tutor, not a quiz app. They live in Zone 2 of the session screen.

### 6.1 Fraction Bar (MVP)

SVG component. Generated dynamically from question parameters.

**Inputs:** `numerator`, `denominator`, `label`, `highlighted` (boolean per segment)

```
denominator = 5, numerator = 3

┌──┬──┬──┬──┬──┐
│██│██│██│  │  │
└──┴──┴──┴──┴──┘
      3/5
```

**Use cases:**
- Show what a fraction looks like before asking the student to identify it
- Show two fraction bars side by side for comparison questions
- Show addition visually: two bars stacking into a third

**Implementation note:** Generate as inline SVG. Parameterise segment count, fill colour, and label. No external library needed — 30–40 lines of SVG generation code.

### 6.2 Number Line (V2)

```
0────┬────┬────┬────1
     1/4  1/2  3/4
```

Interactive version allows student to drag a point to place a fraction. Static version shown for reference only. V2 priority.

### 6.3 Step-by-Step Worked Example (MVP)

Text-based. Shown before a student's first attempt on a new micro-skill.

```
┌────────────────────────────────────┐
│  Before you try, here's how:      │
│                                    │
│  1/3 + 1/3                        │
│  ↓ Same denominator               │
│  Add the tops: 1 + 1 = 2          │
│  Keep the bottom: 3                │
│  Answer: 2/3                      │
└────────────────────────────────────┘
```

Shown once per new skill. Not repeated on subsequent questions unless the student requests it via "Show me how again."

### 6.4 Misconception Highlight (MVP)

When a misconception is detected, the feedback zone renders a targeted visual showing the specific error pattern and the correct approach side by side.

```
┌──────────────────┬──────────────────┐
│  What you did    │  What to do      │
│  ──────────────  │  ──────────────  │
│  1/3 + 1/4       │  1/3 + 1/4       │
│  = 2/7  ✗        │  = 4/12 + 3/12   │
│  (added both)    │  = 7/12  ✓       │
└──────────────────┴──────────────────┘
```

This is the highest-value teaching moment in the product. It must be clear, non-shaming, and visually unambiguous.

---

## 7. Student Engagement Features

These are deliberately minimal. ALIP is not a gamification product.

### 7.1 Mastery Bar (MVP)

A simple horizontal bar showing mastery progress for the current skill. Shown in Zone 1 (subtle) and Zone 4 after correct answers (celebratory).

```
  Simplifying Fractions
  ████████░░  71%
```

Rules:
- Increases visibly on correct answers — student sees the bar grow
- Never shown decreasing — mastery loss is a backend calculation, not a student-facing event
- Colours: weak = muted, developing = blue, mastered = green
- No numerical percentage shown during active session — only the bar

### 7.2 Skill Unlock Moment (MVP)

When a new skill unlocks, show a clear transition moment before continuing.

```
┌────────────────────────────────────────┐
│                                        │
│   🎯  Simplifying Fractions            │
│       Mastered                         │
│                                        │
│   New skill unlocked:                  │
│   Comparing Fractions                 │
│                                        │
│   [ Start →  ]                        │
│                                        │
└────────────────────────────────────────┘
```

This is the most emotionally significant moment in the student experience. Give it a full screen. Pause. Let it land. Then move forward.

### 7.3 Session Completion Summary (MVP)

Shown when the student ends a session or completes 8–10 questions.

```
┌────────────────────────────────────────┐
│  Good session, Amir.                  │
│                                        │
│  Today:                               │
│  • 8 questions answered               │
│  • Simplifying Fractions: 54% → 71%  │
│  • 1 thing to watch: denominator      │
│    addition (seen 2x today)           │
│                                        │
│  [ Keep going ]  [ I'm done ]         │
└────────────────────────────────────────┘
```

The "1 thing to watch" line is the most parent-valuable sentence in the product. It is generated from `v_active_misconceptions`. Keep it to one item, stated plainly, non-alarmingly.

### 7.4 What ALIP Does NOT Include (By Design)

These features are explicitly excluded. If they appear in any future planning discussion, flag this document.

| Feature | Why excluded |
|---|---|
| Streaks | Optimises for daily login, not mastery |
| Leaderboards | Creates anxiety, wrong competitive frame |
| Badges / trophies | Extrinsic motivation undermines intrinsic |
| Stars / coins | Gamification layer adds no cognitive value |
| Countdown timers | Degrades answer quality, creates anxiety |
| Animated characters | Engagement cost outweighs learning benefit |
| Social features | Out of scope for cognitive personalisation |

The engagement mechanism in ALIP is **visible mastery progress**. A student who can see themselves moving from Weak → Developing → Mastered on a skill they were stuck on is more motivated than any badge system. That is the bet. Hold the line on it.

---

## 8. Mobile Considerations

The primary device for beta students in Malaysia is a mid-range Android phone. Design decisions must account for this.

**Non-negotiables:**
- All tap targets minimum 44×44px
- Fraction bar SVGs must render correctly at 320px width
- Answer options must be readable at 14px minimum font size
- No hover states as primary interactions — touch only
- Zone 4 (feedback) must not require scrolling to read in full on a standard phone screen
- Session screen must work offline-first for questions already loaded — network drop mid-session should not lose a student's answer

**Input method:**
- Multiple choice (MVP default) works perfectly on mobile — no keyboard required
- Avoid free text input at MVP for this reason
- Fraction input widget (V2) must be designed for touch — two large tap targets for numerator and denominator, not keyboard entry

---

## 9. State Machine — Session Screen

The session screen has six states. Each maps to a distinct UI rendering.

```
IDLE
  ↓ session started
QUESTION_ACTIVE          → Zone 2 + 3 visible, Zone 4 hidden
  ↓ student requests hint
HINT_SHOWN               → Zone 4 shows hint text only
  ↓ student submits answer
EVALUATING               → brief loading state (100–300ms max)
  ↓
FEEDBACK_CORRECT         → Zone 4: correct feedback + mastery bar update
FEEDBACK_INCORRECT       → Zone 4: misconception explanation or step walkthrough
  ↓ student taps Next
QUESTION_ACTIVE          → next question loaded, cycle repeats
  ↓ session end condition
SESSION_COMPLETE         → session summary screen
```

Transitions must be fast. The gap between submission and feedback must not exceed 300ms for rule-based classifier. LLM classifier (V2) may take 1–2 seconds — show a subtle loading state, not a spinner.

---

## 10. Implementation Priority

```
WEEK 1–2 (build these)
  ├── Session screen skeleton (zones 1–3)
  ├── Multiple choice input component
  ├── Correct/incorrect feedback component
  └── Fraction bar SVG component

WEEK 3–4 (complete the loop)
  ├── Misconception feedback component
  ├── Mastery bar component
  ├── Skill unlock screen
  └── Session summary screen

WEEK 5–6 (progress + home)
  ├── Progress screen
  ├── Home screen
  └── End-to-end session flow

WEEK 7–8 (beta polish)
  ├── Mobile optimisation
  ├── Worked example component
  └── First 3 beta students onboarded
```

---

## 11. Open Questions (Resolve Before Build)

| # | Question | Impact | Resolve by |
|---|---|---|---|
| 1 | What is the session length target? 5 questions or 10? | Affects session summary trigger | Week 1 |
| 2 | Should students be able to skip a question? | Affects mastery signal quality | Week 1 |
| 3 | How many distractor options per question? 3 or 4? | Affects misconception mapping | Week 1 |
| 4 | Should the hint be one-tap or require confirmation? | Affects hint usage rate and mastery delta accuracy | Week 2 |
| 5 | Is the progress screen student-facing or parent-facing or both? | Affects language and data density | Week 3 |

---

*Document version: 1.0*  
*Scope: MVP (V1) with V2 extensions noted*  
*Last updated: March 2026*
