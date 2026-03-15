'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useSession } from '@/hooks/useSession'
import {
  VideoPlayer,
  SessionContextBar,
  AnswerOptions,
  HintButton,
  FeedbackPanel,
  SkillUnlockScreen,
  SessionSummaryScreen,
} from '@/components'
import { QuestionCard } from './components/QuestionCard'
import { SESSION_LIMITS } from '@/lib/constants'

interface StudentRecord {
  id: string
  name: string
  grade: number
  parent_email: string | null
  dashboard_token: string
  is_active: boolean
}

function LoadingSpinner({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <svg
        className="animate-spin mb-4"
        width={40}
        height={40}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#3b82f6"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity={0.25} />
        <path d="M21 12a9 9 0 00-9-9" />
      </svg>
      <p className="text-base text-gray-500">{message}</p>
    </div>
  )
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="w-full rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3">
      <span className="text-red-500 text-lg mt-0.5" aria-hidden="true">!</span>
      <div className="flex-1">
        <p className="text-sm text-red-800">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 text-sm font-medium text-red-600 underline"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  )
}

export default function SessionPage() {
  const router = useRouter()
  const [studentId, setStudentId] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  // Fetch authenticated user and student record
  useEffect(() => {
    async function loadStudent() {
      try {
        const supabase = createSupabaseBrowserClient()
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
          setAuthError('You must be logged in to start a session.')
          setAuthLoading(false)
          return
        }

        const { data, error: rpcError } = await supabase.rpc('get_student_by_auth_user', {
          p_auth_user_id: user.id,
        })

        if (rpcError || !data || data.length === 0) {
          setAuthError('No student profile found for your account.')
          setAuthLoading(false)
          return
        }

        const student = data[0] as StudentRecord
        if (!student.is_active) {
          setAuthError('Your student profile is not active.')
          setAuthLoading(false)
          return
        }

        setStudentId(student.id)
      } catch {
        setAuthError('Failed to load your profile. Please try again.')
      } finally {
        setAuthLoading(false)
      }
    }

    loadStudent()
  }, [])

  if (authLoading) {
    return <LoadingSpinner message="Loading your profile..." />
  }

  if (authError || !studentId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
        <ErrorBanner message={authError ?? 'Unable to load student profile.'} />
        <button
          type="button"
          onClick={() => router.push('/login')}
          className="mt-6 min-h-[48px] px-8 rounded-xl bg-blue-600 text-white text-base font-semibold active:bg-blue-700 transition-colors"
        >
          Go to Login
        </button>
      </div>
    )
  }

  return <SessionContent studentId={studentId} />
}

