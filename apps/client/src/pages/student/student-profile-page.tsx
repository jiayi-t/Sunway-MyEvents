import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/auth-context'
import { useMyRegistrationsQuery, useMyFeedbackQuery } from '../../api/queries'
import { Calendar, Clock, Bookmark, Settings } from 'lucide-react'

interface Registration {
  id: number
  event_date: string
  checked_in_at: string | null
}

export default function StudentProfilePage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const { data: registrationsData } = useMyRegistrationsQuery()
  const { data: myFeedbackData } = useMyFeedbackQuery()
  const registrations = (registrationsData || []) as Registration[]
  const feedbackCount = (myFeedbackData || []).length

  const now = new Date()
  const upcoming = registrations.filter(r => new Date(r.event_date) >= now)
  const attended = registrations.filter(r => r.checked_in_at !== null)

  return (
    <div className="bg-surface">

      {/* Profile Banner */}
      <div className="bg-primary px-4 py-5">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-full overflow-hidden bg-white/20">
                <img
                  src={user?.image_url ?? '/Default Icon.jpg'}
                  alt={user?.name ?? 'Student avatar'}
                  className="w-full h-full object-cover"
                  onError={e => { e.currentTarget.src = '/Default Icon.jpg' }}
                />
              </div>

              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-white font-bold text-lg">{upcoming.length}</p>
                  <p className="text-blue-200 text-xs">Upcoming</p>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-lg">{attended.length}</p>
                  <p className="text-blue-200 text-xs">Attended</p>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-lg">{feedbackCount}</p>
                  <p className="text-blue-200 text-xs">Feedback Given</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-white font-semibold text-base">{user?.name}</p>
              <p className="text-blue-200 text-sm">{user?.sunway_id}</p>
            </div>
          </div>

          {/* Settings Button */}
          <button
            onClick={() => navigate('/settings')}
            className="w-8 h-8 rounded-full border border-accent flex items-center justify-center"
          >
            <Settings className="text-accent w-4 h-4" />
          </button>
        </div>
      </div>

      {/* My Events Section */}
      <div className="mx-4 mt-4 bg-card rounded-xl shadow p-4">
        <h2 className="text-primary font-semibold text-sm mb-4">My Events</h2>
        <div className="flex justify-around">
          <button
            onClick={() => navigate('/my-events?tab=upcoming')}
            className="flex flex-col items-center gap-1"
            aria-label="Upcoming events"
          >
            <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center text-xl">
              <Calendar />
            </div>
            <span className="text-xs text-foreground">Upcoming</span>
          </button>
          <button
            onClick={() => navigate('/my-events?tab=past')}
            className="flex flex-col items-center gap-1"
            aria-label="Past events"
          >
            <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center text-xl">
              <Clock />
            </div>
            <span className="text-xs text-foreground">Past</span>
          </button>
          <button
            onClick={() => navigate('/my-events?tab=saved')}
            className="flex flex-col items-center gap-1"
            aria-label="Saved events"
          >
            <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center text-xl">
              <Bookmark />
            </div>
            <span className="text-xs text-foreground">Saved</span>
          </button>
        </div>
      </div>
    </div>
  )
}