import api from '../../services/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { interestKeys, timePreferenceKeys, type TimeRange } from '../queries/interests.queries'
import { eventKeys } from '../queries/events.queries'

export function useUpdateInterestsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (interests: string[]) => api.put('/auth/interests', { interests }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: interestKeys.all })
      queryClient.invalidateQueries({ queryKey: eventKeys.recommendations })
    },
  })
}

export function useUpdateTimePreferencesMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (preferred_time_ranges: TimeRange | null) => api.put('/auth/time-preferences', { preferred_time_ranges }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timePreferenceKeys.all })
      queryClient.invalidateQueries({ queryKey: eventKeys.recommendations })
    },
  })
}
