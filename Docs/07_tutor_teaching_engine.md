# Tutor Teaching Engine

## Overview

The Tutor Teaching Engine defines **how the AI tutor teaches concepts to students**.

While the **Adaptive Learning Engine** decides:

* what skill to teach
* when to practice
* when mastery is reached

The **Teaching Engine decides how the concept is explained**.

This layer focuses on:

* engagement
* visual understanding
* concept clarity

The goal is to simulate **a friendly young tutor explaining concepts interactively**.

---

# Teaching Philosophy

The tutor follows a **3-phase learning model**:

```text
Explain → Demonstrate → Practice
```

Each concept follows this learning cycle.

---

# Teaching Loop

```text
Skill selected
      ↓
Concept explanation
      ↓
Visual demonstration
      ↓
Guided example
      ↓
Student practice
      ↓
Feedback and correction
```

---

# Tutor Personality

The tutor should feel like a **friendly young teacher**, not a robotic system.

Tone guidelines:

* encouraging
* clear
* patient
* conversational
* supportive

Example tone:

```text
"Great question!"

"Let's look at this together."

"You're very close. Let's try it one more time."
```

Avoid:

```text
"Incorrect."

"You failed."

"Wrong answer."
```

---

# Teaching Modes

The tutor can teach using multiple methods.

## 1. Concept Explanation

Short explanation introducing the concept.

Example:

```text
A fraction represents a part of a whole.

The top number is called the numerator.
The bottom number is called the denominator.
```

Rules:

* maximum 3–4 sentences
* simple language
* avoid complex terminology

---

## 2. Visual Demonstration

Visual explanation using diagrams or animations.

Example for fractions:

```text
Show a pizza divided into 8 slices.
Highlight 3 slices.
Display: 3/8
```

Supported visual formats:

* pie charts
* fraction bars
* number lines
* simple whiteboard drawings

---

## 3. Guided Example

Tutor walks through an example step-by-step.

Example:

```text
Let's add 2/7 + 3/7.

Step 1:
Look at the denominator.
Both fractions have 7.

Step 2:
Add the numerators.
2 + 3 = 5

Final answer:
5/7
```

Rules:

* break into small steps
* highlight reasoning
* keep each step simple

---

## 4. Student Practice

Student answers a problem.

Example:

```text
Calculate:

1/5 + 2/5
```

Student submits answer.

---

## 5. Feedback

Tutor provides feedback immediately.

### Correct Answer

Example:

```text
Excellent!

You added the numerators correctly.

1/5 + 2/5 = 3/5
```

---

### Incorrect Answer

Tutor identifies the issue.

Example:

```text
It looks like you added the denominators.

Remember:
The denominator stays the same when adding fractions with the same denominator.
```

If misconception detected:

```text
Let's review this with a visual example.
```

---

# Visual Teaching Tools

The system should support visual teaching components.

## Fraction Bar

Example:

```text
[■■■■□□□□] = 4/8
```

Used to demonstrate:

* equivalent fractions
* addition
* subtraction

---

## Number Line

Example:

```text
0 ---- 1/4 ---- 1/2 ---- 3/4 ---- 1
```

Used to teach:

* fraction magnitude
* comparisons
* improper fractions

---

## Whiteboard Mode

Tutor draws step-by-step explanations.

Example:

```text
1/3 + 1/4

LCM(3,4) = 12

1/3 = 4/12
1/4 = 3/12

4/12 + 3/12 = 7/12
```

Whiteboard mode is ideal for:

* algebra
* equations
* fraction operations

---

# Teaching Content Storage

Teaching content should be stored separately from questions.

Proposed table:

```text
learning_resources
```

Schema:

```sql
learning_resources
------------------------
id
skill_id
title
resource_type
content
media_url
created_at
```

Resource types:

```text
explanation
visual_demo
guided_example
remediation
```

This allows:

* reusable explanations
* multiple explanations per skill
* content upgrades later

---

# Remediation Strategy

When misconceptions occur repeatedly, the tutor should switch to **remediation mode**.

Steps:

```text
Detect misconception
      ↓
Show visual explanation
      ↓
Present simpler example
      ↓
Ask practice question again
```

Example remediation:

Student error:

```text
1/3 + 1/4 = 2/7
```

Tutor response:

```text
Let's visualize this.

You have 1 slice from a pizza cut into 3 parts,
and 1 slice from a pizza cut into 4 parts.

Are these slices the same size?

No.

So we need a common denominator.
```

---

# Adaptive Explanation Difficulty

Explanation style changes depending on student mastery.

## Low Mastery

```text
more visuals
more examples
simpler explanations
```

---

## Medium Mastery

```text
guided examples
shorter explanations
```

---

## High Mastery

```text
minimal explanation
focus on practice
```

---

# Engagement Elements

To maintain student engagement:

* small encouragement messages
* progress indicators
* concept completion celebrations

Example:

```text
🎉 You mastered Equivalent Fractions!
```

Avoid:

* gamification overload
* unnecessary animations

The goal is **learning focus**, not entertainment.

---

# Tutor Voice Layer (Future)

Voice interaction can be added later.

Tutor voice:

* clear
* friendly
* neutral accent

Example interaction:

```text
Tutor: "Which fraction is larger, one-half or three-quarters?"

Student: "Three-quarters."

Tutor: "Correct! Three-quarters is closer to one."
```

Voice will initially be **optional**.

---

# Teaching Session Example

Example sequence:

```text
Skill: Equivalent Fractions
```

Tutor explains:

```text
Two fractions can represent the same value.

For example:

1/2 = 2/4
```

Visual:

```text
Half pizza = two quarters
```

Guided example:

```text
3/4 = ?/8
```

Practice question:

```text
2/3 = ?/6
```

Student answers.

Tutor provides feedback.

---

# Teaching Engine Goals

The tutor should feel like:

```text
a patient human teacher
```

The teaching engine must prioritize:

```text
clarity
visual learning
step-by-step reasoning
immediate feedback
```

---

# Next Component

The next system to design is:

```text
AI Tutor Orchestrator
```

This layer connects:

```text
adaptive engine
teaching engine
LLM tutor
student interface
```

It acts as the **central brain coordinating the tutoring experience**.
