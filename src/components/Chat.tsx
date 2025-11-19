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

    // === Tekan ESC untuk menutup chat aktif ===
    useEffect(() => {
        const handleEscKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && roomId) {
                // console.log('ESC ditekan, menutup chat...')
                selectContact(null)
                setMessage('')
                if (filePreview) removeFilePreview()
                if (replyingTo) cancelReply()
            }
        }

        document.addEventListener('keydown', handleEscKey)
        // console.log('Event listener ESC ditambahkan')

        return () => {
            document.removeEventListener('keydown', handleEscKey)
            // console.log('Event listener ESC dihapus')
        }
    }, [roomId, filePreview, replyingTo, selectContact, setMessage])

    // === Tutup chat secara manual (tombol X) ===
    const closeChat = () => {
        // console.log('Menutup chat secara manual')
        selectContact(null)
        setMessage('')
        if (filePreview) removeFilePreview()
        if (replyingTo) cancelReply()
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

        // Reset input agar bisa pilih file yang sama lagi
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

            // console.log('Mengirim file:', filePreview.file.name, filePreview.file.size)

            await sendMessage(message.trim(), fileData)

            // Bersihkan setelah berhasil terkirim
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

    // === Konversi file menjadi base64 (tanpa prefix data:...) ===
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = () => {
                const result = reader.result as string
                resolve(result.split(',')[1]) // Ambil hanya bagian base64
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
        // console.log('Membalas pesan:', msg.id)
        setReplyingTo(msg)
    }

    // === Batalkan balasan ===
    const cancelReply = () => {
        setReplyingTo(null)
    }

    // === Tandai semua pesan di room ini sudah dibaca ===
    const handleMarkAsRead = () => {
        if (roomId) markAsRead(roomId)
    }

    // === Logout dari aplikasi ===
    const handleLogout = () => {
        // console.log('Logout...')
        socket.disconnect()
        logout()
    }

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

    // === Kirim pesan suara dari VoiceRecorder ===
    const handleSendVoice = async (audioData: {
        file: string
        file_name: string
        file_type: string
        transcript: string
    }) => {
        if (!roomId) return

        setIsSendingVoice(true)
        try {
            // console.log('Mengirim pesan suara...')

            const voiceData = {
                file: audioData.file,
                file_name: audioData.file_name,
                file_type: audioData.file_type
            }

            await sendMessage(audioData.transcript || '(Pesan suara)', voiceData)
            // console.log('Pesan suara terkirim')
        } catch (error) {
            console.error('Gagal mengirim pesan suara:', error)
            alert('Gagal mengirim pesan suara')
        } finally {
            setIsSendingVoice(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <AddContactModal
                isOpen={showAddContactModal}
                onClose={() => setShowAddContactModal(false)}
            />

            <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md flex">
                {/* Sidebar Daftar Kontak */}
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

                {/* Area Chat Utama */}
                <div className="w-2/3 flex flex-col">
                    {/* Header Chat */}
                    {roomId ? (
                        <div className="p-4 border-b border-gray-300 bg-gray-50">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <h2 className="font-semibold text-gray-800">
                                        Chat dengan {getChatPartnerName()}
                                    </h2>
                                    {currentRoomUnread > 0 && (
                                        <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                            {currentRoomUnread} belum dibaca
                                        </span>
                                    )}
                                    {isMarkingRead && (
                                        <span className="text-xs text-blue-500">
                                            Menandai sebagai dibaca...
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
                                        disabled={isMarkingRead || currentRoomUnread === 0}
                                        className="text-sm bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 disabled:bg-gray-400"
                                    >
                                        {isMarkingRead ? 'Memproses...' : 'Tandai Dibaca'}
                                    </button>
                                    <button
                                        onClick={() => setShowAddContactModal(true)}
                                        className="text-sm bg-purple-500 text-white px-3 py-1 rounded hover:bg-purple-600"
                                    >
                                        + Kontak
                                    </button>
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
                                Room ID: {roomId}
                                <span className="ml-2 text-xs text-blue-500">
                                    (Tekan ESC untuk menutup)
                                </span>
                            </p>
                        </div>
                    ) : (
                        <div className="p-4 border-b border-gray-300 bg-gray-50 text-center text-gray-500">
                            {searchQuery.trim() ? 'Pilih kontak dari hasil pencarian' : 'Pilih kontak untuk memulai chat'}
                        </div>
                    )}

                    {/* Daftar Pesan */}
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50 h-96 messages-container">
                        {isLoading ? (
                            <div className="text-center text-gray-500 mt-8">Memuat pesan...</div>
                        ) : messages.length === 0 ? (
                            <div className="text-center text-gray-500 mt-8">
                                {roomId ? 'Belum ada pesan di chat ini' : 'Pilih kontak untuk melihat pesan'}
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
                        <div className="p-4 border-t border-gray-300 bg-white">
                            {/* Preview File */}
                            {filePreview && (
                                <div className="mx-4 mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {filePreview.type === 'images' ? (
                                                <img src={filePreview.url} alt="Preview" className="w-12 h-12 object-cover rounded" />
                                            ) : (
                                                <div className="w-12 h-12 bg-blue-100 rounded flex items-center justify-center">
                                                    <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-sm font-medium text-gray-800">{filePreview.file.name}</p>
                                                <p className="text-xs text-gray-500">
                                                    {(filePreview.file.size / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                            </div>
                                        </div>
                                        <button onClick={removeFilePreview} className="text-gray-400 hover:text-red-500">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Preview Balasan */}
                            <ReplyPreview replyingTo={replyingTo} onCancel={cancelReply} />

                            {/* Tombol Lampir & Input */}
                            <div className="flex gap-2 mt-3">
                                {/* Tombol Lampirkan File */}
                                <div className="relative">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileSelect}
                                        accept={Object.values(FILE_CONFIG).flatMap(c => c.types).join(',')}
                                        className="hidden"
                                        disabled={isUploading || isSendingVoice}
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading || isSendingVoice}
                                        className="bg-gray-500 text-white p-2 rounded-md hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                        title="Lampirkan file"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Rekam Suara */}
                                <VoiceRecorder onSendVoice={handleSendVoice} disabled={isUploading || !roomId} />

                                {/* Input Teks */}
                                <input
                                    type="text"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                    placeholder={replyingTo ? 'Balas pesan...' : 'Ketik pesan...'}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isUploading || isSendingVoice}
                                />

                                {/* Tombol Kirim */}
                                <button
                                    onClick={handleSendMessage}
                                    disabled={(!message.trim() && !filePreview) || isUploading || isSendingVoice}
                                    className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                >
                                    {isUploading ? (
                                        <>Uploading...</>
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
                        </div>
                    )}
                </div>
            </div>

            {/* Badge Total Pesan Belum Dibaca */}
            {unreadCounts.total_unread > 0 && (
                <div className="fixed bottom-4 right-4 bg-red-500 text-white px-3 py-2 rounded-full shadow-lg z-50">
                    Total Belum Dibaca: {unreadCounts.total_unread}
                </div>
            )}

            {/* Tombol Logout */}
            <div className="text-center mt-6">
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