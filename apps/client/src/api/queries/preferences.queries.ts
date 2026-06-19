import api from '../../services/api'
import { type UseQueryOptions, useQuery } from '@tanstack/react-query'

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
