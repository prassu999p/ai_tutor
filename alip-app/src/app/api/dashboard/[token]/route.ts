import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import type {
    ConceptMasteryRow,
    StudentSkillProfileRow,
    ActiveMisconceptionRow,
    Session,
} from '@/types';

/**
 * GET /api/dashboard/[token]
 * Parent dashboard data — no auth required at MVP.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { token: string } }
) {
    try {
        const token = params.token;

        if (!token) {
            return NextResponse.json(
                { error: 'Dashboard token is required' },
                { status: 400 }
            );
        }

        // 1. Find student by dashboard_token
        // Note: dashboard_token column will be added in a later migration
        // For now, treat token as student ID for MVP simplicity
        const { data: rawStudent } = await supabaseServer
            .from('students')
            .select('id, name')
            .eq('id', token)
            .single();

        const student = rawStudent as { id: string; name: string } | null;

        if (!student) {
            return NextResponse.json(
                { error: 'Student not found' },
                { status: 404 }
            );
        }

        // 2. Fetch all dashboard data in parallel
        const [conceptMasteryRes, skillsRes, misconceptionsRes, sessionsRes] =
            await Promise.all([
                supabaseServer
                    .from('v_concept_mastery')
                    .select('*')
                    .eq('student_id', student.id),
                supabaseServer
                    .from('v_student_skill_profile')
                    .select('*')
                    .eq('student_id', student.id),
                supabaseServer
                    .from('v_active_misconceptions')
                    .select('*')
                    .eq('student_id', student.id)
                    .order('occurrence_count', { ascending: false })
                    .limit(2),
                supabaseServer
                    .from('sessions')
                    .select('*')
                    .eq('student_id', student.id)
                    .gte('started_at', getWeekStart())
                    .order('started_at', { ascending: true }),
            ]);

        return NextResponse.json({
            student: { name: student.name },
            conceptMastery: (conceptMasteryRes.data ?? []) as ConceptMasteryRow[],
            skills: (skillsRes.data ?? []) as StudentSkillProfileRow[],
            misconceptions: (misconceptionsRes.data ?? []) as ActiveMisconceptionRow[],
            sessionsThisWeek: (sessionsRes.data ?? []) as Session[],
            lastUpdated: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Error fetching dashboard:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

function getWeekStart(): string {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString();
}
