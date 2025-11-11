
import { useChat } from '../hooks/useChat'
import { useAuthStore } from '../stores/authStore'
import ChatSidebar from './ChatSidebar'
import MessageBubble from './MessageBubble'
import ReplyPreview from './ReplyPreview'
import AddContactModal from './AddContactModal'
import { socket } from '../utils/socket'

export default function Chat() {
    const { user, logout } = useAuthStore()

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
        setSearchQuery,
        setMessage,
        setShowAddContactModal,
        setReplyingTo,
        loadMessages,
        sendMessage,
        selectContact
    } = useChat()

    const handleReply = (message: any) => {
        console.log('💬 Replying to message:', message)
        setReplyingTo(message)
    }

    const cancelReply = () => {
        setReplyingTo(null)
    }

    const handleLogout = () => {
        console.log('🚪 Logging out...')
        socket.disconnect() // ✅ Disconnect socket saat logout
        logout()
    }

    // 🔹 FIX: Dapatkan user name dengan aman
    const getChatPartnerName = () => {
        if (!roomId || !user) return ''

        const contact = contacts.find(c => c.room_id === roomId)
        if (contact) return `User ${contact.user_id}`

        const otherUserId = roomId.split('_').find(id => id !== user.id)
        return otherUserId ? `User ${otherUserId}` : 'Unknown User'
    }

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
                />

                {/* Main Chat Area */}
                <div className="w-2/3 flex flex-col">
                    {/* Chat Header */}
                    {roomId ? (
                        <div className="p-4 border-b border-gray-300 bg-gray-50">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="font-semibold text-gray-800">
                                        Chat dengan {getChatPartnerName()}
                                    </h2>
                                    <p className="text-sm text-gray-500">Room: {roomId}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => loadMessages(roomId)}
                                        className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                                    >
                                        Refresh
                                    </button>
                                    <button
                                        onClick={() => setShowAddContactModal(true)}
                                        className="text-sm bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                                    >
                                        + Kontak
                                    </button>
                                </div>
                            </div>
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
                        ) : messages.length === 0 ? (
                            <div className="text-center text-gray-500 mt-8">
                                {roomId ? 'Belum ada pesan dalam chat ini' : 'Pilih kontak untuk melihat pesan'}
                            </div>
                        ) : (
                            messages.map((msg, index) => (
                                <MessageBubble
                                    key={index}
                                    message={msg}
                                    onReply={handleReply}
                                />
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Reply Preview */}
                    <ReplyPreview
                        replyingTo={replyingTo}
                        onCancel={cancelReply}
                    />

                    {/* Send Message */}
                    <div className="p-4 border-t border-gray-300">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        sendMessage()
                                    }
                                }}
                                placeholder={replyingTo ? `Balas pesan...` : "Ketik pesan..."}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={!roomId}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!roomId || !message.trim()}
                                className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {replyingTo ? 'Balas' : 'Kirim'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Logout Button */}
            <div className="text-center mt-4">
                <button
                    onClick={handleLogout}
                    className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-md"
                >
                    Logout
                </button>
            </div>
        </div>
    )
}

// import { useState, useEffect, useRef } from 'react'
// import { useAuthStore } from '../stores/authStore'
// import { socket } from '../utils/socket'
// import ChatSidebar from './ChatSidebar'
// import MessageBubble from './MessageBubble'
// import ReplyPreview from './ReplyPreview'
// import AddContactModal from './AddContactModal'

// interface Message {
//     id?: string
//     user_id: string
//     room_id: string
//     message: string
//     created_at: string
//     parent_id?: string
//     parent_message?: string
//     parent_user_id?: string
// }

// interface ChatRoom {
//     room_id: string
//     is_group: boolean
//     created_at: string
// }

// interface Contact {
//     user_id: string
//     room_id: string
//     last_activity?: string
// }

// export default function Chat() {
//     const { user, logout } = useAuthStore()
//     const [searchQuery, setSearchQuery] = useState('')
//     const [roomId, setRoomId] = useState('')
//     const [message, setMessage] = useState('')
//     const [messages, setMessages] = useState<Message[]>([])
//     const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])
//     const [contacts, setContacts] = useState<Contact[]>([])
//     const [activeRoom, setActiveRoom] = useState<string>('')
//     const [showAddContactModal, setShowAddContactModal] = useState(false)
//     const [replyingTo, setReplyingTo] = useState<Message | null>(null)
//     const messagesEndRef = useRef<HTMLDivElement>(null)
//     const [isLoading, setIsLoading] = useState(false)

//     useEffect(() => {
//         if (user) {
//             socket.connect()

//             socket.on('connect', () => {
//                 // console.log('Connected to server')
//                 loadChatRooms()
//             })

