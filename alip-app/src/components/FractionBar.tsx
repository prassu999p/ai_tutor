/**
 * FractionBar - SVG component for visualizing fractions
 * 
 * Visual teaching tool for the Adaptive Learning Intelligence Platform.
 * Renders a fraction as a horizontal bar divided into segments.
 * 
 * @example
 * // Basic usage - shows 3/5
 * <FractionBar numerator={3} denominator={5} />
 * 
 * @example
 * // Side-by-side comparison
 * <div className="flex gap-4">
 *   <FractionBar numerator={3} denominator={4} label="3/4" />
 *   <FractionBar numerator={2} denominator={3} label="2/3" />
 * </div>
 * 
 * @example
 * // With highlighting
 * <FractionBar numerator={3} denominator={5} highlighted={[0, 1]} />
 */

export interface FractionBarProps {
    /** Number of filled segments */
    numerator: number;
    /** Total number of segments */
    denominator: number;
    /** Optional label below the bar (e.g., "3/5") */
    label?: string;
    /** Indices of segments to highlight (0-based) */
    highlighted?: number[];
    /** Show the fraction value below bar (default: true) */
    showValue?: boolean;
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
    /** Additional CSS classes */
    className?: string;
}

/**
 * Size configuration for the fraction bar
 */
const sizeConfig = {
    sm: { width: 200, height: 24, gap: 2 },
    md: { width: 280, height: 32, gap: 2 },
    lg: { width: 320, height: 40, gap: 3 },
} as const;

/**
 * Color configuration
 */
const colors = {
    filled: '#3B82F6',      // Blue #3B82F6 at 80% opacity
    filledRgb: '59, 130, 246',
    empty: '#E5E7EB',       // Light gray #E5E7EB
    border: '#9CA3AF',      // Gray for borders
    text: '#374151',        // Dark gray for text
    highlight: '#F59E0B',   // Amber for highlighted segments
    highlightRgb: '245, 158, 11',
} as const;

/**
 * FractionBar Component
 * 
 * Renders an SVG-based fraction visualization with filled and empty segments.
 * Supports different sizes, highlighting, and accessibility features.
 */
export function FractionBar({
    numerator,
    denominator,
    label,
    highlighted = [],
    showValue = true,
    size = 'md',
    className = '',
}: FractionBarProps) {
    // Validate props
    if (denominator < 1) {
        console.warn('FractionBar: denominator must be >= 1');
        return null;
    }
    if (numerator < 0 || numerator > denominator) {
        console.warn('FractionBar: numerator must be between 0 and denominator');
    }

    // Clamp numerator to valid range
    const clampedNumerator = Math.max(0, Math.min(numerator, denominator));

    const config = sizeConfig[size];
    const { width: totalWidth, height: segmentHeight, gap } = config;

    // Calculate segment dimensions
    // Total width = (segmentWidth * denominator) + (gap * (denominator - 1))
    // Therefore: segmentWidth = (totalWidth - gap * (denominator - 1)) / denominator
    const totalGapWidth = gap * (denominator - 1);
    const segmentWidth = (totalGapWidth > 0)
        ? (totalWidth - totalGapWidth) / denominator
        : totalWidth / denominator;

    // SVG dimensions
    const svgWidth = totalWidth;
    const svgHeight = segmentHeight + (showValue || label ? 24 : 0); // Extra space for label

    // Generate segment data
    const segments = Array.from({ length: denominator }, (_, index) => {
        const isFilled = index < clampedNumerator;
        const isHighlighted = highlighted.includes(index);

        return {
            index,
            x: index * (segmentWidth + gap),
            width: segmentWidth,
            isFilled,
            isHighlighted,
        };
    });

    // Accessibility
    const fractionValue = `${numerator}/${denominator}`;
    const accessibilityLabel = label
        ? `${label} represents ${fractionValue} of ${denominator} parts`
        : `Fraction bar showing ${fractionValue}`;

    const filledCount = numerator;
    const emptyCount = denominator - numerator;

    return (
        <div
            className={`fraction-bar inline-flex flex-col items-center ${className}`}
            role="img"
            aria-label={accessibilityLabel}
        >
            <svg
                width={svgWidth}
                height={svgHeight}
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                xmlns="http://www.w3.org/2000/svg"
                role="presentation"
                aria-hidden="true"
            >
                {/* Render segments */}
                {segments.map((segment) => (
                    <rect
                        key={segment.index}
                        x={segment.x}
                        y={0}
                        width={segment.width}
                        height={segmentHeight}
                        rx={segmentHeight > 30 ? 4 : 2}
                        ry={segmentHeight > 30 ? 4 : 2}
                        fill={
                            segment.isHighlighted
                                ? `rgba(${colors.highlightRgb}, 0.8)`
                                : segment.isFilled
                                    ? `rgba(${colors.filledRgb}, 0.8)`
                                    : colors.empty
                        }
                        stroke={
                            segment.isHighlighted
                                ? colors.highlight
                                : segment.isFilled
                                    ? colors.filled
                                    : colors.border
                        }
                        strokeWidth={segment.isFilled || segment.isHighlighted ? 0 : 1}
                        className="transition-colors duration-200"
                    />
                ))}
            </svg>

            {/* Label or fraction value */}
            {(showValue || label) && (
                <div
                    className="mt-1 text-center"
                    aria-label={showValue ? fractionValue : undefined}
                >
                    <span
                        className="text-sm font-medium"
                        style={{ color: colors.text }}
                    >
                        {label || fractionValue}
                    </span>
                </div>
            )}

            {/* Screen reader description */}
            <span className="sr-only">
                {filledCount} filled segments, {emptyCount} empty segments out of {denominator} total
            </span>
        </div>
    );
}

/**
 * FractionBarGroup - Display multiple fraction bars side by side
 * 
 * @example
 * <FractionBarGroup
 *   fractions={[
 *     { numerator: 3, denominator: 4, label: '3/4' },
 *     { numerator: 2, denominator: 3, label: '2/3' },
 *   ]}
 *   comparison="Which is larger?"
 * />
 */
export interface FractionBarGroupProps {
    /** Array of fraction configurations */
    fractions: Array<{
        numerator: number;
        denominator: number;
        label?: string;
        highlighted?: number[];
    }>;
    /** Optional question/label above the group */
    comparison?: string;
    /** Size for all bars */
    size?: 'sm' | 'md' | 'lg';
    /** Additional CSS classes */
    className?: string;
}

export function FractionBarGroup({
    fractions,
    comparison,
    size = 'md',
    className = '',
}: FractionBarGroupProps) {
    return (
        <div
            className={`fraction-bar-group flex flex-col items-center gap-4 ${className}`}
            role="group"
            aria-label={comparison || 'Fraction comparison'}
        >
            {comparison && (
                <p
                    className="text-base font-medium text-gray-700 text-center"
                    aria-level={2}
                >
                    {comparison}
                </p>
            )}

            <div
                className="flex flex-wrap justify-center gap-4"
                role="list"
                aria-label="Fraction bars"
            >
                {fractions.map((fraction, index) => (
                    <div key={index} role="listitem">
                        <FractionBar
                            numerator={fraction.numerator}
                            denominator={fraction.denominator}
                            label={fraction.label}
                            highlighted={fraction.highlighted}
                            size={size}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default FractionBar;
