import { useNavigate } from 'react-router-dom'
import Header from '../../components/header'
import { useAuth } from '../../context/auth-context'
import {
  FaPen,
  FaCalendarAlt,
  FaRegClock,
  FaRegBookmark
} from 'react-icons/fa'

export default function StudentProfilePage() {
  const { user } = useAuth()
  const navigate = useNavigate()

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
                  src={user?.image_url ?? '/Default Icon.jpg'}
                  alt={user?.name ?? 'Student avatar'}
                  className="w-full h-full object-cover"
                  onError={e => { e.currentTarget.src = '/Default Icon.jpg' }}
                />
              </div>

              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-white font-bold text-lg">0</p>
                  <p className="text-blue-200 text-xs">Upcoming</p>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-lg">0</p>
                  <p className="text-blue-200 text-xs">Attended</p>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-lg">0</p>
                  <p className="text-blue-200 text-xs">Feedback Given</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-white font-semibold text-base">{user?.name}</p>
              <p className="text-blue-200 text-sm">{user?.sunway_id}</p>
            </div>
          </div>

          {/* Edit button */}
          <button className="w-8 h-8 rounded-full border border-accent flex items-center justify-center">
            <FaPen className="text-accent text-xs" />
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
              <FaCalendarAlt />
            </div>
            <span className="text-xs text-foreground">Upcoming</span>
          </button>
          <button
            onClick={() => navigate('/my-events?tab=past')}
            className="flex flex-col items-center gap-1"
            aria-label="Past events"
          >
            <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center text-xl">
              <FaRegClock />
            </div>
            <span className="text-xs text-foreground">Past</span>
          </button>
          <button
            onClick={() => navigate('/my-events?tab=saved')}
            className="flex flex-col items-center gap-1"
            aria-label="Saved events"
          >
            <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center text-xl">
              <FaRegBookmark />
            </div>
            <span className="text-xs text-foreground">Saved</span>
          </button>
        </div>
      </div>
    </div>
  )
}