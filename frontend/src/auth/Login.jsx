import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '../api'

const Login = ({ onSwitch, onSuccess }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [touched, setTouched] = useState({ email: false, password: false })
  const formRef = useRef(null)

  const isEmailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), [email])
  const isPasswordValid = useMemo(() => password.length >= 6, [password])
  const isFormValid = isEmailValid && isPasswordValid

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      })
      if (!res.ok) {
        let msg = 'Invalid credentials'
        try {
          const data = await res.json()
          if (data && (data.detail || data.message)) {
            msg = String(data.detail || data.message)
          }
        } catch {}
        if (msg.toLowerCase().includes('invalid')) {
          msg = 'Incorrect email or password. Please try again.'
        }
        throw new Error(msg)
      }
      const data = await res.json()
      localStorage.setItem('token', data.access_token)
      setSuccess('Welcome back! Redirecting...')
      setTimeout(() => onSuccess?.(data), 600)
    } catch (err) {
      setError(err.message || 'Login failed')
      // subtle shake
      if (formRef.current) {
        formRef.current.classList.remove('shake')
        void formRef.current.offsetWidth
        formRef.current.classList.add('shake')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSocialLogin = async (provider) => {
    try {
      // Redirect to backend OAuth endpoints (to be implemented on backend)
      // Example endpoints: /api/auth/oauth/google, /api/auth/oauth/facebook, etc.
      // Open in the same tab to complete auth; backend should redirect back with token
      const url = `/api/auth/oauth/${provider}`
      window.location.href = url
    } catch (err) {
      setError('Unable to start social login. Please try again.')
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-100 via-white to-purple-100 flex items-center justify-center p-4 sm:p-6">
      <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl animate-[floatSlow_6s_ease-in-out_infinite] z-0" aria-hidden="true"/>
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-purple-500/10 blur-3xl animate-[floatSlow_7s_ease-in-out_infinite] z-0" aria-hidden="true"/>

      <div className="w-full max-w-xl">
        <motion.div initial={{ opacity: 0, scale: 0.98, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }} className="relative z-10 bg-white/80 backdrop-blur rounded-3xl shadow-xl p-6 sm:p-8 border border-white/60">
          <div className="flex items-center gap-3 mb-8">
            <motion.div initial={{ rotate: -8 }} animate={{ rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }} className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 shadow-lg shadow-blue-200 grid place-items-center">
              <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" opacity=".15"/><path d="M8 13l2.5 2.5L16 10"/></svg>
            </motion.div>
            <div>
              <p className="text-sm text-gray-500">Welcome back</p>
              <h2 className="text-2xl font-semibold">Log in to your Account</h2>
            </div>
          </div>

          <div className="mb-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SocialButton label="Google" provider="google" onClickProvider={handleSocialLogin} />
              <SocialButton label="Facebook" provider="facebook" onClickProvider={handleSocialLogin} />
              <SocialButton label="LinkedIn" provider="linkedin" onClickProvider={handleSocialLogin} />
              <SocialButton label="Instagram" provider="instagram" onClickProvider={handleSocialLogin} />
            </div>
          </div>

          <div className="relative text-center text-sm text-gray-500 mb-6">
            <span className="bg-white px-3 relative z-10">or continue with email</span>
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-gray-200"/>
          </div>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            <div className={`relative ${touched.email && !isEmailValid ? 'animate-[glow_1.6s_ease-in-out_infinite]' : ''}`}>
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
              <input value={email} onChange={e=>setEmail(e.target.value)} onBlur={()=>setTouched(s=>({...s,email:true}))} type="email" required placeholder="Email" className={`w-full pl-11 pr-4 py-3 rounded-xl border outline-none transition ${touched.email && !isEmailValid ? 'border-red-400 focus:ring-red-100 focus:border-red-500' : 'focus:ring-4 focus:ring-blue-100 focus:border-blue-500'}`}/>
              {touched.email && !isEmailValid && <div className="mt-1 text-xs text-red-600 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5"/> Enter a valid email</div>}
            </div>
            <div className={`relative ${touched.password && !isPasswordValid ? 'animate-[glow_1.6s_ease-in-out_infinite]' : ''}`}>
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
              <input value={password} onChange={e=>setPassword(e.target.value)} onBlur={()=>setTouched(s=>({...s,password:true}))} type={show? 'text':'password'} required placeholder="Password" className={`w-full pl-11 pr-10 py-3 rounded-xl border outline-none transition ${touched.password && !isPasswordValid ? 'border-red-400 focus:ring-red-100 focus:border-red-500' : 'focus:ring-4 focus:ring-blue-100 focus:border-blue-500'}`}/>
              <button type="button" onClick={()=>setShow(s=>!s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {show ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
              </button>
              {touched.password && !isPasswordValid && (
                <div className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5"/>
                  Password must be at least 6 characters
                </div>
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" className="accent-blue-600"/>
                <span>Remember me</span>
              </label>
              <button type="button" className="text-blue-600 hover:underline">Forgot Password?</button>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="text-red-600 text-sm flex items-center gap-2"><AlertCircle className="h-4 w-4"/>{error}</motion.div>
              )}
              {success && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="text-emerald-600 text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4"/>{success}</motion.div>
              )}
            </AnimatePresence>

            <motion.button whileHover={!(loading || !isFormValid) ? { scale: 1.02, boxShadow: '0 8px 30px rgba(59,130,246,.35)' } : {}} whileTap={!(loading || !isFormValid) ? { scale: 0.99 } : {}} disabled={loading || !isFormValid} className={`relative w-full rounded-xl text-white py-3 font-medium transition flex items-center justify-center gap-2 overflow-hidden group ${loading || !isFormValid ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin"/> : <ArrowRight className="h-5 w-5"/>}
              <span>{loading ? 'Logging in...' : 'Log in'}</span>
              <span className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{background:'radial-gradient(600px circle at var(--x,50%) var(--y,50%), rgba(255,255,255,.18), transparent 40%)'}} />
            </motion.button>
          </form>

          <p className="text-sm text-gray-500 mt-6 text-center">
            Don’t have an account? <button onClick={onSwitch} className="text-blue-600 hover:underline">Create an account</button>
          </p>
        </motion.div>
      </div>

      <style>{`
        @keyframes slideIn{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes floatIn{from{opacity:0;transform:translateX(24px) scale(.98)}to{opacity:1;transform:translateX(0) scale(1)}}
        @keyframes pulseSlow{0%,100%{opacity:.6}50%{opacity:1}}
        @keyframes floatSlow{0%,100%{transform:translateY(0)}50%{transform:translateY(10px)}}
        .shake{animation:shake .28s ease}
        @keyframes shake{10%,90%{transform:translateX(-1px)}20%,80%{transform:translateX(2px)}30%,50%,70%{transform:translateX(-4px)}40%,60%{transform:translateX(4px)}}
        @keyframes glow{0%,100%{box-shadow:0 0 0 0 rgba(248,113,113,.0)}50%{box-shadow:0 0 0 4px rgba(248,113,113,.15)}}
      `}</style>
    </div>
  )
}

export default Login

const SocialButton = ({ label, provider, onClickProvider }) => (
  <button
    type="button"
    onClick={() => onClickProvider(provider)}
    className="border rounded-xl py-3 hover:shadow transition bg-white/70 backdrop-blur text-sm"
  >
    {label}
  </button>
)


