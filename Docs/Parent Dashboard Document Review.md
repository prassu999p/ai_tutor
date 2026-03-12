# 14. Parent Dashboard
## Adaptive Learning Intelligence Platform

**Document type:** Product Design Specification  
**Scope:** Parent-facing dashboard — progress visibility, misconception insights, weekly reporting  
**MVP target:** Web view accessible via link. No login required at beta.  
**Design principle:** Parents are the paying customer. This dashboard is the primary retention mechanism.

---

## 1. Strategic Purpose

The parent dashboard exists to answer one question every paying parent is asking:

> *Is my child actually learning — or just clicking through questions?*

Most edtech platforms cannot answer this question well. They show session counts, time spent, and stars earned. None of that is evidence of learning.

ALIP can answer it precisely because the cognitive engine tracks mastery at the micro-skill level and classifies every mistake into a specific misconception type. The dashboard's job is to surface that intelligence in plain language a parent can understand in under two minutes.

**The dashboard is not a reporting tool. It is a trust-building tool.**

Every design decision must ask: does this make a parent more confident that their child is in the right place? If yes, include it. If it creates confusion or anxiety without actionable insight, remove it.

---

## 2. Personas

### 2.1 Primary Persona — Parent (MVP)

**Who:** A parent paying RM50–100/month for their child's fractions tutoring. Likely a working professional. Checks the dashboard weekly, not daily. Does not want to interpret raw data — wants conclusions.

**What they need to see:**
- Is my child making progress this week?
- What is my child still struggling with?
- Why does my child keep making this mistake?
- What should I do to help?

**What they do not need:**
- Statistical models or score calculations
- Comparison to other students
- Raw attempt counts or database metrics
- Technical terminology (mastery_score, misconception_id, IRT)

### 2.2 Secondary Persona — Teacher / Tuition Centre Operator (V2)

Teacher mode is a meaningfully different product — different data aggregation, class-level views, intervention tools. It is **not part of MVP**. It is referenced in Section 11 for planning purposes only.

---

## 3. MVP Scope vs Later Versions

This table governs every build decision. If a feature is not marked MVP, it does not get built in the first 8 weeks.

| Feature | MVP | V2 | V3+ |
|---|---|---|---|
| Learning summary (skills mastered, sessions) | ✓ | | |
| Concept progress (skill-by-skill status) | ✓ | | |
| Active misconceptions in plain language | ✓ | | |
| Session activity log (this week) | ✓ | | |
| Weekly WhatsApp/email summary | ✓ | | |
| Skill mastery trend over time | | ✓ | |
| Concept mastery chart (multi-concept) | | ✓ | |
| AI-generated parent insights | | ✓ | |
| Skill improvement graph | | ✓ | |
| Teacher / class overview | | ✓ | |
| Push notifications | | ✓ | |
| Long-term academic progress tracking | | | ✓ |
| School performance comparison | | | ✓ |
| Parent action recommendations (AI) | | | ✓ |

---

## 4. Data Sources

Every metric in the dashboard maps directly to existing Supabase views and tables. No new backend logic is required at MVP.

| Dashboard section | Data source |
|---|---|
| Skills mastered count | `v_concept_mastery` → `skills_mastered` |
| Overall concept mastery % | `v_concept_mastery` → `pct_skills_mastered` |
| Skill-by-skill status | `v_student_skill_profile` |
| Active misconceptions | `v_active_misconceptions` |
| Sessions this week | `sessions` table, filtered by `started_at` |
| Questions answered | `sessions.questions_answered` aggregate |
| Weekly summary data | Combination of above views |

**Implementation note:** The parent dashboard at MVP is three or four Supabase queries. It does not require a separate backend service. A Next.js page with server-side data fetching from these views is sufficient.

---

## 5. Dashboard Layout

The dashboard is a single scrollable page. Four sections in order of parent priority — most important information first.

```
┌─────────────────────────────────────────────────────┐
│  SECTION 1: Learning Summary                        │  Above the fold
├─────────────────────────────────────────────────────┤
│  SECTION 2: Concept Progress                        │  Skill-by-skill detail
├─────────────────────────────────────────────────────┤
│  SECTION 3: Misconception Insights                  │  The differentiator
├─────────────────────────────────────────────────────┤
│  SECTION 4: Session Activity                        │  Consistency view
└─────────────────────────────────────────────────────┘
```

Section 1 must be readable without scrolling on a phone screen. Everything a parent needs to know in a 10-second check should be in Section 1.

---

## 6. Section 1 — Learning Summary

