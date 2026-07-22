import { useEffect, useRef } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/auth-context'
import { hasSeenOrganizerTour, startOrganizerTour } from '../../tours/organizer-tour'
import { usePublicOrganizerProfileQuery, useOrganizerNotificationsStatusQuery, type SocialLinks } from '../../api/queries'
import { useToggleOrganizerNotificationsMutation } from '../../api/mutations'
import { Skeleton, EventListSkeleton } from '../../components/skeletons'
import Avatar from '../../components/avatar'
import { Pen, Bell, BellRing, ChevronRight, Globe, Link, BookOpen, Mail, PlusSquare, Calendar, Clock, Users, Eye, TrendingUp, MessageSquare, MapPin, ImageOff, Lock } from 'lucide-react'
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

export default function OrganizerProfilePage() {
  const { id } = useParams<{ id?: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const isOwnProfile = !id
  const profileId = id ?? user?.id?.toString()

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
    <div className="bg-surface">

      {isLoading ? (
        <>
          {/* banner skeleton on the primary background, lighter tones for contrast */}
          <div className="bg-primary px-4 py-5">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full animate-pulse bg-white/20" />
              <div className="flex-1">
                <div className="animate-pulse bg-white/20 rounded h-4 w-1/3" />
                <div className="animate-pulse bg-white/20 rounded h-3 w-1/4 mt-2" />
              </div>
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
          <div className="bg-primary px-4 py-5">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={toImageUrl(profile.image_url ?? undefined) || undefined}
                    alt={profile.name}
                    className="w-14 h-14"
                  />

                  <div className="flex gap-6">
                    <div className="text-center">
                      <p className="text-white font-bold text-lg">{profile.event_stats.upcoming}</p>
                      <p className="text-blue-200 text-xs">Upcoming</p>
                    </div>
                    <div className="text-center">
                      <p className="text-white font-bold text-lg">{profile.event_stats.total}</p>
                      <p className="text-blue-200 text-xs">Organized</p>
                    </div>
                  </div>
                </div>

                <p className="text-white font-semibold text-base">{profile.name}</p>
              </div>

              {/* Edit (own) / follow notifications (student/public) */}
              {isOwnProfile ? (
                <button
                  data-tour="edit-profile"
                  onClick={() => navigate('/organizer/profile')}
                  className="w-8 h-8 rounded-full border border-accent flex items-center justify-center cursor-pointer"
                >
                  <Pen className="text-accent w-4 h-4" />
                </button>
              ) : user?.role !== 'organizer' && (
                <button
                  onClick={() => toggleNotifyMutation.mutate()}
                  disabled={toggleNotifyMutation.isPending}
                  className={`w-8 h-8 rounded-full border border-accent flex items-center justify-center disabled:opacity-50 cursor-pointer ${following ? 'bg-accent' : ''}`}
                >
                  {following
                    ? <BellRing className="text-white w-4 h-4" />
                    : <Bell className="text-accent w-4 h-4" />
                  }
                </button>
              )}
            </div>

            {/* Social icons */}
            <div className="flex gap-3 mt-3">
              <a
                href={`mailto:${profile.email}`}
                className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white"
              >
                <Mail className="w-4 h-4" />
              </a>
              {profile.social_links?.filter(l => l.url).map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white"
                >
                  <SocialIcon type={link.type} />
                </a>
              ))}
            </div>
          </div>

          {/* About */}
          {profile.about && (
            <div className="mx-4 mt-4 bg-card rounded-xl shadow p-4">
              <h2 className="text-primary font-semibold text-sm mb-2">About</h2>
              <p className="text-foreground text-sm leading-relaxed">{profile.about}</p>
            </div>
          )}

          {/* Role-specific bottom section */}
          {isOwnProfile ? (
            <>
              {/* My Events Section */}
              <div className="mx-4 mt-4 bg-card rounded-xl shadow p-4">
                <h2 className="text-primary font-semibold text-sm mb-4">My Events</h2>
                <div className="flex">
                  <div className="flex-1 flex justify-around">
                    <button data-tour="new-event" onClick={() => navigate('/organizer/events/new')} className="flex flex-col items-center gap-1 cursor-pointer">
                      <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center text-xl"><PlusSquare /></div>
                      <span className="text-xs text-foreground">New</span>
                    </button>
                  </div>
                  <div data-tour="manage-events" className="flex-[2] flex justify-around">
                    <button onClick={() => navigate('/organizer/events?tab=upcoming')} className="flex flex-col items-center gap-1 cursor-pointer">
                      <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center text-xl"><Calendar /></div>
                      <span className="text-xs text-foreground">Upcoming</span>
                    </button>
                    <button onClick={() => navigate('/organizer/events?tab=past')} className="flex flex-col items-center gap-1 cursor-pointer">
                      <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center text-xl"><Clock /></div>
                      <span className="text-xs text-foreground">Past</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Analytics Section */}
              <div data-tour="analytics" className="mx-4 mt-4 bg-card rounded-xl shadow p-4">
                <h2 className="text-primary font-semibold text-sm mb-4">Analytics</h2>
                <div className="flex justify-around">
                  <button onClick={() => navigate('/organizer/analytics?tab=attendance')} className="flex flex-col items-center gap-1 cursor-pointer">
                    <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center text-xl"><Users /></div>
                    <span className="text-xs text-foreground">Attendance</span>
                  </button>
                  <button onClick={() => navigate('/organizer/analytics?tab=views')} className="flex flex-col items-center gap-1 cursor-pointer">
                    <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center text-xl"><Eye /></div>
                    <span className="text-xs text-foreground">Views</span>
                  </button>
                  <button className="flex flex-col items-center gap-1 opacity-40" disabled>
                    <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center text-xl"><TrendingUp /></div>
                    <span className="text-xs text-foreground">Reach</span>
                  </button>
                  <button onClick={() => navigate('/organizer/analytics?tab=feedback')} className="flex flex-col items-center gap-1 cursor-pointer">
                    <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center text-xl"><MessageSquare /></div>
                    <span className="text-xs text-foreground">Feedback</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            profile.events.length > 0 && (
              // Upcoming Events Section
              <div className="px-4 mt-4">
                <h2 className="text-primary font-semibold text-sm mb-3">Upcoming Events</h2>
                <div className="space-y-3">
                  {profile.events.map((event: any) => (
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
                        <h3 className="font-bold text-foreground text-sm leading-tight line-clamp-2">{event.name}</h3>

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
                            <span className="bg-primary text-white text-[10px] px-2 py-0.5 rounded-full">{event.category}</span>
                          )}
                          <span className="bg-primary text-white text-[10px] px-2 py-0.5 rounded-full">
                            {Number(event.pricing) === 0 ? 'Free' : 'Paid'}
                          </span>
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-muted-foreground self-center flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </>
      )}
    </div>
  )
}
