'use client'

interface FractionBarProps {
  numerator: number
  denominator: number
  label?: string
  highlighted?: number[]
  size?: 'sm' | 'md' | 'lg'
  color?: string
  className?: string
}

const SIZE_MAP = {
  sm: 32,
  md: 48,
  lg: 64,
}

export function FractionBar({
  numerator,
  denominator,
  label,
  highlighted = [],
  size = 'md',
  color = '#3b82f6',
  className = '',
}: FractionBarProps) {
  const height = SIZE_MAP[size]
  const displayLabel = label ?? `${numerator}/${denominator}`

  // Ensure each segment is at least 20px wide (for 320px container, denominator ≤ 12)
  // We use a viewBox that scales proportionally. Each segment = 1 unit wide with 1px gap.
  const segmentWidth = 40
  const gap = 2
  const totalWidth = denominator * segmentWidth + (denominator - 1) * gap

  return (
    <div className={`flex flex-col items-center w-full ${className}`}>
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        width="100%"
        style={{ minWidth: Math.max(denominator * 20, 40), maxWidth: '100%' }}
        aria-label={`Fraction bar: ${displayLabel}`}
        role="img"
      >
        {Array.from({ length: denominator }, (_, i) => {
          const x = i * (segmentWidth + gap)
          const isFilled = i < numerator
          const isHighlighted = highlighted.includes(i)

          let fill: string
          let stroke: string
          if (isHighlighted) {
            fill = '#f59e0b'
            stroke = '#d97706'
          } else if (isFilled) {
            fill = color
            stroke = color
          } else {
            fill = '#ffffff'
            stroke = '#d1d5db'
          }

          return (
            <rect
              key={i}
              x={x}
              y={0}
              width={segmentWidth}
              height={height}
              fill={fill}
              stroke={stroke}
              strokeWidth={1.5}
              rx={2}
            />
          )
        })}
      </svg>
      <span className="mt-1 text-sm font-medium text-gray-700">{displayLabel}</span>
    </div>
  )
}

export default FractionBar
