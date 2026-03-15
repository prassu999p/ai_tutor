import { supabaseServer } from '@/lib/supabase'
import type { Question, MicroSkill, SessionStartResult, MasteryStatus } from '@/types'
import MasteryService from './MasteryService'
import QuestionSelector from './QuestionSelector'

const SessionService = {
  /**
   * Start a new learning session for a student.
   * 1. Creates a session record in the sessions table
   * 2. Calls get_next_skill() to determine which skill to practice
   * 3. Fetches the skill record including intro_video_url
   * 4. Calls QuestionSelector.selectQuestion() for the first question
   * Returns SessionStartResult
   */
  startSession: async (studentId: string): Promise<SessionStartResult> => {
    // 1. INSERT into sessions
    const { data: session, error: sessionError } = await supabaseServer
      .from('sessions')
      .insert({
        student_id:         studentId,
        status:             'active',
        started_at:         new Date().toISOString(),
        ended_at:           null,
        questions_answered: 0,
        skills_practiced:   [],
        session_notes:      null,
      })
      .select('id')
      .single()

    if (sessionError || !session) {
      throw new Error(`Failed to create session: ${sessionError?.message ?? 'No session returned'}`)
    }

    const sessionId = session.id

    // 2. Get next skill via MasteryService
    const skillId = await MasteryService.getNextSkill(studentId, 'FRAC')

    if (!skillId) {
      throw new Error(`No available skill found for student ${studentId}`)
    }

    // 3. Fetch skill record from micro_skills
    const { data: skill, error: skillError } = await supabaseServer
      .from('micro_skills')
      .select('*')
      .eq('id', skillId)
      .single()

    if (skillError || !skill) {
      throw new Error(`Failed to fetch skill ${skillId}: ${skillError?.message ?? 'Not found'}`)
    }

    // 4. Determine isNewSkill: check if student has any interactions for this skill
    const { count: interactionCount, error: countError } = await supabaseServer
      .from('interactions')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('skill_id', skillId)

    if (countError) {
      throw new Error(`Failed to check interaction history: ${countError.message}`)
    }

    const isNewSkill = (interactionCount ?? 0) === 0

    // 5. Get mastery score for question selection
    const { data: skillState } = await supabaseServer
      .from('student_skill_state')
      .select('mastery_score')
      .eq('student_id', studentId)
      .eq('skill_id', skillId)
      .single()

    const masteryScore = skillState?.mastery_score ?? 0

    // 6. Select first question
    const firstQuestion = await QuestionSelector.selectQuestion(
      skillId,
      studentId,
      sessionId,
      masteryScore
    )

    return {
      sessionId,
      skillId,
      skill:         skill as MicroSkill,
      isNewSkill,
      introVideoUrl: (skill as MicroSkill).intro_video_url ?? null,
      firstQuestion: firstQuestion as Question,
    }
  },

  /**
   * End a session and generate summary.
   * 1. Updates session status to 'completed' and end_time
   * 2. Queries interactions for this session to compute stats
   * 3. Returns SessionSummary (aiInsight populated by API route, not here)
   */
  endSession: async (
    sessionId: string,
    studentId: string
  ) => {
    const endedAt = new Date().toISOString()

    // 1. Update session to completed
    const { error: updateError } = await supabaseServer
      .from('sessions')
      .update({ status: 'completed', ended_at: endedAt })
      .eq('id', sessionId)
      .eq('student_id', studentId)

    if (updateError) {
      throw new Error(`Failed to end session: ${updateError.message}`)
    }

    // 2. Fetch all interactions for this session
    const { data: interactions, error: interactionsError } = await supabaseServer
      .from('interactions')
      .select('*')
      .eq('session_id', sessionId)
      .eq('student_id', studentId)

    if (interactionsError) {
      throw new Error(`Failed to fetch session interactions: ${interactionsError.message}`)
    }

    const rows = interactions ?? []
    const questionsAnswered = rows.length
    const correctAnswers = rows.filter((i) => i.is_correct === true).length
    const accuracy = questionsAnswered > 0 ? correctAnswers / questionsAnswered : 0

    // Collect unique skills practiced
    const skillsPracticed = Array.from(new Set(rows.map((i) => i.skill_id)))

    // Compute mastery gains per skill
    const masteryBySkill = new Map<
      string,
      { scoreBefore: number; scoreAfter: number; status: MasteryStatus }
    >()

    for (const interaction of rows) {
      const skillId = interaction.skill_id
      const before = interaction.mastery_before ?? 0
      const after = interaction.mastery_after ?? 0

      const existing = masteryBySkill.get(skillId)
      if (!existing) {
        const status: MasteryStatus =
          after >= 0.80 ? 'mastered' : after >= 0.50 ? 'developing' : 'weak'
        masteryBySkill.set(skillId, {
          scoreBefore: before,
          scoreAfter:  after,
          status,
        })
      } else {
        // Keep earliest scoreBefore, latest scoreAfter
        const status: MasteryStatus =
          after >= 0.80 ? 'mastered' : after >= 0.50 ? 'developing' : 'weak'
        masteryBySkill.set(skillId, {
          scoreBefore: existing.scoreBefore,
          scoreAfter:  after,
          status,
        })
      }
    }

    const masteryGains = Array.from(masteryBySkill.entries()).map(([skillId, data]) => ({
      skillId,
      ...data,
    }))

    return {
      sessionId,
      studentId,
      questionsAnswered,
      correctAnswers,
      accuracy,
      skillsPracticed,
      masteryGains,
    }
  },

  /**
   * Get the next question for a session.
   * Delegates to QuestionSelector.
   */
  getNextQuestion: async (
    skillId: string,
    studentId: string,
    sessionId: string,
    masteryScore: number
  ): Promise<Question> => {
    return QuestionSelector.selectQuestion(skillId, studentId, sessionId, masteryScore)
  },
}

export default SessionService
