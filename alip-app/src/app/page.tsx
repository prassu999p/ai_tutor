'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { StudentSkillProfileRow, MasteryStatus } from '@/types';

// Default student ID for MVP (single student, no login)
// Note: Must be a valid UUID for the students table
const DEFAULT_STUDENT_ID = '00000000-0000-0000-0000-000000000001';
const DEFAULT_STUDENT_NAME = 'Alex';

interface CurrentSkill {
  skillId: string;
  skillName: string;
  masteryScore: number;
  masteryStatus: MasteryStatus;
}

export default function Home() {
  const router = useRouter();
  const [currentSkill, setCurrentSkill] = useState<CurrentSkill | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch current skill progress
    async function fetchCurrentSkill() {
      try {
        const response = await fetch(`/api/students/${DEFAULT_STUDENT_ID}/progress`);
        if (!response.ok) {
          throw new Error('Failed to fetch progress');
        }

        const data = await response.json();
        const skills: StudentSkillProfileRow[] = data.skills || [];

        // Find the first unlocked skill that isn't mastered
        // This will be the current skill to work on
        const current = skills.find(
          (s: StudentSkillProfileRow) => s.is_unlocked && s.mastery_status !== 'mastered'
        );

        if (current) {
          setCurrentSkill({
            skillId: current.skill_id,
            skillName: current.skill_name,
            masteryScore: current.mastery_score,
            masteryStatus: current.mastery_status,
          });
        } else if (skills.length > 0) {
          // All skills mastered or none unlocked - use first skill
          setCurrentSkill({
            skillId: skills[0].skill_id,
            skillName: skills[0].skill_name,
            masteryScore: skills[0].mastery_score,
            masteryStatus: skills[0].mastery_status,
          });
        }
      } catch (error) {
        console.error('Error fetching progress:', error);
        // Set default skill for demo
        setCurrentSkill({
          skillId: 'MS-04',
          skillName: 'Simplifying Fractions',
          masteryScore: 0.61,
          masteryStatus: 'developing',
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchCurrentSkill();
  }, []);

  const handleContinueLearning = () => {
    router.push('/session');
  };

  // Calculate mastery percentage display
  const masteryPercent = currentSkill
    ? Math.round(currentSkill.masteryScore * 100)
    : 0;

  // Get status color class
  const getMasteryColor = (status: MasteryStatus) => {
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

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Welcome Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            👋 Welcome back, {DEFAULT_STUDENT_NAME}
          </h1>
          <p className="text-gray-600">
            Ready to continue learning?
          </p>
        </div>

        {/* Current Skill Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <p className="text-sm font-medium text-gray-500 mb-3">
            You&apos;re working on:
          </p>

          {isLoading ? (
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ) : (
            <>
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  {currentSkill?.skillName || 'Fractions'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Mastery: {masteryPercent}%
                </p>
              </div>

              {/* Mastery Progress Bar */}
              <div className="w-full">
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getMasteryColor(currentSkill?.masteryStatus || 'weak')} transition-all duration-500`}
                    style={{ width: `${masteryPercent}%` }}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Continue Learning Button */}
        <button
          onClick={handleContinueLearning}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 mb-4"
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

        {/* View Progress Link */}
        <div className="text-center">
          <Link
            href="/progress"
            className="text-blue-600 hover:text-blue-800 font-medium text-sm underline-offset-4 hover:underline"
          >
            View my progress
          </Link>
        </div>
      </div>
    </div>
  );
}
