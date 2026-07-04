import { useEffect } from 'react'
import { useNotificationsQuery } from '../../api/queries'
import { useMarkAllNotificationsReadMutation } from '../../api/mutations'
import { Ban, Bell, CalendarPlus, CalendarClock, Pencil } from 'lucide-react'

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  return new Date(dateStr).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function isToday(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
}

function isYesterday(dateStr: string) {
  const d = new Date(dateStr)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
}

function isLast7Days(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  return diff <= 7 * 24 * 60 * 60 * 1000
}

function isLast30Days(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  return diff <= 30 * 24 * 60 * 60 * 1000
}

function NotificationItem({ n }: { n: any }) {
  return (
    <div className="px-4 py-4 flex items-start gap-3 bg-card">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
        n.type === 'event_cancelled' ? 'bg-red-100' :
        n.type === 'organizer_followed' ? 'bg-gray-100' :
        n.type === 'event_updated' ? 'bg-orange-100' :
        n.type === 'new_event' ? 'bg-green-100' :
        n.type === 'event_reminder' ? 'bg-blue-100' :
        'bg-gray-100'
      }`}>
        {n.type === 'event_cancelled' && <Ban className="w-5 h-5 text-red-500" />}
        {n.type === 'organizer_followed' && <Bell className="w-5 h-5 text-gray-500" />}
        {n.type === 'event_updated' && <Pencil className="w-5 h-5 text-orange-500" />}
        {n.type === 'new_event' && <CalendarPlus className="w-5 h-5 text-green-600" />}
        {n.type === 'event_reminder' && <CalendarClock className="w-5 h-5 text-blue-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{n.title}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
        <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
      </div>
      {!n.read_at && (
        <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-1.5" />
      )}
    </div>
  )
}

function Section({ label, items }: { label: string; items: any[] }) {
  if (items.length === 0) return null
  return (
    <div className="mt-4">
      <p className="text-accent text-base font-bold px-4 pb-2">{label}</p>
      <div className="divide-y divide-border border-y border-border">
        {items.map(n => <NotificationItem key={n.id} n={n} />)}
      </div>
    </div>
  )
}

export default function NotificationsPage() {
  const { data: notifications = [], isLoading } = useNotificationsQuery()
  const markAllReadMutation = useMarkAllNotificationsReadMutation()

  useEffect(() => {
    markAllReadMutation.mutate()
  }, [])

  const all = notifications as any[]
  const today = all.filter(n => isToday(n.created_at))
  const yesterday = all.filter(n => isYesterday(n.created_at))
  const last7 = all.filter(n => !isToday(n.created_at) && !isYesterday(n.created_at) && isLast7Days(n.created_at))
  const last30 = all.filter(n => !isLast7Days(n.created_at) && isLast30Days(n.created_at))
  const older = all.filter(n => !isLast30Days(n.created_at))

  return (
    <div className="bg-surface min-h-screen">

      <div className="bg-primary px-4 py-3 flex items-center gap-3">
        <h1 className="text-white font-bold text-base flex-1 text-center">Notifications</h1>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm text-center mt-12">Loading...</p>
      ) : all.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center mt-12">No notifications yet.</p>
      ) : (
        <div className="pb-4">
          <Section label="Today" items={today} />
          <Section label="Yesterday" items={yesterday} />
          <Section label="Last 7 Days" items={last7} />
          <Section label="Last 30 Days" items={last30} />
          <Section label="Older" items={older} />
        </div>
      )}
    </div>
  )
}
