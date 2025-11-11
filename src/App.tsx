import { useAuthStore } from './stores/authStore'
import Login from './components/Login'
import Chat from './components/Chat'

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return (
    <div className="App">
      {isAuthenticated ? <Chat /> : <Login />}
    </div>
  )
}

export default App