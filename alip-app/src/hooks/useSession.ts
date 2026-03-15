/**
 * useSession.ts — Session State Machine Hook
 * 
 * Manages the 10-state learning session flow:
 * IDLE → INTRO_VIDEO → QUESTION_ACTIVE ↔ HINT_SHOWN → EVALUATING
 *                                                         ↓
 *   ┌─────────────────────────────────────────────────────┘
 *   ↓
 *   ├─→ FEEDBACK_CORRECT ──→ SKILL_MASTERED ──→ QUESTION_ACTIVE
 *   ├─→ FEEDBACK_MISCONCEPTION ──→ INTRO_VIDEO (remediation)
 *   └─→ FEEDBACK_INCORRECT ──→ QUESTION_ACTIVE
 * 
 * SESSION_COMPLETE (endSession from any state)
 */

import { useState, useCallback, useRef } from 'react';
import type { Question, MicroSkill, InteractionResult, SubmitAnswerPayload } from '@/types';
import { MASTERY_THRESHOLDS, SESSION_CONSTANTS } from '@/lib/constants';

// ── State Types ─────────────────────────────────────────────────

export type SessionState =
    | 'IDLE'
    | 'INTRO_VIDEO'
    | 'QUESTION_ACTIVE'
    | 'HINT_SHOWN'
    | 'EVALUATING'
    | 'FEEDBACK_CORRECT'
    | 'FEEDBACK_MISCONCEPTION'
    | 'FEEDBACK_INCORRECT'
    | 'SKILL_MASTERED'
    | 'SESSION_COMPLETE';

// Re-export SessionSummary from SessionService
export interface SessionSummary {
    sessionId: string;
    questionsAnswered: number;
    skillsImproved: Array<{
        skillName: string;
        before: number;
        after: number;
    }>;
    skillsPracticed: number;
    skillsMastered: string[];
    sessionDurationMin: number;
}

// ── API Response Types ─────────────────────────────────────────

interface SessionStartResponse {
    sessionId: string;
    skillId: string;
    skill: MicroSkill;
    introVideoUrl: string | null;
    firstQuestion: Question;
    currentMastery: number;
}

interface AnswerSubmitResponse extends InteractionResult {
    remediationVideoUrl: string | null;
    nextQuestion: Question | null;
}

// ── Hook Return Type ───────────────────────────────────────────

export interface UseSessionReturn {
    // State
    state: SessionState;
    currentQuestion: Question | null;
    currentSkill: MicroSkill | null;
    introVideoUrl: string | null;
    remediationVideoUrl: string | null;
    feedbackData: InteractionResult | null;
    sessionSummary: SessionSummary | null;
    questionsAnswered: number;
    currentMastery: number;

    // Computed
    isLoading: boolean;
    error: string | null;
    hintUsed: boolean;
    sessionId: string | null;
    skillId: string | null;
    conceptId: string | null;

    // Actions
    startSession: (studentId: string) => Promise<void>;
    submitAnswer: (answer: string) => Promise<void>;
    requestHint: () => void;
    proceedToNext: () => Promise<void>;
    endSession: () => Promise<void>;
}

// ── Constants ─────────────────────────────────────────────────

const EVALUATING_TIMEOUT_MS = 300;

// ── Hook Implementation ────────────────────────────────────────

