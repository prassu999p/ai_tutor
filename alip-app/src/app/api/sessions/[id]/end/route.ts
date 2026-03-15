import { NextRequest, NextResponse } from 'next/server'
import SessionService from '@/services/SessionService'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: sessionId } = params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('studentId' in body) ||
    typeof (body as Record<string, unknown>).studentId !== 'string'
  ) {
    return NextResponse.json({ error: 'Missing required field: studentId' }, { status: 400 })
  }

  const { studentId } = body as { studentId: string }

  try {
    const summary = await SessionService.endSession(sessionId, studentId)
    return NextResponse.json({ summary }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to end session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
