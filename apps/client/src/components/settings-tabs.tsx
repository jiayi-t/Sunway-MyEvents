import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/auth-context'
import { Pencil } from 'lucide-react'
import { useProfileQuery, useInterestsQuery, useTimePreferencesQuery, type NotificationPreferences } from '../api/queries'
import { interestKeys, timePreferenceKeys } from '../api/queries/interests.queries'
import { useUpdateNotificationPreferencesMutation, useUpdateInterestsMutation, useUpdateTimePreferencesMutation } from '../api/mutations'
import { useUpdateStudentProfileImageMutation } from '../api/mutations/users.mutations'
import { FormSkeleton } from './skeletons'
import Avatar from './avatar'
import api from '../services/api'

export type SettingsTab = 'profile' | 'notifications' | 'interests'

const CATEGORIES = ['Academics', 'Arts', 'Cultural', 'Entertainment', 'Social', 'Sports']

const DEFAULT_NOTIF_PREFS: NotificationPreferences = {
  email_enabled: true,
  email_channel: ['imail'],
  course_related: true,
  interest_related: true,
  suggested: true,
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-primary' : 'bg-gray-300'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  )
}

export function useSettingsTab() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = (searchParams.get('tab') as SettingsTab) ?? 'profile'
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab)

  const handleTabChange = (newTab: SettingsTab) => {
    setActiveTab(newTab)
    setSearchParams({ tab: newTab }, { replace: true })
  }

  return [activeTab, handleTabChange] as const
}

