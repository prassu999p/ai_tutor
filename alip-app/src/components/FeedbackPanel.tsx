'use client'

import { MasteryBar } from './MasteryBar'

type FeedbackState = 'CORRECT' | 'MISCONCEPTION' | 'INCORRECT' | 'SKILL_MASTERED'

interface FeedbackPanelProps {
  state: FeedbackState
  explanation: string
  masteryBefore?: number
  masteryAfter?: number
  misconceptionName?: string
  studentAnswer?: string
  isLoadingExplanation?: boolean
  onNext: () => void
  onWatchVideo?: () => void
}

function ExplanationSkeleton() {
  return (
    <div className="space-y-2 animate-pulse" aria-label="Loading explanation">
      <div className="h-3 bg-gray-200 rounded w-full" />
      <div className="h-3 bg-gray-200 rounded w-5/6" />
      <div className="h-3 bg-gray-200 rounded w-4/6" />
    </div>
  )
}

function NotQuiteHeader({
  studentAnswer,
  textColor = 'text-gray-800',
  answerColor = 'text-gray-600',
}: {
  studentAnswer?: string
  textColor?: string
  answerColor?: string
}) {
  return (
    <div>
      <h3 className={`text-base font-semibold ${textColor}`}>Not quite</h3>
      {studentAnswer && (
        <p className={`text-sm mt-1 ${answerColor}`}>
          You answered: <strong>{studentAnswer}</strong>
        </p>
      )}
    </div>
  )
}

function MasterySection({ score }: { score: number }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">Your mastery</p>
      <MasteryBar score={score} animate size="sm" />
    </div>
  )
}

export function FeedbackPanel({
  state,
  explanation,
  masteryBefore,
  masteryAfter,
  misconceptionName,
  studentAnswer,
  isLoadingExplanation = false,
  onNext,
  onWatchVideo,
}: FeedbackPanelProps) {
  if (state === 'SKILL_MASTERED') {
    // Handled by SkillUnlockScreen — this panel just passes through silently
    return null
  }

  if (state === 'CORRECT') {
    return (
      <div className="w-full rounded-2xl bg-green-50 border border-green-200 px-4 py-4 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span
            className="flex items-center justify-center w-8 h-8 rounded-full bg-green-600"
            aria-hidden="true"
          >
            <svg viewBox="0 0 20 20" fill="white" width={18} height={18}>
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </span>
          <span className="text-base font-semibold text-green-800">Correct!</span>
        </div>

        {/* Explanation */}
        {isLoadingExplanation ? (
          <ExplanationSkeleton />
        ) : (
          <p className="text-sm text-gray-700">{explanation}</p>
        )}

        {/* Mastery bar */}
        {masteryAfter !== undefined && <MasterySection score={masteryAfter} />}

        <button
          type="button"
          onClick={onNext}
          className="w-full min-h-[48px] rounded-xl bg-green-600 text-white text-base font-semibold active:bg-green-700 transition-colors"
        >
          Next Question
        </button>
      </div>
    )
  }

  if (state === 'MISCONCEPTION') {
    return (
      <div className="w-full rounded-2xl bg-amber-50 border border-amber-200 px-4 py-4 flex flex-col gap-4">
        <NotQuiteHeader
          studentAnswer={studentAnswer}
          textColor="text-amber-800"
          answerColor="text-amber-700"
        />

        {misconceptionName && (
          <p className="text-sm text-gray-700">
            {"Let's look at this — "}
            {misconceptionName}
          </p>
        )}

        {isLoadingExplanation ? (
          <ExplanationSkeleton />
        ) : (
          <p className="text-sm text-gray-700">{explanation}</p>
        )}

        {onWatchVideo && (
          <button
            type="button"
            onClick={onWatchVideo}
            className="w-full min-h-[48px] rounded-xl bg-amber-600 text-white text-base font-semibold active:bg-amber-700 transition-colors"
          >
            Watch explanation
          </button>
        )}
      </div>
    )
  }

  // INCORRECT
  return (
    <div className="w-full rounded-2xl bg-gray-50 border border-gray-200 px-4 py-4 flex flex-col gap-4">
      <NotQuiteHeader studentAnswer={studentAnswer} />

      {isLoadingExplanation ? (
        <ExplanationSkeleton />
      ) : (
        <p className="text-sm text-gray-700">{explanation}</p>
      )}

      {masteryAfter !== undefined && masteryBefore !== undefined && masteryAfter > masteryBefore && (
        <MasterySection score={masteryAfter} />
      )}

      <button
        type="button"
        onClick={onNext}
        className="w-full min-h-[48px] rounded-xl bg-blue-600 text-white text-base font-semibold active:bg-blue-700 transition-colors"
      >
        Try another one
      </button>
    </div>
  )
}

export default FeedbackPanel
