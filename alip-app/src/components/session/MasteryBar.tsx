/**
 * MasteryBar - Progress indicator component
 * 
 * Displays a student's mastery progress with color coding:
 * - weak: gray/muted
 * - developing: blue
 * - mastered: green
 * 
 * @example
 * <MasteryBar score={65} status="developing" showLabel={true} />
 */

'use client';

import type { MasteryStatus } from '@/types';

export interface MasteryBarProps {
    /** Current mastery score (0-100) */
    score: number;
    /** Current mastery status */
    status: MasteryStatus;
    /** Whether to show the percentage label */
    showLabel?: boolean;
    /** Optional size variant */
    size?: 'sm' | 'md' | 'lg';
    /** Additional CSS classes */
    className?: string;
}

/**
 * Color configuration for mastery states
 */
const statusColors: Record<MasteryStatus, { bg: string; fill: string; label: string }> = {
    weak: {
        bg: '#E5E7EB',      // Gray-200
        fill: '#9CA3AF',    // Gray-400
        label: 'Weak',
    },
    developing: {
        bg: '#DBEAFE',      // Blue-100
        fill: '#3B82F6',    // Blue-500
        label: 'Developing',
    },
    mastered: {
        bg: '#D1FAE5',      // Green-100
        fill: '#10B981',    // Green-500
        label: 'Mastered',
    },
};

/**
 * Size configurations
 */
const sizeConfigs = {
    sm: { height: 6, width: 80, fontSize: 'text-xs' },
    md: { height: 8, width: 100, fontSize: 'text-sm' },
    lg: { height: 10, width: 120, fontSize: 'text-base' },
};

/**
 * MasteryBar Component
 * 
 * Renders a horizontal progress bar showing mastery level with
 * appropriate color coding based on the mastery status.
 */
export function MasteryBar({
    score,
    status,
    showLabel = true,
    size = 'md',
    className = '',
}: MasteryBarProps) {
    const colors = statusColors[status];
    const sizeConfig = sizeConfigs[size];

    // Ensure score is between 0 and 100
    const normalizedScore = Math.max(0, Math.min(100, score));

    // Calculate the fill percentage
    const fillPercentage = normalizedScore;

    return (
        <div
            className={`flex items-center gap-2 ${className}`}
            role="progressbar"
            aria-valuenow={normalizedScore}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Mastery: ${normalizedScore}% - ${colors.label}`}
        >
            {/* Progress bar */}
            <div
                className="relative rounded-full overflow-hidden"
                style={{
                    width: sizeConfig.width,
                    height: sizeConfig.height,
                    backgroundColor: colors.bg,
                }}
            >
                {/* Fill */}
                <div
                    className="absolute top-0 left-0 h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                        width: `${fillPercentage}%`,
                        backgroundColor: colors.fill,
                    }}
                />
            </div>

            {/* Label */}
            {showLabel && (
                <span
                    className={`${sizeConfig.fontSize} font-medium whitespace-nowrap`}
                    style={{ color: colors.fill }}
                >
                    {normalizedScore}%
                </span>
            )}
        </div>
    );
}

/**
 * Compact MasteryBar - smaller version for inline use
 */
export function CompactMasteryBar({
    score,
    status,
}: Omit<MasteryBarProps, 'size' | 'showLabel'>) {
    const colors = statusColors[status];
    const normalizedScore = Math.max(0, Math.min(100, score));

    return (
        <div
            className="flex items-center gap-1.5"
            role="status"
            aria-label={`Mastery ${normalizedScore}%`}
        >
            <div
                className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden"
            >
                <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                        width: `${normalizedScore}%`,
                        backgroundColor: colors.fill,
                    }}
                />
            </div>
            <span className="text-xs text-gray-500">
                {normalizedScore}%
            </span>
        </div>
    );
}

export default MasteryBar;
