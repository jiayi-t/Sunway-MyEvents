import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useEventsQuery, useRecommendationsQuery, useFollowedOrgsQuery, useOrganizerDirectoryQuery, type DirectoryOrganizer } from '../../api/queries'
import { useAuth } from '../../context/auth-context'
import Avatar from '../../components/avatar'
import { EventListSkeleton, DividedRowsSkeleton, Skeleton } from '../../components/skeletons'
import { toMYT, todayMYT } from '../../utils/datetime.utils'
import { categoryPillStyle, audiencePillClass, pricingPillClass } from '../../utils/event-colors.utils'
import { Calendar, ChevronRight, Clock, ImageOff, MapPin, Search, SlidersHorizontal, X } from 'lucide-react'

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
  image_url: string
  organizer_name?: string
  cancelled_at?: string | null
  created_at?: string
}

type SortOption = 'recent' | 'soonest' | 'latest'
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'recent', label: 'Recently Added' },
  { value: 'soonest', label: 'Soonest Date' },
  { value: 'latest', label: 'Latest Date' },
]

const EVENT_CATEGORIES = ['Academics', 'Arts', 'Cultural', 'Entertainment', 'Social', 'Sports']
const ORGANIZER_CATEGORY = 'All SLB/C&S'
const CATEGORIES = ['All Events', ORGANIZER_CATEGORY, 'Events For You', 'Followed SLB/C&S Events']

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
  events: boolean
  organizers: boolean
  categories: string[]
  dateFrom: string
  dateTo: string
  upcoming: boolean
  past: boolean
  free: boolean
  paid: boolean
  sort: SortOption
}

const EMPTY_FILTERS: Filters = { events: false, organizers: false, categories: [], dateFrom: '', dateTo: '', upcoming: false, past: false, free: false, paid: false, sort: 'recent' }

// narrows which events/organizers are shown, or which section is active — sort order is excluded, since it only reorders results rather than narrowing them
function filtersActive(f: Filters) {
  return f.events || f.organizers || f.categories.length > 0 || !!f.dateFrom || !!f.dateTo || f.upcoming || f.past || f.free || f.paid
}

