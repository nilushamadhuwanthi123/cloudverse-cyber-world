import { describe, expect, it } from 'vitest'
import { CURSOR_STATE, approach, cursorStateFor, isDisabled, supportsCustomCursor } from './cursor'

/**
 * A minimal stand-in for the parts of an element this module reads.
 *
 * `closest` compares whole selector tokens rather than doing a substring
 * search. The first version of this stub used `selector.includes(tag)`,
 * which reported a <p> as interactive -- the selector list contains
 * "input", and "input" contains "p". The stub was wrong, not the module,
 * but a stub that lies makes the test worthless.
 */
function el({ tag = 'div', cursor, disabled = false, ariaDisabled, parent = null } = {}) {
  const node = {
    tagName: tag.toUpperCase(),
    dataset: cursor ? { cursor } : {},
    disabled,
    getAttribute: (name) => (name === 'aria-disabled' ? ariaDisabled ?? null : null),
    parent,
  }

  const matches = (selector, element) => {
    if (selector === '[data-cursor]') return Boolean(element.dataset?.cursor)

    const tagName = element.tagName.toLowerCase()
    return selector
      .split(',')
      .map((token) => token.trim())
      // Only the bare tag selectors can match this stub; the attribute
      // and role selectors are not modelled and must not match by luck.
      .some((token) => token === tagName)
  }

  node.closest = (selector) => {
    let current = node
    while (current) {
      if (matches(selector, current)) return current
      current = current.parent
    }
    return null
  }

  return node
}

describe('cursorStateFor', () => {
  it('is normal over something nobody can operate', () => {
    expect(cursorStateFor(el({ tag: 'p' }))).toBe(CURSOR_STATE.NORMAL)
  })

  it('is interactive over a control with nothing more specific to say', () => {
    expect(cursorStateFor(el({ tag: 'button' }))).toBe(CURSOR_STATE.INTERACTIVE)
  })

  it('lets a component declare a more specific state', () => {
    expect(cursorStateFor(el({ tag: 'button', cursor: 'danger' }))).toBe(CURSOR_STATE.DANGER)
    expect(cursorStateFor(el({ tag: 'button', cursor: 'inspect' }))).toBe(CURSOR_STATE.INSPECT)
  })

  it('ignores a declared state that is not one of the six', () => {
    expect(cursorStateFor(el({ tag: 'button', cursor: 'sparkle' }))).toBe(CURSOR_STATE.INTERACTIVE)
  })

  // A control that cannot be used should not advertise itself as an
  // action, whatever it is labelled.
  it('reports disabled ahead of whatever the element declares', () => {
    expect(cursorStateFor(el({ tag: 'button', cursor: 'action', disabled: true }))).toBe(
      CURSOR_STATE.DISABLED
    )
    expect(
      cursorStateFor(el({ tag: 'button', cursor: 'danger', ariaDisabled: 'true' }))
    ).toBe(CURSOR_STATE.DISABLED)
  })

  it('survives being handed nothing', () => {
    expect(cursorStateFor(null)).toBe(CURSOR_STATE.NORMAL)
    expect(cursorStateFor({})).toBe(CURSOR_STATE.NORMAL)
  })
})

describe('isDisabled', () => {
  it('counts the property and the ARIA attribute alike', () => {
    expect(isDisabled(el({ disabled: true }))).toBe(true)
    expect(isDisabled(el({ ariaDisabled: 'true' }))).toBe(true)
    expect(isDisabled(el({}))).toBe(false)
  })
})

describe('supportsCustomCursor', () => {
  // Hiding the native cursor on a device that has no fine pointer would
  // leave someone with nothing at all to aim.
  it('is true only for a fine pointer', () => {
    expect(supportsCustomCursor({ matchMedia: () => ({ matches: true }) })).toBe(true)
    expect(supportsCustomCursor({ matchMedia: () => ({ matches: false }) })).toBe(false)
    expect(supportsCustomCursor({})).toBe(false)
    expect(supportsCustomCursor(null)).toBe(false)
  })
})

describe('approach', () => {
  it('moves a fraction of the way toward the target', () => {
    expect(approach(0, 100, 0.2)).toBeCloseTo(20)
    expect(approach(20, 100, 0.2)).toBeCloseTo(36)
  })

  it('converges rather than overshooting', () => {
    let value = 0
    for (let i = 0; i < 60; i += 1) value = approach(value, 100, 0.18)
    expect(value).toBeGreaterThan(99.9)
    expect(value).toBeLessThanOrEqual(100)
  })

  it('stays put when it is already there', () => {
    expect(approach(42, 42)).toBe(42)
  })
})
