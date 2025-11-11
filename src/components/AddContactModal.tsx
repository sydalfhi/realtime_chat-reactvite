import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { socket } from '../utils/socket'

interface NewContact {
    id: string
    name: string
}

interface AddContactModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function AddContactModal({ isOpen, onClose }: AddContactModalProps) {
    const { user } = useAuthStore()
    const [newContact, setNewContact] = useState<NewContact>({ id: '', name: '' })
    const [isLoading, setIsLoading] = useState(false)

    // Start chat dengan kontak baru
    const startChatWithNewContact = () => {
        if (user && newContact.id.trim()) {
            setIsLoading(true)

            socket.emit('chat:start', {
                user_id: user.id,
                target_user_id: newContact.id.trim()
            })

            // Reset form setelah emit
            setNewContact({ id: '', name: '' })
            setIsLoading(false)
            // onClose akan dipanggil di parent ketika chat:started diterima
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        startChatWithNewContact()
    }

    // Tutup modal jika klik outside
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target == e.currentTarget) {
            onClose()
        }
    }

    // Handle ESC key
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key == 'Escape') {
            onClose()
        }
    }

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={handleBackdropClick}
            onKeyDown={handleKeyDown}
        >
            <div className="bg-white p-6 rounded-lg w-96 max-w-[90vw]">
                <h2 className="text-xl font-bold mb-4">Tambah Kontak Baru</h2>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                ID User *
                            </label>
                            <input
                                type="text"
                                value={newContact.id}
                                onChange={(e) => setNewContact(prev => ({ ...prev, id: e.target.value }))}
                                placeholder="Masukkan ID user"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                                autoFocus
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                ID user harus sesuai dengan ID di sistem
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nama Kontak (Opsional)
                            </label>
                            <input
                                type="text"
                                value={newContact.name}
                                onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Masukkan nama kontak"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Nama ini hanya untuk referensi Anda
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 transition-colors"
                            disabled={isLoading}
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={!newContact.id.trim() || isLoading}
                            className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Memproses...
                                </>
                            ) : (
                                'Mulai Chat'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}