import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useFeedbackFormQuery, DEFAULT_QUESTIONS, type FeedbackQuestion, type QuestionType } from '../../api/queries'
import { useSaveFeedbackFormMutation } from '../../api/mutations'
import { ArrowLeft, Trash2, Star, Lock, Plus, X } from 'lucide-react'

const TYPE_LABELS: Record<QuestionType, string> = {
  rating: 'Rating',
  multiple_choice: 'Multiple Choice',
  checkboxes: 'Checkboxes',
  open_ended: 'Open-ended',
}

function LockedRatingQuestion() {
  return (
    <div className="bg-card rounded-xl p-4 shadow-sm border border-border/60">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-foreground flex-1 mr-2">
          How would you rate this event overall?
        </p>
        <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-surface px-2 py-0.5 rounded-full border border-border flex-shrink-0">
          <Lock className="w-2.5 h-2.5" /> Required
        </span>
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(s => (
          <Star key={s} className="w-7 h-7 fill-accent text-accent" />
        ))}
      </div>
    </div>
  )
}

function QuestionEditor({
  q,
  onChange,
  onDelete,
}: {
  q: FeedbackQuestion
  onChange: (updated: FeedbackQuestion) => void
  onDelete: () => void
}) {
  const hasOptions = q.type === 'multiple_choice' || q.type === 'checkboxes'

  const updateOption = (idx: number, val: string) => {
    const opts = [...(q.options ?? [])]
    opts[idx] = val
    onChange({ ...q, options: opts })
  }

  const removeOption = (idx: number) => {
    onChange({ ...q, options: (q.options ?? []).filter((_, i) => i !== idx) })
  }

  const addOption = () => {
    onChange({ ...q, options: [...(q.options ?? []), ''] })
  }

  const handleTypeChange = (newType: QuestionType) => {
    const needsOptions = newType === 'multiple_choice' || newType === 'checkboxes'
    onChange({
      ...q,
      type: newType,
      options: needsOptions ? (q.options?.length ? q.options : ['']) : undefined,
    })
  }

  return (
    <div className="bg-card rounded-xl p-4 shadow-sm border border-border/60 space-y-3">
      {/* Question + delete */}
      <div className="flex gap-2 items-start">
        <input
          type="text"
          value={q.question}
          onChange={e => onChange({ ...q, question: e.target.value })}
          placeholder="Question"
          className="flex-1 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
        />
        <button
          type="button"
          onClick={onDelete}
          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg flex-shrink-0 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Question type selector */}
      <select
        value={q.type}
        onChange={e => handleTypeChange(e.target.value as QuestionType)}
        className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
      >
        {(Object.keys(TYPE_LABELS) as QuestionType[]).map(t => (
          <option key={t} value={t}>{TYPE_LABELS[t]}</option>
        ))}
      </select>

      {/* Options (for multiple choice / checkboxes) */}
      {hasOptions && (
        <div className="space-y-2">
          {(q.options ?? []).map((opt, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <span className="w-4 h-4 rounded-full border border-border flex-shrink-0" />
              <input
                type="text"
                value={opt}
                onChange={e => updateOption(idx, e.target.value)}
                placeholder={`Option ${idx + 1}`}
                className="flex-1 border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary bg-white"
              />
              <button
                type="button"
                onClick={() => removeOption(idx)}
                className="text-muted-foreground hover:text-red-500 flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addOption}
            className="text-primary text-xs font-medium flex items-center gap-1 pl-6 mt-1"
          >
            <Plus className="w-3 h-3" /> Add option
          </button>
        </div>
      )}

      {/* Required question toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={q.required}
          onChange={e => onChange({ ...q, required: e.target.checked })}
          className="w-4 h-4 accent-primary"
        />
        <span className="text-xs text-muted-foreground">Required</span>
      </label>
    </div>
  )
}

export default function OrganizerFeedbackFormPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const isNewEvent = !id

  // state for feedback form questions
  const { data: serverData, isLoading } = useFeedbackFormQuery(id)
  const saveMutation = useSaveFeedbackFormMutation(id)
  const initialized = useRef(false)
  const initialQuestions = useRef<FeedbackQuestion[]>([])

  // state for extra questions (excluding the locked rating question)
  const [extraQuestions, setExtraQuestions] = useState<FeedbackQuestion[]>([])
  const [saveError, setSaveError] = useState('')

  // initialise extra questions
  useEffect(() => {
    if (isNewEvent) {
      if (initialized.current) return
      initialized.current = true
      const incoming: FeedbackQuestion[] = (location.state as any)?.questions ?? DEFAULT_QUESTIONS
      // exclude the locked rating question
      const extra = incoming.filter(q => q.id !== 'q_rating')
      // store the initial questions for comparison later
      initialQuestions.current = extra
      // set the extra questions state
      setExtraQuestions(extra)
    } else {
      if (!serverData || initialized.current) return
      initialized.current = true
      const extra = serverData.questions.filter(q => q.id !== 'q_rating')
      initialQuestions.current = extra
      setExtraQuestions(extra)
    }
  }, [serverData, isNewEvent])

  // button greyed out if no new changes
  const hasChanges = JSON.stringify(extraQuestions) !== JSON.stringify(initialQuestions.current)
  // button greyed out if any question is empty
  const hasEmptyQuestion = extraQuestions.some(q => !q.question.trim())

  const updateQuestion = (idx: number, updated: FeedbackQuestion) => {
    setExtraQuestions(prev => prev.map((q, i) => (i === idx ? updated : q)))
  }

  const deleteQuestion = (idx: number) => {
    setExtraQuestions(prev => prev.filter((_, i) => i !== idx))
  }

  const addQuestion = () => {
    setExtraQuestions(prev => [
      ...prev,
      { id: crypto.randomUUID(), type: 'open_ended', question: '', required: false },
    ])
  }

  const buildFullQuestions = (): FeedbackQuestion[] => [
    // locked rating question is always first
    DEFAULT_QUESTIONS[0],
    ...extraQuestions,
  ]

  const handleSave = () => {
    setSaveError('')
    const full = buildFullQuestions()

    if (isNewEvent) {
      navigate('/organizer/events?tab=new', {
        state: { ...(location.state ?? {}), questions: full },
      })
    } else {
      saveMutation.mutate(full, {
        onSuccess: () => navigate(-1),
        onError: (err: any) => setSaveError(err.response?.data?.error || 'Failed to save'),
      })
    }
  }

  const handleCancel = () => {
    if (isNewEvent) {
      navigate('/organizer/events?tab=new', { state: location.state ?? {} })
    } else {
      navigate(-1)
    }
  }

  if (!isNewEvent && isLoading) {
    return (
      <div className="bg-surface min-h-screen">
        <div className="flex items-center justify-center h-40">
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface min-h-screen">

      <div className="bg-primary px-4 py-3 flex items-center gap-3">
        <button onClick={handleCancel} className="text-white"><ArrowLeft /></button>
        <h1 className="text-white font-bold text-base flex-1 text-center">Feedback</h1>
        <div className="w-5" />
      </div>

      <div className="px-4 py-4 space-y-3 pb-8">
        {/* Locked rating question */}
        <LockedRatingQuestion />

        {/* Editable questions */}
        {extraQuestions.map((q, idx) => (
          <QuestionEditor
            key={q.id}
            q={q}
            onChange={updated => updateQuestion(idx, updated)}
            onDelete={() => deleteQuestion(idx)}
          />
        ))}

        {/* Add question */}
        <button
          type="button"
          onClick={addQuestion}
          className="w-full border border-dashed border-primary rounded-xl py-3 text-primary text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary/5"
        >
          <Plus className="w-4 h-4" /> Add Question
        </button>

        {saveError && <p className="text-red-500 text-sm">{saveError}</p>}

        {/* Cancel / Save */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleCancel}
            className="flex-1 border border-accent rounded-lg py-3 text-sm font-medium text-accent hover:bg-orange-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || hasEmptyQuestion || saveMutation.isPending}
            className="flex-1 bg-accent text-white rounded-lg py-3 text-sm font-semibold disabled:opacity-50 hover:opacity-90"
          >
            {saveMutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
