'use client'

interface AnswerOptionsProps {
  options: string[]
  selectedAnswer: string | null
  submitted: boolean
  correctAnswer?: string
  onSelect: (answer: string) => void
}

function getOptionStyle(
  option: string,
  selectedAnswer: string | null,
  submitted: boolean,
  correctAnswer: string | undefined,
): string {
  const base =
    'w-full min-h-[56px] rounded-2xl border-2 px-4 py-3 text-base font-medium text-left transition-colors'

  if (!submitted) {
    if (option === selectedAnswer) {
      return `${base} border-blue-500 bg-blue-50 text-blue-900`
    }
    return `${base} border-gray-200 bg-white text-gray-800 active:bg-gray-50`
  }

  // Post-submission states
  if (option === correctAnswer) {
    return `${base} border-green-500 bg-green-50 text-green-900`
  }
  if (option === selectedAnswer) {
    // selected but wrong
    return `${base} border-red-400 bg-red-50 text-red-800`
  }
  return `${base} border-gray-200 bg-gray-50 text-gray-400`
}

export function AnswerOptions({
  options,
  selectedAnswer,
  submitted,
  correctAnswer,
  onSelect,
}: AnswerOptionsProps) {
  return (
    <div className="flex flex-col gap-3 w-full" role="group" aria-label="Answer options">
      {options.map((option) => {
        const style = getOptionStyle(option, selectedAnswer, submitted, correctAnswer)

        return (
          <button
            key={option}
            type="button"
            disabled={submitted}
            onClick={() => onSelect(option)}
            className={style}
            aria-pressed={option === selectedAnswer}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}

export default AnswerOptions
