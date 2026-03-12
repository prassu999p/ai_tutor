# 15. Content Authoring System
## Adaptive Learning Intelligence Platform

**Document type:** Product Design Specification  
**Scope:** Content creation, management, versioning, and AI-powered video generation pipeline  
**MVP reality:** No authoring UI. Founder authors all content directly via Supabase.  
**Design principle:** Content quality determines cognitive engine quality. Every piece of content that reaches a student must pass a human review gate — AI accelerates production, it does not replace judgment.

---

## 1. Strategic Purpose

The content authoring system is the mechanism by which the platform scales beyond the founder's personal knowledge and manual effort.

At MVP, the founder is the only author. Every micro-skill, misconception, question, explanation, and video is produced manually. This is the right call for 8 weeks and 10 beta students — it keeps scope tight and ensures the founder deeply understands the content before automating its production.

The authoring system — both the UI and the AI video pipeline — becomes necessary when:

- A second subject (Science or English) is added in V2+
- External curriculum designers or subject matter experts contribute content
- The question bank needs to scale beyond what one person can produce
- Video production needs to happen faster than manual recording allows
- AI-assisted generation requires a structured review and approval workflow

**Build trigger for authoring UI:** When the first external content contributor joins.  
**Build trigger for AI video pipeline:** When manual video production becomes the bottleneck — estimated at V2, post-fractions validation.

---

## 2. Content Hierarchy

All content follows the four-level structure established in the schema. Every authoring decision must respect this hierarchy.

```
Subject
  └── Domain
        └── Concept
              └── Micro-Skill
                    ├── Practice Questions
                    ├── Intro Video          ← teaching asset
                    └── Misconception Types
                          └── Remediation Video  ← teaching asset
```

**Current MVP state:**

```
Mathematics  [MATH]  ← active
  └── Number & Operations  [MATH_NUM]  ← active
        ├── Fractions  [FRAC]  ← active, fully seeded
        ├── Decimals   [DEC]   ← scaffolded, inactive
        ├── Percentages [PCT]  ← scaffolded, inactive
        └── Ratios     [RATIO] ← scaffolded, inactive

Science  [SCI]   ← scaffolded, inactive
English  [ENG]   ← scaffolded, inactive
```

Activating a new concept requires: SQL seed data + minimum question bank + all videos produced and reviewed. All three gates must be met before `is_active = true`.

---

## 3. MVP Content Production — No UI Required

At MVP, all content is authored through three direct channels. No authoring interface is built.

### Channel 1 — SQL seed files (structural content)

`002_seed_data.sql` is the authoritative source for all structural content: subjects, domains, concepts, micro-skills, prerequisite edges, and misconception types.

Changes to structural content are made by editing the seed file and running a migration. Structural content is intentionally stable — it should rarely change after initial seeding.

### Channel 2 — Supabase Table Editor (questions)

New questions, explanations, and hints are added directly via the Supabase dashboard. No code required. Fields to populate per question:

```
skill_id          → which micro-skill this tests
concept_id        → which concept (FRAC, DEC, etc.)
question_text     → the question shown to the student
correct_answer    → the exact correct answer string
explanation       → shown after wrong answer — why the answer is right
hint_text         → one sentence, shown on student request
difficulty_weight → 0.5 easy / 1.0 standard / 1.5 hard / 2.0 advanced
```

### Channel 3 — Video files (teaching assets)

The 14 MVP whiteboard videos are recorded manually by the founder, compressed to 720p ≤5MB, and uploaded to Supabase Storage or Cloudflare Stream. Their URLs are written directly to:

```sql
update micro_skills
  set intro_video_url = 'https://...', intro_video_length_sec = 84
  where id = 'MS-01';

update misconception_types
  set remediation_video_url = 'https://...', remediation_video_length_sec = 32
  where id = 'M1';
```

These are file uploads with a URL reference — not managed through an authoring UI at MVP.

---

## 4. MVP Video Inventory

**14 videos total.** The complete teaching asset set for the fractions MVP.

### Intro Explanation Videos (8)

One per micro-skill. Recorded as whiteboard-style screen recordings.

