export const CATEGORY_COLORS: Record<string, string> = {
  Academics: '#db2777',     
  Arts: '#ca8a04',          
  Cultural: '#7f5539',     
  Entertainment: '#15803d',
  Social: '#965da8',        
  Sports: '#1a8cf0',      
}

export const UNCATEGORISED_COLOR = '#64748b'
export const CANCELLED_COLOR = '#ef4444'
export const ARCHIVED_COLOR = '#6b7280'

export const categoryColor = (category?: string | null) =>
  CATEGORY_COLORS[category ?? ''] ?? UNCATEGORISED_COLOR

export const eventColor = (event: { category?: string | null; cancelled_at?: string | null; archived_at?: string | null }) =>
  event.archived_at ? ARCHIVED_COLOR
    : event.cancelled_at ? CANCELLED_COLOR
    : categoryColor(event.category)

export const categoryPillStyle = (category?: string | null) => ({
  style: {
    backgroundColor: categoryColor(category),
    color: '#ffffff',
  },
})

// students only/free: primary, open to public/paid: accent
export const audiencePillClass = (audience?: string | null) =>
  audience === 'students_only' ? 'bg-primary text-white' : 'bg-accent text-white'

export const pricingPillClass = (pricing: unknown) =>
  Number(pricing) === 0 ? 'bg-primary text-white' : 'bg-accent text-white'
