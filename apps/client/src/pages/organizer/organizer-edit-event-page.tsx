import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../services/api'
import { useEventQuery } from '../../api/queries'
import { useUpdateEventMutation } from '../../api/mutations'
import { FormSkeleton } from '../../components/skeletons'
import { ChevronRight, Upload, ClipboardPen } from 'lucide-react'

interface Event {
  name: string
  description: string
  date: string
  start_time: string
  end_time: string
  venue: string
  pricing: number | null
  category: string
  audience: string
  capacity: number | null
  registered_count: number
  registration_deadline: string | null
  image_url: string | null
}

const CATEGORIES = ['Academics', 'Arts', 'Cultural', 'Entertainment', 'Social', 'Sports']

const toLocalDateStr = (isoStr?: string | null) => {
  if (!isoStr) return ''
  return new Date(isoStr).toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' })
}

const toLocalTimeStr = (isoStr?: string | null) => {
  if (!isoStr) return ''
  return new Date(isoStr).toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Kuala_Lumpur',
    hour: '2-digit', minute: '2-digit', hour12: false
  })
}

const toImageUrl = (url?: string | null) => {
  if (!url) return null
  if (url.startsWith('/uploads/')) return url
  return url
}

const EMPTY_FORM = {
  name: '', description: '', date: '', start_time: '', end_time: '',
  venue: '', pricing: '', category: '', audience: 'everyone', capacity: '', registration_deadline: '', image_url: ''
}

export default function OrganizerEditEventPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [eventName, setEventName] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [showNotifyModal, setShowNotifyModal] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const initialized = useRef(false)
  const initialForm = useRef(EMPTY_FORM)

  const { data, isLoading, isError } = useEventQuery(id)
  const updateMutation = useUpdateEventMutation(id)

  const hasChanges = Object.keys(form).some(
    k => form[k as keyof typeof form] !== initialForm.current[k as keyof typeof form]
  )

  // Populate form once when event data first arrives
  useEffect(() => {
    if (!data || initialized.current) return
    initialized.current = true
    const e = data as Event
    const initial = {
      name: e.name || '',
      description: e.description || '',
      date: toLocalDateStr(e.date),
      start_time: toLocalTimeStr(e.start_time),
      end_time: toLocalTimeStr(e.end_time),
      venue: e.venue || '',
      pricing: e.pricing != null ? String(e.pricing) : '',
      category: e.category || '',
      audience: e.audience || 'everyone',
      capacity: e.capacity != null ? String(e.capacity) : '',
      registration_deadline: toLocalDateStr(e.registration_deadline),
      image_url: e.image_url || ''
    }
    setEventName(e.name)
    initialForm.current = initial
    setForm(initial)
    setPreview(toImageUrl(e.image_url))
  }, [data])

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
    } catch {
      setUploadError('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = () => {
    setUploadError('')
    setSubmitted(true)
    if (!form.name || !form.date || !form.start_time || !form.end_time || !form.venue || form.pricing === '' || !form.category || !form.image_url) {
      setUploadError('Please fill in all required fields')
      return
    }
    if (form.start_time && form.end_time && form.start_time >= form.end_time) {
      setUploadError('End time must be later than start time')
      return
    }
    if (form.capacity && Number(form.capacity) === 0) {
      setUploadError('Event capacity cannot be 0. Leave blank for unlimited capacity.')
      return
    }
    const capacity = form.capacity ? Number(form.capacity) : null
    if (capacity !== null && capacity < (data as Event)?.registered_count) {
      setUploadError(`Capacity cannot be less than current number of registrations (${(data as Event)?.registered_count})`)
      return
    }
    setShowNotifyModal(true)
  }

  const submitWithNotify = (notify: boolean) => {
    setShowNotifyModal(false)
    const startDateTime = `${form.date}T${form.start_time}:00`
    const endDateTime = `${form.date}T${form.end_time}:00`
    updateMutation.mutate({
      name: form.name,
      description: form.description,
      date: `${form.date}T00:00:00`,
      start_time: startDateTime,
      end_time: endDateTime,
      venue: form.venue,
      pricing: Number(form.pricing) || 0,
      category: form.category,
      audience: form.audience,
      capacity: form.capacity ? Number(form.capacity) : null,
      registration_deadline: form.registration_deadline ? `${form.registration_deadline}T23:59:59+08:00` : null,
      image_url: form.image_url || null,
      notify_participants: notify,
    }, {
      onSuccess: () => navigate(`/organizer/events/${id}`, { replace: true }),
      onError: (err: any) => setUploadError(err.response?.data?.error || 'Failed to update event'),
    })
  }

  if (isLoading) return (
    <div className="min-h-screen bg-surface">
      <div className="bg-primary px-4 py-3 flex items-center gap-3">
        <h1 className="text-white font-bold text-base flex-1 text-center">Edit Event</h1>
      </div>
      <div className="px-4 py-4">
        <FormSkeleton sections={3} />
      </div>
    </div>
  )

  if (isError) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <p className="text-muted-foreground text-sm">Failed to load event</p>
    </div>
  )

  return (
    <div className="bg-surface min-h-screen">

      <div className="bg-primary px-4 py-3 flex items-center gap-3">
        <h1 className="text-white font-bold text-base flex-1 text-center truncate">{eventName}</h1>
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
            className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-white ${submitted && !form.date ? 'border-red-400' : 'border-border'}`} />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-foreground mb-1">Start Time</label>
            <input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })}
              onClick={e => e.currentTarget.showPicker?.()}
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-white cursor-pointer ${submitted && !form.start_time ? 'border-red-400' : 'border-border'}`} />
          </div>
          <div className="flex-1">
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
            className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-white" />
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
          onClick={() => navigate(`/organizer/events/${id}/feedback-form`)}
          className="w-full border border-primary rounded-lg py-2.5 text-sm font-medium text-primary flex items-center justify-between px-4 hover:bg-primary/5 cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <ClipboardPen className="w-4 h-4" />
            Customize feedback questions
          </span>
          <ChevronRight className="w-4 h-4" />
        </button>

        {uploadError && <p className="text-red-500 text-sm">{uploadError}</p>}

        <div className="flex gap-3 pb-6">
          <button onClick={() => navigate(-1)}
            className="flex-1 border border-accent rounded-lg py-3 text-sm font-medium text-accent hover:bg-orange-50 cursor-pointer">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={!hasChanges || updateMutation.isPending || uploading}
            className="flex-1 bg-accent text-white rounded-lg py-3 text-sm font-semibold disabled:opacity-50 hover:opacity-90 cursor-pointer">
            {updateMutation.isPending ? 'Saving...' : 'Edit Event'}
          </button>
        </div>
      </div>

      {showNotifyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 pb-8 px-4">
          <div className="bg-card rounded-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div>
              <h2 className="text-base font-bold text-foreground">Notify attendees?</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Do you want to notify registered participants about these changes?
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => submitWithNotify(true)}
                disabled={updateMutation.isPending}
                className="w-full bg-accent text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50 cursor-pointer">
                Yes, notify them
              </button>
              <button
                onClick={() => submitWithNotify(false)}
                disabled={updateMutation.isPending}
                className="w-full border border-border rounded-xl py-3 text-sm font-medium text-foreground cursor-pointer">
                No, save quietly
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
