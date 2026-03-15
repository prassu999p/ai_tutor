/**
 * QuestionCard - Session question display component
 * 
 * Renders Zone 1 (context), Zone 2 (visual), and Zone 3 (question) for the session screen.
 * Supports different visual types: fraction_bar, number_line, step_reference, none.
 * 
 * @example
 * <QuestionCard
 *   question={questionData}
 *   skill={skillData}
 *   visualType="fraction_bar"
 *   visualParams={{ numerator: 3, denominator: 5 }}
 * />
 */

'use client';

import type { Question, MicroSkill, MasteryStatus } from '@/types';
import { FractionBar } from '../FractionBar';
import { MasteryBar } from './MasteryBar';
import { SESSION_CONSTANTS } from '@/lib/constants';

export interface QuestionCardProps {
    /** Question data from the session */
    question: Question;
    /** Current skill being practiced */
    skill: MicroSkill;
    /** Type of visual to display */
    visualType?: 'fraction_bar' | 'number_line' | 'step_reference' | 'none';
    /** Parameters for the visual component */
    visualParams?: Record<string, unknown>;
    /** Current mastery score */
    masteryScore?: number;
    /** Current mastery status */
    masteryStatus?: MasteryStatus;
    /** Question number in the session */
    questionNumber?: number;
    /** Total questions in the session */
    totalQuestions?: number;
    /** Callback when hint is requested */
    onHint?: () => void;
    /** Whether hint is available */
    hintAvailable?: boolean;
    /** Whether hint has been used */
    hintUsed?: boolean;
    /** Callback when answer is submitted/checked */
    onCheck?: () => void;
    /** Callback when value changes */
    onChange?: (value: string) => void;
    /** Currently selected/typed answer */
    value?: string;
    /** Whether input is disabled */
    disabled?: boolean;
}

/**
 * Parse visual parameters for FractionBar
 */
function parseFractionBarParams(params: Record<string, unknown>) {
    return {
        numerator: Number(params.numerator) || 0,
        denominator: Number(params.denominator) || 1,
        highlighted: Array.isArray(params.highlighted)
            ? (params.highlighted as number[])
            : undefined,
        label: params.label as string | undefined,
    };
}

/**
 * QuestionCard Component
 * 
 * Renders the three-zone question layout:
 * - Zone 1: Context bar with skill name and progress
 * - Zone 2: Visual teaching space (fraction bar, number line, etc.)
 * - Zone 3: Question text and answer input
 */
export function QuestionCard({
    question,
    skill,
    visualType = 'none',
    visualParams = {},
    masteryScore = 0,
    masteryStatus = 'weak',
    questionNumber = 1,
    totalQuestions = 10,
    onHint,
    hintAvailable = false,
    hintUsed = false,
    onCheck,
    onChange,
    value = '',
    disabled = false,
}: QuestionCardProps) {
    // Parse visual parameters based on type
    const fractionBarParams = visualType === 'fraction_bar'
        ? parseFractionBarParams(visualParams)
        : null;

    return (
        <div className="w-full max-w-2xl mx-auto">
            {/* Zone 1: Context Bar */}
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 rounded-t-lg">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-600">
                            Skill:
                        </span>
                        <span className="text-sm font-semibold text-gray-800">
                            {skill.name}
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">
                            Question {questionNumber} of {SESSION_CONSTANTS.MAX_QUESTIONS_PER_SESSION}
                        </span>
                        <MasteryBar
                            score={masteryScore}
                            status={masteryStatus}
                            showLabel={false}
                        />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-white border border-gray-200 border-t-0 px-4 py-6 rounded-b-lg">
                {/* Zone 2: Visual Teaching Space */}
                {visualType !== 'none' && (
                    <div className="mb-8 flex justify-center">
                        {visualType === 'fraction_bar' && fractionBarParams && (
                            <FractionBar
                                numerator={fractionBarParams.numerator}
                                denominator={fractionBarParams.denominator}
                                highlighted={fractionBarParams.highlighted}
                                label={fractionBarParams.label}
                                size="lg"
                            />
                        )}

                        {visualType === 'number_line' && (
                            <div className="w-full max-w-md h-24 bg-gray-50 rounded-lg flex items-center justify-center">
                                <p className="text-gray-500">
                                    Number line visualization coming soon
                                </p>
                            </div>
                        )}

                        {visualType === 'step_reference' && (
                            <div className="w-full max-w-md p-4 bg-blue-50 rounded-lg">
                                <p className="text-sm text-blue-800">
                                    Step reference: {String(visualParams.step || 'Review the example above')}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Zone 3: Question Text */}
                <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-800 text-center">
                        {question.question_text}
                    </h3>
                </div>

                {/* Hint Section */}
                {hintAvailable && !hintUsed && (
                    <div className="mb-4 text-center">
                        <button
                            onClick={onHint}
                            disabled={disabled}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Need a hint?
                        </button>
                    </div>
                )}

                {hintUsed && question.hint_text && (
                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm font-medium text-amber-800 mb-1">
                            💡 Hint:
                        </p>
                        <p className="text-sm text-amber-700">
                            {question.hint_text}
                        </p>
                    </div>
                )}

                {/* Text input for answer (for questions that need typed answer) */}
                <div className="mb-4">
                    <label htmlFor="answer-input" className="sr-only">
                        Your answer
                    </label>
                    <input
                        id="answer-input"
                        type="text"
                        value={value}
                        onChange={(e) => onChange?.(e.target.value)}
                        disabled={disabled}
                        placeholder="Type your answer here..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                        autoComplete="off"
                    />
                </div>

                {/* Submit button */}
                <div className="text-center">
                    <button
                        onClick={onCheck}
                        disabled={disabled || !value.trim()}
                        className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        Check Answer
                    </button>
                </div>
            </div>
        </div>
    );
}

export default QuestionCard;