export function SettingsTabBar({ activeTab, onTabChange }: { activeTab: SettingsTab; onTabChange: (tab: SettingsTab) => void }) {
  const tabs: { key: SettingsTab; label: string }[] = [
    { key: 'profile', label: 'Profile' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'interests', label: 'Interests' },
  ]

  return (
    <div className="flex gap-2 px-4 py-3 bg-card">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors
            ${activeTab === tab.key
              ? 'bg-primary text-white'
              : 'border border-border text-muted-foreground hover:text-foreground'
            }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function ProfilePhoto() {
  const { user, updateUser } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const photoMenuRef = useRef<HTMLDivElement>(null)
  const [imageUploading, setImageUploading] = useState(false)
  const [showPhotoMenu, setShowPhotoMenu] = useState(false)
  const updateImageMutation = useUpdateStudentProfileImageMutation()

  useEffect(() => {
    if (!showPhotoMenu) return
    const handler = (e: MouseEvent) => {
      if (!photoMenuRef.current?.contains(e.target as Node)) setShowPhotoMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showPhotoMenu])

  const avatarSrc = user?.image_url
    ? user.image_url.startsWith('/uploads/') ? `http://localhost:3001${user.image_url}` : user.image_url
    : undefined

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post('/uploads', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      const newUrl: string = res.data.url
      updateImageMutation.mutate(newUrl, {
        onSuccess: () => updateUser({ image_url: newUrl }),
      })
    } finally {
      setImageUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="flex flex-col items-center mb-4">
      <div className="relative w-16 h-16 mb-2">
        <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200">
          <Avatar src={avatarSrc} alt={user?.name ?? ''} className="w-full h-full" />
          {imageUploading && (
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <div ref={photoMenuRef} className="absolute bottom-0 right-0">
          <button
            type="button"
            onClick={() => setShowPhotoMenu(m => !m)}
            disabled={imageUploading}
            className="w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow"
          >
            <Pencil className="w-3 h-3 text-white" />
          </button>
          {showPhotoMenu && (
            <div className="absolute left-full ml-1 bottom-0 bg-white rounded-lg shadow-lg border border-border text-sm overflow-hidden z-10 w-36">
              <button
                onClick={() => { setShowPhotoMenu(false); fileInputRef.current?.click() }}
                className="w-full text-left px-3 py-2 hover:bg-surface text-foreground"
              >
                Upload photo
              </button>
              {user?.image_url && (
                <button
                  onClick={() => {
                    setShowPhotoMenu(false)
                    updateImageMutation.mutate(null, { onSuccess: () => updateUser({ image_url: null }) })
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-surface text-red-500"
                >
                  Remove photo
                </button>
              )}
            </div>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleImageChange} />
      </div>
      <p className="text-primary font-bold text-lg">{user?.name}</p>
    </div>
  )
}

// public users have no programme or iMail, hide the  course-related toggle and email channel checkboxes
export function NotificationsTab({ variant = 'student' }: { variant?: 'student' | 'public' }) {
  const { data: profile } = useProfileQuery()

  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIF_PREFS)
  const notifInitialized = useRef(false)
  const updateNotifPrefsMutation = useUpdateNotificationPreferencesMutation()
  const [notifSaved, setNotifSaved] = useState(false)

  useEffect(() => {
    if (profile?.notification_preferences && !notifInitialized.current) {
      notifInitialized.current = true
      setNotifPrefs(profile.notification_preferences)
    }
  }, [profile])

  const savedNotifPrefs = profile?.notification_preferences ?? DEFAULT_NOTIF_PREFS
  const notifHasChanges = JSON.stringify(notifPrefs) !== JSON.stringify(savedNotifPrefs)

  useEffect(() => { if (notifHasChanges) setNotifSaved(false) }, [notifHasChanges])

  return (
    <div className="px-4 py-4 space-y-3">
      <div className="bg-card rounded-xl shadow p-4 space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Email notifications</p>
              <p className="text-xs text-muted-foreground mt-0.5">Receive event updates and reminders via email.</p>
            </div>
            <Toggle
              checked={notifPrefs.email_enabled}
              onChange={value => setNotifPrefs(p => ({ ...p, email_enabled: value }))}
            />
          </div>
          {variant === 'student' && notifPrefs.email_enabled && (
            <div className="mt-3 flex gap-3">
              {(['imail', 'personal'] as const).map(channel => (
                <label key={channel} className="flex items-center gap-2 text-sm text-foreground border border-border rounded-lg px-3 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifPrefs.email_channel.includes(channel)}
                    onChange={e => {
                      const channels = e.target.checked
                        ? [...notifPrefs.email_channel, channel]
                        : notifPrefs.email_channel.filter(existing => existing !== channel)
                      setNotifPrefs(p => ({ ...p, email_channel: channels }))
                    }}
                    className="accent-primary"
                  />
                  {channel === 'imail' ? 'iMail' : 'Personal Email'}
                </label>
              ))}
            </div>
          )}
        </div>

        {variant === 'student' && (
          <>
            <div className="border-t border-border" />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Course-related events</p>
                <p className="text-xs text-muted-foreground mt-0.5">Get notified about events related to your programme.</p>
              </div>
              <Toggle
                checked={notifPrefs.course_related}
                onChange={value => setNotifPrefs(p => ({ ...p, course_related: value }))}
              />
            </div>
          </>
        )}

        <div className="border-t border-border" />

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Interest-related events</p>
            <p className="text-xs text-muted-foreground mt-0.5">Get notified about events related to your selected interests.</p>
          </div>
          <Toggle
            checked={notifPrefs.interest_related}
            onChange={value => setNotifPrefs(p => ({ ...p, interest_related: value }))}
          />
        </div>

        <div className="border-t border-border" />

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Suggested events</p>
            <p className="text-xs text-muted-foreground mt-0.5">Get suggestions based on your activity.</p>
          </div>
          <Toggle
            checked={notifPrefs.suggested}
            onChange={value => setNotifPrefs(p => ({ ...p, suggested: value }))}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => updateNotifPrefsMutation.mutate(notifPrefs, { onSuccess: () => setNotifSaved(true) })}
          disabled={!notifHasChanges || updateNotifPrefsMutation.isPending}
          className="px-5 py-2 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {updateNotifPrefsMutation.isPending ? 'Saving...' : notifSaved ? 'Saved' : 'Save'}
        </button>
      </div>
    </div>
  )
}

export function InterestsTab() {
  const queryClient = useQueryClient()

  const { data: savedInterests, isLoading: interestsLoading } = useInterestsQuery()
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const interestsInitialized = useRef(false)
  const updateInterestsMutation = useUpdateInterestsMutation()

  useEffect(() => {
    if (savedInterests && !interestsInitialized.current) {
      interestsInitialized.current = true
      setSelectedInterests(savedInterests)
    }
  }, [savedInterests])

  const { data: savedTimeRange, isLoading: timeRangesLoading } = useTimePreferencesQuery()
  const [selectedFrom, setSelectedFrom] = useState('')
  const [selectedTo, setSelectedTo] = useState('')
  const timeRangesInitialized = useRef(false)
  const updateTimePreferencesMutation = useUpdateTimePreferencesMutation()
  const [interestsSaved, setInterestsSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (savedTimeRange !== undefined && !timeRangesInitialized.current) {
      timeRangesInitialized.current = true
      setSelectedFrom(savedTimeRange?.from ?? '')
      setSelectedTo(savedTimeRange?.to ?? '')
    }
  }, [savedTimeRange])

  const interestsHasChanges = JSON.stringify([...selectedInterests].sort()) !== JSON.stringify([...(savedInterests ?? [])].sort())
  const timesHasChanges = selectedFrom !== (savedTimeRange?.from ?? '') || selectedTo !== (savedTimeRange?.to ?? '')
  const interestsTabHasChanges = interestsHasChanges || timesHasChanges

  useEffect(() => { if (interestsTabHasChanges) setInterestsSaved(false) }, [interestsTabHasChanges])

  const handleInterestsSave = async () => {
    const promises: Promise<unknown>[] = []
    const timeRange = (selectedFrom || selectedTo) ? { from: selectedFrom, to: selectedTo } : null
    if (interestsHasChanges) promises.push(updateInterestsMutation.mutateAsync(selectedInterests))
    if (timesHasChanges) promises.push(updateTimePreferencesMutation.mutateAsync(timeRange))
    if (promises.length === 0) return
    setIsSaving(true)
    try {
      await Promise.all(promises)
      if (interestsHasChanges) queryClient.setQueryData(interestKeys.all, selectedInterests)
      if (timesHasChanges) queryClient.setQueryData(timePreferenceKeys.all, timeRange)
      setInterestsSaved(true)
    } catch {}
    setIsSaving(false)
  }

  const handleInterestsCancel = () => {
    setSelectedInterests(savedInterests ?? [])
    setSelectedFrom(savedTimeRange?.from ?? '')
    setSelectedTo(savedTimeRange?.to ?? '')
  }

  return (
    <div className="px-4 py-4 space-y-4">
      {interestsLoading || timeRangesLoading ? (
        <FormSkeleton sections={2} />
      ) : (
        <>
          {/* Categories */}
          <div className="bg-card rounded-xl shadow p-4">
            <p className="text-sm font-semibold text-foreground mb-4">Select your interested event categories</p>
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map(label => (
                <label key={label} className="flex items-center gap-2 text-sm text-foreground border border-border rounded-lg px-3 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedInterests.includes(label)}
                    onChange={e => {
                      setInterestsSaved(false)
                      setSelectedInterests(prev => e.target.checked ? [...prev, label] : prev.filter(p => p !== label))
                    }}
                    className="accent-primary"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Time range */}
          <div className="bg-card rounded-xl shadow p-4">
            <p className="text-sm font-semibold text-foreground mb-4">Select your preferred event timings <span className="text-muted-foreground font-normal">(Optional)</span></p>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">From</p>
                <input
                  type="time"
                  value={selectedFrom}
                  onChange={e => { setInterestsSaved(false); setSelectedFrom(e.target.value) }}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground bg-white"
                />
              </div>
              <span className="text-muted-foreground pb-2.5">–</span>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">To</p>
                <input
                  type="time"
                  value={selectedTo}
                  onChange={e => { setInterestsSaved(false); setSelectedTo(e.target.value) }}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground bg-white"
                />
              </div>
            </div>
          </div>

          {/* Save / Cancel */}
          <div className="flex justify-end gap-3">
            <button
              onClick={handleInterestsCancel}
              className="px-5 py-2 rounded-lg border border-accent text-accent text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleInterestsSave}
              disabled={!interestsTabHasChanges || isSaving || interestsSaved}
              className="px-5 py-2 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : interestsSaved ? 'Saved' : 'Save'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
