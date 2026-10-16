import { access, readFile, readdir, stat } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const outputDir = join(root, '.output/public')
const siteUrl = 'https://christiancolewan.tech'
const shareImageUrl = `${siteUrl}/images/logo.png`
const shareImagePath = 'images/logo.png'
const routes = [
  {
    path: '/',
    file: 'index.html',
    title: 'Christian Colewan — Developer',
    description:
      'Christian Colewan — a Baguio-based developer building systems, desktop apps, web systems, mobile apps, and business sites.'
  },
  {
    path: '/pricing',
    file: 'pricing/index.html',
    title: 'Pricing — Christian Colewan',
    description:
      'Website packages from ₱3,000, e-commerce from ₱18,000, and custom web systems from ₱30,000 — with scope, limits and running costs stated up front.'
  }
]
const serviceImages = [
  'business-websites',
  'crm-websites',
  'desktop-apps',
  'mobile-apps',
  'systems',
  'web-systems'
]
const kibibyte = 1024
const assetBudgets = [
  {
    label: 'JavaScript',
    extensions: new Set(['.js']),
    maxFileSize: 200 * kibibyte,
    maxTotalSize: 250 * kibibyte
  },
  {
    label: 'CSS',
    extensions: new Set(['.css']),
    maxFileSize: 70 * kibibyte,
    maxTotalSize: 75 * kibibyte
  },
  {
    label: 'images',
    extensions: new Set(['.avif', '.gif', '.ico', '.jpeg', '.jpg', '.png', '.svg', '.webp']),
    maxFileSize: 1536 * kibibyte,
    maxTotalSize: 10 * 1024 * kibibyte
  }
]

function fail(message) {
  throw new Error(message)
}

function formatBytes(bytes) {
  return bytes >= 1024 * kibibyte
    ? `${(bytes / (1024 * kibibyte)).toFixed(2)} MiB`
    : `${(bytes / kibibyte).toFixed(1)} KiB`
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name)
      return entry.isDirectory() ? listFiles(path) : [path]
    })
  )

  return files.flat()
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

function openingTags(html) {
  return [...html.matchAll(/<([a-z][\w:-]*)\b[^>]*>/gi)].map((match) => ({
    name: match[1].toLowerCase(),
    raw: match[0],
    attributes: parseAttributes(match[0])
  }))
}

function interactiveElements(html) {
  return [...html.matchAll(/<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/gi)].map(
    ([raw, name, attributes, content]) => ({
      name: name.toLowerCase(),
      raw,
      attributes: parseAttributes(attributes),
      content
    })
  )
}

function renderedText(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;|&#xa0;/gi, ' ')
    .replace(/&(?:[a-z][a-z0-9]+|#\d+|#x[\da-f]+);/gi, 'x')
    .replace(/\s+/g, ' ')
    .trim()
}

function elementIds(html) {
  return [...html.matchAll(/\bid="([^"]+)"/gi)].map(([, id]) => id)
}

function robotsDirectives(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*/, '').trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.indexOf(':')
      if (separator === -1) fail(`robots.txt: invalid directive ${JSON.stringify(line)}`)

      return {
        name: line.slice(0, separator).trim().toLowerCase(),
        value: line.slice(separator + 1).trim()
      }
    })
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

function requireSingleMeta(html, attribute, value, content, label) {
  const matches = tags(html, 'meta').filter(({ attributes }) => attributes[attribute] === value)
  if (matches.length !== 1) {
    fail(`${label}: expected one ${value} meta tag, found ${matches.length}`)
  }
  if (matches[0].attributes.content !== content) {
    fail(`${label}: ${value} metadata must be ${JSON.stringify(content)}`)
  }
}

function validateDocumentSetup(html, label) {
  const documentTags = tags(html, 'html')
  if (documentTags.length !== 1) fail(`${label}: expected one <html> element`)
  if (documentTags[0].attributes.lang !== 'en') fail(`${label}: document language must be en`)

  const charsets = tags(html, 'meta').filter(({ attributes }) => attributes.charset !== undefined)
  if (charsets.length !== 1) {
    fail(`${label}: expected one charset declaration, found ${charsets.length}`)
  }
  if (charsets[0].attributes.charset.toLowerCase() !== 'utf-8') {
    fail(`${label}: charset must be utf-8`)
  }

  requireSingleMeta(html, 'name', 'viewport', 'width=device-width, initial-scale=1', label)
  requireSingleMeta(html, 'name', 'color-scheme', 'dark', label)
  requireSingleMeta(html, 'name', 'theme-color', '#0a0a0a', label)
}

