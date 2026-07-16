import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/auth-context'
import { useEventQuery, useRegistrationStatusQuery, useSaveStatusQuery } from '../../api/queries'
import { useRegisterEventMutation, useToggleSaveMutation, useRecordViewMutation } from '../../api/mutations'
import { EventDetailsSkeleton } from '../../components/skeletons'
import Avatar from '../../components/avatar'
import { Calendar, CalendarClock, Clock, ImageOff, MapPin, Ticket, Bookmark, Share2 } from 'lucide-react'

interface Event {
  id: number
  name: string
  description: string
  date: string
  start_time: string
  end_time: string
  venue: string
  category: string
  audience: string
  pricing: number
  capacity: number
  registration_deadline: string
  image_url: string
  organizer_id: number
  organizer_name: string
  organizer_image_url?: string
  cancelled_at?: string | null
}

const toImageUrl = (url?: string) => {
  if (!url) return ''
  if (url.startsWith('/uploads/')) return url
  return url
}

const formatDate = (value?: string) => {
  if (!value) return 'TBA'
  const d = new Date(value)
  const date = d.toLocaleDateString('en-MY', { 
    timeZone: 'Asia/Kuala_Lumpur', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  })
  const day = d.toLocaleDateString('en-MY', { 
    timeZone: 'Asia/Kuala_Lumpur', 
    weekday: 'long' 
  })
  return `${date} (${day})`
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

export default function StudentEventDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const { data: event, isLoading, isError } = useEventQuery(id)
  const { data: registered = false } = useRegistrationStatusQuery(id, !!user)
  const { data: saved = false } = useSaveStatusQuery(id, !!user)

  const registerMutation = useRegisterEventMutation(id)
  const saveMutation = useToggleSaveMutation(id)
  const recordView = useRecordViewMutation(id)

  useEffect(() => {
    if (user?.role === 'student' && id) recordView.mutate()
    // recordView and user are intentionally excluded from the dependency array, including them would re-run on every render and record duplicate views
    // eslint-disable-next-line react-hooks/exhaustive-deps -- silences the missing-dependency warning
  }, [id])

  const handleRegister = () => {
    if (Number((event as any)?.pricing) > 0) {
      navigate(`/events/${id}/pay`)
      return
    }
    setError('')
    registerMutation.mutate(undefined, {
      onSuccess: () => setSuccess('Successfully registered for this event!'),
      onError: (err: any) => setError(err.response?.data?.error || 'Failed to register'),
    })
  }

  if (isLoading) return (
    <div className="min-h-screen bg-surface">
      <div className="bg-primary px-4 py-3 flex items-center gap-3">
        <h1 className="text-white font-bold text-base flex-1 text-center">Event Details</h1>
      </div>
      <EventDetailsSkeleton />
    </div>
  )

  if (isError || !event) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <p className="text-muted-foreground text-sm">Event not found</p>
    </div>
  )

  // useEventQuery returns unknown, cast to access event fields
  const typedEvent = event as Event

  return (
    <div className="min-h-screen bg-surface">

      {/* Sub-header */}
      <div className="bg-primary px-4 py-3 flex items-center gap-3">
        <h1 className="text-white font-bold text-base flex-1 text-center">Event Details</h1>
      </div>

      {/* Event Poster */}
      <div className="relative">
        {typedEvent.image_url
          ? <img
              src={toImageUrl(typedEvent.image_url)}
              alt={typedEvent.name}
              className="w-full object-cover"
              style={{ aspectRatio: '4/5' }}
            />
          : <div className="w-full bg-surface flex flex-col items-center justify-center gap-2" style={{ aspectRatio: '4/5' }}>
              <ImageOff className="w-10 h-10 text-border" />
              <p className="text-muted-foreground text-xs">No poster uploaded</p>
            </div>
        }
      </div>

      {typedEvent.cancelled_at && (
        <div className="bg-red-500 text-white text-sm font-semibold px-4 py-2.5 text-center">
          This event has been cancelled
        </div>
      )}

      {/* Event Info */}
      <div className="bg-card px-4 py-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h2 className="font-bold text-foreground text-lg leading-tight flex-1">
            {typedEvent.name}
          </h2>
          <div className="flex gap-2 flex-shrink-0 mt-1">
            <button
              onClick={() => saveMutation.mutate()}
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
          {typedEvent.category && (
            <span className="border border-accent text-accent text-xs px-3 py-1 rounded-full">
              {typedEvent.category}
            </span>
          )}
          <span className="border border-accent text-accent text-xs px-3 py-1 rounded-full">
            {typedEvent.audience === 'students_only' ? 'Students Only' : 'Open to Public'}
          </span>
          <span className="border border-accent text-accent text-xs px-3 py-1 rounded-full">
            {Number(typedEvent.pricing) === 0 ? 'Free' : 'Paid'}
          </span>
        </div>

        {/* Description */}
        <h3 className="font-semibold text-foreground text-sm mb-2">About this event:</h3>
        <p className="text-muted-foreground text-sm leading-relaxed mb-4">
          {typedEvent.description || 'No description provided.'}
        </p>

        {/* Event Details */}
        <div className="space-y-3 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center flex-shrink-0">
              <Calendar className="text-primary w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Date</p>
              <p className="text-sm text-foreground">{formatDate(typedEvent.date)}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center flex-shrink-0">
              <Clock className="text-primary w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Time</p>
              <p className="text-sm text-foreground">
                {formatTime(typedEvent.start_time)} - {formatTime(typedEvent.end_time)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center flex-shrink-0">
              <MapPin className="text-primary w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Venue</p>
              <p className="text-sm text-foreground">{typedEvent.venue}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center flex-shrink-0">
              <Ticket className="text-primary w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Ticket Pricing</p>
              <p className="text-sm text-foreground">
                {Number(typedEvent.pricing) === 0 ? 'Free' : `RM ${typedEvent.pricing}`}
              </p>
            </div>
          </div>

          {typedEvent.registration_deadline && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center flex-shrink-0">
                <CalendarClock className="text-primary w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-medium">Registration Deadline</p>
                <p className="text-sm text-foreground">{formatDate(typedEvent.registration_deadline)}</p>
              </div>
            </div>
          )}
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
        {!typedEvent.cancelled_at && (() => {
          const eventEnded = typedEvent.end_time
            ? new Date() > new Date(typedEvent.end_time)
            : false
          const deadlinePassed = typedEvent.registration_deadline
            ? new Date() > new Date(typedEvent.registration_deadline)
            : false
          if (registered) {
            return (
              <button disabled className="w-full py-3 rounded-full text-white font-semibold text-sm bg-green-500 cursor-default">
                Registered
              </button>
            )
          }
          if (eventEnded) {
            return (
              <button disabled className="w-full py-3 rounded-full text-white font-semibold text-sm bg-gray-400 cursor-not-allowed">
                Event Ended
              </button>
            )
          }
          if (deadlinePassed) {
            return (
              <button disabled className="w-full py-3 rounded-full text-white font-semibold text-sm bg-gray-400 cursor-not-allowed">
                Registration Deadline Passed
              </button>
            )
          }
          return (
            <button
              onClick={handleRegister}
              disabled={registerMutation.isPending}
              className="w-full py-3 rounded-full text-white font-semibold text-sm bg-accent hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {registerMutation.isPending ? 'Registering...' : 'Register Now!'}
            </button>
          )
        })()}
      </div>

      {/* Organized By */}
      <div className="bg-card mt-2 px-4 py-4">
        <h3 className="font-semibold text-foreground text-sm mb-3">Organized by:</h3>
        <button
          className="flex items-center gap-3 w-full text-left"
          onClick={() => navigate(`/organizers/${typedEvent.organizer_id}`)}
        >
          <div className="flex-shrink-0">
            <Avatar
              src={toImageUrl(typedEvent.organizer_image_url) || undefined}
              alt={typedEvent.organizer_name ?? 'Organizer'}
              className="w-12 h-12"
            />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {typedEvent.organizer_name ?? 'Organizer'}
            </p>
          </div>
          <span className="text-muted-foreground flex-shrink-0">›</span>
        </button>
      </div>
    </div>
  )
}