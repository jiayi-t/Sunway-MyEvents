import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

// device-local (not tied to the account): organizer accounts are shared by SLB/C&S committee members, so each member's first device gets the tour once
const TOUR_KEY = 'tour_seen_organizer'

// preventing the first tour from being destroyed and the second tour from starting when the user clicks Back/Next quickly
let activeTour: ReturnType<typeof driver> | null = null

export function hasSeenOrganizerTour() {
  return localStorage.getItem(TOUR_KEY) === '1'
}

export function startOrganizerTour(navigate: (to: string) => void) {
  if (activeTour?.isActive()) return

  // cross-page steps: wait until the next page has rendered the target before moving
  const moveWhenPresent = (selector: string, move: () => void) => {
    const deadline = Date.now() + 3000
    const tick = () => {
      if (document.querySelector(selector) || Date.now() > deadline) move()
      else requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  const tour = driver({
    showProgress: true,
    allowClose: false,
    showButtons: ['next', 'previous'],
    overlayOpacity: 0.6,
    stagePadding: 6,
    stageRadius: 12,
    nextBtnText: 'Next',
    prevBtnText: 'Back',
    doneBtnText: 'Done',
    onPopoverRender: (popover) => {
      // on the last step Done already ends the tour, so no Skip there
      if (tour.isLastStep()) return
      const skip = document.createElement('button')
      skip.innerText = 'Skip'
      skip.className = 'driver-popover-skip-btn'
      skip.onclick = () => tour.destroy()
      popover.wrapper.appendChild(skip)
    },
    // fires on Done and Skip, skipping counts as seen
    onDestroyed: () => {
      localStorage.setItem(TOUR_KEY, '1')
      activeTour = null
    },
    steps: [
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
          description: 'Open an upcoming event to scan check-in QR codes, view attendees, and edit its feedback form. Open a past event to pin it to your profile.',
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
          // the previous step's anchor is back on the dashboard
          onPrevClick: () => {
            navigate('/organizer/dashboard')
            moveWhenPresent('[data-tour="analytics"]', () => tour.movePrevious())
          },
        },
      },
      {
        // the menu trigger differs by viewport (hamburger vs user dropdown);
        // highlight whichever is visible
        element: () =>
          Array.from(document.querySelectorAll<HTMLElement>('[data-tour="nav-menu"]'))
            .find(el => el.offsetParent !== null) ?? document.body,
        popover: {
          title: 'Replay this tour anytime',
          description: 'Open this menu and tap Website Tour to watch the walkthrough again.<br><br>That’s the end of the tour, good luck with your events!',
          side: 'bottom',
        },
      },
    ],
  })
  activeTour = tour
  tour.drive()
}
