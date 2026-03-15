import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

/**
 * GET /api/students/[id]/progress
 * Get student progress data: concept mastery, skill profile, active misconceptions.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const studentId = params.id;

        if (!studentId) {
            return NextResponse.json(
                { error: 'Student ID is required' },
                { status: 400 }
            );
        }

        // Fetch all three views in parallel
        const [conceptMasteryRes, skillsRes, misconceptionsRes] = await Promise.all([
            supabaseServer
                .from('v_concept_mastery')
                .select('*')
                .eq('student_id', studentId),
            supabaseServer
                .from('v_student_skill_profile')
                .select('*')
                .eq('student_id', studentId)
                .order('mastery_score', { ascending: false }),
            supabaseServer
                .from('v_active_misconceptions')
                .select('*')
                .eq('student_id', studentId)
                .order('occurrence_count', { ascending: false }),
        ]);

        return NextResponse.json({
            conceptMastery: conceptMasteryRes.data ?? [],
            skills: skillsRes.data ?? [],
            activeMisconceptions: misconceptionsRes.data ?? [],
        });
    } catch (error) {
        console.error('Error fetching progress:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
