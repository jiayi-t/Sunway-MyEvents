import { driver, type Driver, type DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'

// prevent the first tour from being destroyed and the second tour from starting when the user clicks Back/Next quickly
let activeTour: Driver | null = null

// lets the router skip its scroll-to-top so it does not interfere with driver.js's own scroll during cross-page steps
export const isTourActive = () => !!activeTour?.isActive()

// locks page scroll during the tour
const SCROLL_KEYS = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End']

const blockGesture = (e: Event) => e.preventDefault()

const blockScrollKeys = (e: KeyboardEvent) => {
  if (!SCROLL_KEYS.includes(e.key)) return
  // let the popover's own buttons and any focused field keep their key handling
  const target = e.target as HTMLElement | null
  if (target?.closest('input, textarea, select, button, [contenteditable]')) return
  e.preventDefault()
}

const lockScroll = () => {
  window.addEventListener('wheel', blockGesture, { passive: false })
  window.addEventListener('touchmove', blockGesture, { passive: false })
  window.addEventListener('keydown', blockScrollKeys)
}

const unlockScroll = () => {
  window.removeEventListener('wheel', blockGesture)
  window.removeEventListener('touchmove', blockGesture)
  window.removeEventListener('keydown', blockScrollKeys)
}

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
  // the element driver.js holds is stale once a breakpoint swap replaces it with a different element, so re-drive to pick up the new node and its box
  const resolveStepTarget = (): HTMLElement | null => {
    const def = activeTour?.getActiveStep()?.element
    if (!def) return null
    const node = typeof def === 'function' ? def() : typeof def === 'string' ? document.querySelector(def) : def
    // driver.js highlights nothing when the selector was missing at drive time, so recover as soon as the real element appears, otherwise the step stays dimmed with no stage for the rest of the tour
    return node && node !== document.body ? (node as HTMLElement) : null
  }

  const trackElement = () => {
    trackRaf = requestAnimationFrame(trackElement)
    const el = activeTour?.getActiveElement() as HTMLElement | undefined
    // if the element is gone, or is the dummy element driver.js uses when the selector was missing, or is the body, re-drive to pick up the real element and its box
    if (!el || el === document.body || el.id === 'driver-dummy-element') {
      lastRectKey = ''
      const target = resolveStepTarget()
      const i = activeTour?.getActiveIndex()
      if (target && i !== undefined) {
        const tr = target.getBoundingClientRect()
        if (tr.width > 0 || tr.height > 0) activeTour?.moveTo(i)
      }
      return
    }
    // the node driver.js holds is stale once a breakpoint swap replaces it with a different element
    const current = resolveStepTarget()
    if (current && current !== el) {
      const i = activeTour?.getActiveIndex()
      if (i !== undefined) {
        lastRectKey = ''
        activeTour?.moveTo(i)
        return
      }
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

  // debounced because a dragged resize fires this continuously, only re-align after the user has stopped resizing for a moment
  let resizeTimer = 0
  const onResize = () => {
    window.clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(() => {
      const i = activeTour?.getActiveIndex()
      if (i === undefined) return
      lastRectKey = ''
      reResolvedFor = null
      activeTour?.moveTo(i)
    }, 150)
  }

  const tour = driver({
    showProgress: true,
    // pinned to a fixed spot on screen 
    popoverClass: 'tour-pinned',
    allowClose: false,
    showButtons: ['next', 'previous'],
    overlayOpacity: 0.6,
    stagePadding: 6,
    stageRadius: 12,
    nextBtnText: 'Next',
    prevBtnText: 'Back',
    doneBtnText: 'Done',
    // force the tracker to re-measure and re-align on the next frame
    onHighlighted: () => {
      lastRectKey = ''
      // scroll the target of every step into a safe band 
      const el = activeTour?.getActiveElement() as HTMLElement | undefined
      if (!el || el === document.body) return
      const headerHeight = document.querySelector('header')?.getBoundingClientRect().height ?? 0
      const popoverHeight = document.querySelector('.driver-popover')?.getBoundingClientRect().height ?? 0
      const buffer = 12
      const safeTop = headerHeight + buffer
      const safeBottom = window.innerHeight - popoverHeight - buffer
      const rect = el.getBoundingClientRect()
      if (rect.top < safeTop) window.scrollBy({ top: rect.top - safeTop })
      else if (rect.bottom > safeBottom) window.scrollBy({ top: rect.bottom - safeBottom })
    },
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
      window.clearTimeout(resizeTimer)
      window.removeEventListener('resize', onResize)
      unlockScroll()
      onSeen()
      activeTour = null
    },
  })
  const steps = buildSteps(tour)
  tour.setSteps(steps)
  activeTour = tour
  lockScroll()
  window.addEventListener('resize', onResize)
  // an elementless first step has nothing for driver.js to scroll to, so scroll to the top 
  if (!steps[0]?.element) window.scrollTo({ top: 0 })
  tour.drive()
  trackElement()
}