**Purpose:** Instant snapshot. Answers "is my child making progress?" without any further reading required.

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  Arjun's Learning Progress                         │
│  Fractions  ·  Last updated: Today, 4:32pm         │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐                │
│  │      4 / 8   │  │     62%      │                │
│  │ Skills       │  │ Concept      │                │
│  │ Mastered     │  │ Mastery      │                │
│  └──────────────┘  └──────────────┘                │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐                │
│  │      6       │  │     84       │                │
│  │ Sessions     │  │ Questions    │                │
│  │ Completed    │  │ Answered     │                │
│  └──────────────┘  └──────────────┘                │
│                                                     │
│  Currently working on:                             │
│  Comparing Fractions  ──  Developing  ███░░  54%   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Design rules:**
- Student name in the header — this is about their child, make it personal
- "Last updated" timestamp — parents need to know the data is current
- Four metrics maximum — more than four creates cognitive load
- "Currently working on" pulls from `get_next_skill()` — shows the active skill name, not an ID
- Concept mastery % sourced from `v_concept_mastery.pct_skills_mastered` — skills mastered divided by total skills, shown as a percentage
- Only show the active concept (Fractions at MVP) — do not show Decimals at 0% or other inactive concepts

**Language rules:**
- "Skills Mastered" not "mastery_score" or "proficiency level"
- "Concept Mastery" not "aggregate weighted score"
- "Sessions Completed" not "interaction events"
- "Questions Answered" not "total attempts"

---

## 7. Section 2 — Concept Progress

**Purpose:** Show exactly where the student is on the learning path. Answers "what does my child know and what are they still working on?"

```
┌─────────────────────────────────────────────────────┐
│  Fractions — Skill Progress                         │
│                                                     │
│  ✓  What is a Fraction?           Mastered          │
│  ✓  Fractions on a Number Line    Mastered          │
│  ✓  Equivalent Fractions          Mastered          │
│  ✓  Simplifying Fractions         Mastered          │
│  →  Comparing Fractions           Developing  54%   │  ← active
│     Adding Fractions (Basic)      Not started  🔒   │
│     Adding Fractions (Advanced)   Not started  🔒   │
│     Subtracting Fractions         Not started  🔒   │
│                                                     │
│  4 of 8 skills mastered                            │
└─────────────────────────────────────────────────────┘
```

**Design rules:**
- Show all skills including locked — parents see the full curriculum path
- Mastered: green checkmark, label "Mastered"
- Active/developing: arrow indicator, label "Developing" with percentage
- Locked: lock icon, label "Not started" — not "Locked" (avoids negative framing)
- Weak but unlocked: shows percentage, no icon — just the bar and status
- Do not show mastery percentage on locked/not-started skills — nothing to misread
- Sorted by `position` from `micro_skills` table — always in curriculum order
- Data source: `v_student_skill_profile` filtered by `student_id`

---

## 8. Section 3 — Misconception Insights

**Purpose:** Explain *why* mistakes happen, not just that they occurred. This is the highest-value section for parent trust and the feature most differentiated from competing products.

```
┌─────────────────────────────────────────────────────┐
│  What Arjun is Still Working Through               │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  ⚠  Adding denominators together            │   │
│  │                                             │   │
│  │  Arjun has done this 4 times:               │   │
│  │                                             │   │
│  │  He writes  1/3 + 1/4 = 2/7                │   │
│  │  instead of 1/3 + 1/4 = 7/12               │   │
│  │                                             │   │
│  │  What this means:                          │   │
│  │  He is treating the top and bottom numbers │   │
│  │  of a fraction as separate. The system has │   │
│  │  shown him a targeted explanation for this │   │
│  │  error and will continue reinforcing it.   │   │
│  │                                             │   │
│  │  What you can do at home:                  │   │
│  │  Ask him to explain what 1/4 means using   │   │
│  │  a physical object — a pizza, a chocolate  │   │
│  │  bar, or folded paper. If he can explain   │   │
│  │  it correctly, the concept is forming.     │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  No other active misconceptions.                   │
└─────────────────────────────────────────────────────┘
```

**Design rules:**
- Section title: "What [name] is still working through" — not "Misconceptions Detected" or "Errors"
- Show maximum 2 active misconceptions — more than 2 creates alarm without proportionate insight
- Each misconception card includes: plain-language name, occurrence count, concrete example (actual wrong answer shown), explanation of root cause in parent language, what the system is doing about it, what the parent can do at home
- If no active misconceptions: show "No active misconceptions — great sign." Not an empty section.
- Data source: `v_active_misconceptions` filtered by `student_id`, ordered by `occurrence_count desc`, limited to 2
- The "what you can do at home" text is static per misconception type — pre-written in `misconception_types.remediation`, reworded for parent audience (not the technical version used internally)
- Severity is NOT shown to parents — "high severity" creates unnecessary anxiety. The system handles severity internally.

