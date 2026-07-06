import { useAuth } from '../../context/auth-context'
import { ProfileBanner, MyEventsShortcuts } from '../../components/profile-sections'

export default function StudentProfilePage() {
  const { user } = useAuth()

  return (
    <div className="bg-surface">
      <ProfileBanner identifier={user?.sunway_id} />
      <MyEventsShortcuts />
    </div>
  )
}