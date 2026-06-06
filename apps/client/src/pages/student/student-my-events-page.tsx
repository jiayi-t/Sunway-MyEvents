import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Header from '../../components/header'
import { FaArrowLeft } from 'react-icons/fa'

type Tab = 'upcoming' | 'past' | 'saved'

export default function MyEventsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<Tab>(
    (searchParams.get('tab') as Tab) || 'upcoming'
  )

  const getTabFromQuery = (): Tab => {
    const tab = searchParams.get('tab')
    if (tab === 'upcoming' || tab === 'past' || tab === 'saved') return tab
    return 'upcoming' 
  }

  useEffect(() => { setActiveTab(getTabFromQuery()) }, [searchParams])

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  return (
    <div className="min-h-screen bg-surface">
      <Header />
      <div className="bg-primary px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/profile')} className="text-white">
          <FaArrowLeft />
        </button>
        <h1 className="text-white font-bold text-base flex-1 text-center">My Events</h1>
        <div className="w-5" />
      </div>

      {/* Tabs */}
      <div className="bg-card px-4 py-3 flex gap-2">
        {(['upcoming', 'past', 'saved'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors
              ${activeTab === tab ? 'bg-primary text-white' : 'text-muted-foreground'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Placeholder content */}
      <div className="px-4 py-8 text-center">
        <p className="text-muted-foreground text-sm">
          {activeTab === 'upcoming' ? 'No upcoming events yet.'
            : activeTab === 'past' ? 'No past events yet.'
            : 'No saved events yet.'}
        </p>
        {activeTab === 'upcoming' && (
          <button
            onClick={() => navigate('/')}
            className="mt-3 bg-accent text-white px-4 py-2 rounded-full text-sm font-semibold"
          >
            Browse Events
          </button>
        )}
      </div>
    </div>
  )
}