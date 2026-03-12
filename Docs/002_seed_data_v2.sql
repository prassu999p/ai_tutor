-- ============================================================
-- ALIP — Seed Data v2
-- Migration: 002_seed_data.sql
-- Run AFTER 001_initial_schema.sql
--
-- Hierarchy seeded:
--   Subjects:  MATH (active), SCI (inactive), ENG (inactive)
--   Domains:   MATH_NUM (active), others scaffolded
--   Concepts:  FRAC (active), DEC/PCT/RATIO (scaffolded)
--   Skills:    MS-01..MS-08 (fractions, fully seeded)
--   Misconceptions: M1..M6 (fractions)
--   Questions: 30+ starter questions
-- ============================================================

-- ── SUBJECTS ─────────────────────────────────────────────────

insert into subjects (id, name, description, is_active, position) values
('MATH', 'Mathematics',  'Numbers, algebra, geometry, statistics and probability.',       true,  1),
('SCI',  'Science',      'Physics, chemistry, biology and scientific reasoning.',          false, 2),
('ENG',  'English',      'Reading comprehension, grammar, writing and language skills.',  false, 3);

-- ── DOMAINS ──────────────────────────────────────────────────
-- MATH domains

insert into domains (id, subject_id, name, description, is_active, position) values
-- Active for MVP
('MATH_NUM',  'MATH', 'Number & Operations',  'Fractions, decimals, percentages, ratios and number sense.',             true,  1),
-- Scaffolded for V2+
('MATH_ALG',  'MATH', 'Algebra',              'Expressions, equations, functions and algebraic reasoning.',              false, 2),
('MATH_GEO',  'MATH', 'Geometry',             'Shapes, area, volume, coordinate geometry and transformations.',         false, 3),
('MATH_STAT', 'MATH', 'Statistics & Probability', 'Data analysis, probability, mean, median, mode and distributions.', false, 4);

-- SCI domains (scaffolded)
insert into domains (id, subject_id, name, description, is_active, position) values
('SCI_PHY',  'SCI', 'Physics',   'Forces, motion, energy, waves and electricity.',          false, 1),
('SCI_CHEM', 'SCI', 'Chemistry', 'Atoms, elements, compounds, reactions and periodic table.', false, 2),
('SCI_BIO',  'SCI', 'Biology',   'Cells, organisms, genetics, ecosystems and life processes.', false, 3);

-- ENG domains (scaffolded)
insert into domains (id, subject_id, name, description, is_active, position) values
('ENG_READ',  'ENG', 'Reading Comprehension', 'Inference, main idea, vocabulary and text analysis.',    false, 1),
('ENG_GRAM',  'ENG', 'Grammar',               'Parts of speech, sentence structure, punctuation.',       false, 2),
('ENG_WRITE', 'ENG', 'Writing',               'Paragraphs, essays, argumentation and creative writing.', false, 3);

-- ── CONCEPTS ─────────────────────────────────────────────────
-- MATH_NUM concepts

insert into concepts (id, domain_id, name, description, is_active, position, grade_min, grade_max) values
-- Active MVP concept
('FRAC',  'MATH_NUM', 'Fractions',    'Understanding, comparing, and operating with fractions.',         true,  1, 4, 7),
-- Scaffolded for V2
('DEC',   'MATH_NUM', 'Decimals',     'Decimal notation, place value, and decimal operations.',          false, 2, 4, 7),
('PCT',   'MATH_NUM', 'Percentages',  'Percent notation, conversions, and percentage calculations.',     false, 3, 5, 8),
('RATIO', 'MATH_NUM', 'Ratios',       'Ratios, rates, proportional reasoning and unit conversion.',      false, 4, 5, 8),
('INT',   'MATH_NUM', 'Integers',     'Positive and negative integers, absolute value and operations.',  false, 5, 6, 8);

-- MATH_ALG concepts (scaffolded)
insert into concepts (id, domain_id, name, description, is_active, position, grade_min, grade_max) values
('ALG_EXPR',  'MATH_ALG', 'Expressions & Variables', 'Variables, terms, simplifying expressions.',  false, 1, 6, 9),
('ALG_EQ',    'MATH_ALG', 'Equations',               'Solving linear and quadratic equations.',      false, 2, 7, 10),
('ALG_FUNC',  'MATH_ALG', 'Functions',               'Functions, domain, range, and graphs.',        false, 3, 8, 11);

