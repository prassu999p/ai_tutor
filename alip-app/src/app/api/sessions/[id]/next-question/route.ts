import { NextRequest, NextResponse } from 'next/server'
import SessionService from '@/services/SessionService'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id
  void sessionId // session context available if needed
  const { searchParams } = request.nextUrl
  const studentId = searchParams.get('studentId')
  const skillId = searchParams.get('skillId')
  const masteryScoreRaw = searchParams.get('masteryScore')

  if (!studentId || !skillId || masteryScoreRaw === null) {
    return NextResponse.json(
      { error: 'Missing required query params: studentId, skillId, masteryScore' },
      { status: 400 }
    )
  }

  const masteryScore = parseFloat(masteryScoreRaw)
  if (isNaN(masteryScore)) {
    return NextResponse.json({ error: 'masteryScore must be a number' }, { status: 400 })
  }

  try {
    const question = await SessionService.getNextQuestion(skillId, studentId, sessionId, masteryScore)
    return NextResponse.json({ question, skillId }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch next question'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
