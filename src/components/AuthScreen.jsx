import { useState } from 'react'
import {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signInAnonymously,
} from '../firebase'

export default function AuthScreen({ onNotice }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const getFriendlyErrorMessage = (code) => {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'An account with this email already exists. Please sign in instead.'
      case 'auth/invalid-email':
        return 'Please enter a valid email address.'
      case 'auth/weak-password':
        return 'Password should be at least 6 characters long.'
      case 'auth/user-not-found':
        return 'No account found with this email address.'
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.'
      case 'auth/invalid-credential':
        return 'Invalid email or password. Please check your details.'
      default:
        return 'Authentication failed. Please check your inputs and try again.'
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all required fields.')
      return
    }

    if (isSignUp && !displayName.trim()) {
      setError('Please enter your name.')
      return
    }

    setLoading(true)

    try {
      if (isSignUp) {
        const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password)
        if (displayName.trim()) {
          await updateProfile(userCred.user, { displayName: displayName.trim() })
        }
        if (onNotice) onNotice('Account created successfully! Welcome to CoRide.')
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password)
        if (onNotice) onNotice('Signed in successfully!')
      }
    } catch (err) {
      console.warn('Auth error:', err)
      setError(getFriendlyErrorMessage(err.code))
    } finally {
      setLoading(false)
    }
  }

  const handleGuestAccess = async () => {
    setError('')
    setLoading(true)
    try {
      await signInAnonymously(auth)
      if (onNotice) onNotice('Signed in as Guest!')
    } catch (err) {
      console.warn('Guest access error:', err)
      setError('Guest access is currently unavailable.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-3xl font-black text-white shadow-lg shadow-indigo-500/30">
            C
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">CoRide</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Smart Campus Carpooling & Ride Sharing
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="mb-6 grid grid-cols-2 rounded-xl bg-slate-950 p-1 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false)
              setError('')
            }}
            className={`rounded-lg py-2 text-xs sm:text-sm font-bold transition-all ${
              !isSignUp ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true)
              setError('')
            }}
            className={`rounded-lg py-2 text-xs sm:text-sm font-bold transition-all ${
              isSignUp ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Your Full Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 shadow-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@campus.edu"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 shadow-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 shadow-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs font-medium text-rose-300 flex items-center gap-2">
              <svg className="h-4 w-4 shrink-0 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:from-indigo-600 hover:to-indigo-700 hover:shadow-indigo-500/35 focus:ring-4 focus:ring-indigo-500/30 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {isSignUp ? 'Creating account...' : 'Signing in...'}
              </>
            ) : (
              <>{isSignUp ? 'Create CoRide Account' : 'Sign In to CoRide'}</>
            )}
          </button>
        </form>

        {/* Guest Access Option */}
        <div className="mt-6 border-t border-slate-800/80 pt-4 text-center">
          <button
            type="button"
            onClick={handleGuestAccess}
            className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
          >
            Continue as Guest Demo →
          </button>
        </div>
      </div>
    </div>
  )
}
