import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronRight, Eye, ImageOff, Star, Users } from 'lucide-react'
import { AnalyticsTabSkeleton } from '../../components/skeletons'
import {
  useAttendanceAnalyticsQuery,
  useFeedbackAnalyticsQuery,
  useViewsAnalyticsQuery,
  type AttendanceAnalytics,
  type FeedbackAnalytics,
  type ViewsAnalytics,
} from '../../api/queries'

type Tab = 'attendance' | 'views' | 'feedback'

const toImageUrl = (url?: string | null) => {
  if (!url) return ''
  if (url.startsWith('/uploads/')) return url
  return url
}

const formatDate = (value: string) => {
  const d = new Date(value)
  const date = d.toLocaleDateString('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const day = d.toLocaleDateString('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    weekday: 'long',
  })
  return `${date} (${day})`
}

function EventThumbnail({ url, name }: { url: string | null; name: string }) {
  if (!url) {
    return (
      <div className="w-14 h-14 rounded-lg bg-surface flex items-center justify-center flex-shrink-0">
        <ImageOff className="w-5 h-5 text-border" />
      </div>
    )
  }
  return (
    <img
      src={toImageUrl(url)}
      alt={name}
      className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
      onError={e => {
        const element = e.target as HTMLImageElement
        element.style.display = 'none'
      }}
    />
  )
}

function StarDisplay({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const full = Math.floor(rating)
  const sizeClass = size === 'lg' ? 'w-5 h-5' : 'w-3 h-3'
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`${sizeClass} ${i <= full ? 'fill-accent text-accent' : 'text-border'}`}
        />
      ))}
    </div>
  )
}

function RatingBar({ star, count, total }: { star: number; count: number; total: number }) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-3">{star}</span>
      <Star className="w-3 h-3 fill-accent text-accent flex-shrink-0" />
      <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
        <div className="h-full bg-accent rounded-full" style={{ width: `${percentage}%` }} />
      </div>
      <span className="text-xs text-muted-foreground w-7 text-right">{percentage}%</span>
    </div>
  )
}

