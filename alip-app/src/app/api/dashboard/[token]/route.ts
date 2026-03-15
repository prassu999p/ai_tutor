import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { InsightGenerator } from '@/services/InsightGenerator'
import type { ActiveMisconceptionRow, Session } from '@/types/database'

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

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params

  // Look up student by dashboard_token (no auth required — public token-based access)
  const { data: studentData, error: studentError } = await supabaseServer
    .from('students')
    .select('id, name, grade')
    .eq('dashboard_token', token)
    .single()

  if (studentError || !studentData) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Build start of current week (Monday)
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay() + 1)
  startOfWeek.setHours(0, 0, 0, 0)

  // Query all data views + sessions in parallel
  const [conceptMasteryResult, skillsResult, misconceptionsResult, sessionsResult] =
    await Promise.all([
      supabaseServer.from('v_concept_mastery').select('*').eq('student_id', studentData.id),
      supabaseServer.from('v_student_skill_profile').select('*').eq('student_id', studentData.id),
      supabaseServer.from('v_active_misconceptions').select('*').eq('student_id', studentData.id),
      supabaseServer
        .from('sessions')
        .select('*')
        .eq('student_id', studentData.id)
        .gte('started_at', startOfWeek.toISOString())
        .order('started_at', { ascending: true }),
    ])

  if (
    conceptMasteryResult.error ||
    skillsResult.error ||
    misconceptionsResult.error ||
    sessionsResult.error
  ) {
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  const activeMisconceptions: ActiveMisconceptionRow[] = misconceptionsResult.data ?? []
  const weekSessions: Session[] = sessionsResult.data ?? []

  // Generate parent insights for top 2 misconceptions in parallel
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

  // Build sessionsThisWeek — 7 entries for Mon–Sun
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
      sessionsThisWeek.push({ date: dayStart.toISOString(), questionsAnswered: 0, durationMin: 0, hasSession: false })
    } else {
      const questionsAnswered = daySessions.reduce((sum, s) => sum + s.questions_answered, 0)
      const durationMs = daySessions.reduce((sum, s) => {
        const start = new Date(s.started_at).getTime()
        const end = s.ended_at != null ? new Date(s.ended_at).getTime() : now.getTime()
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

  return NextResponse.json({
    student: { name: studentData.name, grade: studentData.grade },
    conceptMastery: conceptMasteryResult.data ?? [],
    skills: skillsResult.data ?? [],
    misconceptions,
    sessionsThisWeek,
    lastUpdated: new Date().toISOString(),
  })
}