| Video ID | Skill | Target length | Key concept |
|---|---|---|---|
| V-MS01 | What is a Fraction? | 90s | Numerator/denominator meaning, real object examples |
| V-MS02 | Fractions on a Number Line | 75s | Magnitude, placing between whole numbers |
| V-MS03 | Equivalent Fractions | 90s | Multiplying/dividing both parts, visual proof |
| V-MS04 | Simplifying Fractions | 90s | GCF, step-by-step reduction |
| V-MS05 | Comparing Fractions | 75s | Common denominator, benchmarking vs 1/2 |
| V-MS06 | Adding (Same Denominator) | 60s | Add tops, keep bottom, why this works |
| V-MS07 | Adding (Different Denominators) | 90s | LCM, convert, then add |
| V-MS08 | Subtracting Fractions | 75s | Same LCM logic applied to subtraction |

### Remediation Clips (6)

One per misconception type. Short, targeted, non-skippable.

| Video ID | Misconception | Target length | Core message |
|---|---|---|---|
| R-M1 | Denominator Addition Error | 35s | Denominators define piece size — cannot add different sizes |
| R-M2 | Numerator/Denominator Confusion | 30s | Top = part you have, bottom = total parts |
| R-M3 | Equivalent Fraction Direction Error | 30s | Both top AND bottom must change together |
| R-M4 | Failure to Simplify | 25s | Always ask "can this be simpler?" |
| R-M5 | Wrong LCM | 30s | LCM vs any common multiple — why smallest matters |
| R-M6 | Comparison by Numerator Only | 35s | Different denominators = different piece sizes |

### File naming convention

```
intro_MS-01_what-is-a-fraction.mp4
intro_MS-07_adding-different-denominators.mp4
remediation_M1_denominator-addition-error.mp4
remediation_M6_comparison-numerator-only.mp4
```

---

## 5. AI Video Generation Pipeline

Manual recording works at MVP. It breaks at scale. When the fractions concept is validated and V2 expansion begins, video production becomes the primary content bottleneck — recording, editing, and uploading 14 videos per concept does not scale to 50 concepts.

The AI video pipeline replaces manual production with an automated rendering system that is subject-agnostic, parametric, and gated by mandatory human review before any video reaches a student.

### 5.1 Architecture Overview

The pipeline has five sequential steps. Steps 1–4 are automated. Step 5 is always human.

```
┌──────────────────────────────────────────────────────────────┐
│                 ALIP VIDEO GENERATION PIPELINE               │
│                                                              │
│  INPUT: skill or misconception record from database          │
│  {skill_id, subject, concept, description, mastery_goal,     │
│   misconception_types, difficulty, grade_range}              │
│                         ↓                                    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  STEP 1: Script Generator                             │  │
│  │  Engine:  LLM (Claude or GPT-4)                      │  │
│  │  Input:   skill metadata from database               │  │
│  │  Output:  structured script JSON                     │  │
│  │  {                                                   │  │
│  │    "narration": "A fraction represents...",          │  │
│  │    "duration_sec": 84,                               │  │
│  │    "visuals": [                                      │  │
│  │      {"type": "fraction_bar",                        │  │
│  │       "params": {"num": 3, "den": 5},                │  │
│  │       "at_sec": 12},                                 │  │
│  │      {"type": "highlight_text",                      │  │
│  │       "params": {"text": "numerator"},               │  │
│  │       "at_sec": 18}                                  │  │
│  │    ]                                                 │  │
│  │  }                                                   │  │
│  └────────────────────────────────────────────────────────┘  │
│                         ↓                                    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  STEP 2: Visual Renderer  (subject-specific engine)   │  │
│  │                                                       │  │
│  │  MATH    → Manim                                     │  │
│  │            Animated equations, fraction bars,        │  │
│  │            number lines, graphs                      │  │
│  │                                                       │  │
│  │  SCIENCE → AI image generation + FFmpeg              │  │
│  │            DALL-E / Stable Diffusion for diagrams    │  │
│  │            Ken Burns pan/zoom for static images      │  │
│  │            Cell diagrams, atoms, circuits, cycles    │  │
│  │                                                       │  │
│  │  ENGLISH → Remotion (React-based video generation)   │  │
│  │            Animated text, sentence highlighting,     │  │
│  │            word breakdowns, passage annotations      │  │
│  │                                                       │  │
│  │  Output: silent visual track MP4                     │  │
│  └────────────────────────────────────────────────────────┘  │
│                         ↓                                    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  STEP 3: Narration Generator                         │  │
│  │  Engine:  ElevenLabs TTS                             │  │
│  │  Input:   narration script from Step 1              │  │
│  │  Voice:   consistent character per subject          │  │
│  │           (Math tutor voice, Science tutor voice)   │  │
│  │  Output:  timestamped MP3 + caption SRT file        │  │
│  └────────────────────────────────────────────────────────┘  │
│                         ↓                                    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  STEP 4: Assembly                                    │  │
│  │  Engine:  FFmpeg                                     │  │
│  │  Inputs:  visual track MP4 + narration MP3 +        │  │
│  │           captions SRT                              │  │
│  │  Process: sync audio to visual cues from script     │  │
│  │           burn captions                             │  │
│  │           compress to 720p ≤5MB                     │  │
│  │  Output:  final MP4 ready for review               │  │
│  └────────────────────────────────────────────────────────┘  │
│                         ↓                                    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  STEP 5: Human Review Queue  ← NON-NEGOTIABLE        │  │
│  │                                                       │  │
│  │  Reviewer watches full video before any publish      │  │
│  │  Checks:                                             │  │
│  │    □ Mathematical/scientific accuracy               │  │
│  │    □ Explanation clarity for target grade           │  │
│  │    □ Narration tone (not condescending)             │  │
│  │    □ Visual quality at 320px mobile width           │  │
│  │    □ Captions accurate                              │  │
│  │    □ No errors introduced by generation             │  │
│  │                                                       │  │
│  │  Approve → upload + publish                         │  │
│  │  Reject  → flag reason → regenerate or manual fix   │  │
│  └────────────────────────────────────────────────────────┘  │
│                         ↓                                    │
│  Upload to Cloudflare Stream                                 │
│  Write URL → micro_skills.intro_video_url                    │
│  Set concept.is_active = true (if all videos approved)       │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 Subject-Specific Visual Renderer Detail

**Mathematics — Manim**

Manim is an open-source Python animation library built for mathematical visualisation. It is parametric — the same script generates different visuals by changing input values.

```python
# Example: parametric fraction bar
# Generates correct visual for any numerator/denominator pair

