import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useAuth } from '../../context/auth-context'
import { useProfileQuery } from '../../api/queries'
import { useSettingsTab, SettingsTabBar, ProfilePhoto, NotificationsTab, InterestsTab } from '../../components/settings-tabs'
import { ProfileInfoSkeleton } from '../../components/skeletons'
import { useEffect, useRef, useState } from 'react'
import { useUpdatePublicProfileMutation } from '../../api/mutations/users.mutations'

// phone number: digits, spaces, + and - allowed, must contain at least one digit
const MOBILE_RE = /^(?=.*\d)[\d+\s-]+$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function PublicSettingsPage() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const [activeTab, handleTabChange] = useSettingsTab()
  const { data: profile, isLoading: profileLoading } = useProfileQuery()
  const updateProfileMutation = useUpdatePublicProfileMutation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [gender, setGender] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')
  const [alumni, setAlumni] = useState<'' | 'yes' | 'no'>('')
  const [submitted, setSubmitted] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)
  const initialized = useRef(false)

  useEffect(() => {
    if (profile && !initialized.current) {
      initialized.current = true
      setName(profile.name ?? user?.name ?? '')
      setEmail(profile.email ?? user?.email ?? '')
      setGender(profile.gender ?? '')
      setMobileNumber(profile.mobile_number ?? '')
      setAlumni(profile.alumni == null ? '' : (profile.alumni ? 'yes' : 'no'))
    }
  }, [profile, user?.email, user?.name])

  const hasChanges =
    name !== (profile?.name ?? user?.name ?? '') ||
    email !== (profile?.email ?? user?.email ?? '') ||
    gender !== (profile?.gender ?? '') ||
    mobileNumber !== (profile?.mobile_number ?? '') ||
    alumni !== (profile?.alumni == null ? '' : (profile.alumni ? 'yes' : 'no'))

  useEffect(() => {
    if (hasChanges) setSaved(false)
  }, [hasChanges])

  const handleSave = () => {
    setSaveError('')
    setSubmitted(true)

    if (!name.trim() || !email.trim() || !gender || !mobileNumber.trim() || !alumni) {
      setSaveError('Please fill in all fields')
      return
    }

    if (!EMAIL_RE.test(email.trim())) {
      setSaveError('Please enter a valid email address')
      return
    }

    if (mobileNumber && !MOBILE_RE.test(mobileNumber)) {
      setSaveError('Enter a valid mobile number (e.g. +60 12-345 6789)')
      return
    }

    updateProfileMutation.mutate({
      name: name.trim(),
      email: email.trim(),
      gender,
      mobile_number: mobileNumber.trim() ? mobileNumber.trim() : null,
      alumni: alumni === 'yes',
    }, {
      onSuccess: () => {
        setSaved(true)
        setSubmitted(false)
        updateUser({ name: name.trim(), email: email.trim() })
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
              <div className="flex border-b border-border">
                <span className="w-36 pl-4 pr-2 py-3 text-sm font-semibold text-foreground flex-shrink-0">Name</span>
                <div className="pl-2 pr-4 py-2 flex-1 min-w-0">
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className={`w-full border rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary ${submitted && !name.trim() ? 'border-red-400' : 'border-border'}`}
                  />
                </div>
              </div>

              <div className="flex border-b border-border">
                <span className="w-36 pl-4 pr-2 py-3 text-sm font-semibold text-foreground flex-shrink-0">Email</span>
                <div className="pl-2 pr-4 py-2 flex-1 min-w-0">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className={`w-full border rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary ${submitted && (!email.trim() || !EMAIL_RE.test(email.trim())) ? 'border-red-400' : 'border-border'}`}
                  />
                </div>
              </div>

              <div className="flex border-b border-border">
                <span className="w-36 pl-4 pr-2 py-3 text-sm font-semibold text-foreground flex-shrink-0">Gender</span>
                <div className="pl-2 pr-4 py-2 flex-1 min-w-0">
                  <select
                    value={gender}
                    onChange={e => setGender(e.target.value)}
                    className={`w-full border rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary bg-white ${submitted && !gender ? 'border-red-400' : 'border-border'}`}
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="flex border-b border-border">
                <span className="w-36 pl-4 pr-2 py-3 text-sm font-semibold text-foreground flex-shrink-0">Mobile Number</span>
                <div className="pl-2 pr-4 py-2 flex-1 min-w-0">
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={e => setMobileNumber(e.target.value.replace(/[^\d+\s-]/g, ''))}
                    placeholder="e.g. +60 12-345 6789"
                    className={`w-full border rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary ${submitted && (!mobileNumber.trim() || !MOBILE_RE.test(mobileNumber)) ? 'border-red-400' : 'border-border'}`}
                  />
                </div>
              </div>

              <div className="flex border-b border-border">
                <span className="w-36 pl-4 pr-2 py-3 text-sm font-semibold text-foreground flex-shrink-0">Alumni</span>
                <div className="pl-2 pr-4 py-2 flex-1 min-w-0">
                  <div className="flex gap-2">
                    {(['yes', 'no'] as const).map(value => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setAlumni(value)}
                        className={`flex-1 py-1.5 rounded-lg text-sm font-semibold border transition-colors cursor-pointer ${
                          alumni === value
                            ? 'bg-primary text-white border-primary'
                            : submitted && !alumni
                              ? 'bg-white text-gray-700 border-red-400'
                              : 'bg-white text-gray-700 border-border'
                        }`}
                      >
                        {value === 'yes' ? 'Yes' : 'No'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate('/change-password')}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-foreground cursor-pointer"
              >
                <span>Change Password</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
            </div>

            {saveError && <p className="text-red-500 text-sm mt-3">{saveError}</p>}

            <div className="flex justify-end mt-3">
              <button
                onClick={handleSave}
                disabled={!hasChanges || updateProfileMutation.isPending}
                className="px-5 py-2 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {updateProfileMutation.isPending ? 'Saving...' : saved ? 'Saved' : 'Save'}
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
