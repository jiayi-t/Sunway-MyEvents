import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useEventQuery, useEventParticipantsQuery } from '../../api/queries'
import { useManualCheckinMutation } from '../../api/mutations'
import { ListRowsSkeleton } from '../../components/skeletons'
import { Search, TicketCheck } from 'lucide-react'

type FilterTab = 'all' | 'registered' | 'checked-in'

interface OrganizerEvent {
  id: number
  name: string
  capacity: number
}

interface Participant {
  id: number
  user_id: number
  user_name: string
  sunway_id: string
  email: string
  role: string
  image_url: string | null
  registered_at: string
  checked_in_at: string | null
}

const formatCheckinTime = (value?: string | null) => {
  if (!value) return ''
  return new Date(value).toLocaleTimeString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', hour: 'numeric', minute: '2-digit', hour12: true })
}

const formatCheckinDate = (value?: string | null) => {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', day: 'numeric', month: 'short' })
}

export default function OrganizerParticipantsPage() {
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const [confirmTarget, setConfirmTarget] = useState<Participant | null>(null)
  const [checkinError, setCheckinError] = useState('')

  const { data: eventData } = useEventQuery(id)
  const event = eventData as OrganizerEvent | undefined
  const { data, isLoading } = useEventParticipantsQuery(id)
  const participants = (data || []) as Participant[]

  const manualCheckinMutation = useManualCheckinMutation(id)

  const handleManualCheckin = () => {
    if (!confirmTarget) return
    setCheckinError('')
    manualCheckinMutation.mutate(confirmTarget.id, {
      onSuccess: () => setConfirmTarget(null),
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Check-in failed'
        setCheckinError(msg)
      },
    })
  }

  const checkedInCount = participants.filter(p => p.checked_in_at).length

  const filtered = participants.filter(p => {
    if (activeTab === 'registered' && p.checked_in_at) return false
    if (activeTab === 'checked-in' && !p.checked_in_at) return false
    if (search) {
      const q = search.toLowerCase()
      return p.user_name.toLowerCase().includes(q) || (p.sunway_id ?? '').toLowerCase().includes(q) || (p.email ?? '').toLowerCase().includes(q)
    }
    return true
  })

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: participants.length },
    { key: 'registered', label: 'Pending', count: participants.length - checkedInCount },
    { key: 'checked-in', label: 'Checked In', count: checkedInCount },
  ]

  return (
    <div className="bg-surface">

      {/* Sub-header */}
      <div className="bg-primary px-4 py-3 flex items-center gap-3">
        <h1 className="text-white font-bold text-base flex-1 text-center">Participants</h1>
      </div>

      {/* Event name + summary */}
      <div className="bg-card px-4 py-4">
        <p className="text-foreground font-bold text-lg leading-snug">
          {event?.name ?? '...'}
        </p>
        <p className="text-accent font-bold text-base mt-1">
          {checkedInCount} / {event?.capacity || participants.length} Checked In
        </p>
      </div>

      {/* Search bar */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 bg-card rounded-full px-3 py-2 border border-border">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            placeholder="Search by name, student ID, or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="bg-card px-4 py-3 flex gap-2">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer
              ${activeTab === tab.key ? 'bg-primary text-white' : 'text-muted-foreground'}`}
          >
            {tab.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-surface text-muted-foreground'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Participant list */}
      <div className="px-4 py-2 space-y-2">
        {isLoading ? (
          <ListRowsSkeleton />
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No participants found</p>
        ) : (
          filtered.map(p => (
            <div key={p.id} className="bg-card rounded-xl px-4 py-3 flex items-center gap-3">
              {p.image_url ? (
                <img
                  src={p.image_url ?? ''}
                  alt={p.user_name}
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">
                    {p.user_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-foreground text-sm font-semibold truncate">{p.user_name}</p>
                <p className="text-muted-foreground text-xs truncate">{p.email}</p>
              </div>
              {p.checked_in_at ? (
                <div className="flex items-center gap-1.5 text-green-600 flex-shrink-0">
                  <TicketCheck className="w-4 h-4" />
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-medium">{formatCheckinTime(p.checked_in_at)}</span>
                    <span className="text-[10px]">{formatCheckinDate(p.checked_in_at)}</span>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setCheckinError(''); setConfirmTarget(p) }}
                  className="flex-shrink-0 text-xs font-semibold text-accent border border-accent rounded-full px-3 py-1.5 hover:bg-accent hover:text-white transition-colors cursor-pointer"
                >
                  Check In
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Manual check-in confirmation modal */}
      {confirmTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-foreground text-base mb-3">Check In Participant?</h3>
            <div className="flex items-center gap-3 bg-surface rounded-xl px-3 py-2.5 mb-3">
              {confirmTarget.image_url ? (
                <img
                  src={confirmTarget.image_url}
                  alt={confirmTarget.user_name}
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-card flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">
                    {confirmTarget.user_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-foreground text-sm font-semibold truncate">{confirmTarget.user_name}</p>
                <p className="text-muted-foreground text-xs truncate">{confirmTarget.email}</p>
              </div>
            </div>
            <p className="text-muted-foreground text-sm mb-5">This participant will be marked as checked in.</p>
            {checkinError && (
              <p className="text-red-500 text-sm mb-4">{checkinError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmTarget(null)}
                className="flex-1 border border-border rounded-lg py-2.5 text-sm font-medium text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleManualCheckin}
                disabled={manualCheckinMutation.isPending}
                className="flex-1 bg-accent text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50 cursor-pointer"
              >
                {manualCheckinMutation.isPending ? 'Processing...' : 'Check In'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
