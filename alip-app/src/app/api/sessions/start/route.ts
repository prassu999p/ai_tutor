import { NextRequest, NextResponse } from 'next/server'
import SessionService from '@/services/SessionService'

export async function POST(request: NextRequest) {
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
    const result = await SessionService.startSession(studentId)
    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Session creation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
