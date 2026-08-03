import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useOrganizerEventsQuery } from '../../api/queries'
import { EventListSkeleton } from '../../components/skeletons'
import { BarChart2, ScanQrCode, Calendar, ChevronRight, Clock, MapPin, ImageOff, Pin, Plus } from 'lucide-react'

type Tab = 'pinned' | 'upcoming' | 'past'

interface OrganizerEvent {
  id: string
  name: string
  date: string
  start_time: string
  end_time: string
  venue: string
  category: string
  audience: string
  pricing: number
  image_url?: string | null
  capacity?: number
  registered_count?: number
  cancelled_at?: string | null
  archived_at?: string | null
  pinned_at?: string | null
}

// pinned label
function PinnedPill() {
  return (
    <span className="inline-flex items-center gap-1 bg-primary text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">
      <Pin className="w-2.5 h-2.5" /> PINNED
    </span>
  )
}

const formatDateTime = (value?: string, options?: Intl.DateTimeFormatOptions): string => {
  if (!value) return 'TBA'
  return new Date(value).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', ...options })
}

const formatDate = (date?: string) => {
  if (!date) return 'TBA'
  const d = new Date(date)
  const formatted = d.toLocaleDateString('en-MY', { 
    timeZone: 'Asia/Kuala_Lumpur', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  })
  const weekday = d.toLocaleDateString('en-MY', { 
    timeZone: 'Asia/Kuala_Lumpur', 
    weekday: 'long' 
  })
  return `${formatted} (${weekday})`
}

const formatTime = (time?: string) =>
  formatDateTime(time, { hour: 'numeric', minute: '2-digit', hour12: true })

const formatTimeRange = (start?: string, end?: string) =>
  start && end ? `${formatTime(start)} - ${formatTime(end)}` : 'Time TBA'

function useCountdown(targetISO?: string) {
  const calc = () => {
    if (!targetISO) return null
    const diff = new Date(targetISO).getTime() - Date.now()
    if (diff <= 0) return null
    const d = Math.floor(diff / 86400000)
    const h = Math.floor((diff % 86400000) / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    const s = Math.floor((diff % 60000) / 1000)
    return { d, h, m, s }
  }
  const [time, setTime] = useState(calc)
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000)
    return () => clearInterval(id)
  }, [targetISO])
  return time
}

function CountdownBadge({ startTime }: { startTime?: string }) {
  const t = useCountdown(startTime)
  if (!t) return null
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <div className="absolute bottom-2 left-0 right-0 mx-2 bg-accent/70 text-white text-[10px] font-mono px-2 py-1 rounded-md text-center whitespace-nowrap">
      {t.d > 0 ? `${t.d}d ` : ''}{pad(t.h)}:{pad(t.m)}:{pad(t.s)}
    </div>
  )
}

