import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFeaturedEventsQuery } from '../../api/queries'
import { FeaturedEventSkeleton } from '../../components/skeletons'
import MonthlyCalendar from '../../components/monthly-calendar'
import { categoryPillStyle, audiencePillClass, pricingPillClass } from '../../utils/event-colors.utils'
import { Calendar, Users, Search, Clock, MapPin, ChevronLeft, ChevronRight, ImageOff } from 'lucide-react'

interface Event {
  id: number
  name: string
  date: string
  start_time: string
  end_time: string
  venue: string
  category: string
  audience: string
  pricing: number
  capacity: number | null
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
  const [autoScroll, setAutoScroll] = useState(true)

  const touchStartX = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const navigate = useNavigate()

  // pause auto-scroll and resume after 15 seconds
  const pauseAutoScroll = () => {
    setAutoScroll(false)

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      setAutoScroll(true)
    // resume after 15 seconds
    }, 15000) 
  }

  const { data: featuredData, isLoading } = useFeaturedEventsQuery()
  const featuredEvents = (featuredData ?? []) as Event[]
  const featured = featuredEvents[featuredIndex]
  const getFeaturedAt = (offset: number) => {
    if (featuredEvents.length === 0) return undefined
    const idx = (featuredIndex + offset + featuredEvents.length) % featuredEvents.length
    return featuredEvents[idx]
  }

  const prevFeatured = () => {
    pauseAutoScroll()
    setFeaturedIndex(i => (i === 0 ? featuredEvents.length - 1 : i - 1))
  }

  const nextFeatured = () => {
    pauseAutoScroll()
    setFeaturedIndex(i => (i === featuredEvents.length - 1 ? 0 : i + 1))
  }

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

  // auto-scroll effect, pauses when user interacts
  useEffect(() => {
    if (!autoScroll || featuredEvents.length <= 1) return
    const id = setInterval(() => {
      setFeaturedIndex(i => (i === featuredEvents.length - 1 ? 0 : i + 1))
    }, 5000)
    return () => clearInterval(id)
  }, [featuredEvents.length, autoScroll])

  // cleanup pause timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const handleBrowse = () => {
    const params = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ''
    navigate(`/browse${params}`)
  }

  return (
    <div className="bg-surface">

      <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-primary text-white lg:min-h-[calc(100vh-3.5rem)]">
        {/* Hero Section */}
        <div className="px-4 pt-4 pb-3 lg:pt-3 lg:pb-2">
          <div className="max-w-3xl lg:max-w-5xl mx-auto text-center">
          <h1 className="text-white font-bold text-xl mb-3 lg:mb-2">
            Explore <span className="text-accent">#TheMostHappeningCampus</span>
          </h1>

          <div className="mb-2 lg:mb-1">
            <div className="w-full max-w-3xl lg:max-w-5xl mx-auto flex items-center bg-white rounded-full shadow px-3 py-2">
              <Search className="w-4 h-4 text-gray-400 mr-3 flex-shrink-0" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search events"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search.trim() && handleBrowse()}
                className="flex-1 min-w-0 bg-transparent text-sm text-foreground placeholder-gray-400 focus:outline-none"
                aria-label="Search events"
              />
              <button
                onClick={handleBrowse}
                disabled={!search.trim()}
                className="ml-3 bg-accent text-white px-4 py-2 rounded-full text-sm font-semibold shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
        <div className="px-10 lg:px-8 pt-3 pb-10 lg:pt-6 lg:pb-8">
        <h2 className="font-bold text-white mb-2 lg:mb-3 text-center">Featured Events</h2>

        {isLoading ? (
          <FeaturedEventSkeleton />
        ) : featuredEvents.length > 0 && featured ? (
          <div className="max-w-3xl lg:max-w-5xl mx-auto">
            <div
              className="relative select-none lg:flex lg:items-center lg:justify-center lg:gap-[clamp(2rem,4vh,3.5rem)]"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Desktop side preview: previous */}
              {featuredEvents.length > 1 && (
                <div className="hidden lg:flex lg:flex-col lg:w-[clamp(7rem,17vh,14rem)] lg:flex-shrink-0 pointer-events-none opacity-35 grayscale saturate-0 brightness-75">
                  {getFeaturedAt(-1)?.image_url
                    ? <img
                        src={toImageUrl(getFeaturedAt(-1)?.image_url)}
                        alt={getFeaturedAt(-1)?.name ?? 'Previous featured event'}
                        className="w-full aspect-[4/5] rounded-xl object-cover object-center"
                      />
                    : <div className="w-full aspect-[4/5] rounded-xl bg-surface flex items-center justify-center"><ImageOff className="w-7 h-7 text-border" /></div>
                  }
                  <p className="text-xs text-white/80 mt-2 line-clamp-2">{getFeaturedAt(-1)?.name ?? ''}</p>
                </div>
              )}

              {/* Center focused card */}
              <div className="relative z-10 mx-auto w-full lg:w-fit lg:flex-shrink-0">
                <div
                  onClick={() => navigate(`/events/${featured.id}`)}
                  className="cursor-pointer rounded-xl overflow-hidden shadow-md bg-white"
                >
                  <div className="relative w-full aspect-[4/5] lg:w-auto lg:aspect-[4/5] lg:h-[clamp(12rem,calc(100vh-29rem),38rem)]">
                    {featured.image_url
                      ? <img
                          src={toImageUrl(featured.image_url)}
                          alt={featured.name}
                          className="absolute inset-0 w-full h-full object-cover object-center"
                        />
                      : <div className="absolute inset-0 bg-surface flex items-center justify-center"><ImageOff className="w-8 h-8 text-border" /></div>
                    }
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="text-[10px] px-2 py-1 rounded-full" {...categoryPillStyle(featured.category)}>
                        {featured.category || 'General'}
                      </span>
                      <span className={`text-[10px] px-2 py-1 rounded-full ${audiencePillClass(featured.audience)}`}>
                        {featured.audience === 'students_only' ? 'Students Only' : 'Open to Public'}
                      </span>
                      <span className={`text-[10px] px-2 py-1 rounded-full ${pricingPillClass(featured.pricing)}`}>
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
                      className="absolute -left-9 lg:-left-10 top-[38%] lg:top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center z-20 cursor-pointer"
                      aria-label="Previous event"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); nextFeatured() }}
                      className="absolute -right-9 lg:-right-10 top-[38%] lg:top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center z-20 cursor-pointer"
                      aria-label="Next event"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>

              {/* Desktop side preview: next */}
              {featuredEvents.length > 1 && (
                <div className="hidden lg:flex lg:flex-col lg:w-[clamp(7rem,17vh,14rem)] lg:flex-shrink-0 pointer-events-none opacity-35 grayscale saturate-0 brightness-75">
                  {getFeaturedAt(1)?.image_url
                    ? <img
                        src={toImageUrl(getFeaturedAt(1)?.image_url)}
                        alt={getFeaturedAt(1)?.name ?? 'Next featured event'}
                        className="w-full aspect-[4/5] rounded-xl object-cover object-center"
                      />
                    : <div className="w-full aspect-[4/5] rounded-xl bg-surface flex items-center justify-center"><ImageOff className="w-7 h-7 text-border" /></div>
                  }
                  <p className="text-xs text-white/80 mt-2 line-clamp-2">{getFeaturedAt(1)?.name ?? ''}</p>
                </div>
              )}

            </div>

            {/* Carousel indicators */}
            {featuredEvents.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-3">
                {featuredEvents.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      pauseAutoScroll()
                      setFeaturedIndex(i)
                    }}
                    className={`rounded-full transition-all cursor-pointer ${
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
      </div>

      {/* Monthly Calendar */}
      <div className="pb-6">
        <MonthlyCalendar
          header={
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="font-bold text-primary text-lg">Monthly Calendar</h2>
              <button
                data-tour="browse-all"
                onClick={() => navigate('/browse')}
                className="bg-accent text-white text-sm font-semibold px-4 py-2 rounded-full shadow-sm cursor-pointer flex-shrink-0"
              >
                Browse All Events
              </button>
            </div>
          }
        />
      </div>
    </div>
  )
}