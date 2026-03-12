# AI Tutor Orchestrator

## Overview

The **AI Tutor Orchestrator** is the central control layer of the Adaptive Learning Intelligence Platform (ALIP).

It coordinates all major subsystems:

```text
Adaptive Learning Engine
Teaching Engine
Student Interface
Knowledge Graph
Database
LLM Tutor (future)
```

The orchestrator ensures that **each student interaction flows correctly through the system**.

Without this layer, the platform becomes a collection of disconnected components.

---

# System Responsibility

The orchestrator is responsible for:

* managing learning sessions
* routing student answers
* coordinating learning logic
* triggering explanations
* logging learning data
* selecting the next learning action

It acts as the **runtime controller of the tutoring experience**.

---

# High-Level Architecture

```text
Student Interface (Web App)
           │
           ▼
   AI Tutor Orchestrator
           │
 ┌─────────┼─────────┐
 │         │         │
 ▼         ▼         ▼
Adaptive   Teaching  Data Layer
Engine     Engine
```

Future components:

```text
LLM Tutor
Voice Interface
Animation Engine
```

---

# Core Components

The orchestrator interacts with several internal services.

## 1. Session Manager

Responsible for:

* creating learning sessions
* tracking session progress
* closing sessions

Example flow:

```text
student_login
      ↓
create_session
      ↓
session_active
```

Session fields:

```text
student_id
start_time
questions_answered
skills_practiced
session_status
```

---

## 2. Skill Router

Determines **what skill the student should work on next**.

Uses database function:

```text
get_next_skill(student_id)
```

Possible outcomes:

```text
continue current skill
start new skill
reinforce weak skill
concept completed
```

---

## 3. Question Service

Responsible for selecting practice questions.

Example query:

```sql
SELECT *
FROM questions
WHERE skill_id = $skill_id
AND is_active = true
ORDER BY random()
LIMIT 1;
```

Future upgrade:

```text
difficulty-based selection
IRT-based question choice
```

---

## 4. Answer Evaluator

Processes the student answer.

Responsibilities:

```text
check correctness
determine event_type
trigger misconception detection
```

Example result:

```json
{
  "isCorrect": false,
  "eventType": "incorrect_conceptual"
}
```

---

## 5. Misconception Detector

Detects common student reasoning errors.

MVP approach:

```text
rule-based classification
```

Future approach:

```text
LLM classification
```

Example output:

```json
{
  "misconception": "M1",
  "confidence": 0.85,
  "classifier": "llm"
}
```

---

## 6. Mastery Engine

Updates student mastery level.

Uses database function:

```text
update_mastery(student_id, skill_id, event_type)
```

Returns:

```text
mastery_before
mastery_after
mastery_status
```

Mastery scale:

```text
0.0 – 0.49   weak
0.5 – 0.79   developing
0.8 – 1.0    mastered
```

---

## 7. Skill Unlocker

Checks if new skills should become available.

Uses function:

```text
check_and_unlock_skills(student_id)
```

Example:

```text
MS-04 mastered
→ unlock MS-05
```

---

## 8. Interaction Logger

Stores all learning interactions.

Table:

```text
interactions
```

Captured data:

```text
student_id
skill_id
question_id
student_answer
correctness
misconception
mastery_change
response_time
```

This dataset becomes the **training data for future learning models**.

---

# Orchestrator Learning Flow

Full learning interaction flow:

```text
Student answers question
        ↓
Answer Evaluator
        ↓
Misconception Detector
        ↓
Mastery Engine
        ↓
Interaction Logger
        ↓
Skill Unlocker
        ↓
Skill Router
        ↓
Teaching Engine
        ↓
Next Question
```

---

# Example Interaction

Student working on **Equivalent Fractions**.

### Step 1

Tutor asks:

```text
2/3 = ?/6
```

Student answers:

```text
4
```

---

### Step 2

Answer evaluation:

```text
correct
```

Event type:

```text
correct_no_hint
```

---

### Step 3

Mastery update:

```text
0.45 → 0.60
```

Status becomes:

```text
developing
```

---

### Step 4

Next question selected.

Tutor continues practice.

---

# Teaching Engine Integration

The orchestrator calls the teaching engine when needed.

Examples:

### New Concept

```text
show concept explanation
```

### Incorrect Answer

```text
show guided example
```

### Misconception detected

```text
show remediation explanation
```

### Skill Mastered

```text
show celebration message
```

---

# Session Termination Logic

A session ends when one of the following conditions occurs.

## Time Limit

```text
20 minutes
```

---

## Question Limit

```text
15 questions
```

---

## Concept Completed

```text
all skills mastered
```

---

# Session Summary

At session end the orchestrator generates a summary.

Example:

```json
{
  "questionsAnswered": 12,
  "skillsPracticed": ["MS-03","MS-04"],
  "skillsMastered": ["MS-03"],
  "misconceptionsDetected": ["M3"],
  "conceptProgress": 0.62
}
```

This powers:

* parent reports
* student dashboards
* teacher insights

---

# Future AI Integration

The orchestrator is designed to support future AI upgrades.

Planned upgrades:

```text
LLM tutoring explanations
AI-generated practice questions
automatic misconception detection
personalized lesson planning
```

These systems plug into the orchestrator **without redesigning the core platform**.

---

# Error Handling

The orchestrator must gracefully handle failures.

Examples:

```text
question not available
database timeout
invalid student response
```

Fallback strategy:

```text
retry question fetch
default practice question
log system error
```

---

# Observability

The orchestrator should log key metrics.

Example metrics:

```text
session_length
questions_per_session
concept_completion_rate
misconception_frequency
```

These metrics help improve the learning system.

---

# Orchestrator Design Principles

The orchestrator should follow these principles:

```text
deterministic learning flow
modular architecture
clear data logging
extensible AI integration
```

This ensures the system can scale from **MVP to a full adaptive education platform**.

---

# Next Component

The next document will define:

```text
Student Learning Interface
```

File:

```text
docs/13_student_learning_interface.md
```

This document describes:

```text
student UI layout
interactive learning screen
visual teaching tools
student engagement features
```

The interface determines **how the student experiences the AI tutor**.
