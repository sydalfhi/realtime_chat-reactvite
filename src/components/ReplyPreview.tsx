import type { Message } from "../types/chat"

interface ReplyPreviewProps {
    replyingTo: Message | null
    onCancel: () => void
}

export default function ReplyPreview({ replyingTo, onCancel }: ReplyPreviewProps) {
    if (!replyingTo) return null

    // ✅ Fungsi untuk render konten preview berdasarkan message_type
    const renderReplyContent = () => {
        switch (replyingTo.message_type) {
            case 'image':
                return (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>📷</span>
                        <span>Gambar</span>
                        {replyingTo.message && replyingTo.message !== 'Mengirim gambar' && (
                            <span className="truncate">- {replyingTo.message}</span>
                        )}
                    </div>
                )

            case 'document':
            case 'file':
                return (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>📄</span>
                        <span>Dokumen</span>
                        {replyingTo.file_name && (
                            <span className="truncate">- {replyingTo.file_name}</span>
                        )}
                        {replyingTo.message && replyingTo.message !== 'Mengirim dokumen' && (
                            <span className="truncate">- {replyingTo.message}</span>
                        )}
                    </div>
                )

            case 'video':
                return (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>🎥</span>
                        <span>Video</span>
                        {replyingTo.message && replyingTo.message !== 'Mengirim video' && (
                            <span className="truncate">- {replyingTo.message}</span>
                        )}
                    </div>
                )

            case 'audio':
                return (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>🎵</span>
                        <span>Audio</span>
                        {replyingTo.message && replyingTo.message !== 'Mengirim audio' && (
                            <span className="truncate">- {replyingTo.message}</span>
                        )}
                    </div>
                )

            default: // text
                return (
                    <div className="text-sm text-gray-600 truncate">
                        {replyingTo.message}
                    </div>
                )
        }
    }

    return (
        <div className="bg-gray-100 border-l-4 border-blue-500 p-3 mb-2 rounded mx-4 mt-2">
            <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-700 mb-1">
                        Membalas
                    </div>
                    {renderReplyContent()}
                </div>
                <button
                    onClick={onCancel}
                    className="text-gray-500 hover:text-gray-700 ml-2 flex-shrink-0 transition-colors"
                    title="Batalkan balasan"
                >
                    ✕
                </button>
            </div>
        </div>
    )
}