function UpcomingCard({ event, onCheckin, onViewDetails }: { event: OrganizerEvent; onCheckin: (id: string) => void; onViewDetails: (id: string) => void }) {
  const sold = event.registered_count ?? 0
  const cap = event.capacity ?? 0
  const isSoldOut = cap > 0 && sold >= cap

  return (
    <div className="bg-card rounded-xl shadow flex gap-3 p-3 items-center cursor-pointer" onClick={() => onViewDetails(event.id)}>
      <div className="relative flex-shrink-0 self-center overflow-hidden rounded-lg" style={{ width: '100px', aspectRatio: '4/5' }}>
        {event.image_url
          ? <img 
              src={event.image_url} 
              alt={event.name}
              className="w-full h-full object-cover object-center" 
            />
          : <div className="w-full h-full bg-surface flex items-center justify-center"><ImageOff className="w-6 h-6 text-border" /></div>
        }
        <CountdownBadge startTime={event.start_time} />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-foreground text-sm leading-tight line-clamp-2">{event.name}</h3>

        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          {event.archived_at ? (
            <span className="bg-gray-500 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">ARCHIVED</span>
          ) : event.cancelled_at ? (
            <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">CANCELLED</span>
          ) : (
            <>
              <span className="text-accent text-xs font-medium">
                {cap > 0 ? `${sold} / ${cap} tickets sold` : `${sold} ${sold === 1 ? 'ticket' : 'tickets'} sold`}
              </span>
              {isSoldOut && (
                <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">SOLD OUT</span>
              )}
            </>
          )}
          {event.pinned_at && <PinnedPill />}
        </div>

        <div className="text-muted-foreground text-xs mt-1.5 flex flex-col gap-1">
          <div className="inline-flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-black flex-shrink-0" />
            <span>{formatDate(event.date)}</span>
          </div>
          <div className="inline-flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-black flex-shrink-0" />
            <span>{formatTimeRange(event.start_time, event.end_time)}</span>
          </div>
          <div className="inline-flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-black flex-shrink-0" />
            <span className="truncate">{event.venue}</span>
          </div>
        </div>

          {!event.cancelled_at && (
            <button
              // e.stopPropagation() prevents the click from bubbling up to the card's onClick which opens the event details page
              onClick={e => { e.stopPropagation(); onCheckin(event.id) }}
              className="inline-flex items-center gap-1.5 bg-accent text-white text-xs font-semibold px-3 py-1.5 rounded-full mt-2 cursor-pointer"
            >
              <ScanQrCode className="w-3 h-3" />
              Check In
            </button>
          )}
      </div>

      <ChevronRight className="w-4 h-4 text-muted-foreground self-center flex-shrink-0" />
    </div>
  )
}

function PastCard({ event, onAnalytics, onViewDetails }: { event: OrganizerEvent; onAnalytics: (id: string) => void; onViewDetails: (id: string) => void }) {
  return (
    <div className="bg-card rounded-xl shadow flex gap-3 p-3 items-center cursor-pointer" onClick={() => onViewDetails(event.id)}>
      <div className="flex-shrink-0 self-center overflow-hidden rounded-lg" style={{ width: '100px', aspectRatio: '4/5' }}>
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
        <h3 className="font-bold text-foreground text-sm leading-tight line-clamp-2">{event.name}</h3>

        {(event.archived_at || event.cancelled_at || event.pinned_at) && (
          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            {event.archived_at ? (
              <span className="bg-gray-500 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">ARCHIVED</span>
            ) : event.cancelled_at ? (
              <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">CANCELLED</span>
            ) : null}
            {event.pinned_at && <PinnedPill />}
          </div>
        )}

        <div className="text-muted-foreground text-xs mt-1.5 flex flex-col gap-1">
          <div className="inline-flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-black flex-shrink-0" />
            <span>{formatDate(event.date)}</span>
          </div>
          <div className="inline-flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-black flex-shrink-0" />
            <span>{formatTimeRange(event.start_time, event.end_time)}</span>
          </div>
          <div className="inline-flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-black flex-shrink-0" />
            <span className="truncate">{event.venue}</span>
          </div>
        </div>

        <button
          // e.stopPropagation() prevents the click from bubbling up to the card's onClick which opens the event details page
          onClick={e => { e.stopPropagation(); onAnalytics(event.id) }}
          className="inline-flex items-center gap-1.5 bg-primary text-white text-xs font-semibold px-3 py-1.5 rounded-full mt-2 cursor-pointer"
        >
          <BarChart2 className="w-3 h-3" />
          View Analytics
        </button>
      </div>

      <ChevronRight className="w-4 h-4 text-muted-foreground self-center flex-shrink-0" />
    </div>
  )
}

