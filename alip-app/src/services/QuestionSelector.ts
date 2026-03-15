import { supabaseServer } from '@/lib/supabase'
import type { Question } from '@/types'

/**
 * Returns the preferred difficulty_weight range for a given mastery score.
 */
function getDifficultyRange(masteryScore: number): { min: number; max: number } {
  if (masteryScore < 0.30) {
    return { min: 0, max: 0.7 }
  } else if (masteryScore < 0.60) {
    return { min: 0.8, max: 1.2 }
  } else if (masteryScore < 0.80) {
    return { min: 1.2, max: 1.6 }
  } else {
    // mastered — challenge with hardest questions
    return { min: 1.2, max: 9999 }
  }
}

const QuestionSelector = {
  /**
   * Select the next question for a student on a given skill.
   * - Avoids questions already answered in this session
   * - Adjusts difficulty based on mastery score:
   *   mastery < 0.30  → prefer difficulty_weight ≤ 0.7
   *   mastery 0.30-0.60 → prefer difficulty_weight 0.8-1.2
   *   mastery 0.60-0.80 → prefer difficulty_weight 1.2-1.6
   * - Falls back to any unanswered question if no difficulty-match available
   * - Falls back to least-recently-seen question if all have been answered
   */
  selectQuestion: async (
    skillId: string,
    studentId: string,
    sessionId: string,
    masteryScore: number
  ): Promise<Question> => {
    // 1. Fetch all active questions for this skill
    const { data: allQuestions, error: questionsError } = await supabaseServer
      .from('questions')
      .select('*')
      .eq('skill_id', skillId)
      .eq('is_active', true)

    if (questionsError) {
      throw new Error(`Failed to fetch questions for skill ${skillId}: ${questionsError.message}`)
    }

    if (!allQuestions || allQuestions.length === 0) {
      throw new Error(`No active questions found for skill ${skillId}`)
    }

    // 2. Fetch question IDs already answered in this session
    const { data: sessionInteractions, error: interactionsError } = await supabaseServer
      .from('interactions')
      .select('question_id')
      .eq('session_id', sessionId)
      .eq('student_id', studentId)

    if (interactionsError) {
      throw new Error(`Failed to fetch session interactions: ${interactionsError.message}`)
    }

    const answeredIds = new Set(
      (sessionInteractions ?? []).map((i) => i.question_id)
    )

    // 3. Partition questions
    const unanswered = allQuestions.filter((q) => !answeredIds.has(q.id))

    const { min, max } = getDifficultyRange(masteryScore)

    // 4. Try preferred difficulty range among unanswered
    const preferred = unanswered.filter(
      (q) => q.difficulty_weight >= min && q.difficulty_weight <= max
    )

    if (preferred.length > 0) {
      // Pick randomly within the preferred set to avoid always repeating first
      return preferred[Math.floor(Math.random() * preferred.length)] as Question
    }

    // 5. Fallback: any unanswered question
    if (unanswered.length > 0) {
      return unanswered[Math.floor(Math.random() * unanswered.length)] as Question
    }

    // 6. All questions in session answered — fallback to least-recently-seen overall
    const { data: recentInteractions, error: recentError } = await supabaseServer
      .from('interactions')
      .select('question_id, created_at')
      .eq('student_id', studentId)
      .in('question_id', allQuestions.map((q) => q.id))
      .order('created_at', { ascending: false })

    if (recentError) {
      throw new Error(`Failed to fetch interaction history: ${recentError.message}`)
    }

    // Build a map of questionId → most recent interaction timestamp
    const lastSeenMap = new Map<string, string>()
    for (const interaction of recentInteractions ?? []) {
      if (!lastSeenMap.has(interaction.question_id)) {
        lastSeenMap.set(interaction.question_id, interaction.created_at)
      }
    }

    // Sort questions: those never seen first (no entry in map), then oldest-seen first
    const sorted = [...allQuestions].sort((a, b) => {
      const aTime = lastSeenMap.get(a.id) ?? '1970-01-01T00:00:00Z'
      const bTime = lastSeenMap.get(b.id) ?? '1970-01-01T00:00:00Z'
      return aTime < bTime ? -1 : aTime > bTime ? 1 : 0
    })

    return sorted[0] as Question
  },
}

export default QuestionSelector
