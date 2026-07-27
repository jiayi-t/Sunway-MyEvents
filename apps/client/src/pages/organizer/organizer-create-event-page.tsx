import { useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../../services/api'
import { type FeedbackQuestion } from '../../api/queries'
import { useCreateEventMutation } from '../../api/mutations'
import { ChevronRight, Upload, ClipboardPen } from 'lucide-react'

const CATEGORIES = ['Academics', 'Arts', 'Cultural', 'Entertainment', 'Social', 'Sports']

const EMPTY_FORM = {
  name: '', description: '', date: '', start_time: '', end_time: '',
  venue: '', pricing: '', category: '', audience: 'everyone', capacity: '', registration_deadline: '', image_url: ''
}

export default function OrganizerCreateEventPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  // restore form state when returning from the feedback form editor
  const locationState = (location.state ?? {}) as {
    form?: typeof EMPTY_FORM
    preview?: string | null
    questions?: FeedbackQuestion[]
  }

  const [form, setForm] = useState(locationState.form ?? EMPTY_FORM)
  const [customQuestions, setCustomQuestions] = useState<FeedbackQuestion[] | null>(
    locationState.questions ?? null
  )

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [preview, setPreview] = useState<string | null>(locationState.preview ?? null)
  const [uploading, setUploading] = useState(false)

  const createMutation = useCreateEventMutation()

  const handleSubmit = () => {
    setError('')
    setSubmitted(true)
    if (!form.name || !form.date || !form.start_time || !form.end_time || !form.venue || form.pricing === '' || !form.category || !form.image_url) {
      setError('Please fill in all required fields')
      return
    }
    if (form.start_time && form.end_time && form.start_time >= form.end_time) {
      setError('End time must be later than start time')
      return
    }
    if (form.registration_deadline && form.date && form.registration_deadline > form.date) {
      setError('Registration deadline cannot be after the event date')
      return
    }
    if (form.capacity && Number(form.capacity) === 0) {
      setError('Event capacity cannot be 0. Leave blank for unlimited capacity.')
      return
    }
    const eventDate = `${form.date}T00:00:00+08:00`
    const startDateTime = `${form.date}T${form.start_time}:00+08:00`
    const endDateTime = `${form.date}T${form.end_time}:00+08:00`

    createMutation.mutate({
      name: form.name,
      description: form.description,
      date: eventDate,
      start_time: startDateTime,
      end_time: endDateTime,
      venue: form.venue,
      pricing: Number(form.pricing) || 0,
      category: form.category,
      audience: form.audience,
      capacity: form.capacity ? Number(form.capacity) : null,
      registration_deadline: form.registration_deadline ? `${form.registration_deadline}T23:59:59+08:00` : null,
      image_url: form.image_url || null
    }, {
      onSuccess: (newEvent: any) => {
        if (customQuestions) {
          api.put(`/events/${newEvent.id}/feedback-form`, { questions: customQuestions }).catch(() => {})
        }
        setCustomQuestions(null)
        const targetTab = new Date(endDateTime) < new Date() ? 'past' : 'upcoming'
        navigate(`/organizer/events?tab=${targetTab}`, { replace: true })
      },
      onError: (err: any) => setError(err.response?.data?.error || 'Failed to create event'),
    })
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setPreview(String(reader.result))
    reader.readAsDataURL(file)
    try {
      setUploading(true)
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post('/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setForm(prev => ({ ...prev, image_url: res.data.url }))
    } catch (err: any) {
      setError(err.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  // Create Event Form
  return (
    <div className="bg-surface">
      <div className="bg-primary px-4 py-3 flex items-center gap-3">
        <h1 className="text-white font-bold text-base flex-1 text-center">New Event</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Event Name</label>
          <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-white ${submitted && !form.name ? 'border-red-400' : 'border-border'}`} />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Description <span className="text-muted-foreground font-normal">(Optional)</span></label>
          <textarea rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary resize-none bg-white" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Date</label>
          <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
            onClick={e => e.currentTarget.showPicker?.()}
            min={new Date().toISOString().split('T')[0]}
            className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-white cursor-pointer ${submitted && !form.date ? 'border-red-400' : 'border-border'}`} />
        </div>
        <div className="flex gap-3">
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium text-foreground mb-1">Start Time</label>
            <input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })}
              onClick={e => e.currentTarget.showPicker?.()}
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-white cursor-pointer ${submitted && !form.start_time ? 'border-red-400' : 'border-border'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium text-foreground mb-1">End Time</label>
            <input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })}
              onClick={e => e.currentTarget.showPicker?.()}
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-white cursor-pointer ${submitted && !form.end_time ? 'border-red-400' : 'border-border'}`} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Venue</label>
          <input type="text" value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })}
            className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-white ${submitted && !form.venue ? 'border-red-400' : 'border-border'}`} />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Pricing</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">RM</span>
            <input type="number" min="0" value={form.pricing} onWheel={e => e.currentTarget.blur()} onChange={e => setForm({ ...form, pricing: e.target.value })}
              className={`w-full border rounded-lg pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-white ${submitted && form.pricing === '' ? 'border-red-400' : 'border-border'}`} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Category</label>
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
            className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-white ${submitted && !form.category ? 'border-red-400' : 'border-border'}`}>
            <option value="">Select a category</option>
            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Audience</label>
          <select value={form.audience} onChange={e => setForm({ ...form, audience: e.target.value })}
            className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-white">
            <option value="everyone">Open to Public</option>
            <option value="students_only">Students Only</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Capacity <span className="text-muted-foreground font-normal">(Optional)</span></label>
          <div className="relative">
            <input type="number" min="1" value={form.capacity} onWheel={e => e.currentTarget.blur()} onChange={e => setForm({ ...form, capacity: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary pr-24 bg-white" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">participants</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Registration Deadline <span className="text-muted-foreground font-normal">(Optional)</span></label>
          <input type="date" value={form.registration_deadline} onChange={e => setForm({ ...form, registration_deadline: e.target.value })}
            onClick={e => e.currentTarget.showPicker?.()}
            max={form.date}
            className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-white cursor-pointer" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Poster</label>
          <div className={`w-full border rounded-lg px-3 py-6 flex flex-col items-center justify-center gap-3 bg-white ${submitted && !form.image_url ? 'border-red-400' : 'border-border'}`}>
            {preview ? (
              <>
                <img src={preview} alt="poster preview" className="max-h-56 object-contain rounded" />
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 text-xs font-medium rounded-md border border-accent text-accent hover:bg-orange-50 cursor-pointer">
                  {uploading ? 'Uploading...' : 'Reupload'}
                </button>
              </>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-2 text-muted-foreground cursor-pointer">
                <Upload className="text-3xl" />
                <span className="text-xs">{uploading ? 'Uploading...' : 'Upload poster'}</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleFileChange} />
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/organizer/feedback-form/new', {
            state: { form, preview, questions: customQuestions ?? undefined }
          })}
          className="w-full border border-primary rounded-lg py-2.5 text-sm font-medium text-primary flex items-center justify-between px-4 hover:bg-primary/5 cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <ClipboardPen className="w-4 h-4" />
            Customize feedback questions
          </span>
          <ChevronRight className="w-4 h-4" />
        </button>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex gap-3 pb-6">
          <button onClick={() => navigate('/organizer/dashboard')}
            className="flex-1 border border-accent rounded-lg py-3 text-sm font-medium text-accent hover:bg-orange-50 cursor-pointer">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={createMutation.isPending || uploading}
            className="flex-1 bg-accent text-white rounded-lg py-3 text-sm font-semibold disabled:opacity-50 hover:opacity-90 cursor-pointer">
            {createMutation.isPending ? 'Creating...' : 'Create Event'}
          </button>
        </div>
      </div>
    </div>
  )
}
