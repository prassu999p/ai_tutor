/**
 * SkillUnlock - Mastery celebration screen
 * 
 * Displays a full-screen celebration when a new skill is unlocked.
 * Shows confetti animation and provides a start button.
 * 
 * @example
 * <SkillUnlock
 *   skillName="Adding Fractions"
 *   nextSkillName="Subtracting Fractions"
 *   onStart={() => handleStartNextSkill()}
 * />
 */

'use client';

import { useEffect, useState, useCallback } from 'react';

export interface SkillUnlockProps {
    /** Name of the newly unlocked skill */
    skillName: string;
    /** Name of the next skill (optional) */
    nextSkillName?: string;
    /** Callback when user clicks start */
    onStart?: () => void;
    /** Whether to show confetti animation */
    showConfetti?: boolean;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Confetti piece type
 */
interface ConfettiPiece {
    id: number;
    x: number;
    y: number;
    rotation: number;
    color: string;
    delay: number;
    duration: number;
}

/**
 * Generate random confetti pieces
 */
function generateConfetti(count: number): ConfettiPiece[] {
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];

    return Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: -20 - Math.random() * 30,
        rotation: Math.random() * 360,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 2,
        duration: 2 + Math.random() * 2,
    }));
}

/**
 * SkillUnlock Component
 * 
 * Renders a celebration screen with confetti effect when a new skill is unlocked.
 * Shows the skill name and provides a start button to continue.
 */
export function SkillUnlock({
    skillName,
    nextSkillName,
    onStart,
    showConfetti = true,
    className = '',
}: SkillUnlockProps) {
    const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
    const [isVisible, setIsVisible] = useState(false);

    // Generate confetti on mount
    useEffect(() => {
        if (showConfetti) {
            setConfetti(generateConfetti(50));
        }

        // Trigger entrance animation
        const timer = setTimeout(() => setIsVisible(true), 100);
        return () => clearTimeout(timer);
    }, [showConfetti]);

    const handleStart = useCallback(() => {
        onStart?.();
    }, [onStart]);

    return (
        <div className={`relative w-full h-full min-h-[400px] flex flex-col items-center justify-center ${className}`}>
            {/* Confetti overlay */}
            {showConfetti && (
                <div
                    className="absolute inset-0 pointer-events-none overflow-hidden"
                    aria-hidden="true"
                >
                    {confetti.map((piece) => (
                        <div
                            key={piece.id}
                            className="absolute w-3 h-3 rounded-sm"
                            style={{
                                left: `${piece.x}%`,
                                backgroundColor: piece.color,
                                transform: `rotate(${piece.rotation}deg)`,
                                animation: `confetti-fall ${piece.duration}s linear ${piece.delay}s forwards`,
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Celebration content */}
            <div
                className={`
                    relative z-10 text-center px-6 transition-all duration-700
                    ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
                `}
            >
                {/* Trophy icon */}
                <div className="mb-6">
                    <div className="w-24 h-24 mx-auto bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                        <span className="text-5xl">🏆</span>
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
                    New Skill Unlocked!
                </h2>

                {/* Skill name */}
                <div className="mb-8">
                    <p className="text-lg text-gray-600 mb-2">
                        You've mastered
                    </p>
                    <p className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {skillName}
                    </p>
                </div>

                {/* Next skill preview */}
                {nextSkillName && (
                    <div className="mb-8 p-4 bg-blue-50 rounded-lg max-w-sm mx-auto">
                        <p className="text-sm text-blue-600 mb-1">
                            Next up:
                        </p>
                        <p className="text-lg font-semibold text-blue-800">
                            {nextSkillName}
                        </p>
                    </div>
                )}

                {/* Start button */}
                <button
                    onClick={handleStart}
                    className="
                        px-10 py-4 bg-gradient-to-r from-blue-600 to-purple-600 
                        text-white text-lg font-bold rounded-full
                        hover:from-blue-700 hover:to-purple-700
                        transform hover:scale-105 active:scale-95
                        shadow-lg hover:shadow-xl
                        transition-all duration-200
                    "
                >
                    Start Learning →
                </button>
            </div>

            {/* CSS keyframes for confetti animation */}
            <style jsx global>{`
                @keyframes confetti-fall {
                    0% {
                        transform: translateY(0) rotate(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(100vh) rotate(720deg);
                        opacity: 0;
                    }
                }
            `}</style>
        </div>
    );
}

/**
 * Compact SkillUnlock - for inline celebrations
 */
export function CompactSkillUnlock({
    skillName,
    onStart,
    className = '',
}: Omit<SkillUnlockProps, 'nextSkillName' | 'showConfetti'>) {
    return (
        <div className={`text-center ${className}`}>
            <div className="inline-flex items-center gap-2 mb-2">
                <span className="text-2xl">🎉</span>
                <span className="text-lg font-bold text-gray-800">
                    Skill Unlocked!
                </span>
            </div>
            <p className="text-gray-600 mb-3">
                You mastered <span className="font-semibold">{skillName}</span>
            </p>
            <button
                onClick={onStart}
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
                Continue
            </button>
        </div>
    );
}

export default SkillUnlock;
