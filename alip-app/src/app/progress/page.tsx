'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { StudentSkillProfileRow, MasteryStatus } from '@/types';

// Default student ID for MVP
// Note: Must match the UUID in home page and database
const DEFAULT_STUDENT_ID = '00000000-0000-0000-0000-000000000001';

interface ProgressData {
    skills: StudentSkillProfileRow[];
}

export default function ProgressPage() {
    const router = useRouter();
    const [progressData, setProgressData] = useState<ProgressData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchProgress() {
            try {
                const response = await fetch(`/api/students/${DEFAULT_STUDENT_ID}/progress`);
                if (!response.ok) {
                    throw new Error('Failed to fetch progress');
                }
                const data = await response.json();
                setProgressData(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setIsLoading(false);
            }
        }

        fetchProgress();
    }, []);

    // Get skills sorted by position
    const skills = progressData?.skills || [];

    // Sort by skill position if available, otherwise by skill_id
    const sortedSkills = [...skills].sort((a, b) => {
        const posA = (a as unknown as { position?: number }).position || 0;
        const posB = (b as unknown as { position?: number }).position || 0;
        return posA - posB;
    });

    // Calculate mastery stats
    const masteredCount = skills.filter(s => s.mastery_status === 'mastered').length;
    const totalSkills = sortedSkills.length || 8; // Default to 8 for MVP

    // Get status icon and label
    const getStatusDisplay = (skill: StudentSkillProfileRow) => {
        if (!skill.is_unlocked) {
            return {
                icon: (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                ),
                label: 'Locked',
                labelClass: 'text-gray-400',
                showProgress: false,
            };
        }

        if (skill.mastery_status === 'mastered') {
            return {
                icon: (
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                ),
                label: 'Mastered',
                labelClass: 'text-green-600 font-medium',
                showProgress: false,
            };
        }

        if (skill.mastery_status === 'developing') {
            return {
                icon: null,
                label: `${Math.round(skill.mastery_score * 100)}%`,
                labelClass: 'text-blue-600 font-medium',
                showProgress: true,
                showPercentage: true,
            };
        }

        // Weak status
        return {
            icon: null,
            label: 'Started',
            labelClass: 'text-yellow-600',
            showProgress: true,
            showPercentage: false,
        };
    };

    // Get progress bar color based on status
    const getProgressColor = (status: MasteryStatus) => {
        switch (status) {
            case 'mastered':
                return 'bg-green-500';
            case 'developing':
                return 'bg-blue-500';
            case 'weak':
                return 'bg-yellow-500';
            default:
                return 'bg-gray-400';
        }
    };

    const handleContinueLearning = () => {
        router.push('/session');
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading your progress...</p>
                </div>
            </div>
        );
    }

    // Error state
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

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
                        Your Progress
                    </h1>
                </div>

                {/* Skills List */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
                    {/* Concept Header */}
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-800">Fractions</h2>
                    </div>

                    {/* Skills */}
                    <div className="divide-y divide-gray-100">
                        {sortedSkills.length > 0 ? (
                            sortedSkills.map((skill) => {
                                const status = getStatusDisplay(skill);
                                const percent = Math.round(skill.mastery_score * 100);

                                return (
                                    <div
                                        key={skill.skill_id}
                                        className={`px-6 py-4 ${!skill.is_unlocked ? 'opacity-60' : ''}`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                {status.icon}
                                                <span className={`font-medium ${!skill.is_unlocked ? 'text-gray-500' : 'text-gray-800'}`}>
                                                    {skill.skill_name}
                                                </span>
                                            </div>
                                            <span className={status.labelClass}>
                                                {status.label}
                                            </span>
                                        </div>

                                        {/* Progress bar for non-locked skills */}
                                        {status.showProgress && skill.is_unlocked && (
                                            <div className="w-full">
                                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${getProgressColor(skill.mastery_status)} transition-all duration-500`}
                                                        style={{ width: `${percent}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Locked state */}
                                        {!skill.is_unlocked && (
                                            <div className="text-sm text-gray-400">
                                                Complete previous skills to unlock
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            // Demo data for when no real data exists
                            <>
                                {[
                                    { name: 'What is a Fraction?', status: 'mastered', unlocked: true },
                                    { name: 'Fractions on Number Line', status: 'mastered', unlocked: true },
                                    { name: 'Equivalent Fractions', status: 'mastered', unlocked: true },
                                    { name: 'Simplifying Fractions', status: 'developing', unlocked: true, percent: 71 },
                                    { name: 'Comparing Fractions', status: 'locked', unlocked: false },
                                    { name: 'Adding (same denom.)', status: 'locked', unlocked: false },
                                    { name: 'Adding (diff. denom.)', status: 'locked', unlocked: false },
                                    { name: 'Subtracting Fractions', status: 'locked', unlocked: false },
                                ].map((skill, index) => (
                                    <div
                                        key={index}
                                        className={`px-6 py-4 ${!skill.unlocked ? 'opacity-60' : ''}`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                {skill.status === 'mastered' ? (
                                                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                ) : !skill.unlocked ? (
                                                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                                    </svg>
                                                ) : null}
                                                <span className={`font-medium ${!skill.unlocked ? 'text-gray-500' : 'text-gray-800'}`}>
                                                    {skill.name}
                                                </span>
                                            </div>
                                            {skill.status === 'mastered' && (
                                                <span className="text-green-600 font-medium">Mastered</span>
                                            )}
                                            {skill.status === 'developing' && (
                                                <span className="text-blue-600 font-medium">{skill.percent}%</span>
                                            )}
                                            {!skill.unlocked && (
                                                <span className="text-gray-400">Locked 🔒</span>
                                            )}
                                        </div>

                                        {/* Progress bar */}
                                        {skill.status === 'developing' && (
                                            <div className="w-full">
                                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-blue-500 transition-all duration-500"
                                                        style={{ width: `${skill.percent}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>

                {/* Overall Progress */}
                <div className="text-center mb-6">
                    <p className="text-gray-600">
                        Overall: {masteredCount || 3} of {totalSkills || 8} skills mastered
                    </p>
                </div>

                {/* Continue Learning Button */}
                <button
                    onClick={handleContinueLearning}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                    Continue Learning
                    <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                        />
                    </svg>
                </button>

                {/* Back to Home */}
                <div className="text-center mt-4">
                    <Link
                        href="/"
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                    >
                        ← Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
