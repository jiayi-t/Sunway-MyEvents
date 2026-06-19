import api from '../../services/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { feedbackKeys, type FeedbackQuestion } from '../queries/feedback.queries'

export function useSaveFeedbackFormMutation(eventId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (questions: FeedbackQuestion[]) =>
      api.put(`/events/${eventId}/feedback-form`, { questions }).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedbackKeys.feedbackForm(eventId) })
    },
  })
}

export function useSubmitFeedbackMutation(eventId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { rating: number; answers?: Record<string, unknown> }) =>
      api.post(`/events/${eventId}/feedback`, data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedbackKeys.my })
    },
  })
}
