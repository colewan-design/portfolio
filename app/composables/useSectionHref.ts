/**
 * The section links are plain in-page anchors, which stop working the moment
 * the visitor is on a route other than the index — `#work` from /pricing
 * resolves to a section that isn't on the page. This returns a resolver that
 * keeps them as bare hashes on the index (so the CSS smooth scroll still owns
 * the motion) and qualifies them with `/` everywhere else.
 */
export function useSectionHref() {
  const route = useRoute()
  return (id: string) => (route.path === '/' ? `#${id}` : `/#${id}`)
}
