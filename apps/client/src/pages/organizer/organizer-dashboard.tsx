import { useNavigate } from 'react-router-dom'
import Header from '../../components/header'
import { useAuth } from '../../context/auth-context'
import { useOrganizerEventsQuery } from '../../api/queries'
import { Pen, Mail, PlusSquare, Calendar, Clock, Users, Eye, TrendingUp, MessageSquare } from 'lucide-react'
import { InstagramLogo } from 'phosphor-react'

export default function OrganizerDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const { data: events = [] } = useOrganizerEventsQuery()
  const now = new Date()
  const eventStats = {
    upcoming: (events as { date: string }[]).filter(e => new Date(e.date) >= now).length,
    total: (events as { date: string }[]).length,
  }

  return (
    <div className="bg-surface">
      <Header />

      {/* Profile Banner */}
      <div className="bg-primary px-4 py-5">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-full overflow-hidden bg-white/20">
                <img
                  src={user?.image_url ?? '/SSA Logo.jpg'}
                  alt={user?.name ?? 'Organizer avatar'}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-white font-bold text-lg">{eventStats.upcoming}</p>
                  <p className="text-blue-200 text-xs">Upcoming</p>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-lg">{eventStats.total}</p>
                  <p className="text-blue-200 text-xs">Organized</p>
                </div>
              </div>
            </div>

            <p className="text-white font-semibold text-base">{user?.name}</p>
          </div>

          {/* Edit button */}
          <button className="w-8 h-8 rounded-full border border-accent flex items-center justify-center">
            <Pen className="text-accent w-4 h-4" />
          </button>
        </div>

        {/* Social icons */}
        <div className="flex gap-3 mt-3">
          <button className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm">
            <InstagramLogo className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm">
            <Mail className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* My Events Section */}
      <div className="mx-4 mt-4 bg-card rounded-xl shadow p-4">
        <h2 className="text-primary font-semibold text-sm mb-4">My Events</h2>
        <div className="flex justify-around">
          <button
            onClick={() => navigate('/organizer/events?tab=new')}
            className="flex flex-col items-center gap-1"
            aria-label="Create new event"
          >
            <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center text-xl">
              <PlusSquare />
            </div>
            <span className="text-xs text-foreground">New</span>
          </button>
          <button
            onClick={() => navigate('/organizer/events?tab=upcoming')}
            className="flex flex-col items-center gap-1"
            aria-label="Upcoming events"
          >
            <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center text-xl">
              <Calendar />
            </div>
            <span className="text-xs text-foreground">Upcoming</span>
          </button>
          <button
            onClick={() => navigate('/organizer/events?tab=past')}
            className="flex flex-col items-center gap-1"
            aria-label="Past events"
          >
            <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center text-xl">
              <Clock />
            </div>
            <span className="text-xs text-foreground">Past</span>
          </button>
        </div>
      </div>

      {/* Analytics Section */}
      <div className="mx-4 mt-4 bg-card rounded-xl shadow p-4">
        <h2 className="text-primary font-bold text-sm mb-4">Analytics</h2>
        <div className="flex justify-around">
          <button
            onClick={() => navigate('/organizer/analytics')}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center text-xl">
              <Users />
            </div>
            <span className="text-xs text-foreground">Attendance</span>
          </button>
          <button className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center text-xl">
              <Eye />
            </div>
            <span className="text-xs text-foreground">Views</span>
          </button>
          <button className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center text-xl">
              <TrendingUp />
            </div>
            <span className="text-xs text-foreground">Reach</span>
          </button>
          <button className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center text-xl">
              <MessageSquare />
            </div>
            <span className="text-xs text-foreground">Feedback</span>
          </button>
        </div>
      </div>
    </div>
  )
}