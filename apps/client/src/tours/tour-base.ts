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
      onSeen()
      activeTour = null
    },
  })
  tour.setSteps(buildSteps(tour))
  activeTour = tour
  tour.drive()
}
