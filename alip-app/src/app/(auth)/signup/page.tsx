'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

const GRADES = [
  { label: 'Grade 3', value: '3' },
  { label: 'Grade 4', value: '4' },
  { label: 'Grade 5', value: '5' },
  { label: 'Grade 6', value: '6' },
  { label: 'Grade 7', value: '7' },
  { label: 'Grade 8', value: '8' },
]

function getErrorMessage(error: { message?: string } | null): string {
  if (!error?.message) return 'Something went wrong. Please try again.'
  const msg = error.message.toLowerCase()
  if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('email address is already in use')) {
    return 'An account with this email already exists. Sign in instead.'
  }
  if (msg.includes('password') && (msg.includes('weak') || msg.includes('short') || msg.includes('least'))) {
    return 'Password must be at least 8 characters.'
  }
  return 'Something went wrong. Please try again.'
}

export default function SignupPage() {
  const router = useRouter()
  const [studentName, setStudentName] = useState('')
  const [grade, setGrade] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)

    const supabase = createSupabaseBrowserClient()
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: studentName,
          grade: parseInt(grade, 10),
          parent_email: parentEmail || null,
        },
      },
    })

    if (authError) {
      setError(getErrorMessage(authError))
      setLoading(false)
      return
    }

    router.push('/signup/success')
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-900 mb-6">Create your account</h2>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="studentName" className="block text-sm font-medium text-slate-700 mb-1">
            Student name <span className="text-red-500">*</span>
          </label>
          <input
            id="studentName"
            type="text"
            autoComplete="given-name"
            required
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            className="w-full min-h-[44px] px-3 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:outline-2 focus:outline-blue-500 focus:border-blue-500 transition-colors"
            placeholder="Alex"
          />
        </div>

        <div>
          <label htmlFor="grade" className="block text-sm font-medium text-slate-700 mb-1">
            Grade <span className="text-red-500">*</span>
          </label>
          <select
            id="grade"
            required
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="w-full min-h-[44px] px-3 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:outline-2 focus:outline-blue-500 focus:border-blue-500 transition-colors bg-white"
          >
            <option value="">Select grade</option>
            {GRADES.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full min-h-[44px] px-3 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:outline-2 focus:outline-blue-500 focus:border-blue-500 transition-colors"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
            Password <span className="text-red-500">*</span>
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full min-h-[44px] px-3 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:outline-2 focus:outline-blue-500 focus:border-blue-500 transition-colors"
            placeholder="At least 8 characters"
          />
        </div>

        <div>
          <label htmlFor="parentEmail" className="block text-sm font-medium text-slate-700 mb-1">
            Parent email <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            id="parentEmail"
            type="email"
            autoComplete="off"
            value={parentEmail}
            onChange={(e) => setParentEmail(e.target.value)}
            className="w-full min-h-[44px] px-3 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:outline-2 focus:outline-blue-500 focus:border-blue-500 transition-colors"
            placeholder="parent@example.com"
          />
          <p className="mt-1 text-xs text-slate-400">We&apos;ll send a progress dashboard link here.</p>
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}{' '}
            {error.includes('already exists') && (
              <Link href="/login" className="underline font-medium">
                Sign in
              </Link>
            )}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-[44px] px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg focus:outline-none focus:outline-2 focus:outline-blue-500 focus:outline-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-600 font-medium focus:outline-none focus:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
