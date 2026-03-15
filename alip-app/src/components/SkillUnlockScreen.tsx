'use client'

interface SkillUnlockScreenProps {
  masteredSkillName: string
  nextSkillName: string | null
  onContinue: () => void
}

export function SkillUnlockScreen({
  masteredSkillName,
  nextSkillName,
  onContinue,
}: SkillUnlockScreenProps) {
  const ctaLabel = nextSkillName ? `Start ${nextSkillName}` : 'View Progress'
  const subtitle = nextSkillName
    ? `Next up: ${nextSkillName}`
    : "You've completed all fractions skills!"

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-green-50 to-white px-6">
      {/* Trophy / celebration icon */}
      <div className="mb-6 flex items-center justify-center w-24 h-24 rounded-full bg-green-100">
        <svg
          viewBox="0 0 48 48"
          width={52}
          height={52}
          aria-hidden="true"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="24" cy="24" r="20" fill="#22c55e" />
          <path
            d="M15 24l7 7 11-13"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Skill name + mastered */}
      <h1 className="text-3xl font-bold text-gray-900 text-center leading-tight">
        {masteredSkillName}
      </h1>
      <p className="mt-2 text-2xl font-semibold text-green-600 text-center">Mastered!</p>

      {/* Next skill info */}
      <p className="mt-6 text-lg text-gray-600 text-center">{subtitle}</p>

      {/* CTA */}
      <button
        type="button"
        onClick={onContinue}
        className="mt-10 w-full max-w-xs min-h-[56px] rounded-2xl bg-green-600 text-white text-lg font-semibold active:bg-green-700 transition-colors shadow-md"
      >
        {ctaLabel}
      </button>
    </div>
  )
}

export default SkillUnlockScreen
