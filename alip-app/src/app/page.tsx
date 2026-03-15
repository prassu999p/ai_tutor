import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { MasteryBar } from '@/components'
import type { StudentSkillProfileRow } from '@/types/database'

export default async function HomePage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <LandingScreen />
  }

  // Fetch the student record linked to this auth user
  const { data: students, error: studentError } = await supabase.rpc(
    'get_student_by_auth_user',
    { p_auth_user_id: user.id }
  )

  if (studentError || !students || students.length === 0) {
    return <LandingScreen />
  }

  const student = students[0]

  // Fetch full skill profile
  const { data: skills } = await supabase
    .from('v_student_skill_profile')
    .select('*')
    .eq('student_id', student.id)
    .order('skill_id', { ascending: true })

  const skillProfile = (skills ?? []) as StudentSkillProfileRow[]

  // Find the current active skill (unlocked, not mastered, most relevant)
  const activeSkill = skillProfile.find(
    (s) => s.is_unlocked && s.mastery_status !== 'mastered'
  )

  const hasStarted = skillProfile.some((s) => s.attempts_total > 0)
  const masteredCount = skillProfile.filter(
    (s) => s.mastery_status === 'mastered'
  ).length

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header / Greeting */}
        <header className="mb-10">
          <p className="text-sm font-medium text-blue-600 uppercase tracking-wide">
            ALIP
          </p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">
            Welcome back, {student.name}!
          </h1>
          {masteredCount > 0 && (
            <p className="mt-2 text-gray-600">
              You&apos;ve mastered {masteredCount} of {skillProfile.length}{' '}
              skills. Keep it up!
            </p>
          )}
        </header>

        {/* Active skill card */}
        {activeSkill && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
              Current Skill
            </h2>
            <p className="text-xl font-semibold text-gray-900 mb-4">
              {activeSkill.skill_name}
            </p>
            <MasteryBar score={activeSkill.mastery_score} size="md" />
            <p className="mt-2 text-sm text-gray-500">
              {activeSkill.difficulty.charAt(0).toUpperCase() +
                activeSkill.difficulty.slice(1)}{' '}
              &middot; {activeSkill.concept_name}
            </p>
          </section>
        )}

        {/* Primary CTA */}
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link
            href="/session"
            className="flex-1 inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            {hasStarted ? 'Continue Learning' : 'Start Learning'}
          </Link>
          <Link
            href="/progress"
            className="flex-1 inline-flex items-center justify-center rounded-xl bg-white px-6 py-3.5 text-base font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors"
          >
            View My Progress
          </Link>
        </div>

        {/* Quick stats */}
        {hasStarted && (
          <section className="mt-10 grid grid-cols-3 gap-4">
            <StatCard
              label="Skills Mastered"
              value={`${masteredCount}/${skillProfile.length}`}
            />
            <StatCard
              label="Total Attempts"
              value={String(
                skillProfile.reduce((sum, s) => sum + s.attempts_total, 0)
              )}
            />
            <StatCard
              label="Accuracy"
              value={(() => {
                const total = skillProfile.reduce(
                  (sum, s) => sum + s.attempts_total,
                  0
                )
                const correct = skillProfile.reduce(
                  (sum, s) => sum + s.attempts_correct,
                  0
                )
                if (total === 0) return '--'
                return `${Math.round((correct / total) * 100)}%`
              })()}
            />
          </section>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-xs font-medium text-gray-500">{label}</p>
    </div>
  )
}

function LandingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
          ALIP
        </h1>
        <p className="mt-3 text-lg text-gray-600">
          Adaptive Learning Intelligence Platform
        </p>
        <p className="mt-1 text-gray-500">
          AI-powered math tutoring for K-8 students
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  )
}
