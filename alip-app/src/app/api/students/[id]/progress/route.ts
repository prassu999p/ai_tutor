import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: studentId } = params

  if (!studentId) {
    return NextResponse.json({ error: 'Missing studentId' }, { status: 400 })
  }

  // Verify student exists
  const { data: student, error: studentError } = await supabaseServer
    .from('students')
    .select('id')
    .eq('id', studentId)
    .single()

  if (studentError || !student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  // Query all views in parallel
  const [conceptMasteryResult, skillsResult, misconceptionsResult] = await Promise.all([
    supabaseServer.from('v_concept_mastery').select('*').eq('student_id', studentId),
    supabaseServer.from('v_student_skill_profile').select('*').eq('student_id', studentId),
    supabaseServer.from('v_active_misconceptions').select('*').eq('student_id', studentId),
  ])

  if (conceptMasteryResult.error || skillsResult.error || misconceptionsResult.error) {
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  return NextResponse.json({
    conceptMastery: conceptMasteryResult.data ?? [],
    skills: skillsResult.data ?? [],
    activeMisconceptions: misconceptionsResult.data ?? [],
  })
}
