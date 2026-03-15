/**
 * FeedbackPanel - Session feedback component
 * 
 * Displays feedback after answering a question with four states:
 * - FEEDBACK_CORRECT: Success message, explanation, mastery gain
 * - FEEDBACK_MISCONCEPTION: Error, remediation video prompt
 * - FEEDBACK_INCORRECT: Error with step-by-step explanation
 * - SKILL_MASTERED: Celebration, new skill unlocked
 * 
 * @example
 * <FeedbackPanel
 *   feedbackData={interactionResult}
 *   correctAnswer="3/4"
 *   onContinue={() => handleContinue()}
 * />
 */

'use client';

import type { InteractionResult } from '@/types';
import { MasteryBar } from './MasteryBar';

export type FeedbackType = 'FEEDBACK_CORRECT' | 'FEEDBACK_MISCONCEPTION' | 'FEEDBACK_INCORRECT' | 'SKILL_MASTERED';

export interface FeedbackPanelProps {
    /** Type of feedback to display */
    feedbackType: FeedbackType;
    /** Feedback data from the interaction */
    feedbackData?: InteractionResult;
    /** The correct answer */
    correctAnswer?: string;
    /** Callback to continue to next question/screen */
    onContinue?: () => void;
    /** Callback to watch remediation video */
    onWatchVideo?: () => void;
    /** Callback to try again */
    onTryAgain?: () => void;
    /** Whether buttons are disabled */
    disabled?: boolean;
    /** Additional CSS classes */
    className?: string;
}

/**
 * FeedbackPanel Component
 * 
 * Renders appropriate feedback UI based on the feedback type.
 * Shows mastery changes, explanations, and action buttons.
 */