export default function OrganizerEventsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('upcoming')
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const { data: myEventsData, isLoading: eventsLoading } = useOrganizerEventsQuery()
  const myEvents = (myEventsData || []) as OrganizerEvent[]

  const getTabFromQuery = (): Tab => {
    const tab = searchParams.get('tab')
    if (tab === 'pinned' || tab === 'upcoming' || tab === 'past') return tab
    return 'upcoming'
  }

  useEffect(() => { setActiveTab(getTabFromQuery()) }, [searchParams])

  // keep the floating create button above the footer whenever the footer is in view
  const [fabOffset, setFabOffset] = useState(0)
  useEffect(() => {
    const footer = document.querySelector('footer')
    if (!footer) return
    const update = () => {
      const visibleFooter = window.innerHeight - footer.getBoundingClientRect().top
      setFabOffset(Math.max(0, visibleFooter))
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    const resizeObserver = new ResizeObserver(update)
    resizeObserver.observe(document.body)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      resizeObserver.disconnect()
    }
  }, [])

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  const now = new Date()
  const upcomingEvents = useMemo(() => myEvents.filter(e => new Date(e.end_time || e.date) >= now), [myEvents])
  const pastEvents = useMemo(() => myEvents.filter(e => new Date(e.end_time || e.date) < now), [myEvents])
  // most recently pinned first, matching the order on the public profile
  const pinnedEvents = useMemo(
    () => myEvents
      .filter(e => e.pinned_at)
      .sort((a, b) => new Date(b.pinned_at!).getTime() - new Date(a.pinned_at!).getTime()),
    [myEvents]
  )

  const tabs: { key: Tab; label: string; count: number | null }[] = [
    { key: 'pinned', label: 'Pinned', count: pinnedEvents.length },
    { key: 'upcoming', label: 'Upcoming', count: upcomingEvents.length },
    { key: 'past', label: 'Past', count: pastEvents.length },
  ]

  const handleCheckin = (id: string) => navigate(`/organizer/events/${id}/checkin`)
  const handleAnalytics = (id: string) => navigate(`/organizer/events/${id}/analytics`)
  const handleViewDetails = (id: string) => navigate(`/organizer/events/${id}`)

  return (
    <div className="bg-surface">
      <div className="bg-primary full-bleed-bar py-3 flex items-center gap-3">
        <h1 className="text-white font-bold text-base flex-1 text-center">My Events</h1>
      </div>

      {/* Tabs */}
      <div className="px-4 py-3 flex gap-2">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer
              ${activeTab === tab.key ? 'bg-primary border-primary text-white' : 'border-border text-muted-foreground'}`}
          >
            {tab.label}
            {tab.count !== null && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-gray-200 text-muted-foreground'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Pinned tab - featured on the organizer's public profile */}
      {activeTab === 'pinned' && (
        <div className="px-4 py-4 space-y-3">
          {eventsLoading ? (
            <EventListSkeleton />
          ) : pinnedEvents.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center">
              No pinned events yet. Open an event and pin it to feature it on your profile
            </p>
          ) : (
            pinnedEvents.map(event => (
              // an upcoming pin keeps its Check In action, a past one keeps View Analytics
              new Date(event.end_time || event.date) < now
                ? <PastCard key={event.id} event={event} onAnalytics={handleAnalytics} onViewDetails={handleViewDetails} />
                : <UpcomingCard key={event.id} event={event} onCheckin={handleCheckin} onViewDetails={handleViewDetails} />
            ))
          )}
        </div>
      )}

      {/* Upcoming tab */}
      {activeTab === 'upcoming' && (
        <div className="px-4 py-4 space-y-3">
          {eventsLoading ? (
            <EventListSkeleton />
          ) : upcomingEvents.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center">No upcoming events yet</p>
          ) : (
            upcomingEvents.map(event => (
              <UpcomingCard key={event.id} event={event} onCheckin={handleCheckin} onViewDetails={handleViewDetails} />
            ))
          )}

          {/* Floating create event button */}
          <button
            data-tour="create-event-fab"
            onClick={() => navigate('/organizer/events/new')}
            aria-label="Create new event"
            style={{ bottom: `calc(1.5rem + ${fabOffset}px)` }}
            className="fixed right-6 z-40 w-14 h-14 rounded-full bg-accent text-white shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Plus className="w-7 h-7" />
          </button>
        </div>
      )}

      {/* Past tab */}
      {activeTab === 'past' && (
        <div className="px-4 py-4 space-y-3">
          {eventsLoading ? (
            <EventListSkeleton />
          ) : pastEvents.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center">No past events yet</p>
          ) : (
            pastEvents.map(event => (
              <PastCard key={event.id} event={event} onAnalytics={handleAnalytics} onViewDetails={handleViewDetails} />
            ))
          )}
        </div>
      )}
    </div>
  )
}