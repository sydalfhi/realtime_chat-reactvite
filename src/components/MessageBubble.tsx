import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'

interface Message {
    id?: string
    user_id: string
    room_id: string
    message: string
    created_at: string
    parent_id?: string
    parent_message?: string
    parent_user_id?: string
}

interface MessageBubbleProps {
    message: Message
    onReply: (message: Message) => void
}

export default function MessageBubble({ message, onReply }: MessageBubbleProps) {
    const { user } = useAuthStore()
    const [showOptions, setShowOptions] = useState(false)

    const isOwnMessage = message.user_id == user?.id

    return (
        <div
            className={`flex mb-4 group relative ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
        >
            <div
                className="relative max-w-md"
                onMouseEnter={() => setShowOptions(true)}
                onMouseLeave={() => setShowOptions(false)}
            >
                {/* Reply Options - Always in DOM but hidden */}
                <div
                    className={`absolute -top-8 transition-all duration-200 ${isOwnMessage ? 'right-0' : 'left-0'
                        } ${showOptions
                            ? 'opacity-100 visible translate-y-0'
                            : 'opacity-0 invisible translate-y-2'
                        }`}
                >
                    <button
                        onClick={() => onReply(message)}
                        className="bg-gray-700 text-white text-xs px-3 py-1 rounded hover:bg-gray-600 transition-colors shadow-md"
                    >
                        Balas
                    </button>
                </div>

                {/* Message Bubble */}
                <div
                    className={`px-4 py-2 rounded-2xl ${isOwnMessage
                        ? 'bg-blue-500 text-white rounded-br-md'
                        : 'bg-gray-200 text-gray-800 rounded-bl-md'
                        }`}
                >
                    {/* Replied Message Preview */}
                    {message.parent_message && (
                        <div
                            className={`mb-2 p-2 rounded text-xs border-l-2 ${isOwnMessage
                                ? 'bg-blue-400 border-blue-300'
                                : 'bg-gray-300 border-gray-400'
                                }`}
                        >
                            <div className="font-semibold">
                                {message.parent_user_id == user?.id ? 'Anda' : `User ${message.parent_user_id}`}
                            </div>
                            <div className="truncate">{message.parent_message}</div>
                        </div>
                    )}

                    {/* Sender Name (only for others) */}
                    {!isOwnMessage && (
                        <div className="font-semibold text-sm text-gray-700 mb-1">
                            User {message.user_id}
                        </div>
                    )}

                    {/* Message Content */}
                    <div className="text-sm break-words">{message.message}</div>

                    {/* Timestamp */}
                    <div
                        className={`text-xs mt-1 text-right ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                            }`}
                    >
                        {new Date(message.created_at).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}