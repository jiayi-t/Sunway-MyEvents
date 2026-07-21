import { driver, type Driver, type DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'

// prevent the first tour from being destroyed and the second tour from starting when the user clicks Back/Next quickly
let activeTour: Driver | null = null

// some anchors exist twice (mobile + desktop header), pick the visible one
export const visibleElement = (selector: string) => () =>
  Array.from(document.querySelectorAll<HTMLElement>(selector))
    .find(el => el.offsetParent !== null) ?? document.body

// cross-page steps: wait until the next page has rendered the target before moving
export const moveWhenPresent = (selector: string, move: () => void) => {
  const deadline = Date.now() + 3000
  const tick = () => {
    if (document.querySelector(selector) || Date.now() > deadline) move()
    else requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

// shared driver setup, steps are built after creation so they can call tour.moveNext/movePrevious
export function startTour(buildSteps: (tour: Driver) => DriveStep[], onSeen: () => void) {
  if (activeTour?.isActive()) return

  // follow the element's real box every frame and re-align only when it moves, correct on any device and browser
  let trackRaf = 0
  let lastRectKey = ''
  // record the last re-drove element so it only attempts one re-drive per element, otherwise it would loop infinitely on a hidden element
  let reResolvedFor: HTMLElement | null = null
  const trackElement = () => {
    trackRaf = requestAnimationFrame(trackElement)
    const el = activeTour?.getActiveElement() as HTMLElement | undefined
    // if the element is gone, hidden, or the dummy element used to drive to a non-existent selector, stop tracking and wait for the next step
    if (!el || el === document.body || el.id === 'driver-dummy-element') {
      lastRectKey = ''
      return
    }
    const r = el.getBoundingClientRect()
    // if the element is hidden (0x0), re-drive to it in case it has moved to a different DOM node (mobile vs desktop header)
    if (r.width === 0 && r.height === 0) {
      const i = activeTour?.getActiveIndex()
      if (i !== undefined && reResolvedFor !== el) {
        reResolvedFor = el
        lastRectKey = ''
        activeTour?.moveTo(i)
      }
      return
    }
    reResolvedFor = null
    const key = `${Math.round(r.top)},${Math.round(r.left)},${Math.round(r.width)},${Math.round(r.height)}`
    // if the element has moved, re-align the popover to it
    if (key !== lastRectKey) {
      lastRectKey = key
      activeTour?.refresh()
    }
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
    // force the tracker to re-measure and re-align on the next frame
    onHighlighted: () => { lastRectKey = '' },
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
      cancelAnimationFrame(trackRaf)
      onSeen()
      activeTour = null
    },
  })
  tour.setSteps(buildSteps(tour))
  activeTour = tour
  tour.drive()
  trackElement()
}
