import { useAuth } from '../../context/auth-context'
import CheckinCard from '../../components/checkin-card'

export default function PublicCheckinPage() {
  const { user } = useAuth()

  return <CheckinCard identifier={user?.email} />
}
