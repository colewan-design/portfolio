export interface Project {
  name: string
  description: string
  url: string
  image: string
  /* Pixel size of the screenshot. The gallery lays its rows out from the
     proportions, and the browser can hold the box before the file lands. */
  width: number
  height: number
  tags: string[]
  featured?: boolean
}

export const projects: Project[] = [
  {
    name: 'GodTrust',
    description:
      'An Android app for collection agents: assigned customers, payment recording, digital receipts, and collection tracking in one place.',
    url: 'https://godtrust.omaykan.com/',
    image: '/images/projects/godtrust.png',
    width: 1920,
    height: 950,
    tags: ['app', 'system']
  },
  {
    name: 'JAC International',
    description:
      'A recruitment guidance site helping Filipino job seekers and overseas employers through licensed international employment channels.',
    url: 'https://jac.omaykan.com/',
    image: '/images/projects/jac.png',
    width: 1920,
    height: 950,
    tags: ['business', 'web']
  },
  {
    name: 'Good Boy Care',
    description:
      'A dog care app with vet chat, health records, weight coaching, and microchip storage.',
    // TODO: replace with the live URL — the viewer links out to this.
    url: '',
    image: '/images/projects/goodboy.png',
    width: 621,
    height: 941,
    tags: ['app']
  },
  {
    name: 'Xponent Global',
    description:
      'A corporate site for an international supplier to the mining, drilling, oil & gas, construction, and energy sectors.',
    url: 'https://www.xponent-global.com/',
    image: '/images/projects/xponent.png',
    width: 1896,
    height: 946,
    tags: ['business', 'web']
  },
  {
    name: 'Uniglobal Industrial Trading',
    description: 'A supplier site for drilling tools, mining equipment, and industrial consumables.',
    url: 'https://uniglobalindustrialtrading.com/',
    image: '/images/projects/uniglobal.png',
    width: 1920,
    height: 950,
    tags: ['business', 'web']
  },
  {
    name: 'Vault',
    description: 'An e-commerce store for lab-verified research peptides.',
    url: 'https://vaultpeptide.com/',
    image: '/images/projects/vault.png',
    width: 1920,
    height: 950,
    tags: ['ecommerce', 'web']
  },
  {
    name: 'Baguio Delivery',
    description: 'A same-day delivery app connecting customers with local Baguio vendors and riders.',
    url: 'https://baguiodeliveryapp.salidumay.com/',
    image: '/images/projects/baguio-delivery.png',
    width: 1920,
    height: 950,
    tags: ['app', 'web']
  },
  {
    name: 'Baguio Branch All Around Manpower Services',
    description: 'A local cleaning and manpower services website for Baguio City and La Trinidad.',
    url: 'https://bbaams.salidumay.com/',
    image: '/images/projects/bbaams.png',
    width: 1920,
    height: 950,
    tags: ['business', 'web']
  },
  {
    name: 'POS',
    description: 'A point of sale system for managing sales, inventory, and transactions.',
    url: 'https://point-of-sale.salidumay.com/',
    image: '/images/projects/pos.png',
    width: 1672,
    height: 941,
    tags: ['system', 'web'],
    featured: true
  },
  {
    name: 'Anime',
    description: 'An anime-focused site for browsing and tracking shows.',
    url: 'https://salidumay.com/',
    image: '/images/projects/anime.png',
    width: 1672,
    height: 941,
    tags: ['web']
  },
  {
    name: 'Holdings Site',
    description: 'A corporate site for Eishi Partners holdings.',
    url: 'https://eishipartners.com/',
    image: '/images/projects/holdings.png',
    width: 1920,
    height: 951,
    tags: ['business']
  }
]
