# Christian Colewan Portfolio

Source for [christiancolewan.tech](https://christiancolewan.tech), a dark, typography-led portfolio for Christian Colewan. The site presents selected projects, services, tools, pricing, and contact information.

## Stack

- Nuxt 4 and Vue 3
- Tailwind CSS 4 through the Vite plugin
- `@nuxt/fonts` for Barlow Condensed, Geist, and Geist Mono
- A self-hosted Geist Pixel display font

## Routes

- `/` — portfolio homepage
- `/pricing` — service packages and pricing details

## Local development

Install the exact dependency versions recorded in the lockfile:

```bash
npm ci
```

Start the development server at `http://localhost:3000`:

```bash
npm run dev
```

Create and preview a production build:

```bash
npm run build
npm run preview
```

To generate a static output instead, run:

```bash
npm run generate
```

Run the full static-site validation to regenerate the site and check routes,
metadata, sitemap discovery, referenced assets, and JavaScript, CSS, and image
size budgets:

```bash
npm run validate
```

## Project structure

```text
app/
  assets/css/main.css   Design tokens, typography, utilities, and global styles
  components/           Portfolio sections and shared interface components
  composables/          Active-section tracking and section-link helpers
  data/                 Navigation, projects, tools, and pricing content
  pages/                Home and pricing routes
public/
  fonts/                 Self-hosted display font
  images/                Portrait, project, service, and brand assets
nuxt.config.ts           Nuxt, fonts, metadata, and Tailwind configuration
skill.md                 Repository design guidance
```

Most portfolio content can be updated without changing component markup:

- Projects: `app/data/projects.ts`
- Pricing: `app/data/pricing.ts`
- Tools: `app/data/tools.ts`
- Navigation: `app/data/nav.ts`

## Design and quality rules

Follow `skill.md` when changing the interface. Preserve the established typography, spacing, motion, accessibility, and monochrome design guidance unless a deliberate redesign is requested.

Before committing a change, run:

```bash
npm ci
npm run build
npm run validate
```

The automation progress log is stored in `.automation/state.json` so completed work is not repeated.
