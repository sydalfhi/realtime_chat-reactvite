
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
        message = { 'parent_id': message.id, ...message }
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