-- ── MICRO SKILLS ─────────────────────────────────────────────

insert into micro_skills (id, concept_id, name, description, mastery_goal, difficulty, position, is_entry_point) values
(
  'MS-01', 'FRAC',
  'What is a Fraction?',
  'Understand that a fraction represents part of a whole. Identify numerator and denominator. Read and write fractions correctly.',
  'Student can identify numerator and denominator and explain what a fraction means in their own words.',
  'foundational', 1, true
),
(
  'MS-02', 'FRAC',
  'Fractions on a Number Line',
  'Place fractions on a number line. Understand that fractions have magnitude and relative position between whole numbers.',
  'Student can place at least 4 out of 5 fractions correctly on a number line without assistance.',
  'foundational', 2, false
),
(
  'MS-03', 'FRAC',
  'Equivalent Fractions',
  'Recognise that different fractions can represent the same value. Generate equivalent fractions by multiplying or dividing numerator and denominator by the same number.',
  'Student can generate and verify equivalent fractions consistently across 5 or more variations.',
  'developing', 3, false
),
(
  'MS-04', 'FRAC',
  'Simplifying Fractions',
  'Reduce fractions to their simplest form using GCF. Recognise when a fraction is already fully simplified.',
  'Student simplifies fractions correctly without prompting in 4 out of 5 attempts.',
  'developing', 4, false
),
(
  'MS-05', 'FRAC',
  'Comparing Fractions',
  'Compare two or more fractions using cross-multiplication, common denominators, or benchmarking against 1/2.',
  'Student correctly compares fractions and explains reasoning in 4 out of 5 attempts.',
  'developing', 5, false
),
(
  'MS-06', 'FRAC',
  'Adding Fractions (Same Denominator)',
  'Add fractions that share a common denominator. Simplify the result where needed.',
  'Student adds same-denominator fractions and simplifies in 4 out of 5 attempts.',
  'developing', 6, false
),
(
  'MS-07', 'FRAC',
  'Adding Fractions (Different Denominators)',
  'Find LCM to create a common denominator. Convert fractions, add, and simplify the result.',
  'Student correctly adds unlike fractions and simplifies across 5 or more varied problems.',
  'advanced', 7, false
),
(
  'MS-08', 'FRAC',
  'Subtracting Fractions',
  'Subtract fractions with same and different denominators. Apply the same LCM logic as addition.',
  'Student subtracts fractions correctly with and without common denominators.',
  'advanced', 8, false
);

-- ── PREREQUISITES ─────────────────────────────────────────────

insert into prerequisites (skill_id, requires_skill_id, relationship_type) values
('MS-02', 'MS-01', 'requires'),
('MS-03', 'MS-01', 'requires'),
('MS-03', 'MS-02', 'supports'),
('MS-04', 'MS-03', 'requires'),
('MS-05', 'MS-03', 'requires'),
('MS-05', 'MS-04', 'requires'),
('MS-06', 'MS-04', 'requires'),
('MS-06', 'MS-05', 'supports'),
('MS-07', 'MS-06', 'requires'),
('MS-08', 'MS-07', 'requires');

-- ── MISCONCEPTION TYPES ───────────────────────────────────────