class FractionBar(Scene):
    def __init__(self, numerator, denominator, **kwargs):
        self.numerator = numerator
        self.denominator = denominator
        super().__init__(**kwargs)

    def construct(self):
        segments = VGroup(*[
            Rectangle(width=1, height=0.6)
            .set_fill(BLUE if i < self.numerator else WHITE, opacity=0.8)
            for i in range(self.denominator)
        ]).arrange(RIGHT, buff=0.05)
        label = MathTex(f"\\frac{{{self.numerator}}}{{{self.denominator}}}")
        self.play(Create(segments), Write(label))
```

**Scope:** Fraction bars, number lines, pie charts, equations, step-by-step arithmetic, graphs, geometric shapes, algebraic expressions.

**Science — AI Image Generation + FFmpeg**

Science concepts require diagrams that cannot be procedurally drawn the way math visuals can. The approach is:
1. Generate static diagram using DALL-E or Stable Diffusion with a tightly controlled prompt
2. Apply Ken Burns pan/zoom via FFmpeg to create the illusion of motion
3. Overlay text labels and arrows programmatically
4. Sync narration audio

```
Prompt template:
"Clean educational diagram of [concept], 
white background, simple line art style, 
labelled, suitable for grade [n] student, 
no decorative elements"
```

**Important constraint:** AI-generated science diagrams must be reviewed for accuracy before use. A diagram of a cell with incorrectly labelled organelles or an atom with wrong electron shell counts is worse than no diagram — it creates a misconception rather than correcting one.

**English — Remotion**

Remotion renders React components to MP4. Text animations — word highlighting, sentence decomposition, grammar annotation — are straightforward to build as React components and render headlessly.

```javascript
// Example: animated sentence with grammar highlighting
const SentenceHighlight = ({ sentence, highlight }) => (
  <div style={containerStyle}>
    {sentence.split(' ').map((word, i) => (
      <span
        key={i}
        style={{
          color: highlight.includes(i) ? '#2563EB' : '#111',
          fontWeight: highlight.includes(i) ? 'bold' : 'normal',
          transition: 'all 0.3s'
        }}
      >
        {word}{' '}
      </span>
    ))}
  </div>
);
```

**Scope:** Word/phrase highlighting, sentence structure diagrams, paragraph annotations, vocabulary definitions, reading comprehension visual cues.

### 5.3 Narration — ElevenLabs

ElevenLabs produces the most natural-sounding TTS available. Key implementation decisions:

**Voice consistency:** Each subject has a consistent tutor voice. Students build familiarity with the voice over hundreds of sessions — changing it mid-product is disorienting. Choose voices once at V2 and treat them as a brand asset.

```
Math tutor voice:     calm, clear, measured pace
Science tutor voice:  engaged, slightly more expressive
English tutor voice:  warm, natural reading cadence
```

**Speed calibration:** Default ElevenLabs speed is too fast for students who are struggling. Target 0.85× speed for remediation clips. Standard speed for intro videos.

**Timestamp extraction:** ElevenLabs returns character-level timestamps in its API response. These are used to sync visual cues in FFmpeg assembly — the fraction bar appears exactly when the narrator says "three fifths."

**Cost at scale:**

| Stage | Video count | Avg narration length | Est. ElevenLabs cost |
|---|---|---|---|
| MVP (manual) | 14 | N/A | $0 |
| V2 (MATH only) | ~80 | 75s | ~$15–20 |
| V3 (MATH + SCI) | ~200 | 75s | ~$40–50 |
| V4 (all subjects) | ~500 | 75s | ~$100–120 |
| At 500 concepts | ~10,000 | 75s | ~$2,000–2,500 |

Narration generation cost is a one-time cost per video, not recurring. Budget accordingly in V3+ pricing.

### 5.4 Assembly — FFmpeg

FFmpeg is the open-source command-line tool that combines all pipeline outputs into the final MP4.

```bash
# Example assembly command
ffmpeg \
  -i visual_track.mp4 \        # Manim / AI image output
  -i narration.mp3 \           # ElevenLabs output
  -vf "subtitles=captions.srt" \  # burn captions
  -c:v libx264 \               # H.264 video codec
  -crf 28 \                    # compression (lower = larger file)
  -vf scale=1280:720 \         # 720p output
  -c:a aac -b:a 128k \         # audio codec
  output_final.mp4
