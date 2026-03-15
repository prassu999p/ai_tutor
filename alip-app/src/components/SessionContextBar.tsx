'use client'

interface SessionContextBarProps {
  skillName: string
  conceptName: string
  questionsAnswered: number
  estimatedTotal: number
}

export function SessionContextBar({
  skillName,
  conceptName,
  questionsAnswered,
  estimatedTotal,
}: SessionContextBarProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between bg-white border-b border-gray-200 px-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 overflow-hidden">
        <span className="text-sm text-gray-500 truncate max-w-[120px]">{conceptName}</span>
        <span className="text-sm text-gray-400" aria-hidden="true">
          ›
        </span>
        <span className="text-sm font-semibold text-gray-900 truncate max-w-[140px]">
          {skillName}
        </span>
      </div>

      {/* Question counter */}
      <div className="flex-shrink-0 ml-2">
        <span className="text-sm font-medium text-gray-600">
          Q{questionsAnswered} of ~{estimatedTotal}
        </span>
      </div>
    </div>
  )
}

export default SessionContextBar
