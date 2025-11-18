import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'

interface LoginResponse {
    success: boolean;
    message: string;
    data: {
        user: {
            id: number;
            email: string;
            username: string;
            role_id: number;
        };
        profile: {
            full_name: string;
        };
        token: string;
        token_type: string;
        expires_in: number;
    };
}

export default function Login() {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const login = useAuthStore((state) => state.login)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
        // Clear error when user starts typing
        if (error) setError('')
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        if (!formData.email.trim() || !formData.password.trim()) {
            setError('Email dan password harus diisi')
            setLoading(false)
            return
        }

        try {
            const response = await fetch('https://payroll-trial.profaskes.id/panel/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password
                })
            })

            const data: LoginResponse = await response.json()

            if (data.success && data.data.token) {
                // Simpan data user dan token ke store
                login({
                    id: data.data.user.id.toString(),
                    email: data.data.user.email,
                    username: data.data.user.username,
                    full_name: data.data.profile.full_name,
                    role_id: data.data.user.role_id,
                    token: data.data.token,
                    token_type: data.data.token_type,
                    expires_in: data.data.expires_in
                })
            } else {
                setError(data.message || 'Login gagal')
            }
        } catch (err) {
            setError('Terjadi kesalahan saat login')
            console.error('Login error:', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div>
            <div className="bg-white p-8 rounded-lg shadow-md w-96">
                <h1 className="text-2xl font-bold mb-6 text-center">Login Chat</h1>
                {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                        {error}
                    </div>
                )}
                <form onSubmit={handleLogin}>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Masukkan email"
                            required
                            disabled={loading}
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Masukkan password"
                            required
                            disabled={loading}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Loading...' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    )
}