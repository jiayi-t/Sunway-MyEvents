import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/header'
import { useFeaturedEventsQuery, useRecommendationsQuery } from '../../api/queries'
import { useAuth } from '../../context/auth-context'
import { Calendar, Users, Search, Clock, MapPin, ChevronLeft, ChevronRight, ImageOff } from 'lucide-react'

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

const formatDateTime = (value?: string, options?: Intl.DateTimeFormatOptions): string => {
  if (!value) return 'TBA'
  return new Date(value).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', ...options })
}

const formatDate = (date?: string) =>
  formatDateTime(date, { day: 'numeric', month: 'long', year: 'numeric' })

const formatTime = (time?: string) =>
  formatDateTime(time, { hour: 'numeric', minute: '2-digit', hour12: true })

const formatTimeRange = (start?: string, end?: string) =>
  start && end ? `${formatTime(start)} - ${formatTime(end)}` : 'Time TBA'

const toImageUrl = (url?: string) => url ?? ''

export default function HomePage() {
  const [search, setSearch] = useState('')
  const [featuredIndex, setFeaturedIndex] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: featuredData, isLoading } = useFeaturedEventsQuery()
  const featuredEvents = (featuredData ?? []) as Event[]
  const featured = featuredEvents[featuredIndex]

  const { data: recommendationsData, isLoading: recLoading } = useRecommendationsQuery(!!user)
  const recommendations = (recommendationsData ?? []) as Event[]

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
    if (Math.abs(diff) > 40) diff > 0 ? nextFeatured() : prevFeatured()
    touchStartX.current = null
  }

  useEffect(() => {
    if (featuredEvents.length <= 1) return
    const id = setInterval(() => {
      setFeaturedIndex(i => (i === featuredEvents.length - 1 ? 0 : i + 1))
    }, 5000)
    return () => clearInterval(id)
  }, [featuredEvents.length])

  const handleBrowse = () => {
    const params = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ''
    navigate(`/browse${params}`)
  }

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
              <Search className="w-4 h-4 text-gray-400 mr-3" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search events"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search.trim() && handleBrowse()}
                className="flex-1 bg-transparent text-sm placeholder-gray-400 focus:outline-none"
                aria-label="Search events"
              />
              <button
                onClick={handleBrowse}
                disabled={!search.trim()}
                className="ml-3 bg-accent text-white px-4 py-2 rounded-full text-sm font-semibold shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Search
              </button>
            </div>
          </div>

          <div className="flex gap-4 text-xs text-blue-200 justify-center">
            <span className="inline-flex items-center gap-2">
              <Calendar className="w-4 h-4 text-accent" aria-hidden="true" />
              <span>20+ events monthly</span>
            </span>
            <span className="inline-flex items-center gap-2">
              <Users className="w-4 h-4 text-accent" aria-hidden="true" />
              <span>100+ SLBs/C&S</span>
            </span>
          </div>
        </div>
      </div>

      {/* Featured Events */}
      <div className="px-10 pt-3 pb-10 bg-primary text-white">
        <h2 className="font-bold text-white mb-2 text-center">Featured Events</h2>

        {isLoading ? (
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
                  {featured.image_url
                    ? <img 
                        src={toImageUrl(featured.image_url)} 
                        alt={featured.name} 
                        className="absolute inset-0 w-full h-full object-cover object-center" 
                      />
                    : <div className="absolute inset-0 bg-surface flex items-center justify-center"><ImageOff className="w-8 h-8 text-border" /></div>
                  }
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="bg-orange-500 text-white text-[10px] px-2 py-1 rounded-full">
                      {featured.category || 'General'}
                    </span>
                    <span className="bg-orange-500 text-white text-[10px] px-2 py-1 rounded-full">
                      {Number(featured.pricing) === 0 ? 'Free' : 'Paid'}
                    </span>
                  </div>
                </div>

                <div className="bg-white p-4">
                  <h3 className="font-bold text-foreground text-lg leading-tight mb-1 line-clamp-2 min-h-[2.8rem]">
                    {featured.name}
                  </h3>
                  <p className="text-accent text-xs mb-2">
                    {featured.organizer_name ?? 'Organizer'}
                  </p>
                  <div className="flex flex-col gap-2 text-muted-foreground text-sm">
                    <div className="inline-flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-black flex-shrink-0" />
                      <span>{formatDate(featured.date)}</span>
                    </div>
                    <div className="inline-flex items-center gap-2">
                      <Clock className="w-4 h-4 text-black flex-shrink-0" />
                      <span>{formatTimeRange(featured.start_time, featured.end_time)}</span>
                    </div>
                    <div className="inline-flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-black flex-shrink-0" />
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
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); nextFeatured() }}
                    className="absolute -right-9 top-[38%] -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center z-20"
                    aria-label="Next event"
                  >
                    <ChevronRight className="w-3 h-3" />
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
          <p className="text-blue-100 text-sm text-center">No upcoming events</p>
        )}
      </div>

      {/* For You */}
      <div className="px-4 pt-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-primary text-lg">For You</h2>
          <button
            onClick={() => navigate('/browse')}
            className="bg-accent text-white text-xs font-semibold px-3 py-1.5 rounded-full"
          >
            Browse All Events
          </button>
        </div>
        {recLoading ? (
          <p className="text-muted-foreground text-sm">Loading recommendations...</p>
        ) : recommendations.length === 0 ? (
          <p className="text-muted-foreground text-sm">No recommendations yet, explore events to get personalised suggestions.</p>
        ) : (
          <div className="space-y-3">
            {recommendations.map(event => (
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
                    ? <img 
                        src={toImageUrl(event.image_url)} 
                        alt={event.name} 
                        className="w-full h-full object-cover object-center" 
                      />
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
            ))}
          </div>
        )}
      </div>
    </div>
  )
}