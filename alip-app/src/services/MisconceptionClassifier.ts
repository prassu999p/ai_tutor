import { supabaseServer } from '@/lib/supabase';
import type { ClassifierType } from '@/types';

export interface ClassifierResult {
    misconceptionId: string | null;
    confidence: number | null;
    classifierType: ClassifierType;
    reasoning: string | null;
}

interface DistractorMapping {
    answer: string;
    misconception_id: string | null;
}

/**
 * MisconceptionClassifier — rule-based at MVP.
 * Maps student wrong answers to pre-defined distractor → misconception mappings.
 */
export const MisconceptionClassifier = {

    async classify(
        questionId: string,
        studentAnswer: string,
        correctAnswer: string
    ): Promise<ClassifierResult> {
        // If correct, no misconception
        if (studentAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()) {
            return {
                misconceptionId: null,
                confidence: null,
                classifierType: 'rule_based',
                reasoning: null,
            };
        }

        // Fetch question to get distractors
        const { data: question } = await supabaseServer
            .from('questions')
            .select('*')
            .eq('id', questionId)
            .single();

        if (!question) {
            return {
                misconceptionId: null,
                confidence: null,
                classifierType: 'rule_based',
                reasoning: 'Question not found',
            };
        }

        // Parse distractors JSONB array
        const questionData = question as Record<string, unknown>;
        const distractors = questionData.distractors as DistractorMapping[] | null;

        if (!distractors || !Array.isArray(distractors)) {
            return {
                misconceptionId: null,
                confidence: null,
                classifierType: 'rule_based',
                reasoning: 'No distractors defined for this question',
            };
        }

        // Match student answer to a distractor
        const normalizedAnswer = studentAnswer.trim().toLowerCase();
        const match = distractors.find(
            (d) => d.answer.trim().toLowerCase() === normalizedAnswer
        );

        return {
            misconceptionId: match?.misconception_id ?? null,
            confidence: null,
            classifierType: 'rule_based',
            reasoning: match
                ? `Matched distractor: ${match.answer} → ${match.misconception_id}`
                : 'No matching distractor found',
        };
    },
};
