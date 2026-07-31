import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/auth-context'
import { hasSeenOrganizerTour, startOrganizerTour } from '../../tours/organizer-tour'
import { usePublicOrganizerProfileQuery, useOrganizerNotificationsStatusQuery, type SocialLinks } from '../../api/queries'
import { useToggleOrganizerNotificationsMutation } from '../../api/mutations'
import { Skeleton, EventListSkeleton } from '../../components/skeletons'
import Avatar from '../../components/avatar'
import { ShortcutTile } from '../../components/profile-sections'
import OrganizerCalendar from '../../components/organizer-calendar'
import OrganizerActivity from '../../components/organizer-activity'
import { categoryPillStyle, pricingPillClass } from '../../utils/event-colors.utils'
import { Pen, Plus, Check, ChevronRight, Globe, Link, BookOpen, Mail, PlusSquare, Calendar, Clock, Users, Eye, MessageSquare, MapPin, ImageOff, Lock } from 'lucide-react'
import { InstagramLogo, LinkedinLogo, TiktokLogo, FacebookLogo } from 'phosphor-react'

function SocialIcon({ type }: { type: SocialLinks['type'] }) {
  if (type === 'instagram') return <InstagramLogo className="w-4 h-4" />
  if (type === 'website') return <Globe className="w-4 h-4" />
  if (type === 'linkedin') return <LinkedinLogo className="w-4 h-4" />
  if (type === 'tiktok') return <TiktokLogo className="w-4 h-4" />
  if (type === 'rednote') return <BookOpen className="w-4 h-4" />
  if (type === 'facebook') return <FacebookLogo className="w-4 h-4" />
  return <Link className="w-4 h-4" />
}

const toImageUrl = (url?: string) => {
  if (!url) return ''
  if (url.startsWith('/uploads/')) return url
  return url
}

