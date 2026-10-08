/**
 * Progressive enhancement for term popovers: open on hover and keyboard
 * focus, close on leave. A click (or tap) pins the popover open until it is
 * dismissed. Without this script, the native popover still opens on click,
 * tap, Enter and Space.
 */
const DELAY = 150
const supported = typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype

function enhance(button) {
  const pop = document.getElementById(button.getAttribute('popovertarget'))
  if (!pop || button.dataset.rlHover) return
  button.dataset.rlHover = '1'
  let byHover = false
  let pinned = false
  let timer
  const open = () => {
    clearTimeout(timer)
    if (!pop.matches(':popover-open')) { pop.showPopover(); byHover = true }
  }
  const close = () => {
    clearTimeout(timer)
    timer = setTimeout(() => { if (byHover && !pinned && pop.matches(':popover-open')) pop.hidePopover() }, DELAY)
  }
  const mouse = (e) => e.pointerType === 'mouse'
  button.addEventListener('pointerenter', (e) => mouse(e) && open())
  button.addEventListener('pointerleave', (e) => mouse(e) && close())
  pop.addEventListener('pointerenter', (e) => mouse(e) && clearTimeout(timer))
  pop.addEventListener('pointerleave', (e) => mouse(e) && close())
  button.addEventListener('focus', () => { if (button.matches(':focus-visible')) open() })
  button.addEventListener('blur', (e) => { if (!pop.contains(e.relatedTarget)) close() })
  pop.addEventListener('focusout', (e) => { if (!pop.contains(e.relatedTarget) && e.relatedTarget !== button) close() })
  // Opened by hover or focus: the click pins it instead of toggling it shut.
  button.addEventListener('click', (e) => {
    if (byHover && pop.matches(':popover-open') && !pinned) { e.preventDefault(); pinned = true }
  })
  pop.addEventListener('toggle', (e) => { if (e.newState === 'closed') { byHover = false; pinned = false } })
}

function init() {
  if (!supported) return
  for (const b of document.querySelectorAll('button.rl-term[popovertarget]')) enhance(b)
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
else init()
document.addEventListener('astro:page-load', init)
