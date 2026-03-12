-- ============================================================
-- ALIP — Adaptive Learning Intelligence Platform
-- Migration: 001_initial_schema.sql (v2)
-- Changes from v1:
--   + subjects, domains, concepts tables (full hierarchy)
--   + concept_id on micro_skills
--   + concept_id on questions
--   + question_id on interactions (replaces question_text logging)
--   + IRT fields on questions (nullable, populated post-MVP)
--   + misconception_confidence + llm_reasoning on interactions
--   + concept_mastery view
--   + indexes on all hot query paths
--   + consistent created_at/updated_at across all tables
-- ============================================================

create extension if not exists "uuid-ossp";

-- ── ENUMS ────────────────────────────────────────────────────

create type difficulty_level as enum (
  'foundational',
  'developing',
  'advanced'
);

create type mastery_status as enum (
  'weak',        -- 0.00 – 0.49
  'developing',  -- 0.50 – 0.79
  'mastered'     -- 0.80 – 1.00
);

create type misconception_severity as enum (
  'low',
  'medium',
  'high'
);

create type answer_event as enum (
  'correct_no_hint',      -- +0.15
  'correct_with_hint',    -- +0.08
  'correct_explanation',  -- +0.20
  'incorrect_conceptual', -- -0.10
  'incorrect_repeated'    -- -0.15
);

create type session_status as enum (
  'active',
  'completed',
  'abandoned'
);

create type classifier_type as enum (
  'rule_based',   -- MVP default
  'llm'           -- V2+ AI classifier
);

-- ============================================================
-- DOMAIN HIERARCHY LAYER
-- subjects → domains → concepts → micro_skills
-- ============================================================

-- ── SUBJECTS ─────────────────────────────────────────────────
-- Top level: Math, Science, English
-- Seeded in 002_seed.sql

