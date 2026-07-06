import { useAuth } from '../../context/auth-context'
import { ProfileBanner, MyEventsShortcuts } from '../../components/profile-sections'

export default function PublicProfilePage() {
  const { user } = useAuth()

  return (
    <div className="bg-surface">
      <ProfileBanner identifier={user?.email} />
      <MyEventsShortcuts />
    </div>
  )
}
