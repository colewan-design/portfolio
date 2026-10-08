export type Theme = 'light' | 'dark' | 'system'

export const THEMES: Theme[] = ['light', 'dark', 'system']

const STORAGE_KEY = 'theme'

function resolve(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function paint(theme: Theme) {
  const dark = resolve(theme) === 'dark'
  const root = document.documentElement
  root.classList.toggle('dark', dark)
  root.style.colorScheme = dark ? 'dark' : 'light'
}

export function useTheme() {
  // useState keeps this per-request on the server instead of leaking
  // module-scope state across renders.
  const theme = useState<Theme>('theme', () => 'system')

  onMounted(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
    if (stored && THEMES.includes(stored)) theme.value = stored

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onSystemChange = () => {
      if (theme.value === 'system') paint('system')
    }
    media.addEventListener('change', onSystemChange)
    onBeforeUnmount(() => media.removeEventListener('change', onSystemChange))
  })

  /**
   * Switch themes. When the browser supports view transitions and the user
   * hasn't asked for reduced motion, the new theme is revealed as a circle
   * expanding from the click point.
   */
  function setTheme(next: Theme, event?: MouseEvent) {
    theme.value = next
    localStorage.setItem(STORAGE_KEY, next)

    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { ready: Promise<void> }
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!doc.startViewTransition || reduced || !event) {
      paint(next)
      return
    }

    const x = event.clientX
    const y = event.clientY
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))

    doc.startViewTransition(() => paint(next)).ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`]
        },
        {
          duration: 540,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          pseudoElement: '::view-transition-new(root)'
        }
      )
    })
  }

  function cycleTheme(event?: MouseEvent) {
    const next = THEMES[(THEMES.indexOf(theme.value) + 1) % THEMES.length]!
    setTheme(next, event)
  }

  return { theme, setTheme, cycleTheme }
}
