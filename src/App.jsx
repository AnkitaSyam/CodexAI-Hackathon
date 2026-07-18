import { useEffect, useState } from 'react'
import PostForm from './components/PostForm'
import PoolList from './components/PoolList'
import { auth, googleProvider, signInWithPopup, signInAnonymously, signOut, onAuthStateChanged } from './firebase'

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

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
      setToast('Signed in successfully!')
    } catch (err) {
      console.warn('Google sign in error:', err)
      setToast('Sign in failed. Check Firebase Auth configuration.')
    }
  }

  const handleGuestSignIn = async () => {
    try {
      await signInAnonymously(auth)
      setToast('Signed in as Guest!')
    } catch (err) {
      console.warn('Guest sign in error:', err)
      setToast('Guest sign in unavailable.')
    }
  }

  const handleSignOut = () => {
    signOut(auth)
    setToast('Signed out.')
  }

  const addConfirmedPool = (pool) => setConfirmedPools((current) => [pool, ...current])

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-3xl">
        {/* Navigation & Header Bar */}
        <header className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-2xl font-black text-white shadow-lg shadow-indigo-500/30">
              C
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">CoRide</h1>
                <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-400">
                  Campus Carpooling
                </span>
              </div>
              <p className="text-xs text-slate-400">Find your ride, together.</p>
            </div>
          </div>

          {/* User Auth & Map Status */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
            {/* Leaflet OpenStreetMap status badge */}
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              title="OpenStreetMap Powered — Zero API Keys Required"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              OpenStreetMap Active
            </span>

            {/* User Account / Auth */}
            {!authLoading && (
              currentUser ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 rounded-full bg-slate-800 border border-slate-700 px-3 py-1 text-xs text-slate-200">
                    {currentUser.photoURL ? (
                      <img src={currentUser.photoURL} alt="Avatar" className="h-5 w-5 rounded-full" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-indigo-400" />
                    )}
                    <span className="font-semibold max-w-[100px] truncate">
                      {currentUser.displayName || 'Campus Rider'}
                    </span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="text-xs text-slate-400 hover:text-white transition"
                    title="Sign Out"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGoogleSignIn}
                    className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-indigo-700 shadow-md shadow-indigo-600/20"
                  >
                    Sign in with Google
                  </button>
                  <button
                    onClick={handleGuestSignIn}
                    className="rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-700"
                  >
                    Guest
                  </button>
                </div>
              )
            )}
          </div>
        </header>

        {/* Toast Notification */}
        {toast && (
          <div
            role="status"
            className="mb-6 rounded-xl border border-indigo-500/30 bg-indigo-950/60 px-4 py-3 text-xs sm:text-sm font-medium text-indigo-200 shadow-xl backdrop-blur-xl flex items-center justify-between"
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
