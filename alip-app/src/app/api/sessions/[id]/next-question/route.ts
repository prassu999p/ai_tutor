import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/services/SessionService';

/**
 * GET /api/sessions/[id]/next-question?skillId=X&studentId=Y
 * Get the next question for an active session.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const sessionId = params.id;
        const { searchParams } = new URL(request.url);
        const skillId = searchParams.get('skillId');
        const studentId = searchParams.get('studentId');

        if (!sessionId || !skillId || !studentId) {
            return NextResponse.json(
                { error: 'sessionId, skillId, and studentId are required' },
                { status: 400 }
            );
        }

        const question = await SessionService.getNextQuestion(
            sessionId,
            skillId,
            studentId
        );

        return NextResponse.json({ question, skillId });
    } catch (error) {
        console.error('Error getting next question:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
