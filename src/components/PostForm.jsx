import { useState, useEffect } from 'react'
import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore'
import DatePicker from 'react-datepicker'
import dayjs from 'dayjs'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { TimePicker } from '@mui/x-date-pickers/TimePicker'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { auth, db } from '../firebase'

const pickerTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#818cf8' },
    background: { paper: '#0f172a' },
    text: { primary: '#f8fafc', secondary: '#94a3b8' },
  },
  components: {
    MuiPaper: { styleOverrides: { root: { border: '1px solid #334155', borderRadius: '1rem' } } },
    MuiClockPointer: { styleOverrides: { root: { backgroundColor: '#818cf8' }, thumb: { borderColor: '#818cf8', backgroundColor: '#818cf8' } } },
    MuiClockNumber: { styleOverrides: { root: { color: '#e2e8f0', '&.Mui-selected': { backgroundColor: '#6366f1', color: '#fff' } } } },
  },
})

function isSameCalendarDay(first, second) {
  return first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate()
}

export default function PostForm({ onNotice, currentUser }) {
  const getDefaultName = (user) => {
    if (user?.displayName) return user.displayName
    if (user?.email) return user.email.split('@')[0]
    return ''
  }

  const [name, setName] = useState(getDefaultName(currentUser))
  const [from, setFrom] = useState('')
  const [destination, setDestination] = useState('')
  const [departureDateObj, setDepartureDateObj] = useState(null)
  const [pickerOpenedAt, setPickerOpenedAt] = useState(() => new Date())
  const [note, setNote] = useState('')
  const [userCoords, setUserCoords] = useState(null)
  const [gettingLocation, setGettingLocation] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // Update name if currentUser updates
  useEffect(() => {
    if (currentUser) {
      setName(getDefaultName(currentUser))
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

    const isPastDeparture = departureDateObj && departureDateObj.getTime() <= new Date().getTime()
    const nextErrors = {
      name: !name.trim() && 'Please enter your name.',
      from: !trimmedFrom && 'Please enter your departure location.',
      destination: !trimmedDestination && 'Please enter your destination.',
      departureDateObj: !departureDateObj
        ? 'Please select a departure date & time.'
        : isPastDeparture && 'Please select a future date and time.',
    }

    const visibleErrors = Object.fromEntries(Object.entries(nextErrors).filter(([, v]) => v))
    setErrors(visibleErrors)
    if (Object.keys(visibleErrors).length > 0) return

    setSubmitting(true)

    try {
      const uid = auth.currentUser?.uid
      if (!uid) {
        onNotice('Please sign in again before posting a ride.')
        return
      }

      const year = departureDateObj.getFullYear()
      const month = String(departureDateObj.getMonth() + 1).padStart(2, '0')
      const day = String(departureDateObj.getDate()).padStart(2, '0')
      const hours = String(departureDateObj.getHours()).padStart(2, '0')
      const minutes = String(departureDateObj.getMinutes()).padStart(2, '0')

      const departureDate = `${year}-${month}-${day}`
      const departureTime = `${hours}:${minutes}`
      const departureTimestamp = Timestamp.fromDate(departureDateObj)

      await addDoc(collection(db, 'rides'), {
        name: name.trim(),
        uid,
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

      // Reset form fields
      setFrom('')
      setDestination('')
      setDepartureDateObj(null)
      setNote('')
      onNotice('Ride posted! Searching for CoRide matches...')
    } catch (error) {
      console.error('Failed to post ride:', error)
      if (error?.code === 'permission-denied') {
        onNotice('Ride could not be posted: your Firestore rules denied this account.')
      } else {
        onNotice('Could not post your ride. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  function handleDateChange(date) {
    if (!date) {
      setDepartureDateObj(null)
      return
    }

    setDepartureDateObj((current) => {
      const next = new Date(date)
      if (current) next.setHours(current.getHours(), current.getMinutes(), 0, 0)
      else if (isSameCalendarDay(next, new Date())) {
        // Start at the next five-minute boundary so the clock never begins on a past time.
        const earliest = new Date()
        earliest.setSeconds(0, 0)
        earliest.setMinutes((Math.floor(earliest.getMinutes() / 5) + 1) * 5)
        next.setHours(earliest.getHours(), earliest.getMinutes(), 0, 0)
      } else next.setHours(0, 0, 0, 0)
      return next
    })
    setErrors((current) => ({ ...current, departureDateObj: undefined }))
  }

  function handleTimeChange(value) {
    if (!value || !departureDateObj) return
    const next = new Date(departureDateObj)
    next.setHours(value.hour(), value.minute(), 0, 0)
    setDepartureDateObj(next)
    setErrors((current) => ({ ...current, departureDateObj: undefined }))
  }

  return (
    <section className="surface-card boarding-card rounded-3xl p-5 sm:p-8">
      <div className="mb-7 flex flex-col gap-4 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#ff9e64]/20 bg-[#ff6f61]/10 text-[#ffae86] shadow-lg shadow-[#ff6f61]/10">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </span>
            Set your route
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-400 sm:text-sm">
            Add the essentials. We’ll surface people making the same journey.
          </p>
        </div>

        {/* GPS location status pill */}
        <div className="flex items-center gap-2 self-start rounded-full border border-white/[0.08] bg-[#101014] px-3 py-1.5 text-xs text-slate-300 sm:self-auto">
          <span className={`h-2 w-2 rounded-full ${userCoords ? 'bg-[#b1ff62] animate-pulse' : gettingLocation ? 'bg-[#ff9e64] animate-ping' : 'bg-slate-500'}`} />
          {userCoords ? 'GPS Live Location Active' : gettingLocation ? 'Locating...' : 'GPS Inactive'}
        </div>
      </div>

      <form onSubmit={submit} className="space-y-5">
        {/* Name input (prefilled from account) */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Your Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full rounded-xl border bg-slate-950/70 px-4 py-3 text-sm text-slate-100 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-600 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 ${
              errors.name ? 'border-rose-500/80' : 'border-slate-800'
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
            className={`w-full rounded-xl border bg-slate-950/70 px-4 py-3 text-sm text-slate-100 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-600 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 ${
              errors.from ? 'border-rose-500/80' : 'border-slate-800'
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
            className={`w-full rounded-xl border bg-slate-950/70 px-4 py-3 text-sm text-slate-100 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-600 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 ${
              errors.destination ? 'border-rose-500/80' : 'border-slate-800'
            }`}
          />
          {errors.destination && (
            <p className="mt-1.5 text-xs font-medium text-rose-400">{errors.destination}</p>
          )}
        </div>

        {/* Calendar and clock-face time picker */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Departure Date & Time
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="relative">
            <DatePicker
              selected={departureDateObj}
              onChange={handleDateChange}
              minDate={new Date()}
              onCalendarOpen={() => setPickerOpenedAt(new Date())}
              dateFormat="MMMM d, yyyy"
              placeholderText="Select departure date..."
              className={`w-full rounded-xl border bg-slate-950/70 px-4 py-3 text-sm text-slate-100 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-600 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 ${
                errors.departureDateObj ? 'border-rose-500/80' : 'border-slate-800'
              }`}
            />
            <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            </div>
            <ThemeProvider theme={pickerTheme}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <TimePicker
                  label="Departure time"
                  value={departureDateObj ? dayjs(departureDateObj) : null}
                  onChange={handleTimeChange}
                  onOpen={() => setPickerOpenedAt(new Date())}
                  disabled={!departureDateObj}
                  minTime={departureDateObj && isSameCalendarDay(departureDateObj, pickerOpenedAt) ? dayjs(pickerOpenedAt) : undefined}
                  disableIgnoringDatePartForTimeValidation
                  views={['hours', 'minutes']}
                  minutesStep={5}
                  ampm
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: Boolean(errors.departureDateObj),
                      placeholder: departureDateObj ? 'Choose time' : 'Choose date first',
                      InputLabelProps: { sx: { color: '#94a3b8' } },
                      sx: {
                        '& .MuiOutlinedInput-root': { color: '#f8fafc', borderRadius: '0.75rem', backgroundColor: '#020617', '& fieldset': { borderColor: errors.departureDateObj ? '#fb7185' : '#1e293b' }, '&:hover fieldset': { borderColor: '#475569' }, '&.Mui-focused fieldset': { borderColor: '#6366f1' } },
                        '& .MuiSvgIcon-root': { color: '#a5b4fc' },
                      },
                    },
                    popper: { sx: { '& .MuiClock-pin, & .MuiClockPointer-root': { backgroundColor: '#818cf8' } } },
                  }}
                />
              </LocalizationProvider>
            </ThemeProvider>
          </div>
          {errors.departureDateObj && (
            <p className="mt-1.5 text-xs font-medium text-rose-400">{errors.departureDateObj}</p>
          )}
        </div>

        {/* Pickup Note */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Pickup Details / Note (Optional)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-600 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
          />
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={submitting}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#b1ff62] px-6 py-3.5 text-sm font-extrabold text-[#15151b] shadow-lg shadow-[#b1ff62]/10 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#c7ff91] hover:shadow-xl hover:shadow-[#b1ff62]/15 focus:ring-4 focus:ring-[#b1ff62]/20 active:translate-y-0 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
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
