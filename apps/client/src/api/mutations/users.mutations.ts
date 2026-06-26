import api from '../../services/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { userKeys, type NotificationPreferences, type SocialLinks } from '../queries/users.queries'

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

export function useUpdateOrganizerProfileMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ social_links, about }: { social_links: SocialLinks[]; about: string | null }) =>
      api.put('/auth/organizer-profile', { social_links, about }).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.organizerProfile })
    },
  })
}

export function useToggleOrganizerNotificationsMutation(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post(`/organizers/${id}/follow-toggle`).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.organizerNotificationsStatus(id) })
    },
  })
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      api.patch(`/notifications/${id}/read`).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.notifications })
    },
  })
}
