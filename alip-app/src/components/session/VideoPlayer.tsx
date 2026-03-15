/**
 * VideoPlayer - Session video component
 * 
 * Displays intro or remediation videos with skip functionality.
 * Used in Phase 1A (intro video) and Phase 1B (remediation video).
 * 
 * @example
 * <VideoPlayer
 *   videoUrl="https://example.com/intro.mp4"
 *   title="Introduction to Fractions"
 *   onComplete={() => handleComplete()}
 *   onSkip={() => handleSkip()}
 * />
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export interface VideoPlayerProps {
    /** URL of the video to play */
    videoUrl: string;
    /** Title displayed above the video */
    title?: string;
    /** Callback when video completes naturally */
    onComplete?: () => void;
    /** Callback when user skips the video */
    onSkip?: () => void;
    /** Whether this is a remediation video (non-skippable) */
    isRemediation?: boolean;
    /** Optional video duration override */
    duration?: number;
}

/**
 * VideoPlayer Component
 * 
 * Renders a full-width video player with title, duration display,
 * and skip functionality. For intro videos, skip is available after 10 seconds.
 * Remediation videos cannot be skipped until complete.
 */
export function VideoPlayer({
    videoUrl,
    title,
    onComplete,
    onSkip,
    isRemediation = false,
}: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [canSkip, setCanSkip] = useState(false);
    const [hasCompleted, setHasCompleted] = useState(false);

    // Handle time update
    const handleTimeUpdate = useCallback(() => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);

            // Enable skip after 10 seconds for intro videos
            if (!isRemediation && !canSkip && videoRef.current.currentTime >= 10) {
                setCanSkip(true);
            }
        }
    }, [isRemediation, canSkip]);

    // Handle video metadata loaded
    const handleLoadedMetadata = useCallback(() => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    }, []);

    // Handle video ended
    const handleEnded = useCallback(() => {
        setIsPlaying(false);
        setHasCompleted(true);
        onComplete?.();
    }, [onComplete]);

    // Handle skip button click
    const handleSkip = useCallback(() => {
        if (canSkip && !isRemediation) {
            videoRef.current?.pause();
            onSkip?.();
        }
    }, [canSkip, isRemediation, onSkip]);

    // Handle "I'm ready" button click
    const handleReady = useCallback(() => {
        if (canSkip || isRemediation) {
            videoRef.current?.pause();
            onComplete?.();
        }
    }, [canSkip, isRemediation, onComplete]);

    // Format time as MM:SS
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Start video automatically
    useEffect(() => {
        videoRef.current?.play().catch(() => {
            // Autoplay blocked - user will need to click play
            setIsPlaying(false);
        });
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            videoRef.current?.pause();
        };
    }, []);

    return (
        <div className="w-full max-w-4xl mx-auto">
            {/* Title */}
            {title && (
                <h2 className="text-xl font-semibold text-gray-800 text-center mb-4">
                    {title}
                </h2>
            )}

            {/* Video Container */}
            <div className="relative bg-black rounded-lg overflow-hidden shadow-lg">
                <video
                    ref={videoRef}
                    src={videoUrl}
                    className="w-full aspect-video"
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handleEnded}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    controls={false}
                    playsInline
                />

                {/* Duration overlay */}
                <div className="absolute top-4 right-4 bg-black/70 text-white text-sm px-2 py-1 rounded">
                    {formatTime(currentTime)} / {formatTime(duration)}
                </div>

                {/* Play/Pause overlay when paused */}
                {!isPlaying && !hasCompleted && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <button
                            onClick={() => videoRef.current?.play()}
                            className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors"
                            aria-label="Play video"
                        >
                            <svg
                                className="w-8 h-8 text-gray-800 ml-1"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="mt-4 flex justify-center gap-4">
                {/* Skip button - only for intro videos after 10 seconds */}
                {!isRemediation && canSkip && (
                    <button
                        onClick={handleSkip}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                    >
                        Skip Video
                    </button>
                )}

                {/* "I'm ready" button - appears after 10 seconds or for remediation */}
                {(canSkip || isRemediation) && !hasCompleted && (
                    <button
                        onClick={handleReady}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                        I'm Ready
                    </button>
                )}

                {/* Loading state */}
                {!canSkip && !isRemediation && (
                    <p className="text-sm text-gray-500">
                        You can skip this video in {10 - Math.floor(currentTime)} seconds
                    </p>
                )}
            </div>

            {/* Remediation notice */}
            {isRemediation && (
                <p className="mt-4 text-center text-sm text-gray-600">
                    Watch this video to understand the concept, then try again!
                </p>
            )}
        </div>
    );
}

export default VideoPlayer;
