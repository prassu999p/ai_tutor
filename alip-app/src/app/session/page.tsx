'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/hooks/useSession';
import {
    VideoPlayer,
    QuestionCard,
    AnswerOptions,
    FeedbackPanel,
    SkillUnlock,
    SessionSummary,
    MasteryBar,
} from '@/components/session';
import type { MasteryStatus, Question } from '@/types';

// Default student ID for MVP
// Note: Must match the UUID in home page and database
const DEFAULT_STUDENT_ID = '00000000-0000-0000-0000-000000000001';

// Extended question type to include options (from API)
interface QuestionWithOptions extends Question {
    options?: string[];
}

export default function SessionPage() {
    const router = useRouter();
    const [selectedAnswer, setSelectedAnswer] = useState<string>('');
    const [sessionStarted, setSessionStarted] = useState(false);

    const {
        state,
        currentQuestion,
        currentSkill,
        introVideoUrl,
        feedbackData,
        sessionSummary,
        isLoading,
        error,
        hintUsed,
        questionsAnswered,
        currentMastery,
        startSession,
        submitAnswer,
        requestHint,
        proceedToNext,
    } = useSession();

    // Cast to extended type for options
    const question = currentQuestion as QuestionWithOptions | null;

    // Start session on mount
    useEffect(() => {
        if (!sessionStarted) {
            setSessionStarted(true);
            startSession(DEFAULT_STUDENT_ID);
        }
    }, [sessionStarted, startSession]);

    // Reset selected answer when the question changes (not on state change,
    // to avoid clearing the answer when transitioning to HINT_SHOWN)
    useEffect(() => {
        setSelectedAnswer('');
    }, [currentQuestion?.id]);

    // For multiple choice, derive options from distractors JSONB + correct answer.
    // If no distractors exist, it's a free-text question.
    const questionOptions = useMemo(() => {
        if (!question) return [];
        const questionData = question as unknown as Record<string, unknown>;
        const distractors = questionData.distractors as Array<{ answer: string }> | null;
        if (!distractors || !Array.isArray(distractors) || distractors.length === 0) return [];
        const distractorAnswers = distractors.map(d => d.answer);
        return [...distractorAnswers, question.correct_answer].sort(() => Math.random() - 0.5);
    }, [question?.id, question?.correct_answer]);

    // Handle answer submission
    const handleSubmitAnswer = async () => {
        if (selectedAnswer.trim()) {
            await submitAnswer(selectedAnswer);
        }
    };

    // Handle continue after feedback
    const handleContinue = async () => {
        await proceedToNext();
    };

    // Handle end of session
    const handleEndSession = async () => {
        router.push('/');
    };

    // Handle going home from session complete
    const handleGoHome = () => {
        router.push('/');
    };

    // Get mastery status for display
    const getMasteryStatus = (): MasteryStatus => {
        if (!currentSkill) return 'weak';
        return feedbackData?.masteryStatus || 'developing';
    };

    // Render loading state
    if (state === 'IDLE' || isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading your session...</p>
                </div>
            </div>
        );
    }

    // Render error state
    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <Link
                        href="/"
                        className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Go Back Home
                    </Link>
                </div>
            </div>
        );
    }

    // Render session complete state
    if (state === 'SESSION_COMPLETE') {
        if (sessionSummary) {
            return (
                <div className="min-h-screen bg-gray-50 py-8 px-4">
                    <SessionSummary
                        summary={sessionSummary}
                        onContinue={handleGoHome}
                        onEnd={handleEndSession}
                    />
                </div>
            );
        }
        // No summary available, just go home
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Session Complete!</h2>
                    <Link
                        href="/"
                        className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Go Back Home
                    </Link>
                </div>
            </div>
        );
    }

    // Render intro video state
    if (state === 'INTRO_VIDEO' && introVideoUrl) {
        return (
            <div className="min-h-screen bg-gray-50 py-8 px-4">
                <VideoPlayer
                    videoUrl={introVideoUrl}
                    title={currentSkill?.name || 'Introduction'}
                    onComplete={handleContinue}
                    onSkip={handleContinue}
                />
            </div>
        );
    }

    // Render question active state
    if (state === 'QUESTION_ACTIVE' || state === 'HINT_SHOWN') {
        if (!question || !currentSkill) {
            return (
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                    <p className="text-gray-600">Loading question...</p>
                </div>
            );
        }


        return (
            <div className="min-h-screen bg-gray-50 py-8 px-4">
                {/* Header with skill and mastery */}
                <div className="max-w-2xl mx-auto mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Current Skill</p>
                            <h1 className="text-lg font-semibold text-gray-800">
                                {currentSkill.name}
                            </h1>
                        </div>
                        <MasteryBar
                            score={feedbackData ? feedbackData.masteryAfter * 100 : currentMastery * 100}
                            status={getMasteryStatus()}
                            showLabel={true}
                        />
                    </div>
                </div>

                {/* Question Card */}
                <QuestionCard
                    question={question}
                    skill={currentSkill}
                    masteryScore={feedbackData ? feedbackData.masteryAfter * 100 : currentMastery * 100}
                    masteryStatus={getMasteryStatus()}
                    hintAvailable={question.hint_text !== null}
                    hintUsed={hintUsed}
                    onHint={requestHint}
                    onCheck={handleSubmitAnswer}
                    onChange={setSelectedAnswer}
                    value={selectedAnswer}
                    disabled={isLoading}
                    questionNumber={questionsAnswered + 1}
                />

                {/* Multiple Choice Options - only rendered if options exist */}
                {questionOptions.length > 0 && (
                    <div className="max-w-2xl mx-auto mt-6">
                        <AnswerOptions
                            options={questionOptions}
                            selectedAnswer={selectedAnswer}
                            onSelect={setSelectedAnswer}
                            disabled={isLoading}
                        />
                    </div>
                )}
            </div>
        );
    }

    // Render feedback states
    if (state === 'FEEDBACK_CORRECT' || state === 'FEEDBACK_MISCONCEPTION' || state === 'FEEDBACK_INCORRECT') {
        const feedbackType = state as 'FEEDBACK_CORRECT' | 'FEEDBACK_MISCONCEPTION' | 'FEEDBACK_INCORRECT';

        return (
            <div className="min-h-screen bg-gray-50 py-8 px-4">
                <FeedbackPanel
                    feedbackType={feedbackType}
                    feedbackData={feedbackData || undefined}
                    correctAnswer={question?.correct_answer}
                    onContinue={handleContinue}
                    onWatchVideo={() => {
                        // For misconception, handle remediation video
                        handleContinue();
                    }}
                    onTryAgain={() => {
                        // Go back to question
                        handleContinue();
                    }}
                    disabled={isLoading}
                />
            </div>
        );
    }

    // Render skill mastered state
    if (state === 'SKILL_MASTERED') {
        return (
            <div className="min-h-screen bg-gray-50 py-8 px-4">
                <SkillUnlock
                    skillName={currentSkill?.name || 'This Skill'}
                    onStart={handleContinue}
                />
            </div>
        );
    }

    // Render evaluating state
    if (state === 'EVALUATING') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Checking your answer...</p>
                </div>
            </div>
        );
    }

    // Fallback - render loading
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );
}
