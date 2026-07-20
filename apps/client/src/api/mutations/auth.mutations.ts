import { useMutation } from '@tanstack/react-query'
import api from '../../services/api'

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: (data: { email: string }) =>
      api.post('/auth/forgot-password', data).then(res => res.data),
  })
}

// seeded demo accounts get is_seeded back and the password is left untouched
export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: (data: { token: string; password: string }) =>
      api.post('/auth/reset-password', data).then(res => res.data as { message: string; is_seeded?: boolean }),
  })
}

// change password while logged in (organizer/public), returns a fresh token for this session
// seeded demo accounts get is_seeded and no token: nothing was persisted, so the current session stays valid
export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.post('/auth/change-password', data)
        .then(res => res.data as { message: string; is_seeded?: boolean }),
  })
}

// marks the first-login walkthrough as seen on the account (student/public)
export function useCompleteTourMutation() {
  return useMutation({
    mutationFn: () =>
      api.patch('/auth/tour-completed').then(res => res.data as { tour_completed_at: string }),
  })
}
