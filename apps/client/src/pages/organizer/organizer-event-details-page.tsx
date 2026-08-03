import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/auth-context'
import { useEventQuery } from '../../api/queries'
import { useCancelEventMutation, useArchiveEventMutation, useUnarchiveEventMutation, usePinEventMutation, useUnpinEventMutation } from '../../api/mutations'
import { EventDetailsSkeleton } from '../../components/skeletons'
import { categoryPillStyle, audiencePillClass, pricingPillClass } from '../../utils/event-colors.utils'
import { Archive, Ban, BarChart2, Calendar, CalendarClock, Clock, ImageOff, MapPin, MoreVertical, Pencil, Pin, PinOff, ScanQrCode, Ticket, Users } from 'lucide-react'

interface OrganizerEventDetail {
  id: string
  name: string
  description: string
  date: string
  start_time: string
  end_time: string
  venue: string
  category: string
  audience: string
  pricing: number | string
  capacity: number
  registration_deadline: string
  image_url: string
  organizer_id: string
  registered_count: number
  cancelled_at: string | null
  archived_at: string | null
  pinned_at: string | null
  is_owner: boolean
}

const toImageUrl = (url?: string | null) => {
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

export default function OrganizerEventDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState(false)
  const [actionError, setActionError] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  const { data, isLoading, isError } = useEventQuery(id)
  const event = data as OrganizerEventDetail | undefined

  const cancelMutation = useCancelEventMutation(id)
  const archiveMutation = useArchiveEventMutation(id)
  const unarchiveMutation = useUnarchiveEventMutation(id)
  const pinMutation = usePinEventMutation(id)
  const unpinMutation = useUnpinEventMutation(id)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const isPast = event ? new Date(event.end_time) < new Date() : false
  const isArchived = !!event?.archived_at
  const isCancelled = !!event?.cancelled_at
  const isPinned = !!event?.pinned_at
  const processing = cancelMutation.isPending || archiveMutation.isPending || unarchiveMutation.isPending
  const pinning = pinMutation.isPending || unpinMutation.isPending
  // a cancelled, non-archived event has no actions left
  const hasMenuOptions = !isCancelled || isArchived

  // pin is a reversible toggle, so it fires straight from the menu with no confirmation step
  const handlePinToggle = () => {
    setActionError('')
    setMenuOpen(false)
    const mutation = isPinned ? unpinMutation : pinMutation
    mutation.mutate(undefined, {
      onError: (err: any) => setActionError(err?.response?.data?.error || 'Action failed'),
    })
  }

  const handleAction = () => {
    setActionError('')
    if (isArchived) {
      unarchiveMutation.mutate(undefined, {
        onSuccess: () => setConfirmAction(false),
        onError: () => { setActionError('Action failed'); setConfirmAction(false) },
      })
    } else if (isPast) {
      archiveMutation.mutate(undefined, {
        onSuccess: () => setConfirmAction(false),
        onError: () => { setActionError('Action failed'); setConfirmAction(false) },
      })
    } else {
      cancelMutation.mutate(undefined, {
        onSuccess: () => setConfirmAction(false),
        onError: () => { setActionError('Action failed'); setConfirmAction(false) },
      })
    }
  }

  if (isLoading) return (
    <div className="min-h-screen bg-surface">
      <div className="bg-primary full-bleed-bar py-3 flex items-center gap-3">
        <h1 className="text-white font-bold text-base flex-1 text-center">Event Details</h1>
      </div>
      <EventDetailsSkeleton />
    </div>
  )

  if (isError || !event) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <p className="text-muted-foreground text-sm">{actionError || 'Event not found'}</p>
    </div>
  )

  // only the organizer gets the organizer view for their own events, anyone else sees the student/public view
  // is_owner is computed server-side (uuid urls mean organizer_id is no longer the caller's integer id)
  if (user && !event.is_owner) {
    return <Navigate to={`/events/${id}`} replace />
  }

  const sold = Number(event.registered_count ?? 0)

  return (
    <div className="min-h-screen bg-surface">

      {/* Sub-header */}
      <div className="bg-primary full-bleed-bar py-3 flex items-center gap-3">
        <h1 className="text-white font-bold text-base flex-1 text-center">Event Details</h1>
      </div>

      {event.archived_at && (
        <div className="bg-gray-500 text-white text-sm font-semibold full-bleed-bar py-2.5 text-center">
          This event has been archived
        </div>
      )}
      {event.cancelled_at && (
        <div className="bg-red-500 text-white text-sm font-semibold full-bleed-bar py-2.5 text-center">
          This event has been cancelled
        </div>
      )}
      {actionError && (
        <div className="bg-red-500 text-white text-sm font-semibold full-bleed-bar py-2.5 text-center">
          {actionError}
        </div>
      )}

      <div className="lg:flex lg:items-start lg:gap-6 lg:p-6 lg:pb-0">
        {/* Event Poster */}
        <div className="relative lg:w-5/12 lg:flex-shrink-0 lg:rounded-xl lg:overflow-hidden lg:shadow-sm">
          {event.image_url
            ? <img 
                src={toImageUrl(event.image_url)} 
                alt={event.name} 
                className="w-full object-cover" 
                style={{ aspectRatio: '4/5' }} 
              />
            : <div className="w-full bg-surface flex flex-col items-center justify-center gap-2" style={{ aspectRatio: '4/5' }}>
                <ImageOff className="w-10 h-10 text-border" />
                <p className="text-muted-foreground text-xs">No poster uploaded</p>
              </div>
          }
        </div>

        <div className="lg:flex-1 lg:min-w-0">
          {/* Event Info */}
          <div className="bg-card px-4 py-4 lg:rounded-xl">
            <div className="flex items-start justify-between gap-2 mb-3">
              <h2 className="font-bold text-foreground text-lg leading-tight flex-1">
                {event.name}
                {isPinned && (
                  <span className="align-middle ml-2 inline-flex items-center gap-1 bg-primary text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">
                    <Pin className="w-2.5 h-2.5" /> PINNED
                  </span>
                )}
              </h2>
              <div className="flex gap-2 flex-shrink-0 mt-1 relative" ref={menuRef}>
                {hasMenuOptions && (
                  <button onClick={() => setMenuOpen(prev => !prev)} className="text-foreground cursor-pointer">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                )}

                {menuOpen && (
                  <div className="absolute right-8 top-0 bg-card shadow-lg rounded-lg py-1 z-10 min-w-[130px] border border-border">
                    {!isPast && !isCancelled && (
                      <button
                        onClick={() => { setMenuOpen(false); navigate(`/organizer/events/${id}/edit`) }}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-surface w-full text-left cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" /> Edit
                      </button>
                    )}
                    {/* archived and cancelled events are hidden from the public profile */}
                    {!isArchived && !event.cancelled_at && (
                      <button
                        onClick={handlePinToggle}
                        disabled={pinning}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-surface w-full text-left disabled:opacity-50 cursor-pointer"
                      >
                        {isPinned
                          ? <><PinOff className="w-4 h-4" /> Unpin</>
                          : <><Pin className="w-4 h-4" /> Pin</>}
                      </button>
                    )}
                    {isArchived ? (
                      <button
                        onClick={() => { setMenuOpen(false); setConfirmAction(true) }}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-surface w-full text-left cursor-pointer"
                      >
                        <Archive className="w-4 h-4" /> Unarchive
                      </button>
                    ) : !event.cancelled_at && (
                      <button
                        onClick={() => { setMenuOpen(false); setConfirmAction(true) }}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-surface w-full text-left cursor-pointer"
                      >
                        {isPast ? <Archive className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                        {isPast ? 'Archive' : 'Cancel'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Ticket/Registration Info */}
            <p className="text-accent text-sm font-medium mb-3">
              {sold} {sold === 1 ? 'ticket sold' : 'tickets sold'}
            </p>

            {/* Category labels */}
            <div className="flex flex-wrap gap-2 mb-4">
              {event.category && (
                <span className="text-xs px-3 py-1 rounded-full" {...categoryPillStyle(event.category)}>
                  {event.category}
                </span>
              )}
              <span className={`text-xs px-3 py-1 rounded-full ${audiencePillClass(event.audience)}`}>
                {event.audience === 'students_only' ? 'Students Only' : 'Open to Public'}
              </span>
              <span className={`text-xs px-3 py-1 rounded-full ${pricingPillClass(event.pricing)}`}>
                {Number(event.pricing) === 0 ? 'Free' : 'Paid'}
              </span>
            </div>

            {/* Description */}
            <h3 className="font-semibold text-foreground text-sm mb-2">About this event:</h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4 whitespace-pre-line">
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
                  <p className="text-sm text-foreground">{formatTime(event.start_time)} - {formatTime(event.end_time)}</p>
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
                    {Number(event.pricing) === 0 ? 'Free' : `RM ${event.pricing}`}
                  </p>
                </div>
              </div>

              {event.registration_deadline && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center flex-shrink-0">
                    <CalendarClock className="text-primary w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-medium">Registration Deadline</p>
                    <p className="text-sm text-foreground">{formatDate(event.registration_deadline)}</p>
                  </div>
                </div>
              )}
            </div>

            {!isPast ? (
              <div className="flex gap-3">
                  <button
                    onClick={() => navigate(`/organizer/events/${id}/checkin`)}
                    className="flex-1 flex items-center justify-center gap-2 bg-accent text-white py-3 rounded-full text-sm font-semibold cursor-pointer"
                  >
                    <ScanQrCode className="w-4 h-4" />
                    Check In
                  </button>
                <button
                  onClick={() => navigate(`/organizer/events/${id}/participants`)}
                  className="flex-1 flex items-center justify-center gap-2 bg-accent text-white py-3 rounded-full text-sm font-semibold cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  View Participants
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate(`/organizer/events/${id}/analytics`)}
                className="w-full flex items-center justify-center gap-2 bg-accent text-white py-3 rounded-full text-sm font-semibold cursor-pointer"
              >
                <BarChart2 className="w-4 h-4" />
                View Analytics
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cancel / archive confirmation modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-foreground text-base mb-2">
              {isArchived ? 'Unarchive Event?' : isPast ? 'Archive Event?' : 'Cancel Event?'}
            </h3>
            <p className="text-muted-foreground text-sm mb-5">
              {isArchived
                ? 'This event will become visible to students again.'
                : isPast
                  ? 'This event will be hidden from students. You can still view it in your event history.'
                  : 'This will cancel the event and notify all registered participants.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction(false)}
                className="flex-1 border border-border rounded-lg py-2.5 text-sm font-medium text-foreground cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={handleAction}
                disabled={processing}
                className={`flex-1 text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50 cursor-pointer ${isArchived ? 'bg-primary' : 'bg-red-500'}`}
              >
                {processing ? 'Processing...' : isArchived ? 'Unarchive' : isPast ? 'Archive' : 'Cancel Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}