insert into misconception_types (id, concept_id, name, description, example_error, root_cause, remediation, severity) values
(
  'M1', 'FRAC',
  'Denominator Addition Error',
  'Student adds both numerators AND both denominators separately instead of finding a common denominator.',
  '1/3 + 1/4 = 2/7',
  'Treats numerator and denominator as independent whole numbers. Does not understand that the denominator defines the unit size.',
  'Use visual models (pie charts, fraction bars). Ask: if I have 1 slice of a 3-slice pizza and 1 slice of a 4-slice pizza, do I have 2 slices of a 7-slice pizza? Rebuild unit-size understanding before returning to the operation.',
  'high'
),
(
  'M2', 'FRAC',
  'Numerator/Denominator Confusion',
  'Student swaps the roles of numerator and denominator, treating the denominator as the part and the numerator as the whole.',
  'In 3/4, student says "4 is the part you have"',
  'Memorised positions without understanding meaning. Often occurs when fractions are introduced purely symbolically without physical grounding.',
  'Return to physical objects. Cover 3 out of 4 blocks. Count what is covered (numerator = part) and the total (denominator = whole). Rebuild meaning before reintroducing the symbol.',
  'high'
),
(
  'M3', 'FRAC',
  'Equivalent Fraction Direction Error',
  'Student applies multiplication or division to only the numerator OR only the denominator, not both.',
  '2/3 → multiplies numerator by 2, leaves denominator unchanged: 4/3',
  'Partial rule application. Understands equivalence conceptually but does not consistently apply the operation to both parts.',
  'Reinforce the paired-operation rule: whatever you do to the top, you must do to the bottom. Use fraction walls to show the visual size stays the same only when both change together.',
  'medium'
),
(
  'M4', 'FRAC',
  'Failure to Simplify',
  'Student arrives at a numerically correct answer but does not reduce it to simplest form.',
  '1/2 + 1/2 = 2/2 (not simplified to 1)',
  'Does not treat simplification as a mandatory final step. May not recognise when a fraction can be reduced.',
  'Establish always asking "Can this be simpler?" as the final step of every problem. Practice GCF identification as a warm-up before simplification problems.',
  'medium'
),
(
  'M5', 'FRAC',
  'Wrong LCM for Common Denominator',
  'Student uses an incorrect or non-minimal common denominator, typically by multiplying the two denominators instead of finding the LCM.',
  '1/4 + 1/6: uses 24 as denominator instead of 12',
  'Knows they need a common denominator but uses a shortcut. Does not distinguish between any common multiple and the least common multiple.',
  'Clarify the difference between any common multiple and the LCM. Show that using a non-LCM still produces a correct answer but requires extra simplification — making the LCM the smarter choice.',
  'medium'
),
(
  'M6', 'FRAC',
  'Comparison by Numerator Only',
  'Student compares fractions by looking only at numerators, ignoring that different denominators represent different unit sizes.',
  'Concludes 3/8 > 1/2 because 3 > 1',
  'Applies whole-number comparison logic to fractions. Does not account for how denominator size changes the value of each unit.',
  'Use benchmarking: is this fraction more or less than 1/2? Use identical visual models with the same-size whole divided into different numbers of parts to make unit-size differences visible.',
  'high'
);

-- ── SKILL ↔ MISCONCEPTION LINKS ──────────────────────────────

insert into skill_misconceptions (skill_id, misconception_id) values
('MS-01', 'M2'),
('MS-02', 'M2'),
('MS-03', 'M3'),
('MS-04', 'M3'),
('MS-04', 'M4'),
('MS-05', 'M6'),
('MS-06', 'M1'),
('MS-06', 'M4'),
('MS-07', 'M1'),
('MS-07', 'M4'),
('MS-07', 'M5'),
('MS-08', 'M1'),
('MS-08', 'M4'),
('MS-08', 'M5');

-- ── QUESTIONS ─────────────────────────────────────────────────
-- Note: concept_id = 'FRAC' for all questions below.
-- difficulty_weight: 0.5 = easy, 1.0 = standard, 1.5+ = hard
-- irt_difficulty and irt_discrimination are NULL until V2 calibration.

insert into questions (skill_id, concept_id, question_text, correct_answer, explanation, difficulty_weight, hint_text) values

-- MS-01: What is a Fraction?
('MS-01', 'FRAC',
 'In the fraction 3/5, what does the number 5 represent?',
 'The total number of equal parts the whole is divided into.',
 'The denominator (bottom number) tells you how many equal parts the whole is divided into. The numerator (top number) tells you how many of those parts you have.',
 0.5, 'Think about which number is on top and which is on the bottom.'),

('MS-01', 'FRAC',
 'Write a fraction that means "2 out of 7 equal parts".',
 '2/7',
 'The number of parts you have (2) is the numerator and goes on top. The total number of parts (7) is the denominator and goes on the bottom.',
 0.5, 'The part you have goes on top.'),

('MS-01', 'FRAC',
 'A pizza is cut into 8 equal slices. You eat 3 slices. What fraction of the pizza did you eat?',
 '3/8',
 '3 slices eaten out of 8 total slices = 3/8. The slices eaten are the numerator; the total slices are the denominator.',
 0.7, 'How many did you eat? How many were there in total?'),

('MS-01', 'FRAC',
 'True or False: In the fraction 5/9, the number 5 tells you how many parts the whole is divided into.',
 'False. 5 is the numerator — it tells you how many parts you have. 9 is the denominator and tells you how many parts the whole is divided into.',
 'The denominator (bottom) always describes the total number of equal parts. The numerator (top) describes how many of those parts are being counted.',
 0.6, 'Which number is the top number in 5/9?'),

