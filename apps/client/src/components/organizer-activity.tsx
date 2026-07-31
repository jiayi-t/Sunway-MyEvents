import { useNavigate } from 'react-router-dom'
import { useOrganizerActivityQuery, type ActivityItem } from '../api/queries'
import { Users, MessageSquare, Bell, ChevronRight } from 'lucide-react'

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  return `${weeks}w ago`
}

const describe = (item: ActivityItem) => {
  const plural = item.count === 1 ? '' : 's'
  if (item.type === 'registration') return `${item.count} new registration${plural}`
  if (item.type === 'feedback') return `${item.count} new feedback response${plural}`
  return `${item.count} new follower${plural}`
}

const ICONS = {
  registration: { icon: Users, wrapper: 'bg-green-100', icon_class: 'text-green-600' },
  feedback: { icon: MessageSquare, wrapper: 'bg-blue-100', icon_class: 'text-blue-500' },
  follower: { icon: Bell, wrapper: 'bg-gray-100', icon_class: 'text-gray-500' },
}

// rolling log of what happened on the organizer's events, newest first
export default function OrganizerActivity() {
  const navigate = useNavigate()
  const { data, isLoading } = useOrganizerActivityQuery()
  const items = data ?? []

  // registrations open the participant list, feedback opens that event's analytics on its feedback tab
  const openItem = (item: ActivityItem) => {
    if (!item.event_id) return
    if (item.type === 'registration') navigate(`/organizer/events/${item.event_id}/participants`)
    else navigate(`/organizer/events/${item.event_id}/analytics?view=feedback`)
  }

  return (
    <div className="bg-card rounded-xl shadow p-4">
      <h2 className="text-primary font-semibold text-sm mb-1">Latest Activities</h2>

      {isLoading ? (
        <p className="text-muted-foreground text-sm py-4">Loading activities...</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm py-4">No recent activities.</p>
      ) : (
        // show 3 on mobile, 5 on desktop, scroll the rest
        <div className="divide-y divide-border max-h-60 lg:max-h-[24.5rem] overflow-y-auto overflow-x-hidden">
          {items.map((item, i) => {
            const { icon: Icon, wrapper, icon_class } = ICONS[item.type]
            const clickable = !!item.event_id

            return (
              <div
                key={i}
                onClick={() => openItem(item)}
                className={`flex items-center gap-3 py-3 px-2 ${clickable ? 'cursor-pointer hover:bg-surface rounded-lg transition-colors' : ''}`}
              >
                <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${wrapper}`}>
                  <Icon className={`w-5 h-5 ${icon_class}`} />
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-sm font-semibold leading-tight">{describe(item)}</p>
                  {/* the timestamp sits on its own line */}
                  {item.event_name && (
                    <p className="text-muted-foreground text-xs mt-0.5 truncate">{item.event_name}</p>
                  )}
                  <p className="text-muted-foreground text-xs mt-0.5">{timeAgo(item.last_at)}</p>
                </div>

                {clickable && <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
