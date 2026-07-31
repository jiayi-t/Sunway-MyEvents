import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrganizerEventsQuery } from '../api/queries'
import { toMYT, todayMYT } from '../utils/datetime.utils'
import { eventColor, categoryPillStyle, audiencePillClass, pricingPillClass } from '../utils/event-colors.utils'
import { ChevronLeft, ChevronRight, Clock, MapPin, ImageOff } from 'lucide-react'

interface OrganizerCalendarEvent {
  id: string
  name: string
  date: string
  start_time: string
  end_time: string
  venue: string
  category: string
  audience: string
  pricing: number
  image_url: string
  cancelled_at?: string | null
  archived_at?: string | null
}

const MYT = 'Asia/Kuala_Lumpur'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const pad = (n: number) => String(n).padStart(2, '0')

const formatTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleTimeString('en-MY', { timeZone: MYT, hour: 'numeric', minute: '2-digit', hour12: true })
    : 'TBA'

const formatTimeRange = (start?: string, end?: string) =>
  start && end ? `${formatTime(start)} - ${formatTime(end)}` : 'Time TBA'

// "2026-07-17" to "Friday, 17 July 2026"
const formatDayHeading = (day: string) =>
  new Date(`${day}T12:00:00+08:00`).toLocaleDateString('en-MY', {
    timeZone: MYT, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

// the organizer's own events on a month grid, no filters
export default function OrganizerCalendar() {
  const navigate = useNavigate()

  const today = todayMYT()
  const [todayYear, todayMonth] = today.split('-').map(Number)

  // the visible month, seeded from today in MYT rather than the browser's timezone
  const [cursor, setCursor] = useState({ year: todayYear, month: todayMonth - 1 })
  const [selectedDay, setSelectedDay] = useState<string | null>(today)

  const { data, isLoading } = useOrganizerEventsQuery()
  const events = (data ?? []) as OrganizerCalendarEvent[]

  // MYT calendar day shows that day's events, sorted by start time
  const eventsByDay = useMemo(() => {
    const map: Record<string, OrganizerCalendarEvent[]> = {}
    for (const event of events) {
      const day = toMYT(event.date ?? event.start_time)
      ;(map[day] ??= []).push(event)
    }
    for (const day of Object.keys(map)) {
      map[day].sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''))
    }
    return map
  }, [events])

  const { year, month } = cursor
  const monthPrefix = `${year}-${pad(month + 1)}`

  // week starts on Sunday, padded with the surrounding months
  const cells = useMemo(() => {
    const firstWeekday = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7

    return Array.from({ length: totalCells }, (_, i) => {
      const dayOffset = i - firstWeekday
      const d = new Date(year, month, dayOffset + 1)
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      return { key, dayNumber: d.getDate(), inMonth: dayOffset >= 0 && dayOffset < daysInMonth }
    })
  }, [year, month])

  // when the month changes, reset the selected day to today if the new month is the current month, otherwise clear it
  useEffect(() => {
    setSelectedDay(monthPrefix === today.slice(0, 7) ? today : null)
  }, [monthPrefix, today])

  const shiftMonth = (delta: number) =>
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })

  const goToToday = () => {
    setCursor({ year: todayYear, month: todayMonth - 1 })
    setSelectedDay(today)
  }

  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-MY', { month: 'long' })
  const selectedEvents = selectedDay ? eventsByDay[selectedDay] ?? [] : []

  return (
    <div className="bg-card rounded-xl shadow p-4">
      <h2 className="text-primary font-semibold text-sm mb-3">My Calendar</h2>

      {/* Month header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-base">
          <span className="font-bold text-foreground">{monthLabel}</span>{' '}
          <span className="text-muted-foreground">{year}</span>
        </h3>
        <div className="flex items-center gap-1.5">
          {/* offer the reset whenever the view has moved off today, by month or by selected date */}
          {!(monthPrefix === today.slice(0, 7) && selectedDay === today) && (
            <button
              onClick={goToToday}
              className="text-xs font-semibold text-primary border border-border rounded-full px-2.5 py-1 cursor-pointer"
            >
              Today
            </button>
          )}
          <button
            onClick={() => shiftMonth(-1)}
            className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-foreground cursor-pointer"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => shiftMonth(1)}
            className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-foreground cursor-pointer"
            aria-label="Next month"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Month grid */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="grid grid-cols-7 bg-surface">
          {WEEKDAYS.map((d, i) => (
            <div key={i} className="px-1 py-1.5 text-center text-[10px] font-semibold text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((cell, i) => {
            const dayEvents = cell.inMonth ? eventsByDay[cell.key] ?? [] : []
            const isToday = cell.key === today
            const isSelected = cell.key === selectedDay

            return (
              <div
                key={cell.key}
                onClick={() => cell.inMonth && setSelectedDay(cell.key)}
                className={`relative border-t border-border min-h-[3.75rem] p-1 flex flex-col gap-0.5 overflow-hidden
                  ${i % 7 === 6 ? '' : 'border-r'}
                  ${cell.inMonth ? 'cursor-pointer hover:bg-surface' : 'bg-surface/60'}
                  ${isSelected ? 'ring-2 ring-inset ring-primary' : ''}`}
              >
                <span className={`text-[11px] self-start leading-none
                  ${!cell.inMonth ? 'text-muted-foreground/50' : ''}
                  ${isToday ? 'bg-accent text-white font-bold rounded-full w-5 h-5 flex items-center justify-center' : 'p-0.5'}`}
                >
                  {cell.dayNumber}
                </span>

                {/* two names fit before the cell gets crowded, the rest are reachable through the day panel below */}
                {dayEvents.slice(0, 2).map(e => (
                  <button
                    key={e.id}
                    onClick={ev => { ev.stopPropagation(); navigate(`/organizer/events/${e.id}`) }}
                    title={e.name}
                    className="flex items-start gap-1 text-left min-w-0 cursor-pointer group"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full mt-[3px] flex-shrink-0"
                      style={{ backgroundColor: eventColor(e) }}
                    />
                    <span className={`text-[10px] leading-tight line-clamp-1 min-w-0 group-hover:underline
                      ${e.cancelled_at ? 'line-through text-muted-foreground' : e.archived_at ? 'text-muted-foreground' : 'text-foreground'}`}
                    >
                      {e.name}
                    </span>
                  </button>
                ))}
                {dayEvents.length > 2 && (
                  <span className="text-[10px] text-muted-foreground pl-2.5 leading-tight">
                    +{dayEvents.length - 2} more
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-2 mb-2">
            <h3 className="font-bold text-foreground text-sm">{formatDayHeading(selectedDay)}</h3>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {selectedEvents.length} {selectedEvents.length === 1 ? 'event' : 'events'}
            </span>
          </div>

          {isLoading ? (
            <p className="text-muted-foreground text-sm py-4">Loading events...</p>
          ) : selectedEvents.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">No events on this day.</p>
          ) : (
            <div className="space-y-3">
              {selectedEvents.map(event => (
                // same event card as other pages with an additional category colour bar on the left
                <div
                  key={event.id}
                  onClick={() => navigate(`/organizer/events/${event.id}`)}
                  className="bg-card rounded-xl shadow flex gap-3 p-3 cursor-pointer hover:shadow-md transition items-center"
                >
                  <span className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: eventColor(event) }} />

                  <div
                    className="flex-shrink-0 overflow-hidden rounded-lg self-center"
                    style={{ width: '72px', aspectRatio: '4/5' }}
                  >
                    {event.image_url
                      ? <img
                          src={event.image_url}
                          alt={event.name}
                          className="w-full h-full object-cover object-center"
                        />
                      : <div className="w-full h-full bg-surface flex items-center justify-center"><ImageOff className="w-5 h-5 text-border" /></div>
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-bold text-foreground text-sm leading-tight line-clamp-2">{event.name}</h3>
                      {event.archived_at ? (
                        <span className="bg-gray-500 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">ARCHIVED</span>
                      ) : event.cancelled_at && (
                        <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">CANCELLED</span>
                      )}
                    </div>

                    <div className="text-muted-foreground text-xs mt-1.5 flex flex-col gap-1">
                      <div className="inline-flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-black flex-shrink-0" />
                        <span>{formatTimeRange(event.start_time, event.end_time)}</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-black flex-shrink-0" />
                        <span className="truncate">{event.venue}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {event.category && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full" {...categoryPillStyle(event.category)}>
                          {event.category}
                        </span>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${audiencePillClass(event.audience)}`}>
                        {event.audience === 'students_only' ? 'Students Only' : 'Open to Public'}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${pricingPillClass(event.pricing)}`}>
                        {Number(event.pricing) === 0 ? 'Free' : 'Paid'}
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-muted-foreground self-center flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
