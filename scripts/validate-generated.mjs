import { access, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const outputDir = join(root, '.output/public')
const siteUrl = 'https://christiancolewan.tech'
const routes = [
  { path: '/', file: 'index.html' },
  { path: '/pricing', file: 'pricing/index.html' }
]

function fail(message) {
  throw new Error(message)
}

function parseAttributes(tag) {
  return Object.fromEntries(
    [...tag.matchAll(/([:\w-]+)="([^"]*)"/g)].map(([, name, value]) => [name, value])
  )
}

function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map((match) => ({
    raw: match[0],
    attributes: parseAttributes(match[0])
  }))
}

function requireTag(html, name, expected, label) {
  const match = tags(html, name).find(({ attributes }) =>
    Object.entries(expected).every(([key, value]) => attributes[key] === value)
  )

  if (!match) fail(`${label}: missing <${name}> with ${JSON.stringify(expected)}`)
  return match.attributes
}

function requireMeta(html, key, label) {
  const match = tags(html, 'meta').find(
    ({ attributes }) => attributes.name === key || attributes.property === key
  )

  if (!match?.attributes.content) fail(`${label}: missing non-empty ${key} metadata`)
}

function structuredData(html, label) {
  return [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map(
    ([, content], index) => {
      try {
        return JSON.parse(content)
      } catch {
        fail(`${label}: invalid JSON-LD in script ${index + 1}`)
      }
    }
  )
}

function validateAccessibility(html, label) {
  for (const landmark of ['nav', 'main', 'footer']) {
    const count = tags(html, landmark).length
    if (count !== 1) fail(`${label}: expected one <${landmark}> landmark, found ${count}`)
  }

  requireTag(html, 'main', { id: 'main' }, label)
  requireTag(html, 'a', { href: '#main' }, label)

  const headingLevels = [...html.matchAll(/<h([1-6])\b/gi)].map(([, level]) => Number(level))
  const topLevelHeadings = headingLevels.filter((level) => level === 1).length
  if (topLevelHeadings !== 1) {
    fail(`${label}: expected one <h1>, found ${topLevelHeadings}`)
  }

  for (let index = 1; index < headingLevels.length; index += 1) {
    if (headingLevels[index] > headingLevels[index - 1] + 1) {
      fail(
        `${label}: heading level skips from h${headingLevels[index - 1]} to h${headingLevels[index]}`
      )
    }
  }

  for (const image of tags(html, 'img')) {
    if (!Object.hasOwn(image.attributes, 'alt')) {
      fail(`${label}: image is missing an alt attribute: ${image.raw}`)
    }
  }

  for (const link of tags(html, 'a')) {
    if (link.attributes.target !== '_blank') continue
    const relationships = new Set((link.attributes.rel || '').split(/\s+/).filter(Boolean))
    if (!relationships.has('noopener')) {
      fail(`${label}: target=_blank link is missing rel=noopener: ${link.raw}`)
    }
  }
}

async function requireFile(relativePath, label = relativePath) {
  try {
    await access(join(outputDir, relativePath))
  } catch {
    fail(`Missing ${label}: .output/public/${relativePath}`)
  }
}

async function requirePngDimensions(relativePath, width, height) {
  await requireFile(relativePath)
  const image = await readFile(join(outputDir, relativePath))
  const signature = image.subarray(0, 8).toString('hex')

  if (signature !== '89504e470d0a1a0a') fail(`${relativePath}: invalid PNG signature`)
  if (image.readUInt32BE(16) !== width || image.readUInt32BE(20) !== height) {
    fail(`${relativePath}: expected ${width}x${height} PNG`)
  }
}

const generatedPages = []

for (const route of routes) {
  await requireFile(route.file, `generated route ${route.path}`)
  const html = await readFile(join(outputDir, route.file), 'utf8')
  const absoluteUrl = new URL(route.path, siteUrl).toString()
  const label = `route ${route.path}`

  requireTag(html, 'link', { rel: 'canonical', href: absoluteUrl }, label)
  requireTag(html, 'link', { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }, label)
  requireTag(
    html,
    'link',
    { rel: 'apple-touch-icon', sizes: '180x180', href: '/icons/apple-touch-icon.png' },
    label
  )
  requireTag(html, 'link', { rel: 'manifest', href: '/site.webmanifest' }, label)
  requireTag(html, 'meta', { property: 'og:url', content: absoluteUrl }, label)

  for (const key of [
    'description',
    'og:title',
    'og:description',
    'og:image',
    'twitter:card',
    'twitter:title',
    'twitter:description',
    'twitter:image'
  ]) {
    requireMeta(html, key, label)
  }

  if (!/<title>[^<]+<\/title>/i.test(html)) fail(`${label}: missing non-empty title`)
  validateAccessibility(html, label)
  generatedPages.push(html)
}

const homePerson = structuredData(generatedPages[0], 'route /').find(
  (schema) => schema['@context'] === 'https://schema.org' && schema['@type'] === 'Person'
)

const expectedPerson = {
  name: 'Christian Colewan',
  url: siteUrl,
  image: `${siteUrl}/images/portrait.webp`,
  jobTitle: 'Developer',
  description:
    'Christian Colewan — a Baguio-based developer building systems, desktop apps, web systems, mobile apps, and business sites.',
  address: 'Baguio, Philippines'
}

if (!homePerson) fail('route /: missing Person JSON-LD')
for (const [key, value] of Object.entries(expectedPerson)) {
  if (homePerson[key] !== value) fail(`route /: Person JSON-LD has invalid ${key}`)
}

if (structuredData(generatedPages[1], 'route /pricing').some((schema) => schema['@type'] === 'Person')) {
  fail('route /pricing: Person JSON-LD should only appear on the home page')
}

await requireFile('sitemap.xml')
await requireFile('robots.txt')
await requireFile('site.webmanifest')

const manifest = JSON.parse(await readFile(join(outputDir, 'site.webmanifest'), 'utf8'))
const expectedManifest = {
  name: 'Christian Colewan Portfolio',
  short_name: 'Christian Colewan',
  description:
    'Christian Colewan — a Baguio-based developer building systems, desktop apps, web systems, mobile apps, and business sites.',
  id: '/',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: '#0a0a0a',
  theme_color: '#0a0a0a'
}

for (const [key, value] of Object.entries(expectedManifest)) {
  if (manifest[key] !== value) fail(`site.webmanifest: invalid ${key}`)
}

const expectedIcons = [
  { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }
]

if (JSON.stringify(manifest.icons) !== JSON.stringify(expectedIcons)) {
  fail('site.webmanifest: icons do not match the required install icons')
}

await requirePngDimensions('icons/apple-touch-icon.png', 180, 180)
await requirePngDimensions('icons/icon-192.png', 192, 192)
await requirePngDimensions('icons/icon-512.png', 512, 512)

const sitemap = await readFile(join(outputDir, 'sitemap.xml'), 'utf8')
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => url)
const expectedUrls = routes.map(({ path }) => new URL(path, siteUrl).toString())

if (JSON.stringify(sitemapUrls) !== JSON.stringify(expectedUrls)) {
  fail(`Sitemap URLs differ from routes: ${JSON.stringify(sitemapUrls)}`)
}

const robots = await readFile(join(outputDir, 'robots.txt'), 'utf8')
const sitemapUrl = `${siteUrl}/sitemap.xml`
if (!robots.split(/\r?\n/).includes(`Sitemap: ${sitemapUrl}`)) {
  fail(`robots.txt does not advertise ${sitemapUrl}`)
}

const assetPaths = new Set()
for (const html of generatedPages) {
  for (const [, value] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (!value.startsWith('/') || value.startsWith('//')) continue
    const path = decodeURIComponent(value.split(/[?#]/, 1)[0])
    if (path.startsWith('/_nuxt/') || /\.[a-z0-9]+$/i.test(path)) assetPaths.add(path.slice(1))
  }
}

for (const assetPath of assetPaths) await requireFile(assetPath, `referenced asset /${assetPath}`)

console.log(
  `Validated ${routes.length} routes, accessibility, metadata, install icons, web manifest, Person structured data, sitemap discovery, and ${assetPaths.size} page assets.`
)
