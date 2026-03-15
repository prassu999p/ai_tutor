import { supabaseServer } from '@/lib/supabase'
import { InsightGenerator } from '@/services/InsightGenerator'
import type {
  ActiveMisconceptionRow,
  ConceptMasteryRow,
  Session,
  StudentSkillProfileRow,
} from '@/types/database'

import { LearningSummary } from './components/LearningSummary'
import { ConceptProgress } from './components/ConceptProgress'
import { MisconceptionInsights } from './components/MisconceptionInsights'
import { SessionActivity } from './components/SessionActivity'

interface DashboardPageProps {
  params: { token: string }
}

interface MisconceptionItem {
  id: string
  name: string
  severity: string
  occurrenceCount: number
  whatToDo: string
  whatToDoSource: 'llm' | 'fallback'
}

interface SessionDay {
  date: string
  questionsAnswered: number
  durationMin: number
  hasSession: boolean
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { token } = params

  // Look up student by dashboard_token
  const { data: studentData, error: studentError } = await supabaseServer
    .from('students')
    .select('id, name, grade')
    .eq('dashboard_token', token)
    .single<{ id: string; name: string; grade: string | null }>()

  if (studentError || !studentData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Dashboard not found
          </h1>
          <p className="text-sm text-gray-500">
            This link may be invalid or expired. Please check the URL and try
            again.
          </p>
        </div>
      </div>
    )
  }

  // Build start of current week (Monday)
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay() + 1)
  startOfWeek.setHours(0, 0, 0, 0)

  // Query all data in parallel
  const [conceptMasteryResult, skillsResult, misconceptionsResult, sessionsResult] =
    await Promise.all([
      supabaseServer
        .from('v_concept_mastery')
        .select('*')
        .eq('student_id', studentData.id),
      supabaseServer
        .from('v_student_skill_profile')
        .select('*')
        .eq('student_id', studentData.id),
      supabaseServer
        .from('v_active_misconceptions')
        .select('*')
        .eq('student_id', studentData.id),
      supabaseServer
        .from('sessions')
        .select('*')
        .eq('student_id', studentData.id)
        .gte('started_at', startOfWeek.toISOString())
        .order('started_at', { ascending: true }),
    ])

  // Handle query errors gracefully
  if (
    conceptMasteryResult.error ||
    skillsResult.error ||
    misconceptionsResult.error ||
    sessionsResult.error
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Something went wrong
          </h1>
          <p className="text-sm text-gray-500">
            We could not load the dashboard data. Please try again later.
          </p>
        </div>
      </div>
    )
  }

  const conceptMastery: ConceptMasteryRow[] = conceptMasteryResult.data ?? []
  const skills: StudentSkillProfileRow[] = skillsResult.data ?? []
  const activeMisconceptions: ActiveMisconceptionRow[] =
    misconceptionsResult.data ?? []
  const weekSessions: Session[] = sessionsResult.data ?? []

  // Generate parent insights for top 2 misconceptions
  const topMisconceptions = activeMisconceptions.slice(0, 2)
  const insightResults = await Promise.all(
    topMisconceptions.map((m) =>
      InsightGenerator.generateParentInsight({
        studentName: studentData.name,
        misconceptionId: m.misconception_id,
        misconceptionPlainName: m.misconception_name,
        occurrenceCount: m.occurrence_count,
        exampleWrongAnswer: 'N/A',
        exampleQuestion: 'N/A',
        remediationStrategy: m.remediation,
      })
    )
  )

  const misconceptions: MisconceptionItem[] = topMisconceptions.map((m, i) => ({
    id: m.misconception_id,
    name: m.misconception_name,
    severity: m.severity,
    occurrenceCount: m.occurrence_count,
    whatToDo: insightResults[i].whatToDo,
    whatToDoSource: insightResults[i].source,
  }))

  // Build 7-day week view (Mon-Sun)
  const sessionsThisWeek: SessionDay[] = []
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek)
    day.setDate(startOfWeek.getDate() + i)
    const dayStart = new Date(day)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(day)
    dayEnd.setHours(23, 59, 59, 999)

    const daySessions = weekSessions.filter((s) => {
      const sessionDate = new Date(s.started_at)
      return sessionDate >= dayStart && sessionDate <= dayEnd
    })

    if (daySessions.length === 0) {
      sessionsThisWeek.push({
        date: dayStart.toISOString(),
        questionsAnswered: 0,
        durationMin: 0,
        hasSession: false,
      })
    } else {
      const questionsAnswered = daySessions.reduce(
        (sum, s) => sum + s.questions_answered,
        0
      )
      const durationMs = daySessions.reduce((sum, s) => {
        const start = new Date(s.started_at).getTime()
        const end =
          s.ended_at != null ? new Date(s.ended_at).getTime() : now.getTime()
        return sum + (end - start)
      }, 0)
      sessionsThisWeek.push({
        date: dayStart.toISOString(),
        questionsAnswered,
        durationMin: Math.round(durationMs / 60000),
        hasSession: true,
      })
    }
  }

  // Compute totals for summary
  const totalSessionsThisWeek = weekSessions.length
  const totalQuestionsAnswered = weekSessions.reduce(
    (sum, s) => sum + s.questions_answered,
    0
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-6">
        <LearningSummary
          studentName={studentData.name}
          grade={studentData.grade}
          sessionsThisWeek={totalSessionsThisWeek}
          totalQuestionsAnswered={totalQuestionsAnswered}
          conceptMastery={conceptMastery}
        />

        <SessionActivity sessionsThisWeek={sessionsThisWeek} />

        <ConceptProgress skills={skills} />

        <MisconceptionInsights
          misconceptions={misconceptions}
          studentName={studentData.name}
        />

        <footer className="text-center pb-8">
          <p className="text-xs text-gray-300">
            ALIP Parent Dashboard &middot; Updated{' '}
            {new Date().toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        </footer>
      </div>
    </div>
  )
}
