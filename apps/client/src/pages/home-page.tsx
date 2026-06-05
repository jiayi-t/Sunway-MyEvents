import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/header'
import api from '../services/api'
import { FaRegCalendarAlt, FaUsers, FaSearch, FaClock, FaMapMarkerAlt, FaChevronLeft, FaChevronRight } from 'react-icons/fa'

interface Event {
  id: number
  name: string
  description: string
  date: string
  start_time: string
  end_time: string
  venue: string
  category: string
  pricing: number
  image_url: string
  organizer_id: number
  organizer_name?: string
}

const CATEGORIES = ['All Events', 'For You', 'Academics', 'Arts', ' Cultural', 'Entertainment', 'Social', 'Sports']

const formatDateTime = (value?: string, options?: Intl.DateTimeFormatOptions): string => {
  if (!value) return 'TBA'
  return new Date(value).toLocaleString('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    ...options,
  })
}

const formatDate = (date?: string) =>
  formatDateTime(date, { day: 'numeric', month: 'long', year: 'numeric' })

const formatTime = (time?: string) =>
  formatDateTime(time, { hour: 'numeric', minute: '2-digit', hour12: true })

const formatTimeRange = (start?: string, end?: string) =>
  start && end ? `${formatTime(start)} - ${formatTime(end)}` : 'Time TBA'

