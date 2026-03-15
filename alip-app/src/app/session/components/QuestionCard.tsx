'use client'

import { FractionBar } from '@/components'
import type { Question } from '@/types'

interface QuestionCardProps {
  question: Question
}

function parseFractionFromText(text: string): { numerator: number; denominator: number } | null {
  // Match patterns like "3/4", "1/2", etc. in the question text
  const match = text.match(/(\d+)\s*\/\s*(\d+)/)
  if (!match) return null
  return {
    numerator: parseInt(match[1], 10),
    denominator: parseInt(match[2], 10),
  }
}

export function QuestionCard({ question }: QuestionCardProps) {
  const fraction = question.visual_type === 'fraction_bar'
    ? parseFractionFromText(question.question_text)
    : null

  return (
    <div className="w-full flex flex-col items-center gap-4">
      {/* Visual representation */}
      {question.visual_type === 'fraction_bar' && fraction && (
        <div className="w-full max-w-sm">
          <FractionBar
            numerator={fraction.numerator}
            denominator={fraction.denominator}
            size="lg"
          />
        </div>
      )}

      {/* Question text */}
      <p className="text-lg font-medium text-gray-900 text-center leading-relaxed px-2">
        {question.question_text}
      </p>
    </div>
  )
}

export default QuestionCard
