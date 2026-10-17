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
    .replace(/<([a-z][\w:-]*)\b[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/\1>/gi, ' ')
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

function validateResolvedRouterElements(html, label) {
  const unresolved = html.match(/<(?:nuxtlink|routerlink)\b/i)?.[0]
  if (unresolved) {
    fail(`${label}: generated HTML contains unresolved router element ${unresolved}`)
  }
}

function validatePrimaryNavigation(html, label) {
  const navigation = html.match(/<nav\b[^>]*aria-label="Sections"[^>]*>[\s\S]*?<\/nav>/i)?.[0]
  if (!navigation) fail(`${label}: missing primary Sections navigation`)

  const links = tags(navigation, 'a')
  if (links.length !== 6) {
    fail(`${label}: expected six prerendered primary navigation links, found ${links.length}`)
  }

  const pricingLinks = links.filter(({ attributes }) => attributes.href === '/pricing')
  if (pricingLinks.length !== 1) {
    fail(`${label}: expected one prerendered primary navigation link to /pricing`)
  }

  for (const link of links) {
    const classes = new Set((link.attributes.class || '').split(/\s+/).filter(Boolean))
    if (!classes.has('nav-target')) {
      fail(`${label}: primary navigation link is missing the nav-target class: ${link.raw}`)
    }
  }

  return links.length
}

function extractCanonicalContactEmail(source) {
  const matches = [...source.matchAll(/export const contactEmail = '([^']+)'/g)]
  if (matches.length !== 1) {
    fail(`Contact data: expected one exported contactEmail, found ${matches.length}`)
  }

  return matches[0][1].toLowerCase()
}

function validateContactLink(target, attributes, content, label, canonicalContactEmail) {
  const accessibleLabel = renderedText(content)
  if (!/[a-z0-9]/i.test(accessibleLabel) || /^(?:click here|learn more|link)$/i.test(accessibleLabel)) {
    fail(`${label}: contact link must have a readable, descriptive label: ${attributes.href}`)
  }

  if (target.hash) fail(`${label}: contact link must not contain a fragment: ${attributes.href}`)

  let destination
  try {
    destination = decodeURIComponent(target.pathname)
  } catch {
    fail(`${label}: contact link contains invalid percent-encoding: ${attributes.href}`)
  }

  if (target.protocol === 'mailto:') {
    const emailPattern = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i
    if (!emailPattern.test(destination)) {
      fail(`${label}: malformed email contact destination: ${attributes.href}`)
    }
    if (destination.toLowerCase() !== canonicalContactEmail) {
      fail(`${label}: mailto link must use the canonical contact email: ${attributes.href}`)
    }

    if (accessibleLabel.includes('@') && accessibleLabel.toLowerCase() !== destination.toLowerCase()) {
      fail(`${label}: visible email label must match its mailto destination: ${attributes.href}`)
    }
  } else {
    if (!/^\+?[\d(). -]+$/.test(destination)) {
      fail(`${label}: malformed telephone contact destination: ${attributes.href}`)
    }
    const digits = destination.replace(/\D/g, '')
    if (digits.length < 7 || digits.length > 15) {
      fail(`${label}: telephone contact must contain 7 to 15 digits: ${attributes.href}`)
    }
  }

  return `${target.protocol}${destination.toLowerCase()}`
}

function validateInternalLinks(pages, canonicalContactEmail) {
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
  const contactDestinations = new Set()

  for (const [index, route] of routes.entries()) {
    const label = `route ${route.path}`
    const pageUrl = new URL(route.path, siteUrl)

    for (const { attributes, content } of interactiveElements(pages[index]).filter(
      ({ name }) => name === 'a'
    )) {
      if (!attributes.href) continue

      let target
      try {
        target = new URL(attributes.href, pageUrl)
      } catch {
        fail(`${label}: invalid link URL ${JSON.stringify(attributes.href)}`)
      }

      if (target.protocol === 'mailto:' || target.protocol === 'tel:') {
        contactDestinations.add(
          validateContactLink(target, attributes, content, label, canonicalContactEmail)
        )
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
    contactLinkCount,
    contactDestinationCount: contactDestinations.size
  }
}

function validatePricingEnquiries(html, label) {
  const enquiries = interactiveElements(html).filter(
    ({ name, attributes }) => name === 'a' && attributes['data-enquiry-name']
  )
  if (enquiries.length !== 5) {
    fail(`${label}: expected five package enquiry links, found ${enquiries.length}`)
  }

  const packageNames = new Set()
  for (const { attributes, raw } of enquiries) {
    const packageName = attributes['data-enquiry-name'].trim()
    if (!packageName) fail(`${label}: package enquiry link has an empty identity: ${raw}`)
    if (packageNames.has(packageName)) {
      fail(`${label}: duplicate package enquiry link for ${packageName}`)
    }

    const target = new URL(attributes.href, siteUrl)
    if (target.protocol !== 'mailto:') {
      fail(`${label}: package enquiry must use mailto: ${raw}`)
    }

    const subjects = target.searchParams.getAll('subject')
    const expectedSubject = `${packageName} package enquiry`
    if (subjects.length !== 1 || subjects[0] !== expectedSubject) {
      fail(`${label}: ${packageName} enquiry subject must be ${JSON.stringify(expectedSubject)}`)
    }
    if ([...target.searchParams.keys()].some((key) => key !== 'subject')) {
      fail(`${label}: ${packageName} enquiry link contains an unexpected mail parameter`)
    }

    packageNames.add(packageName)
  }

  return { pricingEnquiryCount: enquiries.length }
}

function validateRuntimeUrl(value, label, reference, runtimeAssets) {
  if (!value || value.startsWith('#')) return

  let url
  try {
    url = new URL(value, siteUrl)
  } catch {
    fail(`${label}: invalid runtime asset URL ${JSON.stringify(value)} in ${reference}`)
  }

  if (url.protocol === 'data:' || url.protocol === 'blob:') return
  if (url.origin !== new URL(siteUrl).origin) {
    fail(`${label}: third-party runtime asset is not allowed in ${reference}: ${value}`)
  }

  runtimeAssets.add(url.href)
}

function validateCssRuntimeAssets(css, label, runtimeAssets) {
  for (const match of css.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)) {
    validateRuntimeUrl(match[2].trim(), label, 'CSS url()', runtimeAssets)
  }

  for (const match of css.matchAll(/@import\s+(['"])(.*?)\1/gi)) {
    validateRuntimeUrl(match[2].trim(), label, 'CSS @import', runtimeAssets)
  }
}

function cssAtRuleBodies(css, rule) {
  const compact = css.replace(/\s+/g, '')
  const bodies = []
  let offset = 0

  while ((offset = compact.indexOf(rule, offset)) !== -1) {
    const openingBrace = compact.indexOf('{', offset + rule.length)
    if (openingBrace === -1) fail(`Generated CSS: ${rule} is missing an opening brace`)

    let depth = 1
    let cursor = openingBrace + 1
    while (cursor < compact.length && depth > 0) {
      if (compact[cursor] === '{') depth += 1
      if (compact[cursor] === '}') depth -= 1
      cursor += 1
    }
    if (depth !== 0) fail(`Generated CSS: ${rule} has an unclosed block`)

    bodies.push(compact.slice(openingBrace + 1, cursor - 1))
    offset = cursor
  }

  return bodies
}

function validateReducedMotion(css) {
  const reduceRule = '@media(prefers-reduced-motion:reduce)'
  const reduceBodies = cssAtRuleBodies(css, reduceRule)
  if (reduceBodies.length === 0) fail('Generated CSS: missing reduced-motion fallback')

  const reducedCss = reduceBodies.join('')
  const requiredGlobalOverrides = [
    'animation-duration:.01ms!important',
    'animation-delay:0s!important',
    'animation-iteration-count:1!important',
    'transition-duration:.01ms!important',
    'scroll-behavior:auto!important'
  ]

  for (const declaration of requiredGlobalOverrides) {
    if (!reducedCss.includes(declaration)) {
      fail(`Generated CSS: reduced-motion fallback is missing ${declaration}`)
    }
  }
  if (!/\.tape-track(?:\[[^\]]+\])?\{animation:none\}/.test(reducedCss)) {
    fail('Generated CSS: reduced-motion fallback must stop the marquee')
  }
  if (!/\.ring-stage(?:\[[^\]]+\])?\{display:none\}/.test(reducedCss)) {
    fail('Generated CSS: reduced-motion fallback must hide the decorative orbit')
  }

  const noPreferenceCss = cssAtRuleBodies(
    css,
    '@media(prefers-reduced-motion:no-preference)'
  ).join('')
  if (!noPreferenceCss.includes('animation-timeline:view()')) {
    fail('Generated CSS: scroll-driven motion must require no motion preference')
  }

  return {
    reducedMotionBlockCount: reduceBodies.length,
    keyframeCount: [...css.matchAll(/@keyframes\s+[\w-]+/g)].length
  }
}

function validateFocusStyles(css) {
  const compact = css.replace(/\s+/g, '')
  const focusRules = [...compact.matchAll(/([^{}]*:focus-visible[^{}]*)\{([^{}]*)\}/g)]
  if (focusRules.length === 0) fail('Generated CSS: missing :focus-visible styles')

  const globalFocusRule = focusRules.find(([, selector]) => selector === ':focus-visible')
  if (!globalFocusRule) fail('Generated CSS: missing global :focus-visible style')

  const declarations = globalFocusRule[2]
  if (!declarations.includes('outline:2pxsolidrgb(var(--ink))')) {
    fail('Generated CSS: global focus indicator must use a visible 2px solid outline')
  }
  if (!declarations.includes('outline-offset:3px')) {
    fail('Generated CSS: global focus indicator must be offset from the focused control')
  }

  for (const [, selector, body] of focusRules) {
    if (/(?:^|;)outline:(?:0|none)(?:;|$)/.test(body)) {
      fail(`Generated CSS: ${selector} must not suppress the focus outline`)
    }
  }

  return { focusRuleCount: focusRules.length }
}

function validateMobileNavigationTargets(css) {
  const mobileRule = '@media(max-width:39.999rem)'
  const mobileBodies = cssAtRuleBodies(css, mobileRule)
  if (mobileBodies.length === 0) {
    fail('Generated CSS: missing the mobile navigation target breakpoint')
  }

  const targetRules = mobileBodies.flatMap((body) =>
    [...body.matchAll(/\.nav-target\{([^{}]*)\}/g)].map((match) => match[1])
  )
  if (targetRules.length === 0) {
    fail('Generated CSS: mobile breakpoint is missing the .nav-target rule')
  }

  const hasAccessibleTarget = targetRules.some((declarations) => {
    const properties = new Map(
      declarations
        .split(';')
        .filter(Boolean)
        .map((declaration) => declaration.split(/:(.*)/s, 2))
    )

    return (
      properties.get('display') === 'inline-flex' &&
      properties.get('min-width') === '44px' &&
      properties.get('min-height') === '44px'
    )
  })

  if (!hasAccessibleTarget) {
    fail('Generated CSS: mobile .nav-target must be inline-flex with a 44px minimum width and height')
  }

  return { mobileTargetRuleCount: targetRules.length }
}

function validateScreenReaderOnlyStyles(css) {
  const compact = css.replace(/\s+/g, '')
  const ruleBodies = [...compact.matchAll(/\.sr-only\{([^{}]*)\}/g)].map((match) => match[1])
  if (ruleBodies.length === 0) fail('Generated CSS: missing .sr-only styles')

  const properties = new Map(
    ruleBodies.flatMap((body) =>
      body
        .split(';')
        .filter(Boolean)
        .map((declaration) => declaration.split(/:(.*)/s, 2))
    )
  )
  const requiredProperties = new Map([
    ['position', 'absolute'],
    ['white-space', 'nowrap'],
    ['border-width', '0'],
    ['width', '1px'],
    ['height', '1px'],
    ['margin', '-1px'],
    ['padding', '0'],
    ['overflow', 'hidden']
  ])

  for (const [property, value] of requiredProperties) {
    if (properties.get(property) !== value) {
      fail(`Generated CSS: .sr-only must set ${property}:${value}`)
    }
  }

  const hasClipping =
    properties.get('clip-path') === 'inset(50%)' ||
    properties.get('clip') === 'rect(0,0,0,0)'
  if (!hasClipping) fail('Generated CSS: .sr-only must clip content outside the visible canvas')

  return { screenReaderOnlyRuleCount: ruleBodies.length }
}

function validateProjectLinkConsistency(projectLinks) {
  const layoutNames = new Map([
    ['row', 'project index'],
    ['tile', 'work grid']
  ])
  const linksByLayout = new Map([...layoutNames].map(([layout]) => [layout, new Map()]))

  for (const link of projectLinks) {
    const layoutLinks = linksByLayout.get(link.layout)
    if (layoutLinks.has(link.name)) {
      fail(`Generated projects: duplicate ${layoutNames.get(link.layout)} link for ${link.name}`)
    }
    layoutLinks.set(link.name, link.href)
  }

  const [indexLinks, gridLinks] = [...linksByLayout.values()]
  if (indexLinks.size === 0 || gridLinks.size === 0) {
    fail('Generated projects: both the project index and work grid must contain linked projects')
  }

  const projectNames = new Set([...indexLinks.keys(), ...gridLinks.keys()])
  for (const name of projectNames) {
    if (!indexLinks.has(name)) {
      fail(`Generated projects: work grid project ${name} is missing from the project index`)
    }
    if (!gridLinks.has(name)) {
      fail(`Generated projects: project index project ${name} is missing from the work grid`)
    }
    if (indexLinks.get(name) !== gridLinks.get(name)) {
      fail(`Generated projects: ${name} uses inconsistent URLs across project layouts`)
    }
  }

  return {
    linkedProjectCount: projectNames.size,
    projectLayoutCount: linksByLayout.size
  }
}

function validateUnlinkedProjectConsistency(projectEntries) {
  const layoutNames = new Map([
    ['row', 'project index'],
    ['tile', 'work grid']
  ])
  const projectsByLayout = new Map([...layoutNames].map(([layout]) => [layout, new Set()]))

  for (const entry of projectEntries) {
    const projects = projectsByLayout.get(entry.layout)
    if (projects.has(entry.name)) {
      fail(`Generated projects: duplicate unlinked ${layoutNames.get(entry.layout)} entry for ${entry.name}`)
    }
    projects.add(entry.name)
  }

  const [indexProjects, gridProjects] = [...projectsByLayout.values()]
  const projectNames = new Set([...indexProjects, ...gridProjects])
  for (const name of projectNames) {
    if (!indexProjects.has(name)) {
      fail(`Generated projects: unlinked work grid project ${name} is missing from the project index`)
    }
    if (!gridProjects.has(name)) {
      fail(`Generated projects: unlinked project index project ${name} is missing from the work grid`)
    }
  }

  return {
    unlinkedProjectCount: projectNames.size,
    projectLayoutCount: projectsByLayout.size
  }
}

function validateProjectScreenshots(screenshots, projectLinks, unlinkedProjectEntries) {
  const expectedNames = new Set([
    ...projectLinks.map(({ name }) => name),
    ...unlinkedProjectEntries.map(({ name }) => name)
  ])
  const names = new Set()
  const sources = new Set()

  for (const screenshot of screenshots) {
    if (names.has(screenshot.name)) {
      fail(`Generated projects: duplicate screenshot for ${screenshot.name}`)
    }
    if (sources.has(screenshot.src)) {
      fail(`Generated projects: screenshot source is reused: ${screenshot.src}`)
    }
    if (!expectedNames.has(screenshot.name)) {
      fail(`Generated projects: screenshot has no matching project entry: ${screenshot.name}`)
    }
    names.add(screenshot.name)
    sources.add(screenshot.src)
  }

  for (const name of expectedNames) {
    if (!names.has(name)) fail(`Generated projects: ${name} is missing its project screenshot`)
  }

  return { projectScreenshotCount: screenshots.length }
}

function validateRuntimeAssets(pages) {
  const runtimeAssets = new Set()
  const resourceAttributes = {
    audio: ['src'],
    embed: ['src'],
    iframe: ['src'],
    img: ['src', 'srcset'],
    input: ['src'],
    object: ['data'],
    script: ['src'],
    source: ['src', 'srcset'],
    track: ['src'],
    video: ['src', 'poster']
  }
  const resourceLinkRelations = new Set([
    'apple-touch-icon',
    'icon',
    'manifest',
    'modulepreload',
    'preload',
    'stylesheet'
  ])

  for (const [index, html] of pages.entries()) {
    const label = `route ${routes[index].path}`

    for (const element of openingTags(html)) {
      let attributes = resourceAttributes[element.name] || []
      if (element.name === 'link') {
        const relationships = new Set((element.attributes.rel || '').toLowerCase().split(/\s+/))
        attributes = [...relationships].some((relationship) => resourceLinkRelations.has(relationship))
          ? ['href']
          : []
      }

      for (const attribute of attributes) {
        const value = element.attributes[attribute]
        if (!value) continue
        const values = attribute === 'srcset'
          ? value.split(',').map((candidate) => candidate.trim().split(/\s+/, 1)[0])
          : [value]

        for (const asset of values) {
          validateRuntimeUrl(asset, label, `<${element.name}> ${attribute}`, runtimeAssets)
        }
      }
    }

    for (const [, css] of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
      validateCssRuntimeAssets(css, `${label} inline CSS`, runtimeAssets)
    }
  }

  return runtimeAssets
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
  let newTabLinkCount = 0
  let descriptiveProjectLinkCount = 0
  const hiddenExternalArrowCount = [
    ...html.matchAll(/<span\b[^>]*aria-hidden="true"[^>]*>\s*↗\s*<\/span>/gi)
  ].length

  if (renderedText(html).includes('↗')) {
    fail(`${label}: decorative external-link arrows must be hidden from assistive technology`)
  }
  const imageDimensions = []
  const projectLinks = []
  const unlinkedProjectEntries = []
  const projectScreenshots = []
  for (const image of tags(html, 'img')) {
    if (!Object.hasOwn(image.attributes, 'alt')) {
      fail(`${label}: image is missing an alt attribute: ${image.raw}`)
    }

    const alternative = image.attributes.alt.trim()
    const projectName = image.attributes['data-project-name']?.trim()
    if (projectName) {
      const expectedAlternative = `Screenshot of ${projectName}`
      if (alternative !== expectedAlternative) {
        fail(`${label}: project screenshot alt must be ${JSON.stringify(expectedAlternative)}: ${image.raw}`)
      }
      projectScreenshots.push({
        name: projectName,
        src: image.attributes.src
      })
    }
    const role = image.attributes.role?.toLowerCase()
    const isDecorative =
      image.attributes['aria-hidden'] === 'true' || role === 'none' || role === 'presentation'

    if (!alternative && !isDecorative) {
      fail(`${label}: empty image alt text must be explicitly decorative: ${image.raw}`)
    }
    if (alternative && isDecorative) {
      fail(`${label}: decorative image must have empty alt text: ${image.raw}`)
    }

    const width = image.attributes.width
    const height = image.attributes.height
    if (!/^[1-9]\d*$/.test(width || '') || !/^[1-9]\d*$/.test(height || '')) {
      fail(`${label}: image must declare positive integer dimensions: ${image.raw}`)
    }
    if (!image.attributes.src) fail(`${label}: image is missing a src attribute: ${image.raw}`)
    imageDimensions.push({
      src: image.attributes.src,
      width: Number(width),
      height: Number(height)
    })

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

  for (const element of openingTags(html)) {
    const classes = new Set((element.attributes.class || '').split(/\s+/).filter(Boolean))
    const layout = !classes.has('group')
      ? null
      : classes.has('row')
        ? 'row'
        : classes.has('tile')
          ? 'tile'
          : null
    if (!layout) continue

    const name = element.attributes['data-project-name']?.trim()
    const linked = element.attributes['data-project-linked']
    if (!name || !['true', 'false'].includes(linked)) {
      fail(`${label}: project entry must declare its name and linked state: ${element.raw}`)
    }

    if (linked === 'true' && element.name !== 'a') {
      fail(`${label}: linked project must render as an anchor: ${element.raw}`)
    }
    if (linked === 'false') {
      const forbiddenAttributes = ['href', 'target', 'rel', 'aria-label', 'tabindex']
      const hasInteractiveAttribute = forbiddenAttributes.some((attribute) =>
        Object.hasOwn(element.attributes, attribute)
      )
      const hasInteractiveRole = ['button', 'link'].includes(element.attributes.role)
      if (element.name !== 'div' || hasInteractiveAttribute || hasInteractiveRole) {
        fail(`${label}: unlinked project must remain a non-interactive div: ${element.raw}`)
      }
      unlinkedProjectEntries.push({ name, layout })
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

    if (control.name === 'a' && control.attributes.target === '_blank') {
      if (!/opens in a new tab/i.test(renderedText(control.content))) {
        fail(`${label}: target=_blank link must announce that it opens in a new tab: ${control.raw}`)
      }
      newTabLinkCount += 1

      const classes = new Set((control.attributes.class || '').split(/\s+/).filter(Boolean))
      const isProjectLink = classes.has('row') || classes.has('tile')
      if (isProjectLink) {
        const accessibleName = control.attributes['aria-label'] || ''
        const projectName = accessibleName.match(
          /^View (.+) project \(opens in a new tab\)$/i
        )?.[1]
        if (!projectName) {
          fail(
            `${label}: project link must have a descriptive project-specific aria-label with new-tab context: ${control.raw}`
          )
        }
        projectLinks.push({
          name: projectName,
          href: control.attributes.href,
          layout: classes.has('row') ? 'row' : 'tile'
        })
        descriptiveProjectLinkCount += 1
      }
    }
  }

  return {
    controlCount: controls.length,
    informativeImageCount,
    decorativeImageCount,
    eagerImageCount,
    lazyImageCount,
    newTabLinkCount,
    descriptiveProjectLinkCount,
    hiddenExternalArrowCount,
    imageDimensions,
    projectLinks,
    unlinkedProjectEntries,
    projectScreenshots
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
  const format = image.subarray(12, 16).toString()
  let actualWidth
  let actualHeight

  if (format === 'VP8 ') {
    if (image.subarray(23, 26).toString('hex') !== '9d012a') {
      fail(`${relativePath}: invalid VP8 frame header`)
    }
    actualWidth = image.readUInt16LE(26) & 0x3fff
    actualHeight = image.readUInt16LE(28) & 0x3fff
  } else if (format === 'VP8L') {
    if (image[20] !== 0x2f) fail(`${relativePath}: invalid VP8L signature`)
    const dimensions = image.readUInt32LE(21)
    actualWidth = (dimensions & 0x3fff) + 1
    actualHeight = ((dimensions >>> 14) & 0x3fff) + 1
  } else if (format === 'VP8X') {
    actualWidth = image.readUIntLE(24, 3) + 1
    actualHeight = image.readUIntLE(27, 3) + 1
  } else {
    fail(`${relativePath}: unsupported WebP format ${JSON.stringify(format)}`)
  }

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
let primaryNavigationLinkCount = 0
let informativeImageCount = 0
let decorativeImageCount = 0
let eagerImageCount = 0
let lazyImageCount = 0
let newTabLinkCount = 0
let descriptiveProjectLinkCount = 0
let hiddenExternalArrowCount = 0
const renderedImageDimensions = new Map()
const renderedProjectLinks = []
const renderedUnlinkedProjectEntries = []
const renderedProjectScreenshots = []

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
  validateResolvedRouterElements(html, label)
  primaryNavigationLinkCount += validatePrimaryNavigation(html, label)

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
  newTabLinkCount += accessibility.newTabLinkCount
  descriptiveProjectLinkCount += accessibility.descriptiveProjectLinkCount
  hiddenExternalArrowCount += accessibility.hiddenExternalArrowCount
  renderedProjectLinks.push(...accessibility.projectLinks)
  renderedUnlinkedProjectEntries.push(...accessibility.unlinkedProjectEntries)
  renderedProjectScreenshots.push(...accessibility.projectScreenshots)
  for (const image of accessibility.imageDimensions) {
    const previous = renderedImageDimensions.get(image.src)
    if (previous && (previous.width !== image.width || previous.height !== image.height)) {
      fail(`${label}: inconsistent dimensions for image ${image.src}`)
    }
    renderedImageDimensions.set(image.src, image)
  }
  generatedPages.push(html)
}

const projectConsistency = validateProjectLinkConsistency(renderedProjectLinks)
const unlinkedProjectConsistency = validateUnlinkedProjectConsistency(
  renderedUnlinkedProjectEntries
)
const projectScreenshots = validateProjectScreenshots(
  renderedProjectScreenshots,
  renderedProjectLinks,
  renderedUnlinkedProjectEntries
)

for (const [src, dimensions] of renderedImageDimensions) {
  const url = new URL(src, siteUrl)
  if (url.origin !== siteUrl) continue

  const relativePath = decodeURIComponent(url.pathname).replace(/^\//, '')
  const extension = extname(relativePath).toLowerCase()
  if (extension === '.png') {
    await requirePngDimensions(relativePath, dimensions.width, dimensions.height)
  } else if (extension === '.webp') {
    await requireWebpDimensions(relativePath, dimensions.width, dimensions.height)
  } else {
    fail(`Unsupported rendered image format for dimension validation: ${src}`)
  }
}

const {
  internalLinkCount,
  externalHttpsLinkCount,
  contactLinkCount,
  contactDestinationCount
} = validateInternalLinks(
  generatedPages,
  extractCanonicalContactEmail(await readFile(join(root, 'app/data/nav.ts'), 'utf8'))
)
const { pricingEnquiryCount } = validatePricingEnquiries(generatedPages[1], 'route /pricing')
const runtimeAssets = validateRuntimeAssets(generatedPages)

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
const generatedCssFiles = generatedFiles.filter((file) => extname(file).toLowerCase() === '.css')
const generatedCss = []
for (const path of generatedCssFiles) {
  const css = await readFile(path, 'utf8')
  generatedCss.push(css)
  validateCssRuntimeAssets(
    css,
    `generated CSS ${relative(outputDir, path)}`,
    runtimeAssets
  )
}
const combinedGeneratedCss = generatedCss.join('\n')
const reducedMotion = validateReducedMotion(combinedGeneratedCss)
const focusStyles = validateFocusStyles(combinedGeneratedCss)
const mobileNavigation = validateMobileNavigationTargets(combinedGeneratedCss)
const screenReaderOnly = validateScreenReaderOnlyStyles(combinedGeneratedCss)
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
  `Validated ${routes.length} indexable routes with resolved router elements and ${primaryNavigationLinkCount} prerendered primary navigation links backed by ${mobileNavigation.mobileTargetRuleCount} mobile target rule, unique ids and resolved accessibility references, ${accessibleControlCount} links and buttons with accessible names including ${descriptiveProjectLinkCount} descriptive project links representing ${projectConsistency.linkedProjectCount} linked projects consistently across ${projectConsistency.projectLayoutCount} layouts, ${unlinkedProjectConsistency.unlinkedProjectCount} unlinked project remaining non-interactive across ${unlinkedProjectConsistency.projectLayoutCount} layouts, ${projectScreenshots.projectScreenshotCount} uniquely sourced project screenshots with matching alternative text, and ${newTabLinkCount} new-tab announcements backed by ${screenReaderOnly.screenReaderOnlyRuleCount} visually-hidden CSS rules, ${hiddenExternalArrowCount} hidden decorative external-link arrows, and ${focusStyles.focusRuleCount} visible focus style, ${informativeImageCount} informative and ${decorativeImageCount} explicitly decorative images, ${eagerImageCount} eager high-priority and ${lazyImageCount} lazy images with asynchronous decoding, intrinsic dimensions for ${renderedImageDimensions.size} rendered image assets, ${runtimeAssets.size} self-hosted runtime assets, ${reducedMotion.keyframeCount} animation definitions with ${reducedMotion.reducedMotionBlockCount} reduced-motion fallbacks, ${internalLinkCount} internal links and fragments, ${externalHttpsLinkCount} HTTPS external links, ${contactLinkCount} readable contact links across ${contactDestinationCount} well-formed destinations including ${pricingEnquiryCount} package-specific enquiry subjects, document setup, custom 404 recovery, accessibility, unique route metadata, social share image, optimized favicon, install icons, ${serviceImages.length} optimized service images, web manifest, Person structured data, robots access and sitemap discovery, ${assetPaths.size} page assets, and asset budgets (${budgetSummary.join(', ')}).`
)
