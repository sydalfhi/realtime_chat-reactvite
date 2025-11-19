// src/components/VoiceRecorder.tsx
import { useState, useRef, useEffect } from 'react';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';

interface VoiceRecorderProps {
    onSendVoice: (audioData: {
        file: string;
        file_name: string;
        file_type: string;
        transcript: string;
    }) => void;
    onCancel: () => void;
    disabled?: boolean;
}

export default function VoiceRecorder({ onSendVoice, onCancel, disabled }: VoiceRecorderProps) {
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

    // State untuk modal edit transcript
    const [showEditModal, setShowEditModal] = useState(false);
    const [editedTranscript, setEditedTranscript] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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


    const handleCancel = () => {
        cancelRecording();
        onCancel();
    };

    // Buka modal edit transcript
    const openEditModal = () => {
        console.log('📝 Opening edit modal, current transcript:', transcript);
        setEditedTranscript(transcript);
        setShowEditModal(true);
    };

    // Simpan transcript yang diedit
    const saveEditedTranscript = () => {
        if (editedTranscript.trim()) {
            console.log('💾 Saving edited transcript:', editedTranscript.trim());
            editTranscript(editedTranscript.trim()); // ✅ Ini yang dipanggil
        }
        setShowEditModal(false);
    };

    // Cancel edit transcript
    const cancelEdit = () => {
        setShowEditModal(false);
        setEditedTranscript('');
    };

    // Auto focus textarea ketika modal terbuka
    useEffect(() => {
        if (showEditModal && textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(
                textareaRef.current.value.length,
                textareaRef.current.value.length
            );
        }
    }, [showEditModal]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <>
            {/* Modal Edit Transcript */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                                </svg>
                                Edit Transkripsi
                            </h3>
                            <button
                                onClick={cancelEdit}
                                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-3">
                            <p className="text-sm text-gray-600">
                                Edit transkripsi pesan suara Anda:
                            </p>

                            <textarea
                                ref={textareaRef}
                                value={editedTranscript}
                                onChange={(e) => setEditedTranscript(e.target.value)}
                                placeholder="Ketik transkripsi di sini..."
                                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                autoFocus
                            />

                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={cancelEdit}
                                    className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={saveEditedTranscript}
                                    disabled={!editedTranscript.trim()}
                                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                                >
                                    Simpan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Voice Recorder Component */}
            <div className="bg-white border border-gray-300 rounded-xl p-4 space-y-4 shadow-lg relative z-40 -bottom-16">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                        </svg>
                        Rekam Pesan Suara
                    </h3>
                    <button
                        onClick={handleCancel}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                        title="Tutup"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Recording State */}
                {isRecording && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                            <div className="flex-1">
                                <div className="flex items-center gap-3">
                                    <span className="text-red-600 font-medium text-lg">
                                        {formatTime(recordingTime)}
                                    </span>
                                    <span className="text-red-500">Sedang merekam...</span>
                                </div>
                                {listening && (
                                    <div className="text-green-600 text-sm mt-1 flex items-center gap-1">
                                        <span>🎤</span>
                                        <span>Transkripsi aktif</span>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={stopRecording}
                                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                                Stop
                            </button>
                        </div>
                    </div>
                )}

                {/* Audio Preview */}
                {hasRecording && !isRecording && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-700">Preview:</span>
                            <audio controls className="flex-1 h-8" src={audioUrl} />
                        </div>
                    </div>
                )}

                {/* Transcript */}
                {(isRecording || hasRecording) && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Transkripsi:</span>
                            {hasRecording && !isRecording && (
                                <button
                                    onClick={openEditModal}
                                    className="text-blue-500 hover:text-blue-700 text-sm flex items-center gap-1"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Edit
                                </button>
                            )}
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg border text-sm min-h-[60px]">
                            {isTranscribing ? (
                                <div className="flex items-center gap-2 text-gray-500">
                                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    Memproses transkripsi...
                                </div>
                            ) : (
                                transcript || (isRecording ? 'Mulai berbicara...' : 'Transkripsi akan muncul di sini')
                            )}
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                {!isRecording && !hasRecording ? (
                    <button
                        onClick={startRecording}
                        disabled={disabled}
                        className="w-full bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-lg font-medium flex items-center gap-2 justify-center transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                        </svg>
                        Mulai Rekam
                    </button>
                ) : hasRecording && !isRecording && (
                    <div className="flex gap-2">
                        <button
                            onClick={handleSend}
                            disabled={isTranscribing || !transcript}
                            className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:bg-gray-400 flex items-center gap-2 justify-center"
                        >
                            {isTranscribing ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Memproses...
                                </>
                            ) : (
                                'Kirim Suara'
                            )}
                        </button>
                        <button
                            onClick={handleCancel}
                            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                        >
                            Batal
                        </button>
                    </div>
                )}

                {/* Browser Support Warning */}
                {!browserSupportsSpeechRecognition && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-yellow-800 text-sm">
                            ⚠️ Browser tidak mendukung transkripsi otomatis.
                            Edit manual transkripsi setelah selesai merekam.
                        </p>
                    </div>
                )}
            </div>
        </>
    );
}