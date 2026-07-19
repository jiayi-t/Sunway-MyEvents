import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Info } from 'lucide-react'
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
  const [selectedFrom, setSelectedFrom] = useState('')
  const [selectedTo, setSelectedTo] = useState('')
  const [saving, setSaving] = useState(false)

  const toggle = (label: string) => {
    setSelected(prev =>
      prev.includes(label) ? prev.filter(p => p !== label) : [...prev, label]
    )
  }

  const handleNext = async () => {
    setSaving(true)
    try {
      const timeRange = (selectedFrom || selectedTo) ? { from: selectedFrom, to: selectedTo } : null
      await Promise.all([
        api.put('/auth/interests', { interests: selected }),
        api.put('/auth/time-preferences', { preferred_time_ranges: timeRange }),
      ])
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

        <div className="w-full max-w-sm">
          <div className="flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2.5 mb-4">
            <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              This step is required. Selecting your interested event categories helps Sunway MyEvents recommend relevant events for you.
            </p>
          </div>
        </div>

        <div className="w-full max-w-sm space-y-4">
          {/* Categories */}
          <div className="bg-card rounded-xl shadow p-4">
            <p className="text-sm font-semibold text-foreground mb-4">Select your interested event categories</p>
            <div className="grid grid-cols-2 gap-3">
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
          </div>

          {/* Time range */}
          <div className="bg-card rounded-xl shadow p-4">
            <p className="text-sm font-semibold text-foreground mb-4">Select your preferred event timings <span className="text-muted-foreground font-normal">(Optional)</span></p>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">From</p>
                <input
                  type="time"
                  value={selectedFrom}
                  onChange={e => setSelectedFrom(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground bg-white"
                />
              </div>
              <span className="text-muted-foreground pb-2.5">–</span>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">To</p>
                <input
                  type="time"
                  value={selectedTo}
                  onChange={e => setSelectedTo(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground bg-white"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleNext}
              disabled={saving || selected.length === 0}
              className="bg-primary text-white font-semibold px-6 py-2 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
