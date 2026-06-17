import api from '../services/api'
import { type UseQueryOptions, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export const registrationKeys = {
  my: ['registrations', 'my'] as const,
  eventParticipants: (eventId: string | undefined) => ['registrations', 'event', eventId] as const,
}

export function useMyRegistrationsQuery(options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: registrationKeys.my,
    queryFn: () => api.get('/registrations/my').then(res => res.data),
    ...options,
  })
}

export function useEventParticipantsQuery(eventId: string | undefined) {
  return useQuery({
    queryKey: registrationKeys.eventParticipants(eventId),
    queryFn: () => api.get(`/registrations/event/${eventId}`).then(res => res.data),
    enabled: !!eventId,
  })
}

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
