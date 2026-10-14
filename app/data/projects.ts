export interface Project {
  name: string
  description: string
  url: string
  image: string
  tags: string[]
  featured?: boolean
}

export const projects: Project[] = [
  {
    name: 'Good Boy Care',
    description:
      'A dog care app with vet chat, health records, weight coaching, and microchip storage.',
    // TODO: replace with the live URL — the card links out to this.
    url: '',
    image: '/images/projects/goodboy.webp',
    tags: ['app']
  },
  {
    name: 'Xponent Global',
    description:
      'A corporate site for an international supplier to the mining, drilling, oil & gas, construction, and energy sectors.',
    url: 'https://www.xponent-global.com/',
    image: '/images/projects/xponent.webp',
    tags: ['business', 'web']
  },
  {
    name: 'Uniglobal Industrial Trading',
    description: 'A supplier site for drilling tools, mining equipment, and industrial consumables.',
    url: 'https://uniglobalindustrialtrading.com/',
    image: '/images/projects/uniglobal.webp',
    tags: ['business', 'web']
  },
  {
    name: 'Vault',
    description: 'An e-commerce store for lab-verified research peptides.',
    url: 'https://vaultpeptide.com/',
    image: '/images/projects/vault.webp',
    tags: ['ecommerce', 'web']
  },
  {
    name: 'Baguio Delivery',
    description: 'A same-day delivery app connecting customers with local Baguio vendors and riders.',
    url: 'https://baguiodeliveryapp.salidumay.com/',
    image: '/images/projects/baguio-delivery.webp',
    tags: ['app', 'web']
  },
  {
    name: 'Baguio Branch All Around Manpower Services',
    description: 'A local cleaning and manpower services website for Baguio City and La Trinidad.',
    url: 'https://bbaams.salidumay.com/',
    image: '/images/projects/bbaams.webp',
    tags: ['business', 'web']
  },
  {
    name: 'POS',
    description: 'A point of sale system for managing sales, inventory, and transactions.',
    url: 'https://point-of-sale.salidumay.com/',
    image: '/images/projects/pos.webp',
    tags: ['system', 'web'],
    featured: true
  },
  {
    name: 'Anime',
    description: 'An anime-focused site for browsing and tracking shows.',
    url: 'https://salidumay.com/',
    image: '/images/projects/anime.webp',
    tags: ['web']
  },
  {
    name: 'Holdings Site',
    description: 'A corporate site for Eishi Partners holdings.',
    url: 'https://eishipartners.com/',
    image: '/images/projects/holdings.webp',
    tags: ['business']
  }
]
