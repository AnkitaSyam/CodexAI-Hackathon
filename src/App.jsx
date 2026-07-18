import { useEffect, useState } from 'react'
import PostForm from './components/PostForm'
import PoolList from './components/PoolList'
import AuthScreen from './components/AuthScreen'
import { auth, signOut, onAuthStateChanged } from './firebase'

function ConfirmedPool({ pool }) {
  return (
    <article className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 shadow-xl backdrop-blur-xl">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-bold text-emerald-200 text-lg sm:text-xl">{pool.destination}</h3>
          <p className="text-xs text-emerald-400 font-medium">{pool.departureFormatted || pool.timeWindow}</p>
        </div>
        <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-300">
          Confirmed Pool
        </span>
      </div>
      <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-emerald-400/80">
        AI Coordination Plan (Groq)
      </p>
      <p className="mt-1 text-sm leading-relaxed text-emerald-100 bg-emerald-950/50 p-3.5 rounded-xl border border-emerald-500/20">
        {pool.message}
      </p>
    </article>
  )
}

export default function App() {
  const [toast, setToast] = useState('')
  const [confirmedPools, setConfirmedPools] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Toast alert timer
  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(''), 3500)
    return () => clearTimeout(timer)
  }, [toast])

  // Firebase Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
      setAuthLoading(false)
    })
    return unsubscribe
  }, [])

  const handleSignOut = () => {
    signOut(auth)
    setToast('Signed out.')
  }

  const addConfirmedPool = (pool) => setConfirmedPools((current) => [pool, ...current])

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <svg className="h-10 w-10 animate-spin text-indigo-500 mb-3" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Loading CoRide...</p>
      </div>
    )
  }

  // Auth Screen for unauthenticated visitors
  if (!currentUser) {
    return <AuthScreen onNotice={setToast} />
  }

  return (
    <main className="app-shell px-4 py-5 text-slate-100 sm:py-10">
      <div className="relative z-10 mx-auto max-w-4xl">
        {/* Navigation & Header Bar */}
        <header className="topbar mb-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#b1ff62] text-xl font-black text-[#15151b] shadow-lg shadow-[#b1ff62]/15">
              ↗
            </div>
            <div>
              <p className="eyebrow mb-1">Campus transit club</p>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">CoRide</h1>
                <span className="rounded-full border border-[#b1ff62]/20 bg-[#b1ff62]/10 px-2 py-0.5 text-[10px] font-bold text-[#c7ff91]">
                  Ride board live
                </span>
              </div>
              <p className="text-xs text-slate-400">Find your ride, together.</p>
            </div>
          </div>

          {/* User Auth Profile Badge & Sign Out Button */}
          <div className="flex w-full items-center justify-between gap-3 border-t border-white/[0.08] pt-3 sm:w-auto sm:justify-end sm:border-t-0 sm:pt-0">
            <div className="flex items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.04] px-3 py-1.5 text-xs text-slate-200">
              {currentUser.photoURL ? (
                <img src={currentUser.photoURL} alt="Avatar" className="h-5 w-5 rounded-full" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
              )}
              <span className="font-semibold max-w-[120px] truncate">
                {currentUser.displayName || currentUser.email?.split('@')[0] || 'Campus Rider'}
              </span>
            </div>

            <button
              onClick={handleSignOut}
              className="rounded-xl border border-white/[0.09] bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-[#ff6f61]/30 hover:bg-[#ff6f61]/10 hover:text-[#ff9e96]"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Toast Notification */}
        {toast && (
          <div
            role="status"
            className="mb-6 flex items-center justify-between rounded-2xl border border-indigo-400/25 bg-indigo-950/70 px-4 py-3 text-xs font-medium text-indigo-100 shadow-xl shadow-indigo-950/20 backdrop-blur-xl sm:text-sm"
          >
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {toast}
            </span>
            <button onClick={() => setToast('')} className="text-indigo-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Post Ride Form */}
        <div className="mb-3 flex items-center justify-between">
          <span className="route-label">Plan your next ride</span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-600">Fast · social · less expensive</span>
        </div>
        <PostForm onNotice={setToast} currentUser={currentUser} />

        {/* Live Pool List */}
        <PoolList onConfirmed={addConfirmedPool} onNotice={setToast} />

        {/* Confirmed Pools Section */}
        {confirmedPools.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Your Confirmed Pools
            </h2>
            <div className="space-y-4">
              {confirmedPools.map((pool, index) => (
                <ConfirmedPool key={`${pool.destination}-${pool.timeWindow}-${index}`} pool={pool} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
