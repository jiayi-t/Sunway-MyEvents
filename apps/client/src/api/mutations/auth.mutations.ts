import { useMutation } from '@tanstack/react-query'
import api from '../../services/api'

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: (data: { email: string }) =>
      api.post('/auth/forgot-password', data).then(res => res.data),
  })
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: (data: { token: string; password: string }) =>
      api.post('/auth/reset-password', data).then(res => res.data),
  })
}

// marks the first-login walkthrough as seen on the account (student/public)
export function useCompleteTourMutation() {
  return useMutation({
    mutationFn: () =>
      api.patch('/auth/tour-completed').then(res => res.data as { tour_completed_at: string }),
  })
}
