# System Architecture (HLD)

## Overview

Student Interface
↓
Interaction Engine
↓
Learning Intelligence Layer
↓
Cognitive Model Engine
↓
Knowledge Graph + Student State
↓
Analytics Layer

---

## Student Interface

Responsibilities:

- Visual explanations
- Question display
- Answer input
- Voice interaction

This layer contains **no learning logic**.

---

## Interaction Engine

Session manager that:

- Presents explanations
- Asks questions
- Captures answers
- Sends responses to cognitive engine

---

## Learning Intelligence Layer

Responsible for deciding:

- Next concept
- Explanation strategy
- Practice difficulty

---

## Cognitive Model Engine

Model interface:

updateMastery()  
detectMisconception()  
estimateConfidence()

Possible implementations:

RuleBasedModel  
BayesianKnowledgeTracing  
ItemResponseTheory

---

## Knowledge Graph

Stores:

Concept  
MicroSkill  
Prerequisite  
MisconceptionType  
ExplanationStrategies

---

## Student State Engine

Tracks:

- mastery scores
- misconceptions
- attempts
- confidence score
- learning history

---

## Practice Generation

Inputs:

Micro-skill  
Difficulty level  
Student history

Outputs:

Practice question  
Correct answer  
Explanation