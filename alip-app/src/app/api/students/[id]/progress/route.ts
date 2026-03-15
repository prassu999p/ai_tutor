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

        // Log individual query failures for debugging
        if (conceptMasteryRes.error) {
            console.error('Concept mastery query failed:', conceptMasteryRes.error);
        }
        if (skillsRes.error) {
            console.error('Skills query failed:', skillsRes.error);
        }
        if (misconceptionsRes.error) {
            console.error('Misconceptions query failed:', misconceptionsRes.error);
        }

        // If all queries failed, return error
        if (conceptMasteryRes.error && skillsRes.error && misconceptionsRes.error) {
            return NextResponse.json(
                { error: 'Failed to fetch progress data' },
                { status: 500 }
            );
        }

        // Return available data (graceful degradation)
        return NextResponse.json({
            conceptMastery: conceptMasteryRes.data ?? [],
            skills: skillsRes.data ?? [],
            activeMisconceptions: misconceptionsRes.data ?? [],
        });
    } catch (error) {
        console.error('Error fetching progress:', error);
        return NextResponse.json(
            { error: 'Failed to fetch progress' },
            { status: 500 }
        );
    }
}
