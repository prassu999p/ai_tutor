'use client'

import { MasteryBar } from './MasteryBar'

interface SkillProgress {
  skillName: string
  before: number
  after: number
}

interface SessionSummaryScreenProps {
  questionsAnswered: number
  skillsImproved: SkillProgress[]
  skillsMastered: string[]
  aiInsight: string | null
  onDone: () => void
  onViewProgress: () => void
}

export function SessionSummaryScreen({
  questionsAnswered,
  skillsImproved,
  skillsMastered,
  aiInsight,
  onDone,
  onViewProgress,
}: SessionSummaryScreenProps) {
  return (
    <div className="min-h-screen bg-white flex flex-col px-4 pt-8 pb-6 max-w-lg mx-auto">
      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Session complete!</h1>
      <p className="text-base text-gray-500 mb-6">
        You answered <strong className="text-gray-900">{questionsAnswered}</strong> question
        {questionsAnswered !== 1 ? 's' : ''} this session.
      </p>

      {/* Skills mastered */}
      {skillsMastered.length > 0 && (
        <section className="mb-6">
          <h2 className="text-base font-semibold text-gray-700 mb-3">Skills mastered</h2>
          <div className="flex flex-col gap-2">
            {skillsMastered.map((skill) => (
              <div
                key={skill}
                className="flex items-center gap-3 rounded-xl bg-green-50 border border-green-200 px-4 py-3"
              >
                <span className="text-green-600 text-lg" aria-hidden="true">
                  ✓
                </span>
                <span className="text-sm font-semibold text-green-800">{skill}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills improved */}
      {skillsImproved.length > 0 && (
        <section className="mb-6">
          <h2 className="text-base font-semibold text-gray-700 mb-3">Skills improved</h2>
          <div className="flex flex-col gap-4">
            {skillsImproved.map(({ skillName, before, after }) => (
              <div key={skillName} className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
                <p className="text-sm font-semibold text-gray-800 mb-2">{skillName}</p>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-12">Before</span>
                    <MasteryBar score={before} animate={false} size="sm" showLabel />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-12">After</span>
                    <MasteryBar score={after} animate size="sm" showLabel />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* AI insight */}
      {aiInsight && (
        <section className="mb-6">
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-4">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
              Your tutor noticed:
            </p>
            <p className="text-sm text-amber-900">{aiInsight}</p>
          </div>
        </section>
      )}

      {/* Actions */}
      <div className="mt-auto flex flex-col gap-3">
        <button
          type="button"
          onClick={onDone}
          className="w-full min-h-[56px] rounded-2xl bg-blue-600 text-white text-base font-semibold active:bg-blue-700 transition-colors"
        >
          Continue Learning
        </button>
        <button
          type="button"
          onClick={onViewProgress}
          className="w-full min-h-[56px] rounded-2xl border border-gray-300 bg-white text-base font-semibold text-gray-700 active:bg-gray-50 transition-colors"
        >
          View Progress
        </button>
      </div>
    </div>
  )
}

export default SessionSummaryScreen
