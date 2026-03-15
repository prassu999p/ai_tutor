import { supabaseServer } from '@/lib/supabase'
import { MASTERY_THRESHOLD } from '@/lib/constants'
import type { InteractionResult, MasteryStatus, AnswerEvent } from '@/types'

function deriveMasteryStatus(score: number): MasteryStatus {
  if (score >= MASTERY_THRESHOLD.mastered) return 'mastered'
  if (score >= MASTERY_THRESHOLD.developing) return 'developing'
  return 'weak'
}

const MasteryService = {
  /**
   * Process a student answer — the critical path.
   * Calls DB functions in sequence:
   * 1. update_mastery() — updates mastery score
   * 2. check_and_unlock_skills() — unlocks next skills if prerequisites met
   * 3. log_misconception() — if misconceptionId provided
   * 4. update_question_stats() — tracks question difficulty calibration
   * 5. INSERT into interactions — immutable event log
   * Returns InteractionResult with before/after mastery.
   */
  processAnswer: async (params: {
    studentId: string
    skillId: string
    questionId: string
    conceptId: string
    sessionId: string
    studentAnswer: string
    correctAnswer: string
    isCorrect: boolean
    hintUsed: boolean
    misconceptionId: string | null
    classifierType: 'rule_based' | 'llm'
    responseTimeMs?: number
    llmExplanation?: string | null
  }): Promise<InteractionResult> => {
    const {
      studentId,
      skillId,
      questionId,
      conceptId,
      sessionId,
      studentAnswer,
      isCorrect,
      hintUsed,
      misconceptionId,
      classifierType,
      responseTimeMs,
      llmExplanation,
    } = params

    // 1. Fetch mastery_score BEFORE update
    const { data: stateBefore, error: stateBeforeError } = await supabaseServer
      .from('student_skill_state')
      .select('mastery_score')
      .eq('student_id', studentId)
      .eq('skill_id', skillId)
      .single()

    if (stateBeforeError) {
      throw new Error(`Failed to fetch mastery state: ${stateBeforeError.message}`)
    }

    const masteryBefore: number = stateBefore?.mastery_score ?? 0

    // Determine event type
    const eventType: AnswerEvent = isCorrect
      ? hintUsed
        ? 'correct_with_hint'
        : 'correct_no_hint'
      : 'incorrect_conceptual'

    // 2. Call RPC update_mastery
    const { error: updateError } = await supabaseServer.rpc('update_mastery', {
      p_student_id: studentId,
      p_skill_id:   skillId,
      p_event:      eventType,
    })

    if (updateError) {
      throw new Error(`Failed to update mastery: ${updateError.message}`)
    }

    // 3. Fetch mastery_score AFTER update
    const { data: stateAfter, error: stateAfterError } = await supabaseServer
      .from('student_skill_state')
      .select('mastery_score, mastery_status, is_unlocked')
      .eq('student_id', studentId)
      .eq('skill_id', skillId)
      .single()

    if (stateAfterError) {
      throw new Error(`Failed to fetch updated mastery state: ${stateAfterError.message}`)
    }

    const masteryAfter: number = stateAfter?.mastery_score ?? masteryBefore
    const masteryDelta = masteryAfter - masteryBefore
    const masteryStatus: MasteryStatus = deriveMasteryStatus(masteryAfter)

    // 4. Call RPC check_and_unlock_skills
    const { error: unlockError } = await supabaseServer.rpc(
      'check_and_unlock_skills',
      { p_student_id: studentId }
    )

    if (unlockError) {
      throw new Error(`Failed to check skill unlocks: ${unlockError.message}`)
    }

    // Determine newly unlocked skills by querying recently unlocked
    const { data: recentlyUnlocked } = await supabaseServer
      .from('student_skill_state')
      .select('skill_id')
      .eq('student_id', studentId)
      .eq('is_unlocked', true)
      .gt('unlocked_at', new Date(Date.now() - 5000).toISOString())

    const unlockedSkillIds = recentlyUnlocked?.map((s) => s.skill_id) ?? []
    const newSkillUnlocked = unlockedSkillIds.length > 0

    // 5. If misconceptionId is not null, call RPC log_misconception
    if (misconceptionId !== null) {
      const { error: misconceptionError } = await supabaseServer.rpc('log_misconception', {
        p_student_id:       studentId,
        p_misconception_id: misconceptionId,
        p_skill_id:         skillId,
      })

      if (misconceptionError) {
        throw new Error(`Failed to log misconception: ${misconceptionError.message}`)
      }
    }

    // 6. Call RPC update_question_stats
    const { error: statsError } = await supabaseServer.rpc('update_question_stats', {
      p_question_id: questionId,
      p_is_correct:  isCorrect,
    })

    if (statsError) {
      throw new Error(`Failed to update question stats: ${statsError.message}`)
    }

    // 7. INSERT into interactions — immutable event log
    const { error: insertError } = await supabaseServer.from('interactions').insert({
      student_id:               studentId,
      skill_id:                 skillId,
      question_id:              questionId,
      concept_id:               conceptId,
      session_id:               sessionId,
      student_answer:           studentAnswer,
      is_correct:               isCorrect,
      hint_used:                hintUsed,
      event_type:               eventType,
      mastery_before:           masteryBefore,
      mastery_after:            masteryAfter,
      mastery_delta:            masteryDelta,
      misconception_id:         misconceptionId,
      classifier_type:          classifierType,
      response_time_ms:         responseTimeMs ?? null,
      llm_reasoning:            llmExplanation ?? null,
      misconception_confidence: null,
    })

    if (insertError) {
      throw new Error(`Failed to insert interaction: ${insertError.message}`)
    }

    return {
      isCorrect,
      masteryBefore,
      masteryAfter,
      masteryDelta,
      masteryStatus,
      misconceptionDetected: null,
      classifierType,
      confidence: null,
      explanation: '',
      hintAvailable: false,
      nextSkillId: null,
      newSkillUnlocked,
    }
  },

  /**
   * Initialize skill states for a new student.
   * Calls init_student_skills() RPC.
   */
  initStudentSkills: async (studentId: string, conceptId?: string): Promise<void> => {
    const { error } = await supabaseServer.rpc('init_student_skills', {
      p_student_id:  studentId,
      p_concept_id:  conceptId,
    })

    if (error) {
      throw new Error(`Failed to initialize student skills: ${error.message}`)
    }
  },

  /**
   * Get the next recommended skill for a student.
   * Calls get_next_skill() RPC.
   */
  getNextSkill: async (studentId: string, conceptId?: string): Promise<string | null> => {
    const { data, error } = await supabaseServer.rpc('get_next_skill', {
      p_student_id:  studentId,
      p_concept_id:  conceptId,
    })

    if (error) {
      throw new Error(`Failed to get next skill: ${error.message}`)
    }

    return data ?? null
  },
}

export default MasteryService
