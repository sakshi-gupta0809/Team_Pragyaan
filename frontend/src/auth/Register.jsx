import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Mail, Lock, User, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '../api'
import logoImage from '../assets/logo.png'

const Register = ({ onSwitch, onSuccess }) => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [touched, setTouched] = useState({ name: false, email: false, password: false })
  const formRef = useRef(null)
  const [parallax, setParallax] = useState({ x: 0, y: 0 })

  const isNameValid = useMemo(() => name.trim().length >= 2, [name])
  const isEmailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), [email])
  const isPasswordValid = useMemo(() => password.length >= 6, [password])
  const isFormValid = isNameValid && isEmailValid && isPasswordValid

  const passwordStrength = useMemo(() => {
    let score = 0
    if (password.length >= 6) score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    return score
  }, [password])

  useEffect(() => {
    const onMove = (e) => {
      const cx = window.innerWidth / 2
      const cy = window.innerHeight / 2
      const dx = (e.clientX - cx) / cx
      const dy = (e.clientY - cy) / cy
      setParallax({ x: dx * 10, y: dy * 10 })
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
      })
      if (!res.ok) {
        let msg = 'Registration failed'
        try {
          const data = await res.json()
          if (data && (data.detail || data.message)) {
            msg = String(data.detail || data.message)
          }
        } catch {}
        if (msg.toLowerCase().includes('email already registered')) {
          msg = 'This email is already registered. Try logging in instead.'
        }
        throw new Error(msg)
      }
      const data = await res.json()
      setSuccess('Account created! You can now log in.')
      setTimeout(() => onSuccess?.(data), 600)
    } catch (err) {
      setError(err.message || 'Registration failed')
      if (formRef.current) {
        formRef.current.classList.remove('shake')
        void formRef.current.offsetWidth
        formRef.current.classList.add('shake')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-100 via-white to-purple-100 flex items-center justify-center p-4 sm:p-6">
      <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl z-0" aria-hidden="true" style={{ transform:`translate(${parallax.x}px, ${parallax.y}px)` }}/>
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-teal-500/10 blur-3xl z-0" aria-hidden="true" style={{ transform:`translate(${-parallax.x}px, ${-parallax.y}px)` }}/>
      <div className="w-full max-w-xl">
        <motion.div initial={{ opacity: 0, scale: 0.98, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }} className="relative z-10 bg-white/80 backdrop-blur rounded-3xl shadow-xl p-6 sm:p-8 border border-white/60">
          <div className="flex items-center gap-3 mb-6">
            <motion.div initial={{ rotate: -8 }} animate={{ rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }} className="h-10 w-10 grid place-items-center">
              <img src={logoImage} alt="Company Logo" className="h-full w-full object-contain" />
            </motion.div>
            <div>
              <h2 className="text-xl font-semibold">NeutriReach</h2>
              <p className="text-sm text-gray-500">Join us | Create an Account</p>
            </div>
          </div>
          {/* Social Logins removed per request */}
          <div className="mb-2" />

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            <div className={`relative ${touched.name && !isNameValid ? 'animate-[glow_1.6s_ease-in-out_infinite]' : ''}`}>
              <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
              <input value={name} onChange={e=>setName(e.target.value)} onBlur={()=>setTouched(s=>({...s,name:true}))} type="text" required placeholder="Name" className={`w-full pl-11 pr-4 py-3 rounded-xl border outline-none transition ${touched.name && !isNameValid ? 'border-red-400 focus:ring-red-100 focus:border-red-500' : 'focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500'}`}/>
              {touched.name && !isNameValid && <div className="mt-1 text-xs text-red-600 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5"/> Name is too short</div>}
            </div>
            <div className={`relative ${touched.email && !isEmailValid ? 'animate-[glow_1.6s_ease-in-out_infinite]' : ''}`}>
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
              <input value={email} onChange={e=>setEmail(e.target.value)} onBlur={()=>setTouched(s=>({...s,email:true}))} type="email" required placeholder="Email" className={`w-full pl-11 pr-4 py-3 rounded-xl border outline-none transition ${touched.email && !isEmailValid ? 'border-red-400 focus:ring-red-100 focus:border-red-500' : 'focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500'}`}/>
              {touched.email && !isEmailValid && <div className="mt-1 text-xs text-red-600 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5"/> Enter a valid email</div>}
            </div>
            <div className={`relative ${touched.password && !isPasswordValid ? 'animate-[glow_1.6s_ease-in-out_infinite]' : ''}`}>
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
              <input value={password} onChange={e=>setPassword(e.target.value)} onBlur={()=>setTouched(s=>({...s,password:true}))} type={show? 'text':'password'} required placeholder="Password" className={`w-full pl-11 pr-10 py-3 rounded-xl border outline-none transition ${touched.password && !isPasswordValid ? 'border-red-400 focus:ring-red-100 focus:border-red-500' : 'focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500'}`}/>
              <button type="button" onClick={()=>setShow(s=>!s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {show ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
              </button>
              {touched.password && !isPasswordValid && <div className="mt-1 text-xs text-red-600 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5"/> At least 6 characters</div>}
              {password && (
                <div className="mt-2">
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className={`h-full transition-all ${passwordStrength<=1 ? 'bg-red-400 w-1/4' : passwordStrength===2 ? 'bg-amber-400 w-2/4' : passwordStrength===3 ? 'bg-blue-500 w-3/4' : 'bg-emerald-500 w-full'}`}/>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">Strength: {['Weak','Fair','Good','Strong'][Math.max(0, passwordStrength-1)]}</div>
                </div>
              )}
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2"
                >
                  <AlertCircle className="h-4 w-4 mt-0.5"/>
                  <div>
                    <p className="font-medium">We couldn’t create your account.</p>
                    <p className="text-[12px] opacity-90">{error}</p>
                  </div>
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm px-3 py-2"
                >
                  <CheckCircle2 className="h-4 w-4 mt-0.5"/>
                  <div>
                    <p className="font-medium">Account created</p>
                    <p className="text-[12px] opacity-90">{success}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button whileHover={!(loading || !isFormValid) ? { scale: 1.02, boxShadow: '0 8px 30px rgba(16,185,129,.35)' } : {}} whileTap={!(loading || !isFormValid) ? { scale: 0.99 } : {}} disabled={loading || !isFormValid} className={`relative w-full rounded-xl text-white py-3 font-medium transition flex items-center justify-center gap-2 overflow-hidden group ${loading || !isFormValid ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin"/> : null}
              <span>{loading ? 'Creating account...' : 'Create account'}</span>
              <span className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{background:'radial-gradient(600px circle at var(--x,50%) var(--y,50%), rgba(255,255,255,.18), transparent 40%)'}} />
            </motion.button>
          </form>

          <p className="text-sm text-gray-500 mt-6 text-center">
            Already have an account? <button onClick={onSwitch} className="text-emerald-600 hover:underline">Log in</button>
          </p>
        </motion.div>
      </div>

      <style>{`
        @keyframes slideIn{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes floatIn{from{opacity:0;transform:translateX(-24px) scale(.98)}to{opacity:1;transform:translateX(0) scale(1)}}
        .shake{animation:shake .28s ease}
        @keyframes shake{10%,90%{transform:translateX(-1px)}20%,80%{transform:translateX(2px)}30%,50%,70%{transform:translateX(-4px)}40%,60%{transform:translateX(4px)}}
        @keyframes glow{0%,100%{box-shadow:0 0 0 0 rgba(248,113,113,.0)}50%{box-shadow:0 0 0 4px rgba(248,113,113,.15)}}
      `}</style>
    </div>
  )
}

export default Register


