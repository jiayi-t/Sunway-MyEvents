import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'

export function useValidateResetTokenQuery(token: string | null) {
  return useQuery({
    queryKey: ['reset-token', token],
    queryFn: () => api.get(`/auth/validate-reset-token?token=${token}`).then(res => res.data as { valid: boolean }),
    enabled: !!token,
    retry: false,
  })
}
