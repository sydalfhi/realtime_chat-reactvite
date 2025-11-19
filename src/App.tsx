import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import LoginPage from './pages/login'
import RegisterPage from './pages/register'
import SpeechRecognition from 'react-speech-recognition';
import ChatPages from './pages/chat'


function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  if (!SpeechRecognition.browserSupportsSpeechRecognition()) {
    console.warn('Browser tidak mendukung Speech Recognition');
  }
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Route untuk halaman yang membutuhkan autentikasi */}
          <Route
            path="/chat"
            element={isAuthenticated ? <ChatPages /> : <Navigate to="/login" replace />}
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