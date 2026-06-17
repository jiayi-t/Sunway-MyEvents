import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Header from '../../components/header'
import api from '../../services/api'
import { useOrganizerEventsQuery, useCreateEventMutation } from '../../hooks/queries'
import { Upload, BarChart2, ScanQrCode, Calendar, Clock, MapPin, ArrowLeft } from 'lucide-react'

type Tab = 'new' | 'upcoming' | 'past'

interface OrganizerEvent {
  id: number
  name: string
  date: string
  start_time: string
  end_time: string
  venue: string
  category: string
  pricing: number
  image_url?: string | null
  organizer_id: number
  capacity?: number
  registered_count?: number
  cancelled_at?: string | null
  archived_at?: string | null
}

const CATEGORIES = ['Academics', 'Arts', ' Cultural', 'Entertainment', 'Social', 'Sports']

const formatDateTime = (value?: string, options?: Intl.DateTimeFormatOptions): string => {
  if (!value) return 'TBA'
  return new Date(value).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', ...options })
}

const formatDate = (date?: string) =>
  formatDateTime(date, { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })

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

function UpcomingCard({ event, onCheckin, onViewDetails }: { event: OrganizerEvent; onCheckin: (id: number) => void; onViewDetails: (id: number) => void }) {
  const sold = event.registered_count ?? 0
  const cap = event.capacity ?? 0
  const isSoldOut = cap > 0 && sold >= cap

  return (
    <div className="bg-card rounded-xl shadow flex gap-3 p-3 items-center" onClick={() => onViewDetails(event.id)} style={{ cursor: 'pointer' }}>
      <div className="relative flex-shrink-0 self-center overflow-hidden rounded-lg" style={{ width: '100px', aspectRatio: '4/5' }}>
        <img
          src={event.image_url || '/SGT%20S7%20Poster.jpg'}
          alt={event.name}
          className="w-full h-full object-cover object-center"
        />
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
              <span className="text-accent text-xs font-medium">{sold} / {cap || '∞'} tickets sold</span>
              {isSoldOut && (
                <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">SOLD OUT</span>
              )}
            </>
          )}
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
              className="inline-flex items-center gap-1.5 bg-accent text-white text-xs font-semibold px-3 py-1.5 rounded-full mt-2"
            >
              <ScanQrCode className="w-3 h-3" />
              Check In
            </button>
          )}
      </div>

      <span className="text-muted-foreground self-center flex-shrink-0">›</span>
    </div>
  )
}

