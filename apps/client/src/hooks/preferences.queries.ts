import api from '../services/api'
import { type UseQueryOptions, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export const preferenceKeys = {
  all: ['auth', 'preferences'] as const,
}

export function usePreferencesQuery(options?: Omit<UseQueryOptions<string[]>, 'queryKey' | 'queryFn'>) {
  return useQuery<string[]>({
    queryKey: preferenceKeys.all,
    queryFn: () => api.get('/auth/preferences').then(res => (res.data.preferences || []) as string[]),
    ...options,
  })
}

export function useUpdatePreferencesMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (preferences: string[]) => api.put('/auth/preferences', { preferences }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: preferenceKeys.all })
    },
  })
}
