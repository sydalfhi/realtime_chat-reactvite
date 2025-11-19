// src\components\Chat.tsx
import { useChat } from '../hooks/useChat'
import { useAuthStore } from '../stores/authStore'
import ChatSidebar from './ChatSidebar'
import MessageBubble from './MessageBubble'
import ReplyPreview from './ReplyPreview'
import AddContactModal from './AddContactModal'
import { socket } from '../utils/socket'
import { useState, useRef, useEffect } from 'react'
import VoiceRecorder from './VoiceRecorder';

// File type configuration
const FILE_CONFIG = {
    images: {
        types: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
        maxSize: 5 * 1024 * 1024, // 5MB
        label: 'Gambar'
    },
    documents: {
        types: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain'
        ],
        maxSize: 10 * 1024 * 1024, // 10MB
        label: 'Dokumen'
    },
    media: {
        types: [
            'audio/mpeg',
            'audio/wav',
            'video/mp4',
            'video/mpeg',
            'video/quicktime'
        ],
        maxSize: 25 * 1024 * 1024, // 25MB
        label: 'Media'
    }
}

export default function Chat() {
    const { user, logout } = useAuthStore()
    const [isSendingVoice, setIsSendingVoice] = useState(false);
    // State for file upload
    const [filePreview, setFilePreview] = useState<{
        file: File;
        type: 'image' | 'document' | 'media';
        url: string;
    } | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const {
        searchQuery,
        roomId,
        message,
        messages,
        contacts,
        activeRoom,
        showAddContactModal,
        replyingTo,
        isLoading,
        messagesEndRef,
        unreadCounts,
        isMarkingRead,
        getUnreadCountForRoom,
        setSearchQuery,
        setMessage,
        setShowAddContactModal,
        setReplyingTo,
        loadMessages,
        sendMessage,
        selectContact,
        markAsRead,
        loadUnreadCount
    } = useChat()

    // ✅ FIXED: Better ESC key handler
    useEffect(() => {
        const handleEscKey = (event: KeyboardEvent) => {
            if (event.key == 'Escape') {
                console.log('ESC pressed, current roomId:', roomId)

                // Only close if there's an active room
                if (roomId) {
                    console.log('Closing chat...')

                    // Approach 1: Direct state reset
                    // Clear active room by calling selectContact with null
                    if (selectContact) {
                        selectContact(null)
                    }

                    // Also clear any ongoing actions
                    if (filePreview) {
                        removeFilePreview()
                    }
                    if (replyingTo) {
                        cancelReply()
                    }

                    // Clear message input
                    setMessage('')
                }
            }
        }

        // Add event listener
        document.addEventListener('keydown', handleEscKey)
        console.log('ESC event listener added')

        // Cleanup
        return () => {
            document.removeEventListener('keydown', handleEscKey)
            console.log('ESC event listener removed')
        }
    }, [roomId, filePreview, replyingTo, selectContact, setMessage])

    // ✅ Alternative approach if selectContact doesn't work
    const closeChat = () => {
        console.log('Closing chat manually')

        // Try multiple approaches to ensure chat closes
        if (selectContact) {
            selectContact(null)
        }

        // Force clear by reloading the component state
        window.dispatchEvent(new CustomEvent('closeChat'))

        // Clear all states
        setMessage('')
        if (filePreview) {
            removeFilePreview()
        }
        if (replyingTo) {
            cancelReply()
        }
    }

    // Handle file selection
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        // Check file type and size
        const fileType = getFileType(file.type)
        if (!fileType) {
            alert('Jenis file tidak didukung. Silakan pilih file gambar, dokumen, atau media.')
            return
        }

        const config = FILE_CONFIG[fileType]
        if (file.size > config.maxSize) {
            alert(`File terlalu besar. Maksimal ${config.maxSize / 1024 / 1024}MB untuk ${config.label}.`)
            return
        }

        // Create preview
        const fileUrl = URL.createObjectURL(file)
        setFilePreview({
            file,
            type: fileType,
            url: fileUrl
        })

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    // Determine file type
    const getFileType = (mimeType: string): 'images' | 'documents' | 'media' | null => {
        if (FILE_CONFIG.images.types.includes(mimeType)) return 'images'
        if (FILE_CONFIG.documents.types.includes(mimeType)) return 'documents'
        if (FILE_CONFIG.media.types.includes(mimeType)) return 'media'
        return null
    }

    // Handle file upload and send
    // Di components/Chat.tsx - ganti fungsi handleSendWithFile
    const handleSendWithFile = async () => {
        if (!filePreview || !roomId) return;

        setIsUploading(true);
        try {
            // Convert file to base64
            const base64File = await fileToBase64(filePreview.file);

            // Prepare file data
            const fileData = {
                file: base64File,
                file_name: filePreview.file.name,
                file_type: filePreview.file.type
            };

            console.log("📤 Sending file:", {
                name: filePreview.file.name,
                type: filePreview.file.type,
                size: filePreview.file.size,
                base64_length: base64File.length
            });

            // Send message with file
            await sendMessage(message, fileData);

            // Clear states
            setFilePreview(null);
            setMessage("");
            setReplyingTo(null);

        } catch (error) {
            console.error('Error converting file to base64:', error);
            alert('Gagal mengkonversi file. Silakan coba lagi.');
        } finally {
            setIsUploading(false);
        }
    };

    // Helper function to convert file to base64
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                // Remove data:image/jpeg;base64, prefix jika ada
                const base64 = reader.result as string;
                const base64Data = base64.split(',')[1]; // Ambil bagian base64 saja
                resolve(base64Data);
            };
            reader.onerror = error => reject(error);
        });
    };

    // Enhanced send message handler
    const handleSendMessage = () => {
        if (filePreview) {
            handleSendWithFile();
        } else if (message.trim()) {
            sendMessage(message);
        }
    };

    // Remove file preview
    const removeFilePreview = () => {
        if (filePreview) {
            URL.revokeObjectURL(filePreview.url)
            setFilePreview(null)
        }
    }

    // Enhanced send message handler


    const handleReply = (message: any) => {
        console.log("🚀 ~ handleReply ~ message:", message)
        const replyData = {
            parent_id: message.id,
            ...message
        };
        console.log('💬 Replying to message:', replyData)
        setReplyingTo(replyData)
    }

    const cancelReply = () => {
        setReplyingTo(null)
    }

    const handleMarkAsRead = () => {
        if (roomId) {
            markAsRead(roomId);
        }
    }

    const handleLogout = () => {
        console.log('🚪 Logging out...')
        socket.disconnect()
        logout()
    }

    const getChatPartnerName = () => {
        if (!roomId || !user) return ''

        const contact = contacts.find(c => c.room_id == roomId)
        if (contact) return `User ${contact.user_id}`

        const otherUserId = roomId.split('_').find(id => id !== user.id)
        return otherUserId ? `User ${otherUserId}` : 'Unknown User'
    }

    const currentRoomUnread = getUnreadCountForRoom(roomId);

    // sound
    const handleSendVoice = async (audioData: {
        file: string;
        file_name: string;
        file_type: string;
        transcript: string;
    }) => {
        if (!roomId) return;

        setIsSendingVoice(true);
        try {
            console.log("🎤 Sending voice message:", {
                fileName: audioData.file_name,
                fileType: audioData.file_type,
                transcript: audioData.transcript
            });

            // Kirim sebagai file audio dengan transkrip sebagai message
            await sendMessage(audioData.transcript, {
                file: audioData.file,
                file_name: audioData.file_name,
                file_type: audioData.file_type
            });

        } catch (error) {
            console.error('Error sending voice message:', error);
            alert('Gagal mengirim pesan suara');
        } finally {
            setIsSendingVoice(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <AddContactModal
                isOpen={showAddContactModal}
                onClose={() => setShowAddContactModal(false)}
            />

            <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md flex">
                {/* Sidebar */}
                <ChatSidebar
                    contacts={contacts}
                    activeRoom={activeRoom}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    onContactSelect={selectContact}
                    onAddContact={() => setShowAddContactModal(true)}
                    unreadCounts={unreadCounts}
                    getUnreadCountForRoom={getUnreadCountForRoom}
                />

                {/* Main Chat Area */}
                <div className="w-2/3 flex flex-col">
                    {/* Chat Header */}
                    {roomId ? (
                        <div className="p-4 border-b border-gray-300 bg-gray-50">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <h2 className="font-semibold text-gray-800">
                                        Chat dengan {getChatPartnerName()}
                                    </h2>
                                    {currentRoomUnread > 0 && (
                                        <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                            {currentRoomUnread} unread
                                        </span>
                                    )}
                                    {isMarkingRead && (
                                        <span className="text-xs text-blue-500">
                                            Marking as read...
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => loadMessages(roomId)}
                                        className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                                    >
                                        Refresh
                                    </button>
                                    <button
                                        onClick={handleMarkAsRead}
                                        disabled={isMarkingRead || currentRoomUnread == 0}
                                        className="text-sm bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 disabled:bg-gray-400"
                                    >
                                        {isMarkingRead ? 'Marking...' : 'Mark Read'}
                                    </button>
                                    <button
                                        onClick={() => setShowAddContactModal(true)}
                                        className="text-sm bg-purple-500 text-white px-3 py-1 rounded hover:bg-purple-600"
                                    >
                                        + Kontak
                                    </button>
                                    {/* ✅ FIXED: Use closeChat function instead */}
                                    <button
                                        onClick={closeChat}
                                        className="text-sm bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600"
                                        title="Tutup chat (ESC)"
                                    >
                                        ✕ Tutup
                                    </button>
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                                Room: {roomId}
                                <span className="ml-2 text-xs text-blue-500">
                                    (Tekan ESC untuk menutup chat)
                                </span>
                            </p>
                        </div>
                    ) : (
                        <div className="p-4 border-b border-gray-300 bg-gray-50 text-center text-gray-500">
                            {searchQuery.trim() ? 'Pilih kontak dari hasil pencarian' : 'Pilih kontak untuk memulai percakapan'}
                        </div>
                    )}

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50 h-96 messages-container">
                        {isLoading ? (
                            <div className="text-center text-gray-500 mt-8">
                                Loading messages...
                            </div>
                        ) : messages.length == 0 ? (
                            <div className="text-center text-gray-500 mt-8">
                                {roomId ? 'Belum ada pesan dalam chat ini' : 'Pilih kontak untuk melihat pesan'}
                            </div>
                        ) : (
                            messages.map((msg, index) => (
                                <MessageBubble
                                    key={index}
                                    message={msg}
                                    onReply={handleReply}
                                    currentUserId={user?.id}
                                />
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* CONDITIONAL RENDERING: Only show chat input when room is selected */}
                    {roomId && (
                        <>
                            {/* File Preview */}
                            {filePreview && (
                                <div className="mx-4 mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {filePreview.type == 'images' ? (
                                                <img
                                                    src={filePreview.url}
                                                    alt="Preview"
                                                    className="w-12 h-12 object-cover rounded"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 bg-blue-100 rounded flex items-center justify-center">
                                                    <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-sm font-medium text-gray-800">
                                                    {filePreview.file.name}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {(filePreview.file.size / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={removeFilePreview}
                                            className="text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Reply Preview */}
                            <ReplyPreview
                                replyingTo={replyingTo}
                                onCancel={cancelReply}
                            />

                            {/* Send Message */}

                            <div className="flex gap-2">
                                {/* File Input Button */}
                                <div className="relative">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileSelect}
                                        accept={Object.values(FILE_CONFIG).flatMap(config => config.types).join(',')}
                                        className="hidden"
                                        disabled={isUploading || isSendingVoice}
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading || isSendingVoice}
                                        className="bg-gray-500 text-white p-2 rounded-md hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                        title="Lampirkan file"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Voice Recorder Button */}
                                <VoiceRecorder
                                    onSendVoice={handleSendVoice}
                                    disabled={isUploading || !roomId}
                                />

                                <input
                                    type="text"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key == 'Enter') {
                                            handleSendMessage()
                                        }
                                    }}
                                    placeholder={replyingTo ? `Balas pesan...` : "Ketik pesan..."}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isUploading || isSendingVoice}
                                />

                                <button
                                    onClick={handleSendMessage}
                                    disabled={(!message.trim() && !filePreview) || isUploading || isSendingVoice}
                                    className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors flex items-center gap-2"
                                >
                                    {isUploading ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Uploading...
                                        </>
                                    ) : isSendingVoice ? (
                                        'Mengirim Suara...'
                                    ) : filePreview ? (
                                        'Kirim File'
                                    ) : replyingTo ? (
                                        'Balas'
                                    ) : (
                                        'Kirim'
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Total Unread Badge */}
            {unreadCounts.total_unread > 0 && (
                <div className="fixed bottom-4 right-4 bg-red-500 text-white px-3 py-2 rounded-full shadow-lg">
                    Total Unread: {unreadCounts.total_unread}
                </div>
            )}

            {/* Logout Button */}
            <div className="text-center mt-4">
                <button
                    onClick={handleLogout}
                    className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-md transition-colors"
                >
                    Logout
                </button>
            </div>
        </div>
    )
}