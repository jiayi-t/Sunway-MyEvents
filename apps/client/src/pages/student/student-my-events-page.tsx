import { useState, useMemo, useEffect, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Header from '../../components/header'
import { useMyRegistrationsQuery, useSavedEventsQuery, useMyFeedbackQuery } from '../../hooks/queries'
import { Calendar, Clock, MapPin, ArrowLeft, ScanQrCode, MessageSquare } from 'lucide-react'

type Tab = 'upcoming' | 'past' | 'saved'

interface Registration {
  id: number
  event_id: number
  registered_at?: string
  checked_in_at?: string | null
  event_name: string
  event_date: string
  event_start_time: string
  event_end_time: string
  event_venue: string
  event_category: string
  event_image_url: string
  event_cancelled_at: string | null
  organizer_name: string
}

interface SavedEvent {
  id: number
  event_id: number
  saved_at: string
  event_name: string
  event_date: string
  event_start_time: string
  event_end_time: string
  event_venue: string
  event_category: string
  event_image_url: string
  event_cancelled_at: string | null
  organizer_name: string
}

const formatDateTime = (value?: string, options?: Intl.DateTimeFormatOptions): string => {
  if (!value) return 'TBA'
  return new Date(value).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', ...options })
}

const formatDate = (date?: string) =>
  formatDateTime(date, { day: 'numeric', month: 'long', year: 'numeric' })

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

function RegistrationCard({ reg, showCheckin, showAttendance, feedbackAction }: { reg: Registration; showCheckin?: boolean; showAttendance?: boolean; feedbackAction?: ReactNode }) {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate(`/events/${reg.event_id}`)}
      className="bg-card rounded-xl shadow flex gap-3 p-3 cursor-pointer hover:shadow-md transition items-center"
    >
      <div
        className="relative flex-shrink-0 self-center overflow-hidden rounded-lg"
        style={{ width: '100px', aspectRatio: '4/5' }}
      >
        <img
          src={reg.event_image_url ?? ''}
          alt={reg.event_name}
          className="w-full h-full object-cover object-center"
        />
        <CountdownBadge startTime={reg.event_start_time} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <h3 className="font-bold text-foreground text-sm leading-tight line-clamp-2">
            {reg.event_name}
          </h3>
          {reg.event_cancelled_at && (
            <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
              CANCELLED
            </span>
          )}
          {showAttendance && !reg.event_cancelled_at && (
            reg.checked_in_at ? (
              <span className="bg-primary text-white text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
                ATTENDED
              </span>
            ) : (
              <span className="bg-accent text-white text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
                ABSENT
              </span>
            )
          )}
        </div>
        <p className="text-accent text-xs mt-0.5">{reg.organizer_name}</p>

        <div className="text-muted-foreground text-xs mt-1.5 flex flex-col gap-1">
          <div className="inline-flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-black flex-shrink-0" />
            <span>{formatDate(reg.event_date)}</span>
          </div>
          <div className="inline-flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-black flex-shrink-0" />
            <span>{formatTimeRange(reg.event_start_time, reg.event_end_time)}</span>
          </div>
          <div className="inline-flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-black flex-shrink-0" />
            <span className="truncate">{reg.event_venue}</span>
          </div>
        </div>

        {showCheckin && !reg.event_cancelled_at && (
          <button
            onClick={e => { e.stopPropagation(); navigate(`/events/${reg.event_id}/checkin`) }}
            className="inline-flex items-center gap-1.5 bg-accent text-white text-xs font-semibold px-3 py-1.5 rounded-full mt-2"
          >
            <ScanQrCode className="w-4 h-4 flex-shrink-0" />
            Check In
          </button>
        )}

        {feedbackAction && (
          <div onClick={e => e.stopPropagation()}>
            {feedbackAction}
          </div>
        )}
      </div>

      <span className="text-muted-foreground self-center flex-shrink-0">›</span>
    </div>
  )
}

