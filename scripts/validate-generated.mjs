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

async function requireFile(relativePath, label = relativePath) {
  try {
    await access(join(outputDir, relativePath))
  } catch {
    fail(`Missing ${label}: .output/public/${relativePath}`)
  }
}

const generatedPages = []

for (const route of routes) {
  await requireFile(route.file, `generated route ${route.path}`)
  const html = await readFile(join(outputDir, route.file), 'utf8')
  const absoluteUrl = new URL(route.path, siteUrl).toString()
  const label = `route ${route.path}`

  requireTag(html, 'link', { rel: 'canonical', href: absoluteUrl }, label)
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
  generatedPages.push(html)
}

await requireFile('sitemap.xml')
await requireFile('robots.txt')

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
  `Validated ${routes.length} routes, metadata, sitemap discovery, and ${assetPaths.size} assets.`
)
