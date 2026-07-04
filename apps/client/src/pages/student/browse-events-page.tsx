import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useEventsQuery, useRecommendationsQuery } from '../../api/queries'
import { useAuth } from '../../context/auth-context'
import { Calendar, Clock, ImageOff, MapPin, Search, SlidersHorizontal, X } from 'lucide-react'

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

const EVENT_CATEGORIES = ['Academics', 'Arts', 'Cultural', 'Entertainment', 'Social', 'Sports']
const CATEGORIES = ['All Events', 'For You', ...EVENT_CATEGORIES]

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

interface Filters {
  categories: string[]
  dateFrom: string
  dateTo: string
  upcoming: boolean
  past: boolean
  free: boolean
  paid: boolean
}

const EMPTY_FILTERS: Filters = { categories: [], dateFrom: '', dateTo: '', upcoming: false, past: false, free: false, paid: false }

function filtersActive(f: Filters) {
  return f.categories.length > 0 || !!f.dateFrom || !!f.dateTo || f.upcoming || f.past || f.free || f.paid
}

export default function BrowseEventsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  const [activeCategory, setActiveCategory] = useState('All Events')
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [filterOpen, setFilterOpen] = useState(false)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [draftFilters, setDraftFilters] = useState<Filters>(EMPTY_FILTERS)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterOpen && panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
        setDraftFilters(filters)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [filterOpen, filters])

  const { data: eventsData, isLoading: loading } = useEventsQuery()
  const events = (eventsData ?? []) as Event[]

  const isForYouActive = activeCategory === 'For You' && !search.trim()
  const { data: recommendationsData, isLoading: recLoading } = useRecommendationsQuery(isForYouActive && !!user)
  const recommendations = (recommendationsData ?? []) as Event[]

  const isLoading = loading || (isForYouActive && recLoading)

  const filtered = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let base: Event[]
    if (search.trim()) {
      base = events.filter(e =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.venue?.toLowerCase().includes(search.toLowerCase())
      )
    } else if (activeCategory === 'All Events') {
      base = events
    } else if (activeCategory === 'For You') {
      base = recommendations
    } else {
      base = events.filter(e => e.category?.toLowerCase() === activeCategory.toLowerCase())
    }

    if (!filtersActive(filters)) return base

    return base.filter(e => {
      const eventDate = new Date(e.date)
      eventDate.setHours(0, 0, 0, 0)

      if (filters.upcoming && !filters.past && eventDate < today) return false
      if (filters.past && !filters.upcoming && eventDate >= today) return false

      if (filters.dateFrom) {
        const from = new Date(filters.dateFrom)
        from.setHours(0, 0, 0, 0)
        if (eventDate < from) return false
      }
      if (filters.dateTo) {
        const to = new Date(filters.dateTo)
        to.setHours(0, 0, 0, 0)
        if (eventDate > to) return false
      }

      if (filters.categories.length > 0 && !filters.categories.includes(e.category)) return false

      const isFree = Number(e.pricing) === 0
      if (filters.free && !filters.paid && !isFree) return false
      if (filters.paid && !filters.free && isFree) return false

      return true
    })
  }, [events, activeCategory, recommendations, search, filters])

  const handleCategoryFilter = (cat: string) => {
    setActiveCategory(cat)
    setSearch('')
  }

  const handleClearSearch = () => setSearch('')

  const toggleDraftCategory = (cat: string) =>
    setDraftFilters(f => ({
      ...f,
      categories: f.categories.includes(cat) ? f.categories.filter(c => c !== cat) : [...f.categories, cat],
    }))

  const applyFilters = () => {
    setFilters(draftFilters)
    setFilterOpen(false)
  }

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS)
    setDraftFilters(EMPTY_FILTERS)
    setFilterOpen(false)
  }

  return (
    <div className="bg-surface">

      <div className="bg-primary px-4 py-3 flex items-center gap-3">
        <h1 className="text-white font-bold text-base flex-1 text-center">Browse Events</h1>
      </div>

      {/* Search */}
      <div className="bg-surface px-4 py-3 relative">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center bg-white rounded-full shadow border border-border px-3 py-2">
            <Search className="w-4 h-4 text-gray-400 mr-3 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search events"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm placeholder-gray-400 focus:outline-none"
            />
            <button
              onClick={handleClearSearch}
              className={`ml-3 bg-accent text-white px-4 py-1.5 rounded-full text-sm font-semibold ${!search ? 'invisible' : ''}`}
            >
              Clear
            </button>
          </div>
          <button
            onClick={() => { setDraftFilters(filters); setFilterOpen(o => !o) }}
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow border transition-colors ${
              filtersActive(filters) ? 'bg-primary border-primary text-white' : 'bg-white border-border text-gray-500'
            }`}
            aria-label="Open filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Filter panel */}
        {filterOpen && (
          <div
            ref={panelRef}
            className="absolute left-4 right-4 top-full mt-1 bg-white rounded-2xl shadow-xl border border-border z-30 p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-foreground text-sm">Filters</span>
              <button onClick={() => { setFilterOpen(false); setDraftFilters(filters) }}>
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Timing */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Timing</p>
            <div className="flex gap-4 mb-4">
              {(['upcoming', 'past'] as const).map(key => (
                <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={draftFilters[key]}
                    onChange={() => setDraftFilters(f => ({ ...f, [key]: !f[key] }))}
                    className="w-4 h-4 accent-primary rounded"
                  />
                  <span className="text-sm capitalize text-foreground">{key}</span>
                </label>
              ))}
            </div>

            {/* Date range */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Date range</p>
            <div className="flex items-center gap-2 mb-4">
              <input
                type="date"
                value={draftFilters.dateFrom}
                onChange={e => setDraftFilters(f => ({ ...f, dateFrom: e.target.value }))}
                className="flex-1 text-sm border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-muted-foreground text-xs">to</span>
              <input
                type="date"
                value={draftFilters.dateTo}
                min={draftFilters.dateFrom || undefined}
                onChange={e => setDraftFilters(f => ({ ...f, dateTo: e.target.value }))}
                className="flex-1 text-sm border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Pricing */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Pricing</p>
            <div className="flex gap-4 mb-4">
              {(['free', 'paid'] as const).map(key => (
                <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={draftFilters[key]}
                    onChange={() => setDraftFilters(f => ({ ...f, [key]: !f[key] }))}
                    className="w-4 h-4 accent-primary rounded"
                  />
                  <span className="text-sm capitalize text-foreground">{key}</span>
                </label>
              ))}
            </div>

            {/* Categories */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Category</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
              {EVENT_CATEGORIES.map(cat => (
                <label key={cat} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={draftFilters.categories.includes(cat)}
                    onChange={() => toggleDraftCategory(cat)}
                    className="w-4 h-4 accent-primary rounded"
                  />
                  <span className="text-sm text-foreground">{cat}</span>
                </label>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={clearFilters}
                className="flex-1 py-2 rounded-full border border-border text-sm font-semibold text-muted-foreground"
              >
                Clear all
              </button>
              <button
                onClick={applyFilters}
                className="flex-1 py-2 rounded-full bg-accent text-white text-sm font-semibold"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Category Filters */}
      <div className="px-4 py-3 bg-card overflow-x-auto">
        <div className="flex gap-2 w-max">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => handleCategoryFilter(cat)}
              className={`px-3 py-1 rounded-full text-sm font-medium border border-primary whitespace-nowrap transition-colors
                ${activeCategory === cat && !search.trim()
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
