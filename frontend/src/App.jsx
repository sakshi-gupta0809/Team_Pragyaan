import { useState } from 'react'
import './App.css'
import Dashboard from './components/Dashboard'
import ModernDashboard from './components/ModernDashboard'

function App() {
  const [useModernUI, setUseModernUI] = useState(true)

  return (
    <div className="app-container">
     
          <Dashboard />
          
      
    </div>
  )
}

export default App
