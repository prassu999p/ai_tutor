interface SessionDay {
  date: string
  questionsAnswered: number
  durationMin: number
  hasSession: boolean
}

interface SessionActivityProps {
  sessionsThisWeek: SessionDay[]
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function ActivityDot({ day, maxQuestions }: { day: SessionDay; maxQuestions: number }) {
  if (!day.hasSession) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
          <span className="text-xs text-gray-300">&mdash;</span>
        </div>
      </div>
    )
  }

  // Scale opacity/size based on questions answered relative to max
  const intensity = maxQuestions > 0 ? day.questionsAnswered / maxQuestions : 1
  const size = intensity > 0.6 ? 'w-10 h-10' : intensity > 0.3 ? 'w-9 h-9' : 'w-8 h-8'

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`${size} rounded-full bg-blue-500 flex items-center justify-center transition-all`}
        style={{ opacity: 0.5 + intensity * 0.5 }}
      >
        <span className="text-xs font-bold text-white">
          {day.questionsAnswered}
        </span>
      </div>
    </div>
  )
}

function isToday(dateStr: string): boolean {
  const date = new Date(dateStr)
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

export function SessionActivity({ sessionsThisWeek }: SessionActivityProps) {
  const maxQuestions = Math.max(
    ...sessionsThisWeek.map((d) => d.questionsAnswered),
    1
  )
  const totalQuestions = sessionsThisWeek.reduce(
    (sum, d) => sum + d.questionsAnswered,
    0
  )
  const activeDays = sessionsThisWeek.filter((d) => d.hasSession).length

  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">This Week</h2>
        <p className="text-sm text-gray-400">
          {activeDays} day{activeDays !== 1 ? 's' : ''} active
        </p>
      </div>

      <div className="flex items-end justify-between gap-2 sm:gap-4">
        {sessionsThisWeek.map((day, i) => {
          const today = isToday(day.date)

          return (
            <div
              key={day.date}
              className="flex flex-col items-center gap-2 flex-1"
            >
              <ActivityDot day={day} maxQuestions={maxQuestions} />
              <span
                className={`text-xs font-medium ${
                  today ? 'text-blue-600' : 'text-gray-400'
                }`}
              >
                {DAY_LABELS[i]}
              </span>
              {today && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 -mt-1" />
              )}
            </div>
          )
        })}
      </div>

      {totalQuestions > 0 && (
        <p className="text-xs text-gray-400 text-center mt-4">
          {totalQuestions} questions answered this week
        </p>
      )}
    </section>
  )
}
