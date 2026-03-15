/**
 * AnswerOptions - Multiple choice answer component
 * 
 * Displays multiple choice options with proper tap targets and keyboard navigation.
 * Supports selected state display and disabled mode.
 * 
 * @example
 * <AnswerOptions
 *   options={['A) 1/2', 'B) 2/3', 'C) 3/4', 'D) 4/5']}
 *   selectedAnswer="B"
 *   onSelect={(answer) => handleSelect(answer)}
 *   disabled={false}
 * />
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';

export interface AnswerOptionsProps {
    /** Array of answer options */
    options: string[];
    /** Currently selected answer */
    selectedAnswer?: string;
    /** Callback when an option is selected */
    onSelect?: (answer: string) => void;
    /** Whether input is disabled */
    disabled?: boolean;
    /** Letter prefix for options (e.g., 'A', 'B', 'C', 'D') */
    prefixLetter?: string;
    /** Additional CSS classes */
    className?: string;
}

/**
 * AnswerOptions Component
 * 
 * Renders a list of tappable multiple choice options.
 * Each option has a minimum 44x44px tap target for accessibility.
 * Supports keyboard navigation with arrow keys and Enter.
 */
export function AnswerOptions({
    options,
    selectedAnswer = '',
    onSelect,
    disabled = false,
    prefixLetter = 'A',
    className = '',
}: AnswerOptionsProps) {
    const selectedRef = useRef<HTMLButtonElement>(null);
    const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

    // Focus selected option on mount/update
    useEffect(() => {
        if (selectedAnswer && selectedRef.current) {
            selectedRef.current.focus();
        }
    }, [selectedAnswer]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
        if (disabled) return;

        switch (e.key) {
            case 'ArrowDown':
            case 'ArrowRight':
                e.preventDefault();
                if (index < options.length - 1) {
                    optionRefs.current[index + 1]?.focus();
                }
                break;
            case 'ArrowUp':
            case 'ArrowLeft':
                e.preventDefault();
                if (index > 0) {
                    optionRefs.current[index - 1]?.focus();
                }
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                onSelect?.(options[index]);
                break;
        }
    }, [disabled, options.length]);

    // Generate letter prefix for option
    const getOptionLabel = (index: number): string => {
        const letter = String.fromCharCode(prefixLetter.charCodeAt(0) + index);
        return `${letter})`;
    };

    return (
        <div
            className={`space-y-3 ${className}`}
            role="radiogroup"
            aria-label="Answer options"
        >
            {options.map((option, index) => {
                const isSelected = selectedAnswer === option;
                const optionLabel = getOptionLabel(index);

                return (
                    <button
                        key={index}
                        ref={(el) => { optionRefs.current[index] = el; }}
                        onClick={() => !disabled && onSelect?.(option)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        disabled={disabled}
                        role="radio"
                        aria-checked={isSelected}
                        aria-label={`${optionLabel} ${option}`}
                        className={`
                            w-full min-h-[44px] px-4 py-3 flex items-center gap-3
                            rounded-lg border-2 text-left font-medium
                            transition-all duration-200
                            focus:outline-none focus:ring-2 focus:ring-offset-2
                            ${isSelected
                                ? 'border-blue-500 bg-blue-50 text-blue-800 focus:ring-blue-500'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 focus:ring-gray-400'
                            }
                            ${disabled
                                ? 'opacity-60 cursor-not-allowed'
                                : 'cursor-pointer'
                            }
                        `}
                    >
                        {/* Letter badge */}
                        <span
                            className={`
                                flex-shrink-0 w-8 h-8 flex items-center justify-center
                                rounded-full text-sm font-bold
                                ${isSelected
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 text-gray-600'
                                }
                            `}
                        >
                            {optionLabel.replace(')', '')}
                        </span>

                        {/* Option text */}
                        <span className="flex-1">
                            {option}
                        </span>

                        {/* Selected indicator */}
                        {isSelected && (
                            <svg
                                className="w-5 h-5 text-blue-500 flex-shrink-0"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

/**
 * Compact AnswerOptions - smaller version for inline use
 */
export function CompactAnswerOptions({
    options,
    selectedAnswer = '',
    onSelect,
    disabled = false,
    className = '',
}: Omit<AnswerOptionsProps, 'prefixLetter'>) {
    return (
        <div
            className={`grid grid-cols-2 gap-2 ${className}`}
            role="radiogroup"
            aria-label="Answer options"
        >
            {options.map((option, index) => {
                const isSelected = selectedAnswer === option;
                const letter = String.fromCharCode(65 + index); // A, B, C, D

                return (
                    <button
                        key={index}
                        onClick={() => !disabled && onSelect?.(option)}
                        disabled={disabled}
                        role="radio"
                        aria-checked={isSelected}
                        className={`
                            min-h-[44px] px-3 py-2 flex items-center justify-center gap-2
                            rounded-lg border-2 text-sm font-medium
                            transition-all duration-200
                            ${isSelected
                                ? 'border-blue-500 bg-blue-50 text-blue-800'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                            }
                            ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                    >
                        <span className={`
                            w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold
                            ${isSelected ? 'bg-blue-500 text-white' : 'bg-gray-100'}
                        `}>
                            {letter}
                        </span>
                        {option}
                    </button>
                );
            })}
        </div>
    );
}

export default AnswerOptions;