function validateDocumentMetadata(html, route, label) {
  const titles = [...html.matchAll(/<title>([^<]*)<\/title>/gi)].map(([, content]) => content.trim())
  if (titles.length !== 1) fail(`${label}: expected one <title>, found ${titles.length}`)
  if (titles[0] !== route.title) fail(`${label}: title does not match the route title`)
  if (titles[0].length < 10 || titles[0].length > 60) {
    fail(`${label}: title must be between 10 and 60 characters`)
  }

  const descriptions = tags(html, 'meta').filter(
    ({ attributes }) => attributes.name === 'description'
  )
  if (descriptions.length !== 1) {
    fail(`${label}: expected one meta description, found ${descriptions.length}`)
  }

  const description = descriptions[0].attributes.content?.trim()
  if (description !== route.description) fail(`${label}: description does not match the route`)
  if (description.length < 50 || description.length > 160) {
    fail(`${label}: description must be between 50 and 160 characters`)
  }

  requireTag(html, 'meta', { property: 'og:title', content: route.title }, label)
  requireTag(html, 'meta', { property: 'og:description', content: description }, label)
  requireTag(html, 'meta', { name: 'twitter:title', content: route.title }, label)
  requireTag(html, 'meta', { name: 'twitter:description', content: description }, label)
}

function validatePublicIndexability(html, label) {
  const crawlerNames = new Set(['robots', 'googlebot', 'bingbot'])

  for (const { attributes } of tags(html, 'meta')) {
    if (!crawlerNames.has(attributes.name?.toLowerCase())) continue

    const directives = new Set(
      (attributes.content || '')
        .toLowerCase()
        .split(/[,\s]+/)
        .filter(Boolean)
    )

    for (const directive of ['noindex', 'nofollow']) {
      if (directives.has(directive)) {
        fail(`${label}: public route must not declare ${directive}`)
      }
    }
  }
}

