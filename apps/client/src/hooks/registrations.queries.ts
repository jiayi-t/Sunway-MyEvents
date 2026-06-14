import api from '../services/api'
import { type UseQueryOptions, useQuery } from '@tanstack/react-query'

export const registrationKeys = {
  my: ['registrations', 'my'] as const,
}

export function useMyRegistrationsQuery(options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: registrationKeys.my,
    queryFn: () => api.get('/registrations/my').then(res => res.data),
    ...options,
  })
}
