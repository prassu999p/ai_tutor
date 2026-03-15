import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { MasteryBar } from '@/components'
import type { StudentSkillProfileRow } from '@/types/database'

export default async function ProgressPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: students } = await supabase.rpc('get_student_by_auth_user', {
    p_auth_user_id: user.id,
  })

  if (!students || students.length === 0) {
    redirect('/login')
  }

  const student = students[0]

  const { data: skills } = await supabase
    .from('v_student_skill_profile')
    .select('*')
    .eq('student_id', student.id)
    .order('skill_id', { ascending: true })

  const skillProfile = (skills ?? []) as StudentSkillProfileRow[]

  const masteredCount = skillProfile.filter(
    (s) => s.mastery_status === 'mastered'
  ).length

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8">
          <Link
            href="/"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            &larr; Home
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-gray-900 sm:text-4xl">
            My Progress
          </h1>
          <p className="mt-2 text-gray-600">
            {masteredCount} of {skillProfile.length} skills mastered
          </p>
        </header>

        {/* Skills list */}
        <section className="space-y-3">
          {skillProfile.map((skill) => (
            <SkillRow key={skill.skill_id} skill={skill} />
          ))}
        </section>

        {/* CTA */}
        <div className="mt-10">
          <Link
            href="/session"
            className="w-full inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Continue Learning
          </Link>
        </div>
      </div>
    </div>
  )
}

function SkillRow({ skill }: { skill: StudentSkillProfileRow }) {
  const isMastered = skill.mastery_status === 'mastered'
  const isActive = skill.is_unlocked && !isMastered
  const isLocked = !skill.is_unlocked

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        isMastered
          ? 'bg-green-50 border-green-200'
          : isActive
            ? 'bg-white border-gray-200 shadow-sm'
            : 'bg-gray-50 border-gray-100'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Status icon */}
        <div className="mt-0.5 flex-shrink-0">
          {isMastered && (
            <span
              className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-100 text-green-600"
              aria-label="Mastered"
            >
              <CheckIcon />
            </span>
          )}
          {isActive && (
            <span
              className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-600"
              aria-label="In progress"
            >
              <ArrowIcon />
            </span>
          )}
          {isLocked && (
            <span
              className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-400"
              aria-label="Locked"
            >
              <LockIcon />
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3
              className={`text-base font-semibold ${
                isLocked ? 'text-gray-400' : 'text-gray-900'
              }`}
            >
              {skill.skill_name}
            </h3>
            <StatusBadge skill={skill} />
          </div>

          {isActive && (
            <div className="mt-2">
              <MasteryBar score={skill.mastery_score} size="sm" />
            </div>
          )}

          <p
            className={`mt-1 text-xs ${
              isLocked ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            {skill.difficulty.charAt(0).toUpperCase() +
              skill.difficulty.slice(1)}{' '}
            &middot; {skill.concept_name}
          </p>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ skill }: { skill: StudentSkillProfileRow }) {
  if (skill.mastery_status === 'mastered') {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
        Mastered
      </span>
    )
  }
  if (skill.is_unlocked) {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
        {Math.round(skill.mastery_score * 100)}%
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
      Not started
    </span>
  )
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="w-4 h-4"
    >
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="w-4 h-4"
    >
      <path
        fillRule="evenodd"
        d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="w-4 h-4"
    >
      <path
        fillRule="evenodd"
        d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
        clipRule="evenodd"
      />
    </svg>
  )
}