-- MS-02: Fractions on a Number Line
('MS-02', 'FRAC',
 'Place 1/2 on a number line between 0 and 1. Is it closer to 0 or to 1?',
 'Exactly in the middle — equal distance from both 0 and 1.',
 '1/2 means one out of two equal parts, so it sits exactly halfway between 0 and 1.',
 0.5, 'Think about dividing the space between 0 and 1 into 2 equal parts.'),

('MS-02', 'FRAC',
 'Which is larger: 1/4 or 3/4? How do you know from the number line?',
 '3/4 is larger because it is further to the right on the number line.',
 'On a number line, larger values are always to the right. 3/4 is 3 steps out of 4, which is further right than 1 step out of 4.',
 0.7, 'Which fraction is further along the number line from 0?'),

('MS-02', 'FRAC',
 'Is 5/4 greater than 1? How do you know?',
 'Yes — 5/4 is greater than 1 because it takes 4 quarters to make 1 whole, and 5/4 has one quarter more than a whole.',
 '5/4 means 5 parts when only 4 parts make a whole — so it must be more than 1 whole. On a number line it sits to the right of 1.',
 0.8, 'How many quarters make exactly 1 whole?'),

-- MS-03: Equivalent Fractions
('MS-03', 'FRAC',
 'Are 1/2 and 2/4 equivalent? Show how you know.',
 'Yes — multiply numerator and denominator of 1/2 by 2: (1×2)/(2×2) = 2/4.',
 'Multiplying both numerator and denominator by the same number does not change the value — it creates an equivalent fraction.',
 0.7, 'Try multiplying both the top and bottom by the same number.'),

('MS-03', 'FRAC',
 'Find two equivalent fractions for 3/4.',
 '6/8 and 9/12 (or any correct pair formed by multiplying both parts by the same number).',
 'Multiply both numerator and denominator by 2 to get 6/8, or by 3 to get 9/12. Both represent the same value as 3/4.',
 0.8, 'What happens if you multiply top and bottom by 2? By 3?'),

('MS-03', 'FRAC',
 'Fill in the blank: 2/3 = ?/9',
 '6 — because 3×3=9, so multiply numerator by 3 as well: 2×3=6, giving 6/9.',
 'The denominator went from 3 to 9 (multiplied by 3). To keep the fraction equivalent, multiply the numerator by the same number: 2×3=6.',
 0.8, 'What did you multiply 3 by to get 9? Do the same to the top number.'),

-- MS-04: Simplifying Fractions
('MS-04', 'FRAC',
 'Simplify 6/8 to its lowest terms.',
 '3/4',
 'The GCF of 6 and 8 is 2. Divide both by 2: 6÷2=3, 8÷2=4. Result: 3/4.',
 0.7, 'What is the largest number that divides evenly into both 6 and 8?'),

('MS-04', 'FRAC',
 'Is 5/7 already in its simplest form? How do you know?',
 'Yes — 5 and 7 are both prime numbers and share no common factor other than 1.',
 '5 is prime and 7 is prime. They have no common factors other than 1, so the fraction cannot be simplified further.',
 0.8, 'Can you find any number (other than 1) that divides evenly into both 5 and 7?'),

('MS-04', 'FRAC',
 'Simplify 12/16.',
 '3/4',
 'GCF of 12 and 16 is 4. Divide both by 4: 12÷4=3, 16÷4=4. Result: 3/4.',
 0.8, 'What is the biggest number that goes into both 12 and 16 evenly?'),

('MS-04', 'FRAC',
 'Simplify 18/24.',
 '3/4',
 'GCF of 18 and 24 is 6. Divide both by 6: 18÷6=3, 24÷6=4. Result: 3/4.',
 0.9, 'Find the GCF of 18 and 24. List the factors of each.'),

-- MS-05: Comparing Fractions
('MS-05', 'FRAC',
 'Which is larger: 2/3 or 3/5?',
 '2/3 is larger. Common denominator 15: 2/3=10/15, 3/5=9/15. Since 10>9, we have 2/3>3/5.',
 'Find the LCM of 3 and 5 (which is 15). Convert both fractions then compare numerators.',
 0.9, 'Try converting both fractions to the same denominator, then compare.'),