function validateInternalLinks(pages) {
  const normalizedPath = (path) => (path === '/' ? path : path.replace(/\/$/, ''))
  const pagesByPath = new Map(
    routes.map((route, index) => [normalizedPath(route.path), pages[index]])
  )
  const idsByPath = new Map(
    [...pagesByPath].map(([path, html]) => [
      path,
      new Set(elementIds(html))
    ])
  )
  let internalLinkCount = 0
  let externalHttpsLinkCount = 0
  let contactLinkCount = 0

  for (const [index, route] of routes.entries()) {
    const label = `route ${route.path}`
    const pageUrl = new URL(route.path, siteUrl)

    for (const { attributes } of tags(pages[index], 'a')) {
      if (!attributes.href) continue

      let target
      try {
        target = new URL(attributes.href, pageUrl)
      } catch {
        fail(`${label}: invalid link URL ${JSON.stringify(attributes.href)}`)
      }

      if (target.protocol === 'mailto:' || target.protocol === 'tel:') {
        contactLinkCount += 1
        continue
      }
      if (target.protocol !== 'https:') {
        fail(
          `${label}: link must use HTTPS or an allowed contact protocol: ${attributes.href}`
        )
      }
      if (target.origin !== pageUrl.origin) {
        externalHttpsLinkCount += 1
        continue
      }
      internalLinkCount += 1

      let targetPath
      let fragment
      try {
        targetPath = normalizedPath(decodeURIComponent(target.pathname))
        fragment = decodeURIComponent(target.hash.slice(1))
      } catch {
        fail(`${label}: link contains invalid percent-encoding: ${attributes.href}`)
      }

      if (!pagesByPath.has(targetPath)) {
        fail(`${label}: internal link does not resolve to a generated route: ${attributes.href}`)
      }
      if (fragment && !idsByPath.get(targetPath).has(fragment)) {
        fail(`${label}: fragment target does not exist: ${attributes.href}`)
      }
    }
  }

  return {
    internalLinkCount,
    externalHttpsLinkCount,
    contactLinkCount
  }
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
  const seenIds = new Set()
  for (const id of elementIds(html)) {
    if (seenIds.has(id)) fail(`${label}: duplicate id attribute ${JSON.stringify(id)}`)
    seenIds.add(id)
  }

  const idReferenceAttributes = ['aria-controls', 'aria-describedby', 'aria-labelledby', 'aria-owns']
  for (const element of openingTags(html)) {
    const referenceAttributes =
      element.name === 'label' ? ['for', ...idReferenceAttributes] : idReferenceAttributes

    for (const attribute of referenceAttributes) {
      if (!Object.hasOwn(element.attributes, attribute)) continue

      const references = element.attributes[attribute].split(/\s+/).filter(Boolean)
      if (references.length === 0) {
        fail(`${label}: ${attribute} must reference at least one id: ${element.raw}`)
      }

      for (const reference of references) {
        if (!seenIds.has(reference)) {
          fail(`${label}: ${attribute} references missing id ${JSON.stringify(reference)}`)
        }
      }
    }
  }

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

  let informativeImageCount = 0
  let decorativeImageCount = 0
  let eagerImageCount = 0
  let lazyImageCount = 0
  for (const image of tags(html, 'img')) {
    if (!Object.hasOwn(image.attributes, 'alt')) {
      fail(`${label}: image is missing an alt attribute: ${image.raw}`)
    }

    const alternative = image.attributes.alt.trim()
    const role = image.attributes.role?.toLowerCase()
    const isDecorative =
      image.attributes['aria-hidden'] === 'true' || role === 'none' || role === 'presentation'

    if (!alternative && !isDecorative) {
      fail(`${label}: empty image alt text must be explicitly decorative: ${image.raw}`)
    }
    if (alternative && isDecorative) {
      fail(`${label}: decorative image must have empty alt text: ${image.raw}`)
    }

    if (image.attributes.decoding !== 'async') {
      fail(`${label}: image must use asynchronous decoding: ${image.raw}`)
    }

    const isHeroPortrait = image.attributes.src === '/images/portrait.webp'
    if (isHeroPortrait) {
      if (image.attributes.loading !== 'eager' || image.attributes.fetchpriority !== 'high') {
        fail(`${label}: hero portrait must load eagerly with high priority: ${image.raw}`)
      }
      eagerImageCount += 1
    } else {
      if (image.attributes.loading !== 'lazy') {
        fail(`${label}: non-hero image must lazy-load: ${image.raw}`)
      }
      if (image.attributes.fetchpriority === 'high') {
        fail(`${label}: non-hero image must not use high fetch priority: ${image.raw}`)
      }
      lazyImageCount += 1
    }

    if (isDecorative) decorativeImageCount += 1
    else informativeImageCount += 1
  }

  for (const link of tags(html, 'a')) {
    if (link.attributes.target !== '_blank') continue
    const relationships = new Set((link.attributes.rel || '').split(/\s+/).filter(Boolean))
    if (!relationships.has('noopener')) {
      fail(`${label}: target=_blank link is missing rel=noopener: ${link.raw}`)
    }
  }

  const controls = interactiveElements(html)
  for (const control of controls) {
    const hasAttributeName = ['aria-label', 'aria-labelledby', 'title'].some(
      (attribute) => control.attributes[attribute]?.trim()
    )
    const hasTextName = renderedText(control.content).length > 0
    const hasImageName = tags(control.content, 'img').some(
      ({ attributes }) => attributes.alt?.trim()
    )

    if (!hasAttributeName && !hasTextName && !hasImageName) {
      fail(`${label}: <${control.name}> has no accessible name: ${control.raw}`)
    }
  }

  return {
    controlCount: controls.length,
    informativeImageCount,
    decorativeImageCount,
    eagerImageCount,
    lazyImageCount
  }
}

async function requireFile(relativePath, label = relativePath) {
  try {
    await access(join(outputDir, relativePath))
  } catch {
    fail(`Missing ${label}: .output/public/${relativePath}`)
  }
}

