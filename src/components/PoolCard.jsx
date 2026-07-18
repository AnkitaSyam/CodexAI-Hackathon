import { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { db } from '../firebase'
import { formatDepartureDisplay } from '../utils/dateUtils'

// Fix Leaflet default marker icon path issue in Vite
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})
L.Marker.prototype.options.icon = DefaultIcon

// Custom Leaflet DivIcon for Rider location (Indigo circle)
const createRiderDivIcon = (initials) =>
  L.divIcon({
    className: 'custom-leaflet-rider-marker',
    html: `
      <div style="
        background: linear-gradient(135deg, #6366f1, #4f46e5);
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 2.5px solid #ffffff;
        box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 10px;
        font-weight: 700;
      ">
        ${initials || ''}
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })

// Custom Leaflet DivIcon for Suggested Meeting Point (Emerald circle)
const meetingDivIcon = L.divIcon({
  className: 'custom-leaflet-meeting-marker',
  html: `
    <div style="
      background: linear-gradient(135deg, #10b981, #059669);
      width: 26px;
      height: 26px;
      border-radius: 50%;
      border: 3px solid #ffffff;
      box-shadow: 0 0 16px rgba(16, 185, 129, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="width: 8px; height: 8px; background-color: #ffffff; border-radius: 50%;"></div>
    </div>
  `,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
})

const fallbackMessage = (pool, departureFormatted) =>
  `You’re all set for ${pool.destination}! Please agree on a meeting point and head out together for your departure at ${departureFormatted}.`

export default function PoolCard({ pool, onConfirmed, onNotice }) {
  const [confirming, setConfirming] = useState(false)
  const fareEach = Math.ceil(40 / pool.rides.length)

  // Formatted departure date and 12-hour AM/PM time
  const departureFormatted = formatDepartureDisplay(
    pool.departureDate,
    pool.departureTime,
    pool.departureTimestamp
  )

  // Determine if GPS map coordinates are present for members
  const gpsMembers = pool.rides.filter(
    (r) => r.riderLocation && typeof r.riderLocation.lat === 'number' && typeof r.riderLocation.lng === 'number'
  )
  const hasGpsMap = gpsMembers.length > 0 && pool.meetingPoint

  async function confirmPool() {
    setConfirming(true)
    const people = pool.rides.map(({ name, from }) => `${name} (from ${from || 'nearby'})`).join(', ')
    let message = fallbackMessage(pool, departureFormatted)

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          max_tokens: 90,
          messages: [
            {
              role: 'system',
              content:
                'Write a warm, practical coordination message in at most two short sentences. Mention the riders, their starting points, destination, and exact departure date and time. No markdown or emojis.',
            },
            {
              role: 'user',
              content: `Riders: ${people}. Destination: ${pool.destination}. Departure Date & Time: ${departureFormatted}.`,
            },
          ],
        }),
      })

      if (!response.ok) throw new Error('Groq request failed')
      const data = await response.json()
      message = data.choices?.[0]?.message?.content?.trim() || message
    } catch (error) {
      console.warn('Using fallback coordination message:', error)
    }

    try {
      await Promise.all(pool.rides.map((ride) => updateDoc(doc(db, 'rides', ride.id), { matched: true })))
      onConfirmed({ ...pool, message, departureFormatted })
      onNotice('Pool confirmed! Have a safe ride.')
    } catch (error) {
      console.error(error)
      onNotice('Could not confirm the pool. Please try again.')
    } finally {
      setConfirming(false)
    }
  }

  // Derive unique 'from' locations if multiple riders specify different starting points
  const fromLocations = Array.from(new Set(pool.rides.map((r) => r.from).filter(Boolean))).join(' / ')
  const cardTitle = fromLocations ? `From ${fromLocations} → ${pool.destination}` : pool.destination

  return (
    <article className="group rounded-2xl border border-slate-800 bg-slate-900/90 p-5 sm:p-6 shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10">
      {/* Pool Card Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
            <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
            {departureFormatted}
          </span>
          <h3 className="mt-1 text-lg sm:text-xl font-bold text-white tracking-tight">
            {cardTitle}
          </h3>
        </div>
        <span className="inline-flex items-center rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 text-xs font-bold text-indigo-300">
          {pool.rides.length} Riders Matched
        </span>
      </div>

      {/* Embedded Leaflet Map Preview (Displayed if member GPS coordinates exist) */}
      {hasGpsMap && (
        <div className="mb-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80 relative z-0">
          <MapContainer
            center={[pool.meetingPoint.lat, pool.meetingPoint.lng]}
            zoom={14}
            scrollWheelZoom={false}
            style={{ width: '100%', height: '220px' }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Member GPS Location Markers */}
            {gpsMembers.map((ride, idx) => {
              const initial = ride.name ? ride.name.charAt(0).toUpperCase() : ''
              return (
                <Marker
                  key={ride.id || idx}
                  position={[ride.riderLocation.lat, ride.riderLocation.lng]}
                  icon={createRiderDivIcon(initial)}
                >
                  <Popup>
                    <div className="text-xs font-sans">
                      <strong className="text-indigo-900">{ride.name}</strong>
                      <br />
                      <span className="text-slate-600">From {ride.from}</span>
                    </div>
                  </Popup>
                </Marker>
              )
            })}

            {/* Suggested Meeting Point Marker */}
            <Marker position={[pool.meetingPoint.lat, pool.meetingPoint.lng]} icon={meetingDivIcon}>
              <Popup>
                <div className="text-xs font-sans text-center">
                  <strong className="text-emerald-700">Suggested Meeting Point</strong>
                  <br />
                  <span className="text-slate-600">Geographic Midpoint of Members</span>
                </div>
              </Popup>
            </Marker>
          </MapContainer>

          {/* Map Legend Bar */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5 z-[400] flex items-center justify-between rounded-lg bg-slate-900/90 px-3 py-1.5 text-[11px] font-medium text-slate-300 backdrop-blur border border-slate-700/60 pointer-events-none">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 border border-white" />
                Riders
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-emerald-500 border border-white" />
                Suggested Meeting Point
              </span>
            </div>
            <span className="hidden sm:inline text-slate-400 font-mono">GPS Calculated</span>
          </div>
        </div>
      )}

      {/* Suggested Meeting Point Banner (Displayed if GPS coords exist) */}
      {hasGpsMap && (
        <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-950/30 p-3 text-xs text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
            </span>
            <div>
              <span className="font-semibold text-emerald-200">Suggested Meeting Point:</span>
              <span className="ml-1 text-slate-300">
                Midpoint ({pool.meetingPoint.lat.toFixed(4)}, {pool.meetingPoint.lng.toFixed(4)})
              </span>
            </div>
          </div>
          <span className="text-[10px] text-emerald-400/80 uppercase font-mono">GPS Active</span>
        </div>
      )}

      {/* Members List */}
      <div className="space-y-2.5">
        {pool.rides.map((ride) => (
          <div
            key={ride.id}
            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-200 text-sm">{ride.name}</span>
                {ride.from && (
                  <span className="text-xs text-slate-400">
                    · Leaving from <strong className="text-slate-300 font-medium">{ride.from}</strong>
                  </span>
                )}
              </div>
              {ride.note && <p className="mt-0.5 text-xs text-slate-400">{ride.note}</p>}
            </div>
            <span className="text-xs text-slate-400 font-medium">
              {formatDepartureDisplay(ride.departureDate, ride.departureTime, ride.departureTimestamp)}
            </span>
          </div>
        ))}
      </div>

      {/* Estimated Fare Split */}
      <div className="mt-4 flex items-center justify-between rounded-xl bg-indigo-950/40 border border-indigo-500/20 px-4 py-3 text-xs sm:text-sm text-indigo-300">
        <span>Estimated total auto fare: <strong className="text-white">₹40</strong></span>
        <span className="font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
          ₹{fareEach} per rider
        </span>
      </div>

      {/* Action button */}
      <button
        onClick={confirmPool}
        disabled={confirming}
        className="mt-4 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:from-emerald-600 hover:to-emerald-700 hover:shadow-emerald-500/30 focus:ring-4 focus:ring-emerald-500/30 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {confirming ? (
          <>
            <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Confirming Pool...
          </>
        ) : (
          <>
            Confirm & Join Pool
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </>
        )}
      </button>
    </article>
  )
}
