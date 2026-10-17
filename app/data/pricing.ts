/**
 * Pricing is data, not markup: the landing strip and the full pricing page
 * both read from here, so a number can never be right in one place and stale
 * in the other.
 *
 * Two commercial rules are encoded below and should survive edits:
 *   1. Every package carries `limits`. The cheap tier is the one clients grow
 *      by asking — capping revisions, content and backend work in writing is
 *      what keeps a PHP 3,000 job from quietly becoming a PHP 10,000 one.
 *   2. Anything recurring (domain, hosting, mail, maintenance, paid APIs) lives
 *      in `running` and is never folded into a package price. Those are the
 *      renewals, and they only stay renewals while they are quoted separately.
 */

export interface Plan {
  id: string
  index: string
  name: string
  price: string
  /** Set when the figure is a floor rather than a fixed fee. */
  from?: boolean
  tagline: string
  bestFor: string
  timeline: string
  includes: string[]
  limits: string[]
}

/* The three advertised website packages. These carry a fixed price because
   their scope is fixed — which is the only reason a price can be published. */
export const plans: Plan[] = [
  {
    id: 'starter',
    index: '01',
    name: 'Starter',
    price: '₱3,000',
    tagline: 'Single-page professional business website.',
    bestFor: 'Freelancers & small businesses',
    timeline: '3–5 days',
    includes: [
      'One-page responsive website',
      'About, Services and Contact sections',
      'Social links',
      'Contact form, delivered to your inbox',
      'Basic SEO — title, description, favicon, sitemap',
      'Deployed to your hosting and handed over'
    ],
    limits: [
      'One design revision cycle',
      'Content — text, images, logo — supplied by you',
      'No custom backend or admin panel'
    ]
  },
  {
    id: 'business',
    index: '02',
    name: 'Business',
    price: '₱7,500',
    tagline: 'Full multi-page website for companies that need a stronger online presence.',
    bestFor: 'Small businesses',
    timeline: '1–2 weeks',
    includes: [
      'Up to 5 pages',
      'Home, About, Services, Contact + FAQ or Portfolio',
      'Responsive across phone, tablet and desktop',
      'Contact form with spam protection',
      'Basic SEO on every page',
      'Google Analytics set up'
    ],
    limits: [
      'Two design revision cycles',
      'Content supplied by you',
      'No CMS — page edits come back to me'
    ]
  },
  {
    id: 'business-pro',
    index: '03',
    name: 'Business Pro',
    price: '₱12,000',
    tagline: 'A more customised site, with CMS, analytics, integrations and richer sections.',
    bestFor: 'Established businesses',
    timeline: '2–4 weeks',
    includes: [
      'Up to 8–10 pages',
      'Custom UI design, not a template fill-in',
      'Portfolio or gallery section',
      'Google Maps and social integrations',
      'Analytics and extended SEO setup',
      'Basic CMS — you edit the agreed sections yourself'
    ],
    limits: [
      'Three design revision cycles',
      'Content supplied by you, or migrated from your current site',
      'CMS covers the sections agreed at the start'
    ]
  }
]

/* Priced separately, and on purpose: scope here is discovered rather than
   assumed, so a published fixed price would underquote me or overquote them. */
export const custom: Plan[] = [
  {
    id: 'ecommerce',
    index: '04',
    name: 'E-commerce',
    price: '₱18,000',
    from: true,
    tagline: 'A storefront that takes orders and payments end to end.',
    bestFor: 'Businesses selling online',
    timeline: '3–6 weeks',
    includes: [
      'Product catalog and categories',
      'Product pages with variants and stock',
      'Cart and checkout',
      'Customer accounts',
      'Order management for your staff',
      'Payment integration — GCash, Maya, cards'
    ],
    limits: [
      'Final quote follows a short scoping call',
      'Gateway accounts, approval and transaction fees are yours',
      'Product data and photography supplied by you'
    ]
  },
  {
    id: 'systems',
    index: '05',
    name: 'Custom Web System',
    price: '₱30,000',
    from: true,
    tagline: 'Software for the part of the business still running on spreadsheets.',
    bestFor: 'Businesses needing automation',
    timeline: 'Scoped per build',
    includes: [
      'Admin dashboard',
      'Authentication with roles and permissions',
      'Database design',
      'CRUD modules for your records',
      'Reports and exports',
      'APIs, integrations and custom workflows'
    ],
    limits: [
      'Quoted per module after a requirements session',
      'Built in phases, each signed off before the next starts',
      'Third-party API and licence costs billed at cost'
    ]
  }
]

