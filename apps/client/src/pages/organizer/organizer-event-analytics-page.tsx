import { useParams, useSearchParams } from 'react-router-dom'
import { Sparkles, Star } from 'lucide-react'
import { useEventAiSummaryQuery, useEventAnalyticsQuery, type QuestionAnalysis } from '../../api/queries'
import { AnalyticsTabSkeleton } from '../../components/skeletons'

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

function OptionBar({ label, count, max }: { label: string; count: number; max: number }) {
  const percentage = max > 0 ? (count / max) * 100 : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <span className="text-xs text-foreground">{label}</span>
        <span className="text-xs font-semibold text-foreground">{count}</span>
      </div>
      <div className="h-2 bg-surface rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}

// AI response summary shown inside an open-ended question card
function QuestionAiSummary({ query, question, responseCount }: {
  query: ReturnType<typeof useEventAiSummaryQuery>
  question: string
  responseCount: number
}) {
  const { data, isLoading } = query

  // only summarize questions with at least 3 responses, else the response summary card is not shown at all
  if (responseCount < 3) return null

  if (isLoading) {
    return (
      <div className="bg-surface rounded-xl p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <p className="text-xs font-bold text-foreground">Response Summary</p>
        </div>
        <div className="space-y-1.5 animate-pulse">
          <div className="h-2.5 bg-card rounded-full w-full" />
          <div className="h-2.5 bg-card rounded-full w-5/6" />
          <div className="h-2.5 bg-card rounded-full w-2/3" />
        </div>
      </div>
    )
  }

  const points = data?.summary?.questions.find(s => s.question === question)?.points
  if (!data?.available || !points || points.length === 0) return null

  return (
    <div className="bg-surface rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-accent" />
        <p className="text-xs font-bold text-foreground">Response Summary</p>
      </div>
      <ul className="space-y-1">
        {points.map((pt, i) => (
          <li key={i} className="text-xs text-muted-foreground pl-3 relative break-words">
            <span className="absolute left-0 text-accent">•</span>
            {pt}
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-muted-foreground">
        Summarized by AI from {responseCount} responses. May contain inaccuracies.
      </p>
    </div>
  )
}

function QuestionBreakdown({ q, aiSummary }: { q: QuestionAnalysis; aiSummary: ReturnType<typeof useEventAiSummaryQuery> }) {
  if (q.type === 'open_ended') {
    const responses = q.responses as string[]
    return (
      <div className="bg-card rounded-2xl p-4 shadow-sm space-y-3">
        <p className="text-sm font-semibold text-foreground">{q.question}</p>
        {responses.length === 0 ? (
          <p className="text-xs text-muted-foreground">No responses.</p>
        ) : (
          <>
            <QuestionAiSummary query={aiSummary} question={q.question} responseCount={responses.length} />
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {responses.map((r, i) => (
                <p key={i} className="text-xs text-muted-foreground bg-surface rounded-lg px-3 py-2 break-words">
                  {r}
                </p>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  const responses = q.responses as Record<string, number>
  const options = (q as { options?: string[] }).options ?? Object.keys(responses)
  const maxCount = Math.max(...Object.values(responses), 1)

  return (
    <div className="bg-card rounded-2xl p-4 shadow-sm space-y-3">
      <p className="text-sm font-semibold text-foreground">{q.question}</p>
      {options.length === 0 ? (
        <p className="text-xs text-muted-foreground">No responses.</p>
      ) : (
        <div className="space-y-3">
          {options.map(opt => (
            <OptionBar key={opt} label={opt} count={responses[opt] ?? 0} max={maxCount} />
          ))}
        </div>
      )}
    </div>
  )
}

type View = 'attendance' | 'views' | 'feedback'

const VIEWS: { key: View; label: string }[] = [
  { key: 'attendance', label: 'Attendance' },
  { key: 'views', label: 'Views' },
  { key: 'feedback', label: 'Feedback' },
]

export default function OrganizerEventAnalyticsPage() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const view = (searchParams.get('view') as View) ?? 'attendance'

  // the tabs stay on this event, so switching between them never leaves the page
  const setView = (next: View) => setSearchParams({ view: next }, { replace: true })

  const { data, isLoading, isError } = useEventAnalyticsQuery(id)
  const aiSummary = useEventAiSummaryQuery(id, {
    enabled: !!id && view === 'feedback' && (data?.feedback.count ?? 0) > 0,
  })

  const tabBar = (
    <div className="px-4 py-3 flex gap-2">
      {VIEWS.map(t => (
        <button
          key={t.key}
          onClick={() => setView(t.key)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors whitespace-nowrap cursor-pointer
            ${view === t.key
              ? 'bg-primary border-primary text-white'
              : 'border-border text-muted-foreground'
            }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )

  const subHeader = (title: string) => (
    <div className="bg-primary full-bleed-bar py-3 flex items-center gap-3">
      <h1 className="text-white font-bold text-base flex-1 text-center truncate">{title}</h1>
    </div>
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface">
        {subHeader('Analytics')}
        <AnalyticsTabSkeleton />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-surface">
        {subHeader('Analytics')}
        <div className="flex items-center justify-center h-40">
          <p className="text-muted-foreground text-sm">Analytics not available.</p>
        </div>
      </div>
    )
  }

  const { event, attendance, views, feedback, demographics } = data
  const totalFeedback = feedback.count

  return (
    <div className="min-h-screen bg-surface pb-10">

      {/* Sub-header shows event name */}
      {subHeader(event.name)}

      {tabBar}

      {view === 'views' && (
        <div className="mx-4 mt-4">
          <p className="text-base font-bold text-primary mb-3">Page Views</p>
          <div className="bg-card rounded-2xl shadow-sm">
            <div className="flex divide-x divide-border py-4">
              <div className="flex-1 text-center px-2">
                <p className="text-xl font-bold text-accent">{views.total_views}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Views</p>
              </div>
              <div className="flex-1 text-center px-2">
                <p className="text-xl font-bold text-accent">{views.unique_viewers}</p>
                <p className="text-xs text-muted-foreground mt-1">Unique Viewers</p>
              </div>
              <div className="flex-1 text-center px-2">
                <p className="text-xl font-bold text-accent">
                  {views.unique_viewers > 0
                    ? `${Math.round((attendance.registrations / views.unique_viewers) * 1000) / 10}%`
                    : '—'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Viewer Conversion</p>
              </div>
            </div>
          </div>
          {views.total_views === 0 && (
            <p className="text-sm text-muted-foreground text-center mt-4">No views recorded yet.</p>
          )}
        </div>
      )}

      {view === 'attendance' && (
        <div className="mx-4 mt-4 space-y-6">
          <div>
            <p className="text-base font-bold text-primary mb-3">Participant Breakdown</p>
            <div className="bg-card rounded-2xl shadow-sm">
              <div className="flex divide-x divide-border py-4">
                <div className="flex-1 text-center px-2">
                  <p className="text-xl font-bold text-accent">{attendance.registrations}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total Registrations</p>
                </div>
                <div className="flex-1 text-center px-2">
                  <p className="text-xl font-bold text-accent">{attendance.attendees}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total Attendees</p>
                </div>
                <div className="flex-1 text-center px-2">
                  <p className="text-xl font-bold text-accent">{attendance.attendance_rate}%</p>
                  <p className="text-xs text-muted-foreground mt-1">Attendance Rate</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="text-base font-bold text-primary mb-3">Demographics</p>
            {(() => {
              const d = demographics
              const isEmpty = !d ||
                (d.gender_distribution.length === 0 &&
                 d.faculty_distribution.length === 0 &&
                 d.programme_distribution.length === 0 &&
                 d.year_distribution.length === 0)
              if (isEmpty) {
                return (
                  <div className="bg-card rounded-2xl shadow-sm p-6 text-center">
                    <p className="text-sm text-muted-foreground">No demographic data available.</p>
                  </div>
                )
              }
              const DemoCard = ({ title, items }: { title: string; items: { label: string; count: number }[] }) => {
                if (items.length === 0) return null
                const max = Math.max(...items.map(i => i.count), 1)
                return (
                  <div className="bg-card rounded-2xl shadow-sm p-4 space-y-3">
                    <p className="text-sm font-bold text-foreground">{title}</p>
                    {items.map(item => (
                      <OptionBar key={item.label} label={item.label} count={item.count} max={max} />
                    ))}
                  </div>
                )
              }
              return (
                <div className="space-y-3">
                  <DemoCard title="Gender" items={d.gender_distribution.map(x => ({ label: x.gender, count: x.count }))} />
                  <DemoCard title="Faculty / School" items={d.faculty_distribution.map(x => ({ label: x.faculty, count: x.count }))} />
                  <DemoCard title="Programme" items={d.programme_distribution.map(x => ({ label: x.programme, count: x.count }))} />
                  <DemoCard title="Year of Study" items={d.year_distribution.map(x => ({ label: x.year, count: x.count }))} />
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {view === 'feedback' && (
      <div className="mx-4 mt-4">
        <p className="text-base font-bold text-primary mb-3">Feedback Breakdown</p>

        {feedback.count === 0 ? (
          <div className="bg-card rounded-2xl shadow-sm p-6 text-center">
            <p className="text-sm text-muted-foreground">No feedback submitted yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Feedback summary */}
            <div className="bg-card rounded-2xl shadow-sm">
              <div className="flex divide-x divide-border py-4">
                <div className="flex-1 text-center px-2">
                  <p className="text-xl font-bold text-accent">{feedback.count}</p>
                  <p className="text-xs text-muted-foreground mt-1">Responses</p>
                </div>
                <div className="flex-1 text-center px-2">
                  <p className="text-xl font-bold text-accent">
                    {feedback.avg_rating > 0 ? feedback.avg_rating.toFixed(1) : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Avg Rating</p>
                </div>
                <div className="flex-1 text-center px-2">
                  <p className="text-xl font-bold text-accent">{feedback.feedback_rate}%</p>
                  <p className="text-xs text-muted-foreground mt-1">Feedback Rate</p>
                </div>
              </div>
            </div>

            {/* Rating distribution */}
            <div className="bg-card rounded-2xl shadow-sm p-4">
              <p className="text-sm font-bold text-foreground mb-4">Event Ratings Breakdown</p>
              <div className="flex gap-4 items-center">
                <div className="flex flex-col items-center flex-shrink-0 w-20">
                  <p className="text-3xl font-bold text-accent">
                    {feedback.avg_rating > 0 ? feedback.avg_rating.toFixed(1) : '—'}
                  </p>
                  <div className="flex gap-0.5 mt-1">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${i <= Math.round(feedback.avg_rating) ? 'fill-accent text-accent' : 'text-border'}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{totalFeedback} Feedback</p>
                </div>
                <div className="flex-1 space-y-1.5">
                  {[5, 4, 3, 2, 1].map(star => (
                    <RatingBar
                      key={star}
                      star={star}
                      count={feedback.rating_distribution[String(star)] ?? 0}
                      total={totalFeedback}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Question breakdowns */}
            {feedback.questions.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Question Breakdown</p>
                {feedback.questions.map((q, i) => (
                  <QuestionBreakdown key={i} q={q} aiSummary={aiSummary} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      )}
    </div>
  )
}
