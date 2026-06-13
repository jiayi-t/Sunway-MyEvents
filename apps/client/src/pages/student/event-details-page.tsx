import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Header from '../../components/header'
import api from '../../services/api'
import { useAuth } from '../../context/auth-context'
import { Calendar, Clock, MapPin, Ticket, Bookmark, Share2, Mail, ArrowLeft } from 'lucide-react'
import { InstagramLogo } from 'phosphor-react'

interface Event {
  id: number
  name: string
  description: string
  date: string
  start_time: string
  end_time: string
  venue: string
  category: string
  pricing: number
  capacity: number
  registration_deadline: string
  image_url: string
  organizer_id: number
  organizer_name: string
  organizer_image_url?: string
}

const toImageUrl = (url?: string) => {
  if (!url) return ''
  if (url.startsWith('/uploads/')) return `http://localhost:3001${url}`
  return url
}

const formatDate = (value?: string) => {
  if (!value) return 'TBA'
  return new Date(value).toLocaleDateString('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

const formatTime = (value?: string) => {
  if (!value) return 'TBA'
  return new Date(value).toLocaleTimeString('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

export default function EventDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [registered, setRegistered] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    api.get(`/events/${id}`)
      .then(res => setEvent(res.data))
      .catch(() => setError('Event not found'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!user || !id) return
    api.get(`/events/${id}/registration-status`)
      .then(res => setRegistered(res.data.registered))
      .catch(() => {})
    api.get(`/events/${id}/save-status`)
      .then(res => setSaved(res.data.saved))
      .catch(() => {})
  }, [id, user])

  const handleRegister = async () => {
    setRegistering(true)
    setError('')
    try {
      await api.post(`/events/${id}/register`)
      setRegistered(true)
      setSuccess('Successfully registered for this event!')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to register')
    } finally {
      setRegistering(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <p className="text-muted-foreground text-sm">Loading event...</p>
    </div>
  )

  if (!event) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <p className="text-muted-foreground text-sm">Event not found</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-surface">
      <Header />

      {/* Sub-header */}
      <div className="bg-primary px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-white">
          <ArrowLeft />
        </button>
        <h1 className="text-white font-bold text-base flex-1 text-center">Event Details</h1>
        <div className="w-5" />
      </div>

      {/* Event Poster */}
      <div className="relative">
        <img
          src={toImageUrl(event.image_url)}
          alt={event.name}
          className="w-full object-cover"
          style={{ aspectRatio: '4/5' }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      </div>

      {/* Event Info */}
      <div className="bg-card px-4 py-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h2 className="font-bold text-foreground text-lg leading-tight flex-1">
            {event.name}
          </h2>
          <div className="flex gap-2 flex-shrink-0 mt-1">
            <button
              onClick={() => api.post(`/events/${id}/save-toggle`).then(res => setSaved(res.data.saved)).catch(() => {})}
              className="text-primary"
            >
              <Bookmark fill={saved ? 'currentColor' : 'none'} />
            </button>
            <button className="text-primary">
              <Share2 />
            </button>
          </div>
        </div>

        {/* Category labels */}
        <div className="flex gap-2 mb-4">
          {event.category && (
            <span className="border border-accent text-accent text-xs px-3 py-1 rounded-full">
              {event.category}
            </span>
          )}
          <span className="border border-accent text-accent text-xs px-3 py-1 rounded-full">
            {event.pricing === 0 ? 'Free' : 'Paid'}
          </span>
        </div>

        {/* Description */}
        <h3 className="font-semibold text-foreground text-sm mb-2">About this event:</h3>
        <p className="text-muted-foreground text-sm leading-relaxed mb-4">
          {event.description || 'No description provided.'}
        </p>

        {/* Event Details */}
        <div className="space-y-3 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center flex-shrink-0">
              <Calendar className="text-primary w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Date</p>
              <p className="text-sm text-foreground">{formatDate(event.date)}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center flex-shrink-0">
              <Clock className="text-primary w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Time</p>
              <p className="text-sm text-foreground">
                {formatTime(event.start_time)} - {formatTime(event.end_time)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center flex-shrink-0">
              <MapPin className="text-primary w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Venue</p>
              <p className="text-sm text-foreground">{event.venue}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center flex-shrink-0">
              <Ticket className="text-primary w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Ticket Pricing</p>
              <p className="text-sm text-foreground">
                {event.pricing === 0 ? 'Free' : `RM ${event.pricing}`}
              </p>
            </div>
          </div>
        </div>

        {/* Success/Error messages */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 rounded-lg mb-3">
            {success}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-lg mb-3">
            {error}
          </div>
        )}

        {/* Register Button */}
        <button
          onClick={registered ? undefined : handleRegister}
          disabled={registering || registered}
          className={`w-full py-3 rounded-full text-white font-semibold text-sm transition-colors
            ${registered
              ? 'bg-green-500 cursor-default'
              : 'bg-accent hover:bg-orange-600 disabled:opacity-50'
            }`}
        >
          {registered ? 'Registered' : registering ? 'Registering...' : 'Register Now!'}
        </button>
      </div>

      {/* Organized By */}
      <div className="bg-card mt-2 px-4 py-4">
        <h3 className="font-semibold text-foreground text-sm mb-3">Organized by:</h3>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
            <img
              src={toImageUrl(event.organizer_image_url)}
              alt={event.organizer_name ?? 'Organizer'}
              className="w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {event.organizer_name ?? 'Organizer'}
            </p>
            <div className="flex gap-2 mt-1">
              <button className="text-muted-foreground hover:text-primary">
                <InstagramLogo className="w-4 h-4" />
              </button>
              <button className="text-muted-foreground hover:text-primary">
                <Mail className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}