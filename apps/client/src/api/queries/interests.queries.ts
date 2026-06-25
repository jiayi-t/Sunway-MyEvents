import api from '../../services/api'
import { type UseQueryOptions, useQuery } from '@tanstack/react-query'

export const interestKeys = {
  all: ['auth', 'interests'] as const,
}

export function useInterestsQuery(options?: Omit<UseQueryOptions<string[]>, 'queryKey' | 'queryFn'>) {
  return useQuery<string[]>({
    queryKey: interestKeys.all,
    queryFn: () => api.get('/auth/preferences').then(res => (res.data.preferences || []) as string[]),
    ...options,
  })
}
