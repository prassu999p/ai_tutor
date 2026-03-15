import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import MisconceptionClassifier from '@/services/MisconceptionClassifier'
import MasteryService from '@/services/MasteryService'
import { ExplanationGenerator } from '@/services/ExplanationGenerator'

export async function POST(request: NextRequest) {
  // 1. Validate input
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Request body must be an object' }, { status: 400 })
  }

  const raw = body as Record<string, unknown>

  const requiredFields = [
    'sessionId', 'studentId', 'skillId', 'conceptId',
    'questionId', 'studentAnswer', 'hintUsed',
  ] as const

  for (const field of requiredFields) {
    if (raw[field] === undefined || raw[field] === null || raw[field] === '') {
      return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
    }
  }

  if (typeof raw.hintUsed !== 'boolean') {
    return NextResponse.json({ error: 'hintUsed must be a boolean' }, { status: 400 })
  }

  const sessionId = raw.sessionId as string
  const studentId = raw.studentId as string
  const skillId = raw.skillId as string
  const conceptId = raw.conceptId as string
  const questionId = raw.questionId as string
  const studentAnswer = raw.studentAnswer as string
  const hintUsed = raw.hintUsed as boolean
  const responseTimeMs = typeof raw.responseTimeMs === 'number' ? raw.responseTimeMs : undefined

  try {
    // 2. Fetch the question for correct answer + skill context
    const questionResult = await supabaseServer
      .from('questions')
      .select('*')
      .eq('id', questionId)
      .single()

    if (questionResult.error || !questionResult.data) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    const questionRow = questionResult.data
    const correctAnswer = questionRow.correct_answer
    const isCorrect = studentAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()

    // 3. Classify misconceptions (rule-based, sync lookup)
    const classifyResult = await MisconceptionClassifier.classify(questionId, studentAnswer, correctAnswer)

    // 4. Fetch skill name for explanation context
    const { data: skillRow } = await supabaseServer
      .from('micro_skills')
      .select('name')
      .eq('id', skillId)
      .single()

    // 5. Process mastery + generate explanation in parallel
    const [masteryResult, explanationResult] = await Promise.allSettled([
      MasteryService.processAnswer({
        sessionId,
        studentId,
        skillId,
        conceptId,
        questionId,
        studentAnswer,
        correctAnswer,
        isCorrect,
        hintUsed,
        misconceptionId: classifyResult.misconceptionId,
        classifierType: classifyResult.classifierType,
        responseTimeMs,
      }),
      ExplanationGenerator.generate({
        skillName: skillRow?.name ?? 'Fractions',
        skillId,
        questionText: questionRow.question_text,
        correctAnswer,
        studentAnswer,
        isCorrect,
        masteryScore: 0.5, // Will be refined after mastery update
        recentMisconceptions: [],
      }),
    ])

    if (masteryResult.status === 'rejected') {
      const msg = masteryResult.reason instanceof Error
        ? masteryResult.reason.message
        : 'Mastery processing failed'
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    const mastery = masteryResult.value

    const explanation = explanationResult.status === 'fulfilled'
      ? explanationResult.value
      : { explanation: questionRow.explanation, source: 'fallback' as const }

    // 6. Fetch full misconception record if one was detected
    let misconceptionDetected: {
      id: string
      name: string
      remediation: string
      remediationVideoUrl: string | null
    } | null = null

    if (classifyResult.misconceptionId) {
      const { data: miscRow } = await supabaseServer
        .from('misconception_types')
        .select('id, name, remediation, remediation_video_url')
        .eq('id', classifyResult.misconceptionId)
        .single()

      if (miscRow) {
        misconceptionDetected = {
          id: miscRow.id,
          name: miscRow.name,
          remediation: miscRow.remediation,
          remediationVideoUrl: miscRow.remediation_video_url,
        }
      }
    }

    return NextResponse.json({
      isCorrect: mastery.isCorrect,
      masteryBefore: mastery.masteryBefore,
      masteryAfter: mastery.masteryAfter,
      masteryDelta: mastery.masteryDelta,
      masteryStatus: mastery.masteryStatus,
      misconceptionDetected,
      classifierType: classifyResult.classifierType,
      explanation: explanation.explanation,
      explanationSource: explanation.source,
      newSkillUnlocked: mastery.newSkillUnlocked,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Processing failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
