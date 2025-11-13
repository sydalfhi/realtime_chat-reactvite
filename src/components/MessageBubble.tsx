import { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { socket } from '../utils/socket' // ✅ Import socket untuk real-time updates
import type { Message } from '../types/chat'

interface MessageBubbleProps {
    message: Message
    onReply: (message: Message) => void
    currentUserId?: string
}

export default function MessageBubble({ message, onReply, currentUserId }: MessageBubbleProps) {
    const { user } = useAuthStore()
    const [showOptions, setShowOptions] = useState(false)
    const [messageStatus, setMessageStatus] = useState(message.status || 0) // ✅ Local state untuk status
    const [isSending, setIsSending] = useState(message.isSending || false) // ✅ Local state untuk sending

    const isOwnMessage = message.user_id == (currentUserId || user?.id)

    // ✅ FIX: Listen untuk real-time status updates
    useEffect(() => {
        // Update dari props jika ada perubahan
        if (message.status != undefined) {
            setMessageStatus(message.status)
        }
        if (message.isSending != undefined) {
            setIsSending(message.isSending)
        }
    }, [message.status, message.isSending])

    // ✅ FIX: Listen untuk socket events
    useEffect(() => {
        // Handle ketika message berhasil disimpan (hilangkan sending state)
        const handleMessageSaved = (savedMessage: any) => {
            if (savedMessage.temporaryId == message.id || savedMessage.id == message.id) {
                console.log(`💾 Message saved: ${message.id}`)
                setIsSending(false)
                setMessageStatus(savedMessage.status || 0)
            }
        }

        // Handle ketika message gagal disimpan
        const handleMessageFailed = (data: any) => {
            if (data.temporaryId == message.id) {
                console.log(`❌ Message failed: ${message.id}`)
                setIsSending(false)
                // Bisa tambahkan error state di sini
            }
        }

        // Handle ketika pesan ditandai sebagai dibaca
        const handleMarkedRead = (data: any) => {
            if (data.room_id == message.room_id && isOwnMessage) {
                console.log(`📖 Messages in room ${data.room_id} marked as read`)
                setMessageStatus(1)
            }
        }

        // Handle individual message status update
        const handleMessageStatusUpdate = (data: any) => {
            if (data.message_id == message.id) {
                console.log(`🔄 Message ${message.id} status updated to ${data.status}`)
                setMessageStatus(data.status)
            }
        }

        // Register event listeners
        socket.on('chat:message-saved', handleMessageSaved)
        socket.on('chat:message-failed', handleMessageFailed)
        socket.on('chat:marked-read', handleMarkedRead)
        socket.on('chat:message-status-update', handleMessageStatusUpdate)

        // Cleanup
        return () => {
            socket.off('chat:message-saved', handleMessageSaved)
            socket.off('chat:message-failed', handleMessageFailed)
            socket.off('chat:marked-read', handleMarkedRead)
            socket.off('chat:message-status-update', handleMessageStatusUpdate)
        }
    }, [message.id, message.room_id, isOwnMessage])

    // ✅ Helper untuk menentukan status text - GUNAKAN LOCAL STATE
    const getStatusText = () => {
        if (isSending) return 'Mengirim...'
        if (messageStatus == 1) return 'Dibaca'
        if (messageStatus == 0) return 'Terkirim'
        return 'Terkirim' // fallback
    }

    // ✅ Helper untuk menentukan status color - GUNAKAN LOCAL STATE
    const getStatusColor = () => {
        if (isSending) return 'text-yellow-300'
        if (messageStatus == 1) return 'text-green-300'
        return 'text-blue-200'
    }

    return (
        <div className={`flex mb-4 group relative ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
            <div
                className="relative max-w-md"
                onMouseEnter={() => setShowOptions(true)}
                onMouseLeave={() => setShowOptions(false)}
            >
                {/* Reply Options */}
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
                        } ${isSending ? 'opacity-70' : ''}`}
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
                                {message.parent_user_id == (currentUserId || user?.id)
                                    ? 'Anda'
                                    : `User ${message.parent_user_id}`
                                }
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
                    <div className="text-sm break-words">
                        {message.message}
                        {isSending && isOwnMessage && ' (Mengirim...)'}
                    </div>

                    {/* Message Footer */}
                    <div
                        className={`flex justify-between items-center mt-1 ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                            }`}
                    >
                        {/* Timestamp */}
                        <div className="text-xs">
                            {new Date(message.created_at).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </div>

                        <div className="flex items-center gap-2">
                            {/* ✅ Status untuk pesan sendiri - GUNAKAN LOCAL STATE */}
                            {isOwnMessage && (
                                <div className="flex items-center gap-1">
                                    {isSending && (
                                        <div className="w-3 h-3 border-2 border-yellow-300 border-t-transparent rounded-full animate-spin"></div>
                                    )}
                                    <span className={`text-xs ${getStatusColor()}`}>
                                        {getStatusText()}
                                    </span>
                                    {/* Double check icon untuk read status */}
                                    {messageStatus == 1 && !isSending && (
                                        <svg
                                            className="w-3 h-3 text-green-300"
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
                                </div>
                            )}

                            {/* ✅ Unread indicator untuk pesan orang lain - GUNAKAN LOCAL STATE */}
                            {!isOwnMessage && messageStatus == 0 && !isSending && (
                                <div className="flex items-center gap-1">
                                    <span className="text-xs text-red-400 font-semibold">Baru</span>
                                    <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}