function ViewsTab({
  data,
  loading,
}: {
  data: ViewsAnalytics | undefined
  loading: boolean
}) {
  if (loading) return <AnalyticsTabSkeleton />
  if (!data) return null

  const { totals, events } = data

  return (
    <div>
      <div className="mx-4 mt-4 bg-card rounded-2xl shadow-sm">
        <div className="flex divide-x divide-border py-4">
          <div className="flex-1 text-center px-2">
            <p className="text-2xl font-bold text-accent">{totals.total_views}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Views</p>
          </div>
          <div className="flex-1 text-center px-2">
            <p className="text-2xl font-bold text-accent">{totals.unique_viewers}</p>
            <p className="text-xs text-muted-foreground mt-1">Unique Viewers</p>
          </div>
          <div className="flex-1 text-center px-2">
            <p className="text-2xl font-bold text-accent">{totals.avg_views_per_event}</p>
            <p className="text-xs text-muted-foreground mt-1">Avg Views/Event</p>
          </div>
        </div>
      </div>

      <p className="text-sm font-bold text-primary mx-4 mt-5 mb-2">Events</p>
      {events.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">No events yet.</p>
      ) : (
        <div className="mx-4 space-y-2">
          {events.map(e => (
            <div
              key={e.id}
              className="w-full bg-card rounded-2xl shadow-sm flex items-center gap-3 p-3"
            >
              <EventThumbnail url={e.image_url} name={e.name} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{e.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{formatDate(e.date)}</p>
              </div>
              <div className="flex-shrink-0 text-right space-y-0.5">
                <div className="flex items-center justify-end gap-1">
                  <Eye className="w-3.5 h-3.5 text-primary" />
                  <p className="text-sm font-bold text-primary">{e.total_views}</p>
                </div>
                <div className="flex items-center justify-end gap-1">
                  <Users className="w-3 h-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">{e.unique_viewers} unique</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AttendanceTab({
  data,
  loading,
  onRowClick,
}: {
  data: AttendanceAnalytics | undefined
  loading: boolean
  onRowClick: (id: string) => void
}) {
  if (loading) return <AnalyticsTabSkeleton />
  if (!data) return null

  const { totals, events } = data

  return (
    <div>
      {/* Summary metrics */}
      <div className="mx-4 mt-4 bg-card rounded-2xl shadow-sm">
        <div className="flex divide-x divide-border py-4">
          <div className="flex-1 text-center px-2">
            <p className="text-2xl font-bold text-accent">{totals.total_registrations}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Registrations</p>
          </div>
          <div className="flex-1 text-center px-2">
            <p className="text-2xl font-bold text-accent">{totals.total_attendees}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Attendees</p>
          </div>
          <div className="flex-1 text-center px-2">
            <p className="text-2xl font-bold text-accent">{totals.attendance_rate}%</p>
            <p className="text-xs text-muted-foreground mt-1">Attendance Rate</p>
          </div>
        </div>
      </div>

      {/* Events list */}
      <p className="text-sm font-bold text-primary mx-4 mt-5 mb-2">Events</p>
      {events.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">No events yet.</p>
      ) : (
        <div className="mx-4 space-y-2">
          {events.map(e => (
            <button
              key={e.id}
              onClick={() => onRowClick(e.id)}
              className="w-full bg-card rounded-2xl shadow-sm flex items-center gap-3 p-3 text-left cursor-pointer"
            >
              <EventThumbnail url={e.image_url} name={e.name} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{e.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{formatDate(e.date)}</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-sm font-bold text-primary">
                  {e.attendees} / {e.registrations}
                </p>
                <p className="text-sm font-bold text-accent">{e.attendance_rate}%</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function FeedbackTab({
  data,
  loading,
  onRowClick,
}: {
  data: FeedbackAnalytics | undefined
  loading: boolean
  onRowClick: (id: string) => void
}) {
  if (loading) return <AnalyticsTabSkeleton />
  if (!data) return null

  const { totals, rating_distribution, events } = data
  const totalFeedback = totals.total_feedback

  return (
    <div>
      {/* Summary metrics */}
      <div className="mx-4 mt-4 bg-card rounded-2xl shadow-sm">
        <div className="flex divide-x divide-border py-4">
          <div className="flex-1 text-center px-2">
            <p className="text-2xl font-bold text-accent">{totals.total_feedback}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Feedback</p>
          </div>
          <div className="flex-1 text-center px-2">
            <p className="text-2xl font-bold text-accent">
              {totals.avg_rating > 0 ? totals.avg_rating.toFixed(1) : '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Avg Rating</p>
          </div>
          <div className="flex-1 text-center px-2">
            <p className="text-2xl font-bold text-accent">{totals.feedback_rate}%</p>
            <p className="text-xs text-muted-foreground mt-1">Feedback Rate</p>
          </div>
        </div>
      </div>

      {/* Rating breakdown */}
      <div className="mx-4 mt-4 bg-card rounded-2xl shadow-sm p-4">
        <p className="text-sm font-bold text-foreground mb-4">Event Ratings Breakdown</p>
        <div className="flex gap-4 items-center">
          {/* Left: rating, stars, count */}
          <div className="flex flex-col items-center flex-shrink-0 w-20">
            <p className="text-3xl font-bold text-accent">
              {totals.avg_rating > 0 ? totals.avg_rating.toFixed(1) : '—'}
            </p>
            <StarDisplay rating={totals.avg_rating} size="sm" />
            <p className="text-xs text-muted-foreground mt-1">{totalFeedback} Feedback</p>
          </div>
          {/* Right: bars */}
          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map(star => (
              <RatingBar
                key={star}
                star={star}
                count={rating_distribution[String(star)] ?? 0}
                total={totalFeedback}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Events list */}
      <p className="text-sm font-bold text-primary mx-4 mt-5 mb-2">Events</p>
      {events.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">No events yet.</p>
      ) : (
        <div className="mx-4 space-y-2">
          {events.map(e => (
            <button
              key={e.id}
              onClick={() => onRowClick(e.id)}
              className="w-full bg-card rounded-2xl shadow-sm flex items-center gap-3 p-3 text-left cursor-pointer"
            >
              <EventThumbnail url={e.image_url} name={e.name} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{e.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{formatDate(e.date)}</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="flex items-center gap-1 justify-end">
                  <Star className="w-3.5 h-3.5 fill-accent text-accent" />
                  <span className="text-sm font-bold text-accent">
                    {e.avg_rating > 0 ? e.avg_rating.toFixed(1) : '—'}
                  </span>
                </div>
                <p className="text-xs mt-0.5 text-muted-foreground">
                  {e.feedback_count} feedback
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function OrganizerAnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const initialTab = (searchParams.get('tab') as Tab) ?? 'attendance'
  const [tab, setTab] = useState<Tab>(initialTab)

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab)
    setSearchParams({ tab: newTab }, { replace: true })
  }

  const { data: attendanceData, isLoading: attendanceLoading } = useAttendanceAnalyticsQuery()
  const { data: feedbackData, isLoading: feedbackLoading } = useFeedbackAnalyticsQuery()
  const { data: viewsData, isLoading: viewsLoading } = useViewsAnalyticsQuery()

  const tabs: { key: Tab; label: string; disabled?: boolean }[] = [
    { key: 'attendance', label: 'Attendance' },
    { key: 'views', label: 'Views' },
    { key: 'feedback', label: 'Feedback' },
  ]

  return (
    <div className="bg-surface pb-8">

      <div className="bg-primary px-4 py-3 flex items-center gap-3">
        <h1 className="text-white font-bold text-base flex-1 text-center">Analytics</h1>
      </div>

      {/* Tabs */}
      <div className="bg-card px-4 py-3 flex gap-2">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => !t.disabled && handleTabChange(t.key)}
            disabled={t.disabled}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap
              ${tab === t.key
                ? 'bg-primary text-white'
                : t.disabled
                  ? 'text-border cursor-not-allowed'
                  : 'text-muted-foreground cursor-pointer'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'attendance' && (
        <AttendanceTab
          data={attendanceData}
          loading={attendanceLoading}
          onRowClick={id => navigate(`/organizer/events/${id}/analytics?view=attendance`)}
        />
      )}
      {tab === 'views' && (
        <ViewsTab data={viewsData} loading={viewsLoading} />
      )}
      {tab === 'feedback' && (
        <FeedbackTab
          data={feedbackData}
          loading={feedbackLoading}
          onRowClick={id => navigate(`/organizer/events/${id}/analytics?view=feedback`)}
        />
      )}
    </div>
  )
}
