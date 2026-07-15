import { useAuth } from '../../context/auth-context'
import { useProfileQuery } from '../../api/queries'
import { useSettingsTab, SettingsTabBar, ProfilePhoto, NotificationsTab, InterestsTab } from '../../components/settings-tabs'
import { ProfileInfoSkeleton } from '../../components/skeletons'

export default function PublicSettingsPage() {
  const { user } = useAuth()
  const [activeTab, handleTabChange] = useSettingsTab()
  const { data: profile, isLoading: profileLoading } = useProfileQuery()

  return (
    <div className="bg-surface">

      {/* Sub-header */}
      <div className="bg-primary px-4 py-3 flex items-center gap-3">
        <h1 className="text-white font-bold text-base flex-1 text-center">Settings</h1>
      </div>

      <SettingsTabBar activeTab={activeTab} onTabChange={handleTabChange} />

      {/* inactive tabs are hidden instead of unmounted so unsaved edits survive tab switching */}
      {/* Profile tab */}
      <div className={activeTab === 'profile' ? '' : 'hidden'}>
        <div className="px-4 py-4">
          {profileLoading ? (
            <ProfileInfoSkeleton rows={4} />
          ) : (
            <>
            <ProfilePhoto />
            <div className="bg-card rounded-xl shadow overflow-hidden">
              {[
                { label: 'Email', value: profile?.email ?? user?.email },
                { label: 'Gender', value: profile?.gender },
                { label: 'Mobile Number', value: profile?.mobile_number },
                { label: 'Alumni', value: profile?.alumni == null ? undefined : (profile.alumni ? 'Yes' : 'No') },
              ].map(({ label, value }) => (
                <div key={label} className="flex border-b border-border last:border-0">
                  <span className="w-36 pl-4 pr-2 py-3 text-sm font-semibold text-foreground flex-shrink-0">{label}</span>
                  <span className="pl-2 pr-4 py-3 text-sm text-foreground">{value ?? '—'}</span>
                </div>
              ))}
            </div>
            </>
          )}
        </div>
      </div>

      <div className={activeTab === 'notifications' ? '' : 'hidden'}>
        <NotificationsTab variant="public" />
      </div>

      <div className={activeTab === 'interests' ? '' : 'hidden'}>
        <InterestsTab />
      </div>
    </div>
  )
}