async function requireMissingFile(relativePath) {
  try {
    await access(join(outputDir, relativePath))
    fail(`Unexpected legacy asset: .output/public/${relativePath}`)
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
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

async function requireWebpDimensions(relativePath, width, height) {
  await requireFile(relativePath)
  const image = await readFile(join(outputDir, relativePath))

  if (image.subarray(0, 4).toString() !== 'RIFF' || image.subarray(8, 12).toString() !== 'WEBP') {
    fail(`${relativePath}: invalid WebP signature`)
  }
  if (image.subarray(12, 16).toString() !== 'VP8 ') {
    fail(`${relativePath}: expected a lossy VP8 WebP image`)
  }
  if (image.subarray(23, 26).toString('hex') !== '9d012a') {
    fail(`${relativePath}: invalid VP8 frame header`)
  }

  const actualWidth = image.readUInt16LE(26) & 0x3fff
  const actualHeight = image.readUInt16LE(28) & 0x3fff
  if (actualWidth !== width || actualHeight !== height) {
    fail(`${relativePath}: expected ${width}x${height} WebP`)
  }
}

async function requireMaxFileSize(relativePath, maxBytes) {
  await requireFile(relativePath)
  const size = (await stat(join(outputDir, relativePath))).size
  if (size > maxBytes) {
    fail(`${relativePath}: ${formatBytes(size)} exceeds ${formatBytes(maxBytes)}`)
  }
}

async function requireIcoSizes(relativePath, expectedSizes) {
  await requireFile(relativePath)
  const icon = await readFile(join(outputDir, relativePath))

  if (icon.readUInt16LE(0) !== 0 || icon.readUInt16LE(2) !== 1) {
    fail(`${relativePath}: invalid ICO header`)
  }

  const count = icon.readUInt16LE(4)
  if (icon.length < 6 + count * 16) fail(`${relativePath}: truncated ICO directory`)

  const sizes = []
  for (let index = 0; index < count; index += 1) {
    const offset = 6 + index * 16
    const width = icon[offset] || 256
    const height = icon[offset + 1] || 256
    if (width !== height) fail(`${relativePath}: non-square ${width}x${height} icon entry`)
    sizes.push(width)
  }

  sizes.sort((a, b) => a - b)
  if (JSON.stringify(sizes) !== JSON.stringify(expectedSizes)) {
    fail(`${relativePath}: expected icon sizes ${expectedSizes.join(', ')}, found ${sizes.join(', ')}`)
  }
}

const generatedPages = []
let accessibleControlCount = 0
let informativeImageCount = 0
let decorativeImageCount = 0
let eagerImageCount = 0
let lazyImageCount = 0

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
  requireTag(html, 'meta', { property: 'og:image', content: shareImageUrl }, label)
  requireTag(html, 'meta', { property: 'og:image:type', content: 'image/png' }, label)
  requireTag(html, 'meta', { property: 'og:image:width', content: '1254' }, label)
  requireTag(html, 'meta', { property: 'og:image:height', content: '1254' }, label)
  requireTag(
    html,
    'meta',
    { property: 'og:image:alt', content: 'Christian Colewan portfolio logo' },
    label
  )
  requireTag(html, 'meta', { name: 'twitter:image', content: shareImageUrl }, label)
  requireTag(
    html,
    'meta',
    { name: 'twitter:image:alt', content: 'Christian Colewan portfolio logo' },
    label
  )
  validateDocumentSetup(html, label)
  validateDocumentMetadata(html, route, label)
  validatePublicIndexability(html, label)

  for (const key of [
    'og:image',
    'twitter:card',
    'twitter:image'
  ]) {
    requireMeta(html, key, label)
  }

  const accessibility = validateAccessibility(html, label)
  accessibleControlCount += accessibility.controlCount
  informativeImageCount += accessibility.informativeImageCount
  decorativeImageCount += accessibility.decorativeImageCount
  eagerImageCount += accessibility.eagerImageCount
  lazyImageCount += accessibility.lazyImageCount
  generatedPages.push(html)
}

const {
  internalLinkCount,
  externalHttpsLinkCount,
  contactLinkCount
} = validateInternalLinks(generatedPages)

await requireFile('404.html', 'generated 404 page')
const errorPageSource = await readFile(join(root, 'app/error.vue'), 'utf8')
const errorPageLabel = 'custom error page'

requireTag(errorPageSource, 'main', { id: 'main' }, errorPageLabel)
requireTag(errorPageSource, 'button', { type: 'button' }, errorPageLabel)

if (tags(errorPageSource, 'h1').length !== 1) fail(`${errorPageLabel}: expected one <h1>`)
if (!errorPageSource.includes("content: 'noindex, nofollow'")) {
  fail(`${errorPageLabel}: missing no-index metadata`)
}
if (!errorPageSource.includes("clearError({ redirect: '/' })")) {
  fail(`${errorPageLabel}: missing return-home recovery`)
}
if (!/<button\b[^>]*>[\s\S]*?Return home[\s\S]*?<\/button>/i.test(errorPageSource)) {
  fail(`${errorPageLabel}: missing return-home action label`)
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
await requirePngDimensions(shareImagePath, 1254, 1254)
await requireIcoSizes('favicon.ico', [16, 24, 32, 48, 64, 72, 96, 128, 256])
await requireMaxFileSize('favicon.ico', 100 * kibibyte)

for (const name of serviceImages) {
  await requireWebpDimensions(`images/services/${name}.webp`, 1254, 1254)
  await requireMissingFile(`images/services/${name}.png`)
}

const sitemap = await readFile(join(outputDir, 'sitemap.xml'), 'utf8')
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => url)
const expectedUrls = routes.map(({ path }) => new URL(path, siteUrl).toString())

if (JSON.stringify(sitemapUrls) !== JSON.stringify(expectedUrls)) {
  fail(`Sitemap URLs differ from routes: ${JSON.stringify(sitemapUrls)}`)
}

const robots = await readFile(join(outputDir, 'robots.txt'), 'utf8')
const sitemapUrl = `${siteUrl}/sitemap.xml`
const crawlerDirectives = robotsDirectives(robots)
const userAgents = crawlerDirectives.filter(({ name }) => name === 'user-agent')
if (userAgents.length !== 1 || userAgents[0].value !== '*') {
  fail('robots.txt: expected one wildcard user-agent group')
}

if (!crawlerDirectives.some(({ name, value }) => name === 'allow' && value === '/')) {
  fail('robots.txt: wildcard crawlers must be explicitly allowed from /')
}

const blockingRule = crawlerDirectives.find(({ name, value }) => name === 'disallow' && value)
if (blockingRule) {
  fail(`robots.txt: public routes must not be blocked by Disallow: ${blockingRule.value}`)
}

const advertisedSitemaps = crawlerDirectives.filter(({ name }) => name === 'sitemap')
if (advertisedSitemaps.length !== 1 || advertisedSitemaps[0].value !== sitemapUrl) {
  fail(`robots.txt: expected one Sitemap directive for ${sitemapUrl}`)
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

const generatedFiles = await listFiles(outputDir)
const budgetSummary = []

for (const budget of assetBudgets) {
  const files = generatedFiles.filter((path) => budget.extensions.has(extname(path).toLowerCase()))
  if (files.length === 0) fail(`Asset budget: no generated ${budget.label} files found`)

  let totalSize = 0
  for (const path of files) {
    const size = (await stat(path)).size
    totalSize += size
    if (size > budget.maxFileSize) {
      fail(
        `Asset budget: ${relative(outputDir, path)} is ${formatBytes(size)}; ` +
          `${budget.label} files must not exceed ${formatBytes(budget.maxFileSize)}`
      )
    }
  }

  if (totalSize > budget.maxTotalSize) {
    fail(
      `Asset budget: generated ${budget.label} total ${formatBytes(totalSize)} exceeds ` +
        `${formatBytes(budget.maxTotalSize)}`
    )
  }

  budgetSummary.push(
    `${budget.label} ${formatBytes(totalSize)}/${formatBytes(budget.maxTotalSize)}`
  )
}

console.log(
  `Validated ${routes.length} indexable routes with unique ids and resolved accessibility references, ${accessibleControlCount} links and buttons with accessible names, ${informativeImageCount} informative and ${decorativeImageCount} explicitly decorative images, ${eagerImageCount} eager high-priority and ${lazyImageCount} lazy images with asynchronous decoding, ${internalLinkCount} internal links and fragments, ${externalHttpsLinkCount} HTTPS external links, ${contactLinkCount} contact links, document setup, custom 404 recovery, accessibility, unique route metadata, social share image, optimized favicon, install icons, ${serviceImages.length} optimized service images, web manifest, Person structured data, robots access and sitemap discovery, ${assetPaths.size} page assets, and asset budgets (${budgetSummary.join(', ')}).`
)