export interface RunningCost {
  id: string
  item: string
  price: string
  note: string
}

/* The renewals. Kept out of every package deliberately. */
export const running: RunningCost[] = [
  {
    id: 'domain-name',
    item: 'Domain name',
    price: '₱700–₱1,200 / yr',
    note: 'Registered in your name, on your own account'
  },
  {
    id: 'hosting',
    item: 'Hosting',
    price: 'from ₱1,500 / yr',
    note: 'Shared hosting; VPS from ₱600 / mo for heavier builds'
  },
  {
    id: 'business-email',
    item: 'Business email',
    price: 'from ₱250 / mailbox / mo',
    note: 'you@yourcompany.com, billed by the provider'
  },
  {
    id: 'maintenance-support',
    item: 'Maintenance & support',
    price: 'from ₱750 / mo',
    note: 'Updates, backups, uptime checks, small content edits'
  },
  {
    id: 'third-party-costs',
    item: 'Paid plugins, themes & APIs',
    price: 'at cost',
    note: 'SMS, maps past the free tier, gateway fees, licences'
  },
  {
    id: 'content-creation',
    item: 'Content creation',
    price: 'quoted',
    note: 'Copywriting, photography, logo and brand work'
  },
  {
    id: 'extra-revision-cycle',
    item: 'Extra revision cycle',
    price: 'from ₱750',
    note: 'Beyond the rounds included in your package'
  }
]

export interface Step {
  index: string
  name: string
  body: string
}

export const process: Step[] = [
  {
    index: '01',
    name: 'Brief',
    body: 'You tell me the business, the pages you need, and roughly when it should be live.'
  },
  {
    index: '02',
    name: 'Quote',
    body: 'I send back a written scope and a price. Nothing starts before you approve it.'
  },
  {
    index: '03',
    name: 'Build',
    body: 'Design and development, on a staging link you can watch as it comes together.'
  },
  {
    index: '04',
    name: 'Revisions',
    body: 'You send one consolidated round of feedback per cycle. I apply it in full.'
  },
  {
    index: '05',
    name: 'Launch',
    body: 'Deploy to your hosting, point the domain, hand over every account and credential.'
  }
]

const paymentDepositPercent = 50
const paymentApprovalPercent = 50
const quoteValidityDays = 30

export const commercialTerms = {
  payment: {
    summary: `${paymentDepositPercent}% / ${paymentApprovalPercent}%`,
    detail: `${paymentDepositPercent}% to start, ${paymentApprovalPercent}% on approval before the site goes live.`
  },
  quoteValidity: {
    summary: `${quoteValidityDays} days`,
    detail: `Quotes hold for ${quoteValidityDays} days.`
  }
} as const

export interface Term {
  id: string
  text: string
}

export const terms: Term[] = [
  {
    id: 'currency',
    text: 'All prices are in Philippine pesos and exclude the running costs listed above.'
  },
  { id: 'payment', text: commercialTerms.payment.detail },
  {
    id: 'revisions',
    text: 'A revision cycle is one consolidated round of feedback, not an open queue of small changes.'
  },
  {
    id: 'scope',
    text: 'Anything outside the agreed scope is quoted as a change request before work on it begins.'
  },
  {
    id: 'ownership',
    text: 'You own the site, the domain and every account. Source is handed over on final payment.'
  },
  { id: 'quote-validity', text: commercialTerms.quoteValidity.detail }
]
