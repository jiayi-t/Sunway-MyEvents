import api from '../../services/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { preferenceKeys } from '../queries/preferences.queries'

export function useUpdatePreferencesMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (preferences: string[]) => api.put('/auth/preferences', { preferences }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: preferenceKeys.all })
    },
  })
}