**Language translation table (internal → parent-facing):**

| Internal label | Parent-facing text |
|---|---|
| Denominator Addition Error | Adding denominators together |
| Numerator/Denominator Confusion | Mixing up the top and bottom of a fraction |
| Equivalent Fraction Direction Error | Only changing half of the fraction |
| Failure to Simplify | Not simplifying the final answer |
| Wrong LCM | Using the wrong common denominator |
| Comparison by Numerator Only | Comparing fractions by the top number only |

---

## 9. Section 4 — Session Activity

**Purpose:** Show learning consistency. Answers "is my child actually using the product regularly?"

```
┌─────────────────────────────────────────────────────┐
│  This Week's Sessions                               │
│                                                     │
│  Mon  ✓  12 questions  ·  Fractions  ·  18 min      │
│  Tue  ✓  10 questions  ·  Fractions  ·  14 min      │
│  Wed  —  No session                                 │
│  Thu  ✓  15 questions  ·  Fractions  ·  21 min      │
│  Fri  ✓  11 questions  ·  Fractions  ·  16 min      │
│  Sat  —  No session                                 │
│  Sun  —  No session                                 │
│                                                     │
│  4 sessions this week  ·  48 questions answered     │
└─────────────────────────────────────────────────────┘
```

**Design rules:**
- Show current week only at MVP — full history is V2
- Each session row: day, tick/dash, question count, concept, approximate duration
- Duration calculated from `session.started_at` to `session.ended_at` — show in minutes, rounded
- No session = dash and "No session" — not a red cross or negative indicator
- Weekly aggregate at the bottom: sessions count and questions answered
- Do not show a streak counter — optimises for the wrong behaviour (daily login vs actual learning)
- Data source: `sessions` table filtered by `student_id` and current week `started_at`

---

## 10. Weekly Summary Report

**Purpose:** Proactive delivery of dashboard content to the parent without requiring them to log in. This is the highest-leverage retention mechanism at MVP — parents who receive a weekly summary are more likely to continue paying.

### 10.1 Delivery Method

**MVP: WhatsApp message (manual send by founder)**

This is the right call for beta. Malaysian parents are on WhatsApp. Email open rates are low. A WhatsApp message from the founder personally feels premium, not automated, and creates a direct feedback loop.

Do not build automated delivery at MVP. The founder sends the weekly summary message manually using a template. This takes 5 minutes per student per week. For 10 beta students, that is 50 minutes per week — worth it for the trust it builds and the feedback it generates.

**V2: Automated WhatsApp via Twilio or WhatsApp Business API**

**V3: In-app notifications + email digest**

### 10.2 Weekly Summary Message Template

```
Hi [Parent Name],

Here is Arjun's learning update for this week:

✅ Sessions: 4 completed
✅ Questions answered: 48
✅ Skills improved: Comparing Fractions (41% → 54%)
⭐ Milestone: Simplifying Fractions — Mastered!

One thing to watch:
Arjun is still sometimes adding the top and bottom
numbers of fractions together when adding. The system
is working on this with a targeted explanation.

What you can try at home:
Ask him to explain what 1/4 means using a physical
object like a pizza or a folded piece of paper.

He is making real progress. Keep it up!

— [Founder name], ALIP
```

**Message rules:**
- Address parent by name, not "Dear Parent"
- Lead with positive progress — sessions first, then skills
- Milestone (mastered skill) gets its own line with a star — this is the moment parents forward to relatives
- One misconception maximum — framed as "one thing to watch", not "problem" or "error"
- Home action is specific and doable in 5 minutes
- Signed by the founder personally at beta — not "The ALIP Team"
- Keep under 200 words — parents skim, they do not read

### 10.3 Trigger Conditions for Mid-Week Messages (V2)

These are not built at MVP but planned for V2 automated delivery:

| Event | Message |
|---|---|
| Skill mastered | "Great news — Arjun just mastered [skill]!" |
| 5 days inactive | "Arjun hasn't had a session since [day] — just checking in" |
| Misconception occurs 3+ times | "We noticed a pattern we want to address with Arjun" |
| Concept fully mastered | "[Name] has mastered all Fractions skills — here's what's next" |

---

## 11. Teacher Mode (V2)

Teacher mode is a separate product surface accessed by tuition centre operators and classroom teachers. It is not built at MVP.

**What it contains:**