// one titled block of organizer rows, rendered once for SLBs and once for C&S
function OrganizerGroup({ title, organizers, onOpen }: {
  title: string
  organizers: DirectoryOrganizer[]
  onOpen: (id: string) => void
}) {
  if (organizers.length === 0) return null

  return (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-primary font-semibold text-sm">{title}</h2>
        <span className="text-xs text-muted-foreground flex-shrink-0">{organizers.length}</span>
      </div>

      <div className="bg-card rounded-xl shadow p-2 divide-y divide-border">
        {organizers.map(org => (
          <div
            key={org.id}
            onClick={() => onOpen(org.id)}
            className="flex items-center gap-3 py-3 px-2 cursor-pointer hover:bg-surface rounded-lg transition-colors"
          >
            <Avatar src={org.image_url} alt={org.name} className="w-9 h-9 flex-shrink-0" />

            <div className="flex-1 min-w-0">
              <p className="text-foreground text-sm font-semibold leading-tight truncate">{org.name}</p>
              {org.category && (
                <p className="text-muted-foreground text-xs mt-0.5 truncate">{org.category}</p>
              )}
            </div>

            {org.following && (
              <span className="border border-accent text-accent text-xs font-medium px-3 py-1 rounded-full flex-shrink-0">
                Following
              </span>
            )}
          </div>
        ))}
      </div>
    </>
  )
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
  // GET /events keeps cancelled events the caller registered for so they still appear on the calendar, but browsing is a discovery surface, so they are dropped here
  const events = useMemo(
    () => ((eventsData ?? []) as Event[]).filter(e => !e.cancelled_at),
    [eventsData]
  )

  // the filter chips are hidden while searching or filtering, so those views only drive results when neither is on
  const chipsActive = !search.trim() && !filtersActive(filters)
  const isForYouActive = activeCategory === 'Events For You' && chipsActive
  const isFollowedActive = activeCategory === 'Followed SLB/C&S Events' && chipsActive
  const isAllOrgsActive = activeCategory === ORGANIZER_CATEGORY && chipsActive

  const { data: recommendationsData, isLoading: recLoading } = useRecommendationsQuery(isForYouActive && !!user)
  const recommendations = (recommendationsData ?? []) as Event[]

  const { data: followedData, isLoading: followedLoading } = useFollowedOrgsQuery(isFollowedActive && !!user)
  const followedOrgs = (followedData ?? []) as Event[]

  const isLoading = loading || (isForYouActive && recLoading) || (isFollowedActive && followedLoading)

  // the Show filter narrows the page to one result type, otherwise both events and slb/c&s appear in the search results
  const eventsOnly = filters.events && !filters.organizers
  const showEvents = !(filters.organizers && !filters.events) && !isAllOrgsActive
  const showOrganizers = isAllOrgsActive || (!eventsOnly && (filters.organizers || !!search.trim()))
  // desktop view splits them into 2 columns instead of stacking
  const twoColumn = showEvents && showOrganizers

  const { data: organizerData, isLoading: organizersLoading } = useOrganizerDirectoryQuery(showOrganizers)

  // the event filters below are event-only, so organizer results are narrowed by the search text alone
  const matchedOrganizers = useMemo(() => {
    const all = organizerData ?? []
    const query = search.trim().toLowerCase()
    if (!query) return all
    return all.filter(o =>
      o.name.toLowerCase().includes(query) ||
      o.category?.toLowerCase().includes(query)
    )
  }, [organizerData, search])

  const slbs = useMemo(() => matchedOrganizers.filter(o => o.category === 'SLB'), [matchedOrganizers])
  const clubs = useMemo(() => matchedOrganizers.filter(o => o.category !== 'SLB'), [matchedOrganizers])

  const filtered = useMemo(() => {
    const today = todayMYT()

    let base: Event[]
    if (search.trim()) {
      base = events.filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
    } else if (isForYouActive) {
      base = recommendations
    } else if (isFollowedActive) {
      base = followedOrgs
    } else {
      base = events
    }

    let result = base
    if (filtersActive(filters)) {
      result = base.filter(e => {
        // the date inputs already hold YYYY-MM-DD, so comparing MYT calendar days keeps every side of these comparisons in the same timezone and format
        const eventDay = toMYT(e.date)

        if (filters.upcoming && !filters.past && eventDay < today) return false
        if (filters.past && !filters.upcoming && eventDay >= today) return false

        if (filters.dateFrom && eventDay < filters.dateFrom) return false
        if (filters.dateTo && eventDay > filters.dateTo) return false

        if (filters.categories.length > 0 && !filters.categories.includes(e.category)) return false

        const isFree = Number(e.pricing) === 0
        if (filters.free && !filters.paid && !isFree) return false
        if (filters.paid && !filters.free && isFree) return false

        return true
      })
    }

    return [...result].sort((a, b) => {
      if (filters.sort === 'soonest') return new Date(a.date).getTime() - new Date(b.date).getTime()
      if (filters.sort === 'latest') return new Date(b.date).getTime() - new Date(a.date).getTime()
      // 'recent' - newest created first
      return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
    })
  }, [events, recommendations, followedOrgs, search, filters, isForYouActive, isFollowedActive])

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

      <div className="bg-primary full-bleed-bar py-3 flex items-center gap-3">
        <h1 className="text-white font-bold text-base flex-1 text-center">Browse Events and SLB/C&S</h1>
      </div>

      {/* Search */}
      <div className="bg-surface px-4 py-3 relative">
        <div data-tour="browse-search" className="flex items-center gap-2">
          <div className="flex-1 min-w-0 flex items-center bg-white rounded-full shadow border border-border px-3 py-2">
            <Search className="w-4 h-4 text-gray-400 mr-3 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search events and SLB/C&S"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 min-w-0 bg-transparent text-sm placeholder-gray-400 focus:outline-none"
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
              filtersActive(filters) || filters.sort !== 'recent' ? 'bg-primary border-primary text-white cursor-pointer' : 'bg-white border-border text-gray-500 cursor-pointer'
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
            className="absolute left-4 right-16 top-full -mt-3 bg-white rounded-2xl shadow-xl border border-border z-30 p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-foreground text-sm">Filters</span>
              <button onClick={() => { setFilterOpen(false); setDraftFilters(filters) }}>
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Result type */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Show</p>
            <div className="flex gap-4 mb-4">
              {([['events', 'Events'], ['organizers', 'SLB/C&S']] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={draftFilters[key]}
                    onChange={() => setDraftFilters(f => ({ ...f, [key]: !f[key] }))}
                    className="w-4 h-4 accent-primary rounded cursor-pointer"
                  />
                  <span className="text-sm text-foreground">{label}</span>
                </label>
              ))}
            </div>

            {/* Sort */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Sort by</p>
            <div className="flex flex-wrap gap-4 mb-4">
              {SORT_OPTIONS.map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="sort"
                    checked={draftFilters.sort === value}
                    onChange={() => setDraftFilters(f => ({
                      ...f,
                      sort: value,
                      // auto tick upcoming for soonest date
                      ...(value === 'soonest' ? { upcoming: true, past: false } : {}),
                    }))}
                    className="w-4 h-4 accent-primary cursor-pointer"
                  />
                  <span className="text-sm text-foreground">{label}</span>
                </label>
              ))}
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
                    className="w-4 h-4 accent-primary rounded cursor-pointer"
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
                onClick={e => e.currentTarget.showPicker?.()}
                className="flex-1 min-w-0 text-sm border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              />
              <span className="text-muted-foreground text-xs">to</span>
              <input
                type="date"
                value={draftFilters.dateTo}
                min={draftFilters.dateFrom || undefined}
                onChange={e => setDraftFilters(f => ({ ...f, dateTo: e.target.value }))}
                onClick={e => e.currentTarget.showPicker?.()}
                className="flex-1 min-w-0 text-sm border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
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
                    className="w-4 h-4 accent-primary rounded cursor-pointer"
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
                    className="w-4 h-4 accent-primary rounded cursor-pointer"
                  />
                  <span className="text-sm text-foreground">{cat}</span>
                </label>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={clearFilters}
                className="flex-1 py-2 rounded-full border border-border text-sm font-semibold text-muted-foreground cursor-pointer"
              >
                Clear all
              </button>
              <button
                onClick={applyFilters}
                className="flex-1 py-2 rounded-full bg-accent text-white text-sm font-semibold cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Top-level views, hidden while a search or filter narrows the list */}
      {chipsActive && (
        <div className="px-4 py-3 overflow-x-auto">
          <div className="flex gap-2 w-max">
            {CATEGORIES.map(cat => {
              const isOrganizers = cat === ORGANIZER_CATEGORY
              const active = activeCategory === cat
              return (
                <button
                  key={cat}
                  data-tour={cat === 'Events For You' ? 'for-you' : undefined}
                  onClick={() => handleCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-full text-sm font-medium border whitespace-nowrap transition-colors
                    ${isOrganizers ? 'border-accent' : 'border-primary'}
                    ${active
                      ? isOrganizers ? 'bg-accent text-white' : 'bg-primary text-white'
                      : `${isOrganizers ? 'text-accent' : 'text-primary'} cursor-pointer`
                    }`}
                >
                  {cat}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Events first, SLB/C&S below on mobile and beside on desktop */}
      <div className={`px-4 py-3 ${twoColumn ? 'lg:grid lg:grid-cols-3 lg:gap-4 lg:items-start' : ''}`}>
        {showEvents && (
          <div className={`space-y-3 ${twoColumn ? 'lg:col-span-2' : ''}`}>
            {showOrganizers && (
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-primary font-semibold text-sm">Events</h2>
                {!isLoading && filtered.length > 0 && (
                  <span className="text-xs text-muted-foreground flex-shrink-0">{filtered.length}</span>
                )}
              </div>
            )}

            {isLoading ? (
              <EventListSkeleton count={4} />
            ) : filtered.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center mt-8">
                {isForYouActive
                  ? 'No recommendations yet, explore events to get personalised suggestions.'
                  : 'No events found.'}
              </p>
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
                        <span className="text-[10px] px-2 py-0.5 rounded-full" {...categoryPillStyle(event.category)}>
                          {event.category}
                        </span>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${audiencePillClass(event.audience)}`}>
                        {event.audience === 'students_only' ? 'Students Only' : 'Open to Public'}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${pricingPillClass(event.pricing)}`}>
                        {Number(event.pricing) === 0 ? 'Free' : 'Paid'}
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-muted-foreground self-center flex-shrink-0" />
                </div>
              ))
            )}
          </div>
        )}

        {showOrganizers && (
          <div className={`space-y-3 ${showEvents ? 'mt-3 lg:mt-0' : ''}`}>
            {organizersLoading ? (
              <>
                <div className="flex items-baseline justify-between gap-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-4 flex-shrink-0" />
                </div>
                <div className="bg-card rounded-xl shadow p-2">
                  <DividedRowsSkeleton count={4} lines={2} trailing="pill" />
                </div>
              </>
            ) : matchedOrganizers.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center mt-8">No SLB/C&S found.</p>
            ) : (
              <>
                <OrganizerGroup title="Student Leadership Bodies" organizers={slbs} onOpen={id => navigate(`/organizers/${id}`)} />
                <OrganizerGroup title="Clubs & Societies" organizers={clubs} onOpen={id => navigate(`/organizers/${id}`)} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
