// src/components/VoiceRecorder.tsx
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';

interface VoiceRecorderProps {
    onSendVoice: (audioData: {
        file: string;
        file_name: string;
        file_type: string;
        transcript: string;
    }) => void;
    disabled?: boolean;
}

export default function VoiceRecorder({ onSendVoice, disabled }: VoiceRecorderProps) {
    const {
        isRecording,
        audioUrl,
        recordingTime,
        startRecording,
        stopRecording,
        cancelRecording,
        prepareAudioForSend,
        hasRecording
    } = useVoiceRecorder();

    const handleSend = async () => {
        try {
            const audioData = await prepareAudioForSend();
            onSendVoice(audioData);
            cancelRecording(); // Reset setelah kirim
        } catch (error) {
            console.error('Error sending voice:', error);
            alert('Gagal mengirim pesan suara');
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex items-center gap-2">
            {/* Recording State */}
            {isRecording && (
                <div className="flex items-center gap-3 bg-red-100 px-3 py-2 rounded-lg">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-red-600 font-medium">
                            {formatTime(recordingTime)}
                        </span>
                    </div>
                    <button
                        onClick={stopRecording}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                        Stop
                    </button>
                </div>
            )}

            {/* Audio Preview */}
            {hasRecording && !isRecording && (
                <div className="flex items-center gap-3 bg-blue-100 px-3 py-2 rounded-lg">
                    <audio controls className="h-8" src={audioUrl} />
                    <div className="flex gap-2">
                        <button
                            onClick={handleSend}
                            className="text-green-600 hover:text-green-800 text-sm font-medium"
                        >
                            Kirim
                        </button>
                        <button
                            onClick={cancelRecording}
                            className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                        >
                            Batal
                        </button>
                    </div>
                </div>
            )}

            {/* Start Recording Button */}
            {!isRecording && !hasRecording && (
                <button
                    onClick={startRecording}
                    disabled={disabled}
                    className="bg-purple-500 text-white p-2 rounded-md hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    title="Rekam suara"
                >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                    </svg>
                </button>
            )}
        </div>
    );
}