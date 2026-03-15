interface MisconceptionItem {
  id: string
  name: string
  severity: string
  occurrenceCount: number
  whatToDo: string
  whatToDoSource: 'llm' | 'fallback'
}

interface MisconceptionInsightsProps {
  misconceptions: MisconceptionItem[]
  studentName: string
}

const SEVERITY_BADGE: Record<string, { label: string; className: string }> = {
  high: { label: 'Needs attention', className: 'bg-red-50 text-red-700 border-red-200' },
  medium: { label: 'Working on it', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  low: { label: 'Minor', className: 'bg-gray-50 text-gray-600 border-gray-200' },
}

export function MisconceptionInsights({
  misconceptions,
  studentName,
}: MisconceptionInsightsProps) {
  if (misconceptions.length === 0) {
    return (
      <section className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Learning Insights
        </h2>
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-green-50 rounded-full mb-3">
            <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">
            No common mistakes detected right now. Great job, {studentName}!
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Learning Insights</h2>
        <p className="text-sm text-gray-500 mt-1">
          Common patterns we have noticed and how you can help at home
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {misconceptions.map((m) => {
          const badge = SEVERITY_BADGE[m.severity] ?? SEVERITY_BADGE.low

          return (
            <div
              key={m.id}
              className="rounded-xl border border-gray-200 p-5 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900 leading-snug">
                  {m.name}
                </h3>
                <span
                  className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border ${badge.className}`}
                >
                  {badge.label}
                </span>
              </div>

              <p className="text-xs text-gray-400">
                Seen {m.occurrenceCount} time{m.occurrenceCount !== 1 ? 's' : ''}
              </p>

              <div className="bg-blue-50 rounded-lg p-3 mt-auto">
                <p className="text-xs font-medium text-blue-800 mb-1">
                  What to do at home
                </p>
                <p className="text-sm text-blue-700 leading-relaxed">
                  {m.whatToDo}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
