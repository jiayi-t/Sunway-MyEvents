import api from '../../services/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { interestKeys } from '../queries/interests.queries'

export function useUpdateInterestsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (interests: string[]) => api.put('/auth/interests', { interests }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: interestKeys.all })
    },
  })
}
