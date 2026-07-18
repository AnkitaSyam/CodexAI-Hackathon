import { useState, useEffect } from 'react'
import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { getDepartureDateObj } from '../utils/dateUtils'

export default function PostForm({ onNotice, currentUser }) {
  const [name, setName] = useState(currentUser?.displayName || '')
  const [from, setFrom] = useState('')
  const [destination, setDestination] = useState('')
  const [departureDate, setDepartureDate] = useState('')
  const [departureTime, setDepartureTime] = useState('')
  const [note, setNote] = useState('')
  const [userCoords, setUserCoords] = useState(null)
  const [gettingLocation, setGettingLocation] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // Auto-fill user name if logged in
  useEffect(() => {
    if (currentUser?.displayName && !name) {
      setName(currentUser.displayName)
    }
  }, [currentUser])

  // Capture user's live GPS coordinates via native browser Geolocation API
  useEffect(() => {
    if ('geolocation' in navigator) {
      setGettingLocation(true)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          })
          setGettingLocation(false)
        },
        (err) => {
          console.warn('Geolocation capture denied/failed:', err.message)
          setGettingLocation(false)
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      )
    }
  }, [])

  async function submit(event) {
    event.preventDefault()

    const trimmedFrom = from.trim()
    const trimmedDestination = destination.trim()

    const nextErrors = {
      name: !name.trim() && 'Please enter your name.',
      from: !trimmedFrom && 'Please enter your departure location.',
      destination: !trimmedDestination && 'Please enter your destination.',
      departureDate: !departureDate && 'Please select a departure date.',
      departureTime: !departureTime && 'Please select a departure time.',
    }

    const visibleErrors = Object.fromEntries(Object.entries(nextErrors).filter(([, v]) => v))
    setErrors(visibleErrors)
    if (Object.keys(visibleErrors).length > 0) return

    setSubmitting(true)

    try {
      const departureDateObj = getDepartureDateObj(departureDate, departureTime)
      const departureTimestamp = departureDateObj ? Timestamp.fromDate(departureDateObj) : null

      await addDoc(collection(db, 'rides'), {
        name: name.trim(),
        from: trimmedFrom,
        destination: trimmedDestination,
        departureDate,
        departureTime,
        departureTimestamp,
        note: note.trim(),
        riderLocation: userCoords || null,
        matched: false,
        createdAt: serverTimestamp(),
      })

      // Reset form
      setFrom('')
      setDestination('')
      setDepartureDate('')
      setDepartureTime('')
      setNote('')
      onNotice('Ride posted! Looking for CoRide matches...')
    } catch (error) {
      console.error('Failed to post ride:', error)
      onNotice('Could not post your ride. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-6 border-b border-slate-800/80 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </span>
            Where are you headed?
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Post your trip & instantly pair with students traveling your way.
          </p>
        </div>

        {/* GPS location status pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto rounded-full bg-slate-800/80 px-3 py-1.5 text-xs text-slate-300 border border-slate-700/60">
          <span className={`h-2 w-2 rounded-full ${userCoords ? 'bg-emerald-400 animate-pulse' : gettingLocation ? 'bg-amber-400 animate-ping' : 'bg-slate-500'}`} />
          {userCoords ? 'GPS Live Location Active' : gettingLocation ? 'Locating...' : 'GPS Inactive'}
        </div>
      </div>

      <form onSubmit={submit} className="space-y-5">
        {/* Name input */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Your Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full rounded-xl border bg-slate-900/80 px-4 py-3 text-sm text-slate-100 shadow-sm outline-none transition-all duration-200 focus:bg-slate-900 ${
              errors.name
                ? 'border-rose-500/80 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                : 'border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
            }`}
          />
          {errors.name && <p className="mt-1.5 text-xs font-medium text-rose-400">{errors.name}</p>}
        </div>

        {/* Leaving from free-text input */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Leaving from
          </label>
          <input
            type="text"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={`w-full rounded-xl border bg-slate-900/80 px-4 py-3 text-sm text-slate-100 shadow-sm outline-none transition-all duration-200 focus:bg-slate-900 ${
              errors.from
                ? 'border-rose-500/80 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                : 'border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
            }`}
          />
          {errors.from && <p className="mt-1.5 text-xs font-medium text-rose-400">{errors.from}</p>}
        </div>

        {/* Event / Where are you headed free-text input */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Event / Where are you headed
          </label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className={`w-full rounded-xl border bg-slate-900/80 px-4 py-3 text-sm text-slate-100 shadow-sm outline-none transition-all duration-200 focus:bg-slate-900 ${
              errors.destination
                ? 'border-rose-500/80 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                : 'border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
            }`}
          />
          {errors.destination && (
            <p className="mt-1.5 text-xs font-medium text-rose-400">{errors.destination}</p>
          )}
        </div>

        {/* Separate Departure Date and Departure Time Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Departure Date
            </label>
            <input
              type="date"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
              className={`w-full rounded-xl border bg-slate-900/80 px-4 py-3 text-sm text-slate-100 shadow-sm outline-none transition-all duration-200 focus:bg-slate-900 ${
                errors.departureDate
                  ? 'border-rose-500/80 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
              }`}
            />
            {errors.departureDate && (
              <p className="mt-1.5 text-xs font-medium text-rose-400">{errors.departureDate}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Departure Time
            </label>
            <input
              type="time"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              className={`w-full rounded-xl border bg-slate-900/80 px-4 py-3 text-sm text-slate-100 shadow-sm outline-none transition-all duration-200 focus:bg-slate-900 ${
                errors.departureTime
                  ? 'border-rose-500/80 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
              }`}
            />
            {errors.departureTime && (
              <p className="mt-1.5 text-xs font-medium text-rose-400">{errors.departureTime}</p>
            )}
          </div>
        </div>

        {/* Note Input */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Pickup Details / Note (Optional)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 shadow-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:bg-slate-900"
          />
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={submitting}
          className="mt-2 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:from-indigo-600 hover:to-indigo-700 hover:shadow-indigo-500/35 focus:ring-4 focus:ring-indigo-500/30 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Posting ride...
            </>
          ) : (
            <>
              Post My Ride
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </>
          )}
        </button>
      </form>
    </section>
  )
}
