import api from '../../services/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { registrationKeys } from '../queries/registrations.queries'

export function useCheckinMutation(eventId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (token: string) =>
      api.post('/registrations/checkin', { token }).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: registrationKeys.eventParticipants(eventId) })
    },
  })
}

export function useManualCheckinMutation(eventId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (registrationId: number) =>
      api.post('/registrations/checkin/manual', { registrationId }).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: registrationKeys.eventParticipants(eventId) })
    },
  })
}
