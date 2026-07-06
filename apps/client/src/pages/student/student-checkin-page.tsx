import { useAuth } from '../../context/auth-context'
import CheckinCard from '../../components/checkin-card'

export default function StudentCheckinPage() {
  const { user } = useAuth()

  return <CheckinCard identifier={user?.sunway_id} />
}
