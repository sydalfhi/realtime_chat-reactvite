import { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { socket } from '../utils/socket'
import type { Message } from '../types/chat'


interface MessageBubbleProps {
    message: Message
    onReply: (message: Message) => void
    currentUserId?: string
}

export default function MessageBubble({ message, onReply, currentUserId }: MessageBubbleProps) {
    const { user } = useAuthStore()
    const [showOptions, setShowOptions] = useState(false)
    const [messageStatus, setMessageStatus] = useState(message.status || 0)
    const [isSending, setIsSending] = useState(message.isSending || false)
    const [hasError, setHasError] = useState(false)
    const [imageLoaded, setImageLoaded] = useState(false)
    const [imageError, setImageError] = useState(false)

    const isOwnMessage = message.user_id == (currentUserId || user?.id)
    const BASE_URL = 'https://payroll-trial.profaskes.id'

    // Di renderMessageContent(), ganti:
    const fileUrl = message.file_url
        ? message.file_url.startsWith('http')
            ? message.file_url
            : message.file_url.startsWith('/uploads')
                ? `${BASE_URL}/panel${message.file_url}`
                : `${BASE_URL}${message.file_url}`
        : null;
    // ✅ FIX: Listen untuk real-time status updates
    useEffect(() => {
        if (message.status !== undefined) {
            setMessageStatus(message.status)
        }
        if (message.isSending !== undefined) {
            setIsSending(message.isSending)
        }
    }, [message.status, message.isSending])

    // ✅ FIX: Listen untuk socket events dengan dependencies lengkap
    useEffect(() => {
        const handleMessageSaved = (savedMessage: any) => {
            if (savedMessage.temporaryId == message.id || savedMessage.id == message.id) {
                console.log(`💾 Message saved: ${message.id}`)
                setIsSending(false)
                setMessageStatus(savedMessage.status || 0)
                setHasError(false)
            }
        }

        const handleMessageFailed = (data: any) => {
            if (data.temporaryId == message.id) {
                console.log(`❌ Message failed: ${message.id}`)
                setIsSending(false)
                setHasError(true)
            }
        }

        const handleMarkedRead = (data: any) => {
            if (data.room_id == message.room_id && isOwnMessage) {
                console.log(`📖 Messages in room ${data.room_id} marked as read`)
                setMessageStatus(1)
            }
        }

        const handleMessageStatusUpdate = (data: any) => {
            if (data.message_id == message.id) {
                console.log(`🔄 Message ${message.id} status updated to ${data.status}`)
                setMessageStatus(data.status)
            }
        }

        socket.on('chat:message-saved', handleMessageSaved)
        socket.on('chat:message-failed', handleMessageFailed)
        socket.on('chat:marked-read', handleMarkedRead)
        socket.on('chat:message-status-update', handleMessageStatusUpdate)

        return () => {
            socket.off('chat:message-saved', handleMessageSaved)
            socket.off('chat:message-failed', handleMessageFailed)
            socket.off('chat:marked-read', handleMarkedRead)
            socket.off('chat:message-status-update', handleMessageStatusUpdate)
        }
    }, [message.id, message.room_id, isOwnMessage, message.status, message.isSending])

    // ✅ Helper untuk menentukan status text
    const getStatusText = () => {
        if (hasError) return 'Gagal'
        if (isSending) return 'Mengirim...'
        if (messageStatus == 1) return 'Dibaca'
        if (messageStatus == 0) return 'Terkirim'
        return 'Terkirim'
    }

    // ✅ Helper untuk menentukan status color
    const getStatusColor = () => {
        if (hasError) return 'text-red-300'
        if (isSending) return 'text-yellow-300'
        if (messageStatus == 1) return 'text-green-300'
        return 'text-blue-200'
    }

    // ✅ Helper untuk format file size
    const formatFileSize = (bytes: number) => {
        if (bytes == 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    // ✅ Render konten berdasarkan message_type
    const renderMessageContent = () => {
        switch (message.message_type) {
            case 'image':
                return (
                    <div className="space-y-2">
                        {fileUrl && (
                            <div className="max-w-xs relative">
                                {!imageLoaded && !imageError && (
                                    <div className="w-full h-32 bg-gray-300 animate-pulse rounded-lg flex items-center justify-center">
                                        <span className="text-xs text-gray-500">Loading gambar...</span>
                                    </div>
                                )}
                                <img
                                    src={fileUrl}
                                    alt={message.message || 'Gambar'}
                                    className={`rounded-lg max-w-full h-auto cursor-pointer ${imageLoaded ? 'block' : 'hidden'
                                        }`}
                                    onLoad={() => setImageLoaded(true)}
                                    onError={() => setImageError(true)}
                                    onClick={() => window.open(fileUrl, '_blank')}
                                />
                                {imageError && (
                                    <div className="text-xs text-red-500 p-2 bg-red-100 rounded">
                                        Gagal memuat gambar {fileUrl}
                                    </div>
                                )}
                            </div>
                        )}
                        {message.message && message.message !== 'Mengirim gambar' && (
                            <div className="text-sm break-words">
                                {message.message}
                            </div>
                        )}
                    </div>
                )

            case 'document':
            case 'file':
                return (
                    <div className="space-y-2">
                        {fileUrl && (
                            <a
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors cursor-pointer no-underline"
                            >
                                <div className="flex-shrink-0">
                                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">
                                        {message.file_name || 'Document'}
                                    </p>
                                    <p className="text-xs text-blue-100">
                                        {message.file_type || 'File'} • {formatFileSize(message.file_size || 0)}
                                    </p>
                                </div>
                                <div className="flex-shrink-0">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                </div>
                            </a>
                        )}
                        {message.message && message.message !== 'Mengirim dokumen' && (
                            <div className="text-sm break-words">
                                {message.message}
                            </div>
                        )}
                    </div>
                )

            case 'video':
                return (
                    <div className="space-y-2">
                        {fileUrl && (
                            <div className="max-w-xs">
                                <video
                                    controls
                                    className="rounded-lg max-w-full h-auto"
                                >
                                    <source src={fileUrl} type={message.file_type || 'video/mp4'} />
                                    Browser Anda tidak mendukung pemutar video.
                                </video>
                            </div>
                        )}
                        {message.message && message.message !== 'Mengirim video' && (
                            <div className="text-sm break-words">
                                {message.message}
                            </div>
                        )}
                    </div>
                )

            case 'audio':
                return (
                    <div className="space-y-2">
                        {fileUrl && (
                            <div className="bg-white bg-opacity-20 rounded-lg p-3">
                                <audio controls className="w-full">
                                    <source src={fileUrl} type={message.file_type || 'audio/mpeg'} />
                                    Browser Anda tidak mendukung pemutar audio.
                                </audio>
                            </div>
                        )}
                        {message.message && message.message !== 'Mengirim audio' && (
                            <div className="text-sm break-words">
                                {message.message}
                            </div>
                        )}
                    </div>
                )

            default: // text
                return (
                    <div className="text-sm break-words">
                        {message.message}
                        {/* Hanya tampilkan status jika pesan sendiri dan sedang sending */}
                        {isOwnMessage && isSending && (
                            <span className="text-xs opacity-70 ml-1">(Mengirim...)</span>
                        )}
                    </div>
                )
        }
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
                        ? hasError
                            ? 'bg-red-500 text-white rounded-br-md'
                            : 'bg-blue-500 text-white rounded-br-md'
                        : 'bg-gray-200 text-gray-800 rounded-bl-md'
                        } ${isSending ? 'opacity-70' : ''}`}
                >
                    {/* Error Message */}
                    {hasError && (
                        <div className="text-xs text-yellow-200 mb-1 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Gagal mengirim, coba lagi
                        </div>
                    )}

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
                            <div className="truncate">
                                {message.parent_message_type == 'image' ? '📷 Gambar' :
                                    message.parent_message_type == 'document' ? '📄 Dokumen' :
                                        message.parent_message_type == 'video' ? '🎥 Video' :
                                            message.parent_message_type == 'audio' ? '🎵 Audio' :
                                                message.parent_message}
                            </div>
                        </div>
                    )}

                    {/* Sender Name (only for others) */}
                    {!isOwnMessage && (
                        <div className="font-semibold text-sm text-gray-700 mb-1">
                            User {message.user_id}
                        </div>
                    )}

                    {/* Message Content */}
                    {/* <p>{JSON.stringify(message, null, 2)}</p> */}
                    {renderMessageContent()}

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
                            {/* Status untuk pesan sendiri */}
                            {isOwnMessage && (
                                <div className="flex items-center gap-1">
                                    {isSending && (
                                        <div className="w-3 h-3 border-2 border-yellow-300 border-t-transparent rounded-full animate-spin"></div>
                                    )}
                                    <span className={`text-xs ${getStatusColor()}`}>
                                        {getStatusText()}
                                    </span>
                                    {/* Double check icon untuk read status */}
                                    {messageStatus == 1 && !isSending && !hasError && (
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
                                    {/* Error icon */}
                                    {hasError && (
                                        <svg
                                            className="w-3 h-3 text-red-300"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    )}
                                </div>
                            )}

                            {/* Unread indicator untuk pesan orang lain */}
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