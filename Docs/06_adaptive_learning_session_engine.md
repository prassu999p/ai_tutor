# Adaptive Learning Session Engine

## Overview

The Adaptive Learning Session Engine is the **runtime brain of the AI tutor**.
Every student interaction flows through this loop.

It decides:

* what concept to teach
* which question to ask
* how to update mastery
* when to unlock new skills
* when to end the session

This engine operates on top of the database schema and knowledge graph.

---

# Core Learning Loop

```
Student opens session
        ↓
get_next_skill()
        ↓
fetch_question(skill)
        ↓
student_answer
        ↓
evaluate_answer()
        ↓
detect_misconception()
        ↓
update_mastery()
        ↓
log_interaction()
        ↓
unlock_new_skills()
        ↓
decide_next_step()
```

The loop repeats until the session ends.

---

# Session Lifecycle

## Session Start

Steps:

1. Student logs into the platform
2. System creates a learning session
3. Student skills are initialized if first session
4. First learning skill is selected

### Create Session

```sql
INSERT INTO sessions (student_id)
VALUES ($student_id);
```

### Initialize Skills

```sql
SELECT init_student_skills(student_id);
```

### Select Starting Skill

```sql
SELECT get_next_skill(student_id);
```

---

# Step 1 — Select Next Skill

Function:

```
get_next_skill(student_id)
```

Priority logic:

### Priority 1 — Active skill not mastered

```
is_active = true
mastery_status != mastered
```

### Priority 2 — Unlocked but not practiced

```
is_unlocked = true
attempts_total = 0
```

### Priority 3 — Weak developing skill

```
mastery_status = developing
ORDER BY mastery_score ASC
```

Purpose:

* prevent concept skipping
* ensure reinforcement

---

# Step 2 — Fetch Question

Query example:

```sql
SELECT *
FROM questions
WHERE skill_id = $skill_id
AND is_active = true
ORDER BY random()
LIMIT 1;
```

Future improvement:

```
difficulty matched to student mastery
```

For MVP, random selection is sufficient.

---

# Step 3 — Student Answer Evaluation

Two tasks are performed:

## Correctness Check

```
student_answer == correct_answer
```

Result:

```
is_correct = true | false
```

---

## Determine Answer Event

Possible events:

```
correct_no_hint
correct_with_hint
correct_explanation
incorrect_conceptual
incorrect_repeated
```

Example logic:

```
if correct AND hint_used = false
    correct_no_hint

if correct AND hint_used = true
    correct_with_hint

if incorrect first attempt
    incorrect_conceptual

if repeated incorrect
    incorrect_repeated
```

---

# Step 4 — Misconception Detection

Detect common student errors.

## MVP Approach

Rule-based pattern detection.

Example:

Student answer:

```
1/3 + 1/4 = 2/7
```

Detected misconception:

```
M1: Denominator Addition Error
```

---

## Future Upgrade (V2)

Use LLM classification.

Logged fields:

```
classifier_type = llm
misconception_confidence
llm_reasoning
```

This allows explainable AI.

---

# Step 5 — Update Mastery

Call database function:

```
update_mastery(student_id, skill_id, event_type)
```

Mastery update deltas:

| Event                | Delta |
| -------------------- | ----- |
| correct_no_hint      | +0.15 |
| correct_with_hint    | +0.08 |
| correct_explanation  | +0.20 |
| incorrect_conceptual | -0.10 |
| incorrect_repeated   | -0.15 |

Mastery is clamped:

```
0.0 ≤ mastery ≤ 1.0
```

Mastery status:

```
weak        0.00 – 0.49
developing  0.50 – 0.79
mastered    0.80 – 1.00
```

---

# Step 6 — Log Interaction

Insert interaction record.

Table:

```
interactions
```

Fields captured:

```
student_id
skill_id
question_id
student_answer
is_correct
misconception_id
mastery_before
mastery_after
response_time_ms
```

Purpose:

* create learning dataset
* enable future model training

---

# Step 7 — Update Question Statistics

Update question difficulty stats.

Function:

```
update_question_stats(question_id, is_correct)
```

Tracked metrics:

```
times_answered
times_correct
percent_correct
```

Used later for:

```
IRT calibration
difficulty estimation
```

---

# Step 8 — Unlock Skills

Run function:

```
check_and_unlock_skills(student_id)
```

If prerequisites are mastered:

```
unlock next skill
```

Example:

```
MS-04 mastered
→ unlock MS-05
```

---

# Step 9 — Decide Next Step

Tutor chooses next action.

## Continue Same Skill

If:

```
mastery < 0.5
```

Action:

```
practice again
```

---

## Reinforcement

If:

```
0.5 ≤ mastery < 0.8
```

Action:

```
mixed practice
review questions
```

---

## Skill Completed

If:

```
mastery ≥ 0.8
```

Tutor message:

```
"Great! You've mastered this skill."
```

Next skill begins.

---

# Step 10 — Session Stop Conditions

Session ends when any of the following occur:

## Time Limit

```
20 minutes
```

---

## Question Limit

```
15 questions
```

---

## Concept Completed

```
all skills mastered
```

---

# Example Learning Session

Student begins **Fractions**.

---

### Question 1

```
What is 3/8?
```

Correct answer.

```
mastery: 0 → 0.15
```

---

### Question 2

```
Which is larger: 1/4 or 3/4?
```

Correct.

```
mastery: 0.15 → 0.30
```

---

### Question 3

Incorrect.

Detected misconception:

```
M2: Numerator/Denominator Confusion
```

Tutor explains visually.

```
mastery: 0.30 → 0.20
```

---

### Question 6

Mastery reaches:

```
0.82
```

Skill is completed.

Next skill unlocked.

---

# Why This Engine Is Powerful

The system continuously collects learning intelligence:

```
student cognition
question difficulty
misconceptions
learning velocity
```

This dataset enables future improvements:

* Bayesian Knowledge Tracing
* Item Response Theory
* AI tutoring models
* personalized lesson planning

---

# Future Upgrades

Once sufficient data is collected, the platform can introduce:

```
AI lesson planning
AI remediation
AI difficulty calibration
AI conversational tutors
```

The core engine remains unchanged.

---

# Next Component

The next system to design is:

```
Tutor Teaching Layer
```

This controls **how concepts are explained**, including:

```
animations
whiteboard teaching
visual demonstrations
voice tutoring
interactive explanations
```

This layer determines **student engagement and retention**.