//             socket.on('chat:receive', (data: Message) => {
//                 setMessages(prev => [...prev, data])
//                 setTimeout(() => {
//                     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
//                 }, 100)
//                 loadChatRooms() // Refresh contacts ketika dapat pesan baru
//             })

//             socket.on('chat:started', (data: any) => {
//                 if (data.room_id) {
//                     setRoomId(data.room_id)
//                     setActiveRoom(data.room_id)
//                     socket.emit('chat:join', { room_id: data.room_id })
//                     loadMessages(data.room_id)
//                     loadChatRooms() // Refresh contacts
//                     setShowAddContactModal(false)
//                 }
//             })

//             socket.on('chat:messages', (data: any) => {
//                 console.log('Received messages:', data)
//                 if (data.messages) {
//                     setMessages(data.messages)

//                     setTimeout(() => {
//                         messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
//                     }, 100)
//                 }
//             })

//             socket.on('chat:rooms', (data: any) => {
//                 // console.log('Received rooms:', data)
//                 if (Array.isArray(data)) {
//                     setChatRooms(data)
//                     const formattedContacts = formatRoomsToContacts(data, user.id)
//                     // console.log('Formatted contacts:', formattedContacts)
//                     setContacts(formattedContacts)
//                 }
//             })

//             socket.on('chat:marked-read', (data: any) => {
//                 console.log('Messages marked as read:', data)
//                 loadChatRooms()
//             })


//             socket.on('chat:error', (data: any) => {
//                 console.error('🔴 FULL ERROR DETAILS:', JSON.stringify(data, null, 2))

//                 // Group errors by type
//                 const errorConfig = {
//                     'mark-read-error': { showAlert: false, logLevel: 'warn' },
//                     'send-error': { showAlert: true, logLevel: 'error' },
//                     'default': { showAlert: true, logLevel: 'error' }
//                 }

//                 const config = errorConfig[data.type] || errorConfig.default

//                 if (config.logLevel === 'warn') {
//                     console.warn(`${data.type}:`, data.details)
//                 } else {
//                     console.error(`${data.type}:`, data.details)
//                 }

//                 if (config.showAlert && !data.message.includes('mark messages as read')) {
//                     alert('Error: ' + data.message)
//                 }
//             })

//             return () => {
//                 socket.off('chat:receive')
//                 socket.off('chat:started')
//                 socket.off('chat:messages')
//                 socket.off('chat:rooms')
//                 socket.off('chat:marked-read')
//                 socket.off('chat:error')
//                 socket.disconnect()
//             }
//         }
//     }, [user])

//     const formatRoomsToContacts = (rooms: ChatRoom[], currentUserId: string): Contact[] => {
//         const contactsList: Contact[] = []

//         // console.log('Formatting rooms:', rooms)
//         // console.log('Current user ID:', currentUserId)

//         rooms.forEach(room => {
//             // console.log('Processing room:', room.room_id)

//             // Parse room_id (format: "5_8")
//             const userIds = room.room_id.split('_')
//             // console.log('User IDs in room:', userIds)

//             if (userIds.length == 2) {
//                 // Cari user ID yang bukan current user
//                 const otherUserId = userIds.find(id => id !== currentUserId.toString())
//                 // console.log('Other user ID:', otherUserId)

//                 if (otherUserId) {
//                     contactsList.push({
//                         user_id: otherUserId,
//                         room_id: room.room_id,
//                         last_activity: room.created_at
//                     })
//                 }
//             }
//         })

//         // console.log('Final contacts list:', contactsList)

//         // Sort by last activity (terbaru di atas)
//         return contactsList.sort((a, b) => {
//             if (!a.last_activity && !b.last_activity) return 0
//             if (!a.last_activity) return 1
//             if (!b.last_activity) return -1
//             return new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime()
//         })
//     }

//     const loadChatRooms = () => {
//         if (user) {
//             // console.log('Loading chat rooms for user:', user.id)
//             socket.emit('chat:get-rooms', { user_id: user.id })
//         }
//     }

//     const loadMessages = (roomId: string) => {
//         if (user) {
//             setIsLoading(true)
//             console.log('Loading messages for room:', roomId)
//             socket.emit('chat:get-messages', {
//                 room_id: roomId,
//                 user_id: user.id
//             })

//             setTimeout(() => {
//                 console.log('Marking messages as read for room:', roomId, 'user:', user.id)
//                 socket.emit('chat:mark-read', {
//                     room_id: roomId,
//                     user_id: user.id
//                 })
//                 setIsLoading(false)
//             }, 100)
//         }
//     }

//     // Di useEffect, tambahkan logging lebih detail


//     const selectContact = (contact: Contact) => {
//         console.log('Selected contact:', contact)
//         setRoomId(contact.room_id)
//         setActiveRoom(contact.room_id)
//         socket.emit('chat:join', { room_id: contact.room_id })
//         loadMessages(contact.room_id)
//         setSearchQuery('')
//         setReplyingTo(null)
//     }

