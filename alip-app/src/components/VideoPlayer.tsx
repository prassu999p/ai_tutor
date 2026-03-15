'use client'

import { useEffect, useRef, useState } from 'react'

interface VideoPlayerProps {
  videoUrl: string
  title: string
  durationSec: number
  type: 'intro' | 'remediation'
  studentAnswer?: string
  fallbackText?: string
  onReady?: () => void
  onSkip?: () => void
}

export function VideoPlayer({
  videoUrl,
  title,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  durationSec,
  type,
  studentAnswer,
  fallbackText,
  onReady,
  onSkip,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [readyEnabled, setReadyEnabled] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const vttUrl = videoUrl.replace('.mp4', '.vtt')
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const readyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (type !== 'intro') return
    readyTimerRef.current = setTimeout(() => {
      setReadyEnabled(true)
    }, 10000)
    return () => {
      if (readyTimerRef.current) clearTimeout(readyTimerRef.current)
    }
  }, [type])

  useEffect(() => {
    // Start a 5-second error timeout — if video hasn't loaded by then, show fallback
    errorTimeoutRef.current = setTimeout(() => {
      const video = videoRef.current
      if (video && video.readyState < 2) {
        setLoadError(true)
      }
    }, 5000)

    return () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current)
    }
  }, [])

  function handleCanPlay() {
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current)
  }

  function handleError() {
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current)
    setLoadError(true)
  }

  function handleEnded() {
    if (type === 'remediation') {
      onReady?.()
    }
  }

  function handleSkip() {
    onSkip?.()
    onReady?.()
  }

  if (loadError) {
    return (
      <div className="w-full rounded-xl bg-amber-50 border border-amber-200 p-4">
        <p className="text-base font-medium text-amber-800 mb-2">{title}</p>
        <p className="text-sm text-amber-700">
          {fallbackText ??
            "The video couldn't load right now. Here's a quick explanation to help you continue."}
        </p>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col gap-3">
      {type === 'remediation' && studentAnswer && (
        <div className="rounded-lg bg-gray-100 px-4 py-2">
          <span className="text-sm text-gray-600">
            You answered: <strong className="text-gray-900">{studentAnswer}</strong>
          </span>
        </div>
      )}

      <div className="relative w-full rounded-xl overflow-hidden bg-black aspect-video">
        <video
          ref={videoRef}
          src={videoUrl}
          autoPlay
          muted={type === 'intro'}
          playsInline
          className="w-full h-full object-contain"
          onCanPlay={handleCanPlay}
          onError={handleError}
          onEnded={handleEnded}
          aria-label={title}
          style={{ minHeight: 180 }}
        >
          <track kind="captions" src={vttUrl} default />
        </video>
      </div>

      {type === 'intro' && (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSkip}
            className="flex-1 min-h-[44px] rounded-xl border border-gray-300 bg-white text-base font-medium text-gray-700 active:bg-gray-100 transition-colors"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={() => onReady?.()}
            disabled={!readyEnabled}
            className={`flex-1 min-h-[44px] rounded-xl text-base font-semibold transition-colors ${
              readyEnabled
                ? 'bg-blue-600 text-white active:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {readyEnabled ? "I'm ready" : "I'm ready…"}
          </button>
        </div>
      )}
    </div>
  )
}

export default VideoPlayer
