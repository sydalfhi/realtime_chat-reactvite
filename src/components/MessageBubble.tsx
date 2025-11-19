// src/components/MessageBubble.tsx
import { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { socket } from '../utils/socket'
import type { Message } from '../types/chat'
import VoiceMessage from './VoiceMessage'

interface MessageBubbleProps {
    message: Message
    onReply: (message: Message) => void
    currentUserId?: string
}

export default function MessageBubble({ message, onReply, currentUserId, activeContact }: MessageBubbleProps) {
    const { user } = useAuthStore()
    const [showOptions, setShowOptions] = useState(false)
    const [messageStatus, setMessageStatus] = useState(message.status || 0)
    const [isSending, setIsSending] = useState(message.isSending || false)
    const [hasError, setHasError] = useState(false)
    const [imageLoaded, setImageLoaded] = useState(false)
    const [imageError, setImageError] = useState(false)

    const isOwnMessage = message.user_id == (currentUserId || user?.id)
    const BASE_URL = 'https://payroll-trial.profaskes.id'

    const fileUrl = message.file_url
        ? message.file_url.startsWith('http')
            ? message.file_url
            : message.file_url.startsWith('/uploads')
                ? `${BASE_URL}/panel${message.file_url}`
                : `${BASE_URL}${message.file_url}`
        : null

    // Status updates
    useEffect(() => {
        if (message.status !== undefined) {
            setMessageStatus(message.status)
        }
        if (message.isSending !== undefined) {
            setIsSending(message.isSending)
        }
    }, [message.status, message.isSending])

    // Socket events
    useEffect(() => {
        const handleMessageSaved = (savedMessage: any) => {
            if (savedMessage.temporaryId == message.id || savedMessage.id == message.id) {
                setIsSending(false)
                setMessageStatus(savedMessage.status || 0)
                setHasError(false)
            }
        }

        const handleMessageFailed = (data: any) => {
            if (data.temporaryId == message.id) {
                setIsSending(false)
                setHasError(true)
            }
        }

        const handleMarkedRead = (data: any) => {
            if (data.room_id == message.room_id && isOwnMessage) {
                setMessageStatus(1)
            }
        }

        socket.on('chat:message-saved', handleMessageSaved)
        socket.on('chat:message-failed', handleMessageFailed)
        socket.on('chat:marked-read', handleMarkedRead)

        return () => {
            socket.off('chat:message-saved', handleMessageSaved)
            socket.off('chat:message-failed', handleMessageFailed)
            socket.off('chat:marked-read', handleMarkedRead)
        }
    }, [message.id, message.room_id, isOwnMessage])

    const getStatusText = () => {
        if (hasError) return 'Gagal'
        if (isSending) return 'Mengirim...'
        if (messageStatus == 1) return 'Dibaca'
        return 'Terkirim'
    }

    const getStatusColor = () => {
        if (hasError) return 'text-red-400'
        if (isSending) return 'text-yellow-400'
        if (messageStatus == 1) return 'text-green-400'
        return 'text-blue-100'
    }

    const formatFileSize = (bytes: number) => {
        if (bytes == 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const renderMessageContent = () => {
        switch (message.message_type) {
            case 'image':
                return (
                    <div className="space-y-3">
                        {fileUrl && (
                            <div className="relative">
                                {!imageLoaded && !imageError && (
                                    <div className="w-64 h-48 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse rounded-xl flex items-center justify-center">
                                        <div className="text-gray-500 text-sm">Memuat gambar...</div>
                                    </div>
                                )}
                                <img
                                    src={fileUrl}
                                    alt={message.message || 'Gambar'}
                                    className={`rounded-xl max-w-xs object-cover cursor-pointer transition-all duration-300 ${imageLoaded ? 'block' : 'hidden'
                                        } ${isOwnMessage ? 'shadow-lg' : 'shadow-md'}`}
                                    onLoad={() => setImageLoaded(true)}
                                    onError={() => setImageError(true)}
                                    onClick={() => window.open(fileUrl, '_blank')}
                                />
                                {imageError && (
                                    <div className="w-64 h-48 bg-red-50 border border-red-200 rounded-xl flex items-center justify-center">
                                        <div className="text-red-600 text-sm text-center">
                                            <div>❌ Gagal memuat gambar</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        {message.message && message.message !== 'Mengirim gambar' && (
                            <div className={`text-sm px-3 py-2 rounded-lg backdrop-blur-sm ${isOwnMessage
                                ? 'text-white/90 bg-white/10'
                                : 'text-gray-700 bg-gray-100'
                                }`}>
                                {message.message}
                            </div>
                        )}
                    </div>
                )

            case 'document':
                return (
                    <div className="space-y-3">
                        {fileUrl && (
                            <a
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-200 backdrop-blur-sm border ${isOwnMessage
                                    ? 'bg-white/10 hover:bg-white/15 border-white/20 text-white'
                                    : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-800'
                                    }`}
                            >
                                <div className={`flex-shrink-0 p-3 rounded-lg ${isOwnMessage ? 'bg-white/10' : 'bg-white'
                                    }`}>
                                    <svg className={`w-6 h-6 ${isOwnMessage ? 'text-white' : 'text-gray-600'
                                        }`} fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium truncate ${isOwnMessage ? 'text-white' : 'text-gray-800'
                                        }`}>
                                        {message.file_name || 'Document'}
                                    </p>
                                    <p className={`text-xs mt-1 ${isOwnMessage ? 'text-white/70' : 'text-gray-500'
                                        }`}>
                                        {message.file_type?.split('/')[1]?.toUpperCase() || 'FILE'} • {formatFileSize(message.file_size || 0)}
                                    </p>
                                </div>
                                <div className="flex-shrink-0">
                                    <svg className={`w-5 h-5 ${isOwnMessage ? 'text-white/70' : 'text-gray-500'
                                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                </div>
                            </a>
                        )}
                        {message.message && message.message !== 'Mengirim dokumen' && (
                            <div className={`text-sm px-3 py-2 rounded-lg backdrop-blur-sm ${isOwnMessage
                                ? 'text-white/90 bg-white/10'
                                : 'text-gray-700 bg-gray-100'
                                }`}>
                                {message.message}
                            </div>
                        )}
                    </div>
                )

            case 'video':
                return (
                    <div className="space-y-3">
                        {fileUrl && (
                            <div className="max-w-xs">
                                <video
                                    controls
                                    preload="metadata" // ✅ Tidak download full video sampai diputar
                                    className="rounded-xl shadow-lg w-full"
                                    poster={isOwnMessage ?
                                        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180' viewBox='0 0 320 180'%3E%3Crect width='320' height='180' fill='%233b82f6'/%3E%3Cpath d='M120 80v20l30-10z' fill='white'/%3E%3C/svg%3E" :
                                        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180' viewBox='0 0 320 180'%3E%3Crect width='320' height='180' fill='%239ca3af'/%3E%3Cpath d='M120 80v20l30-10z' fill='white'/%3E%3C/svg%3E"
                                    }
                                >
                                    <source src={fileUrl} type={message.file_type || 'video/mp4'} />
                                    Browser Anda tidak mendukung pemutar video.
                                </video>
                            </div>
                        )}
                        {message.message && message.message !== 'Mengirim video' && (
                            <div className={`text-sm px-3 py-2 rounded-lg backdrop-blur-sm ${isOwnMessage
                                ? 'text-white/90 bg-white/10'
                                : 'text-gray-700 bg-gray-100'
                                }`}>
                                {message.message}
                            </div>
                        )}
                    </div>
                )

            case 'audio':
            case 'file':
                if (message.file_type?.startsWith('audio/') || message.message_type == 'audio') {
                    return (
                        <VoiceMessage
                            transcript={message.message || '🎤 Pesan suara'}
                            audioUrl={fileUrl || ''}
                            isOwnMessage={isOwnMessage}
                        />
                    )
                }
                // Fallback untuk file non-audio
                return (
                    <div className="space-y-3">
                        {fileUrl && (
                            <a
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-200 backdrop-blur-sm border ${isOwnMessage
                                    ? 'bg-white/10 hover:bg-white/15 border-white/20 text-white'
                                    : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-800'
                                    }`}
                            >
                                <div className={`flex-shrink-0 p-3 rounded-lg ${isOwnMessage ? 'bg-white/10' : 'bg-white'
                                    }`}>
                                    <svg className={`w-6 h-6 ${isOwnMessage ? 'text-white' : 'text-gray-600'
                                        }`} fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium truncate ${isOwnMessage ? 'text-white' : 'text-gray-800'
                                        }`}>
                                        {message.file_name || 'File'}
                                    </p>
                                    <p className={`text-xs mt-1 ${isOwnMessage ? 'text-white/70' : 'text-gray-500'
                                        }`}>
                                        {message.file_type?.split('/')[1]?.toUpperCase() || 'FILE'} • {formatFileSize(message.file_size || 0)}
                                    </p>
                                </div>
                                <div className="flex-shrink-0">
                                    <svg className={`w-5 h-5 ${isOwnMessage ? 'text-white/70' : 'text-gray-500'
                                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                </div>
                            </a>
                        )}
                        {message.message && message.message !== 'Mengirim file' && (
                            <div className={`text-sm px-3 py-2 rounded-lg backdrop-blur-sm ${isOwnMessage
                                ? 'text-white/90 bg-white/10'
                                : 'text-gray-700 bg-gray-100'
                                }`}>
                                {message.message}
                            </div>
                        )}
                    </div>
                )

            default:
                return (
                    <div className={`text-sm leading-relaxed ${isOwnMessage ? 'text-white/90' : 'text-gray-800'
                        }`}>
                        {message.message}
                        {isOwnMessage && isSending && (
                            <span className="text-xs opacity-70 ml-2">✈️</span>
                        )}
                    </div>
                )
        }
    }

    return (
        <div className={`flex mb-6 group relative ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
            <div
                className="relative max-w-lg"
                onMouseEnter={() => setShowOptions(true)}
                onMouseLeave={() => setShowOptions(false)}
            >
                {/* Reply Options */}
                <div
                    className={`absolute -top-10 z-10 transition-all duration-300 ${isOwnMessage ? 'right-0' : 'left-0'
                        } ${showOptions
                            ? 'opacity-100 visible translate-y-0'
                            : 'opacity-0 invisible translate-y-2'
                        }`}
                >
                    <button
                        onClick={() => onReply(message)}
                        className="bg-gray-800/90 text-white text-xs px-3 py-2 rounded-lg hover:bg-gray-700/90 transition-all duration-200 backdrop-blur-sm shadow-lg flex items-center gap-1"
                    >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        Balas
                    </button>
                </div>

                {/* Message Bubble */}
                <div
                    className={`relative px-2 py-2 min-w-[10dvw] rounded-sm backdrop-blur-sm transition-all duration-300 ${isOwnMessage
                        ? hasError
                            ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg'
                            : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg'
                        : 'bg-gradient-to-br from-white to-gray-50 text-gray-800 shadow-md border border-gray-200'
                        } ${isSending ? 'opacity-80' : 'hover:shadow-xl'}`}
                >
                    {/* Error Message */}
                    {hasError && (
                        <div className={`flex items-center gap-2 mb-3 text-xs px-3 py-2 rounded-lg ${isOwnMessage
                            ? 'text-yellow-200 bg-yellow-500/20'
                            : 'text-yellow-700 bg-yellow-100'
                            }`}>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Gagal mengirim, coba lagi
                        </div>
                    )}

                    {/* Replied Message Preview */}
                    {message.parent_message && (
                        <div
                            className={`mb-2 p-3 rounded-lg border-l-4 ${isOwnMessage
                                ? 'bg-blue-50 border-blue-400 text-blue-800'
                                : 'bg-gray-50 border-gray-400 text-gray-700'
                                }`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 bg-current rounded-full"></div>
                                <div className="font-semibold text-xs">
                                    {message.parent_user_id == user?.id
                                        ? 'Anda'
                                        : message.parent_user_id == activeContact.user_id
                                            ? activeContact.name
                                            : `${message.user_id}`
                                    }

                                </div>
                            </div>
                            <div className="text-sm truncate">
                                {message.parent_message_type == 'image' ? (
                                    <span className="flex items-center gap-1">
                                        <span>📷</span>
                                        <span>Gambar</span>
                                    </span>
                                ) : message.parent_message_type == 'document' ? (
                                    <span className="flex items-center gap-1">
                                        <span>📄</span>
                                        <span>Dokumen</span>
                                    </span>
                                ) : message.parent_message_type == 'video' ? (
                                    <span className="flex items-center gap-1">
                                        <span>🎥</span>
                                        <span>Video</span>
                                    </span>
                                ) : message.parent_message_type == 'audio' ? (
                                    <span className="flex items-center gap-1">
                                        <span>🎵</span>
                                        <span>Pesan Suara</span>
                                    </span>
                                ) : (
                                    <span className="italic">"{message.parent_message}"</span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Sender Name */}
                    {!isOwnMessage && (
                        <div className="flex items-center gap-3 mb-3">
                            {/* Avatar untuk active contact */}
                            <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 bg-gray-200 relative">
                                <img
                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activeContact.user_id}&radius=50`}
                                    alt={activeContact.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                    }}
                                />

                            </div>

                            <div className="font-semibold text-sm text-gray-700">
                                {activeContact.name}
                            </div>
                        </div>
                    )}

                    {/* Message Content */}
                    {renderMessageContent()}

                    {/* Message Footer */}
                    <div
                        className={`flex justify-between items-center mt-3 pt-2 border-t ${isOwnMessage
                            ? 'border-blue-400/30 text-blue-100'
                            : 'border-gray-300/30 text-gray-500'
                            }`}
                    >
                        <div className="text-xs">
                            {new Date(message.created_at).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </div>

                        <div className="flex items-center gap-2">
                            {isOwnMessage && (
                                <div className="flex items-center gap-1">
                                    {isSending && (
                                        <div className="w-3 h-3 border-2 border-yellow-300 border-t-transparent rounded-full animate-spin"></div>
                                    )}
                                    <span className={`text-xs ${getStatusColor()}`}>
                                        {getStatusText()}
                                    </span>
                                    {messageStatus == 1 && !isSending && !hasError && (
                                        <svg className="w-3 h-3 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </div>
                            )}

                            {!isOwnMessage && messageStatus == 0 && !isSending && (
                                <div className="flex items-center gap-1">
                                    <span className="text-xs text-red-500 font-semibold">Baru</span>
                                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}