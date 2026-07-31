import { useAuth } from '../../context/auth-context'
import { ProfileBanner, MyEventsShortcuts } from '../../components/profile-sections'
import FollowedOrganizers from '../../components/followed-organizers'

export default function PublicProfilePage() {
  const { user } = useAuth()

  return (
    <div className="bg-surface pb-8">
      <ProfileBanner identifier={user?.email} />

      {/* shortcuts on the left, followed organizers beside them once there is room, stacked below on mobile */}
      <div className="px-4 pt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <MyEventsShortcuts />
        <FollowedOrganizers />
      </div>
    </div>
  )
}