```

Target: every output video ≤5MB at 720p. If the visual track is complex (many animated elements), increase CRF to compress further.

### 5.5 Storage and Delivery

**Recommended hosting: Cloudflare Stream**

Cloudflare Stream is purpose-built for video delivery. It handles adaptive bitrate streaming, global CDN delivery, and per-minute pricing that is significantly cheaper than AWS at moderate scale.

```
Cloudflare Stream pricing (approximate):
  Storage:  $5 per 1,000 minutes stored
  Delivery: $1 per 1,000 minutes viewed

At 10,000 videos × 1.5 min avg:
  Storage:  ~$75/month
  Delivery: depends on usage
```

**Alternative: Supabase Storage** — simpler at MVP (already in stack), but no adaptive streaming. Acceptable for beta, migrate to Cloudflare Stream at V2.

**Database storage model:**

```sql
-- micro_skills table (columns already defined in schema)
intro_video_url             text    -- Cloudflare Stream or Supabase URL
intro_video_length_sec      integer -- for progress bar display

-- misconception_types table
remediation_video_url             text
remediation_video_length_sec      integer

-- Future: video_assets table (V2)
-- Tracks generation metadata, review status, version history
create table video_assets (
  id                uuid primary key default uuid_generate_v4(),
  skill_id          text references micro_skills(id),
  misconception_id  text references misconception_types(id),
  video_type        text check (video_type in ('intro', 'remediation')),
  generation_method text check (generation_method in ('manual', 'ai_pipeline')),
  pipeline_version  text,          -- which version of pipeline generated this
  script_text       text,          -- narration script used
  visual_params     jsonb,         -- parameters passed to visual renderer
  raw_url           text,          -- pre-review storage location
  published_url     text,          -- post-review, live URL
  review_status     text check (review_status in ('pending', 'approved', 'rejected')),
  reviewed_by       text,
  reviewed_at       timestamptz,
  reject_reason     text,
  file_size_bytes   integer,
  duration_sec      integer,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);
```

---

## 6. Content Standards

Every piece of content must meet these standards. At MVP this is a self-review checklist for the founder. At V2+ it becomes a formal review gate.

### 6.1 Micro-Skill Standards

- Mastery goal written as an observable student outcome: *"Student can [behaviour] in [conditions]"*
- Minimum 5 questions before going live — 8 recommended
- Intro video produced and reviewed before `is_active = true`
- At least one `requires` prerequisite edge (except entry point skills)
- Difficulty assignment consistent with adjacent skills in the graph

**Mastery goal quality test:** Read the goal aloud. Can you observe whether a specific student has achieved it? If it is vague ("student understands fractions"), rewrite it.

### 6.2 Question Standards

Every question must have:
- One unambiguous correct answer
- An explanation that teaches the concept, not just confirms the answer
- At minimum one hint that narrows the problem without giving it away
- For multiple choice: every wrong answer mapped to a specific misconception or error type

**Distractor mapping requirement:**

Every wrong answer option in a multiple choice question must map to a known error pattern. This is what makes the classifier work without AI.

```
Question: 1/3 + 1/4 = ?

