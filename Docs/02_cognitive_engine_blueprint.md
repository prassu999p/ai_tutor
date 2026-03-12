# Cognitive Engine Blueprint
## MVP Domain: Fractions

### Goal

Design an adaptive cognitive model that can:

- Track student mastery
- Detect misconceptions
- Adapt learning paths
- Improve mastery over time

---

## Domain Selection

Fractions are chosen because:

- They have clear misconception patterns
- They contain multiple interdependent skills
- They are foundational for later mathematics

---

## Knowledge Graph Structure

Learning is represented as a **directed concept graph**.

Nodes = micro-skills  
Edges = prerequisite relationships

Example:

Fractions Domain

- Understanding Fractions
- Equivalent Fractions
- Comparing Fractions
- Addition of Fractions
- Subtraction of Fractions
- Fraction Word Problems

---

## Micro Skill Representation

Each micro-skill includes:

- ID
- Name
- Description
- Prerequisites
- Mastery score
- Misconception tags

Example:

MicroSkill: Identify Common Denominator

Prerequisites:
- Equivalent Fractions
- LCM understanding

---

## Mastery Model

Mastery score range:

0.0 → No understanding  
1.0 → Strong mastery

Score updates:

Correct answer (no hint): +0.15  
Correct answer (with hint): +0.08  
Correct explanation: +0.20  

Incorrect conceptual error: −0.10  
Repeated misconception: −0.15

Mastery levels:

0.80–1.00 → Mastered  
0.50–0.79 → Developing  
0.00–0.49 → Weak

---

## Misconception Taxonomy

Examples for fractions:

M1: Adding denominators directly  
M2: Confusing numerator and denominator  
M3: Arithmetic error  
M4: Failure to simplify  
M5: Incorrect denominator conversion  
M6: Word problem misunderstanding

---

## Error Analysis

Example:

Problem:

1/3 + 1/4

Student answer:

2/7

Classification:

M1: Added denominators directly

---

## Adaptive Learning Logic

If mastery ≥ 0.80  
→ Unlock next micro-skill

If mastery 0.50–0.79  
→ Reinforcement practice

If mastery < 0.50  
→ Remediation explanation

---

## Student Cognitive Profile

Example:

Fractions:

Equivalent Fractions → 0.75  
Comparing Fractions → 0.60  
Addition of Fractions → 0.42

Misconceptions:

M1 – denominator addition