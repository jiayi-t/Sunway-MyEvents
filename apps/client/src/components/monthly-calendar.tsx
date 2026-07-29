import { useState, useMemo, useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEventsQuery, useMyRegistrationsQuery, useSavedEventsQuery } from '../api/queries'
import { toMYT, todayMYT } from '../utils/datetime.utils'
import { categoryColor, eventColor, categoryPillStyle, audiencePillClass, pricingPillClass } from '../utils/event-colors.utils'
import { ChevronLeft, ChevronRight, Clock, ImageOff, MapPin, User } from 'lucide-react'

interface CalendarEvent {
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
  organizer_id?: string
  organizer_name?: string
  organizer_image_url?: string | null
  cancelled_at?: string | null
}

// registrations and saved events come back with event_-prefixed columns, only the id is needed here
interface EventRef {
  event_id: string
}

const EVENT_CATEGORIES = ['Academics', 'Arts', 'Cultural', 'Entertainment', 'Social', 'Sports']

// a circle around the organizer's logo split into equal sectors, one per distinct event category colour 
const collarBackground = (colors: string[]) => {
  if (colors.length === 1) return colors[0]
  const step = 360 / colors.length
  return `conic-gradient(${colors.map((c, i) => `${c} ${step * i}deg ${step * (i + 1)}deg`).join(', ')})`
}

// one badge per organizer per day, carrying every category colour that organizer is running
function groupByOrganizer(events: CalendarEvent[]) {
  const groups: { key: string; event: CalendarEvent; colors: string[]; count: number }[] = []
  const seen = new Map<string, number>()

  for (const event of events) {
    const key = event.organizer_id ?? event.organizer_name ?? 'unknown'
    const at = seen.get(key)
    if (at === undefined) {
      seen.set(key, groups.length)
      groups.push({ key, event, colors: [eventColor(event)], count: 1 })
    } else {
      const group = groups[at]
      group.count++
      const color = eventColor(event)
      if (!group.colors.includes(color)) group.colors.push(color)
    }
  }
  return groups
}

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

// count pill inside the filter chip
const countBadge = (active: boolean) =>
  `text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
    active ? 'bg-white/20 text-white' : 'bg-gray-200 text-muted-foreground'
  }`

// fallback badge colours for organisers with no uploaded logo, picked deterministically so a club keeps the same colour
const ORGANIZER_COLORS = [
  'bg-rose-500', 'bg-orange-500', 'bg-amber-600', 'bg-emerald-600',
  'bg-teal-600', 'bg-sky-600', 'bg-indigo-500', 'bg-fuchsia-600',
]

// determine a consistent colour for an organizer based on their name
const organizerColor = (name: string) => {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return ORGANIZER_COLORS[Math.abs(hash) % ORGANIZER_COLORS.length]
}

const MYT = 'Asia/Kuala_Lumpur'

// pad a single digit number with leading zeros
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

// organizer logo changing to a colour-tinted person icon rather than the default grey one
function OrganizerBadge({ event, className = '' }: { event: CalendarEvent; className?: string }) {
  const [failed, setFailed] = useState(false)
  const name = event.organizer_name ?? 'Organizer'
  const src = event.organizer_image_url

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name}
        title={name}
        onError={() => setFailed(true)}
        className={`rounded-full object-cover bg-white ${className}`}
      />
    )
  }

  // same silhouette as the shared Avatar fallback, tinted per organiser so logo-less organizers are still distinct
  return (
    <span
      title={name}
      className={`rounded-full flex items-end justify-center overflow-hidden ${organizerColor(name)} ${className}`}
    >
      <User className="w-[90%] h-[90%] translate-y-[12%] text-white" aria-hidden="true" />
    </span>
  )
}

