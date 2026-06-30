import api from '../../services/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { eventKeys } from '../queries/events.queries'

export function useRegisterEventMutation(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post(`/events/${id}/register`).then(res => res.data),
    onSuccess: () => {
      queryClient.setQueryData(eventKeys.registrationStatus(id), true)
      queryClient.invalidateQueries({ queryKey: eventKeys.recommendations })
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

export function useRecordViewMutation(id: string | undefined) {
  return useMutation({
    mutationFn: () => api.post(`/events/${id}/view`).then(res => res.data),
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
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(id) })
    },
  })
}

export function useUnarchiveEventMutation(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.patch(`/events/${id}/unarchive`).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.organizer })
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(id) })
    },
  })
}
