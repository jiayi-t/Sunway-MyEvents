import api from '../../services/api'
import { type UseQueryOptions, useQuery } from '@tanstack/react-query'

export const eventKeys = {
  all: ['events'] as const,
  detail: (id: string | undefined) => ['events', id] as const,
  organizer: ['events', 'organizer'] as const,
  saved: ['events', 'saved'] as const,
  recommendations: ['events', 'recommendations'] as const,
  registrationStatus: (id: string | undefined) => ['events', id, 'registration-status'] as const,
  saveStatus: (id: string | undefined) => ['events', id, 'save-status'] as const,
  checkinToken: (id: string | undefined) => ['events', id, 'checkin-token'] as const,
}

export function useEventsQuery(options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: eventKeys.all,
    queryFn: () => api.get('/events').then(res => res.data),
    ...options,
  })
}

export function useEventQuery(id: string | undefined, options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => api.get(`/events/${id}`).then(res => res.data),
    enabled: !!id,
    ...options,
  })
}

export function useOrganizerEventsQuery(options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: eventKeys.organizer,
    queryFn: () => api.get('/events/organizer-events').then(res => res.data),
    ...options,
  })
}

export function useSavedEventsQuery(options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: eventKeys.saved,
    queryFn: () => api.get('/events/saved-events').then(res => res.data),
    ...options,
  })
}

export function useRegistrationStatusQuery(id: string | undefined, enabled: boolean, options?: Omit<UseQueryOptions<boolean>, 'queryKey' | 'queryFn'>) {
  return useQuery<boolean>({
    queryKey: eventKeys.registrationStatus(id),
    queryFn: () => api.get(`/events/${id}/registration-status`).then(res => res.data.registered as boolean),
    enabled: !!id && enabled,
    ...options,
  })
}

export function useSaveStatusQuery(id: string | undefined, enabled: boolean, options?: Omit<UseQueryOptions<boolean>, 'queryKey' | 'queryFn'>) {
  return useQuery<boolean>({
    queryKey: eventKeys.saveStatus(id),
    queryFn: () => api.get(`/events/${id}/save-status`).then(res => res.data.saved as boolean),
    enabled: !!id && enabled,
    ...options,
  })
}

export function useRecommendationsQuery(enabled: boolean, options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: eventKeys.recommendations,
    queryFn: () => api.get('/recommendations').then(res => res.data),
    enabled,
    staleTime: 5 * 60 * 1000,
    ...options,
  })
}

export function useCheckinTokenQuery(id: string | undefined) {
  return useQuery({
    queryKey: eventKeys.checkinToken(id),
    queryFn: () => api.get(`/events/${id}/checkin-token`).then(res => res.data.token as string),
    enabled: !!id,
    // token is valid until the end of the event
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
}
