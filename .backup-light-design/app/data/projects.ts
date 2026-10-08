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
    image: '/images/projects/goodboy.png',
    tags: ['app']
  },
  {
    name: 'Uniglobal Industrial Trading',
    description: 'A supplier site for drilling tools, mining equipment, and industrial consumables.',
    url: 'https://uniglobalindustrialtrading.com/',
    image: '/images/projects/uniglobal.png',
    tags: ['business', 'web']
  },
  {
    name: 'Vault',
    description: 'An e-commerce store for lab-verified research peptides.',
    url: 'https://vaultpeptide.com/',
    image: '/images/projects/vault.png',
    tags: ['ecommerce', 'web']
  },
  {
    name: 'Baguio Delivery',
    description: 'A same-day delivery app connecting customers with local Baguio vendors and riders.',
    url: 'https://baguiodeliveryapp.salidumay.com/',
    image: '/images/projects/baguio-delivery.png',
    tags: ['app', 'web']
  },
  {
    name: 'Baguio Branch All Around Manpower Services',
    description: 'A local cleaning and manpower services website for Baguio City and La Trinidad.',
    url: 'https://bbaams.salidumay.com/',
    image: '/images/projects/bbaams.png',
    tags: ['business', 'web']
  },
  {
    name: 'POS',
    description: 'A point of sale system for managing sales, inventory, and transactions.',
    url: 'https://point-of-sale.salidumay.com/',
    image: '/images/projects/pos.png',
    tags: ['system', 'web'],
    featured: true
  },
  {
    name: 'Anime',
    description: 'An anime-focused site for browsing and tracking shows.',
    url: 'https://salidumay.com/',
    image: '/images/projects/anime.png',
    tags: ['web']
  },
  {
    name: 'Holdings Site',
    description: 'A corporate site for Eishi Partners holdings.',
    url: 'https://eishipartners.com/',
    image: '/images/projects/holdings.png',
    tags: ['business']
  },
  {
    name: 'GPX to Video',
    description: 'Converts GPX route data into rendered video.',
    url: 'https://gpx2video.salidumay.com/',
    image: '/images/projects/gpx2video.png',
    tags: ['tool']
  },
  {
    name: 'BG Remover',
    description: 'Removes backgrounds from images automatically.',
    url: 'https://bg-remover.salidumay.com/',
    image: '/images/projects/bg-remover.png',
    tags: ['tool']
  }
]