Correct:  7/12   → correct LCM procedure
Wrong A:  2/7    → M1: denominator addition error
Wrong B:  5/12   → arithmetic error in numerator conversion
Wrong C:  1/12   → M3: only changed one part of the fraction
```

If a wrong answer does not map to a known error, replace it with one that does.

**Question quality checklist:**
- [ ] One unambiguous correct answer
- [ ] Explanation teaches *why*, not just states the answer
- [ ] Hint narrows without revealing
- [ ] Every distractor maps to a misconception or error type
- [ ] Difficulty weight is consistent with skill position

### 6.3 Video Standards

**Pre-upload checklist:**
- [ ] Audio clear — no background noise, no distortion
- [ ] Content is accurate — no mathematical or factual errors
- [ ] Writing/visuals legible at 320px mobile width
- [ ] Never says "this is easy" or "obviously"
- [ ] Worked example completed fully on screen
- [ ] Ends with clear bridge to practice ("now let's try one")
- [ ] File size ≤5MB at 720p
- [ ] Captions present and accurate

**Tone rules (applies to both manual and AI-generated):**
- Speak to one student, not a class — "you" not "everyone"
- Mistakes are normal and expected, not failures
- Calm and clear — not performatively enthusiastic
- Target reading level two years below the concept's grade minimum

### 6.4 Misconception Standards

Each misconception must have before going live:
- Concrete example of the wrong answer (e.g. `1/3 + 1/4 = 2/7`)
- Root cause explanation — *why* the student made this error cognitively, not just what they did
- Remediation strategy: one version for the system (technical), one version for parents (plain language)
- Severity: high (blocks conceptual progress), medium (recurring), low (surface habit)
- Linked remediation video reviewed and approved

---

## 7. Content Versioning

### 7.1 The Core Rule

**Skill IDs are permanent.** `MS-01` through `MS-08` will never be reassigned or reused. Student mastery data is linked to these IDs. If a skill is retired, mark `is_active = false`. Never delete. Never reuse the ID.

### 7.2 Edit vs Version Decision Table

| Change type | Action |
|---|---|
| Fix typo in question text | Edit in place |
| Improve explanation clarity | Edit in place |
| Add new questions to skill | Edit in place |
| Change a question's correct answer | Edit + audit affected interactions |
| Change skill mastery goal | Edit in place + review active student states |
| Add a new prerequisite edge | Edit in place |
| Remove a prerequisite edge | Edit in place + monitor unlock behaviour |
| Split a skill into two | New skill IDs + student state migration script |
| Move skill between concepts | New skill ID + migration script |
| Reorder skills within concept | Update `position` field + audit student sequences |
| Update IRT parameters | Edit in place — calibration values, not IDs |
| Replace a video | Upload new file, update URL, log previous URL in `video_assets` |

### 7.3 Breaking Change Procedure

A breaking change is any edit that would cause existing student mastery data to be misinterpreted.

```
1. Create new skill IDs with the revised structure
2. Write a migration script for student_skill_state
3. Run migration in staging, validate all student records
4. Run migration in production during low-traffic window
5. Mark deprecated skill IDs as is_active = false
6. Document change in schema changelog
```

This procedure does not apply at MVP — no student has history yet. Establish it before the first breaking change post-launch.

---

## 8. Question Bank Scaling

### 8.1 Minimum viable question bank for beta

| Skill | Current | Beta target |
|---|---|---|
| MS-01: What is a Fraction? | 4 | 8 |
| MS-02: Fractions on a Number Line | 3 | 8 |
| MS-03: Equivalent Fractions | 3 | 8 |
| MS-04: Simplifying Fractions | 4 | 8 |
| MS-05: Comparing Fractions | 3 | 8 |
| MS-06: Adding (Same Denom.) | 3 | 8 |
| MS-07: Adding (Diff. Denom.) | 4 | 8 |
| MS-08: Subtracting Fractions | 4 | 8 |
| **Total** | **28** | **64** |

8 questions per skill ensures a student reaching mastery does not see the same question twice within a session. Below 5, repetition is noticeable.

### 8.2 AI-assisted question generation (V2)

At V2, the LLM can generate question variations from existing questions. Human review is mandatory before any AI-generated question goes live.

```
Input:  existing question + skill metadata + misconception list
Prompt: "Generate 3 variations of this question at the same
         difficulty. Each wrong answer must map to one of
         these misconception types: [M1, M4, M5].
         Return JSON: {question_text, correct_answer,
         explanation, hint_text, distractors: [{answer, misconception_id}]}"
