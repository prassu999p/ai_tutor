'use client'

interface MasteryBarProps {
  score: number
  showLabel?: boolean
  animate?: boolean
  size?: 'sm' | 'md'
  className?: string
}

function getBarColor(score: number): string {
  if (score >= 0.8) return '#22c55e'
  if (score >= 0.5) return '#3b82f6'
  return '#9ca3af'
}

const HEIGHT_MAP = {
  sm: 'h-2',
  md: 'h-4',
}

export function MasteryBar({
  score,
  showLabel = true,
  animate = true,
  size = 'md',
  className = '',
}: MasteryBarProps) {
  const clampedScore = Math.min(1, Math.max(0, score))
  const percentage = Math.round(clampedScore * 100)
  const color = getBarColor(clampedScore)
  const heightClass = HEIGHT_MAP[size]

  return (
    <div className={`w-full flex items-center gap-2 ${className}`}>
      <div className={`flex-1 ${heightClass} bg-gray-100 rounded-full overflow-hidden`}>
        <div
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Mastery: ${percentage}%`}
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
            transition: animate ? 'width 300ms ease-in-out' : undefined,
          }}
          className="h-full rounded-full"
        />
      </div>
      {showLabel && (
        <span className="text-sm font-semibold text-gray-700 tabular-nums w-10 text-right">
          {percentage}%
        </span>
      )}
    </div>
  )
}

export default MasteryBar
