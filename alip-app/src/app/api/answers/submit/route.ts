import { NextRequest, NextResponse } from 'next/server';
import { MisconceptionClassifier } from '@/services/MisconceptionClassifier';
import { MasteryService } from '@/services/MasteryService';
import { SessionService } from '@/services/SessionService';
import { supabaseServer } from '@/lib/supabase';
import type { SubmitAnswerPayload, Question } from '@/types';

/**
 * POST /api/answers/submit
 * Submit a student answer for evaluation.
 */
export async function POST(request: NextRequest) {
    try {
        const body: SubmitAnswerPayload = await request.json();

        const {
            sessionId,
            studentId,
            skillId,
            conceptId,
            questionId,
            studentAnswer,
        } = body;

        // Validate required fields
        if (!sessionId || !studentId || !skillId || !conceptId || !questionId || !studentAnswer) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // 1. Fetch the question
        const { data: rawQuestion } = await supabaseServer
            .from('questions')
            .select('*')
            .eq('id', questionId)
            .single();

        const question = rawQuestion as Question | null;
        if (!question) {
            return NextResponse.json(
                { error: `Question ${questionId} not found` },
                { status: 404 }
            );
        }

        // 2. Check correctness
        const isCorrect =
            studentAnswer.trim().toLowerCase() ===
            question.correct_answer.trim().toLowerCase();

        // 3. Classify misconception
        const classification = await MisconceptionClassifier.classify(
            questionId,
            studentAnswer,
            question.correct_answer
        );

        // 4. Process the answer
        const result = await MasteryService.processAnswer(
            body,
            isCorrect,
            classification.misconceptionId,
            classification.classifierType,
            classification.confidence,
            { correct_answer: question.correct_answer, explanation: question.explanation }
        );

        // 5. Increment session question count
        await SessionService.incrementQuestionCount(sessionId);

        // 6. Update skills practiced
        await SessionService.updateSkillsPracticed(sessionId, skillId);

        // 7. Get next question
        let nextQuestion = null;
        if (result.masteryStatus !== 'mastered') {
            nextQuestion = await SessionService.getNextQuestion(
                sessionId,
                result.nextSkillId ?? skillId,
                studentId
            );
        }

        // 8. Get remediation video URL if misconception detected
        let remediationVideoUrl: string | null = null;
        if (result.misconceptionDetected) {
            const misconceptionRecord = result.misconceptionDetected as unknown as Record<string, unknown>;
            remediationVideoUrl = (misconceptionRecord.remediation_video_url as string | null) ?? null;
        }

        return NextResponse.json({
            ...result,
            remediationVideoUrl,
            nextQuestion,
        });
    } catch (error) {
        console.error('Error submitting answer:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
