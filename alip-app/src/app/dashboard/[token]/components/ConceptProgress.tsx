'use client'

import { MasteryBar } from '@/components'
import type { StudentSkillProfileRow, DifficultyLevel, MasteryStatus } from '@/types/database'

interface ConceptProgressProps {
  skills: StudentSkillProfileRow[]
}

const DIFFICULTY_ORDER: Record<DifficultyLevel, number> = {
  foundational: 0,
  developing: 1,
  advanced: 2,
}

const DIFFICULTY_BADGE: Record<DifficultyLevel, { label: string; className: string }> = {
  foundational: { label: 'Foundation', className: 'bg-gray-100 text-gray-600' },
  developing: { label: 'Developing', className: 'bg-blue-50 text-blue-600' },
  advanced: { label: 'Advanced', className: 'bg-purple-50 text-purple-600' },
}

const STATUS_DOT: Record<MasteryStatus, string> = {
  mastered: 'bg-green-500',
  developing: 'bg-blue-500',
  weak: 'bg-gray-300',
}

function StatusIndicator({ status, isUnlocked }: { status: MasteryStatus; isUnlocked: boolean }) {
  if (!isUnlocked) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
        Locked
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium capitalize text-gray-600">
      <span className={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`} />
      {status}
    </span>
  )
}

export function ConceptProgress({ skills }: ConceptProgressProps) {
  const sorted = [...skills].sort(
    (a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty]
  )

  // Group by difficulty
  const groups: Record<DifficultyLevel, StudentSkillProfileRow[]> = {
    foundational: [],
    developing: [],
    advanced: [],
  }
  for (const skill of sorted) {
    groups[skill.difficulty].push(skill)
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Skill Progress</h2>

      <div className="space-y-8">
        {(Object.keys(groups) as DifficultyLevel[]).map((difficulty) => {
          const items = groups[difficulty]
          if (items.length === 0) return null
          const badge = DIFFICULTY_BADGE[difficulty]

          return (
            <div key={difficulty}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${badge.className}`}>
                  {badge.label}
                </span>
              </div>

              <div className="space-y-3">
                {items.map((skill) => (
                  <div
                    key={skill.skill_id}
                    className={`rounded-xl border p-4 ${
                      skill.is_unlocked
                        ? 'border-gray-200 bg-white'
                        : 'border-gray-100 bg-gray-50 opacity-60'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {skill.skill_name}
                          </p>
                        </div>
                        {skill.attempts_total > 0 && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {skill.attempts_correct}/{skill.attempts_total} correct
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 sm:w-64">
                        <div className="flex-1">
                          <MasteryBar
                            score={skill.mastery_score}
                            size="sm"
                            showLabel={skill.is_unlocked}
                            animate={false}
                          />
                        </div>
                        <div className="w-20 text-right">
                          <StatusIndicator
                            status={skill.mastery_status}
                            isUnlocked={skill.is_unlocked}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