// header renders inside the calendar's own width container
export default function MonthlyCalendar({ enabled = true, header }: { enabled?: boolean; header?: ReactNode }) {
  const navigate = useNavigate()

  const today = todayMYT()
  const [todayYear, todayMonth] = today.split('-').map(Number)

  // the visible month, seeded from today in MYT rather than the browser's timezone
  const [cursor, setCursor] = useState({ year: todayYear, month: todayMonth - 1 })
  const [selectedDay, setSelectedDay] = useState<string | null>(today)
  const [category, setCategory] = useState('All')
  // the "My Events" toggle is a separate filter from the category chips, so it can be combined with any category
  const [mineOnly, setMineOnly] = useState(false)

  const { data: eventsData, isLoading } = useEventsQuery({ enabled })
  const events = (eventsData ?? []) as CalendarEvent[]

  // needed up front to show the event count, shared with the My Events page so can resolve from cache
  const { data: registrationsData } = useMyRegistrationsQuery({ enabled })
  const { data: savedData } = useSavedEventsQuery({ enabled })

  const myEventIds = useMemo(() => {
    const ids = new Set<string>()
    for (const r of (registrationsData ?? []) as EventRef[]) ids.add(r.event_id)
    for (const s of (savedData ?? []) as EventRef[]) ids.add(s.event_id)
    return ids
  }, [registrationsData, savedData])

  const visibleEvents = useMemo(() => {
    let list = events
    if (mineOnly) list = list.filter(e => myEventIds.has(e.id))
    if (category !== 'All') list = list.filter(e => e.category === category)
    return list
  }, [events, category, mineOnly, myEventIds])

  // MYT calendar day shows that day's events, sorted by start time
  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    for (const event of visibleEvents) {
      const day = toMYT(event.date ?? event.start_time)
      ;(map[day] ??= []).push(event)
    }
    for (const day of Object.keys(map)) {
      map[day].sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''))
    }
    return map
  }, [visibleEvents])

  const { year, month } = cursor
  const monthPrefix = `${year}-${pad(month + 1)}`

  const monthCounts = useMemo(() => {
    const inMonth = events.filter(e => toMYT(e.date ?? e.start_time).startsWith(monthPrefix))

    // category counts ignore the other category filters, but follows the My Events toggle
    const forCategories = mineOnly ? inMonth.filter(e => myEventIds.has(e.id)) : inMonth
    const counts: Record<string, number> = { All: forCategories.length }
    for (const cat of EVENT_CATEGORIES) counts[cat] = 0
    for (const e of forCategories) if (e.category in counts) counts[e.category]++

    // the My Events count ignores the My Events toggle, but follows the selected category
    const forMine = category === 'All' ? inMonth : inMonth.filter(e => e.category === category)
    counts.mine = forMine.filter(e => myEventIds.has(e.id)).length

    return counts
  }, [events, monthPrefix, mineOnly, myEventIds, category])

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
    // breaks out of AppLayout's centred column on desktop so the grid has room for event titles
    <div className="lg:relative lg:left-1/2 lg:right-1/2 lg:-ml-[50vw] lg:-mr-[50vw] lg:w-screen overflow-x-hidden">
      {/* the tour anchors here */}
      <div data-tour="calendar" className="lg:max-w-[1400px] lg:mx-auto px-4 lg:px-8 py-4">

        {header}

        {/* Month header */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-2xl">
            <span className="font-bold text-foreground">{monthLabel}</span>{' '}
            <span className="text-muted-foreground">{year}</span>
          </h2>
          <div className="flex items-center gap-2">
            {/* offer the reset whenever the view has moved off today, by month or by selected date */}
            {!(monthPrefix === today.slice(0, 7) && selectedDay === today) && (
              <button
                onClick={goToToday}
                className="text-xs font-semibold text-primary border border-border rounded-full px-3 py-1.5 cursor-pointer"
              >
                Today
              </button>
            )}
            <button
              onClick={() => shiftMonth(-1)}
              className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-foreground cursor-pointer"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => shiftMonth(1)}
              className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-foreground cursor-pointer"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
          <button
            onClick={() => setCategory('All')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border border-primary whitespace-nowrap transition-colors
              ${category === 'All' ? 'bg-primary text-white' : 'text-primary cursor-pointer'}`}
          >
            All
            <span className={countBadge(category === 'All')}>{monthCounts.All ?? 0}</span>
          </button>

          {/* My Events Filter */}
          <button
            onClick={() => setMineOnly(v => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border border-accent whitespace-nowrap transition-colors
              ${mineOnly ? 'bg-accent text-white' : 'text-accent cursor-pointer'}`}
          >
            My Events
            <span className={countBadge(mineOnly)}>{monthCounts.mine ?? 0}</span>
          </button>

          {EVENT_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border border-primary whitespace-nowrap transition-colors
                ${category === cat ? 'bg-primary text-white' : 'text-primary cursor-pointer'}`}
            >
              {/* the coloured dot acts as the legend for the grid and day list */}
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: categoryColor(cat) }} />
              {cat}
              <span className={countBadge(category === cat)}>{monthCounts[cat] ?? 0}</span>
            </button>
          ))}
        </div>

        {/* Month grid */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="grid grid-cols-7 bg-surface">
            {WEEKDAYS.map(d => (
              <div key={d} className="px-1 py-2 text-center text-[10px] lg:text-xs font-semibold text-muted-foreground">
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
                  className={`relative border-t border-border min-h-[4.5rem] lg:min-h-[7.5rem] p-1 lg:p-2 flex flex-col gap-1
                    ${i % 7 === 6 ? '' : 'border-r'}
                    ${cell.inMonth ? 'cursor-pointer hover:bg-surface' : 'bg-surface/60'}
                    ${isSelected ? 'ring-2 ring-inset ring-primary' : ''}`}
                >
                  <span className={`text-xs lg:text-sm self-start leading-none
                    ${!cell.inMonth ? 'text-muted-foreground/50' : ''}
                    ${isToday ? 'bg-accent text-white font-bold rounded-full w-6 h-6 flex items-center justify-center' : 'p-0.5'}`}
                  >
                    {cell.dayNumber}
                  </span>

                  {/* mobile: one logo per organizer per day, the coloured collar shows the category */}
                  {(() => {
                    const groups = groupByOrganizer(dayEvents)
                    // shows two organizer logos, the rest roll into a counter below
                    const shown = groups.slice(0, 2)
                    const hidden = dayEvents.length - shown.reduce((sum, g) => sum + g.count, 0)

                    return (
                      <div className="lg:hidden">
                        <div className="flex items-center -space-x-1.5 overflow-hidden">
                          {shown.map((group, idx) => (
                            <span
                              key={group.key}
                              className="relative rounded-full p-0.5 flex-shrink-0"
                              style={{ background: collarBackground(group.colors), zIndex: shown.length - idx }}
                            >
                              <OrganizerBadge event={group.event} className="w-4 h-4 block" />
                            </span>
                          ))}
                        </div>
                        {hidden > 0 && (
                          <span className="block text-[9px] text-muted-foreground leading-none mt-0.5">+{hidden}</span>
                        )}
                      </div>
                    )
                  })()}

                  {/* desktop: organizer + event name */}
                  <div className="hidden lg:flex lg:flex-col gap-1 min-w-0">
                    {/* show up to three events, the rest roll into a counter below */}
                    {dayEvents.slice(0, 3).map(e => (
                      <button
                        key={e.id}
                        onClick={ev => { ev.stopPropagation(); navigate(`/events/${e.id}`) }}
                        className="flex items-start gap-1.5 text-left min-w-0 cursor-pointer group"
                      >
                        <span className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: eventColor(e) }} />
                        <span className={`text-[11px] leading-tight line-clamp-2 min-w-0 group-hover:underline
                          ${e.cancelled_at ? 'line-through text-muted-foreground' : 'text-muted-foreground'}`}
                        >
                          <span className="font-semibold text-foreground">{e.organizer_name ?? 'Organizer'}: </span>
                          {e.name}
                        </span>
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[11px] text-muted-foreground pl-3">+{dayEvents.length - 3} more</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Selected day detail */}
        {selectedDay && (
          <div className="mt-4">
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="font-bold text-foreground text-sm">{formatDayHeading(selectedDay)}</h3>
              <span className="text-xs text-muted-foreground">
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
                    onClick={() => navigate(`/events/${event.id}`)}
                    className="bg-card rounded-xl shadow flex gap-3 p-3 cursor-pointer hover:shadow-md transition items-center"
                  >
                    <span className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: eventColor(event) }} />

                    <div
                      className="flex-shrink-0 overflow-hidden rounded-lg self-center"
                      style={{ width: '100px', aspectRatio: '4/5' }}
                    >
                      {event.image_url
                        ? <img
                            src={event.image_url}
                            alt={event.name}
                            className="w-full h-full object-cover object-center"
                          />
                        : <div className="w-full h-full bg-surface flex items-center justify-center"><ImageOff className="w-6 h-6 text-border" /></div>
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-foreground text-sm leading-tight line-clamp-2">{event.name}</h3>
                        {event.cancelled_at && (
                          <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">CANCELLED</span>
                        )}
                      </div>
                      <p className="text-accent text-xs mt-0.5">{event.organizer_name ?? 'Organizer'}</p>

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
    </div>
  )
}