create table subjects (
  id          text primary key,        -- 'MATH', 'SCI', 'ENG'
  name        text not null,
  description text,
  is_active   boolean not null default false,  -- only MATH active for MVP
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table subjects is
  'Top-level subject grouping. MVP: MATH active only. SCI + ENG scaffolded for V4.';

-- ── DOMAINS ──────────────────────────────────────────────────
-- e.g. Math → Number & Operations, Algebra, Geometry

create table domains (
  id          text primary key,        -- 'MATH_NUM', 'MATH_ALG', etc.
  subject_id  text not null references subjects(id) on delete cascade,
  name        text not null,
  description text,
  is_active   boolean not null default false,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table domains is
  'Subject sub-areas. e.g. Math > Number & Operations. MVP: MATH_NUM active only.';

create index idx_domains_subject on domains(subject_id);

-- ── CONCEPTS ─────────────────────────────────────────────────
-- e.g. Number & Operations → Fractions, Decimals, Percentages

create table concepts (
  id          text primary key,        -- 'FRAC', 'DEC', 'PCT', etc.
  domain_id   text not null references domains(id) on delete cascade,
  name        text not null,
  description text,
  is_active   boolean not null default false,
  position    integer not null default 0,
  grade_min   integer,                 -- earliest grade level (e.g. 4)
  grade_max   integer,                 -- latest grade level (e.g. 7)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table concepts is
  'Learning concepts within a domain. e.g. Fractions, Decimals. MVP: FRAC active only.';

create index idx_concepts_domain on concepts(domain_id);

-- ============================================================
-- KNOWLEDGE GRAPH LAYER
-- ============================================================

-- ── MICRO_SKILLS ─────────────────────────────────────────────

create table micro_skills (
  id              text primary key,    -- 'MS-01' .. 'MS-08'
  concept_id      text not null references concepts(id) on delete cascade,
  name            text not null,
  description     text not null,
  mastery_goal    text not null,
  difficulty      difficulty_level not null,
  position        integer not null,    -- order within concept
  is_entry_point  boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table micro_skills is
  'Atomic learning units. IDs are stable — referenced throughout the system. Never change an ID.';

create index idx_micro_skills_concept on micro_skills(concept_id);

-- ── PREREQUISITES ────────────────────────────────────────────

create table prerequisites (
  id                  uuid primary key default uuid_generate_v4(),
  skill_id            text not null references micro_skills(id) on delete cascade,
  requires_skill_id   text not null references micro_skills(id) on delete cascade,
  relationship_type   text not null default 'requires'
                      check (relationship_type in ('requires', 'supports')),
  created_at          timestamptz not null default now(),
  unique (skill_id, requires_skill_id)
);

comment on table prerequisites is
  'Knowledge graph edges. requires = hard unlock gate. supports = soft quality boost.';

create index idx_prerequisites_skill    on prerequisites(skill_id);
create index idx_prerequisites_requires on prerequisites(requires_skill_id);

-- ── MISCONCEPTION_TYPES ───────────────────────────────────────

create table misconception_types (
  id            text primary key,      -- 'M1' .. 'M6'
  concept_id    text not null references concepts(id) on delete cascade,
  name          text not null,
  description   text not null,
  example_error text not null,
  root_cause    text not null,
  remediation   text not null,
  severity      misconception_severity not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table misconception_types is
  'Taxonomy of cognitive error patterns per concept. Each has a remediation strategy.';

create index idx_misconception_concept on misconception_types(concept_id);

-- ── SKILL_MISCONCEPTIONS ──────────────────────────────────────

create table skill_misconceptions (
  skill_id            text not null references micro_skills(id) on delete cascade,
  misconception_id    text not null references misconception_types(id) on delete cascade,
  primary key (skill_id, misconception_id)
);

-- ============================================================
-- STUDENT LAYER
-- ============================================================

-- ── STUDENTS ─────────────────────────────────────────────────

create table students (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  age           integer,
  grade         text,
  parent_email  text,
  parent_name   text,
  timezone      text default 'Asia/Kuala_Lumpur',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── STUDENT_SKILL_STATE ───────────────────────────────────────
-- Core cognitive model. One row per student per skill.
-- This is the source of truth for all adaptive decisions.

create table student_skill_state (
  id                  uuid primary key default uuid_generate_v4(),
  student_id          uuid not null references students(id) on delete cascade,
  skill_id            text not null references micro_skills(id),
  mastery_score       numeric(4,3) not null default 0.000
                      check (mastery_score >= 0 and mastery_score <= 1),
  mastery_status      mastery_status not null default 'weak',
  is_unlocked         boolean not null default false,
  is_active           boolean not null default false,
  attempts_total      integer not null default 0,
  attempts_correct    integer not null default 0,
  last_practiced_at   timestamptz,
  unlocked_at         timestamptz,
  mastered_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (student_id, skill_id)
);

comment on table student_skill_state is
  'Live cognitive model. mastery_score is the source of truth. Never delete rows.';

create index idx_sss_student    on student_skill_state(student_id);
create index idx_sss_skill      on student_skill_state(skill_id);
create index idx_sss_student_skill on student_skill_state(student_id, skill_id);

-- ── STUDENT_MISCONCEPTIONS ────────────────────────────────────

create table student_misconceptions (
  id                  uuid primary key default uuid_generate_v4(),
  student_id          uuid not null references students(id) on delete cascade,
  misconception_id    text not null references misconception_types(id),
  skill_id            text not null references micro_skills(id),
  occurrence_count    integer not null default 1,
  last_occurred_at    timestamptz not null default now(),
  resolved_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (student_id, misconception_id, skill_id)
);

create index idx_student_misconceptions_student on student_misconceptions(student_id);

-- ============================================================
-- SESSION + INTERACTION LAYER
-- ============================================================

-- ── SESSIONS ─────────────────────────────────────────────────

create table sessions (
  id                  uuid primary key default uuid_generate_v4(),
  student_id          uuid not null references students(id) on delete cascade,
  status              session_status not null default 'active',
  started_at          timestamptz not null default now(),
  ended_at            timestamptz,
  questions_answered  integer not null default 0,
  skills_practiced    text[] default '{}',
  session_notes       text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index idx_sessions_student on sessions(student_id);

-- ── QUESTIONS ────────────────────────────────────────────────
-- Static question bank. Start manual; add AI generation in V2.

create table questions (
  id                      uuid primary key default uuid_generate_v4(),
  skill_id                text not null references micro_skills(id),
  concept_id              text not null references concepts(id),  -- denormalized for analytics
  question_text           text not null,
  correct_answer          text not null,
  explanation             text not null,
  hint_text               text,
  difficulty_weight       numeric(3,2) not null default 1.0
                          check (difficulty_weight between 0.5 and 2.0),
  -- IRT fields: null until sufficient response data collected (V2+)
  irt_difficulty          numeric(5,3),   -- b parameter: avg student ability to answer correctly
  irt_discrimination      numeric(5,3),   -- a parameter: how well it separates mastery levels
  tags                    text[] default '{}',
  is_active               boolean not null default true,
  times_answered          integer not null default 0,   -- updated on each interaction
  times_correct           integer not null default 0,   -- updated on each interaction
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

comment on table questions is
  'irt_difficulty and irt_discrimination are null until V2. Populate after 200+ responses per question.';

create index idx_questions_skill   on questions(skill_id);
create index idx_questions_concept on questions(concept_id);

-- ── INTERACTIONS ─────────────────────────────────────────────
-- Every answer attempt. IMMUTABLE. Never delete rows.
-- This is your recalibration dataset.

create table interactions (
  id                      uuid primary key default uuid_generate_v4(),
  session_id              uuid not null references sessions(id) on delete cascade,
  student_id              uuid not null references students(id),
  skill_id                text not null references micro_skills(id),
  concept_id              text not null references concepts(id),  -- denormalized for analytics
  question_id             uuid not null references questions(id), -- replaces question_text logging
  student_answer          text,
  is_correct              boolean,
  hint_used               boolean not null default false,
  event_type              answer_event,
  -- Misconception detection
  misconception_id        text references misconception_types(id),
  classifier_type         classifier_type,                -- rule_based | llm
  misconception_confidence numeric(4,3),                 -- null for rule_based; 0.0–1.0 for llm
  llm_reasoning           text,                          -- null for rule_based; LLM explanation for llm
  -- Mastery audit trail
  mastery_before          numeric(4,3),
  mastery_after           numeric(4,3),
  mastery_delta           numeric(4,3),
  -- Performance
  response_time_ms        integer,
  created_at              timestamptz not null default now()
  -- No updated_at — interactions are immutable
);

comment on table interactions is
  'Immutable event log. mastery_before/after enable recalibration. llm_reasoning enables AI audit.';

create index idx_interactions_student    on interactions(student_id);
create index idx_interactions_skill      on interactions(skill_id);
create index idx_interactions_session    on interactions(session_id);
create index idx_interactions_question   on interactions(question_id);
create index idx_interactions_concept    on interactions(concept_id);
create index idx_interactions_created    on interactions(created_at desc);

-- ============================================================
-- VIEWS
-- ============================================================

-- ── Student skill profile ────────────────────────────────────

create view v_student_skill_profile as
select
  s.id                  as student_id,
  s.name                as student_name,
  sub.name              as subject_name,
  d.name                as domain_name,
  c.id                  as concept_id,
  c.name                as concept_name,
  ms.id                 as skill_id,
  ms.name               as skill_name,
  ms.difficulty,
  sss.mastery_score,
  sss.mastery_status,
  sss.is_unlocked,
  sss.attempts_total,
  sss.attempts_correct,
  sss.last_practiced_at,
  sss.mastered_at
from students s
join student_skill_state sss  on sss.student_id = s.id
join micro_skills ms          on ms.id = sss.skill_id
join concepts c               on c.id = ms.concept_id
join domains d                on d.id = c.domain_id
join subjects sub             on sub.id = d.subject_id
order by s.id, sub.position, d.position, c.position, ms.position;

-- ── Concept-level mastery (derived from skill averages) ──────
-- Used in parent dashboards and high-level adaptive routing.

create view v_concept_mastery as
select
  sss.student_id,
  s.name                          as student_name,
  c.id                            as concept_id,
  c.name                          as concept_name,
  d.name                          as domain_name,
  sub.name                        as subject_name,
  count(sss.skill_id)             as total_skills,
  count(case when sss.mastery_status = 'mastered'   then 1 end) as skills_mastered,
  count(case when sss.mastery_status = 'developing' then 1 end) as skills_developing,
  count(case when sss.mastery_status = 'weak'       then 1 end) as skills_weak,
  round(avg(sss.mastery_score)::numeric, 3)  as concept_mastery_score,
  case
    when avg(sss.mastery_score) >= 0.80 then 'mastered'::mastery_status
    when avg(sss.mastery_score) >= 0.50 then 'developing'::mastery_status
    else 'weak'::mastery_status
  end                             as concept_mastery_status,
  round(
    100.0 * count(case when sss.mastery_status = 'mastered' then 1 end)
    / nullif(count(sss.skill_id), 0)
  , 1)                            as pct_skills_mastered
from student_skill_state sss
join students s       on s.id = sss.student_id
join micro_skills ms  on ms.id = sss.skill_id
join concepts c       on c.id = ms.concept_id
join domains d        on d.id = c.domain_id
join subjects sub     on sub.id = d.subject_id
group by sss.student_id, s.name, c.id, c.name, d.name, sub.name;

-- ── Active misconceptions ────────────────────────────────────

create view v_active_misconceptions as
select
  sm.student_id,
  s.name              as student_name,
  sm.misconception_id,
  mt.name             as misconception_name,
  mt.severity,
  mt.remediation,
  sm.skill_id,
  ms.name             as skill_name,
  c.name              as concept_name,
  sm.occurrence_count,
  sm.last_occurred_at
from student_misconceptions sm
join students s               on s.id = sm.student_id
join misconception_types mt   on mt.id = sm.misconception_id
join micro_skills ms          on ms.id = sm.skill_id
join concepts c               on c.id = ms.concept_id
where sm.resolved_at is null
order by mt.severity desc, sm.occurrence_count desc;

-- ── Question difficulty stats (feeds IRT calibration) ────────

create view v_question_difficulty_stats as
select
  q.id                        as question_id,
  q.skill_id,
  ms.name                     as skill_name,
  q.concept_id,
  q.difficulty_weight,
  q.irt_difficulty,
  q.irt_discrimination,
  q.times_answered,
  q.times_correct,
  case
    when q.times_answered = 0 then null
    else round(100.0 * q.times_correct / q.times_answered, 1)
  end                         as pct_correct,
  count(distinct i.student_id) as unique_students
from questions q
join micro_skills ms          on ms.id = q.skill_id
left join interactions i      on i.question_id = q.id
group by q.id, q.skill_id, ms.name, q.concept_id,
         q.difficulty_weight, q.irt_difficulty,
         q.irt_discrimination, q.times_answered, q.times_correct;

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- ── Shared updated_at trigger ─────────────────────────────────

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger subjects_updated_at
  before update on subjects for each row execute function set_updated_at();
create trigger domains_updated_at
  before update on domains for each row execute function set_updated_at();
create trigger concepts_updated_at
  before update on concepts for each row execute function set_updated_at();
create trigger micro_skills_updated_at
  before update on micro_skills for each row execute function set_updated_at();
create trigger misconception_types_updated_at
  before update on misconception_types for each row execute function set_updated_at();
create trigger students_updated_at
  before update on students for each row execute function set_updated_at();
create trigger student_skill_state_updated_at
  before update on student_skill_state for each row execute function set_updated_at();
create trigger student_misconceptions_updated_at
  before update on student_misconceptions for each row execute function set_updated_at();
create trigger sessions_updated_at
  before update on sessions for each row execute function set_updated_at();
create trigger questions_updated_at
  before update on questions for each row execute function set_updated_at();

-- ── init_student_skills() ────────────────────────────────────
-- Seeds student_skill_state for all active micro-skills
-- when a new student is created.
-- Only entry-point skills are unlocked by default.

create or replace function init_student_skills(
  p_student_id  uuid,
  p_concept_id  text default null    -- null = init ALL active concepts
) returns void as $$
begin
  insert into student_skill_state (student_id, skill_id, is_unlocked, is_active)
  select
    p_student_id,
    ms.id,
    ms.is_entry_point,
    ms.is_entry_point
  from micro_skills ms
  join concepts c on c.id = ms.concept_id
  where c.is_active = true
    and (p_concept_id is null or ms.concept_id = p_concept_id)
  on conflict (student_id, skill_id) do nothing;
end;
$$ language plpgsql;

-- ── update_mastery() ─────────────────────────────────────────

create or replace function update_mastery(
  p_student_id  uuid,
  p_skill_id    text,
  p_event       answer_event
) returns numeric as $$
declare
  v_delta       numeric(4,3);
  v_current     numeric(4,3);
  v_new_score   numeric(4,3);
  v_new_status  mastery_status;
begin
  v_delta := case p_event
    when 'correct_no_hint'      then  0.150
    when 'correct_with_hint'    then  0.080
    when 'correct_explanation'  then  0.200
    when 'incorrect_conceptual' then -0.100
    when 'incorrect_repeated'   then -0.150
  end;

  select mastery_score into v_current
  from student_skill_state
  where student_id = p_student_id and skill_id = p_skill_id;

  v_new_score := greatest(0.000, least(1.000, v_current + v_delta));

  v_new_status := case
    when v_new_score >= 0.800 then 'mastered'
    when v_new_score >= 0.500 then 'developing'
    else 'weak'
  end;

  update student_skill_state set
    mastery_score     = v_new_score,
    mastery_status    = v_new_status,
    attempts_total    = attempts_total + 1,
    attempts_correct  = attempts_correct + (
      case when p_event in ('correct_no_hint','correct_with_hint','correct_explanation')
      then 1 else 0 end),
    last_practiced_at = now(),
    mastered_at       = case
      when v_new_status = 'mastered' and mastered_at is null then now()
      else mastered_at end,
    updated_at        = now()
  where student_id = p_student_id and skill_id = p_skill_id;

  return v_new_score;
end;
$$ language plpgsql;

-- ── check_and_unlock_skills() ─────────────────────────────────

create or replace function check_and_unlock_skills(
  p_student_id uuid
) returns void as $$
declare
  v_skill   record;
  v_all_met boolean;
begin
  for v_skill in
    select ms.id
    from micro_skills ms
    join student_skill_state sss
      on sss.skill_id = ms.id and sss.student_id = p_student_id
    where sss.is_unlocked = false
  loop
    select bool_and(
      exists (
        select 1 from student_skill_state s2
        where s2.student_id = p_student_id
          and s2.skill_id = p.requires_skill_id
          and s2.mastery_status = 'mastered'
      )
    ) into v_all_met
    from prerequisites p
    where p.skill_id = v_skill.id
      and p.relationship_type = 'requires';

    -- No 'requires' edges = entry point, treat as already unlockable
    if v_all_met is null then v_all_met := true; end if;

    if v_all_met then
      update student_skill_state set
        is_unlocked = true,
        unlocked_at = now(),
        updated_at  = now()
      where student_id = p_student_id and skill_id = v_skill.id;
    end if;
  end loop;
end;
$$ language plpgsql;

-- ── get_next_skill() ─────────────────────────────────────────

create or replace function get_next_skill(
  p_student_id  uuid,
  p_concept_id  text default null   -- null = across all active concepts
) returns text as $$
declare
  v_skill_id text;
begin
  -- Priority 1: Active skill not yet mastered
  select sss.skill_id into v_skill_id
  from student_skill_state sss
  join micro_skills ms on ms.id = sss.skill_id
  where sss.student_id = p_student_id
    and sss.is_active = true
    and sss.mastery_status != 'mastered'
    and (p_concept_id is null or ms.concept_id = p_concept_id)
  limit 1;
  if v_skill_id is not null then return v_skill_id; end if;

  -- Priority 2: Unlocked, not yet started
  select sss.skill_id into v_skill_id
  from student_skill_state sss
  join micro_skills ms on ms.id = sss.skill_id
  where sss.student_id = p_student_id
    and sss.is_unlocked = true
    and sss.mastery_status = 'weak'
    and sss.attempts_total = 0
    and (p_concept_id is null or ms.concept_id = p_concept_id)
  order by ms.position asc
  limit 1;
  if v_skill_id is not null then return v_skill_id; end if;

  -- Priority 3: Weakest developing skill needing reinforcement
  select sss.skill_id into v_skill_id
  from student_skill_state sss
  join micro_skills ms on ms.id = sss.skill_id
  where sss.student_id = p_student_id
    and sss.mastery_status = 'developing'
    and (p_concept_id is null or ms.concept_id = p_concept_id)
  order by sss.mastery_score asc
  limit 1;

  return v_skill_id;
end;
$$ language plpgsql;

-- ── log_misconception() ──────────────────────────────────────

create or replace function log_misconception(
  p_student_id        uuid,
  p_misconception_id  text,
  p_skill_id          text
) returns void as $$
begin
  insert into student_misconceptions
    (student_id, misconception_id, skill_id, occurrence_count, last_occurred_at)
  values
    (p_student_id, p_misconception_id, p_skill_id, 1, now())
  on conflict (student_id, misconception_id, skill_id)
  do update set
    occurrence_count  = student_misconceptions.occurrence_count + 1,
    last_occurred_at  = now(),
    resolved_at       = null,
    updated_at        = now();
end;
$$ language plpgsql;

-- ── update_question_stats() ──────────────────────────────────
-- Call after every interaction to keep question difficulty
-- stats current without expensive aggregation queries.

create or replace function update_question_stats(
  p_question_id uuid,
  p_is_correct  boolean
) returns void as $$
begin
  update questions set
    times_answered = times_answered + 1,
    times_correct  = times_correct + (case when p_is_correct then 1 else 0 end),
    updated_at     = now()
  where id = p_question_id;
end;
$$ language plpgsql;
