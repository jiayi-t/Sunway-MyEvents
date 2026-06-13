import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/header'
import api from '../../services/api'

const CATEGORIES = [
  'Academics',
  'Arts',
  'Cultural',
  'Entertainment',
  'Social',
  'Sports',
]

export default function MyPreferencesPage() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/auth/preferences')
      .then(res => setSelected(res.data.preferences || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const toggle = (label: string) => {
    setSelected(prev =>
      prev.includes(label) ? prev.filter(p => p !== label) : [...prev, label]
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/auth/preferences', { preferences: selected })
      navigate('/')
    } catch {
      setSaving(false)
    }
  }

  return (
    <div className="bg-surface">
      <Header />

      <div className="flex-1 px-6 py-6">
        <h1 className="text-primary text-xl font-bold mb-4">My Preferences</h1>

        {loading ? (
          <p className="text-muted-foreground text-sm text-center mt-8">Loading...</p>
        ) : (
          <div className="bg-white rounded-xl shadow p-4">
            <div className="grid grid-cols-2 gap-3 mb-6">
              {CATEGORIES.map(label => {
                const isSelected = selected.includes(label)
                return (
                  <button
                    key={label}
                    onClick={() => toggle(label)}
                    className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all
                      ${isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-gray-300 bg-white text-gray-700'
                      }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => navigate(-1)}
                className="px-5 py-2 rounded-lg border border-accent text-accent text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
