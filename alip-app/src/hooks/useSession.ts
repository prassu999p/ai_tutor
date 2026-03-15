'use client'

import { useState, useCallback, useRef } from 'react'
import type { SessionState, SessionStartResult, SessionSummary, Question } from '@/types'
import type { MasteryStatus } from '@/types/database'
import { SESSION_LIMITS } from '@/lib/constants'

// API response shape from POST /api/answers/submit
interface SubmitAnswerResponse {
  isCorrect: boolean
  masteryBefore: number
  masteryAfter: number
  masteryDelta: number
  masteryStatus: MasteryStatus
  misconceptionDetected: {
    id: string
    name: string
    remediation: string
    remediationVideoUrl: string | null
  } | null
  classifierType: string
  explanation: string
  explanationSource: string
  newSkillUnlocked: boolean
}

// API response shape from GET /api/sessions/[id]/next-question
interface NextQuestionResponse {
  question: Question
  skillId: string
}

export interface UseSessionReturn {
  state: SessionState
  sessionId: string | null
  currentQuestion: Question | null
  currentSkillId: string | null
  currentSkillName: string | null
  conceptName: string | null
  introVideoUrl: string | null
  introVideoDuration: number
  questionsAnswered: number
  masteryScore: number
  masteryStatus: MasteryStatus | null
  selectedAnswer: string | null
  hintUsed: boolean
  lastFeedback: SubmitAnswerResponse | null
  sessionSummary: SessionSummary | null
  error: string | null
  isLoading: boolean

  // Actions
  startSession: () => Promise<void>
  onIntroVideoReady: () => void
  selectAnswer: (answer: string) => void
  submitAnswer: () => Promise<void>
  requestHint: () => void
  nextQuestion: () => Promise<void>
  endSession: () => Promise<void>
}

