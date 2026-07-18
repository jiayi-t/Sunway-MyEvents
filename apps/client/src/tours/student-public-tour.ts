import { startTour, visibleElement, moveWhenPresent } from './tour-base'

// shared by students and the general public, the seen flag is account-wide
export function startStudentPublicTour(navigate: (to: string) => void, onSeen: () => void) {
  startTour(tour => [
    {
      popover: {
        title: 'Welcome to Sunway <span class="text-accent">MyEvents</span>!',
        description: 'Your one place to discover and join campus events. Here’s a quick tour of how it works.',
      },
    },
    {
      element: '[data-tour="for-you"]',
      popover: {
        title: 'Events picked for you',
        description: 'Recommendations based on your interests. The more events you view and join, the better these get.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="browse-all"]',
      popover: {
        title: 'Browse all events',
        description: 'Tap here to browse all events happening on campus.',
        side: 'bottom',
        align: 'end',
        // next step lives on the Browse page
        onNextClick: () => {
          navigate('/browse')
          moveWhenPresent('[data-tour="browse-search"]', () => tour.moveNext())
        },
      },
    },
    {
      element: '[data-tour="browse-search"]',
      popover: {
        title: 'Browse all events',
        description: 'Search by name, or use the filters and category chips to narrow things down.',
        side: 'bottom',
        onPrevClick: () => {
          navigate('/')
          moveWhenPresent('[data-tour="browse-all"]', () => tour.movePrevious())
        },
        onNextClick: () => {
          navigate('/my-events')
          moveWhenPresent('[data-tour="my-events-tabs"]', () => tour.moveNext())
        },
      },
    },
    {
      element: '[data-tour="my-events-tabs"]',
      popover: {
        title: 'Your events in one place',
        description: 'Upcoming holds events you’ve registered for. Click on the Check In button for an event to get your check-in QR code. Leave feedback under Past, and find bookmarked events under Saved.',
        side: 'bottom',
        onPrevClick: () => {
          navigate('/browse')
          moveWhenPresent('[data-tour="browse-search"]', () => tour.movePrevious())
        },
      },
    },
    {
      element: visibleElement('[data-tour="notifications"]'),
      popover: {
        title: 'Stay in the loop',
        description: 'Event-day reminders, updates and cancellations, and new events from organizers you follow all land here.',
        side: 'bottom',
        // reachable from the Settings page via Back on the next step, so the previous step's anchor may need its page restored
        onPrevClick: () => {
          navigate('/my-events')
          moveWhenPresent('[data-tour="my-events-tabs"]', () => tour.movePrevious())
        },
        onNextClick: () => {
          navigate('/settings?tab=notifications')
          moveWhenPresent('[data-tour="notifications-tab"]', () => tour.moveNext())
        },
      },
    },
    {
      element: '[data-tour="notifications-tab"]',
      popover: {
        title: 'Control your notifications',
        description: 'Choose whether updates also reach you by email, and which kinds of notifications you want.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="interests-tab"]',
      popover: {
        title: 'Tune your interests',
        description: 'Update your interests anytime. Your recommendations follow what you pick here.',
        side: 'bottom',
      },
    },
    {
      element: visibleElement('[data-tour="nav-menu"]'),
      popover: {
        title: 'Replay this tour anytime',
        description: 'Open this menu and tap Website Tour to watch the walkthrough again.<br><br>That’s the end of the tour, see you at the events!',
        side: 'bottom',
      },
    },
  ], onSeen)
}
