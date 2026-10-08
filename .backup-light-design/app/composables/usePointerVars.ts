/**
 * Writes the pointer's position inside an element to `--mx` / `--my` so CSS
 * can place a gradient or offset a background there.
 *
 * Deliberately not reactive: `pointermove` fires on every frame, and routing
 * that through a ref would re-render the component each time. Setting the
 * custom property on the node keeps the work in the compositor and off Vue's
 * scheduler entirely.
 */
export function trackPointerVars(event: PointerEvent) {
  const el = event.currentTarget as HTMLElement | null
  if (!el) return

  const rect = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${event.clientX - rect.left}px`)
  el.style.setProperty('--my', `${event.clientY - rect.top}px`)
}
