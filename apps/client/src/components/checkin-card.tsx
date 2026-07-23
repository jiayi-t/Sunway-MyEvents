import { useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '../context/auth-context'
import { useMyRegistrationsQuery, useCheckinTokenQuery } from '../api/queries'
import { CheckinCardSkeleton } from './skeletons'
import { Calendar, Clock, MapPin } from 'lucide-react'

interface Registration {
  id: number
  event_id: string
  event_name: string
  event_date: string
  event_start_time: string
  event_end_time: string
  event_venue: string
  organizer_name: string
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

export default function CheckinCard({ identifier }: { identifier?: string }) {
  const { id } = useParams()
  const { user } = useAuth()
  const { data, isLoading: regsLoading } = useMyRegistrationsQuery()
  const { data: token, isLoading: tokenLoading } = useCheckinTokenQuery(id)

  const registrations = (data || []) as Registration[]
  const registration = registrations.find(r => r.event_id === id)

  if (regsLoading || tokenLoading) return <CheckinCardSkeleton />

  if (!registration) return (
    <div className="bg-surface flex items-center justify-center">
      <p className="text-muted-foreground text-sm">Registration not found</p>
    </div>
  )

  return (
    <div className="bg-surface">

      {/* Sub-header */}
      <div className="bg-primary px-4 py-3 flex items-center gap-3">
        <h1 className="text-white font-bold text-base flex-1 text-center">Check In</h1>
      </div>

      {/* Check-in Card */}
      <div className="px-4 py-6">
      <div className="bg-card rounded-xl shadow p-5">
        {/* Attendee identity */}
        <div className="flex items-center justify-center gap-3 mb-5">
          <span className="font-semibold text-foreground text-sm">{user?.name}</span>
          <span className="text-muted-foreground text-sm">|</span>
          <span className="font-semibold text-foreground text-sm">{identifier}</span>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-6">
          <QRCodeSVG value={token ?? ''} size={220} />
        </div>

        {/* Event info */}
        <h2 className="font-bold text-foreground text-lg leading-tight mb-1">
          {registration.event_name}
        </h2>
        <p className="text-accent text-sm mb-4">{registration.organizer_name}</p>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center flex-shrink-0">
              <Calendar className="text-primary w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Date</p>
              <p className="text-sm text-foreground">{formatDate(registration.event_date)}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center flex-shrink-0">
              <Clock className="text-primary w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Time</p>
              <p className="text-sm text-foreground">
                {formatTime(registration.event_start_time)} - {formatTime(registration.event_end_time)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center flex-shrink-0">
              <MapPin className="text-primary w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Venue</p>
              <p className="text-sm text-foreground">{registration.event_venue}</p>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground text-center px-2">
        Show this QR code to your event organizer to get checked in.
      </p>
      </div>
    </div>
  )
}