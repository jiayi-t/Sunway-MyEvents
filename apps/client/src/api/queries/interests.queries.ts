import api from '../../services/api'
import { type UseQueryOptions, useQuery } from '@tanstack/react-query'

export const interestKeys = {
  all: ['auth', 'interests'] as const,
}

export function useInterestsQuery(options?: Omit<UseQueryOptions<string[]>, 'queryKey' | 'queryFn'>) {
  return useQuery<string[]>({
    queryKey: interestKeys.all,
    queryFn: () => api.get('/auth/interests').then(res => (res.data.interests || []) as string[]),
    ...options,
  })
}

export const timePreferenceKeys = {
  all: ['auth', 'time-preferences'] as const,
}

export type TimeRange = { from: string; to: string }

export function useTimePreferencesQuery(options?: Omit<UseQueryOptions<TimeRange | null>, 'queryKey' | 'queryFn'>) {
  return useQuery<TimeRange | null>({
    queryKey: timePreferenceKeys.all,
    queryFn: () => api.get('/auth/time-preferences').then(res => (res.data.preferred_time_ranges as TimeRange | null) ?? null),
    ...options,
  })
}
