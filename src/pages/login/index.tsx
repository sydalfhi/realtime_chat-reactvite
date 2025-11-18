import React from 'react'
import { Link } from 'react-router-dom'
import Login from '../../components/Login'

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
            <Login />
            <p className="mt-4 text-gray-600">
                Belum punya akun?{' '}
                <Link to={'/register'} className='text-blue-500 hover:text-blue-700'>
                    Register
                </Link>
            </p>
        </div>
    )
}