import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Header from '../../components/header'
import { useEventsQuery, useRecommendationsQuery } from '../../api/queries'
import { useAuth } from '../../context/auth-context'
import { ArrowLeft, Calendar, Clock, ImageOff, MapPin, Search } from 'lucide-react'

interface Event {
  id: number
  name: string
  date: string
  start_time: string
  end_time: string
  venue: string
  category: string
  pricing: number
  image_url: string
  organizer_name?: string
  cancelled_at?: string | null
}

const CATEGORIES = ['All Events', 'For You', 'Academics', 'Arts', ' Cultural', 'Entertainment', 'Social', 'Sports']

const formatDateTime = (value?: string, options?: Intl.DateTimeFormatOptions): string => {
  if (!value) return 'TBA'
  return new Date(value).toLocaleString('en-MY', { 
    timeZone: 'Asia/Kuala_Lumpur', 
    ...options 
  })
}

const formatDate = (date?: string) =>
  formatDateTime(date, { day: 'numeric', month: 'long', year: 'numeric' })

const formatTime = (time?: string) =>
  formatDateTime(time, { hour: 'numeric', minute: '2-digit', hour12: true })

const formatTimeRange = (start?: string, end?: string) =>
  start && end ? `${formatTime(start)} - ${formatTime(end)}` : 'Time TBA'

const toImageUrl = (url?: string) => url ?? ''

export default function BrowseEventsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  const [activeCategory, setActiveCategory] = useState('All Events')
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [searchApplied, setSearchApplied] = useState(!!searchParams.get('q'))

  const { data: eventsData, isLoading: loading } = useEventsQuery()
  const events = (eventsData ?? []) as Event[]

  const isForYouActive = activeCategory === 'For You' && !searchApplied
  const { data: recommendationsData, isLoading: recLoading } = useRecommendationsQuery(isForYouActive && !!user)
  const recommendations = (recommendationsData ?? []) as Event[]

  const isLoading = loading || (isForYouActive && recLoading)

  const filtered = useMemo(() => {
    if (searchApplied) {
      return events.filter(e =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.venue?.toLowerCase().includes(search.toLowerCase())
      )
    }
    if (activeCategory === 'All Events') return events
    if (activeCategory === 'For You') return recommendations
    return events.filter(e => e.category?.toLowerCase() === activeCategory.toLowerCase())
  }, [events, activeCategory, recommendations, search, searchApplied])

  const handleCategoryFilter = (cat: string) => {
    setActiveCategory(cat)
    setSearchApplied(false)
    setSearch('')
  }

  const handleSearch = () => 
    setSearchApplied(true)

  const handleClearSearch = () => {
    setSearch('')
    setSearchApplied(false)
  }

  return (
    <div className="bg-surface">
      <Header />

      <div className="bg-primary px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-white">
          <ArrowLeft />
        </button>
        <h1 className="text-white font-bold text-base flex-1 text-center">Browse Events</h1>
        <div className="w-5" />
      </div>

      {/* Search */}
      <div className="bg-surface px-4 py-3">
        <div className="flex items-center bg-white rounded-full shadow border border-border px-3 py-2">
          <Search className="w-4 h-4 text-gray-400 mr-3 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search events"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search.trim() && handleSearch()}
            className="flex-1 bg-transparent text-sm placeholder-gray-400 focus:outline-none"
          />
          {searchApplied ? (
            <button
              onClick={handleClearSearch}
              className="ml-3 bg-accent text-white px-4 py-1.5 rounded-full text-sm font-semibold"
            >
              Clear
            </button>
          ) : (
            <button
              onClick={handleSearch}
              disabled={!search.trim()}
              className="ml-3 bg-accent text-white px-4 py-1.5 rounded-full text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Search
            </button>
          )}
        </div>
      </div>

      {/* Category Filters */}
      <div className="px-4 py-3 bg-card overflow-x-auto">
        <div className="flex gap-2 w-max">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => handleCategoryFilter(cat)}
              className={`px-3 py-1 rounded-full text-sm font-medium border border-primary whitespace-nowrap transition-colors
                ${activeCategory === cat && !searchApplied
                  ? 'bg-primary text-white'
                  : 'bg-white text-primary'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <div className="px-4 py-3 space-y-3">
        {isLoading ? (
          <p className="text-muted-foreground text-sm text-center mt-8">Loading events...</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center mt-8">No events found.</p>
        ) : (
          filtered.map(event => (
            <div
              key={event.id}
              onClick={() => navigate(`/events/${event.id}`)}
              className="bg-card rounded-xl shadow flex gap-3 p-3 cursor-pointer hover:shadow-md transition items-center"
            >
              <div
                className="flex-shrink-0 overflow-hidden rounded-lg self-center"
                style={{ width: '100px', aspectRatio: '4/5' }}
              >
                {event.image_url
                  ? <img src={toImageUrl(event.image_url)} alt={event.name} className="w-full h-full object-cover object-center" />
                  : <div className="w-full h-full bg-surface flex items-center justify-center"><ImageOff className="w-6 h-6 text-border" /></div>
                }
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-bold text-foreground text-sm leading-tight line-clamp-2">{event.name}</h3>
                  {event.cancelled_at && (
                    <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">CANCELLED</span>
                  )}
                </div>
                <p className="text-accent text-xs mt-0.5">{event.organizer_name ?? 'Organizer'}</p>

                <div className="text-muted-foreground text-xs mt-1.5 flex flex-col gap-1">
                  <div className="inline-flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-black flex-shrink-0" />
                    <span>{formatDate(event.date)}</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-black flex-shrink-0" />
                    <span>{formatTimeRange(event.start_time, event.end_time)}</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-black flex-shrink-0" />
                    <span className="truncate">{event.venue}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {event.category && (
                    <span className="bg-primary text-white text-[10px] px-2 py-0.5 rounded-full">{event.category}</span>
                  )}
                  <span className="bg-primary text-white text-[10px] px-2 py-0.5 rounded-full">
                    {Number(event.pricing) === 0 ? 'Free' : 'Paid'}
                  </span>
                </div>
              </div>

              <span className="text-muted-foreground self-center flex-shrink-0">›</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
