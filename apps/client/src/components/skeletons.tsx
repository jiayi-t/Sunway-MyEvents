// shared skeleton loaders shown while queries are in flight, shapes mirror the real cards they replace

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
}

// horizontal event card used in browse, For You and my-events lists
export function EventCardSkeleton() {
  return (
    <div className="bg-card rounded-xl shadow flex gap-3 p-3 items-center">
      <div
        className="flex-shrink-0 rounded-lg animate-pulse bg-gray-200"
        style={{ width: '100px', aspectRatio: '4/5' }}
      />
      <div className="flex-1 min-w-0">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/3 mt-2" />
        <div className="mt-3 space-y-1.5">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-2/5" />
          <Skeleton className="h-3 w-3/5" />
        </div>
      </div>
    </div>
  )
}

export function EventListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => <EventCardSkeleton key={i} />)}
    </div>
  )
}

// featured carousel card on the home page (rendered on the dark primary background)
export function FeaturedEventSkeleton() {
  return (
    <div className="max-w-3xl mx-auto rounded-xl overflow-hidden shadow-md bg-white">
      <div className="w-full animate-pulse bg-gray-200" style={{ aspectRatio: '4/5' }} />
      <div className="p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-1/3 mt-2" />
        <div className="mt-3 space-y-2">
          <Skeleton className="h-3.5 w-1/2" />
          <Skeleton className="h-3.5 w-2/5" />
          <Skeleton className="h-3.5 w-3/5" />
        </div>
      </div>
    </div>
  )
}

// event details poster + info section (pages keep their own sub-header above this)
export function EventDetailsSkeleton() {
  return (
    <div>
      <div className="w-full animate-pulse bg-gray-200" style={{ aspectRatio: '4/5' }} />
      <div className="p-4">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-3 w-1/3 mt-2" />
        <div className="mt-4 space-y-2">
          <Skeleton className="h-3.5 w-1/2" />
          <Skeleton className="h-3.5 w-2/5" />
          <Skeleton className="h-3.5 w-3/5" />
        </div>
        <Skeleton className="h-24 w-full mt-4" />
      </div>
    </div>
  )
}

// notification rows
export function NotificationListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="px-4 pt-4 space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="bg-card rounded-xl shadow p-3 flex gap-3 items-start">
          <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
          <div className="flex-1">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-full mt-2" />
            <Skeleton className="h-3 w-2/3 mt-1.5" />
          </div>
        </div>
      ))}
    </div>
  )
}

// stacked form/settings card sections (heading + field blocks)
export function FormSkeleton({ sections = 2 }: { sections?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: sections }, (_, i) => (
        <div key={i} className="bg-card rounded-xl shadow p-4">
          <Skeleton className="h-4 w-1/2" />
          <div className="mt-4 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

// settings profile tab (avatar + label/value rows)
export function ProfileInfoSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div>
      <div className="flex justify-center mb-4">
        <Skeleton className="w-16 h-16 rounded-full" />
      </div>
      <div className="bg-card rounded-xl shadow overflow-hidden">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
            <Skeleton className="h-3.5 w-28 flex-shrink-0" />
            <Skeleton className="h-3.5 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  )
}

// analytics tab (stat tile row + event rows with thumbnail)
export function AnalyticsTabSkeleton() {
  return (
    <div>
      <div className="mx-4 mt-4 bg-card rounded-2xl shadow-sm">
        <div className="flex divide-x divide-border py-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 px-2">
              <Skeleton className="h-7 w-12" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
      <div className="mx-4 mt-5 space-y-2">
        {[0, 1, 2].map(i => (
          <div key={i} className="bg-card rounded-2xl shadow-sm flex items-center gap-3 p-3">
            <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/3 mt-2" />
            </div>
            <Skeleton className="h-4 w-10 flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}

// student/public QR check-in card (includes the page sub-header)
export function CheckinCardSkeleton() {
  return (
    <div className="bg-surface">
      <div className="bg-primary px-4 py-3 flex items-center gap-3">
        <h1 className="text-white font-bold text-base flex-1 text-center">Check In</h1>
      </div>
      <div className="px-4 py-6">
        <div className="bg-card rounded-xl shadow p-6 flex flex-col items-center">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3 mt-2" />
          <Skeleton className="w-48 h-48 mt-4 rounded-lg" />
          <Skeleton className="h-3 w-2/5 mt-4" />
        </div>
      </div>
    </div>
  )
}

// participant-style rows (avatar + two lines)
export function ListRowsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="bg-card rounded-xl px-4 py-3 flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-2/3 mt-1.5" />
          </div>
        </div>
      ))}
    </div>
  )
}