```
┌─────────────────────────────────────────────────────┐
│  Class Overview  —  Grade 5  —  Fractions           │
│                                                     │
│  Students enrolled:     24                         │
│  Average concept mastery: 54%                      │
│  Students mastered 5+ skills: 8                    │
│  Students needing intervention: 5                   │
│                                                     │
│  ─────────────────────────────────────────────────  │
│  Student          Mastery   Active Misconceptions   │
│  Arjun            62%       Denominator addition    │
│  Priya            71%       None                    │
│  Wei Jian         38%       Numerator confusion (3x)│
│  ...                                               │
└─────────────────────────────────────────────────────┘
```

**Teacher-specific data needs:**
- Class-level mastery aggregation (new SQL view required)
- Intervention priority list (students below threshold)
- Misconception frequency across class (which errors are systemic vs individual)
- Individual student drill-down from class view

**Unlock condition:** Teacher mode is built when the first tuition centre signs on as a B2B customer. Do not build it speculatively.

---

## 12. Student Cognitive Profile (V2)

A deeper summary view per student that shows strength/weakness pattern across all skills. Used by teachers at V2 and potentially by parents who want more depth.

```
┌─────────────────────────────────────────────────────┐
│  Arjun — Cognitive Profile  —  Fractions            │
│                                                     │
│  Strong (Mastered)                                 │
│  ✓ What is a Fraction?                             │
│  ✓ Fractions on a Number Line                      │
│  ✓ Equivalent Fractions                            │
│  ✓ Simplifying Fractions                           │
│                                                     │
│  Developing                                        │
│  → Comparing Fractions  (54%)                      │
│                                                     │
│  Not yet started                                   │
│  ○ Adding Fractions (Basic)                        │
│  ○ Adding Fractions (Advanced)                     │
│  ○ Subtracting Fractions                           │
│                                                     │
│  Active patterns to address:                       │
│  · Denominator addition error (4 occurrences)      │
└─────────────────────────────────────────────────────┘
```

Data source: `v_student_skill_profile` + `v_active_misconceptions`. No new views needed.

---

## 13. Access Model

### MVP — No login required

The parent dashboard is accessed via a unique URL per student sent by the founder over WhatsApp. No authentication, no password.

```
https://alip.app/dashboard/[student-token]
```

The `student-token` is a UUID generated when the student is created. It is sent to the parent once and bookmarked. This removes all onboarding friction at beta.

**Security note:** The token is not guessable (UUID v4) but is not truly private. At MVP with 5–10 beta students this is acceptable. Add proper authentication before any public launch.

### V2 — Parent login

Email + OTP login. No passwords. Parents receive a magic link to their phone.

### V3 — Role-based access

Parent, teacher, and school administrator roles with appropriate data scope per role.

---

## 14. Design Principles

**For every element on the dashboard, ask:**
1. Does a non-technical parent understand this in under 5 seconds?
2. Does it answer one of the four core parent questions?
3. If the answer is no to either — remove it.

**Avoid:**
- Progress percentages on locked skills (implies incomplete progress)
- Red indicators for "no session" days (shaming without purpose)
- Score decimals (0.714 mastery score means nothing to a parent)
- Technical labels from the database schema
- Comparison to other students or national averages at MVP
- Empty sections — every section shown must have content

**Include:**
- Student name in every heading — this is about their child
- Plain-language explanations of every metric shown
- "Last updated" timestamps so parents trust data freshness
- Specific, actionable home guidance tied to active misconceptions
- Celebration of milestones — mastered skills are a big deal

---

## 15. Implementation Priority

```
WEEK 5–6  (build after core session loop is working)
  ├── /dashboard/[token] route
  ├── Section 1: Learning Summary (v_concept_mastery query)
  ├── Section 2: Concept Progress (v_student_skill_profile query)
  └── Section 3: Misconception Insights (v_active_misconceptions query)

WEEK 7–8  (complete before beta onboarding)
  ├── Section 4: Session Activity (sessions table query)
  ├── Weekly summary message template
  ├── Student token generation on student create
  └── First parent dashboard links sent to beta families

V2
  ├── Skill mastery trend charts
  ├── Multi-concept progress view
  ├── Automated WhatsApp delivery
  ├── Teacher class overview
  └── Parent login (magic link)
```

---

## 16. Open Questions

| # | Question | Impact | Resolve by |
|---|---|---|---|
| 1 | Dashboard language: English only or Bahasa Malaysia too? | Parent comprehension, trust | Week 5 |
| 2 | Token delivery: WhatsApp or SMS? | Access friction at onboarding | Week 5 |
| 3 | How often does parent data refresh — on load or cached? | Query cost, data freshness | Week 6 |
| 4 | Does the parent see the student's session in real time or next-day? | Expectation management | Week 5 |
| 5 | Who writes the parent-language misconception descriptions? | Content production timeline | Week 4 |

---

*Document version: 1.0*  
*Scope: MVP (V1) with V2/V3 extensions noted*  
*Last updated: March 2026*
