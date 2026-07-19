import api from '../../services/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { userKeys, type Notification, type NotificationPreferences, type SocialLinks } from '../queries/users.queries'

export function useUpdateNotificationPreferencesMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (prefs: NotificationPreferences) =>
      api.put('/auth/notification-preferences', prefs).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.profile })
    },
  })
}

export interface OrganizerProfileUpdate {
  name?: string
  sunway_id?: string
  email?: string
  category?: string | null
  image_url?: string | null
  social_links: SocialLinks[]
  about: string | null
}

export function useUpdateStudentProfileImageMutation() {
  return useMutation({
    mutationFn: (image_url: string | null) =>
      api.put('/auth/profile', { image_url }).then(res => res.data),
  })
}

export interface PublicProfileUpdate {
  name?: string
  email?: string
  gender?: string
  mobile_number?: string | null
  alumni?: boolean
}

export function useUpdatePublicProfileMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: PublicProfileUpdate) =>
      api.put('/auth/profile', data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.profile })
    },
  })
}

export function useUpdateProfileMobileMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (mobile_number: string | null) =>
      api.put('/auth/profile', { mobile_number }).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.profile })
    },
  })
}

export function useUpdateOrganizerProfileMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: OrganizerProfileUpdate) =>
      api.put('/auth/organizer-profile', data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.organizerProfile })
    },
  })
}

export function useToggleOrganizerNotificationsMutation(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post(`/organizers/${id}/follow-toggle`).then(res => res.data),
    // flip the bell straight away, otherwise it waits on the post and the follow status refetch
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: userKeys.organizerNotificationsStatus(id) })
      const previous = queryClient.getQueryData<{ following: boolean }>(userKeys.organizerNotificationsStatus(id))
      queryClient.setQueryData(userKeys.organizerNotificationsStatus(id), { following: !previous?.following })
      return { previous }
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(userKeys.organizerNotificationsStatus(id), context?.previous)
    },
    onSuccess: (data: { following: boolean }) => {
      queryClient.setQueryData(userKeys.organizerNotificationsStatus(id), data)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.notifications })
    },
  })
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.patch('/notifications/read-all').then(res => res.data),
    // clear the unread badge straight away, otherwise it waits on the patch and the refetch
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: userKeys.notifications })
      const previous = queryClient.getQueryData<Notification[]>(userKeys.notifications)
      const readAt = new Date().toISOString()
      queryClient.setQueryData<Notification[]>(userKeys.notifications, old =>
        old?.map(n => (n.read_at ? n : { ...n, read_at: readAt }))
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(userKeys.notifications, context?.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.notifications })
    },
  })
}
