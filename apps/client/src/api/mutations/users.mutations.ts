import api from '../../services/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { userKeys, type NotificationPreferences } from '../queries/users.queries'

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