const toImageUrl = (url?: string) => {
  if (!url) return ''

  // Server uploaded files
  if (url.startsWith('/uploads/')) {
    return `http://localhost:3001${url}`
  }

  // Public folder assets (seeded data) 
  return url
}

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([])
  const [filtered, setFiltered] = useState<Event[]>([])
  const [activeCategory, setActiveCategory] = useState('All Events')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [featuredIndex, setFeaturedIndex] = useState(0)
  const [searchApplied, setSearchApplied] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const navigate = useNavigate()

  // Up to 5 events as featured
  const featuredEvents = events.slice(0, 5)

  useEffect(() => {
    api.get('/events')
      .then(res => {
        setEvents(res.data)
        setFiltered(res.data)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleCategoryFilter = (cat: string) => {
    setActiveCategory(cat)
    if (cat === 'All Events' || cat === 'For You') {
      setFiltered(events)
    } else {
      setFiltered(events.filter(e => e.category?.toLowerCase() === cat.toLowerCase()))
    }
  }

  const handleSearch = () => {
    const results = events.filter(e =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.venue?.toLowerCase().includes(search.toLowerCase())
    )
    setFiltered(results)
    setSearchApplied(true)
  }

  const handleClearSearch = () => {
    setSearch('')
    setFiltered(events)
    setSearchApplied(false)
  }

  const prevFeatured = () =>
    setFeaturedIndex(i => (i === 0 ? featuredEvents.length - 1 : i - 1))

  const nextFeatured = () =>
    setFeaturedIndex(i => (i === featuredEvents.length - 1 ? 0 : i + 1))

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 40) {
      diff > 0 ? nextFeatured() : prevFeatured()
    }
    touchStartX.current = null
  }

  const featured = featuredEvents[featuredIndex]

  useEffect(() => {
    if (searchApplied || featuredEvents.length <= 1) return
    const id = setInterval(() => {
      setFeaturedIndex(i => (i === featuredEvents.length - 1 ? 0 : i + 1))
    }, 5000)
    return () => clearInterval(id)
  }, [featuredEvents.length, searchApplied])

  return (
    <div className="bg-surface">
      <Header />

      {/* Hero Section */}
      <div className="bg-primary px-4 pt-4 pb-3">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-white font-bold text-xl mb-3">
            Explore <span className="text-accent">#TheMostHappeningCampus</span>
          </h1>

          <div className="mb-2">
            <div className="w-full max-w-3xl mx-auto flex items-center bg-white rounded-full shadow px-3 py-2">
              <FaSearch className="w-4 h-4 text-gray-400 mr-3" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search events"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="flex-1 bg-transparent text-sm placeholder-gray-400 focus:outline-none"
                aria-label="Search events"
              />
              <button
                onClick={searchApplied ? handleClearSearch : handleSearch}
                className="ml-3 bg-accent text-white px-4 py-2 rounded-full text-sm font-semibold shadow-sm"
              >
                {searchApplied ? 'Clear' : 'Browse'}
              </button>
            </div>
          </div>

          <div className="flex gap-4 text-xs text-blue-200 justify-center">
            <span className="inline-flex items-center gap-2">
              <FaRegCalendarAlt className="w-4 h-4 text-accent" aria-hidden="true" />
              <span>20+ events monthly</span>
            </span>
            <span className="inline-flex items-center gap-2">
              <FaUsers className="w-4 h-4 text-accent" aria-hidden="true" />
              <span>100+ SLBs/C&S</span>
            </span>
          </div>
        </div>
      </div>

      {/* Featured Events */}
      {!searchApplied && (
        <div className="px-10 pt-3 pb-10 bg-primary text-white">
          <h2 className="font-bold text-white mb-2 text-center">Featured Events</h2>

          {loading ? (
            <p className="text-blue-100 text-sm text-center">Loading events...</p>
          ) : featuredEvents.length > 0 && featured ? (
            <div className="max-w-3xl mx-auto">
              <div
                className="relative select-none"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                <div
                  onClick={() => navigate(`/events/${featured.id}`)}
                  className="cursor-pointer rounded-xl overflow-hidden shadow-md bg-white"
                >
                  <div className="relative w-full" style={{ aspectRatio: '4/5' }}>
                    <img
                      src={toImageUrl(featured.image_url)}
                      alt={featured.name}
                      className="absolute inset-0 w-full h-full object-cover object-center"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="bg-orange-500 text-white text-[10px] px-2 py-1 rounded-full">
                        {featured.category || 'General'}
                      </span>
                      <span className="bg-orange-500 text-white text-[10px] px-2 py-1 rounded-full">
                        {featured.pricing === 0 ? 'Free' : 'Paid'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white p-4">
                    <h3 className="font-bold text-foreground text-lg leading-tight mb-1">
                      {featured.name}
                    </h3>
                    <p className="text-accent text-xs mb-2">
                      {featured.organizer_name ?? 'Organizer'}
                    </p>
                    <div className="flex flex-col gap-2 text-muted-foreground text-sm">
                      <div className="inline-flex items-center gap-2">
                        <FaRegCalendarAlt className="w-4 h-4 text-black flex-shrink-0" />
                        <span>{formatDate(featured.date)}</span>
                      </div>
                      <div className="inline-flex items-center gap-2">
                        <FaClock className="w-4 h-4 text-black flex-shrink-0" />
                        <span>{formatTimeRange(featured.start_time, featured.end_time)}</span>
                      </div>
                      <div className="inline-flex items-center gap-2">
                        <FaMapMarkerAlt className="w-4 h-4 text-black flex-shrink-0" />
                        <span>{featured.venue}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {featuredEvents.length > 1 && (
                  <>
                    <button
                      onClick={e => { e.stopPropagation(); prevFeatured() }}
                      className="absolute -left-9 top-[38%] -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center z-20"
                      aria-label="Previous event"
                    >
                      <FaChevronLeft className="w-3 h-3" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); nextFeatured() }}
                      className="absolute -right-9 top-[38%] -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center z-20"
                      aria-label="Next event"
                    >
                      <FaChevronRight className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>

              {featuredEvents.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-3">
                  {featuredEvents.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setFeaturedIndex(i)}
                      className={`rounded-full transition-all ${
                        i === featuredIndex
                          ? 'bg-white w-4 h-2'
                          : 'bg-white/40 w-2 h-2'
                      }`}
                      aria-label={`Go to event ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-blue-100 text-sm text-center">No events yet</p>
          )}
        </div>
      )}

      {/* Category Filters */}
      <div className="px-4 py-3 bg-card mt-2 overflow-x-auto">
        <div className="flex gap-2 w-max">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => handleCategoryFilter(cat)}
              className={`px-3 py-1 rounded-full text-sm font-medium border border-primary whitespace-nowrap transition-colors
                ${activeCategory === cat
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
        {filtered.map(event => (
          <div
            key={event.id}
            onClick={() => navigate(`/events/${event.id}`)}
            className="bg-card rounded-xl shadow flex gap-3 p-3 cursor-pointer hover:shadow-md transition items-center"
          >
            <div
              className="flex-shrink-0 overflow-hidden rounded-lg self-center"
              style={{ width: '100px', aspectRatio: '4/5' }}
            >
              <img
                src={toImageUrl(event.image_url)}
                alt={event.name}
                className="w-full h-full object-cover object-center"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-foreground text-sm leading-tight line-clamp-2">{event.name}</h3>
              <p className="text-accent text-xs mt-0.5">{event.organizer_name ?? 'Organizer'}</p>

              <div className="text-muted-foreground text-xs mt-1.5 flex flex-col gap-1">
                <div className="inline-flex items-center gap-1.5">
                  <FaRegCalendarAlt className="w-3 h-3 text-black flex-shrink-0" />
                  <span>{formatDate(event.date)}</span>
                </div>
                <div className="inline-flex items-center gap-1.5">
                  <FaClock className="w-3 h-3 text-black flex-shrink-0" />
                  <span>{formatTimeRange(event.start_time, event.end_time)}</span>
                </div>
                <div className="inline-flex items-center gap-1.5">
                  <FaMapMarkerAlt className="w-3 h-3 text-black flex-shrink-0" />
                  <span className="truncate">{event.venue}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-2">
                {event.category && (
                  <span className="bg-primary text-white text-[10px] px-2 py-0.5 rounded-full">
                    {event.category}
                  </span>
                )}
                {event.pricing === 0 ? (
                  <span className="bg-primary text-white text-[10px] px-2 py-0.5 rounded-full">
                    Free
                  </span>
                ) : (
                  <span className="bg-primary text-white text-[10px] px-2 py-0.5 rounded-full">
                    Paid
                  </span>
                )}
              </div>
            </div>

            <span className="text-muted-foreground self-center flex-shrink-0">›</span>
          </div>
        ))}
      </div>
    </div>
  )
}