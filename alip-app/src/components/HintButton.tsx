'use client'

import { useState } from 'react'

interface HintButtonProps {
  hintText: string | null
  isLoadingHint?: boolean
  onRequestHint: () => void
}

export function HintButton({ hintText, isLoadingHint = false, onRequestHint }: HintButtonProps) {
  const [revealed, setRevealed] = useState(false)

  // Don't render if no hint available and not loading
  if (hintText === null && !isLoadingHint && !revealed) {
    return null
  }

  function handleTap() {
    if (!revealed) {
      onRequestHint()
      setRevealed(true)
    }
  }

  // Loading state (student tapped, waiting for hint)
  if (isLoadingHint) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <svg
          className="animate-spin"
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity={0.25} />
          <path d="M21 12a9 9 0 00-9-9" />
        </svg>
        <span>Getting hint…</span>
      </div>
    )
  }

  // Hint revealed — show text, not button
  if (revealed && hintText) {
    return (
      <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Hint</p>
        <p className="text-sm text-gray-600">{hintText}</p>
      </div>
    )
  }

  // Initial state — show "Need a hint?" button
  return (
    <button
      type="button"
      onClick={handleTap}
      className="min-h-[44px] px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-500 active:bg-gray-50 transition-colors"
    >
      Need a hint?
    </button>
  )
}

export default HintButton