function PastCard({ event, onAnalytics, onViewDetails }: { event: OrganizerEvent; onAnalytics: (id: number) => void; onViewDetails: (id: number) => void }) {
  return (
    <div className="bg-card rounded-xl shadow flex gap-3 p-3 items-center" onClick={() => onViewDetails(event.id)} style={{ cursor: 'pointer' }}>
      <div className="flex-shrink-0 self-center overflow-hidden rounded-lg" style={{ width: '100px', aspectRatio: '4/5' }}>
        <img
          src={event.image_url || '/SGT%20S7%20Poster.jpg'}
          alt={event.name}
          className="w-full h-full object-cover object-center"
        />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-foreground text-sm leading-tight line-clamp-2">{event.name}</h3>

        {(event.archived_at || event.cancelled_at) && (
          <div className="flex items-center gap-1 mt-0.5">
            {event.archived_at && (
              <span className="bg-gray-500 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">ARCHIVED</span>
            )}
            {event.cancelled_at && !event.archived_at && (
              <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">CANCELLED</span>
            )}
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
          className="inline-flex items-center gap-1.5 bg-primary text-white text-xs font-semibold px-3 py-1.5 rounded-full mt-2"
        >
          <BarChart2 className="w-3 h-3" />
          View Analytics
        </button>
      </div>

      <span className="text-muted-foreground self-center flex-shrink-0">›</span>
    </div>
  )
}

export default function OrganizerEventsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('new')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [form, setForm] = useState({
    name: '', description: '', date: '', start_time: '', end_time: '',
    venue: '', pricing: '', category: '', capacity: '', registration_deadline: '', image_url: ''
  })

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const { data: myEventsData, isLoading: eventsLoading } = useOrganizerEventsQuery()
  const myEvents = (myEventsData || []) as OrganizerEvent[]
  const createMutation = useCreateEventMutation()

  const handleSubmit = () => {
    setError('')
    if (form.start_time && form.end_time && form.start_time >= form.end_time) {
      setError('End time must be later than start time')
      return
    }
    const eventDate = `${form.date}T00:00:00`
    const startDateTime = `${form.date}T${form.start_time}:00`
    const endDateTime = `${form.date}T${form.end_time}:00`

    createMutation.mutate({
      name: form.name,
      description: form.description,
      date: eventDate,
      start_time: startDateTime,
      end_time: endDateTime,
      venue: form.venue,
      pricing: Number(form.pricing) || 0,
      category: form.category,
      capacity: Number(form.capacity),
      registration_deadline: form.registration_deadline,
      image_url: form.image_url || null
    }, {
      onSuccess: () => {
        const targetTab: Tab = new Date(endDateTime) < new Date() ? 'past' : 'upcoming'
        setSearchParams({ tab: targetTab })
        setActiveTab(targetTab)
      },
      onError: (err: any) => setError(err.response?.data?.error || 'Failed to create event'),
    })
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setPreview(String(reader.result))
    reader.readAsDataURL(file)
    try {
      setUploading(true)
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post('/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setForm(prev => ({ ...prev, image_url: res.data.url }))
    } catch (err: any) {
      setError(err.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const getTabFromQuery = (): Tab => {
    const tab = searchParams.get('tab')
    if (tab === 'upcoming' || tab === 'past' || tab === 'new') return tab
    return 'new'
  }

  useEffect(() => { setActiveTab(getTabFromQuery()) }, [searchParams])

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  const now = new Date()
  const upcomingEvents = useMemo(() => myEvents.filter(e => new Date(e.end_time || e.date) >= now), [myEvents])
  const pastEvents = useMemo(() => myEvents.filter(e => new Date(e.end_time || e.date) < now), [myEvents])

  const tabs: { key: Tab; label: string; count: number | null }[] = [
    { key: 'new', label: 'New', count: null },
    { key: 'upcoming', label: 'Upcoming', count: upcomingEvents.length },
    { key: 'past', label: 'Past', count: pastEvents.length },
  ]

  const handleCheckin = (id: number) => navigate(`/organizer/events/${id}/checkin`)
  const handleAnalytics = (id: number) => navigate(`/organizer/events/${id}/analytics`)
  const handleViewDetails = (id: number) => navigate(`/organizer/events/${id}`)

  return (
    <div className="bg-surface">
      <Header />
      <div className="bg-primary px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/organizer/dashboard')} className="text-white">
          <ArrowLeft />
        </button>
        <h1 className="text-white font-bold text-base flex-1 text-center">My Events</h1>
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
            {tab.count !== null && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-surface text-muted-foreground'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Create Event Form */}
      {activeTab === 'new' && (
        <div className="px-4 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Event Name</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
            <textarea rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary resize-none bg-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Date</label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-white" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-1">Start Time</label>
              <input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-white" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-1">End Time</label>
              <input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-white" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Venue</label>
            <input type="text" value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Pricing</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">RM</span>
              <input type="number" min="0" value={form.pricing} onChange={e => setForm({ ...form, pricing: e.target.value })}
                className="w-full border border-border rounded-lg pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-white" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Category</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-white">
              <option value="">Select a category</option>
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Capacity</label>
            <div className="relative">
              <input type="number" min="1" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary pr-24 bg-white" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">participants</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Registration Deadline</label>
            <input type="date" value={form.registration_deadline} onChange={e => setForm({ ...form, registration_deadline: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Poster</label>
            <div className="w-full border border-border rounded-lg px-3 py-6 flex flex-col items-center justify-center gap-3 bg-white">
              {preview ? (
                <>
                  <img src={preview} alt="poster preview" className="max-h-56 object-contain rounded" />
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 text-xs font-medium rounded-md border border-accent text-accent hover:bg-orange-50">
                    {uploading ? 'Uploading...' : 'Reupload'}
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload className="text-3xl" />
                  <span className="text-xs">{uploading ? 'Uploading...' : 'Upload poster'}</span>
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-3 pb-6">
            <button onClick={() => navigate('/organizer/dashboard')}
              className="flex-1 border border-accent rounded-lg py-3 text-sm font-medium text-accent hover:bg-orange-50">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={createMutation.isPending || uploading}
              className="flex-1 bg-accent text-white rounded-lg py-3 text-sm font-semibold disabled:opacity-50 hover:opacity-90">
              {createMutation.isPending ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </div>
      )}

      {/* Upcoming tab */}
      {activeTab === 'upcoming' && (
        <div className="px-4 py-4 space-y-3">
          {eventsLoading ? (
            <p className="text-muted-foreground text-sm text-center">Loading events...</p>
          ) : upcomingEvents.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center">No upcoming events yet</p>
          ) : (
            upcomingEvents.map(event => (
              <UpcomingCard key={event.id} event={event} onCheckin={handleCheckin} onViewDetails={handleViewDetails} />
            ))
          )}
        </div>
      )}

      {/* Past tab */}
      {activeTab === 'past' && (
        <div className="px-4 py-4 space-y-3">
          {eventsLoading ? (
            <p className="text-muted-foreground text-sm text-center">Loading events...</p>
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