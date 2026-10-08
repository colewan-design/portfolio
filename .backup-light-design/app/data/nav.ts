export interface NavItem {
  id: string
  label: string
  index: string
}

export const navItems: NavItem[] = [
  { id: 'index', label: 'index', index: '00' },
  { id: 'about', label: 'about', index: '01' },
  { id: 'work', label: 'work', index: '02' },
  { id: 'services', label: 'services', index: '03' },
  { id: 'contact', label: 'contact', index: '04' }
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
