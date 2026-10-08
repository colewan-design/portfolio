export interface NavItem {
  id: string
  label: string
  index: string
  /* Set when the item is a route of its own rather than a section of the
     index. The id still names a section on the landing page, so the scroll
     spy keeps working while the link goes to the fuller page. */
  to?: string
}

export const navItems: NavItem[] = [
  { id: 'index', label: 'index', index: '00' },
  { id: 'work', label: 'work', index: '01' },
  { id: 'about', label: 'about', index: '02' },
  { id: 'tools', label: 'tools', index: '03' },
  { id: 'services', label: 'services', index: '04' },
  { id: 'pricing', label: 'pricing', index: '05', to: '/pricing' },
  { id: 'contact', label: 'contact', index: '06' }
]

export const navIds = navItems.map((item) => item.id)

export interface ElsewhereLink {
  label: string
  href: string
}

export const elsewhere: ElsewhereLink[] = [
  { label: 'email', href: 'mailto:cts.colewan@gmail.com' },
  { label: 'salidumay.com', href: 'https://salidumay.com/' }
]
