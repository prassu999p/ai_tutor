import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/services/SessionService';

/**
 * POST /api/sessions/start
 * Start a new learning session for a student.
 *
 * Request body: { studentId: string }
 * Response: SessionStartResult
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { studentId } = body;

        if (!studentId) {
            return NextResponse.json(
                { error: 'studentId is required' },
                { status: 400 }
            );
        }

        const result = await SessionService.startSession(studentId);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error starting session:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
