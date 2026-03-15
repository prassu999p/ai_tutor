/**
 * SessionSummary - End of session summary screen
 * 
 * Displays session statistics including:
 * - Questions answered count
 * - Skills improved with before/after scores
 * - Skills mastered (if any)
 * - Active misconceptions (if any)
 * 
 * @example
 * <SessionSummary
 *   summary={sessionSummary}
 *   onContinue={() => handleContinue()}
 *   onEnd={() => handleEnd()}
 * />
 */

'use client';

import type { SessionSummary as SessionSummaryType } from '@/hooks/useSession';
import { MasteryBar } from './MasteryBar';

export interface SessionSummaryProps {
    /** Session summary data */
    summary: SessionSummaryType;
    /** Callback to continue to next session */
    onContinue?: () => void;
    /** Callback to end the session */
    onEnd?: () => void;
    /** Additional CSS classes */
    className?: string;
}

/**
 * SessionSummary Component
 * 
 * Renders a comprehensive summary of the learning session with
 * statistics, skill progress, and action buttons.
 */
export function SessionSummary({
    summary,
    onContinue,
    onEnd,
    className = '',
}: SessionSummaryProps) {
    const {
        questionsAnswered,
        skillsImproved,
        skillsMastered,
        sessionDurationMin,
    } = summary;

    // Calculate total improvement
    const totalImprovement = skillsImproved.reduce(
        (acc, skill) => acc + (skill.after - skill.before),
        0
    );

    return (
        <div className={`w-full max-w-2xl mx-auto ${className}`}>
            {/* Header */}
            <div className="text-center mb-8">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-4xl">📚</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
                    Session Complete!
                </h2>
                <p className="text-gray-600">
                    Great work today! Here&apos;s your progress summary.
                </p>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {/* Questions answered */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                    <div className="text-3xl font-bold text-blue-600">
                        {questionsAnswered}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                        Questions
                    </div>
                </div>

                {/* Session duration */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                    <div className="text-3xl font-bold text-purple-600">
                        {sessionDurationMin}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                        Minutes
                    </div>
                </div>

                {/* Skills practiced */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                    <div className="text-3xl font-bold text-green-600">
                        {summary.skillsPracticed}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                        Skills Practiced
                    </div>
                </div>

                {/* Skills mastered */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                    <div className="text-3xl font-bold text-yellow-600">
                        {skillsMastered.length}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                        Mastered
                    </div>
                </div>
            </div>

            {/* Skills improved section */}
            {skillsImproved.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-800">
                            Skills Progress
                        </h3>
                    </div>
                    <div className="p-6 space-y-4">
                        {skillsImproved.map((skill, index) => (
                            <div key={index} className="flex items-center gap-4">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-800 truncate">
                                        {skill.skillName}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <MasteryBar
                                            score={skill.before * 100}
                                            status={skill.before >= 0.8 ? 'mastered' : skill.before >= 0.5 ? 'developing' : 'weak'}
                                            showLabel={false}
                                            size="sm"
                                        />
                                        <span className="text-gray-400">→</span>
                                        <MasteryBar
                                            score={skill.after * 100}
                                            status={skill.after >= 0.8 ? 'mastered' : skill.after >= 0.5 ? 'developing' : 'weak'}
                                            showLabel={true}
                                            size="sm"
                                        />
                                    </div>
                                </div>
                                <div className={`
                                    text-sm font-semibold px-3 py-1 rounded-full
                                    ${skill.after - skill.before >= 0
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-red-100 text-red-700'
                                    }
                                `}>
                                    {skill.after - skill.before >= 0 ? '+' : ''}
                                    {Math.round((skill.after - skill.before) * 100)}%
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Skills mastered section */}
            {skillsMastered.length > 0 && (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200 mb-6">
                    <div className="px-6 py-4 flex items-center gap-3">
                        <span className="text-2xl">🏆</span>
                        <h3 className="text-lg font-semibold text-yellow-800">
                            Skills Mastered This Session
                        </h3>
                    </div>
                    <div className="px-6 pb-4">
                        <div className="flex flex-wrap gap-2">
                            {skillsMastered.map((skill, index) => (
                                <span
                                    key={index}
                                    className="px-3 py-1 bg-yellow-200 text-yellow-800 rounded-full text-sm font-medium"
                                >
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Total improvement summary */}
            <div className="bg-blue-50 rounded-xl p-6 mb-8 text-center">
                <p className="text-blue-600 mb-1">
                    Total Progress This Session
                </p>
                <p className="text-3xl font-bold text-blue-700">
                    +{Math.round(totalImprovement * 100)}%
                </p>
                <p className="text-sm text-blue-500 mt-1">
                    Keep up the great work!
                </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
                <button
                    onClick={onContinue}
                    className="
                        flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg
                        hover:bg-blue-700 transition-colors
                    "
                >
                    Keep Going
                </button>
                <button
                    onClick={onEnd}
                    className="
                        flex-1 px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg
                        hover:bg-gray-200 transition-colors
                    "
                >
                    I'm Done
                </button>
            </div>
        </div>
    );
}

/**
 * Compact SessionSummary - for inline display
 */
export function CompactSessionSummary({
    summary,
    onEnd,
    className = '',
}: Omit<SessionSummaryProps, 'onContinue'>) {
    return (
        <div className={`bg-white rounded-lg shadow-sm p-4 ${className}`}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">Session Complete</h3>
                <span className="text-sm text-gray-500">
                    {summary.questionsAnswered} questions
                </span>
            </div>

            {summary.skillsMastered.length > 0 && (
                <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">Mastered:</p>
                    <div className="flex flex-wrap gap-1">
                        {summary.skillsMastered.map((skill, i) => (
                            <span
                                key={i}
                                className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded"
                            >
                                {skill}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <button
                onClick={onEnd}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
                View Details
            </button>
        </div>
    );
}

export default SessionSummary;
