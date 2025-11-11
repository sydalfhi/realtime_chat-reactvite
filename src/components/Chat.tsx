import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../stores/authStore'
import { socket } from '../utils/socket'

interface Message {
    user_id: string
    room_id: string
    message: string
    created_at: string
}

export default function Chat() {
    const { user, logout } = useAuthStore()
    const [targetUserId, setTargetUserId] = useState('')
    const [roomId, setRoomId] = useState('')
    const [message, setMessage] = useState('')
    const [messages, setMessages] = useState<Message[]>([])
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (user) {
            socket.connect()

            socket.on('connect', () => {
                console.log('Connected to server')
            })

            socket.on('chat:receive', (data: Message) => {
                setMessages(prev => [...prev, data])
            })

            socket.on('chat:started', (data: any) => {
                if (data.room_id) {
                    setRoomId(data.room_id)
                    // Join room setelah berhasil dibuat
                    socket.emit('chat:join', { room_id: data.room_id })
                }
            })

            socket.on('chat:messages', (data: any) => {
                if (data.messages) {
                    setMessages(data.messages)
                }
            })

            return () => {
                socket.off('chat:receive')
                socket.off('chat:started')
                socket.off('chat:messages')
                socket.disconnect()
            }
        }
    }, [user])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const startChat = () => {
        if (user && targetUserId) {
            socket.emit('chat:start', {
                user_id: user.id,
                target_user_id: targetUserId
            })
        }
    }

    const sendMessage = () => {
        if (user && roomId && message.trim()) {
            const messageData = {
                user_id: user.id,
                room_id: roomId,
                message: message.trim()
            }

            socket.emit('chat:send', messageData)
            setMessage('')
        }
    }

    const getMessages = () => {
        if (user && roomId) {
            socket.emit('chat:get-messages', {
                room_id: roomId,
                user_id: user.id
            })
        }
    }

    const handleLogout = () => {
        socket.disconnect()
        logout()
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md">
                {/* Header */}
                <div className="bg-blue-500 text-white p-4 rounded-t-lg flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold">Chat App</h1>
                        <p className="text-sm">Selamat datang, {user?.name} (ID: {user?.id})</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-md text-sm"
                    >
                        Logout
                    </button>
                </div>

                <div className="p-4">
                    {/* Start Chat Section */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <h2 className="text-lg font-semibold mb-2">Mulai Chat</h2>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={targetUserId}
                                onChange={(e) => setTargetUserId(e.target.value)}
                                placeholder="Masukkan ID user target"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                            />
                            <button
                                onClick={startChat}
                                className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
                            >
                                Start Chat
                            </button>
                        </div>
                        {roomId && (
                            <p className="mt-2 text-sm text-gray-600">
                                Room ID: {roomId}
                                <button
                                    onClick={getMessages}
                                    className="ml-2 bg-blue-500 text-white px-2 py-1 rounded text-xs"
                                >
                                    Load Messages
                                </button>
                            </p>
                        )}
                    </div>

                    {/* Chat Messages */}
                    <div className="mb-4 border border-gray-300 rounded-lg h-96 overflow-y-auto p-4 bg-gray-50">
                        {messages.length === 0 ? (
                            <p className="text-gray-500 text-center">Belum ada pesan</p>
                        ) : (
                            messages.map((msg, index) => (
                                <div
                                    key={index}
                                    className={`mb-2 p-3 rounded-lg max-w-xs ${msg.user_id === user?.id
                                            ? 'bg-blue-500 text-white ml-auto'
                                            : 'bg-gray-200 text-gray-800'
                                        }`}
                                >
                                    <div className="font-semibold text-sm">
                                        {msg.user_id === user?.id ? 'Anda' : `User ${msg.user_id}`}
                                    </div>
                                    <div>{msg.message}</div>
                                    <div className="text-xs opacity-70 mt-1">
                                        {new Date(msg.created_at).toLocaleTimeString()}
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Send Message */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                            placeholder="Ketik pesan..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                            disabled={!roomId}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!roomId || !message.trim()}
                            className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            Kirim
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}