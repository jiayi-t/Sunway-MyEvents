import { useState, useRef, useEffect, type HTMLAttributes } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useFeedbackFormQuery, DEFAULT_QUESTIONS, type FeedbackQuestion, type QuestionType } from '../../api/queries'
import { useSaveFeedbackFormMutation } from '../../api/mutations'
import { Trash2, Star, Lock, Plus, X, GripVertical } from 'lucide-react'

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
  gripProps,
  isDragging,
}: {
  q: FeedbackQuestion
  onChange: (updated: FeedbackQuestion) => void
  onDelete: () => void
  gripProps?: HTMLAttributes<HTMLDivElement>
  isDragging?: boolean
}) {
  const hasOptions = q.type === 'multiple_choice' || q.type === 'checkboxes'

  // startY is the initial pointer Y position when dragging starts
  const optionDragStateRef = useRef<{ index: number; startY: number; targetIndex: number } | null>(null)
  const optionRowRefs = useRef<(HTMLDivElement | null)[]>([])
  // deltaY is the current pointer Y position relative to startY, targetIndex is the index where the dragged option would be dropped
  const [optionActiveDrag, setOptionActiveDrag] = useState<{ index: number; deltaY: number; targetIndex: number } | null>(null)

  // decides how much each option row should shift visually when dragging an option
  const getOptionTransformY = (optIdx: number): number => {
    // if no option is being dragged, no shift is needed
    if (!optionActiveDrag) return 0
    const { index: dragIdx, deltaY, targetIndex } = optionActiveDrag
    // the dragged option itself should follow the pointer movement
    if (optIdx === dragIdx) return deltaY
    // space-y-2
    const gap = 8
    // the height of the dragged option + the gap between options
    const draggedHeight = (optionRowRefs.current[dragIdx]?.offsetHeight ?? 0) + gap
    // if the dragged option is moving down and this option is between the original and target positions, it should shift up
    if (dragIdx < targetIndex && optIdx > dragIdx && optIdx <= targetIndex) return -draggedHeight
    // if the dragged option is moving up and this option is between the original and target positions, it should shift down
    if (dragIdx > targetIndex && optIdx >= targetIndex && optIdx < dragIdx) return draggedHeight
    // otherwise, no shift is needed
    return 0
  }

  // reorders the options array when an option is dropped in a new position
  const reorderOptions = (from: number, to: number) => {
    const opts = [...(q.options ?? [])]
    // splice removes the option at index 'from' and returns it, then inserts it at index 'to'
    const [moved] = opts.splice(from, 1)
    opts.splice(to, 0, moved)
    onChange({ ...q, options: opts })
  }

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

  if (isDragging) {
    return (
      <div className="bg-card rounded-xl shadow-sm border border-border/60 overflow-hidden">
        <div className="flex justify-center py-1">
          <div
            className="w-8 h-5 flex items-center justify-center cursor-grabbing select-none"
            style={{ touchAction: 'none' }}
            {...gripProps}
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
        <div className="px-4 pb-3">
          <p className="text-sm text-foreground font-medium truncate">
            {q.question || <span className="text-muted-foreground italic">Untitled question</span>}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border/60 overflow-hidden">
      {/* Drag handle */}
      {gripProps && (
        <div className="flex justify-center py-1">
          <div
            className="w-8 h-5 flex items-center justify-center cursor-grab select-none"
            style={{ touchAction: 'none' }}
            {...gripProps}
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      )}
  
      <div className="px-4 pb-4 space-y-3" style={{ paddingTop: gripProps ? '0' : '1rem' }}> 
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
              <div
                key={idx}
                ref={el => { optionRowRefs.current[idx] = el }}
                style={{
                  transform: getOptionTransformY(idx) !== 0 ? `translateY(${getOptionTransformY(idx)}px)` : undefined,
                  position: 'relative',
                  // controls which option is visually on top when dragging, so the dragged option appears above others
                  // gives the dragged option a 10 z-index, while others remain at 0
                  zIndex: optionActiveDrag?.index === idx ? 10 : 0,
                }}
                className={`flex gap-2 items-center rounded-lg ${optionActiveDrag?.index === idx ? 'shadow-md opacity-90' : optionActiveDrag ? 'transition-transform duration-200' : ''}`}
              >
                <GripVertical
                  className="w-3.5 h-3.5 text-muted-foreground cursor-grab flex-shrink-0"
                  style={{ touchAction: 'none' }}
                  onPointerDown={e => {
                    e.preventDefault()
                    e.currentTarget.setPointerCapture(e.pointerId)
                    // e.clientY is the cursor's Y position in pixels from the top of the browser window at the moment the pointerdown event is fired
                    optionDragStateRef.current = { index: idx, startY: e.clientY, targetIndex: idx }
                    setOptionActiveDrag({ index: idx, deltaY: 0, targetIndex: idx })
                  }}
                  onPointerMove={e => {
                    if (!optionDragStateRef.current || optionDragStateRef.current.index !== idx) return
                    const deltaY = e.clientY - optionDragStateRef.current.startY
                    let newTarget = idx
                    for (let i = 0; i < optionRowRefs.current.length; i++) {
                      if (i === idx) continue
                      const el = optionRowRefs.current[i]
                      if (!el) continue
                      // getBoundingClientRect() returns the size of an element and its position relative to the viewport
                      const rect = el.getBoundingClientRect()
                      // mid is the vertical midpoint of the option row, used to determine if the dragged option has crossed over it
                      const mid = rect.top + rect.height / 2
                      if (i < idx && e.clientY < mid) { newTarget = i; break }
                      if (i > idx && e.clientY > mid) newTarget = i
                    }
                    optionDragStateRef.current.targetIndex = newTarget
                    setOptionActiveDrag({ index: idx, deltaY, targetIndex: newTarget })
                  }}
                  onPointerUp={() => {
                    if (!optionDragStateRef.current) return
                    const { index, targetIndex } = optionDragStateRef.current
                    optionDragStateRef.current = null
                    if (targetIndex !== index) reorderOptions(index, targetIndex)
                    setOptionActiveDrag(null)
                  }}
                />
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
  const dragStateRef = useRef<{ index: number; startY: number; targetIndex: number } | null>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const [activeDrag, setActiveDrag] = useState<{ index: number; deltaY: number; targetIndex: number } | null>(null)

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

  const reorderQuestions = (from: number, to: number) =>
    setExtraQuestions(prev => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })

  const getCardTransformY = (cardIdx: number): number => {
    if (!activeDrag) return 0
    const { index: dragIdx, deltaY, targetIndex } = activeDrag
    if (cardIdx === dragIdx) return deltaY
    // space-y-3
    const gap = 12 
    const draggedHeight = (cardRefs.current[dragIdx]?.offsetHeight ?? 0) + gap
    if (dragIdx < targetIndex && cardIdx > dragIdx && cardIdx <= targetIndex) return -draggedHeight
    if (dragIdx > targetIndex && cardIdx >= targetIndex && cardIdx < dragIdx) return draggedHeight
    return 0
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
        <h1 className="text-white font-bold text-base flex-1 text-center">Feedback</h1>
      </div>

      <div className="px-4 py-4 space-y-3 pb-8">
        {/* Locked rating question */}
        <LockedRatingQuestion />

        {/* Editable questions */}
        {extraQuestions.map((q, idx) => (
          <div
            key={q.id}
            ref={el => { cardRefs.current[idx] = el }}
            style={{ transform: getCardTransformY(idx) !== 0 ? `translateY(${getCardTransformY(idx)}px)` : undefined, position: 'relative', zIndex: activeDrag?.index === idx ? 10 : 0 }}
            className={`rounded-xl ${activeDrag?.index === idx ? 'shadow-lg opacity-90' : activeDrag ? 'transition-transform duration-200' : ''}`}
          >
            <QuestionEditor
              q={q}
              onChange={updated => updateQuestion(idx, updated)}
              onDelete={() => deleteQuestion(idx)}
              isDragging={activeDrag?.index === idx}
              gripProps={{
                onPointerDown: e => {
                  e.preventDefault()
                  e.currentTarget.setPointerCapture(e.pointerId)
                  dragStateRef.current = { index: idx, startY: e.clientY, targetIndex: idx }
                  setActiveDrag({ index: idx, deltaY: 0, targetIndex: idx })
                },
                onPointerMove: e => {
                  if (!dragStateRef.current || dragStateRef.current.index !== idx) return
                  const deltaY = e.clientY - dragStateRef.current.startY
                  let newTarget = idx
                  for (let i = 0; i < cardRefs.current.length; i++) {
                    if (i === idx) continue
                    const el = cardRefs.current[i]
                    if (!el) continue
                    const rect = el.getBoundingClientRect()
                    const mid = rect.top + rect.height / 2
                    if (i < idx && e.clientY < mid) { newTarget = i; break }
                    if (i > idx && e.clientY > mid) newTarget = i
                  }
                  dragStateRef.current.targetIndex = newTarget
                  setActiveDrag({ index: idx, deltaY, targetIndex: newTarget })
                },
                onPointerUp: () => {
                  if (!dragStateRef.current) return
                  const { index, targetIndex } = dragStateRef.current
                  dragStateRef.current = null
                  if (targetIndex !== index) reorderQuestions(index, targetIndex)
                  setActiveDrag(null)
                },
              }}
            />
          </div>
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
