export interface FeedbackQuestion {
  id: string
  type: 'rating' | 'multiple_choice' | 'open_ended' | 'checkboxes'
  question: string
  options?: string[]
  required: boolean
}

export const DEFAULT_QUESTIONS: FeedbackQuestion[] = [
  { id: 'q_rating', type: 'rating', question: 'How would you rate this event overall?', required: true },
  {
    id: 'q_source', type: 'checkboxes', question: 'How did you hear about this event?', required: true,
    options: ['Campus booths', 'Discord/Telegram channels', 'eLearn announcements', 'iMail blasting', 'ITS Pop Up', 'iZone', 'Physical posters', 'SCTV', 'Social media', 'Vine portal', 'WhatsApp', 'Word of mouth'],
  },
  { id: 'q_suggestions', type: 'open_ended', question: 'Do you have any suggestions to improve future events?', required: true },
]
