import { useNavigate } from 'react-router-dom'
import { useFollowedOrganizersQuery } from '../api/queries'
import Avatar from './avatar'

// Followed SLB/C&S
export default function FollowedOrganizers() {
  const navigate = useNavigate()
  const { data, isLoading } = useFollowedOrganizersQuery()
  const organizers = data ?? []

  return (
    <div className="bg-card rounded-xl shadow p-4">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <h2 className="text-primary font-semibold text-sm">Followed SLB/C&S</h2>
        {organizers.length > 0 && (
          <span className="text-xs text-muted-foreground flex-shrink-0">{organizers.length}</span>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm py-4">Loading organizers...</p>
      ) : organizers.length === 0 ? (
        <p className="text-muted-foreground text-sm py-4">You are not following any organizers yet.</p>
      ) : (
        // show 5 organizers, scroll the rest
        <div className="divide-y divide-border max-h-[19.5rem] overflow-y-auto overflow-x-hidden">
          {organizers.map(org => (
            <div
              key={org.id}
              onClick={() => navigate(`/organizers/${org.id}`)}
              className="flex items-center gap-3 py-3 px-2 cursor-pointer hover:bg-surface rounded-lg transition-colors"
            >
              <Avatar src={org.image_url} alt={org.name} className="w-9 h-9 flex-shrink-0" />

              <div className="flex-1 min-w-0">
                <p className="text-foreground text-sm font-semibold leading-tight truncate">{org.name}</p>
              </div>

              <span className="border border-accent text-accent text-xs font-medium px-3 py-1 rounded-full flex-shrink-0">
                Following
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
