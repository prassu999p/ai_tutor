import { supabaseServer } from '@/lib/supabase';
import type {
    AnswerEvent,
    MasteryStatus,
    SubmitAnswerPayload,
    InteractionResult,
    MisconceptionType,
    ClassifierType,
} from '@/types';
import { MASTERY_THRESHOLDS } from '@/lib/constants';

/**
 * MasteryService — the only place in the application where mastery state
 * is modified. Wraps PostgreSQL functions defined in 001_initial_schema_v2.sql.
 */
export const MasteryService = {

    /**
     * Process a student answer: classify misconception, update mastery,
     * unlock skills, log interaction, and return result.
     */
    async processAnswer(
        payload: SubmitAnswerPayload,
        isCorrect: boolean,
        misconceptionId: string | null,
        classifierType: ClassifierType,
        confidence: number | null,
        question: { correct_answer: string; explanation: string }
    ): Promise<InteractionResult> {

        // 1. Determine the answer event type
        const eventType = determineAnswerEvent(isCorrect, payload.hintUsed, misconceptionId);

        // 2. Get current mastery score before update
        const { data: skillState } = await supabaseServer
            .from('student_skill_state')
            .select('mastery_score, mastery_status')
            .eq('student_id', payload.studentId)
            .eq('skill_id', payload.skillId)
            .single();

        const masteryBefore = (skillState as { mastery_score: number } | null)?.mastery_score ?? 0;

        // 3. Call update_mastery() RPC — updates score + status in DB
        const { data: newScore } = await supabaseServer.rpc('update_mastery', {
            p_student_id: payload.studentId,
            p_skill_id: payload.skillId,
            p_event: eventType,
        });

        const masteryAfter = typeof newScore === 'number' ? newScore : masteryBefore;
        const masteryDelta = masteryAfter - masteryBefore;

        // 4. Check and unlock skills based on prerequisites
        await supabaseServer.rpc('check_and_unlock_skills', {
            p_student_id: payload.studentId,
        });

        // 5. Log misconception if detected
        let misconceptionData: MisconceptionType | null = null;
        if (misconceptionId) {
            await supabaseServer.rpc('log_misconception', {
                p_student_id: payload.studentId,
                p_misconception_id: misconceptionId,
                p_skill_id: payload.skillId,
            });

            // Fetch misconception details for remediation
            const { data } = await supabaseServer
                .from('misconception_types')
                .select('*')
                .eq('id', misconceptionId)
                .single();

            misconceptionData = data as MisconceptionType | null;
        }

        // 6. Update question stats
        await supabaseServer.rpc('update_question_stats', {
            p_question_id: payload.questionId,
            p_is_correct: isCorrect,
        });

        // 7. Log full interaction
        await supabaseServer.from('interactions').insert({
            session_id: payload.sessionId,
            student_id: payload.studentId,
            skill_id: payload.skillId,
            concept_id: payload.conceptId,
            question_id: payload.questionId,
            student_answer: payload.studentAnswer,
            is_correct: isCorrect,
            hint_used: payload.hintUsed,
            event_type: eventType,
            misconception_id: misconceptionId,
            classifier_type: classifierType,
            misconception_confidence: confidence,
            mastery_before: masteryBefore,
            mastery_after: masteryAfter,
            mastery_delta: masteryDelta,
            response_time_ms: payload.responseTimeMs ?? null,
        });

        // 8. Determine mastery status
        const masteryStatus = getMasteryStatus(masteryAfter);

        // 9. Check if new skill was unlocked
        const nextSkillId = await MasteryService.getNextSkill(payload.studentId, payload.conceptId);
        const newSkillUnlocked = masteryStatus === 'mastered' && nextSkillId !== null;

        return {
            isCorrect,
            masteryBefore,
            masteryAfter,
            masteryDelta,
            masteryStatus,
            misconceptionDetected: misconceptionData,
            classifierType,
            confidence,
            explanation: question.explanation,
            hintAvailable: !payload.hintUsed,
            nextSkillId,
            newSkillUnlocked,
        };
    },

    /**
     * Get the next skill for a student to work on.
     */
    async getNextSkill(studentId: string, conceptId?: string): Promise<string | null> {
        const args: Record<string, string> = { p_student_id: studentId };
        if (conceptId) args.p_concept_id = conceptId;

        const { data, error } = await supabaseServer.rpc('get_next_skill', args);
        if (error) {
            console.error('Error in get_next_skill:', error);
            throw new Error(`MasteryService.getNextSkill error: ${error.message}`);
        }
        return (data as string | null) ?? null;
    },

    /**
     * Initialize skill states for a new student.
     */
    async initStudentSkills(studentId: string, conceptId?: string): Promise<void> {
        const args: Record<string, string> = { p_student_id: studentId };
        if (conceptId) args.p_concept_id = conceptId;

        const { error } = await supabaseServer.rpc('init_student_skills', args);
        if (error) {
            console.error('Error in init_student_skills:', error);
            throw new Error(`MasteryService.initStudentSkills error: ${error.message}`);
        }
    },
};

// ── Helper Functions ────────────────────────────────────────

function determineAnswerEvent(
    isCorrect: boolean,
    hintUsed: boolean,
    misconceptionId: string | null
): AnswerEvent {
    if (isCorrect) {
        return hintUsed ? 'correct_with_hint' : 'correct_no_hint';
    }
    return misconceptionId ? 'incorrect_conceptual' : 'incorrect_repeated';
}

function getMasteryStatus(score: number): MasteryStatus {
    if (score >= MASTERY_THRESHOLDS.mastered) return 'mastered';
    if (score >= MASTERY_THRESHOLDS.developing) return 'developing';
    return 'weak';
}
