import { useEffect, useState } from 'react'
import PostForm from './components/PostForm'
import PoolList from './components/PoolList'
import AuthScreen from './components/AuthScreen'
import { auth, signOut, onAuthStateChanged } from './firebase'
import { formatDepartureDisplay, getDepartureDateObj } from './utils/dateUtils'

const midpointPlaceCache = new Map()

function MeetingPlace({ meetingPoint, locationName, fallbackLocation }) {
  const [placeName, setPlaceName] = useState(() => meetingPoint ? midpointPlaceCache.get(`${meetingPoint.lat.toFixed(5)},${meetingPoint.lng.toFixed(5)}`) : null)

  useEffect(() => {
    if (locationName) return undefined
    if (!meetingPoint) return undefined
    const cacheKey = `${meetingPoint.lat.toFixed(5)},${meetingPoint.lng.toFixed(5)}`
    if (midpointPlaceCache.has(cacheKey)) {
      setPlaceName(midpointPlaceCache.get(cacheKey))
      return undefined
    }

    const controller = new AbortController()
    setPlaceName(null)
    fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&lat=${encodeURIComponent(meetingPoint.lat)}&lon=${encodeURIComponent(meetingPoint.lng)}`, {
      signal: controller.signal,
      headers: { 'Accept-Language': 'en' },
    })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Reverse geocoding failed')))
      .then((data) => {
        const address = data.address || {}
        const name = data.name || [address.road, address.neighbourhood || address.suburb, address.village || address.town || address.city].filter(Boolean).join(', ') || data.display_name?.split(',').slice(0, 2).join(', ')
        const result = name || 'Suggested midpoint'
        midpointPlaceCache.set(cacheKey, result)
        setPlaceName(result)
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setPlaceName('Suggested midpoint')
      })
    return () => controller.abort()
  }, [meetingPoint, locationName])

  if (locationName) return <>{locationName}</>
  if (meetingPoint && !placeName) return <>Finding a nearby meeting place…</>
  return <>{placeName || `Agree on a pickup point near ${fallbackLocation || 'your starting location'}`}</>
}

function ConfirmedPool({ pool }) {
  const departure = pool.departureTimestamp?.toDate?.()
    || getDepartureDateObj(pool.departureDate, pool.departureTime)
  const meetingAt = departure ? new Date(departure.getTime() - 10 * 60 * 1000) : null
  const meetingTime = meetingAt
    ? formatDepartureDisplay(null, null, meetingAt)
    : pool.departureFormatted || '10 minutes before departure'
  const originNames = pool.rides
    ?.map((ride) => ride.from?.trim())
    .filter(Boolean) || []
  const normalizedOrigins = new Set(originNames.map((origin) => origin.toLowerCase()))
  const sharedOrigin = normalizedOrigins.size === 1 ? originNames[0] : null

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
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/50 p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/80">Where to meet</p>
          <p className="mt-1 text-sm leading-relaxed text-emerald-100"><MeetingPlace meetingPoint={pool.meetingPoint} locationName={sharedOrigin} fallbackLocation={pool.from || pool.rides?.[0]?.from} /></p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/50 p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/80">Meet at</p>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-emerald-100">{meetingTime}</p>
          <p className="mt-0.5 text-xs text-emerald-300/70">10 minutes before departure</p>
        </div>
      </div>
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
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:py-10">
      <div className="mx-auto max-w-3xl">
        {/* Navigation & Header Bar */}
        <header className="mb-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-2xl backdrop-blur-xl sm:flex-row sm:p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-2xl font-black text-white shadow-lg shadow-indigo-500/30">
              C
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">CoRide</h1>
                <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                  Campus carpooling
                </span>
              </div>
              <p className="text-xs text-slate-400">Find your ride, together.</p>
            </div>
          </div>

          {/* User Auth Profile Badge & Sign Out Button */}
          <div className="flex w-full items-center justify-between gap-3 border-t border-white/[0.08] pt-3 sm:w-auto sm:justify-end sm:border-t-0 sm:pt-0">
            <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200">
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
              className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400"
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
        <PostForm onNotice={setToast} currentUser={currentUser} />

        {/* Live Pool List */}
        <PoolList onConfirmed={addConfirmedPool} onNotice={setToast} currentUser={currentUser} />

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
