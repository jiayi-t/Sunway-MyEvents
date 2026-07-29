import { useState, useRef, useEffect } from 'react'
import { CalendarPlus, ChevronRight } from 'lucide-react'

export interface CalendarExportEvent {
  id: string
  name: string
  description?: string | null
  start_time: string
  end_time: string
  venue: string
  organizer_name?: string | null
}

// ISO instant -> "20260717T010000Z", the UTC form both Google and iCalendar accept regardless of the viewer's timezone
const toUtcStamp = (iso: string) =>
  new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

const eventUrl = (id: string) => `${window.location.origin}/events/${id}`

const buildDetails = (event: CalendarExportEvent) =>
  [
    event.description?.trim(),
    event.organizer_name ? `Organised by ${event.organizer_name}` : null,
    `Event details: ${eventUrl(event.id)}`,
  ].filter(Boolean).join('\n\n')

function googleCalendarUrl(event: CalendarExportEvent) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.name,
    dates: `${toUtcStamp(event.start_time)}/${toUtcStamp(event.end_time)}`,
    details: buildDetails(event),
    location: event.venue ?? '',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

// RFC 5545 (iCalendar) escaping, backslash first so the escapes it adds are not re-escaped
const escapeIcs = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

function buildIcs(event: CalendarExportEvent) {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sunway MyEvents//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${event.id}@sunway-myevents`,
    `DTSTAMP:${toUtcStamp(new Date().toISOString())}`,
    `DTSTART:${toUtcStamp(event.start_time)}`,
    `DTEND:${toUtcStamp(event.end_time)}`,
    `SUMMARY:${escapeIcs(event.name)}`,
    `DESCRIPTION:${escapeIcs(buildDetails(event))}`,
    `LOCATION:${escapeIcs(event.venue ?? '')}`,
    `URL:${eventUrl(event.id)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

function downloadIcs(event: CalendarExportEvent) {
  const blob = new Blob([buildIcs(event)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${event.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'event'}.ics`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function AddToCalendarButton({
  event,
  cancelled,
  className = '',
}: {
  event: CalendarExportEvent
  cancelled?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (open && wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // nothing to add for a cancelled event or one that has already finished
  if (cancelled || !event.start_time || !event.end_time) return null
  if (new Date(event.end_time) < new Date()) return null

  const choose = (action: () => void) => {
    action()
    setOpen(false)
  }

  return (
    // inline-block so the wrapper hugs the button even outside a centred flex parent
    <div ref={wrapperRef} className={`relative inline-block ${className}`}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-2 border border-accent text-accent text-sm font-semibold px-4 py-2 rounded-full cursor-pointer bg-card"
      >
        <CalendarPlus className="w-4 h-4 flex-shrink-0" />
        Add to calendar
        {/* kept in the layout while open so the button does not resize under the panel */}
        <ChevronRight className={`w-4 h-4 flex-shrink-0 ${open ? 'invisible' : ''}`} aria-hidden="true" />
      </button>

      {/* dropdown sits below the untouched button */}
      {open && (
        <div className="absolute left-0 top-full mt-1 min-w-full z-30 bg-card shadow-lg rounded-lg py-1 border border-border">
          <button
            onClick={() => choose(() => window.open(googleCalendarUrl(event), '_blank', 'noopener,noreferrer'))}
            className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-surface text-left cursor-pointer whitespace-nowrap"
          >
            Google Calendar
            <ChevronRight className="w-4 h-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
          <button
            onClick={() => choose(() => downloadIcs(event))}
            className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-surface text-left cursor-pointer whitespace-nowrap"
          >
            Apple / Outlook (.ics)
            <ChevronRight className="w-4 h-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}
