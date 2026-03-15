import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import CopyButtonClient from './CopyButtonClient'

// Extended student type that includes fields added by migration 003
interface StudentWithAuth {
  id: string
  name: string
  grade: string | null
  dashboard_token: string | null
  auth_user_id: string | null
}

async function getStudentData(userId: string): Promise<StudentWithAuth | null> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('students')
    .select('id, name, grade, dashboard_token, auth_user_id')
    .eq('auth_user_id', userId)
    .single()

  if (!data) return null

  return data as unknown as StudentWithAuth
}

export default async function SignupSuccessPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const user = session?.user
  const userMeta = user?.user_metadata as
    | { name?: string; grade?: number }
    | undefined

  // Try to fetch the student record for dashboard token
  let student: StudentWithAuth | null = null
  if (user?.id) {
    student = await getStudentData(user.id)
  }

  const studentName = student?.name ?? userMeta?.name ?? 'there'
  const grade = student?.grade ?? (userMeta?.grade ? String(userMeta.grade) : null)
  const dashboardToken = student?.dashboard_token ?? null

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  const dashboardUrl = dashboardToken ? `${siteUrl}/dashboard/${dashboardToken}` : null

  return (
    <div>
      <div className="text-center mb-6">
        <div className="text-4xl mb-3" aria-hidden="true">
          🎉
        </div>
        <h2 className="text-2xl font-bold text-slate-900">
          Welcome, {studentName}! You&apos;re all set.
        </h2>
        {grade && (
          <p className="mt-1 text-slate-500 text-sm">Grade {grade} student</p>
        )}
      </div>

      {dashboardUrl ? (
        <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <p className="text-sm font-medium text-slate-700 mb-2">
            Share this link with {studentName}&apos;s parent:
          </p>
          <p className="text-xs text-slate-500 break-all font-mono bg-white border border-slate-200 rounded-lg px-3 py-2 mb-3 select-all">
            {dashboardUrl}
          </p>
          <CopyButtonClient url={dashboardUrl} />
        </div>
      ) : (
        <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <p className="text-sm text-slate-500">
            A parent dashboard link will be available shortly after your first session.
          </p>
        </div>
      )}

      <Link
        href="/"
        className="flex items-center justify-center w-full min-h-[44px] px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg text-center focus:outline-none focus:outline-2 focus:outline-blue-500 focus:outline-offset-2 transition-colors"
      >
        Start Learning
      </Link>
    </div>
  )
}
