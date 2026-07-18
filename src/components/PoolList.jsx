import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import PoolCard from './PoolCard'
import { formatDepartureDisplay } from '../utils/dateUtils'

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000

function getRideTimestampMs(ride) {
  if (ride.departureTimestamp?.toMillis) {
    return ride.departureTimestamp.toMillis()
  }
  if (ride.departureTimestamp?.seconds) {
    return ride.departureTimestamp.seconds * 1000
  }
  if (ride.departureDate && ride.departureTime) {
    const d = new Date(`${ride.departureDate}T${ride.departureTime}:00`)
    if (!isNaN(d.getTime())) return d.getTime()
  }
  return 0
}

export default function PoolList({ onConfirmed, onNotice, currentUser }) {
  const [rides, setRides] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'rides'), where('matched', '==', false)),
      (snapshot) => {
        setRides(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })))
        setLoading(false)
      },
      (error) => {
        console.error(error)
        onNotice('Could not load rides. Check your Firebase configuration and Firestore rules.')
        setLoading(false)
      }
    )
    return unsubscribe
  }, [onNotice])

  // Group rides by case-insensitive destination text AND departure timestamp within 15 mins
  const { pools } = useMemo(() => {
    if (!rides.length) return { pools: [] }

    const allocated = new Set()
    const groups = []

    for (let i = 0; i < rides.length; i++) {
      if (allocated.has(rides[i].id)) continue

      const baseRide = rides[i]
      const currentGroup = [baseRide]
      allocated.add(baseRide.id)

      const baseDestKey = (baseRide.destination || '').trim().toLowerCase()
      const baseTimeMs = getRideTimestampMs(baseRide)

      for (let j = i + 1; j < rides.length; j++) {
        if (allocated.has(rides[j].id)) continue

        const compareRide = rides[j]
        const compareDestKey = (compareRide.destination || '').trim().toLowerCase()
        const compareTimeMs = getRideTimestampMs(compareRide)

        // A rider can only form a pool with a different account, never with another
        // post of their own. Older documents without uid retain their existing behavior.
        if (baseRide.uid && compareRide.uid && baseRide.uid === compareRide.uid) continue

        // Must match destination text (case-insensitive)
        if (baseDestKey !== compareDestKey) continue

        // Must be within 15 minutes of base ride departure timestamp
        if (baseTimeMs > 0 && compareTimeMs > 0) {
          const timeDiffMs = Math.abs(baseTimeMs - compareTimeMs)
          if (timeDiffMs <= FIFTEEN_MINUTES_MS) {
            currentGroup.push(compareRide)
            allocated.add(compareRide.id)
          }
        }
      }

      // Calculate geographic midpoint (average lat/lng) for members with GPS coordinates
      const validGpsMembers = currentGroup.filter(
        (r) => r.riderLocation && typeof r.riderLocation.lat === 'number' && typeof r.riderLocation.lng === 'number'
      )

      let meetingPoint = null
      if (validGpsMembers.length > 0) {
        const totalLats = validGpsMembers.reduce((sum, r) => sum + r.riderLocation.lat, 0)
        const totalLngs = validGpsMembers.reduce((sum, r) => sum + r.riderLocation.lng, 0)
        meetingPoint = {
          lat: totalLats / validGpsMembers.length,
          lng: totalLngs / validGpsMembers.length,
        }
      }

      groups.push({
        from: baseRide.from,
        destination: baseRide.destination,
        departureDate: baseRide.departureDate,
        departureTime: baseRide.departureTime,
        departureTimestamp: baseRide.departureTimestamp,
        rides: currentGroup,
        meetingPoint,
        validGpsMembers,
      })
    }

    return {
      pools: groups.filter((group) => {
        const distinctRiders = new Set(group.rides.map((ride) => ride.uid || ride.id))
        return group.rides.length >= 2 && distinctRiders.size >= 2
      }),
    }
  }, [rides])

  const myRides = useMemo(
    () => rides.filter((ride) => ride.uid && ride.uid === currentUser?.uid),
    [rides, currentUser?.uid]
  )
  const myPools = useMemo(
    () => pools.filter((pool) => !currentUser?.uid || pool.rides.some((ride) => ride.uid === currentUser.uid)),
    [pools, currentUser?.uid]
  )

  return (
    <section className="mt-12">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            Live CoRide Matches
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Riders paired within 15 minutes of departure and the same destination.
          </p>
        </div>
        <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
          {myPools.length} Active Pools
        </span>
      </div>

      {myRides.length > 0 && (
        <section className="mb-6 rounded-2xl border border-indigo-500/25 bg-indigo-950/20 p-4 shadow-lg shadow-indigo-950/10">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-300">
              <span className="grid h-6 w-6 place-items-center rounded-lg border border-indigo-500/30 bg-indigo-500/15 text-indigo-300">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3zm0 0c0 1.657 1.343 3 3 3s3-1.343 3-3-1.343-3-3-3-3 1.343-3 3zm-3 3v6m6-6v6" />
                </svg>
              </span>
              Your active ride{myRides.length > 1 ? 's' : ''}
            </h3>
            <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-[10px] font-bold text-indigo-300">Looking for a match</span>
          </div>
          <div className="space-y-2">
            {myRides.map((ride) => (
              <article key={ride.id} className="rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-100">{ride.from} <span className="mx-1.5 text-indigo-400">→</span> {ride.destination}</p>
                    <p className="mt-1 text-xs text-slate-400">{formatDepartureDisplay(ride.departureDate, ride.departureTime, ride.departureTimestamp)}{ride.event && <> <span className="mx-1">·</span> {ride.event}</>}</p>
                  </div>
                  <span className="self-start rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-semibold text-slate-300 sm:self-auto">Posted by you</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-400">
          <svg className="mx-auto h-8 w-8 animate-spin text-indigo-400 mb-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading active rides...
        </div>
      ) : myPools.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-10 text-center text-slate-400">
          <svg className="mx-auto h-10 w-10 text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-semibold text-slate-300">No pools forming just yet</p>
          <p className="mt-1 text-xs text-slate-500">New ride posts will appear here once a match is found.</p>
        </div>
      ) : (
        <>
          {/* Active Pools */}
          <div className="space-y-6">
            {myPools.map((pool, index) => (
              <PoolCard
                key={`${pool.destination}-${pool.departureDate}-${pool.departureTime}-${index}`}
                pool={pool}
                onConfirmed={onConfirmed}
                onNotice={onNotice}
                currentUser={currentUser}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
