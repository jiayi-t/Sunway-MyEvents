import { startTour, visibleElement, moveWhenPresent } from './tour-base'

// device-local (not tied to the account): organizer accounts are shared by SLB/C&S committee members, so each member's first device gets the tour once
const TOUR_KEY = 'tour_seen_organizer'

export function hasSeenOrganizerTour() {
  return localStorage.getItem(TOUR_KEY) === '1'
}

export function startOrganizerTour(navigate: (to: string) => void) {
  startTour(tour => [
    {
      popover: {
        title: 'Welcome to Sunway <span class="text-accent">MyEvents</span>!',
        description: 'This dashboard is your home base for running events. Here’s a quick tour of what you can do.',
      },
    },
    {
      element: '[data-tour="edit-profile"]',
      popover: {
        title: 'Set up your profile',
        description: 'Add your SLB/C&S logo, about, and social links so students know who you are.',
        side: 'bottom',
        align: 'end',
      },
    },
    {
      element: '[data-tour="new-event"]',
      popover: {
        title: 'Create an event',
        description: 'Tap New to publish an event. Your followers get notified automatically.',
        side: 'top',
      },
    },
    {
      element: '[data-tour="manage-events"]',
      popover: {
        title: 'Manage your events',
        description: 'Open an upcoming event to scan check-in QR codes, view attendees, and edit its feedback form. Open any event to pin it to your profile.',
        side: 'top',
      },
    },
    {
      element: '[data-tour="analytics"]',
      popover: {
        title: 'Track your performance',
        description: 'See attendance, event views and feedback ratings across all your events.',
        side: 'top',
        // the last step lives on the My Events page
        onNextClick: () => {
          navigate('/organizer/events?tab=upcoming')
          moveWhenPresent('[data-tour="create-event-fab"]', () => tour.moveNext())
        },
      },
    },
    {
      element: '[data-tour="create-event-fab"]',
      popover: {
        title: 'Create events from anywhere',
        description: 'This is your Upcoming events page. The + button here also creates a new event.',
        side: 'top',
        align: 'end',
        // on mobile a bottom-pinned popover would cover the + button, so this step and the last one both sit mid-screen instead of moving away and back
        popoverClass: 'tour-pinned tour-pinned-middle',
        // the previous step's anchor is back on the dashboard
        onPrevClick: () => {
          navigate('/organizer/dashboard')
          moveWhenPresent('[data-tour="analytics"]', () => tour.movePrevious())
        },
      },
    },
    {
      element: visibleElement('[data-tour="nav-menu"]'),
      popover: {
        title: 'Replay this tour anytime',
        description: 'Open this menu and tap Website Tour to watch the walkthrough again.<br><br>That’s the end of the tour, good luck with your events!',
        side: 'bottom',
        // stays where the + button step put it rather than dropping back to the bottom for one last step
        popoverClass: 'tour-pinned tour-pinned-middle',
      },
    },
  ], () => {
    localStorage.setItem(TOUR_KEY, '1')
    // redirect back to the dashboard after the tour
    navigate('/organizer/dashboard')
  })
}
