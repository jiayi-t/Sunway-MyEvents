import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Header from '../../components/header'
import api from '../../services/api'
import { ArrowLeft, Upload } from 'lucide-react'

const CATEGORIES = ['Academics', 'Arts', 'Cultural', 'Entertainment', 'Social', 'Sports']

const toLocalDateStr = (isoStr?: string) => {
  if (!isoStr) return ''
  return new Date(isoStr).toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' })
}

const toLocalTimeStr = (isoStr?: string) => {
  if (!isoStr) return ''
  return new Date(isoStr).toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Kuala_Lumpur',
    hour: '2-digit', minute: '2-digit', hour12: false
  })
}

const toImageUrl = (url?: string | null) => {
  if (!url) return null
  if (url.startsWith('/uploads/')) return `http://localhost:3001${url}`
  return url
}

export default function OrganizerEditEventPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [eventName, setEventName] = useState('')
  const [form, setForm] = useState({
    name: '', description: '', date: '', start_time: '', end_time: '',
    venue: '', pricing: '', category: '', capacity: '', registration_deadline: '', image_url: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    api.get(`/events/${id}`)
      .then(res => {
        const e = res.data
        setEventName(e.name)
        setForm({
          name: e.name || '',
          description: e.description || '',
          date: toLocalDateStr(e.date),
          start_time: toLocalTimeStr(e.start_time),
          end_time: toLocalTimeStr(e.end_time),
          venue: e.venue || '',
          pricing: e.pricing != null ? String(e.pricing) : '',
          category: e.category || '',
          capacity: e.capacity != null ? String(e.capacity) : '',
          registration_deadline: toLocalDateStr(e.registration_deadline),
          image_url: e.image_url || ''
        })
        setPreview(toImageUrl(e.image_url))
      })
      .catch(() => setError('Failed to load event'))
      .finally(() => setLoading(false))
  }, [id])

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
      setForm(prev => ({ ...prev, image_url: `http://localhost:3001${res.data.url}` }))
    } catch {
      setError('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async () => {
    setError('')
    if (form.start_time && form.end_time && form.start_time >= form.end_time) {
      setError('End time must be later than start time')
      return
    }
    setSaving(true)
    try {
      const startDateTime = `${form.date}T${form.start_time}:00`
      const endDateTime = `${form.date}T${form.end_time}:00`
      await api.put(`/events/${id}`, {
        name: form.name,
        description: form.description,
        date: `${form.date}T00:00:00`,
        start_time: startDateTime,
        end_time: endDateTime,
        venue: form.venue,
        pricing: Number(form.pricing) || 0,
        category: form.category,
        capacity: Number(form.capacity),
        registration_deadline: form.registration_deadline || null,
        image_url: form.image_url || null
      })
      navigate(`/organizer/events/${id}`, { replace: true })
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update event')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <p className="text-muted-foreground text-sm">Loading...</p>
    </div>
  )

  return (
    <div className="bg-surface min-h-screen">
      <Header />

      <div className="bg-primary px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-white flex-shrink-0">
          <ArrowLeft />
        </button>
        <h1 className="text-white font-bold text-sm flex-1 text-center truncate">{eventName}</h1>
        <div className="w-5 flex-shrink-0" />
      </div>

      <div className="px-4 py-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Event Name</label>
          <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Description</label>
          <textarea rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary resize-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Date</label>
          <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
            className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-foreground mb-1">Start Time</label>
            <input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-foreground mb-1">End Time</label>
            <input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Venue</label>
          <input type="text" value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })}
            className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Pricing</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">RM</span>
            <input type="number" min="0" value={form.pricing} onChange={e => setForm({ ...form, pricing: e.target.value })}
              className="w-full border border-border rounded-lg pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Category</label>
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
            className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-white">
            <option value="">Select a category</option>
            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Capacity</label>
          <div className="relative">
            <input type="number" min="1" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary pr-24" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">participants</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Registration Deadline</label>
          <input type="date" value={form.registration_deadline} onChange={e => setForm({ ...form, registration_deadline: e.target.value })}
            className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Poster</label>
          <div className="w-full border border-border rounded-lg px-3 py-6 flex flex-col items-center justify-center gap-3">
            {preview ? (
              <>
                <img src={preview} alt="poster preview" className="max-h-56 object-contain rounded" />
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 text-xs font-medium rounded-md border border-border text-foreground hover:bg-surface">
                  {uploading ? 'Uploading...' : 'Reupload'}
                </button>
              </>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-2 text-muted-foreground">
                <Upload className="text-3xl" />
                <span className="text-xs">{uploading ? 'Uploading...' : 'Upload poster'}</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex gap-3 pb-6">
          <button onClick={() => navigate(-1)}
            className="flex-1 border border-border rounded-lg py-3 text-sm font-medium text-foreground">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving || uploading}
            className="flex-1 bg-accent text-white rounded-lg py-3 text-sm font-semibold disabled:opacity-50">
            {saving ? 'Saving...' : 'Edit Event'}
          </button>
        </div>
      </div>
    </div>
  )
}