//     const sendMessage = () => {
//         if (user && roomId && message.trim()) {
//             const messageData = {
//                 user_id: user.id,
//                 room_id: roomId,
//                 message: message.trim(),
//                 parent_id: replyingTo?.id
//             }

//             console.log('Sending message with reply:', messageData)
//             socket.emit('chat:send', messageData)
//             setMessage('')
//             setReplyingTo(null)
//         }
//     }
//     const handleReply = (message: Message) => {
//         console.log('Replying to message:', message)
//         setReplyingTo(message)
//     }

//     const cancelReply = () => {
//         setReplyingTo(null)
//     }

//     const handleLogout = () => {
//         socket.disconnect()
//         logout()
//     }

//     return (
//         <div className="min-h-screen bg-gray-100 p-4">
//             {/* Modals */}
//             <AddContactModal
//                 isOpen={showAddContactModal}
//                 onClose={() => setShowAddContactModal(false)}
//             />

//             <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md flex">
//                 {/* Sidebar */}
//                 <ChatSidebar
//                     contacts={contacts}
//                     activeRoom={activeRoom}
//                     searchQuery={searchQuery}
//                     onSearchChange={setSearchQuery}
//                     onContactSelect={selectContact}
//                     onAddContact={() => setShowAddContactModal(true)}
//                 />

//                 {/* Main Chat Area */}
//                 <div className="w-2/3 flex flex-col">
//                     {/* Chat Header */}
//                     {roomId ? (
//                         <div className="p-4 border-b border-gray-300 bg-gray-50">
//                             <div className="flex justify-between items-center">
//                                 <div>
//                                     <h2 className="font-semibold text-gray-800">
//                                         Chat dengan User {
//                                             contacts.find(c => c.room_id == roomId)?.user_id ||
//                                             roomId.split('_').find(id => id !== user?.id)
//                                         }
//                                     </h2>
//                                     <p className="text-sm text-gray-500">Room: {roomId}</p>
//                                 </div>
//                                 <div className="flex gap-2">
//                                     <button
//                                         onClick={() => loadMessages(roomId)}
//                                         className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
//                                     >
//                                         Refresh
//                                     </button>
//                                     <button
//                                         onClick={() => setShowAddContactModal(true)}
//                                         className="text-sm bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
//                                     >
//                                         + Kontak
//                                     </button>
//                                 </div>
//                             </div>
//                         </div>
//                     ) : (
//                         <div className="p-4 border-b border-gray-300 bg-gray-50 text-center text-gray-500">
//                             {searchQuery.trim() ? 'Pilih kontak dari hasil pencarian' : 'Pilih kontak untuk memulai percakapan'}
//                         </div>
//                     )}

//                     {/* Messages */}
//                     <div className="flex-1 overflow-y-auto p-4 bg-gray-50 h-96 messages-container">
//                         {isLoading ? (
//                             <div className="text-center text-gray-500 mt-8">
//                                 Loading messages...
//                             </div>
//                         ) : messages.length === 0 ? (
//                             <div className="text-center text-gray-500 mt-8">
//                                 {roomId ? 'Belum ada pesan dalam chat ini' : 'Pilih kontak untuk melihat pesan'}
//                             </div>
//                         ) : (
//                             messages.map((msg, index) => (
//                                 <MessageBubble
//                                     key={index}
//                                     message={msg}
//                                     onReply={handleReply}
//                                 />
//                             ))
//                         )}
//                         <div ref={messagesEndRef} />
//                     </div>

//                     {/* Reply Preview */}
//                     <ReplyPreview
//                         replyingTo={replyingTo}
//                         onCancel={cancelReply}
//                     />

//                     {/* Send Message */}
//                     <div className="p-4 border-t border-gray-300">
//                         <div className="flex gap-2">
//                             <input
//                                 type="text"
//                                 value={message}
//                                 onChange={(e) => setMessage(e.target.value)}
//                                 onKeyPress={(e) => {
//                                     if (e.key == 'Enter') {
//                                         sendMessage()
//                                     }
//                                 }}
//                                 placeholder={replyingTo ? `Balas pesan...` : "Ketik pesan..."}
//                                 className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                                 disabled={!roomId}
//                             />
//                             <button
//                                 onClick={sendMessage}
//                                 disabled={!roomId || !message.trim()}
//                                 className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
//                             >
//                                 {replyingTo ? 'Balas' : 'Kirim'}
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             {/* Logout Button */}
//             <div className="text-center mt-4">
//                 <button
//                     onClick={handleLogout}
//                     className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-md"
//                 >
//                     Logout
//                 </button>
//             </div>
//         </div>
//     )
// }


