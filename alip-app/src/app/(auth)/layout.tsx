import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ALIP — AI Learning Tutor',
  description: 'Sign in or create your ALIP account',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">ALIP</h1>
          <p className="mt-1 text-sm text-slate-500">AI Learning Tutor</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
