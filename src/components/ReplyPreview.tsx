import type { Message } from "../types/chat"


interface ReplyPreviewProps {
    replyingTo: Message | null
    onCancel: () => void
}

export default function ReplyPreview({ replyingTo, onCancel }: ReplyPreviewProps) {
    if (!replyingTo) return null

    return (
        <div className="bg-gray-100 border-l-4 border-blue-500 p-3 mb-2 rounded mx-4 mt-2">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-700 mb-1">
                        Membalas User {replyingTo.user_id}
                    </div>
                    <div className="text-sm text-gray-600 truncate">
                        {replyingTo.message}
                    </div>
                </div>
                <button
                    onClick={onCancel}
                    className="text-gray-500 hover:text-gray-700 ml-2 transition-colors"
                    title="Batalkan balasan"
                >
                    ✕
                </button>
            </div>
        </div>
    )
}