const formatDate = (date?: string) => {
  if (!date) return 'TBA'
  return new Date(date).toLocaleDateString('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const formatTime = (time?: string) => {
  if (!time) return 'TBA'
  return new Date(time).toLocaleTimeString('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

type EventsTab = 'upcoming' | 'past'

export default function OrganizerProfilePage() {
  const { id } = useParams<{ id?: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  // only used on the student/public view of organizer's profile
  const [eventsTab, setEventsTab] = useState<EventsTab>('upcoming')

  const isOwnProfile = !id
  // own dashboard: prefer the uuid, fall back to the integer id for pre-migration sessions whose stored user has no public_id (resolves via legacy_numeric_id)
  const profileId = id ?? user?.public_id ?? user?.id?.toString()

  const { data: profile, isLoading, isError, error } = usePublicOrganizerProfileQuery(profileId)
  // only students/public can follow an organizer
  const canFollow = user?.role === 'student' || user?.role === 'public'
  const { data: notifyStatus } = useOrganizerNotificationsStatusQuery(canFollow && !isOwnProfile ? profileId : undefined)
  const toggleNotifyMutation = useToggleOrganizerNotificationsMutation(isOwnProfile ? undefined : profileId)

  const following = notifyStatus?.following ?? false

  // first-visit walkthrough, once the dashboard sections have rendered
  useEffect(() => {
    if (!isOwnProfile || user?.role !== 'organizer') return
    if (isLoading || !profile) return
    if (hasSeenOrganizerTour()) return
    startOrganizerTour(navigate)
  }, [isOwnProfile, user?.role, isLoading, profile, navigate])

  // /organizers/:id has no route guard, so redirect guests to login if they try to view a profile
  const prevUserRef = useRef(user)
  useEffect(() => {
    if (prevUserRef.current && !user && id) navigate('/login', { replace: true })
    prevUserRef.current = user
  }, [user, id, navigate])

  // organizers have no public-profile view, viewing /organizers/:id sends them to their dashboard
  if (id && user?.role === 'organizer') {
    return <Navigate to="/organizer/dashboard" replace />
  }

  return (
    <div className="bg-surface pb-8">

      {isLoading ? (
        <>
          {/* banner skeleton on the primary background, lighter tones for contrast */}
          <div className="bg-primary full-bleed-bar py-5">
            <div className="flex flex-col lg:flex-row lg:items-start gap-3 lg:gap-5">
              <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-full animate-pulse bg-white/20 flex-shrink-0" />
              <div className="flex-1">
                <div className="animate-pulse bg-white/20 rounded h-5 w-1/3" />
                <div className="animate-pulse bg-white/20 rounded h-3 w-2/3 mt-2" />
                <div className="animate-pulse bg-white/20 rounded-full h-8 w-32 mt-3.5" />
              </div>
            </div>
            <div className="mt-6 flex gap-6">
              <div className="animate-pulse bg-white/20 rounded h-8 w-16" />
              <div className="animate-pulse bg-white/20 rounded h-8 w-16" />
            </div>
          </div>
          <div className="px-4 py-4 space-y-3">
            <Skeleton className="h-16 w-full" />
            <EventListSkeleton />
          </div>
        </>
      ) : isError ? (
        (() => {
          const code = (error as any)?.response?.data?.code
          if (code === 'auth_required') {
            // locked view, login prompt on the blue banner, static event-card placeholders below
            return (
              <>
                {/* Lock prompt on the primary banner */}
                <div className="bg-primary px-6 py-10 flex flex-col items-center text-center gap-3">
                  <div className="w-14 h-14 rounded-full border-2 border-white/70 flex items-center justify-center">
                    <Lock className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-white font-bold text-lg">Log in to view organizer profiles</h2>
                  <p className="text-blue-100 text-sm max-w-xs">Log in with a Sunway student or general public account to see this organizer's events.</p>
                  <button
                    onClick={() => navigate(`/login?redirect=${encodeURIComponent(`/organizers/${id}`)}`)}
                    className="mt-1 bg-accent text-white px-6 py-2.5 rounded-full text-sm font-semibold cursor-pointer"
                  >
                    Log in
                  </button>
                </div>

                {/* Static event-card placeholders */}
                <div className="px-4 mt-6">
                  <div className="h-4 w-32 bg-gray-200 rounded mb-3" />
                  <div className="space-y-3">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="bg-card rounded-xl shadow flex gap-3 p-3 items-center">
                        <div className="flex-shrink-0 rounded-lg bg-gray-200" style={{ width: '100px', aspectRatio: '4/5' }} />
                        <div className="flex-1 min-w-0">
                          <div className="h-4 w-3/4 bg-gray-200 rounded" />
                          <div className="h-3 w-1/3 bg-gray-200 rounded mt-2" />
                          <div className="mt-3 space-y-1.5">
                            <div className="h-3 w-1/2 bg-gray-200 rounded" />
                            <div className="h-3 w-2/5 bg-gray-200 rounded" />
                            <div className="h-3 w-3/5 bg-gray-200 rounded" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )
          }
          return <p className="text-muted-foreground text-sm text-center mt-12">Organizer not found.</p>
        })()
      ) : !profile ? (
        <p className="text-muted-foreground text-sm text-center mt-12">Organizer not found.</p>
      ) : (
        <>
          {/* Profile Banner */}
          <div className="bg-primary full-bleed-bar py-5">
            <div className="flex items-start justify-between gap-4">
              {/* logo stacks above the identity column on mobile and sits beside it once there is width */}
              <div className="flex flex-col lg:flex-row lg:items-start gap-3 lg:gap-5 min-w-0 flex-1">
                <Avatar
                  src={toImageUrl(profile.image_url ?? undefined) || undefined}
                  alt={profile.name}
                  className="w-20 h-20 lg:w-24 lg:h-24 ring-4 ring-white/25 flex-shrink-0"
                />

                <div className="min-w-0 flex-1">
                  <h1 className="text-white font-bold text-xl lg:text-2xl">{profile.name}</h1>

                  {profile.about && (
                    <p className="text-white/70 text-sm leading-relaxed mt-1.5 max-w-2xl">{profile.about}</p>
                  )}

                  {/* Social icons */}
                  <div className="flex gap-2 mt-3.5">
                    <a
                      href={`mailto:${profile.email}`}
                      className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 transition-colors flex items-center justify-center text-white"
                    >
                      <Mail className="w-4 h-4" />
                    </a>
                    {profile.social_links?.filter(l => l.url).map((link, index) => (
                      <a
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 transition-colors flex items-center justify-center text-white"
                      >
                        <SocialIcon type={link.type} />
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              {/* Edit (own) / follow notifications (student/public) */}
              {isOwnProfile ? (
                <button
                  data-tour="edit-profile"
                  onClick={() => navigate('/organizer/profile')}
                  className="w-8 h-8 rounded-full border border-accent flex items-center justify-center cursor-pointer flex-shrink-0"
                >
                  <Pen className="text-accent w-4 h-4" />
                </button>
              ) : user?.role !== 'organizer' && (
                <button
                  onClick={() => toggleNotifyMutation.mutate()}
                  disabled={toggleNotifyMutation.isPending}
                  className={`inline-flex items-center gap-1.5 rounded-full border border-accent px-3.5 py-1.5 text-sm font-semibold disabled:opacity-50 cursor-pointer flex-shrink-0
                    ${following ? 'bg-accent text-white' : 'text-accent'}`}
                >
                  {following
                    ? <><Check className="w-4 h-4" />Following</>
                    : <><Plus className="w-4 h-4" />Follow</>
                  }
                </button>
              )}
            </div>

            {/* counts sit on their own row under the identity block */}
            <div className="mt-6 flex flex-wrap gap-6">
              <div>
                <p className="text-lg font-bold text-white leading-none">{profile.event_stats.upcoming}</p>
                <p className="text-[11px] text-white/60 mt-1">Upcoming</p>
              </div>
              <div>
                <p className="text-lg font-bold text-white leading-none">{profile.event_stats.total}</p>
                <p className="text-[11px] text-white/60 mt-1">Organized</p>
              </div>
            </div>
          </div>

          {/* Role-specific bottom section */}
          {isOwnProfile ? (
            // shortcuts on the left, the month view beside them once there is room, stacked below on mobile
            <div className="px-4 pt-4 grid grid-cols-1 lg:grid-cols-[20rem_minmax(0,1fr)] gap-4 items-start">
              <div className="flex flex-col gap-4 min-w-0">
                {/* My Events Section */}
                <div className="bg-card rounded-xl shadow p-4">
                  <h2 className="text-primary font-semibold text-sm mb-4">My Events</h2>
                  <div className="flex">
                    <div className="flex-1 flex justify-around">
                      <ShortcutTile icon={PlusSquare} label="New" tour="new-event" onClick={() => navigate('/organizer/events/new')} />
                    </div>
                    <div data-tour="manage-events" className="flex-[2] flex justify-around">
                      <ShortcutTile icon={Calendar} label="Upcoming" onClick={() => navigate('/organizer/events?tab=upcoming')} />
                      <ShortcutTile icon={Clock} label="Past" onClick={() => navigate('/organizer/events?tab=past')} />
                    </div>
                  </div>
                </div>

                {/* Analytics Section */}
                <div data-tour="analytics" className="bg-card rounded-xl shadow p-4">
                  <h2 className="text-primary font-semibold text-sm mb-4">Analytics</h2>
                  <div className="flex justify-around">
                    <ShortcutTile icon={Users} label="Attendance" onClick={() => navigate('/organizer/analytics?tab=attendance')} />
                    <ShortcutTile icon={Eye} label="Views" onClick={() => navigate('/organizer/analytics?tab=views')} />
                    <ShortcutTile icon={MessageSquare} label="Feedback" onClick={() => navigate('/organizer/analytics?tab=feedback')} />
                  </div>
                </div>

                <OrganizerActivity />
              </div>

              <OrganizerCalendar />
            </div>
          ) : (
            (() => {
              const shown = eventsTab === 'upcoming' ? profile.events : (profile.past_events ?? [])
              const tabs: { key: EventsTab; label: string; count: number }[] = [
                { key: 'upcoming', label: 'Upcoming', count: profile.events.length },
                { key: 'past', label: 'Past', count: (profile.past_events ?? []).length },
              ]

              return (
                <div className="px-4 mt-4">
                  {/* same pill tabs as the My Events page */}
                  <div className="flex gap-2 mb-3">
                    {tabs.map(t => (
                      <button
                        key={t.key}
                        onClick={() => setEventsTab(t.key)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer
                          ${eventsTab === t.key ? 'bg-primary border-primary text-white' : 'border-border text-muted-foreground'}`}
                      >
                        {t.label}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          eventsTab === t.key ? 'bg-white/20 text-white' : 'bg-gray-200 text-muted-foreground'
                        }`}>
                          {t.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  {shown.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-8">
                      No {eventsTab} events.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {shown.map((event: any) => (
                        <div
                          key={event.id}
                          onClick={() => navigate(`/events/${event.id}`)}
                          className="bg-card rounded-xl shadow flex gap-3 p-3 hover:shadow-md transition items-center cursor-pointer"
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

                            <div className="text-muted-foreground text-xs mt-1.5 flex flex-col gap-1">
                              <div className="inline-flex items-center gap-1.5">
                                <Calendar className="w-3 h-3 text-black flex-shrink-0" />
                                <span>{formatDate(event.date)}</span>
                              </div>
                              <div className="inline-flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-black flex-shrink-0" />
                                <span>{formatTime(event.start_time)} – {formatTime(event.end_time)}</span>
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
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${pricingPillClass(event.pricing)}`}>
                                {Number(event.pricing) === 0 ? 'Free' : 'Paid'}
                              </span>
                            </div>
                          </div>

                          <ChevronRight className="w-4 h-4 text-muted-foreground self-center flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()
          )}
        </>
      )}
    </div>
  )
}