export default function MyEventsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<Tab>(
    (searchParams.get('tab') as Tab) || 'upcoming'
  )

  const { data: registrationsData, isLoading: regsLoading } = useMyRegistrationsQuery()
  const { data: savedEventsData, isLoading: savedLoading } = useSavedEventsQuery()
  const { data: myFeedbackData } = useMyFeedbackQuery()

  const registrations = (registrationsData || []) as Registration[]
  const savedEvents = (savedEventsData || []) as SavedEvent[]
  const loading = regsLoading || savedLoading

  const myFeedbackSet = useMemo(
    () => new Set((myFeedbackData || []).map(f => f.event_id)),
    [myFeedbackData]
  )

  useEffect(() => {
    const tab = searchParams.get('tab') as Tab
    if (tab === 'upcoming' || tab === 'past' || tab === 'saved') setActiveTab(tab)
  }, [searchParams])

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  const now = new Date()
  const upcoming = useMemo(() =>
    registrations.filter(r => new Date(r.event_date) >= now), [registrations])
  const past = useMemo(() =>
    registrations.filter(r => new Date(r.event_date) < now), [registrations])

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'upcoming', label: 'Upcoming', count: upcoming.length },
    { key: 'past', label: 'Past', count: past.length },
    { key: 'saved', label: 'Saved', count: savedEvents.length },
  ]

  return (
    <div className="bg-surface">
      <Header />

      {/* Sub-header */}
      <div className="bg-primary px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/profile')} className="text-white">
          <ArrowLeft />
        </button>
        <h1 className="text-white font-bold text-base flex-1 text-center">My Events</h1>
        <div className="w-5" />
      </div>

      {/* Tabs */}
      <div className="bg-card px-4 py-3 flex gap-2">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap
              ${activeTab === tab.key ? 'bg-primary text-white' : 'text-muted-foreground'}`}
          >
            {tab.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-surface text-muted-foreground'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Upcoming tab */}
      {activeTab === 'upcoming' && (
        <div className="px-4 py-4 space-y-3">
          {loading ? (
            <p className="text-muted-foreground text-sm text-center">Loading events...</p>
          ) : upcoming.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">No upcoming events. Browse and register for events!</p>
              <button
                onClick={() => navigate('/')}
                className="mt-3 bg-accent text-white px-4 py-2 rounded-full text-sm font-semibold"
              >
                Browse Events
              </button>
            </div>
          ) : (
            upcoming.map(reg => <RegistrationCard key={reg.id} reg={reg} showCheckin />)
          )}
        </div>
      )}

      {/* Past tab */}
      {activeTab === 'past' && (
        <div className="px-4 py-4 space-y-3">
          {loading ? (
            <p className="text-muted-foreground text-sm text-center">Loading events...</p>
          ) : past.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center">No past events yet</p>
          ) : (
            past.map(reg => {
              const hasGivenFeedback = myFeedbackSet.has(reg.event_id)
              const feedbackAction = reg.event_cancelled_at || !reg.checked_in_at ? null : hasGivenFeedback ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold mt-2">
                  <MessageSquare className="w-3.5 h-3.5 fill-primary text-primary" />
                  Feedback Given
                </span>
              ) : (
                <button
                  onClick={() => navigate(`/events/${reg.event_id}/feedback`)}
                  className="inline-flex items-center gap-1.5 bg-primary text-white text-xs font-semibold px-3 py-1.5 rounded-full mt-2"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Give Feedback
                </button>
              )
              return <RegistrationCard key={reg.id} reg={reg} showAttendance feedbackAction={feedbackAction} />
            })
          )}
        </div>
      )}

      {/* Saved tab */}
      {activeTab === 'saved' && (
        <div className="px-4 py-4 space-y-3">
          {loading ? (
            <p className="text-muted-foreground text-sm text-center">Loading events...</p>
          ) : savedEvents.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">No saved events yet. Bookmark events to save them!</p>
              <button
                onClick={() => navigate('/')}
                className="mt-3 bg-accent text-white px-4 py-2 rounded-full text-sm font-semibold"
              >
                Browse Events
              </button>
            </div>
          ) : (
            savedEvents.map(e => <RegistrationCard key={e.id} reg={e} />)
          )}
        </div>
      )}
    </div>
  )
}