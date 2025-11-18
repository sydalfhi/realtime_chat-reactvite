import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import Chat from './components/Chat'
import LoginPage from './pages/login'
import RegisterPage from './pages/register'



function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Route untuk halaman yang membutuhkan autentikasi */}
          <Route
            path="/chat"
            element={isAuthenticated ? <Chat /> : <Navigate to="/login" replace />}
          />

          {/* Route untuk halaman auth (jika sudah login, redirect ke chat) */}
          <Route
            path="/login"
            element={!isAuthenticated ? <LoginPage /> : <Navigate to="/chat" replace />}
          />
          <Route
            path="/register"
            element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/chat" replace />}
          />

          {/* Route default */}
          <Route
            path="/"
            element={<Navigate to={isAuthenticated ? "/chat" : "/login"} replace />}
          />

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App