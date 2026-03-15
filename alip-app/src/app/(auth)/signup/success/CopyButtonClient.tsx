'use client'

import { useState } from 'react'

export default function CopyButtonClient({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select the text manually
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="w-full min-h-[44px] px-4 py-2.5 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg focus:outline-none focus:outline-2 focus:outline-blue-500 focus:outline-offset-2 transition-colors text-sm"
    >
      {copied ? 'Copied!' : 'Copy link'}
    </button>
  )
}