export function useSession(studentId: string): UseSessionReturn {
  const [state, setState] = useState<SessionState>('IDLE')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [currentSkillId, setCurrentSkillId] = useState<string | null>(null)
  const [currentSkillName, setCurrentSkillName] = useState<string | null>(null)
  const [conceptName, setConceptName] = useState<string | null>(null)
  const [introVideoUrl, setIntroVideoUrl] = useState<string | null>(null)
  const [introVideoDuration, setIntroVideoDuration] = useState(0)
  const [questionsAnswered, setQuestionsAnswered] = useState(0)
  const [masteryScore, setMasteryScore] = useState(0)
  const [masteryStatus, setMasteryStatus] = useState<MasteryStatus | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [hintUsed, setHintUsed] = useState(false)
  const [lastFeedback, setLastFeedback] = useState<SubmitAnswerResponse | null>(null)
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Track question IDs answered in this session to avoid duplicates in UI
  const answeredQuestionIds = useRef<Set<string>>(new Set())
  const questionStartTime = useRef<number>(Date.now())

  const startSession = useCallback(async () => {
    setError(null)
    setIsLoading(true)

    try {
      const res = await fetch('/api/sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      })

      if (!res.ok) {
        const body = await res.json() as { error: string }
        throw new Error(body.error || 'Failed to start session')
      }

      const data = await res.json() as SessionStartResult

      setSessionId(data.sessionId)
      setCurrentSkillId(data.skillId)
      setCurrentSkillName(data.skill.name)
      setConceptName(null) // Will be populated from skill profile if needed
      setCurrentQuestion(data.firstQuestion)
      setIntroVideoUrl(data.introVideoUrl)
      setIntroVideoDuration(data.skill.intro_video_length_sec ?? 0)
      setQuestionsAnswered(0)
      setMasteryScore(0)
      setMasteryStatus('weak')
      setSelectedAnswer(null)
      setHintUsed(false)
      setLastFeedback(null)
      setSessionSummary(null)
      answeredQuestionIds.current.clear()

      // If there is an intro video and this is a new skill, show it
      if (data.introVideoUrl && data.isNewSkill) {
        setState('INTRO_VIDEO')
      } else {
        setState('QUESTION_ACTIVE')
        questionStartTime.current = Date.now()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start session'
      setError(message)
      setState('IDLE')
    } finally {
      setIsLoading(false)
    }
  }, [studentId])

  const onIntroVideoReady = useCallback(() => {
    setState('QUESTION_ACTIVE')
    questionStartTime.current = Date.now()
  }, [])

  const selectAnswer = useCallback((answer: string) => {
    if (state !== 'QUESTION_ACTIVE' && state !== 'HINT_SHOWN') return
    setSelectedAnswer(answer)
  }, [state])

  const requestHint = useCallback(() => {
    if (state !== 'QUESTION_ACTIVE') return
    setHintUsed(true)
    setState('HINT_SHOWN')
  }, [state])

  const submitAnswer = useCallback(async () => {
    if (!selectedAnswer || !currentQuestion || !sessionId || !currentSkillId) return
    if (state !== 'QUESTION_ACTIVE' && state !== 'HINT_SHOWN') return

    setState('EVALUATING')
    setError(null)

    const responseTimeMs = Date.now() - questionStartTime.current

    try {
      const res = await fetch('/api/answers/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          studentId,
          skillId: currentSkillId,
          conceptId: currentQuestion.concept_id,
          questionId: currentQuestion.id,
          studentAnswer: selectedAnswer,
          hintUsed,
          responseTimeMs,
        }),
      })

      if (!res.ok) {
        const body = await res.json() as { error: string }
        throw new Error(body.error || 'Failed to submit answer')
      }

      const feedback = await res.json() as SubmitAnswerResponse

      setLastFeedback(feedback)
      setMasteryScore(feedback.masteryAfter)
      setMasteryStatus(feedback.masteryStatus)
      setQuestionsAnswered((prev) => prev + 1)
      answeredQuestionIds.current.add(currentQuestion.id)

      // Determine feedback state
      if (feedback.newSkillUnlocked && feedback.masteryStatus === 'mastered') {
        setState('SKILL_MASTERED')
      } else if (feedback.isCorrect) {
        setState('FEEDBACK_CORRECT')
      } else if (feedback.misconceptionDetected) {
        setState('FEEDBACK_MISCONCEPTION')
      } else {
        setState('FEEDBACK_INCORRECT')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit answer'
      setError(message)
      // Return to active question state so the student can retry
      setState(hintUsed ? 'HINT_SHOWN' : 'QUESTION_ACTIVE')
    }
  }, [selectedAnswer, currentQuestion, sessionId, currentSkillId, studentId, hintUsed, state])

  const nextQuestion = useCallback(async () => {
    if (!sessionId || !currentSkillId) return

    // Check session limits
    if (questionsAnswered >= SESSION_LIMITS.MAX_QUESTIONS) {
      await endSessionInternal()
      return
    }

    setError(null)
    setIsLoading(true)

    try {
      const params = new URLSearchParams({
        studentId,
        skillId: currentSkillId,
        masteryScore: masteryScore.toString(),
      })

      const res = await fetch(
        `/api/sessions/${sessionId}/next-question?${params.toString()}`,
        { method: 'GET' }
      )

      if (!res.ok) {
        const body = await res.json() as { error: string }
        throw new Error(body.error || 'Failed to get next question')
      }

      const data = await res.json() as NextQuestionResponse

      setCurrentQuestion(data.question)
      setCurrentSkillId(data.skillId)
      setSelectedAnswer(null)
      setHintUsed(false)
      setLastFeedback(null)
      setState('QUESTION_ACTIVE')
      questionStartTime.current = Date.now()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get next question'
      setError(message)
      // If we can't get the next question, end the session
      await endSessionInternal()
    } finally {
      setIsLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, currentSkillId, studentId, masteryScore, questionsAnswered])

  const endSessionInternal = useCallback(async () => {
    if (!sessionId) return

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/sessions/${sessionId}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      })

      if (!res.ok) {
        const body = await res.json() as { error: string }
        throw new Error(body.error || 'Failed to end session')
      }

      const data = await res.json() as { summary: SessionSummary }
      setSessionSummary(data.summary)
      setState('SESSION_COMPLETE')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to end session'
      setError(message)
      // Even on error, transition to complete so the student isn't stuck
      setState('SESSION_COMPLETE')
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, studentId])

  const endSession = useCallback(async () => {
    await endSessionInternal()
  }, [endSessionInternal])

  return {
    state,
    sessionId,
    currentQuestion,
    currentSkillId,
    currentSkillName,
    conceptName,
    introVideoUrl,
    introVideoDuration,
    questionsAnswered,
    masteryScore,
    masteryStatus,
    selectedAnswer,
    hintUsed,
    lastFeedback,
    sessionSummary,
    error,
    isLoading,

    startSession,
    onIntroVideoReady,
    selectAnswer,
    submitAnswer,
    requestHint,
    nextQuestion,
    endSession,
  }
}

export default useSession
