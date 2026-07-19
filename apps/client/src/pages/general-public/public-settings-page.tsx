import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useAuth } from '../../context/auth-context'
import { useProfileQuery } from '../../api/queries'
import { useSettingsTab, SettingsTabBar, ProfilePhoto, NotificationsTab, InterestsTab } from '../../components/settings-tabs'
import { ProfileInfoSkeleton } from '../../components/skeletons'
import { useEffect, useRef, useState } from 'react'
import { useUpdateProfileMobileMutation } from '../../api/mutations/users.mutations'

// phone number: digits, spaces, + and - allowed, must contain at least one digit
const MOBILE_RE = /^(?=.*\d)[\d+\s-]+$/

export default function PublicSettingsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, handleTabChange] = useSettingsTab()
  const { data: profile, isLoading: profileLoading } = useProfileQuery()
  const updateMobileMutation = useUpdateProfileMobileMutation()
  const [mobileNumber, setMobileNumber] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)
  const initialized = useRef(false)

  useEffect(() => {
    if (profile && !initialized.current) {
      initialized.current = true
      setMobileNumber(profile.mobile_number ?? '')
    }
  }, [profile])

  const hasMobileChanges = mobileNumber !== (profile?.mobile_number ?? '')

  useEffect(() => {
    if (hasMobileChanges) setSaved(false)
  }, [hasMobileChanges])

  const handleMobileSave = () => {
    setSaveError('')
    setSubmitted(true)
    if (mobileNumber && !MOBILE_RE.test(mobileNumber)) {
      setSaveError('Enter a valid mobile number (e.g. +60 12-345 6789)')
      return
    }
    updateMobileMutation.mutate(mobileNumber.trim() ? mobileNumber.trim() : null, {
      onSuccess: () => {
        setSaved(true)
        setSubmitted(false)
      },
      onError: (err: any) => setSaveError(err.response?.data?.error || 'Failed to save'),
    })
  }

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
                { label: 'Alumni', value: profile?.alumni == null ? undefined : (profile.alumni ? 'Yes' : 'No') },
              ].map(({ label, value }) => (
                <div key={label} className="flex border-b border-border">
                  <span className="w-36 pl-4 pr-2 py-3 text-sm font-semibold text-foreground flex-shrink-0">{label}</span>
                  <span className="pl-2 pr-4 py-3 text-sm text-foreground">{value ?? '—'}</span>
                </div>
              ))}

              <div className="flex border-b border-border">
                <span className="w-36 pl-4 pr-2 py-3 text-sm font-semibold text-foreground flex-shrink-0">Mobile Number</span>
                <div className="pl-2 pr-4 py-2 flex-1 min-w-0">
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={e => setMobileNumber(e.target.value.replace(/[^\d+\s-]/g, ''))}
                    placeholder="e.g. +60 12-345 6789"
                    className={`w-full border rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary ${submitted && mobileNumber && !MOBILE_RE.test(mobileNumber) ? 'border-red-400' : 'border-border'}`}
                  />
                </div>
              </div>

              <button
                onClick={() => navigate('/change-password')}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-foreground"
              >
                <span>Change Password</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
            </div>

            {saveError && <p className="text-red-500 text-sm mt-3">{saveError}</p>}

            <div className="flex justify-end mt-3">
              <button
                onClick={handleMobileSave}
                disabled={!hasMobileChanges || updateMobileMutation.isPending}
                className="px-5 py-2 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateMobileMutation.isPending ? 'Saving...' : saved ? 'Saved' : 'Save'}
              </button>
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
