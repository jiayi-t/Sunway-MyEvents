import api from '../services/api'
import { type UseQueryOptions, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export const eventKeys = {
  all: ['events'] as const,
  detail: (id: string | undefined) => ['events', id] as const,
  organizer: ['events', 'organizer'] as const,
  saved: ['events', 'saved'] as const,
  registrationStatus: (id: string | undefined) => ['events', id, 'registration-status'] as const,
  saveStatus: (id: string | undefined) => ['events', id, 'save-status'] as const,
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

export function useRegisterEventMutation(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post(`/events/${id}/register`).then(res => res.data),
    onSuccess: () => {
      queryClient.setQueryData(eventKeys.registrationStatus(id), true)
    },
  })
}

export function useToggleSaveMutation(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post(`/events/${id}/save-toggle`).then(res => res.data),
    onSuccess: (data: { saved: boolean }) => {
      queryClient.setQueryData(eventKeys.saveStatus(id), data.saved)
      queryClient.invalidateQueries({ queryKey: eventKeys.saved })
    },
  })
}

export function useCreateEventMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/events', data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.organizer })
    },
  })
}

export function useUpdateEventMutation(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.put(`/events/${id}`, data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: eventKeys.organizer })
    },
  })
}

export function useCancelEventMutation(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.patch(`/events/${id}/cancel`).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(id) })
    },
  })
}

export function useArchiveEventMutation(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.patch(`/events/${id}/archive`).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.organizer })
    },
  })
}
