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

export default function SelectPreferencesPage() {
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
      await api.put('/auth/preferences', { preferences: selected })
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
