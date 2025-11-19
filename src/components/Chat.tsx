// src/components/Chat.tsx
import { useChat } from '../hooks/useChat'
import { useAuthStore } from '../stores/authStore'
import ChatSidebar from './ChatSidebar'
import MessageBubble from './MessageBubble'
import ReplyPreview from './ReplyPreview'
import AddContactModal from './AddContactModal'
import { socket } from '../utils/socket'
import { useState, useRef, useEffect } from 'react'
import VoiceRecorder from './VoiceRecorder'

// Konfigurasi jenis file yang diizinkan
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
        label: 'Media (Audio/Video)'
    }
}

export default function Chat() {
    const { user, logout } = useAuthStore()
    const [isSendingVoice, setIsSendingVoice] = useState(false)
    const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
    const [showSidebar, setShowSidebar] = useState(false) // ✅ State untuk sidebar mobile

    // State untuk preview file yang akan dikirim
    const [filePreview, setFilePreview] = useState<{
        file: File
        type: 'images' | 'documents' | 'media'
        url: string
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
        setMessage,
        setShowAddContactModal,
        setReplyingTo,
        loadMessages,
        sendMessage,
        selectContact,
        markAsRead,
        loadUnreadCount
    } = useChat()

    // === Tekan ESC untuk menutup chat aktif ===
    useEffect(() => {
        const handleEscKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && roomId) {
                selectContact(null)
                setMessage('')
                if (filePreview) removeFilePreview()
                if (replyingTo) cancelReply()
                setShowVoiceRecorder(false)
                setShowSidebar(false) // ✅ Juga tutup sidebar di mobile
            }
        }

        document.addEventListener('keydown', handleEscKey)
        return () => {
            document.removeEventListener('keydown', handleEscKey)
        }
    }, [roomId, filePreview, replyingTo, selectContact, setMessage])

    // === Auto close sidebar ketika memilih kontak di mobile ===
    useEffect(() => {
        if (roomId && window.innerWidth < 768) {
            setShowSidebar(false)
        }
    }, [roomId])

    // === Fungsi untuk toggle sidebar di mobile ===
    const toggleSidebar = () => {
        setShowSidebar(!showSidebar)
    }

    // === Fungsi untuk select contact dengan auto close sidebar di mobile ===
    const handleContactSelect = (contact: any) => {
        selectContact(contact)
        if (window.innerWidth < 768) {
            setShowSidebar(false)
        }
    }

    // === Fungsi untuk toggle voice recorder ===
    const toggleVoiceRecorder = () => {
        setShowVoiceRecorder(!showVoiceRecorder)
        if (showVoiceRecorder) {
            setTimeout(() => {
                const textInput = document.querySelector('input[type="text"]') as HTMLInputElement
                textInput?.focus()
            }, 100)
        }
    }

    // === Fungsi untuk cancel voice recording ===
    const handleCancelVoice = () => {
        setShowVoiceRecorder(false)
    }

    // === Kirim pesan suara ===
    const handleSendVoice = async (audioData: {
        file: string
        file_name: string
        file_type: string
        transcript: string
    }) => {
        if (!roomId) return

        setIsSendingVoice(true)
        try {
            console.log("🎤 Sending voice message:", {
                fileName: audioData.file_name,
                fileType: audioData.file_type,
                transcript: audioData.transcript
            })

            const voiceMessageData = {
                file: audioData.file,
                file_name: audioData.file_name,
                file_type: audioData.file_type,
                message_type: "audio"
            }

            await sendMessage(audioData.transcript, voiceMessageData)
            console.log("✅ Voice message sent successfully")
            setShowVoiceRecorder(false)

        } catch (error) {
            console.error('Error sending voice message:', error)
            alert('Gagal mengirim pesan suara')
        } finally {
            setIsSendingVoice(false)
        }
    }

    // === Pilih file dari komputer ===
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        const fileType = getFileType(file.type)
        if (!fileType) {
            alert('Jenis file tidak didukung. Pilih gambar, dokumen, atau file media.')
            return
        }

        const config = FILE_CONFIG[fileType]
        if (file.size > config.maxSize) {
            alert(`File terlalu besar. Maksimal ${config.maxSize / 1024 / 1024}MB untuk ${config.label}.`)
            return
        }

        const fileUrl = URL.createObjectURL(file)
        setFilePreview({ file, type: fileType, url: fileUrl })

        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    // === Tentukan kategori file berdasarkan MIME type ===
    const getFileType = (mimeType: string): 'images' | 'documents' | 'media' | null => {
        if (FILE_CONFIG.images.types.includes(mimeType)) return 'images'
        if (FILE_CONFIG.documents.types.includes(mimeType)) return 'documents'
        if (FILE_CONFIG.media.types.includes(mimeType)) return 'media'
        return null
    }

    // === Kirim pesan + lampiran file ===
    const handleSendWithFile = async () => {
        if (!filePreview || !roomId) return

        setIsUploading(true)
        try {
            const base64File = await fileToBase64(filePreview.file)

            const fileData = {
                file: base64File,
                file_name: filePreview.file.name,
                file_type: filePreview.file.type
            }

            await sendMessage(message.trim(), fileData)
            setFilePreview(null)
            setMessage('')
            setReplyingTo(null)
        } catch (error) {
            console.error('Gagal mengonversi file ke base64:', error)
            alert('Gagal mengirim file. Silakan coba lagi.')
        } finally {
            setIsUploading(false)
        }
    }

    // === Konversi file menjadi base64 ===
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = () => {
                const result = reader.result as string
                resolve(result.split(',')[1])
            }
            reader.onerror = reject
        })
    }

    // === Kirim pesan (teks saja atau dengan file) ===
    const handleSendMessage = () => {
        if (filePreview) {
            handleSendWithFile()
        } else if (message.trim()) {
            sendMessage(message)
            setMessage('')
        }
    }

    // === Hapus preview file ===
    const removeFilePreview = () => {
        if (filePreview) {
            URL.revokeObjectURL(filePreview.url)
            setFilePreview(null)
        }
    }

    // === Balas pesan ===
    const handleReply = (msg: any) => {
        setReplyingTo(msg)
    }

    // === Batalkan balasan ===
    const cancelReply = () => {
        setReplyingTo(null)
    }


    // === Logout dari aplikasi ===


    // === Ambil nama lawan chat ===
    const getChatPartnerName = () => {
        if (!roomId || !user) return 'Unknown'

        const contact = contacts.find(c => c.room_id === roomId)
        if (contact) return contact.name || `User ${contact.user_id}`

        const otherId = roomId.split('_').find(id => id !== String(user.id))
        return otherId ? `User ${otherId}` : 'Unknown User'
    }

    // Jumlah pesan belum dibaca di room aktif
    const currentRoomUnread = getUnreadCountForRoom(roomId)

    return (
        <div className=" bg-white ">
            <AddContactModal
                isOpen={showAddContactModal}
                onClose={() => setShowAddContactModal(false)}
            />

            {/* Mobile Header dengan Hamburger Menu */}
            <div className="md:hidden mb-4 bg-white rounded-lg shadow-md p-4 flex items-center justify-between">
                <button
                    onClick={toggleSidebar}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <h1 className="text-xl font-bold text-gray-800">Chat App</h1>
                <div className="w-6 h-6"></div> {/* Spacer untuk balance */}
            </div>

            <div className="w-full mx-auto bg-white rounded-lg shadow-md flex relative min-h-[96dvh]">
                {/* Sidebar Daftar Kontak */}
                <div className={`
                    ${showSidebar ? 'translate-x-0' : '-translate-x-full'} 
                    md:translate-x-0 md:relative
                    fixed inset-0 z-40 md:z-auto
                    w-80 md:w-1/3
                    transition-transform duration-300 ease-in-out
                    bg-white md:bg-transparent
                `}>
                    <ChatSidebar
                        contacts={contacts}
                        activeRoom={activeRoom}
                        searchQuery={searchQuery}
                        onSearchChange={() => { }}
                        onContactSelect={handleContactSelect} // ✅ Gunakan fungsi baru
                        onAddContact={() => setShowAddContactModal(true)}
                        unreadCounts={unreadCounts}
                        getUnreadCountForRoom={getUnreadCountForRoom}
                        onCloseSidebar={() => setShowSidebar(false)} // ✅ Props untuk close sidebar
                    />
                </div>

                {/* Backdrop untuk mobile */}
                {showSidebar && (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
                        onClick={() => setShowSidebar(false)}
                    />
                )}

                {/* Area Chat Utama */}
                <div className="w-full md:w-2/3 flex flex-col">
                    {/* Header Chat */}
                    {roomId ? (
                        <div className="p-4 border-b border-gray-300 bg-gray-50">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">

                                    <div>
                                        <h2 className="font-semibold text-gray-800">
                                            Chat dengan {getChatPartnerName()}
                                        </h2>
                                        <p className="text-sm text-gray-500">
                                            Room: {roomId}
                                        </p>
                                    </div>
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

                            </div>

                        </div>
                    ) : (
                        <></>
                        // <div className="p-4 border-b border-gray-300 bg-gray-50 text-center text-gray-500">
                        //     {searchQuery.trim() ? 'Pilih kontak dari hasil pencarian' : 'Pilih kontak untuk memulai percakapan'}
                        // </div>
                    )}

                    {/* Daftar Pesan */}
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50 h-96 messages-container">
                        {isLoading ? (
                            <div className="text-center text-gray-500 mt-8">Memuat pesan...</div>
                        ) : messages.length === 0 ? (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                                <div className="flex flex-col items-center justify-center space-y-4">
                                    {/* Icon Surat */}
                                    <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                                        <svg
                                            className="w-10 h-10 text-gray-400"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={1.5}
                                                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                            />
                                        </svg>
                                    </div>

                                    {/* Teks */}
                                    <div className="text-center">
                                        <p className="text-lg font-medium text-gray-500 mb-1">
                                            Pilih kontak untuk melihat pesan
                                        </p>
                                        <p className="text-sm text-gray-400">
                                            Mulai percakapan dengan memilih kontak dari daftar
                                        </p>
                                    </div>
                                </div>
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

                    {/* Input Chat - Hanya muncul jika ada room aktif */}
                    {roomId && (
                        <>
                            {/* File Preview */}
                            {filePreview && (
                                <div className="mx-4 mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {filePreview.type === 'images' ? (
                                                <img
                                                    src={filePreview.url}
                                                    alt="Preview"
                                                    className="w-12 h-12 object-cover rounded-lg"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
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
                                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Preview Balasan */}
                            <ReplyPreview replyingTo={replyingTo} onCancel={cancelReply} />

                            {/* Input Area */}
                            <div className="p-4 border-t border-gray-200 bg-white">

                                {/* Voice Recorder - Tampil di atas input area */}
                                {showVoiceRecorder && (
                                    <div className="mb-4">
                                        <VoiceRecorder
                                            onSendVoice={handleSendVoice}
                                            onCancel={handleCancelVoice}
                                            disabled={isUploading || !roomId}
                                        />
                                    </div>
                                )}

                                {/* Main Input Area - selalu tampil */}
                                <div className="flex gap-2">
                                    {/* File Attachment */}
                                    <div className="relative">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileSelect}
                                            accept={Object.values(FILE_CONFIG).flatMap(c => c.types).join(',')}
                                            className="hidden"
                                            disabled={isUploading || isSendingVoice || showVoiceRecorder}
                                        />
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploading || isSendingVoice || showVoiceRecorder}
                                            className="p-3 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-xl transition-colors disabled:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Lampirkan file"
                                        >
                                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Text Input - disembunyikan ketika voice recorder aktif */}
                                    {!showVoiceRecorder && (
                                        <input
                                            type="text"
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                            placeholder={replyingTo ? 'Ketik balasan...' : 'Ketik pesan...'}
                                            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                                            disabled={isUploading || isSendingVoice}
                                            ref={(input) => {
                                                if (input && !showVoiceRecorder) {
                                                    setTimeout(() => input.focus(), 100)
                                                }
                                            }}
                                        />
                                    )}

                                    {/* Voice Recorder Toggle Button */}
                                    <button
                                        onClick={toggleVoiceRecorder}
                                        disabled={isUploading || isSendingVoice || !roomId}
                                        className={`p-3 rounded-xl transition-colors ${showVoiceRecorder
                                            ? 'bg-red-500 hover:bg-red-600 text-white'
                                            : 'bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-600'
                                            } disabled:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed`}
                                        title={showVoiceRecorder ? "Tutup perekam suara" : "Rekam pesan suara"}
                                    >
                                        {showVoiceRecorder ? (
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                                                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                                            </svg>
                                        )}
                                    </button>

                                    {/* Send Button - disembunyikan ketika voice recorder aktif */}
                                    {!showVoiceRecorder && (
                                        <button
                                            onClick={handleSendMessage}
                                            disabled={(!message.trim() && !filePreview) || isUploading || isSendingVoice}
                                            className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2 min-w-[100px] justify-center"
                                        >
                                            {isUploading ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    <span className="hidden sm:inline">Upload</span>
                                                </>
                                            ) : filePreview ? (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                    </svg>
                                                    <span className="hidden sm:inline">Kirim</span>
                                                </>
                                            ) : replyingTo ? (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                                    </svg>
                                                    <span className="hidden sm:inline">Balas</span>
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                    </svg>
                                                    <span className="hidden sm:inline">Kirim</span>
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>

                                {/* File Type Hints - hanya ketika tidak ada voice recorder */}
                                {!showVoiceRecorder && (
                                    <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-3">
                                        <span className="flex items-center gap-1">
                                            <span>📷</span>
                                            <span>Gambar (5MB)</span>
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span>📄</span>
                                            <span>Dokumen (10MB)</span>
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span>🎵</span>
                                            <span>Media (25MB)</span>
                                        </span>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Badge Total Pesan Belum Dibaca */}
            {/* {unreadCounts.total_unread > 0 && (
                <div className="fixed bottom-4 right-4 bg-red-500 text-white px-3 py-2 rounded-full shadow-lg z-50">
                    Total Belum Dibaca: {unreadCounts.total_unread}
                </div>
            )} */}

            {/* Tombol Logout */}

        </div>
    )
}