('MS-05', 'FRAC',
 'Without calculating, is 7/8 closer to 0 or to 1?',
 'Closer to 1 — it is only 1/8 away from a whole.',
 '7/8 is just 1/8 less than 1 whole. Comparing to 1/2 (which is 4/8): 7/8 is much larger, sitting very close to 1.',
 0.7, 'How many parts make a whole? How many parts is 7/8 missing?'),

('MS-05', 'FRAC',
 'Order these fractions from smallest to largest: 1/2, 1/3, 1/4',
 '1/4 < 1/3 < 1/2',
 'When numerators are the same, a larger denominator means smaller pieces. 4 pieces are smaller than 3, which are smaller than 2. So 1/4 < 1/3 < 1/2.',
 0.8, 'When the top numbers are equal, what does a bigger bottom number mean?'),

-- MS-06: Adding Fractions (Same Denominator)
('MS-06', 'FRAC',
 'Calculate: 2/7 + 3/7',
 '5/7',
 'Same denominator, so just add the numerators: 2+3=5. Denominator stays 7. Result: 5/7.',
 0.5, 'The denominator stays the same. Just add the top numbers.'),

('MS-06', 'FRAC',
 'Calculate: 3/8 + 5/8 and simplify your answer.',
 '1 (because 8/8 = 1 whole)',
 '3+5=8, so the result is 8/8. Numerator equals denominator means the fraction equals 1 whole.',
 0.7, 'Add the numerators first, then check if you can simplify.'),

('MS-06', 'FRAC',
 'Calculate: 1/5 + 2/5 + 1/5',
 '4/5',
 'All have the same denominator. Add all numerators: 1+2+1=4. Result: 4/5.',
 0.6, 'Same denominator — add all the top numbers together.'),

-- MS-07: Adding Fractions (Different Denominators)
('MS-07', 'FRAC',
 'Calculate: 1/3 + 1/4',
 '7/12',
 'LCM of 3 and 4 is 12. Convert: 1/3=4/12 and 1/4=3/12. Add: 4/12+3/12=7/12. Cannot simplify further.',
 1.0, 'What is the smallest number that both 3 and 4 divide into evenly?'),

('MS-07', 'FRAC',
 'Calculate: 1/2 + 1/3 and simplify.',
 '5/6',
 'LCM of 2 and 3 is 6. Convert: 1/2=3/6 and 1/3=2/6. Add: 3/6+2/6=5/6. Already in simplest form.',
 0.9, 'Find the LCM of the two denominators first.'),

('MS-07', 'FRAC',
 'Calculate: 2/5 + 1/3',
 '11/15',
 'LCM of 5 and 3 is 15. Convert: 2/5=6/15 and 1/3=5/15. Add: 6/15+5/15=11/15.',
 1.0, 'Find a number that both 5 and 3 divide into evenly.'),

('MS-07', 'FRAC',
 'Calculate: 3/4 + 2/3',
 '17/12 (or 1 and 5/12)',
 'LCM of 4 and 3 is 12. Convert: 3/4=9/12 and 2/3=8/12. Add: 9/12+8/12=17/12. As a mixed number: 1 and 5/12.',
 1.2, 'Your answer will be greater than 1. That is okay — just find the LCM and add.'),

-- MS-08: Subtracting Fractions
('MS-08', 'FRAC',
 'Calculate: 5/6 - 1/6 and simplify.',
 '2/3',
 'Same denominator. Subtract numerators: 5-1=4. Result: 4/6. GCF of 4 and 6 is 2. Simplify: 2/3.',
 0.6, 'Same denominator — just subtract the top numbers, then simplify.'),

('MS-08', 'FRAC',
 'Calculate: 3/4 - 1/3',
 '5/12',
 'LCM of 4 and 3 is 12. Convert: 3/4=9/12 and 1/3=4/12. Subtract: 9/12-4/12=5/12.',
 1.0, 'Find the LCM first, the same way you did for addition.'),

('MS-08', 'FRAC',
 'Calculate: 1/2 - 1/4 and simplify.',
 '1/4',
 'LCM of 2 and 4 is 4. Convert: 1/2=2/4. Subtract: 2/4-1/4=1/4. Already in simplest form.',
 0.9, 'Can you convert 1/2 into quarters?'),

('MS-08', 'FRAC',
 'Calculate: 5/6 - 1/4',
 '7/12',
 'LCM of 6 and 4 is 12. Convert: 5/6=10/12 and 1/4=3/12. Subtract: 10/12-3/12=7/12.',
 1.1, 'What is the LCM of 6 and 4?');
