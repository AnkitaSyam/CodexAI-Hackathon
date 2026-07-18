/**
 * Converts a 24-hour time string ("17:30") to 12-hour AM/PM format ("5:30 PM")
 */
export function formatTime12Hour(time24Str) {
  if (!time24Str) return ''
  const [hoursStr, minutesStr] = time24Str.split(':')
  let hours = parseInt(hoursStr, 10)
  const minutes = minutesStr ? minutesStr.padStart(2, '0') : '00'
  if (isNaN(hours)) return time24Str

  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  hours = hours ? hours : 12 // 0 becomes 12

  return `${hours}:${minutes} ${ampm}`
}

/**
 * Combines dateStr ("YYYY-MM-DD") and timeStr ("HH:MM") into a JS Date object
 */
export function getDepartureDateObj(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null
  const isoStr = `${dateStr}T${timeStr}:00`
  const dateObj = new Date(isoStr)
  return isNaN(dateObj.getTime()) ? null : dateObj
}

/**
 * Formats departure date & time for human-readable display:
 * - "Today, 5:30 PM"
 * - "Tomorrow, 5:30 PM"
 * - "Jul 20, 5:30 PM"
 */
export function formatDepartureDisplay(dateStr, timeStr, timestamp) {
  let targetDate = null

  if (timestamp && typeof timestamp.toDate === 'function') {
    targetDate = timestamp.toDate()
  } else if (timestamp instanceof Date) {
    targetDate = timestamp
  } else if (dateStr && timeStr) {
    targetDate = getDepartureDateObj(dateStr, timeStr)
  }

  if (!targetDate) {
    if (dateStr && timeStr) return `${dateStr} at ${formatTime12Hour(timeStr)}`
    return 'Upcoming'
  }

  const timeFormatted = formatTime12Hour(
    timeStr || `${String(targetDate.getHours()).padStart(2, '0')}:${String(targetDate.getMinutes()).padStart(2, '0')}`
  )

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const checkDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())

  if (checkDate.getTime() === today.getTime()) {
    return `Today, ${timeFormatted}`
  } else if (checkDate.getTime() === tomorrow.getTime()) {
    return `Tomorrow, ${timeFormatted}`
  } else {
    const monthShort = targetDate.toLocaleString('default', { month: 'short' })
    const day = targetDate.getDate()
    return `${monthShort} ${day}, ${timeFormatted}`
  }
}
