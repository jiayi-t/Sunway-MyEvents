import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import { useMyRegistrationsQuery, useMyFeedbackQuery } from '../api/queries'
import { Calendar, Clock, Bookmark, Settings, type LucideIcon } from 'lucide-react'
import Avatar from './avatar'

interface Registration {
  id: number
  event_date: string
  event_end_time: string
  checked_in_at: string | null
}

// stat counter layout in profile banner
export function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="text-lg font-bold text-white leading-none">{value}</p>
      <p className="text-[11px] text-white/60 mt-1">{label}</p>
    </div>
  )
}

// shortcut tile in the My Events / Analytics cards
export function ShortcutTile({ icon: Icon, label, onClick, tour }: {
  icon: LucideIcon
  label: string
  onClick: () => void
  tour?: string
}) {
  return (
    <button
      data-tour={tour}
      onClick={onClick}
      className="flex flex-col items-center gap-1 cursor-pointer"
      aria-label={label}
    >
      <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center">
        <Icon />
      </div>
      <span className="text-xs text-foreground">{label}</span>
    </button>
  )
}

export function ProfileBanner({ identifier }: { identifier?: string }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const { data: registrationsData } = useMyRegistrationsQuery()
  const { data: myFeedbackData } = useMyFeedbackQuery()
  const registrations = (registrationsData || []) as Registration[]
  const feedbackCount = (myFeedbackData || []).length

  const now = new Date()
  // an event counts as upcoming until it ends, not until midnight of its date
  const upcoming = registrations.filter(r => new Date(r.event_end_time || r.event_date) >= now)
  const attended = registrations.filter(r => r.checked_in_at !== null)

  // Profile Banner
  return (
    <div className="bg-primary full-bleed-bar py-5">
      <div className="flex items-start justify-between gap-4">
        {/* avatar stacks above the identity column on mobile and sits beside it once there is width */}
        <div className="flex flex-col lg:flex-row lg:items-start gap-3 lg:gap-5 min-w-0 flex-1">
          <Avatar
            src={user?.image_url}
            alt={user?.name ?? 'Avatar'}
            className="w-20 h-20 lg:w-24 lg:h-24 ring-4 ring-white/25 flex-shrink-0"
          />

          <div className="min-w-0 flex-1">
            <h1 className="text-white font-bold text-xl lg:text-2xl">{user?.name}</h1>
            <p className="text-white/70 text-sm mt-1.5">{identifier}</p>
          </div>
        </div>

        {/* Settings Button */}
        <button
          onClick={() => navigate('/settings')}
          className="w-8 h-8 rounded-full border border-accent flex items-center justify-center cursor-pointer flex-shrink-0"
        >
          <Settings className="text-accent w-4 h-4" />
        </button>
      </div>

      {/* stat counts */}
      <div className="mt-6 flex flex-wrap gap-6">
        <Stat value={upcoming.length} label="Upcoming" />
        <Stat value={attended.length} label="Attended" />
        <Stat value={feedbackCount} label="Feedback Given" />
      </div>
    </div>
  )
}

export function MyEventsShortcuts() {
  const navigate = useNavigate()

  // My Events Section
  return (
    <div className="bg-card rounded-xl shadow p-4">
      <h2 className="text-primary font-semibold text-sm mb-4">My Events</h2>
      <div className="flex justify-around">
        <ShortcutTile icon={Calendar} label="Upcoming" onClick={() => navigate('/my-events?tab=upcoming')} />
        <ShortcutTile icon={Clock} label="Past" onClick={() => navigate('/my-events?tab=past')} />
        <ShortcutTile icon={Bookmark} label="Saved" onClick={() => navigate('/my-events?tab=saved')} />
      </div>
    </div>
  )
}
