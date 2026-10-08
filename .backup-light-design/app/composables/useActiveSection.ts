/**
 * Tracks which section is currently in view so the sidebar can mark it active.
 * Picks the topmost intersecting section, which behaves better than "last
 * crossed" when short sections sit next to tall ones.
 */
export function useActiveSection(ids: string[]) {
  const active = useState<string>('active-section', () => ids[0] ?? '')

  onMounted(() => {
    const visible = new Set<string>()

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id)
          else visible.delete(entry.target.id)
        }
        const first = ids.find((id) => visible.has(id))
        if (first) active.value = first
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    )

    for (const id of ids) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }

    onBeforeUnmount(() => observer.disconnect())
  })

  return active
}
