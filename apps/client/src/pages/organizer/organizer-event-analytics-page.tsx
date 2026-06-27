import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Header from '../../components/header'
import { ArrowLeft, Star } from 'lucide-react'
import { useEventAnalyticsQuery, type QuestionAnalysis } from '../../api/queries'

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

function QuestionBreakdown({ q }: { q: QuestionAnalysis }) {
  if (q.type === 'open_ended') {
    const responses = q.responses as string[]
    return (
      <div className="bg-card rounded-2xl p-4 shadow-sm space-y-3">
        <p className="text-sm font-semibold text-foreground">{q.question}</p>
        {responses.length === 0 ? (
          <p className="text-xs text-muted-foreground">No responses.</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {responses.map((r, i) => (
              <p key={i} className="text-xs text-muted-foreground bg-surface rounded-lg px-3 py-2">
                {r}
              </p>
            ))}
          </div>
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

export default function OrganizerEventAnalyticsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const view = searchParams.get('view') ?? 'attendance'

  const { data, isLoading, isError } = useEventAnalyticsQuery(id)

  const subHeader = (title: string) => (
    <div className="bg-primary px-4 py-3 flex items-center gap-3">
      <button onClick={() => navigate(-1)} className="text-white"><ArrowLeft /></button>
      <h1 className="text-white font-bold text-base flex-1 text-center truncate">{title}</h1>
      <div className="w-5" />
    </div>
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface">
        <Header />
        {subHeader('Analytics')}
        <div className="flex items-center justify-center h-40">
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-surface">
        <Header />
        {subHeader('Analytics')}
        <div className="flex items-center justify-center h-40">
          <p className="text-muted-foreground text-sm">Analytics not available.</p>
        </div>
      </div>
    )
  }

  const { event, attendance, feedback, demographics } = data
  const totalFeedback = feedback.count

  return (
    <div className="min-h-screen bg-surface pb-10">
      <Header />

      {/* Sub-header shows event name */}
      {subHeader(event.name)}

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
      <div className="mx-4 mt-6">
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
                  <QuestionBreakdown key={i} q={q} />
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
