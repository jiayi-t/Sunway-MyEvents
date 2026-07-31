import api from '../../services/api'
import { type UseQueryOptions, useQuery } from '@tanstack/react-query'

export const analyticsKeys = {
  attendance: ['analytics', 'attendance'] as const,
  feedback: ['analytics', 'feedback'] as const,
  views: ['analytics', 'views'] as const,
  activity: ['analytics', 'activity'] as const,
  eventAnalytics: (id: string | undefined) => ['analytics', 'event', id] as const,
  eventAiSummary: (id: string | undefined) => ['analytics', 'event', id, 'ai-summary'] as const,
}

export interface AttendanceEvent {
  id: string
  name: string
  date: string
  image_url: string | null
  registrations: number
  attendees: number
  attendance_rate: number
}

export interface AttendanceAnalytics {
  totals: {
    total_registrations: number
    total_attendees: number
    attendance_rate: number
  }
  events: AttendanceEvent[]
}

export interface FeedbackEvent {
  id: string
  name: string
  date: string
  image_url: string | null
  registrations: number
  feedback_count: number
  avg_rating: number
  feedback_rate: number
}

export interface FeedbackAnalytics {
  totals: {
    total_feedback: number
    total_registrations: number
    avg_rating: number
    feedback_rate: number
  }
  rating_distribution: Record<string, number>
  events: FeedbackEvent[]
}

export type QuestionAnalysis =
  | { question: string; type: 'open_ended'; responses: string[] }
  | { question: string; type: string; options?: string[]; responses: Record<string, number> }

export interface EventAnalytics {
  event: { id: string; name: string; date: string; image_url: string | null }
  attendance: { registrations: number; attendees: number; attendance_rate: number }
  views: { total_views: number; unique_viewers: number }
  feedback: {
    count: number
    avg_rating: number
    feedback_rate: number
    rating_distribution: Record<string, number>
    questions: QuestionAnalysis[]
  }
  demographics: {
    gender_distribution: { gender: string; count: number }[]
    faculty_distribution: { faculty: string; count: number }[]
    programme_distribution: { programme: string; count: number }[]
    year_distribution: { year: string; count: number }[]
  } | null
}

export interface AiSummaryQuestion {
  question: string
  points: string[]
}

export interface EventAiSummary {
  available: boolean
  reason?: string
  summary?: { questions: AiSummaryQuestion[] }
  feedback_count?: number
  generated_at?: string
}

export interface ViewsEvent {
  id: string
  name: string
  date: string
  image_url: string | null
  total_views: number
  unique_viewers: number
}

export interface ViewsAnalytics {
  totals: {
    total_views: number
    unique_viewers: number
    avg_views_per_event: number
  }
  events: ViewsEvent[]
}

export function useAttendanceAnalyticsQuery(options?: Omit<UseQueryOptions<AttendanceAnalytics>, 'queryKey' | 'queryFn'>) {
  return useQuery<AttendanceAnalytics>({
    queryKey: analyticsKeys.attendance,
    queryFn: () => api.get('/analytics/attendance').then(res => res.data),
    ...options,
  })
}

export function useFeedbackAnalyticsQuery(options?: Omit<UseQueryOptions<FeedbackAnalytics>, 'queryKey' | 'queryFn'>) {
  return useQuery<FeedbackAnalytics>({
    queryKey: analyticsKeys.feedback,
    queryFn: () => api.get('/analytics/feedback').then(res => res.data),
    ...options,
  })
}

export function useViewsAnalyticsQuery(options?: Omit<UseQueryOptions<ViewsAnalytics>, 'queryKey' | 'queryFn'>) {
  return useQuery<ViewsAnalytics>({
    queryKey: analyticsKeys.views,
    queryFn: () => api.get('/analytics/views').then(res => res.data),
    ...options,
  })
}

export function useEventAnalyticsQuery(id: string | undefined, options?: Omit<UseQueryOptions<EventAnalytics>, 'queryKey' | 'queryFn'>) {
  return useQuery<EventAnalytics>({
    queryKey: analyticsKeys.eventAnalytics(id),
    queryFn: () => api.get(`/analytics/events/${id}`).then(res => res.data),
    enabled: !!id,
    ...options,
  })
}

export function useEventAiSummaryQuery(id: string | undefined, options?: Omit<UseQueryOptions<EventAiSummary>, 'queryKey' | 'queryFn'>) {
  return useQuery<EventAiSummary>({
    queryKey: analyticsKeys.eventAiSummary(id),
    queryFn: () => api.get(`/analytics/events/${id}/ai-summary`).then(res => res.data),
    enabled: !!id,
    // each retry is a potential Gemini API call
    retry: false, 
    staleTime: 5 * 60 * 1000,
    ...options,
  })
}

export interface ActivityItem {
  type: 'registration' | 'feedback' | 'follower'
  // followers are not tied to an event
  event_id: string | null
  event_name: string | null
  count: number
  last_at: string
}

export function useOrganizerActivityQuery(options?: Omit<UseQueryOptions<ActivityItem[]>, 'queryKey' | 'queryFn'>) {
  return useQuery<ActivityItem[]>({
    queryKey: analyticsKeys.activity,
    queryFn: () => api.get('/analytics/activity').then(res => res.data),
    ...options,
  })
}
