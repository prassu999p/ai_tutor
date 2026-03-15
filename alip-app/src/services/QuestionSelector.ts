import { supabaseServer } from '@/lib/supabase';
import type { Question } from '@/types';
import { DIFFICULTY_RANGES } from '@/lib/constants';

/**
 * QuestionSelector — selects the next question based on mastery level,
 * avoiding recently seen questions.
 */
export const QuestionSelector = {

    async selectQuestion(
        skillId: string,
        studentId: string,
        sessionId: string,
        masteryScore: number
    ): Promise<Question> {

        // 1. Get all active questions for this skill
        const { data: rawQuestions } = await supabaseServer
            .from('questions')
            .select('*')
            .eq('skill_id', skillId)
            .eq('is_active', true)
            .order('difficulty_weight', { ascending: true });

        const allQuestions = (rawQuestions ?? []) as Question[];

        if (allQuestions.length === 0) {
            throw new Error(`No active questions found for skill ${skillId}`);
        }

        // 2. Get question IDs already seen in this session
        const { data: seenInteractions } = await supabaseServer
            .from('interactions')
            .select('question_id')
            .eq('session_id', sessionId)
            .eq('student_id', studentId)
            .eq('skill_id', skillId);

        const seenQuestionIds = new Set(
            ((seenInteractions ?? []) as Array<{ question_id: string }>).map(
                (i) => i.question_id
            )
        );

        // 3. Filter to unseen questions
        const unseenQuestions = allQuestions.filter(
            (q) => !seenQuestionIds.has(q.id)
        );

        // 4. Determine target difficulty range
        const targetRange = getDifficultyRange(masteryScore);

        // 5. Try unseen questions in the target difficulty range
        const idealQuestions = unseenQuestions.filter(
            (q) =>
                q.difficulty_weight >= targetRange.min &&
                q.difficulty_weight <= targetRange.max
        );

        if (idealQuestions.length > 0) {
            return idealQuestions[Math.floor(Math.random() * idealQuestions.length)];
        }

        // 6. Fallback: any unseen question
        if (unseenQuestions.length > 0) {
            return unseenQuestions[Math.floor(Math.random() * unseenQuestions.length)];
        }

        // 7. All questions seen — return least recently seen
        const { data: leastRecent } = await supabaseServer
            .from('interactions')
            .select('question_id')
            .eq('student_id', studentId)
            .eq('skill_id', skillId)
            .order('created_at', { ascending: true })
            .limit(1);

        const leastRecentArr = (leastRecent ?? []) as Array<{ question_id: string }>;
        if (leastRecentArr.length > 0) {
            const question = allQuestions.find(
                (q) => q.id === leastRecentArr[0].question_id
            );
            if (question) return question;
        }

        // Final fallback
        return allQuestions[0];
    },
};

function getDifficultyRange(masteryScore: number): { min: number; max: number } {
    if (masteryScore < 0.30) return DIFFICULTY_RANGES.weak;
    if (masteryScore < 0.60) return DIFFICULTY_RANGES.developing;
    if (masteryScore < 0.80) return DIFFICULTY_RANGES.advanced;
    return DIFFICULTY_RANGES.mastering;
}
