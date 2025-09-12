import { useState } from 'react'
import './App.css'
import Dashboard from './components/Dashboard'
import ModernDashboard from './components/ModernDashboard'
import Login from './auth/Login'
import Register from './auth/Register'
import { AnimatePresence, motion } from 'framer-motion'

function App() {
  const [useModernUI, setUseModernUI] = useState(true)
  const requireAuth = import.meta.env.VITE_REQUIRE_AUTH === 'true'
  const [isAuthenticated, setIsAuthenticated] = useState(() => (requireAuth ? false : !!localStorage.getItem('token')))
  const [mode, setMode] = useState('login')

  if (!isAuthenticated) {
    return (
      <AnimatePresence mode="wait" initial={false}>
        {mode === 'login' ? (
          <motion.div key="login" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: .25, ease: 'easeOut' }}>
            <Login onSwitch={() => setMode('register')} onSuccess={() => setIsAuthenticated(true)} />
          </motion.div>
        ) : (
          <motion.div key="register" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: .25, ease: 'easeOut' }}>
            <Register onSwitch={() => setMode('login')} onSuccess={() => setMode('login')} />
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  return (
    <div className="app-container">
      <Dashboard onLogout={() => { localStorage.removeItem('token'); setIsAuthenticated(false); }} />
    </div>
  )
}

export default App
