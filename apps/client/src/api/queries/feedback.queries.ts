import api from '../../services/api'
import { useQuery } from '@tanstack/react-query'

export type QuestionType = 'rating' | 'multiple_choice' | 'checkboxes' | 'open_ended'

export interface FeedbackQuestion {
  id: string
  type: QuestionType
  question: string
  options?: string[]
  required: boolean
}

export const DEFAULT_QUESTIONS: FeedbackQuestion[] = [
  { id: 'q_rating', type: 'rating', question: 'How would you rate this event overall?', required: true },
  {
    id: 'q_source', type: 'checkboxes', question: 'How did you hear about this event?', required: true,
    options: ['Campus booths', 'Discord/Telegram channels', 'eLearn announcements', 'iMail blasting', 'ITS Pop Up', 'iZone', 'Physical posters', 'SCTV', 'Social media', 'Vine portal', 'WhatsApp', 'Word of mouth']
  },
  { id: 'q_suggestions', type: 'open_ended', question: 'Do you have any suggestions to improve future events?', required: true },
]

export const feedbackKeys = {
  my: ['feedback', 'my'] as const,
  eventFeedback: (id: string | undefined) => ['feedback', 'event', id] as const,
  feedbackForm: (id: string | undefined) => ['feedback', 'form', id] as const,
}

export interface MyFeedback {
  id: number
  event_id: number
  rating: number
  created_at: string
}

export function useMyFeedbackQuery() {
  return useQuery<MyFeedback[]>({
    queryKey: feedbackKeys.my,
    queryFn: () => api.get('/feedback/my').then(res => res.data),
  })
}

export function useEventFeedbackQuery(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: feedbackKeys.eventFeedback(id),
    queryFn: () => api.get(`/events/${id}/feedback`).then(res => res.data),
    enabled: !!id && enabled,
  })
}

export function useFeedbackFormQuery(id: string | undefined) {
  return useQuery<{ questions: FeedbackQuestion[] }>({
    queryKey: feedbackKeys.feedbackForm(id),
    queryFn: () => api.get(`/events/${id}/feedback-form`).then(res => res.data),
    enabled: !!id,
  })
}