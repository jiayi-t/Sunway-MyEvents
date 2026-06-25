import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import LoginFooter from '../../components/login-footer'

const CATEGORIES = [
  'Academics',
  'Arts',
  'Cultural',
  'Entertainment',
  'Social',
  'Sports',
]

export default function SelectInterestsPage() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const toggle = (label: string) => {
    setSelected(prev =>
      prev.includes(label) ? prev.filter(p => p !== label) : [...prev, label]
    )
  }

  const handleNext = async () => {
    setSaving(true)
    try {
      await api.put('/auth/interests', { interests: selected })
    } catch {}
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <div className="px-4 py-3 text-center bg-primary">
        <span className="text-white font-bold text-lg">Sunway </span>
        <span className="font-bold text-lg text-accent">MyEvents</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="flex items-center justify-center gap-6 mb-6">
          <img
            src="/SU SC Logo.png"
            alt="Sunway University and Sunway College"
            className="h-12 w-auto object-contain"
          />
        </div>

        <h1 className="text-primary text-xl font-bold mb-6">What interests you?</h1>

        <div className="bg-white rounded-xl shadow p-6 w-full max-w-sm">
          <div className="grid grid-cols-2 gap-3 mb-6">
            {CATEGORIES.map(label => (
              <label key={label} className="flex items-center gap-2 text-sm text-foreground border border-border rounded-lg px-3 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(label)}
                  onChange={() => toggle(label)}
                  className="accent-primary"
                />
                {label}
              </label>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleNext}
              disabled={saving}
              className="bg-primary text-white font-semibold px-6 py-2 rounded-lg text-sm disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Next'}
            </button>
          </div>
        </div>
      </div>

      <LoginFooter />
    </div>
  )
}