export function useSession(): UseSessionReturn {
    // ── State ──────────────────────────────────────────────────
    const [state, setState] = useState<SessionState>('IDLE');
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [currentSkill, setCurrentSkill] = useState<MicroSkill | null>(null);
    const [introVideoUrl, setIntroVideoUrl] = useState<string | null>(null);
    const [remediationVideoUrl, setRemediationVideoUrl] = useState<string | null>(null);
    const [feedbackData, setFeedbackData] = useState<InteractionResult | null>(null);
    const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hintUsed, setHintUsed] = useState(false);
    const [questionsAnswered, setQuestionsAnswered] = useState(0);
    const [currentMastery, setCurrentMastery] = useState(0);

    // Session context refs (to avoid stale closures)
    const sessionIdRef = useRef<string | null>(null);
    const skillIdRef = useRef<string | null>(null);
    const conceptIdRef = useRef<string | null>(null);
    const studentIdRef = useRef<string | null>(null);
    const currentMasteryRef = useRef<number>(0);
    const isNewSkillRef = useRef<boolean>(false);

    // Evaluating timeout ref
    const evaluatingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // ── Helpers ────────────────────────────────────────────────

    const clearEvaluatingTimeout = useCallback(() => {
        if (evaluatingTimeoutRef.current) {
            clearTimeout(evaluatingTimeoutRef.current);
            evaluatingTimeoutRef.current = null;
        }
    }, []);

    const resetPerQuestion = useCallback(() => {
        setHintUsed(false);
        setRemediationVideoUrl(null);
        setFeedbackData(null);
    }, []);

    // ── Actions ────────────────────────────────────────────────

    /**
     * Start a new learning session
     * IDLE → INTRO_VIDEO (isNewSkill = true) or QUESTION_ACTIVE (isNewSkill = false)
     */
    const startSession = useCallback(async (studentId: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/sessions/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentId }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error ?? 'Failed to start session');
            }

            const data: SessionStartResponse = await response.json();

            // Store refs for later use
            sessionIdRef.current = data.sessionId;
            skillIdRef.current = data.skillId;
            studentIdRef.current = studentId;

            // Get concept ID from the skill
            conceptIdRef.current = data.skill.concept_id;

            // Determine if this is a new skill (no prior practice)
            // isNewSkill is true when introVideoUrl is present
            isNewSkillRef.current = data.introVideoUrl !== null;
            
            // Set initial state from response
            setCurrentMastery(data.currentMastery);
            currentMasteryRef.current = data.currentMastery;
            setQuestionsAnswered(0);

            // Update state
            setCurrentSkill(data.skill);
            setCurrentQuestion(data.firstQuestion);
            setIntroVideoUrl(data.introVideoUrl);

            // State transition: IDLE → INTRO_VIDEO (new skill) or → QUESTION_ACTIVE
            if (data.introVideoUrl) {
                setState('INTRO_VIDEO');
            } else {
                setState('QUESTION_ACTIVE');
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setState('IDLE');
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Request a hint for the current question
     * QUESTION_ACTIVE → HINT_SHOWN
     */
    const requestHint = useCallback(() => {
        if (state !== 'QUESTION_ACTIVE') {
            console.warn(`requestHint called in invalid state: ${state}`);
            return;
        }

        setHintUsed(true);
        setState('HINT_SHOWN');
    }, [state]);

    /**
     * Submit an answer for evaluation
     * QUESTION_ACTIVE/HINT_SHOWN → EVALUATING → FEEDBACK_* (based on result)
     */
    const submitAnswer = useCallback(async (answer: string) => {
        if (state !== 'QUESTION_ACTIVE' && state !== 'HINT_SHOWN') {
            console.warn(`submitAnswer called in invalid state: ${state}`);
            return;
        }

        const sessionId = sessionIdRef.current;
        const skillId = skillIdRef.current;
        const conceptId = conceptIdRef.current;
        const studentId = studentIdRef.current;
        const question = currentQuestion;

        if (!sessionId || !skillId || !conceptId || !studentId || !question) {
            setError('Missing session context');
            return;
        }

        setIsLoading(true);
        setError(null);

        // Transition to EVALUATING
        setState('EVALUATING');

        // Set timeout to ensure EVALUATING doesn't last too long
        evaluatingTimeoutRef.current = setTimeout(() => {
            console.warn('EVALUATING state exceeded timeout, proceeding with caution');
        }, EVALUATING_TIMEOUT_MS);

        try {
            const payload: SubmitAnswerPayload = {
                sessionId,
                studentId,
                skillId,
                conceptId,
                questionId: question.id,
                studentAnswer: answer,
                hintUsed,
            };

            const response = await fetch('/api/answers/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error ?? 'Failed to submit answer');
            }

            const data: AnswerSubmitResponse = await response.json();

            // Clear evaluating timeout
            clearEvaluatingTimeout();

            // Store feedback data
            setFeedbackData(data);
            setRemediationVideoUrl(data.remediationVideoUrl);
            setCurrentMastery(data.masteryAfter);
            currentMasteryRef.current = data.masteryAfter;
            setQuestionsAnswered(prev => prev + 1);

            // State transition based on result
            if (data.isCorrect) {
                if (data.masteryAfter >= MASTERY_THRESHOLDS.mastered) {
                    setState('SKILL_MASTERED');
                } else {
                    setState('FEEDBACK_CORRECT');
                }
            } else if (data.misconceptionDetected !== null) {
                setState('FEEDBACK_MISCONCEPTION');
            } else {
                setState('FEEDBACK_INCORRECT');
            }

        } catch (err) {
            clearEvaluatingTimeout();
            setError(err instanceof Error ? err.message : 'Failed to submit answer');
            // Stay in EVALUATING or go back to QUESTION_ACTIVE
            setState('QUESTION_ACTIVE');
        } finally {
            setIsLoading(false);
        }
    }, [state, currentQuestion, hintUsed, clearEvaluatingTimeout]);

    /**
     * Proceed to next step in the session
     * Handles transitions from:
     * - INTRO_VIDEO → QUESTION_ACTIVE
     * - FEEDBACK_CORRECT → QUESTION_ACTIVE (next question)
     * - FEEDBACK_INCORRECT → QUESTION_ACTIVE (next question)
     * - FEEDBACK_MISCONCEPTION → INTRO_VIDEO (remediation)
     * - SKILL_MASTERED → QUESTION_ACTIVE (next skill)
     */
    const proceedToNext = useCallback(async () => {
        if (state !== 'INTRO_VIDEO' &&
            state !== 'FEEDBACK_CORRECT' &&
            state !== 'FEEDBACK_MISCONCEPTION' &&
            state !== 'FEEDBACK_INCORRECT' &&
            state !== 'SKILL_MASTERED') {
            console.warn(`proceedToNext called in invalid state: ${state}`);
            return;
        }

        const sessionId = sessionIdRef.current;
        const skillId = skillIdRef.current;
        const studentId = studentIdRef.current;

        if (!sessionId || !skillId || !studentId) {
            setError('Missing session context');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Handle INTRO_VIDEO → QUESTION_ACTIVE (first question already preselected)
            if (state === 'INTRO_VIDEO') {
                resetPerQuestion();
                setState('QUESTION_ACTIVE');
                setIsLoading(false);
                return;
            }

            // Handle FEEDBACK_MISCONCEPTION → INTRO_VIDEO (remediation)
            if (state === 'FEEDBACK_MISCONCEPTION') {
                if (remediationVideoUrl) {
                    // Show remediation video
                    setIntroVideoUrl(remediationVideoUrl);
                    setState('INTRO_VIDEO');
                    resetPerQuestion();
                    setIsLoading(false);
                    return;
                }
                // Fall through if no remediation video
            }

            // For SKILL_MASTERED, we need to get the next skill
            if (state === 'SKILL_MASTERED') {
                // Fetch next question for current skill or new skill
                // The API returns nextQuestion in submitAnswer response
                // But we need to handle the case where mastery was just reached

                // Get the next question from the session service
                const url = `/api/sessions/${sessionId}/next-question?skillId=${encodeURIComponent(skillId)}&studentId=${encodeURIComponent(studentId)}`;
                const response = await fetch(url, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.question) {
                        // Check if we moved to a new skill
                        if (data.newSkill) {
                            // New skill unlocked - get its details
                            setCurrentSkill(data.skill);
                            skillIdRef.current = data.skill.id;
                            conceptIdRef.current = data.skill.concept_id;
                            isNewSkillRef.current = true;

                            // Check if there's an intro video for the new skill
                            const skillRecord = data.skill as unknown as Record<string, unknown>;
                            const newIntroVideoUrl = skillRecord.intro_video_url as string | null ?? null;

                            if (newIntroVideoUrl) {
                                setIntroVideoUrl(newIntroVideoUrl);
                                setCurrentQuestion(data.question);
                                resetPerQuestion();
                                setState('INTRO_VIDEO');
                                setIsLoading(false);
                                return;
                            }
                        }

                        setCurrentQuestion(data.question);
                        resetPerQuestion();
                        setState('QUESTION_ACTIVE');
                        setIsLoading(false);
                        return;
                    }
                }

                // If no more questions, end session
                await endSession();
                return;
            }

            // For FEEDBACK_CORRECT and FEEDBACK_INCORRECT, we need next question
            // Check if we have reached the maximum allowed questions for this session
            if (questionsAnswered >= SESSION_CONSTANTS.MAX_QUESTIONS_PER_SESSION) {
                await endSession();
                return;
            }

            // The feedbackData should have nextQuestion if available
            const feedback = feedbackData;

            // API returns nextQuestion in addition to InteractionResult fields
            // Using type assertion with proper null check
            const nextQuestion = (feedback as unknown as { nextQuestion?: Question | null })?.nextQuestion ?? null;

            if (nextQuestion) {
                setCurrentQuestion(nextQuestion);
                resetPerQuestion();
                setState('QUESTION_ACTIVE');
            } else {
                // No more questions for this skill, try to end or continue
                // Check mastery - if not mastered, might need more practice
                if (currentMasteryRef.current >= MASTERY_THRESHOLDS.mastered) {
                    // Already mastered, try next skill
                    await endSession();
                } else {
                    // Try to get next question
                    const url = `/api/sessions/${sessionId}/next-question?skillId=${encodeURIComponent(skillId)}&studentId=${encodeURIComponent(studentId)}`;
                    const response = await fetch(url, {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' },
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.question) {
                            setCurrentQuestion(data.question);
                            resetPerQuestion();
                            setState('QUESTION_ACTIVE');
                        } else {
                            // No more questions, end session
                            await endSession();
                        }
                    } else {
                        await endSession();
                    }
                }
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to proceed');
            // Try to recover by ending session
            await endSession();
        } finally {
            setIsLoading(false);
        }
    }, [state, feedbackData, remediationVideoUrl, resetPerQuestion]);

    /**
     * End the current session
     * Any state → SESSION_COMPLETE
     */
    const endSession = useCallback(async () => {
        const sessionId = sessionIdRef.current;

        if (!sessionId) {
            // No active session, just reset
            setState('SESSION_COMPLETE');
            setSessionSummary(null);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/sessions/${sessionId}/end`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error ?? 'Failed to end session');
            }

            const data = await response.json();

            setSessionSummary(data.summary);
            setState('SESSION_COMPLETE');
            setQuestionsAnswered(0);
            setCurrentMastery(0);

            // Clear refs
            sessionIdRef.current = null;
            skillIdRef.current = null;
            conceptIdRef.current = null;
            studentIdRef.current = null;
            currentMasteryRef.current = 0;

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to end session');
            setState('SESSION_COMPLETE');
        } finally {
            setIsLoading(false);
            clearEvaluatingTimeout();
        }
    }, [clearEvaluatingTimeout]);

    // ── Return ─────────────────────────────────────────────────

    return {
        // State
        state,
        currentQuestion,
        currentSkill,
        introVideoUrl,
        remediationVideoUrl,
        feedbackData,
        sessionSummary,
        questionsAnswered,
        currentMastery,

        // Computed
        isLoading,
        error,
        hintUsed,
        sessionId: sessionIdRef.current,
        skillId: skillIdRef.current,
        conceptId: conceptIdRef.current,

        // Actions
        startSession,
        submitAnswer,
        requestHint,
        proceedToNext,
        endSession,
    };
}

// ── Valid State Transitions (for debugging) ───────────────────

/**
 * Validates if a state transition is allowed
 * This is a utility for debugging/testing
 */
export function isValidTransition(from: SessionState, to: SessionState): boolean {
    const validTransitions: Record<SessionState, SessionState[]> = {
        'IDLE': ['INTRO_VIDEO', 'QUESTION_ACTIVE', 'SESSION_COMPLETE'],
        'INTRO_VIDEO': ['QUESTION_ACTIVE', 'SESSION_COMPLETE'],
        'QUESTION_ACTIVE': ['HINT_SHOWN', 'EVALUATING', 'SESSION_COMPLETE'],
        'HINT_SHOWN': ['EVALUATING', 'SESSION_COMPLETE'],
        'EVALUATING': [
            'FEEDBACK_CORRECT',
            'FEEDBACK_MISCONCEPTION',
            'FEEDBACK_INCORRECT',
            'SKILL_MASTERED',
            'SESSION_COMPLETE'
        ],
        'FEEDBACK_CORRECT': ['QUESTION_ACTIVE', 'SESSION_COMPLETE'],
        'FEEDBACK_MISCONCEPTION': ['INTRO_VIDEO', 'QUESTION_ACTIVE', 'SESSION_COMPLETE'],
        'FEEDBACK_INCORRECT': ['QUESTION_ACTIVE', 'SESSION_COMPLETE'],
        'SKILL_MASTERED': ['QUESTION_ACTIVE', 'SESSION_COMPLETE'],
        'SESSION_COMPLETE': ['IDLE'],
    };

    return validTransitions[from]?.includes(to) ?? false;
}
