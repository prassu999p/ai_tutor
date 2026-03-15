import type { ConceptMasteryRow } from '@/types/database'

interface LearningSummaryProps {
  studentName: string
  grade: string | null
  sessionsThisWeek: number
  totalQuestionsAnswered: number
  conceptMastery: ConceptMasteryRow[]
}

function getOverallMasteryScore(conceptMastery: ConceptMasteryRow[]): number {
  if (conceptMastery.length === 0) return 0
  const total = conceptMastery.reduce((sum, c) => sum + c.concept_mastery_score, 0)
  return total / conceptMastery.length
}

function getMasteryLabel(score: number): string {
  if (score >= 0.8) return 'Mastered'
  if (score >= 0.5) return 'Developing'
  return 'Getting Started'
}

function getMasteryColor(score: number): string {
  if (score >= 0.8) return 'text-green-600'
  if (score >= 0.5) return 'text-blue-600'
  return 'text-gray-500'
}

export function LearningSummary({
  studentName,
  grade,
  sessionsThisWeek,
  totalQuestionsAnswered,
  conceptMastery,
}: LearningSummaryProps) {
  const overallScore = getOverallMasteryScore(conceptMastery)
  const percentage = Math.round(overallScore * 100)
  const masteryLabel = getMasteryLabel(overallScore)
  const masteryColor = getMasteryColor(overallScore)

  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {studentName}&apos;s Progress
          </h1>
          {grade && (
            <p className="text-sm text-gray-500 mt-1">Grade {grade}</p>
          )}
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl">
          <span className="text-sm text-gray-500">Overall</span>
          <span className={`text-xl font-bold ${masteryColor}`}>
            {percentage}%
          </span>
          <span className={`text-xs font-medium ${masteryColor}`}>
            {masteryLabel}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-blue-700">{sessionsThisWeek}</p>
          <p className="text-sm text-blue-600 mt-1">Sessions this week</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-purple-700">
            {totalQuestionsAnswered}
          </p>
          <p className="text-sm text-purple-600 mt-1">Questions answered</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-green-700">
            {conceptMastery.length > 0
              ? conceptMastery[0].skills_mastered
              : 0}
            <span className="text-lg font-normal text-green-500">
              /{conceptMastery.length > 0 ? conceptMastery[0].total_skills : 0}
            </span>
          </p>
          <p className="text-sm text-green-600 mt-1">Skills mastered</p>
        </div>
      </div>
    </section>
  )
}
