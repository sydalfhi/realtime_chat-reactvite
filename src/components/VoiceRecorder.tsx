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
        transcript,
        isTranscribing,
        listening,
        browserSupportsSpeechRecognition,
        startRecording,
        stopRecording,
        cancelRecording,
        prepareAudioForSend,
        editTranscript,
        hasRecording
    } = useVoiceRecorder();

    const handleSend = async () => {
        try {
            const audioData = await prepareAudioForSend();
            onSendVoice(audioData);
            cancelRecording();
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
        <div className="flex flex-col gap-3">
            {/* Browser Support Warning */}
            {!browserSupportsSpeechRecognition && (
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-3 py-2 rounded text-sm">
                    ⚠️ Browser tidak mendukung transkripsi otomatis. Anda perlu mengetik transkripsi manual.
                </div>
            )}

            {/* Recording State */}
            {isRecording && (
                <div className="flex items-center justify-between bg-red-100 px-4 py-3 rounded-lg">
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-red-600 font-medium">
                            {formatTime(recordingTime)}
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="text-red-500 text-sm">🔴 Sedang merekam</span>
                            {listening && (
                                <span className="text-green-600 text-sm">🎤 Transkripsi aktif</span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={stopRecording}
                        className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                    >
                        Stop
                    </button>
                </div>
            )}

            {/* Real-time Transcript Preview saat Recording */}
            {isRecording && transcript && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="text-blue-600 font-medium text-sm mb-2">
                        📝 Transkripsi Real-time:
                    </div>
                    <div className="text-sm text-gray-700 bg-white p-2 rounded">
                        {transcript}
                    </div>
                </div>
            )}

            {/* Audio Preview & Transcript setelah Recording */}
            {hasRecording && !isRecording && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                    {/* Audio Player */}
                    <div className="flex items-center gap-3">
                        <span className="text-blue-600 font-medium">🎵 Preview Suara:</span>
                        <audio controls className="flex-1 h-8" src={audioUrl} />
                    </div>

                    {/* Transcript Section */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-blue-600 font-medium">📝 Hasil Transkripsi:</span>
                            <button
                                onClick={editTranscript}
                                className="text-blue-500 hover:text-blue-700 text-sm flex items-center gap-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit
                            </button>
                        </div>

                        {isTranscribing ? (
                            <div className="flex items-center gap-2 text-gray-500 text-sm">
                                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                Sedang memproses transkripsi...
                            </div>
                        ) : (
                            <div className="bg-white p-3 rounded border text-sm min-h-[60px]">
                                {transcript || 'Tidak ada transkripsi. Klik "Edit" untuk mengetik manual.'}
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={handleSend}
                            disabled={isTranscribing || !transcript}
                            className="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600 disabled:bg-gray-400 flex items-center gap-2"
                        >
                            {isTranscribing ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Memproses...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                    Kirim Suara
                                </>
                            )}
                        </button>
                        <button
                            onClick={cancelRecording}
                            className="bg-gray-500 text-white px-4 py-2 rounded text-sm hover:bg-gray-600"
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
                    className="bg-purple-500 text-white p-3 rounded-lg hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2 justify-center"
                    title="Rekam pesan suara"
                >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                    </svg>
                    <span>Rekam Suara</span>
                </button>
            )}
        </div>
    );
}