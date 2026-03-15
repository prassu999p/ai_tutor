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

// Module-level cache: questionId → DistractorMapping[]
// Per architecture spec: "Cache the mapping in memory at startup — do not re-query per request."
let distractorCache: Map<string, DistractorMapping[]> | null = null;

/**
 * MisconceptionClassifier — rule-based at MVP.
 * Maps student wrong answers to pre-defined distractor → misconception mappings.
 * Uses an in-memory cache that loads on first classify() call.
 */
export const MisconceptionClassifier = {

    /**
     * Initialize the distractor cache by loading all questions.distractors from DB.
     * Called lazily on first classify() or can be called at app startup.
     */
    async initialize(): Promise<void> {
        const { data, error } = await supabaseServer
            .from('questions')
            .select('id, distractors')
            .eq('is_active', true);

        if (error) {
            console.error('Failed to initialize MisconceptionClassifier cache:', error);
            distractorCache = new Map();
            return;
        }

        distractorCache = new Map();
        for (const q of (data ?? [])) {
            const qData = q as Record<string, unknown>;
            const distractors = qData.distractors as DistractorMapping[] | null;
            if (distractors && Array.isArray(distractors)) {
                distractorCache.set(qData.id as string, distractors);
            }
        }
    },

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

        // Lazy-init cache on first call
        if (!distractorCache) {
            await this.initialize();
        }

        // Look up distractors from cache
        const distractors = distractorCache!.get(questionId);

        if (!distractors || distractors.length === 0) {
            return {
                misconceptionId: null,
                confidence: null,
                classifierType: 'rule_based',
                reasoning: 'No distractors in cache for this question',
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