export function FeedbackPanel({
    feedbackType,
    feedbackData,
    correctAnswer,
    onContinue,
    onWatchVideo,
    onTryAgain,
    disabled = false,
    className = '',
}: FeedbackPanelProps) {
    // Default values if no feedback data provided
    const masteryBefore = feedbackData?.masteryBefore ?? 0;
    const masteryAfter = feedbackData?.masteryAfter ?? 0;
    const masteryDelta = feedbackData?.masteryDelta ?? 0;
    const masteryStatus = feedbackData?.masteryStatus ?? 'weak';
    const explanation = feedbackData?.explanation ?? '';
    const misconception = feedbackData?.misconceptionDetected;

    // Render mastery change section
    const renderMasteryChange = () => (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-600">Mastery Progress</span>
                <span className={`text-sm font-semibold ${masteryDelta >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {masteryDelta >= 0 ? '+' : ''}{Math.round(masteryDelta * 100)}%
                </span>
            </div>
            <div className="flex items-center gap-4">
                <MasteryBar
                    score={masteryBefore * 100}
                    status={masteryBefore >= 0.8 ? 'mastered' : masteryBefore >= 0.5 ? 'developing' : 'weak'}
                    showLabel={false}
                />
                <span className="text-gray-400">→</span>
                <MasteryBar
                    score={masteryAfter * 100}
                    status={masteryStatus}
                    showLabel={true}
                />
            </div>
        </div>
    );

    // Render the appropriate feedback content
    const renderContent = () => {
        switch (feedbackType) {
            case 'FEEDBACK_CORRECT':
                return (
                    <div className="text-center">
                        {/* Success icon */}
                        <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                            <svg
                                className="w-8 h-8 text-green-600"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </div>

                        <h3 className="text-xl font-bold text-green-700 mb-2">
                            Great Job! 🎉
                        </h3>
                        <p className="text-gray-600 mb-4">
                            You got it right!
                        </p>

                        {renderMasteryChange()}

                        {explanation && (
                            <div className="mb-6 p-4 bg-blue-50 rounded-lg text-left">
                                <p className="text-sm font-medium text-blue-800 mb-1">Explanation:</p>
                                <p className="text-sm text-blue-700">{explanation}</p>
                            </div>
                        )}
                    </div>
                );

            case 'FEEDBACK_MISCONCEPTION':
                return (
                    <div className="text-center">
                        {/* Warning icon */}
                        <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center">
                            <svg
                                className="w-8 h-8 text-amber-600"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </div>

                        <h3 className="text-xl font-bold text-amber-700 mb-2">
                            Almost There!
                        </h3>
                        <p className="text-gray-600 mb-4">
                            This is a common misconception.
                        </p>

                        {misconception && (
                            <div className="mb-4 p-4 bg-red-50 rounded-lg text-left">
                                <p className="text-sm font-medium text-red-800 mb-1">
                                    Common Mistake:
                                </p>
                                <p className="text-sm text-red-700">
                                    {misconception.name}
                                </p>
                                <p className="text-sm text-red-600 mt-2">
                                    {misconception.description}
                                </p>
                            </div>
                        )}

                        {explanation && (
                            <div className="mb-6 p-4 bg-blue-50 rounded-lg text-left">
                                <p className="text-sm font-medium text-blue-800 mb-1">Remember:</p>
                                <p className="text-sm text-blue-700">{explanation}</p>
                            </div>
                        )}
                    </div>
                );

            case 'FEEDBACK_INCORRECT':
                return (
                    <div className="text-center">
                        {/* Error icon */}
                        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                            <svg
                                className="w-8 h-8 text-red-600"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </div>

                        <h3 className="text-xl font-bold text-red-700 mb-2">
                            Not Quite
                        </h3>
                        <p className="text-gray-600 mb-4">
                            The correct answer is: <span className="font-bold text-gray-800">{correctAnswer}</span>
                        </p>

                        {renderMasteryChange()}

                        {explanation && (
                            <div className="mb-6 p-4 bg-blue-50 rounded-lg text-left">
                                <p className="text-sm font-medium text-blue-800 mb-1">Explanation:</p>
                                <p className="text-sm text-blue-700">{explanation}</p>
                            </div>
                        )}
                    </div>
                );

            case 'SKILL_MASTERED':
                return (
                    <div className="text-center">
                        {/* Celebration icon */}
                        <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full flex items-center justify-center">
                            <span className="text-4xl">🏆</span>
                        </div>

                        <h3 className="text-2xl font-bold text-yellow-700 mb-2">
                            Skill Mastered! 🎊
                        </h3>
                        <p className="text-gray-600 mb-4">
                            You&apos;ve mastered this skill!
                        </p>

                        {renderMasteryChange()}

                        <div className="mt-6 p-4 bg-green-50 rounded-lg">
                            <p className="text-green-800 font-medium">
                                ✨ Congratulations! You&apos;re making great progress!
                            </p>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    // Render action buttons
    const renderButtons = () => {
        switch (feedbackType) {
            case 'FEEDBACK_CORRECT':
            case 'SKILL_MASTERED':
                return (
                    <button
                        onClick={onContinue}
                        disabled={disabled}
                        className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        Next Question
                    </button>
                );

            case 'FEEDBACK_MISCONCEPTION':
                return (
                    <div className="space-y-3">
                        {onWatchVideo && (
                            <button
                                onClick={onWatchVideo}
                                disabled={disabled}
                                className="w-full px-6 py-3 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                            >
                                Watch Video
                            </button>
                        )}
                        <button
                            onClick={onTryAgain}
                            disabled={disabled}
                            className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                );

            case 'FEEDBACK_INCORRECT':
                return (
                    <button
                        onClick={onContinue}
                        disabled={disabled}
                        className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        Next Question
                    </button>
                );

            default:
                return null;
        }
    };

    return (
        <div className={`w-full max-w-md mx-auto ${className}`}>
            <div className="bg-white rounded-xl shadow-lg p-6">
                {renderContent()}

                <div className="mt-6">
                    {renderButtons()}
                </div>
            </div>
        </div>
    );
}

export default FeedbackPanel;
