// src/components/VoiceMessage.tsx - Versi Minimalis
import { useState, useRef, useEffect } from 'react';

interface VoiceMessageProps {
    transcript: string;
    audioUrl: string;
    isOwnMessage: boolean;
}

export default function VoiceMessage({
    transcript,
    audioUrl,
    isOwnMessage
}: VoiceMessageProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [hasError, setHasError] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleEnded = () => setIsPlaying(false);
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);

        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);

        return () => {
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
        };
    }, []);

    const togglePlay = async () => {
        const audio = audioRef.current;
        if (!audio) return;

        try {
            setIsLoading(true);
            if (isPlaying) {
                audio.pause();
            } else {
                await audio.play();
            }
        } catch (error) {
            console.error('Error playing audio:', error);
            setHasError(true);
        } finally {
            setIsLoading(false);
        }
    };

    if (hasError) {
        return (
            <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${isOwnMessage ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                }`}>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">Gagal memuat audio</span>
            </div>
        );
    }

    return (
        <div className={`inline-flex flex-col gap-2 max-w-md ${isOwnMessage ? 'items-end' : 'items-start'}`}>
            {/* Hidden audio element */}
            <audio ref={audioRef} src={audioUrl} preload="none" />

            {/* Simple Audio Player */}
            <div className={`flex items-center gap-3 px-3 py-2 rounded-xl ${isOwnMessage
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                <button
                    onClick={togglePlay}
                    disabled={isLoading}
                    className={`p-2 rounded-full ${isOwnMessage
                            ? 'bg-blue-400 hover:bg-blue-300'
                            : 'bg-white hover:bg-gray-50 border border-gray-300'
                        } transition-colors`}
                >
                    {isLoading ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    ) : isPlaying ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                        </svg>
                    ) : (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    )}
                </button>
                <span className="text-sm">Pesan Suara</span>
            </div>

            {/* Transcript */}
            <div className={`px-3 py-2 rounded-xl max-w-full ${isOwnMessage
                    ? 'bg-blue-100 text-blue-900'
                    : 'bg-white text-gray-800 border'
                }`}>
                <div className="text-sm">
                    {transcript}
                </div>
            </div>
        </div>
    );
}