Output: 3 candidate questions → human review queue → approved → published
```

**Quality gate:** AI-generated questions must pass the same checklist as manually written questions. The reviewer must verify every distractor mapping before approving.

---

## 9. Author Roles (V2+)

Author roles are not needed at MVP. Defined here for V2 planning when the first external contributor joins.

| Role | Responsibilities | Access |
|---|---|---|
| **Founder / Admin** | All content, pipeline configuration, publishing | Full |
| **Curriculum Designer** | Concept structure, skill sequencing, prerequisite graphs, misconception taxonomy | Structure layer only |
| **Content Author** | Questions, explanations, hints, video scripts | Content layer only |
| **Reviewer** | Quality validation, approval gate before publish | Review queue only |
| **Subject Expert** | Academic accuracy sign-off (e.g. a maths teacher for new algebra content) | Read + comment only |

A single person can hold multiple roles. At V2 with one external contributor, the likely split is: founder holds Admin + Reviewer, external hire holds Curriculum Designer + Content Author.

---

## 10. Authoring UI (V2)

The authoring interface is a web app — separate from the student-facing product — that wraps the Supabase tables and the video generation pipeline in a usable UI.

**V2 scope — minimum viable authoring UI:**

```
/authoring/concepts          List and create concepts
/authoring/concepts/:id      Edit concept, manage skills
/authoring/skills/:id        Edit skill, manage questions, trigger video generation
/authoring/questions/:id     Edit question, manage distractors
/authoring/videos/review     Review queue for AI-generated videos
/authoring/misconceptions    Manage misconception types and remediation scripts
```

**V3 scope — full authoring platform:**

```
Role-based access control
Content workflow (draft → in review → approved → published)
Version history and rollback
Bulk question import from CSV
AI question generation with inline review
Video pipeline monitoring and rerun
Analytics: which questions are being skipped, which explanations are confusing
```

---

## 11. Implementation Roadmap

```
MVP (Weeks 1–8)
  ├── All content authored via SQL + Supabase Table Editor
  ├── 14 whiteboard videos recorded manually by founder
  ├── 64 questions written and seeded before beta launch
  └── No authoring UI — direct database access only

V2 (Post-fractions validation)
  ├── video_assets table added to schema
  ├── AI video pipeline: Step 1 (LLM script) + Step 3 (ElevenLabs) + Step 4 (FFmpeg)
  ├── Manim visual renderer for MATH concepts
  ├── Human review queue (simple web UI or Notion-based at first)
  ├── Minimum authoring UI: concept + skill + question management
  └── AI question generation with review gate

V3 (Science expansion)
  ├── AI image generation renderer for SCIENCE concepts
  ├── Full authoring UI with role-based access
  ├── Bulk question import from CSV
  └── Video pipeline extended to SCI subject

V4 (English expansion)
  ├── Remotion renderer for ENGLISH concepts
  ├── Full content workflow (draft → review → publish)
  ├── External curriculum designer onboarding
  └── AI question generation at scale with batch review
```

---

## 12. Open Questions

| # | Question | Impact | Resolve by |
|---|---|---|---|
| 1 | Video hosting at MVP: Supabase Storage or Cloudflare Stream? | Cost, delivery speed, complexity | Week 5 |
| 2 | Who reviews AI-generated videos at V2 — founder only or hired reviewer? | Review queue capacity, quality gate | V2 planning |
| 3 | ElevenLabs voice selection — which voices for Math and Science tutors? | Brand consistency, student familiarity | V2 planning |
| 4 | What is the maximum acceptable video generation time? (pipeline latency) | New concept time-to-live SLA | V2 planning |
| 5 | Are AI-generated videos disclosed to students and parents? | Trust, transparency principle | V2 planning |
| 6 | What happens to student mastery data if a video is found to contain an error post-publish? | Data integrity, rollback procedure | Before V2 launch |

---

*Document version: 1.0*  
*Scope: MVP (V1) with V2/V3/V4 pipeline extensions*  
*Last updated: March 2026*
