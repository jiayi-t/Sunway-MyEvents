import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'

export interface NotificationPreferences {
  email_enabled: boolean
  email_channel: string[]
  course_related: boolean
  interest_related: boolean
  suggested: boolean
}

export interface UserProfile {
  id: number
  sunway_id: string
  email: string
  name: string
  role: string | null
  program: string | null
  image_url: string | null
  gender: string | null
  faculty: string | null
  semester: number | null
  mobile_number: string | null
  personal_email: string | null
  notification_preferences: NotificationPreferences | null
}

export interface Notification {
  id: number
  user_id: number
  type: string
  title: string
  message: string
  read_at: string | null
  created_at: string
}

export interface SocialLinks {
  type: 'instagram' | 'website' | 'linkedin' | 'tiktok' | 'rednote' | 'facebook' | 'others'
  url: string
}

export interface OrganizerProfile {
  id: number
  sunway_id: string
  email: string
  name: string
  role: string | null
  category: string | null
  image_url: string | null
  social_links: SocialLinks[] | null
}

export const userKeys = {
  profile: ['profile'] as const,
  organizerProfile: ['organizer-profile'] as const,
  notifications: ['notifications'] as const,
}

export function useProfileQuery() {
  return useQuery({
    queryKey: userKeys.profile,
    queryFn: () => api.get('/auth/profile').then(res => res.data as UserProfile),
  })
}

export function useOrganizerProfileQuery() {
  return useQuery({
    queryKey: userKeys.organizerProfile,
    queryFn: () => api.get('/auth/organizer-profile').then(res => res.data as OrganizerProfile),
  })
}

export function useNotificationsQuery() {
  return useQuery({
    queryKey: userKeys.notifications,
    queryFn: () => api.get('/notifications').then(res => res.data as Notification[]),
  })
}
