import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/services/SessionService';

/**
 * POST /api/sessions/[id]/end
 * End an active session and get a summary.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const sessionId = params.id;

        if (!sessionId) {
            return NextResponse.json(
                { error: 'Session ID is required' },
                { status: 400 }
            );
        }

        const summary = await SessionService.endSession(sessionId);

        return NextResponse.json({ summary });
    } catch (error) {
        console.error('Error ending session:', error);
        return NextResponse.json(
            { error: 'Failed to end session' },
            { status: 500 }
        );
    }
}
