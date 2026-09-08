/**
 * What the pointer is over, expressed as a cursor state.
 *
 * Kept out of the component so the mapping can be tested as a plain
 * function: given an element, which of the six states applies. The
 * component's job is only to move a ring around and wear the answer.
 *
 * The states are not decorative. They say what kind of thing the next
 * click is -- inspecting evidence, taking a scored action, doing
 * something destructive -- which is information the interface has and
 * usually throws away.
 */

export const CURSOR_STATE = {
  NORMAL: 'normal',
  INTERACTIVE: 'interactive',
  INSPECT: 'inspect',
  ACTION: 'action',
  DANGER: 'danger',
  DISABLED: 'disabled',
}

const STATES = new Set(Object.values(CURSOR_STATE))

/** Anything a person can operate, whether or not it is a button. */
const INTERACTIVE_SELECTOR = [
  'button',
  'a[href]',
  'input',
  'select',
  'textarea',
  'summary',
  '[role="tab"]',
  '[role="switch"]',
  '[role="button"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * The state for one element.
 *
 * An explicit `data-cursor` wins, so a component can say "this is a
 * destructive control" without this module needing to know the class
 * names of every feature. Everything else falls back to whether the
 * element is operable at all.
 *
 * Disabled is checked before the explicit state: a control that cannot
 * be used should not advertise itself as an action, whatever it is
 * labelled.
 */
export function cursorStateFor(element) {
  if (!element || typeof element.closest !== 'function') return CURSOR_STATE.NORMAL

  const operable = element.closest(INTERACTIVE_SELECTOR)
  if (operable && isDisabled(operable)) return CURSOR_STATE.DISABLED

  const declared = element.closest('[data-cursor]')
  if (declared) {
    const state = declared.dataset.cursor
    if (STATES.has(state)) return state
  }

  return operable ? CURSOR_STATE.INTERACTIVE : CURSOR_STATE.NORMAL
}

/** Disabled by the property or by the ARIA attribute -- both count. */
export function isDisabled(element) {
  return element.disabled === true || element.getAttribute('aria-disabled') === 'true'
}

/**
 * Whether this device should get the custom cursor at all.
 *
 * A fine pointer is the only case where replacing the native cursor is
 * an improvement. On touch there is no cursor to replace, and hiding
 * the native one on a device that falls back to a coarse pointer would
 * leave someone with nothing.
 */
export function supportsCustomCursor(win = typeof window === 'undefined' ? null : window) {
  if (!win?.matchMedia) return false
  return win.matchMedia('(pointer: fine)').matches
}

/**
 * One step of easing toward a target.
 *
 * The ring trails the pointer rather than pinning to it, which is what
 * makes the cursor feel like an instrument rather than a sprite. Pure,
 * so the motion can be checked without a browser.
 */
export function approach(current, target, factor = 0.18) {
  return current + (target - current) * factor
}
