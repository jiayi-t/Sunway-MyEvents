import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEventQuery, useMyRegistrationsQuery, useMyFeedbackQuery, useFeedbackFormQuery, type FeedbackQuestion } from '../../api/queries'
import { useSubmitFeedbackMutation } from '../../api/mutations'
import { FormSkeleton } from '../../components/skeletons'
import { Check, Star } from 'lucide-react'

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="cursor-pointer"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
        >
          <Star
            className={`w-9 h-9 transition-colors ${
              star <= (hover || value) ? 'fill-accent text-accent' : 'text-border'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

function QuestionCard({ q, answer, onChange }: {
  q: FeedbackQuestion
  answer: unknown
  onChange: (val: unknown) => void
}) {
  return (
    <div className="bg-card rounded-xl p-4 shadow-sm space-y-3">
      <p className="text-sm font-semibold text-foreground">
        {q.question}
        {q.required && <span className="text-red-500 ml-1">*</span>}
      </p>

      {q.type === 'rating' && (
        <StarPicker value={Number(answer) || 0} onChange={onChange} />
      )}

      {q.type === 'multiple_choice' && (
        <div className="flex flex-col gap-2">
          {(q.options ?? []).map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                answer === opt
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border bg-white text-foreground'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {q.type === 'checkboxes' && (
        <div className="flex flex-col gap-2">
          {(q.options ?? []).map(opt => {
            const selected = Array.isArray(answer) && answer.includes(opt)
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  const current = Array.isArray(answer) ? answer : []
                  onChange(selected ? current.filter(v => v !== opt) : [...current, opt])
                }}
                className={`w-full text-left text-sm px-3 py-2 rounded-lg border flex items-center gap-2 transition-colors cursor-pointer ${
                  selected
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border bg-white text-foreground'
                }`}
              >
                <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                  selected ? 'bg-primary border-primary' : 'border-border'
                }`}>
                  {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </span>
                {opt}
              </button>
            )
          })}
        </div>
      )}

      {q.type === 'open_ended' && (
        <textarea
          rows={3}
          value={String(answer ?? '')}
          onChange={e => onChange(e.target.value)}
          placeholder="Type your answer here..."
          className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none bg-white"
        />
      )}
    </div>
  )
}

export default function StudentFeedbackPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: event, isLoading: eventLoading } = useEventQuery(id)
  const { data: formData, isLoading: formLoading } = useFeedbackFormQuery(id)
  const { data: myFeedbackData } = useMyFeedbackQuery()
  const { data: myRegistrations } = useMyRegistrationsQuery()
  const submitMutation = useSubmitFeedbackMutation(id)

  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [submitError, setSubmitError] = useState('')

  const questions: FeedbackQuestion[] = formData?.questions ?? []
  const alreadySubmitted = (myFeedbackData ?? []).some(f => f.event_id === Number(id))
  const myReg = (myRegistrations as any[] | undefined ?? []).find((r: any) => r.event_id === Number(id))
  const checkedIn = !!myReg?.checked_in_at

  const isLoading = eventLoading || formLoading

  const setAnswer = (qId: string, val: unknown) => {
    setAnswers(prev => ({ ...prev, [qId]: val }))
  }

  const handleSubmit = () => {
    setSubmitError('')

    // rate event question is always first and required
    const rating = Number(answers['q_rating']) || 0
    if (!rating) {
      setSubmitError('Please give a star rating.')
      return
    }

    // check that all required questions are answered
    for (const q of questions) {
      if (!q.required) continue
      if (q.id === 'q_rating') continue
      const a = answers[q.id]
      const isEmpty = !a || (Array.isArray(a) && a.length === 0) || (typeof a === 'string' && !a.trim())
      if (isEmpty) {
        setSubmitError(`Please answer: "${q.question}"`)
        return
      }
    }

    // submit answers excluding the rating question because it's already sent separately
    const { q_rating: _r, ...otherAnswers } = answers
    submitMutation.mutate(
      { rating, answers: otherAnswers },
      { onSuccess: () => navigate('/my-events?tab=past', { replace: true }) }
    )
  }

  if (isLoading) {
    return (
      <div className="bg-surface min-h-screen">
        <div className="bg-primary px-4 py-3 flex items-center gap-3">
          <h1 className="text-white font-bold text-base flex-1 text-center">Feedback</h1>
        </div>
        <div className="px-4 py-4">
          <FormSkeleton sections={2} />
        </div>
      </div>
    )
  }

  const eventData = event as { name: string; organizer_name: string; date: string } | undefined

  if (alreadySubmitted) {
    return (
      <div className="bg-surface min-h-screen">
        <div className="bg-primary px-4 py-3 flex items-center gap-3">
          <h1 className="text-white font-bold text-base flex-1 text-center">Feedback</h1>
        </div>
        <div className="flex flex-col items-center justify-center h-40 gap-3 px-6">
          <Star className="w-10 h-10 fill-accent text-accent" />
          <p className="text-foreground font-semibold text-center">You've already submitted feedback for this event.</p>
          <button onClick={() => navigate(-1)} className="text-primary text-sm font-medium cursor-pointer">Go back</button>
        </div>
      </div>
    )
  }

  if (!checkedIn) {
    return (
      <div className="bg-surface min-h-screen">
        <div className="bg-primary px-4 py-3 flex items-center gap-3">
          <h1 className="text-white font-bold text-base flex-1 text-center">Feedback</h1>
        </div>
        <div className="flex flex-col items-center justify-center h-40 gap-3 px-6">
          <p className="text-foreground font-semibold text-center">You must check in to the event before submitting feedback.</p>
          <button onClick={() => navigate(-1)} className="text-primary text-sm font-medium cursor-pointer">Go back</button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface min-h-screen">

      <div className="bg-primary px-4 py-3 flex items-center gap-3">
        <h1 className="text-white font-bold text-base flex-1 text-center">Feedback</h1>
      </div>

      <div className="px-4 py-4 space-y-4 pb-8">
        {/* Event info */}
        <div>
          <h2 className="font-bold text-foreground text-base leading-tight">{eventData?.name}</h2>
          <p className="text-accent text-sm mt-0.5">{eventData?.organizer_name}</p>
        </div>

        {/* Questions */}
        {questions.map(q => (
          <QuestionCard
            key={q.id}
            q={q}
            answer={answers[q.id]}
            onChange={val => setAnswer(q.id, val)}
          />
        ))}

        {submitError && <p className="text-red-500 text-sm">{submitError}</p>}
        {submitMutation.isError && !submitError && (
          <p className="text-red-500 text-sm">
            {(submitMutation.error as any)?.response?.data?.error || 'Submission failed. Please try again.'}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitMutation.isPending}
          className="w-full bg-accent text-white rounded-full py-3 text-sm font-semibold disabled:opacity-50 cursor-pointer"
        >
          {submitMutation.isPending ? 'Submitting…' : 'Submit Feedback'}
        </button>
      </div>
    </div>
  )
}
