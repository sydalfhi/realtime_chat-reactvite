import React from 'react'
import { Link } from 'react-router-dom'
import Register from '../../components/Register'

export default function RegisterPage() {
    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
            <Register />
            <p className="mt-4 text-gray-600">
                Sudah punya akun?{' '}
                <Link to={'/login'} className='text-blue-500 hover:text-blue-700'>
                    Login
                </Link>
            </p>
        </div>
    )
}