function SessionContent({ studentId }: { studentId: string }) {
  const router = useRouter()
  const session = useSession(studentId)

  // Auto-start session on mount
  useEffect(() => {
    if (session.state === 'IDLE' && !session.isLoading) {
      session.startSession()
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const {
    state,
    currentQuestion,
    currentSkillName,
    conceptName,
    introVideoUrl,
    introVideoDuration,
    questionsAnswered,
    selectedAnswer,
    lastFeedback,
    sessionSummary,
    error,
    isLoading,
  } = session

  // IDLE state - starting session
  if (state === 'IDLE') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
        {error ? (
          <ErrorBanner message={error} onRetry={session.startSession} />
        ) : (
          <LoadingSpinner message="Starting session..." />
        )}
      </div>
    )
  }

  // INTRO_VIDEO state
  if (state === 'INTRO_VIDEO') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4 py-8 max-w-lg mx-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">
          {currentSkillName ?? 'New Skill'}
        </h2>
        <VideoPlayer
          videoUrl={introVideoUrl ?? ''}
          title={`Introduction: ${currentSkillName ?? 'New Skill'}`}
          durationSec={introVideoDuration}
          type="intro"
          onReady={session.onIntroVideoReady}
          fallbackText={`Let's learn about ${currentSkillName ?? 'this skill'}! When you're ready, tap the button below.`}
        />
      </div>
    )
  }

  // SESSION_COMPLETE state
  if (state === 'SESSION_COMPLETE') {
    if (sessionSummary) {
      return (
        <SessionSummaryScreen
          questionsAnswered={sessionSummary.questionsAnswered}
          skillsImproved={sessionSummary.skillsImproved}
          skillsMastered={sessionSummary.skillsMastered}
          aiInsight={sessionSummary.aiInsight}
          onDone={() => router.push('/')}
          onViewProgress={() => router.push('/progress')}
        />
      )
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Session Complete</h2>
        <p className="text-base text-gray-500 mb-6">
          You answered {questionsAnswered} question{questionsAnswered !== 1 ? 's' : ''}.
        </p>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="min-h-[48px] px-8 rounded-xl bg-blue-600 text-white text-base font-semibold active:bg-blue-700 transition-colors"
        >
          Go Home
        </button>
      </div>
    )
  }

  // SKILL_MASTERED state
  if (state === 'SKILL_MASTERED') {
    return (
      <SkillUnlockScreen
        masteredSkillName={currentSkillName ?? 'Skill'}
        nextSkillName={null}
        onContinue={session.nextQuestion}
      />
    )
  }

  // EVALUATING state
  if (state === 'EVALUATING') {
    return (
      <div className="min-h-screen bg-white">
        <SessionContextBar
          skillName={currentSkillName ?? ''}
          conceptName={conceptName ?? 'Fractions'}
          questionsAnswered={questionsAnswered + 1}
          estimatedTotal={SESSION_LIMITS.MAX_QUESTIONS}
        />
        <div className="pt-16 px-4 max-w-lg mx-auto">
          {currentQuestion && <QuestionCard question={currentQuestion} />}
          <div className="mt-6">
            <AnswerOptions
              options={currentQuestion ? (Array.isArray(currentQuestion.distractors) ? (currentQuestion.distractors as Array<{answer: string}>).map((d) => d.answer).concat(currentQuestion.correct_answer) : [currentQuestion.correct_answer]) : []}
              selectedAnswer={selectedAnswer}
              submitted
              correctAnswer={currentQuestion?.correct_answer}
              onSelect={() => {}}
            />
          </div>
          <div className="mt-6 flex justify-center">
            <LoadingSpinner message="Checking your answer..." />
          </div>
        </div>
      </div>
    )
  }

  // FEEDBACK states
  if (state === 'FEEDBACK_CORRECT' || state === 'FEEDBACK_MISCONCEPTION' || state === 'FEEDBACK_INCORRECT') {
    const feedbackStateMap = {
      FEEDBACK_CORRECT: 'CORRECT' as const,
      FEEDBACK_MISCONCEPTION: 'MISCONCEPTION' as const,
      FEEDBACK_INCORRECT: 'INCORRECT' as const,
    }

    return (
      <div className="min-h-screen bg-white">
        <SessionContextBar
          skillName={currentSkillName ?? ''}
          conceptName={conceptName ?? 'Fractions'}
          questionsAnswered={questionsAnswered}
          estimatedTotal={SESSION_LIMITS.MAX_QUESTIONS}
        />
        <div className="pt-16 px-4 pb-8 max-w-lg mx-auto flex flex-col gap-6">
          {currentQuestion && <QuestionCard question={currentQuestion} />}

          {error && <ErrorBanner message={error} />}

          <FeedbackPanel
            state={feedbackStateMap[state]}
            explanation={lastFeedback?.explanation ?? ''}
            masteryBefore={lastFeedback?.masteryBefore}
            masteryAfter={lastFeedback?.masteryAfter}
            misconceptionName={lastFeedback?.misconceptionDetected?.name}
            studentAnswer={selectedAnswer ?? undefined}
            onNext={session.nextQuestion}
            onWatchVideo={
              lastFeedback?.misconceptionDetected?.remediationVideoUrl
                ? () => {
                    // For misconception remediation, next question handles the flow
                    session.nextQuestion()
                  }
                : undefined
            }
          />
        </div>
      </div>
    )
  }

  // QUESTION_ACTIVE / HINT_SHOWN state
  if (state === 'QUESTION_ACTIVE' || state === 'HINT_SHOWN') {
    if (!currentQuestion) {
      return <LoadingSpinner message="Loading question..." />
    }

    // Build answer options: combine distractors + correct answer, shuffled deterministically
    const distractorAnswers = Array.isArray(currentQuestion.distractors)
      ? (currentQuestion.distractors as Array<{answer: string}>).map((d) => d.answer)
      : []
    const allOptions = [...distractorAnswers, currentQuestion.correct_answer]

    return (
      <div className="min-h-screen bg-white">
        <SessionContextBar
          skillName={currentSkillName ?? ''}
          conceptName={conceptName ?? 'Fractions'}
          questionsAnswered={questionsAnswered + 1}
          estimatedTotal={SESSION_LIMITS.MAX_QUESTIONS}
        />

        <div className="pt-16 px-4 pb-8 max-w-lg mx-auto flex flex-col gap-6">
          {error && <ErrorBanner message={error} onRetry={() => session.submitAnswer()} />}

          <QuestionCard question={currentQuestion} />

          <AnswerOptions
            options={allOptions}
            selectedAnswer={selectedAnswer}
            submitted={false}
            onSelect={session.selectAnswer}
          />

          <HintButton
            hintText={currentQuestion.hint_text}
            onRequestHint={session.requestHint}
          />

          {/* Submit button */}
          <button
            type="button"
            disabled={!selectedAnswer || isLoading}
            onClick={session.submitAnswer}
            className={`w-full min-h-[56px] rounded-2xl text-base font-semibold transition-colors ${
              selectedAnswer
                ? 'bg-blue-600 text-white active:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? 'Submitting...' : 'Check Answer'}
          </button>

          {/* End session early button */}
          <button
            type="button"
            onClick={session.endSession}
            className="w-full min-h-[44px] rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-500 active:bg-gray-50 transition-colors"
          >
            End Session
          </button>
        </div>
      </div>
    )
  }

  // Fallback - should not reach here
  return <LoadingSpinner message="Loading..." />
}
