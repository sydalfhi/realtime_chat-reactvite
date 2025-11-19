// src/components/ChatSidebar.tsx
import { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { socket } from '../utils/socket'
import type { Contact } from '../types/chat'

interface ChatSidebarProps {
    contacts: Contact[]
    activeRoom: string
    searchQuery: string
    onSearchChange: (query: string) => void
    onContactSelect: (contact: Contact) => void
    onAddContact: () => void
    unreadCounts?: any
    getUnreadCountForRoom?: any
    onCloseSidebar?: () => void
}

export default function ChatSidebar({
    contacts,
    activeRoom,
    searchQuery,
    onSearchChange,
    onContactSelect,
    onAddContact,
    onCloseSidebar
}: ChatSidebarProps) {
    const { user, logout } = useAuthStore()
    const [searchResults, setSearchResults] = useState<Contact[]>([])

    useEffect(() => {
        if (searchQuery.trim()) {
            const filtered = contacts.filter(contact =>
                contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                contact.room_id?.toLowerCase().includes(searchQuery.toLowerCase())
            )
            setSearchResults(filtered)
        } else {
            setSearchResults([])
        }
    }, [searchQuery, contacts])

    // Format waktu pesan terakhir
    const formatLastMessageTime = (timestamp: string) => {
        const messageDate = new Date(timestamp)
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)

        if (messageDate >= today) {
            // Hari ini - tampilkan jam
            return messageDate.toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit'
            })
        } else if (messageDate >= yesterday) {
            // Kemarin
            return 'Kemarin'
        } else {
            // Lebih dari kemarin - tampilkan tanggal
            return messageDate.toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short'
            })
        }
    }

    // Potong teks pesan jika terlalu panjang
    const truncateMessage = (message: string, maxLength: number = 35) => {
        if (message.length <= maxLength) return message
        return message.substring(0, maxLength) + '...'
    }

    // Icon untuk tipe pesan
    const getMessageTypeIcon = (type: string) => {
        switch (type) {
            case 'file':
                return '📎'
            case 'image':
                return '🖼️'
            case 'audio':
                return '🎵'
            default:
                return ''
        }
    }

    // const displayContacts = searchQuery.trim() ? searchResults : contacts
    const displayContacts = contacts

    const handleLogout = () => {
        socket.disconnect()
        logout()
    }

    return (
        <div className="w-full h-full border-r border-gray-300 bg-white flex flex-col">
            {/* Header dengan Close Button untuk Mobile */}
            <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white relative">
                <div className="flex items-center justify-between">
                    <div className='w-full'>
                        <h1 className="text-xl font-bold">Whats Good</h1>
                        <div className='flex justify-between items-center w-full'>
                            <p className="text-sm">Halo, {user?.full_name} </p>
                            <div>
                                <button
                                    onClick={handleLogout}
                                    className="bg-red-500 hover:bg-red-600 text-white text-sm px-2 py-1 rounded-md transition-colors"
                                >
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                    {/* Close Button untuk Mobile */}
                    <button
                        onClick={onCloseSidebar}
                        className="md:hidden p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Search & Add Contact */}
            <div className="p-4 border-b border-gray-300">
                <div className="flex gap-2 mb-3">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Cari kontak atau room..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <button
                    onClick={onAddContact}
                    className="w-full bg-gradient-to-br from-blue-500 to-blue-600 text-white py-2 px-3 rounded-md hover:bg-blue-600 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                >
                    + Tambah Kontak Baru
                </button>
            </div>

            {/* List Contacts */}
            <div className="flex-1 overflow-y-auto">
                <div className="p-3 bg-gray-50 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-gray-700">
                            {searchQuery.trim() ? 'Hasil Pencarian' : 'Kontak Saya'}
                        </h3>
                        <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full">
                            {displayContacts.length}
                        </span>
                    </div>
                    {searchQuery.trim() && (
                        <p className="text-xs text-gray-500 mt-1">
                            Menampilkan hasil untuk "{searchQuery}"
                        </p>
                    )}
                </div>

                {displayContacts.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                        {searchQuery.trim() ? (
                            <div>
                                <p>Tidak ditemukan kontak dengan kata kunci "{searchQuery}"</p>
                                <p className="text-sm mt-2">Coba gunakan kata kunci lain atau tambah kontak baru</p>
                            </div>
                        ) : (
                            <div>
                                <p>Belum ada kontak</p>
                                <p className="text-sm mt-2">Klik "Tambah Kontak Baru" untuk memulai chat</p>
                            </div>
                        )}
                    </div>
                ) : (
                    displayContacts.map((contact, index) => (
                        <div
                            key={contact.room_id || index}
                            onClick={() => onContactSelect(contact)}
                            className={`p-3 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${activeRoom === contact.room_id ? 'bg-blue-50 border-blue-200' : ''
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                {/* Avatar */}
                                <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 bg-gray-200 relative">
                                    <img
                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.user_id}&radius=50`}
                                        alt={contact.name || contact.email}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                        }}
                                    />

                                </div>

                                {/* Konten */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">

                                        <div className="font-semibold text-gray-800 truncate">
                                            {contact.name || contact.email}
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                            {/* Status unread */}
                                            {contact.unread > 0 && (
                                                <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                                    {contact.unread}
                                                </span>
                                            )}
                                            <div className="text-xs text-gray-500">
                                                {contact.last_activity &&
                                                    formatLastMessageTime(contact.last_activity)
                                                }
                                            </div>
                                        </div>
                                    </div>

                                    {/* Pesan Terakhir */}
                                    <div className="flex items-center gap-1">
                                        {/* Status baca */}
                                        {contact.last_message_user_id === user?.id && (
                                            <div className="flex-shrink-0">
                                                {/* {contact.last_message_status === 1 ? (
                                                    <span className="text-blue-500 text-xs">✓✓</span> // Sudah dibaca
                                                ) : (
                                                    <span className="text-gray-400 text-xs">✓✓</span> // Belum dibaca
                                                )} */}

                                            </div>
                                        )}

                                        {/* Icon tipe pesan */}
                                        {contact.last_message_type && contact.last_message_type !== 'text' && (
                                            <span className="text-xs flex-shrink-0">
                                                {getMessageTypeIcon(contact.last_message_type)}
                                            </span>
                                        )}

                                        {/* Teks pesan */}
                                        <p className={`text-sm truncate ${contact.unread > 0 ? 'text-gray-800 font-medium' : 'text-gray-600'
                                            }`}>
                                            {contact.last_message ?
                                                truncateMessage(contact.last_message) :
                                                'Belum ada pesan'
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}