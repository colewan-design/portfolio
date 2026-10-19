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
    title: 'Pricing — Christian Colewan'
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

function labelElements(html) {
  return [...html.matchAll(/<label\b([^>]*)>([\s\S]*?)<\/label>/gi)].map(
    ([raw, attributes, content]) => ({
      raw,
      attributes: parseAttributes(attributes),
      content
    })
  )
}

function elementsWithContentAttribute(html, attribute) {
  const pattern = new RegExp(
    `<([a-z][\\w:-]*)\\b([^>]*\\b${attribute}="[^"]+"[^>]*)>([\\s\\S]*?)<\\/\\1>`,
    'gi'
  )

  return [...html.matchAll(pattern)].map(([raw, name, attributes, content]) => ({
    name: name.toLowerCase(),
    raw,
    attributes: parseAttributes(attributes),
    content
  }))
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
  return openingTags(html).flatMap(({ attributes }) =>
    Object.hasOwn(attributes, 'id') ? [attributes.id] : []
  )
}

function isLabelableElement(element) {
  if (element.name === 'input') {
    return element.attributes.type?.trim().toLowerCase() !== 'hidden'
  }

  return ['button', 'meter', 'output', 'progress', 'select', 'textarea'].includes(element.name)
}

function hasNativeInputName(element) {
  if (element.name !== 'input') return false

  const type = element.attributes.type?.trim().toLowerCase() || 'text'
  if (['reset', 'submit'].includes(type)) return true
  if (type === 'image') return Boolean(element.attributes.alt?.trim())
  if (type === 'button') return Boolean(element.attributes.value?.trim())
  return false
}

function isFocusableElement(element) {
  if (Object.hasOwn(element.attributes, 'tabindex')) return true

  const contentEditable = element.attributes.contenteditable?.trim().toLowerCase()
  if (contentEditable !== undefined && contentEditable !== 'false') return true

  if (['a', 'area'].includes(element.name)) {
    return Boolean(element.attributes.href?.trim())
  }

  const disabled = Object.hasOwn(element.attributes, 'disabled')
  if (element.name === 'input') {
    return !disabled && element.attributes.type?.trim().toLowerCase() !== 'hidden'
  }
  if (['button', 'select', 'textarea'].includes(element.name)) return !disabled
  if (['audio', 'video'].includes(element.name)) {
    return Object.hasOwn(element.attributes, 'controls')
  }

  return ['iframe', 'summary'].includes(element.name)
}

function validateAriaHiddenFocusParsing() {
  const [decorativeElement] = openingTags('<span aria-hidden="true">Decoration</span>')
  if (isFocusableElement(decorativeElement)) {
    fail('ARIA-hidden focus parser: decorative elements must remain non-focusable')
  }

  const [hiddenLink] = openingTags(
    '<a href="/pricing" aria-hidden="true">Hidden pricing link</a>'
  )
  if (!isFocusableElement(hiddenLink)) {
    fail('ARIA-hidden focus parser: links with href must remain detectable as focusable')
  }

  const [decorativeContainer] = elementsWithContentAttribute(
    '<div aria-hidden="true"><span>Decoration</span></div>',
    'aria-hidden'
  )
  if (openingTags(decorativeContainer.content).some(isFocusableElement)) {
    fail('ARIA-hidden focus parser: decorative descendants must remain non-focusable')
  }

  const [hiddenFocusContainer] = elementsWithContentAttribute(
    '<div aria-hidden="true"><span><a href="/pricing">Hidden pricing link</a></span></div>',
    'aria-hidden'
  )
  if (!openingTags(hiddenFocusContainer.content).some(isFocusableElement)) {
    fail('ARIA-hidden focus parser: nested focusable descendants must remain detectable')
  }

  return { ariaHiddenFocusProbeCount: 4 }
}

function focusableInteractiveDescendant(element) {
  if (!isFocusableElement(element)) return undefined
  return openingTags(element.content).find(isFocusableElement)
}

function validateNestedInteractiveParsing() {
  const [validLink] = interactiveElements(
    '<a href="/pricing"><span>View pricing</span></a>'
  )
  if (focusableInteractiveDescendant(validLink)) {
    fail('Nested interactive parser: presentational descendants must remain allowed')
  }

  const [linkInButton] = interactiveElements(
    '<button type="button"><a href="/pricing">View pricing</a></button>'
  )
  const [buttonInLink] = interactiveElements(
    '<a href="/pricing"><button type="button">View pricing</button></a>'
  )
  if (
    !focusableInteractiveDescendant(linkInButton) ||
    !focusableInteractiveDescendant(buttonInLink)
  ) {
    fail('Nested interactive parser: nested links and buttons must remain detectable')
  }

  return { nestedInteractiveProbeCount: 3 }
}

function hasMissingOrEmptyHref(element) {
  return (
    element.name === 'a' &&
    (!Object.hasOwn(element.attributes, 'href') || element.attributes.href.trim().length === 0)
  )
}

function hasPlaceholderHref(element) {
  return element.name === 'a' && element.attributes.href?.trim() === '#'
}

function hasSurroundingHrefWhitespace(element) {
  return (
    element.name === 'a' &&
    Object.hasOwn(element.attributes, 'href') &&
    referenceHasSurroundingWhitespace(element.attributes.href)
  )
}

function referenceHasSurroundingWhitespace(value) {
  return typeof value === 'string' && value !== value.trim()
}

function referenceIsEmpty(value) {
  return typeof value !== 'string' || value.trim().length === 0
}

function referenceUsesAllowedScheme(value, allowedSchemes) {
  if (typeof value !== 'string') return false

  try {
    return allowedSchemes.has(new URL(value, siteUrl).protocol)
  } catch {
    return false
  }
}

function parseSrcsetCandidates(value) {
  if (typeof value !== 'string' || value.trim().length === 0) return null

  const candidates = []
  let position = 0

  while (position < value.length) {
    while (/\s/.test(value[position] || '')) position += 1
    if (position >= value.length || value[position] === ',') return null

    const urlStart = position
    while (position < value.length && !/\s/.test(value[position])) position += 1
    let url = value.slice(urlStart, position)
    let separatedByUrlComma = false

    if (url.endsWith(',')) {
      const withoutSeparator = url.replace(/,$/, '')
      if (!withoutSeparator || withoutSeparator.endsWith(',')) return null
      url = withoutSeparator
      separatedByUrlComma = true
    }

    const descriptors = []
    if (!separatedByUrlComma) {
      while (position < value.length) {
        while (/\s/.test(value[position] || '')) position += 1
        if (position >= value.length || value[position] === ',') break

        const descriptorStart = position
        while (position < value.length && !/[\s,]/.test(value[position])) position += 1
        descriptors.push(value.slice(descriptorStart, position))
      }
    }

    if (descriptors.length > 1) return null

    const descriptor = descriptors[0]
    let descriptorType = 'x'
    let descriptorValue = 1

    if (descriptor) {
      if (/^\d+w$/.test(descriptor)) {
        descriptorType = 'w'
        descriptorValue = Number.parseInt(descriptor, 10)
      } else if (/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?x$/i.test(descriptor)) {
        descriptorValue = Number.parseFloat(descriptor.slice(0, -1))
      } else {
        return null
      }

      if (!Number.isFinite(descriptorValue) || descriptorValue <= 0) return null
    }

    candidates.push({ url, descriptorType, descriptorValue })

    if (separatedByUrlComma) {
      if (position >= value.length) return null
    } else if (position < value.length) {
      position += 1
      if (position >= value.length) return null
    }
  }

  const descriptorTypes = new Set(candidates.map(({ descriptorType }) => descriptorType))
  if (descriptorTypes.size !== 1) return null

  const descriptorValues = candidates.map(({ descriptorValue }) => descriptorValue)
  if (new Set(descriptorValues).size !== descriptorValues.length) return null

  return candidates
}

function splitTopLevelCommaList(value) {
  const items = []
  let depth = 0
  let itemStart = 0

  for (let position = 0; position < value.length; position += 1) {
    const character = value[position]
    if (character === '(') depth += 1
    if (character === ')') {
      depth -= 1
      if (depth < 0) return null
    }
    if (character === ',' && depth === 0) {
      const item = value.slice(itemStart, position).trim()
      if (!item) return null
      items.push(item)
      itemStart = position + 1
    }
  }

  if (depth !== 0) return null
  const finalItem = value.slice(itemStart).trim()
  if (!finalItem) return null
  items.push(finalItem)
  return items
}

function sourceSizeValueStart(component) {
  let depth = 0

  for (let position = component.length - 1; position >= 0; position -= 1) {
    const character = component[position]
    if (character === ')') depth += 1
    if (character === '(') depth -= 1
    if (/\s/.test(character) && depth === 0) return position + 1
  }

  return 0
}

function isValidSourceSizeValue(value) {
  if (value === 'auto' || value === '0') return true
  if (/^(?:\d+(?:\.\d*)?|\.\d+)(?:px|em|rem|ch|ex|cap|ic|lh|rlh|vw|vh|vi|vb|vmin|vmax|cm|mm|q|in|pc|pt)$/i.test(value)) {
    return true
  }

  return /^(?:calc|min|max|clamp)\(.+\)$/i.test(value)
}

function parseSizesAttribute(value) {
  if (typeof value !== 'string' || value.trim().length === 0) return null

  const components = splitTopLevelCommaList(value)
  if (!components) return null

  const parsedComponents = []
  for (const component of components) {
    const valueStart = sourceSizeValueStart(component)
    const mediaCondition = component.slice(0, valueStart).trim()
    const sourceSizeValue = component.slice(valueStart).trim()

    if (!isValidSourceSizeValue(sourceSizeValue)) return null
    if (mediaCondition && !(mediaCondition.startsWith('(') && mediaCondition.endsWith(')'))) {
      return null
    }
    parsedComponents.push({ mediaCondition, sourceSizeValue })
  }

  return parsedComponents
}

function sizesHasUnconditionalFallback(components) {
  return components?.at(-1)?.mediaCondition === ''
}

function hasValidSizesAttribute(value) {
  const components = parseSizesAttribute(value)
  return Boolean(components && sizesHasUnconditionalFallback(components))
}

function srcsetRequiresSizes(candidates) {
  return candidates?.[0]?.descriptorType === 'w'
}

function hasHrefControlCharacter(element) {
  return (
    element.name === 'a' &&
    Object.hasOwn(element.attributes, 'href') &&
    referenceHasLiteralControlCharacter(element.attributes.href)
  )
}

function referenceHasLiteralControlCharacter(value) {
  return typeof value === 'string' && /[\u0000-\u001f\u007f]/.test(value)
}

function referenceHasControlCharacterReference(value) {
  if (typeof value !== 'string') return false
  if (value.includes('&Tab;') || value.includes('&NewLine;')) return true

  for (const match of value.matchAll(/&#(?:[xX]([0-9a-fA-F]+)|([0-9]+));/g)) {
    const isHexadecimal = match[1] !== undefined
    const codePoint = Number.parseInt(match[1] ?? match[2], isHexadecimal ? 16 : 10)
    if (codePoint <= 0x1f || codePoint === 0x7f) return true
  }

  return false
}

function hasHrefControlCharacterReference(element) {
  return (
    element.name === 'a' &&
    Object.hasOwn(element.attributes, 'href') &&
    referenceHasControlCharacterReference(element.attributes.href)
  )
}

function hasMalformedHrefPercentEncoding(element) {
  return (
    element.name === 'a' &&
    Object.hasOwn(element.attributes, 'href') &&
    referenceHasMalformedPercentEncoding(element.attributes.href)
  )
}

function referenceHasMalformedPercentEncoding(value) {
  return typeof value === 'string' && /%(?![0-9a-fA-F]{2})/.test(value)
}

function referenceHasPercentEncodedControlCharacter(value) {
  return typeof value === 'string' && /%(?:0[0-9a-f]|1[0-9a-f]|7f)/i.test(value)
}

function hasHrefPercentEncodedControlCharacter(element) {
  return (
    element.name === 'a' &&
    Object.hasOwn(element.attributes, 'href') &&
    referenceHasPercentEncodedControlCharacter(element.attributes.href)
  )
}

function hasHttpCredentials(target) {
  return (
    (target.protocol === 'http:' || target.protocol === 'https:') &&
    (target.username.length > 0 || target.password.length > 0)
  )
}

function referenceHasHttpCredentials(value) {
  if (typeof value !== 'string' || !value) return false

  try {
    return hasHttpCredentials(new URL(value, siteUrl))
  } catch {
    return false
  }
}

function isProtocolRelativeExternalHref(href, pageUrl) {
  if (!href.startsWith('//')) return false
  return new URL(href, pageUrl).origin !== pageUrl.origin
}

function isProtocolRelativeReference(value) {
  return /^\s*\/\//.test(value)
}

function validateAnchorHrefParsing() {
  const validLinks = interactiveElements(
    '<a href="/pricing">Pricing</a><a href="#main">Main</a>' +
      '<a href="mailto:hello@example.com">Email</a><a href="https://example.com">External</a>'
  )
  const invalidLinks = interactiveElements(
    '<a>Missing</a><a href="">Empty</a><a href="   ">Whitespace</a>'
  )
  const placeholderLinks = interactiveElements(
    '<a href="#">Placeholder</a><a href="  #  ">Padded placeholder</a>'
  )

  if (validLinks.some(hasMissingOrEmptyHref)) {
    fail('Anchor href parser: route, fragment, contact and HTTPS destinations must remain valid')
  }
  if (invalidLinks.some((link) => !hasMissingOrEmptyHref(link))) {
    fail('Anchor href parser: missing, empty and whitespace-only destinations must remain invalid')
  }
  if (
    validLinks.some(hasPlaceholderHref) ||
    placeholderLinks.some((link) => !hasPlaceholderHref(link))
  ) {
    fail('Anchor href parser: bare fragment placeholders must remain invalid')
  }

  return {
    anchorHrefProbeCount: validLinks.length + invalidLinks.length + placeholderLinks.length
  }
}

function validateHrefWhitespaceParsing() {
  const validLinks = interactiveElements(
    '<a href="/pricing">Pricing</a><a href="#main">Main</a>' +
      '<a href="mailto:hello@example.com">Email</a><a href="https://example.com">External</a>'
  )
  const paddedLinks = interactiveElements(
    '<a href=" /pricing">Leading</a><a href="/pricing ">Trailing</a>' +
      '<a href="\t#main\n">Control whitespace</a>'
  )

  if (validLinks.some(hasSurroundingHrefWhitespace)) {
    fail('Href whitespace parser: clean route, fragment, contact and HTTPS destinations must remain valid')
  }
  if (paddedLinks.some((link) => !hasSurroundingHrefWhitespace(link))) {
    fail('Href whitespace parser: leading and trailing whitespace must remain detectable')
  }

  return { hrefWhitespaceProbeCount: validLinks.length + paddedLinks.length }
}

function validateHrefControlCharacterParsing() {
  const validLinks = interactiveElements(
    '<a href="/pricing">Pricing</a><a href="#main">Main</a>' +
      '<a href="mailto:hello@example.com">Email</a><a href="https://example.com">External</a>'
  )
  const invalidLinks = interactiveElements(
    '<a href="/pri\tcing">Tab</a><a href="https://exa\nmple.com">Line break</a>' +
      '<a href="mailto:hello@example.com\u007f">Delete</a>'
  )

  if (validLinks.some(hasHrefControlCharacter)) {
    fail('Href control parser: clean route, fragment, contact and HTTPS destinations must remain valid')
  }
  if (invalidLinks.some((link) => !hasHrefControlCharacter(link))) {
    fail('Href control parser: embedded ASCII control characters must remain detectable')
  }

  return { hrefControlProbeCount: validLinks.length + invalidLinks.length }
}

function validateHrefControlCharacterReferenceParsing() {
  const validLinks = interactiveElements(
    '<a href="/pricing">Pricing</a><a href="#main">Main</a>' +
      '<a href="mailto:hello@example.com">Email</a><a href="https://example.com">External</a>' +
      '<a href="/pricing?letter=&#65;">Printable numeric reference</a>' +
      '<a href="/pricing?first=A&amp;second=B">Escaped ampersand</a>'
  )
  const invalidLinks = interactiveElements(
    '<a href="/pri&#9;cing">Decimal tab</a><a href="/pri&#x09;cing">Hex tab</a>' +
      '<a href="https://exa&#10;mple.com">Decimal line break</a>' +
      '<a href="https://exa&NewLine;mple.com">Named line break</a>' +
      '<a href="mailto:hello@example.com&Tab;subject=Hello">Named tab</a>'
  )

  if (validLinks.some(hasHrefControlCharacterReference)) {
    fail('Href character-reference parser: printable and escaped punctuation references must remain valid')
  }
  if (invalidLinks.some((link) => !hasHrefControlCharacterReference(link))) {
    fail('Href character-reference parser: references that decode to ASCII controls must remain detectable')
  }

  return {
    hrefControlReferenceProbeCount: validLinks.length + invalidLinks.length
  }
}

function validateHrefPercentEncodingParsing() {
  const validLinks = interactiveElements(
    '<a href="/pricing?discount=20%25">Encoded percent</a><a href="#main%2Dcontent">Encoded fragment</a>' +
      '<a href="mailto:hello@example.com?subject=Hello%20there">Encoded contact subject</a>' +
      '<a href="https://example.com/search?q=%E2%9C%93">Encoded external query</a>' +
      '<a href="/pricing?redirect=%252Fpricing">Double-encoded path</a>'
  )
  const invalidLinks = interactiveElements(
    '<a href="/pricing?discount=20%">Missing pair</a><a href="/pricing?code=%2">Short pair</a>' +
      '<a href="#main%GG">Non-hex pair</a>' +
      '<a href="mailto:hello@example.com?subject=Hello%2Gthere">Malformed contact subject</a>' +
      '<a href="https://example.com/search?q=%G2">Malformed external query</a>'
  )

  if (validLinks.some(hasMalformedHrefPercentEncoding)) {
    fail('Href percent-encoding parser: complete hexadecimal byte escapes must remain valid')
  }
  if (invalidLinks.some((link) => !hasMalformedHrefPercentEncoding(link))) {
    fail('Href percent-encoding parser: incomplete and non-hex byte escapes must remain detectable')
  }

  return {
    hrefPercentEncodingProbeCount: validLinks.length + invalidLinks.length
  }
}

function validateHrefPercentEncodedControlParsing() {
  const validLinks = interactiveElements(
    '<a href="/pricing?query=hello%20there">Encoded space</a>' +
      '<a href="#main%2Dcontent">Encoded printable fragment</a>' +
      '<a href="mailto:hello@example.com?subject=Rate%3A%2025%25">Encoded contact subject</a>' +
      '<a href="https://example.com/path%2Fsegment">Encoded external separator</a>' +
      '<a href="/pricing?name=Ren%C3%A9">Encoded UTF-8 text</a>'
  )
  const invalidLinks = interactiveElements(
    '<a href="/pricing?value=%00">Encoded NUL</a><a href="#main%09">Encoded tab</a>' +
      '<a href="mailto:hello@example.com?subject=Hello%0Athere">Encoded line break</a>' +
      '<a href="https://example.com/path%1Fsegment">Encoded unit separator</a>' +
      '<a href="/pricing?value=%7f">Encoded delete</a>'
  )

  if (validLinks.some(hasHrefPercentEncodedControlCharacter)) {
    fail('Href encoded-control parser: printable and UTF-8 byte escapes must remain valid')
  }
  if (invalidLinks.some((link) => !hasHrefPercentEncodedControlCharacter(link))) {
    fail('Href encoded-control parser: percent-encoded ASCII controls must remain detectable')
  }

  return {
    hrefPercentEncodedControlProbeCount: validLinks.length + invalidLinks.length
  }
}

function validateHttpCredentialParsing() {
  const baseUrl = 'https://christiancolewan.tech/'
  const validTargets = [
    '/pricing',
    'https://example.com/work',
    'mailto:hello@example.com',
    'tel:+1234567890'
  ].map((href) => new URL(href, baseUrl))
  const invalidTargets = [
    'https://user@example.com/work',
    'https://user:password@example.com/work',
    'https://user%40name@example.com/work',
    '//user:password@example.com/work'
  ].map((href) => new URL(href, baseUrl))

  if (validTargets.some(hasHttpCredentials)) {
    fail('HTTP credential parser: ordinary internal, external and contact links must remain valid')
  }
  if (invalidTargets.some((target) => !hasHttpCredentials(target))) {
    fail('HTTP credential parser: embedded URL usernames and passwords must remain detectable')
  }

  return {
    httpCredentialProbeCount: validTargets.length + invalidTargets.length
  }
}

function validateHttpCredentialReferenceParsing() {
  const validReferences = [
    '/images/logo.png',
    'https://christiancolewan.tech/sitemap.xml',
    'data:image/svg+xml,%3Csvg%3E%3C/svg%3E',
    'mailto:hello@example.com'
  ]
  const invalidReferences = [
    'https://user@christiancolewan.tech/images/logo.png',
    'https://user:password@example.com/sitemap.xml',
    'https://user%40name@example.com/profile',
    'http://user:password@example.com/legacy.css'
  ]

  if (validReferences.some(referenceHasHttpCredentials)) {
    fail('HTTP credential reference parser: ordinary site, asset, data and contact URLs must remain valid')
  }
  if (invalidReferences.some((value) => !referenceHasHttpCredentials(value))) {
    fail('HTTP credential reference parser: embedded URL usernames and passwords must remain detectable')
  }

  return {
    httpCredentialReferenceProbeCount: validReferences.length + invalidReferences.length
  }
}

function validateReferencePercentEncodingParsing() {
  const validReferences = [
    '/images/logo%20mark.png',
    'https://christiancolewan.tech/search?q=%E2%9C%93',
    'data:image/svg+xml,%3Csvg%3E%3C/svg%3E',
    'mailto:hello@example.com?subject=Hello%20there'
  ]
  const invalidReferences = [
    '/images/logo%',
    'https://christiancolewan.tech/search?q=%2',
    'data:image/svg+xml,%GG',
    'mailto:hello@example.com?subject=%G2'
  ]

  if (validReferences.some(referenceHasMalformedPercentEncoding)) {
    fail('URL reference percent-encoding parser: complete hexadecimal byte escapes must remain valid')
  }
  if (invalidReferences.some((value) => !referenceHasMalformedPercentEncoding(value))) {
    fail(
      'URL reference percent-encoding parser: incomplete and non-hex byte escapes must remain detectable'
    )
  }

  return {
    referencePercentEncodingProbeCount: validReferences.length + invalidReferences.length
  }
}

function validateReferencePercentEncodedControlParsing() {
  const validReferences = [
    '/images/logo%20mark.png',
    'https://christiancolewan.tech/search?q=%E2%9C%93',
    'data:image/svg+xml,%3Csvg%3E%3C/svg%3E',
    'mailto:hello@example.com?subject=Rate%3A%2025%25'
  ]
  const invalidReferences = [
    '/images/logo%00.png',
    'https://christiancolewan.tech/search?q=hello%09there',
    'data:image/svg+xml,%1F',
    'mailto:hello@example.com?subject=Hello%7Fthere'
  ]

  if (validReferences.some(referenceHasPercentEncodedControlCharacter)) {
    fail('URL reference encoded-control parser: printable and UTF-8 byte escapes must remain valid')
  }
  if (invalidReferences.some((value) => !referenceHasPercentEncodedControlCharacter(value))) {
    fail(
      'URL reference encoded-control parser: percent-encoded ASCII controls must remain detectable'
    )
  }

  return {
    referencePercentEncodedControlProbeCount: validReferences.length + invalidReferences.length
  }
}

function validateReferenceControlCharacterParsing() {
  const validReferences = [
    '/images/logo.png?letter=&#65;',
    'https://christiancolewan.tech/search?first=A&amp;second=B',
    'data:image/svg+xml,&lt;svg&gt;&lt;/svg&gt;',
    'mailto:hello@example.com?subject=Line&#45;item'
  ]
  const invalidReferences = [
    '/images/logo&#0;.png',
    'https://christiancolewan.tech/search?q=hello&#x09;there',
    'data:image/svg+xml,&NewLine;',
    'mailto:hello@example.com?subject=Hello&Tab;there'
  ]

  if (validReferences.some(referenceHasControlCharacterReference)) {
    fail('URL reference character parser: printable and escaped punctuation references must remain valid')
  }
  if (invalidReferences.some((value) => !referenceHasControlCharacterReference(value))) {
    fail(
      'URL reference character parser: references that decode to ASCII controls must remain detectable'
    )
  }

  return {
    referenceControlCharacterProbeCount: validReferences.length + invalidReferences.length
  }
}

function validateReferenceLiteralControlCharacterParsing() {
  const validReferences = [
    '/images/logo.png',
    'https://christiancolewan.tech/search?q=hello%20there',
    'data:image/svg+xml,%3Csvg%3E%3C/svg%3E',
    'mailto:hello@example.com?subject=Hello'
  ]
  const invalidReferences = [
    '/images/logo\u0000.png',
    'https://christiancolewan.tech/search?q=hello\tthere',
    'data:image/svg+xml,\n',
    'mailto:hello@example.com?subject=Hello\u007fthere'
  ]

  if (validReferences.some(referenceHasLiteralControlCharacter)) {
    fail('URL reference literal-control parser: printable URL references must remain valid')
  }
  if (invalidReferences.some((value) => !referenceHasLiteralControlCharacter(value))) {
    fail('URL reference literal-control parser: literal ASCII controls must remain detectable')
  }

  return {
    referenceLiteralControlProbeCount: validReferences.length + invalidReferences.length
  }
}

function validateReferenceWhitespaceParsing() {
  const validReferences = [
    '/images/logo.png',
    'https://christiancolewan.tech/search?q=hello%20there',
    'data:image/svg+xml,%3Csvg%3E%3C/svg%3E',
    'mailto:hello@example.com?subject=Hello'
  ]
  const paddedReferences = [
    ' /images/logo.png',
    'https://christiancolewan.tech/search?q=hello ',
    '\u00a0data:image/svg+xml,%3Csvg%3E%3C/svg%3E',
    'mailto:hello@example.com?subject=Hello\u2003'
  ]

  if (validReferences.some(referenceHasSurroundingWhitespace)) {
    fail('URL reference whitespace parser: unpadded URL references must remain valid')
  }
  if (paddedReferences.some((value) => !referenceHasSurroundingWhitespace(value))) {
    fail('URL reference whitespace parser: leading and trailing whitespace must remain detectable')
  }

  return {
    referenceWhitespaceProbeCount: validReferences.length + paddedReferences.length
  }
}

function validateEmptyReferenceParsing() {
  const validReferences = [
    '/images/logo.png',
    'https://christiancolewan.tech/',
    'data:image/svg+xml,%3Csvg%3E%3C/svg%3E',
    'mailto:hello@example.com'
  ]
  const emptyReferences = ['', '   ', '\u00a0', undefined]

  if (validReferences.some(referenceIsEmpty)) {
    fail('Empty URL reference parser: non-empty URL references must remain valid')
  }
  if (emptyReferences.some((value) => !referenceIsEmpty(value))) {
    fail('Empty URL reference parser: missing, empty and whitespace-only values must remain detectable')
  }

  return {
    emptyReferenceProbeCount: validReferences.length + emptyReferences.length
  }
}

function validateReferenceSchemeParsing() {
  const httpsOnlySchemes = new Set(['https:'])
  const runtimeSchemes = new Set(['https:', 'data:', 'blob:'])
  const safeReferences = [
    '/images/logo.png',
    '#main',
    'https://christiancolewan.tech/',
    'https://schema.org'
  ]
  const safeRuntimeReferences = [
    'data:image/svg+xml,%3Csvg%3E%3C/svg%3E',
    'blob:https://christiancolewan.tech/7b70e741-0194-4b98-9430-c863949a164b'
  ]
  const unsafeReferences = [
    'http://christiancolewan.tech/',
    'javascript:alert(1)',
    'file:///etc/passwd',
    'mailto:hello@example.com'
  ]

  if (safeReferences.some((value) => !referenceUsesAllowedScheme(value, httpsOnlySchemes))) {
    fail('URL reference scheme parser: relative and HTTPS references must remain valid')
  }
  if (
    safeRuntimeReferences.some((value) => !referenceUsesAllowedScheme(value, runtimeSchemes)) ||
    safeRuntimeReferences.some((value) => referenceUsesAllowedScheme(value, httpsOnlySchemes))
  ) {
    fail('URL reference scheme parser: data and blob URLs must remain limited to runtime assets')
  }
  if (unsafeReferences.some((value) => referenceUsesAllowedScheme(value, runtimeSchemes))) {
    fail('URL reference scheme parser: HTTP and executable or local schemes must remain detectable')
  }

  return {
    referenceSchemeProbeCount:
      safeReferences.length + safeRuntimeReferences.length + unsafeReferences.length
  }
}

function validateSrcsetParsing() {
  const validSrcsets = [
    '/images/portrait.webp',
    '/images/portrait-small.webp 480w, /images/portrait-large.webp 960w',
    '/images/portrait.webp 1x, /images/portrait@2x.webp 2x',
    'data:image/svg+xml,%3Csvg%3E%3C/svg%3E 1x, /images/portrait.webp 2x'
  ]
  const invalidSrcsets = [
    '',
    ', /images/portrait.webp 1x',
    '/images/portrait.webp 1x,',
    '/images/portrait.webp 1x,, /images/portrait@2x.webp 2x',
    '/images/portrait.webp 1q',
    '/images/portrait.webp 0w',
    '/images/portrait.webp 0x',
    '/images/portrait.webp 1x 2x',
    '/images/portrait.webp 480w, /images/portrait@2x.webp 2x',
    '/images/portrait.webp 1x, /images/portrait@2x.webp 1x',
    '/images/portrait.webp, /images/portrait@2x.webp 1x'
  ]

  if (validSrcsets.some((value) => !parseSrcsetCandidates(value))) {
    fail('Srcset parser: valid URL, width and density candidate lists must remain valid')
  }
  if (invalidSrcsets.some((value) => parseSrcsetCandidates(value))) {
    fail('Srcset parser: empty, malformed, mixed and duplicate candidates must remain invalid')
  }

  return { srcsetProbeCount: validSrcsets.length + invalidSrcsets.length }
}

function validateSizesParsing() {
  const validSizes = [
    '100vw',
    '(max-width: 48rem) 100vw, 48rem',
    '(min-width: 64rem) calc(50vw - 2rem), 100vw',
    'clamp(20rem, 50vw, 60rem)'
  ]
  const invalidSizes = [
    '',
    '   ',
    ', 100vw',
    '100vw,',
    '(max-width: 48rem 100vw',
    'max-width: 48rem 100vw',
    '(max-width: 48rem) 100%',
    '(max-width: 48rem) -10vw'
  ]
  const sizesWithoutFallback = [
    '(max-width: 48rem) 100vw',
    '(min-width: 64rem) 50vw, (min-width: 32rem) 75vw'
  ]

  if (validSizes.some((value) => !hasValidSizesAttribute(value))) {
    fail('Sizes parser: valid lengths, media conditions and CSS functions must remain valid')
  }
  if (invalidSizes.some((value) => parseSizesAttribute(value))) {
    fail('Sizes parser: empty, unbalanced and invalid source-size lists must remain invalid')
  }
  if (
    sizesWithoutFallback.some((value) => {
      const components = parseSizesAttribute(value)
      return !components || sizesHasUnconditionalFallback(components)
    })
  ) {
    fail('Sizes parser: conditional source-size lists must require an unconditional fallback')
  }
  if (
    !srcsetRequiresSizes(parseSrcsetCandidates('/small.webp 480w, /large.webp 960w')) ||
    srcsetRequiresSizes(parseSrcsetCandidates('/standard.webp 1x, /retina.webp 2x'))
  ) {
    fail('Sizes parser: only width-based srcset candidate lists must require sizes')
  }

  return {
    sizesProbeCount: validSizes.length + invalidSizes.length + sizesWithoutFallback.length + 2
  }
}

function validateProtocolRelativeExternalParsing() {
  const pageUrl = new URL('https://christiancolewan.tech/')
  const validHrefs = [
    '/pricing',
    '#main',
    'https://example.com/work',
    'mailto:hello@example.com',
    '//christiancolewan.tech/pricing'
  ]
  const invalidHrefs = [
    '//example.com/work',
    '//cdn.example.com/assets/preview.webp'
  ]

  if (validHrefs.some((href) => isProtocolRelativeExternalHref(href, pageUrl))) {
    fail('Protocol-relative parser: relative, explicit HTTPS, contact and same-origin links must remain valid')
  }
  if (invalidHrefs.some((href) => !isProtocolRelativeExternalHref(href, pageUrl))) {
    fail('Protocol-relative parser: cross-origin destinations without an explicit scheme must remain detectable')
  }

  return {
    protocolRelativeExternalProbeCount: validHrefs.length + invalidHrefs.length
  }
}

function validateProtocolRelativeReferenceParsing() {
  const validReferences = [
    '/images/logo.png',
    'https://christiancolewan.tech/images/logo.png',
    'data:image/svg+xml,%3Csvg%3E%3C/svg%3E',
    '#main'
  ]
  const invalidReferences = [
    '//christiancolewan.tech/images/logo.png',
    '  //cdn.example.com/portfolio.css'
  ]

  if (validReferences.some(isProtocolRelativeReference)) {
    fail('Protocol-relative reference parser: relative, HTTPS, data and fragment URLs must remain valid')
  }
  if (invalidReferences.some((value) => !isProtocolRelativeReference(value))) {
    fail('Protocol-relative reference parser: scheme-omitting metadata and asset URLs must remain detectable')
  }

  return {
    protocolRelativeReferenceProbeCount: validReferences.length + invalidReferences.length
  }
}

function validateProtocolRelativeMachineReferenceParsing() {
  const validReferences = [
    '/',
    '/icons/icon-192.png',
    'https://christiancolewan.tech/sitemap.xml',
    'https://schema.org'
  ]
  const invalidReferences = [
    '//christiancolewan.tech/pricing',
    ' //cdn.example.com/icon.png'
  ]

  validateExplicitSchemeReferences(validReferences, 'Machine-readable reference parser')
  if (invalidReferences.some((value) => !isProtocolRelativeReference(value))) {
    fail('Machine-readable reference parser: scheme-omitting URLs must remain detectable')
  }

  return {
    protocolRelativeMachineReferenceProbeCount: validReferences.length + invalidReferences.length
  }
}

function validateExplicitSchemeReferences(values, label) {
  for (const value of values) {
    if (typeof value === 'string' && isProtocolRelativeReference(value)) {
      fail(`${label}: URL must declare the HTTPS scheme explicitly`)
    }
  }
}

function validateCredentialFreeReferences(values, label) {
  if (values.some(referenceHasHttpCredentials)) {
    fail(`${label}: HTTP(S) URL must not include embedded credentials`)
  }
}

function validateWellFormedPercentEncoding(values, label) {
  if (values.some(referenceHasMalformedPercentEncoding)) {
    fail(`${label}: URL contains malformed percent-encoding`)
  }
}

function validatePercentEncodingHasNoControls(values, label) {
  if (values.some(referenceHasPercentEncodedControlCharacter)) {
    fail(`${label}: URL must not percent-encode ASCII control characters`)
  }
}

function validateCharacterReferencesHaveNoControls(values, label) {
  if (values.some(referenceHasControlCharacterReference)) {
    fail(`${label}: URL character reference must not decode to an ASCII control character`)
  }
}

function validateLiteralCharactersHaveNoControls(values, label) {
  if (values.some(referenceHasLiteralControlCharacter)) {
    fail(`${label}: URL must not contain literal ASCII control characters`)
  }
}

function validateReferencesHaveNoSurroundingWhitespace(values, label) {
  if (values.some(referenceHasSurroundingWhitespace)) {
    fail(`${label}: URL must not contain leading or trailing whitespace`)
  }
}

function validateReferencesAreNonEmpty(values, label) {
  if (values.some(referenceIsEmpty)) {
    fail(`${label}: URL reference must be present and non-empty`)
  }
}

function validateReferenceSchemes(values, label) {
  const allowedSchemes = new Set(['https:'])
  if (values.some((value) => !referenceUsesAllowedScheme(value, allowedSchemes))) {
    fail(`${label}: URL reference must use a relative or HTTPS destination`)
  }
}

function validateSafeUrlReferences(values, label) {
  validateReferencesAreNonEmpty(values, label)
  validateReferencesHaveNoSurroundingWhitespace(values, label)
  validateLiteralCharactersHaveNoControls(values, label)
  validateExplicitSchemeReferences(values, label)
  validateReferenceSchemes(values, label)
  validateCredentialFreeReferences(values, label)
  validateWellFormedPercentEncoding(values, label)
  validatePercentEncodingHasNoControls(values, label)
  validateCharacterReferencesHaveNoControls(values, label)
}

function hasPositiveTabindex(element) {
  if (!Object.hasOwn(element.attributes, 'tabindex')) return false

  const tabindex = element.attributes.tabindex
  return /^-?\d+$/.test(tabindex) && Number(tabindex) > 0
}

function hasInvalidTabindex(element) {
  return (
    Object.hasOwn(element.attributes, 'tabindex') &&
    !/^-?\d+$/.test(element.attributes.tabindex)
  )
}

function validateTabindexOrderParsing() {
  const [naturalOrder] = openingTags('<a href="/pricing" tabindex="0">Pricing</a>')
  const [programmaticFocus] = openingTags('<div tabindex="-1">Dialog status</div>')
  const [forcedOrder] = openingTags('<a href="/pricing" tabindex="1">Pricing</a>')

  if (hasPositiveTabindex(naturalOrder) || hasPositiveTabindex(programmaticFocus)) {
    fail('Tabindex parser: zero and negative values must remain allowed')
  }
  if (!hasPositiveTabindex(forcedOrder)) {
    fail('Tabindex parser: positive values must remain detectable')
  }

  return { tabindexOrderProbeCount: 3 }
}

function validateTabindexValueParsing() {
  const validElements = openingTags(
    '<a tabindex="0"></a><div tabindex="-1"></div><div tabindex="-12"></div>'
  )
  const invalidElements = openingTags(
    '<a tabindex="1.5"></a><div tabindex="next"></div><div tabindex="+1"></div>' +
      '<span tabindex=""></span><span tabindex=" 0"></span>'
  )

  if (validElements.some(hasInvalidTabindex)) {
    fail('Tabindex parser: zero and negative integers must remain valid')
  }
  if (invalidElements.some((element) => !hasInvalidTabindex(element))) {
    fail('Tabindex parser: empty, padded, decimal, text and plus-prefixed values must remain invalid')
  }

  return { tabindexValueProbeCount: validElements.length + invalidElements.length }
}

function validateElementIdParsing() {
  const dataAttributeProbe =
    '<main id="main" data-probe-id="shared"></main><section data-probe-id="shared"></section>'
  const exactIds = elementIds(dataAttributeProbe)
  if (exactIds.length !== 1 || exactIds[0] !== 'main') {
    fail('HTML id parser: data attributes ending in -id must not be treated as id attributes')
  }

  const duplicateIds = elementIds('<div id="duplicate"></div><span id="duplicate"></span>')
  if (duplicateIds.length !== 2 || duplicateIds.some((id) => id !== 'duplicate')) {
    fail('HTML id parser: exact duplicate id attributes must remain detectable')
  }

  return { idParserProbeCount: 2 }
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
  if (route.description && description !== route.description) {
    fail(`${label}: description does not match the route`)
  }
  if (description.length < 50 || description.length > 160) {
    fail(`${label}: description must be between 50 and 160 characters`)
  }

  requireTag(html, 'meta', { property: 'og:title', content: route.title }, label)
  requireTag(html, 'meta', { property: 'og:description', content: description }, label)
  requireTag(html, 'meta', { name: 'twitter:title', content: route.title }, label)
  requireTag(html, 'meta', { name: 'twitter:description', content: description }, label)
}

function validateMetadataUrlReferences(html, label) {
  const references = [
    ...tags(html, 'link')
      .filter(({ attributes }) => attributes.rel?.toLowerCase().split(/\s+/).includes('canonical'))
      .map(({ attributes }) => ['canonical URL', attributes.href]),
    ...tags(html, 'meta')
      .filter(({ attributes }) =>
        ['og:url', 'og:image'].includes(attributes.property) ||
        attributes.name === 'twitter:image'
      )
      .map(({ attributes }) => [attributes.property || attributes.name, attributes.content])
  ]

  for (const [reference, value] of references) {
    validateSafeUrlReferences([value], `${label}: ${reference}`)
  }
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
      if (!Object.hasOwn(attributes, 'href') || attributes.href.trim().length === 0) {
        fail(`${label}: anchor must have a non-empty href`)
      }
      if (attributes.href !== attributes.href.trim()) {
        fail(
          `${label}: anchor href must not contain leading or trailing whitespace: ` +
            JSON.stringify(attributes.href)
        )
      }
      if (hasHrefControlCharacter({ name: 'a', attributes })) {
        fail(
          `${label}: anchor href must not contain ASCII control characters: ` +
            JSON.stringify(attributes.href)
        )
      }
      if (hasHrefControlCharacterReference({ name: 'a', attributes })) {
        fail(
          `${label}: anchor href must not reference ASCII control characters: ` +
            JSON.stringify(attributes.href)
        )
      }
      if (hasMalformedHrefPercentEncoding({ name: 'a', attributes })) {
        fail(`${label}: anchor href contains malformed percent-encoding: ${attributes.href}`)
      }
      if (hasHrefPercentEncodedControlCharacter({ name: 'a', attributes })) {
        fail(`${label}: anchor href must not percent-encode ASCII control characters: ${attributes.href}`)
      }
      if (attributes.href.trim() === '#') {
        fail(`${label}: anchor href must identify a real destination, not a bare fragment`)
      }

      let target
      try {
        target = new URL(attributes.href, pageUrl)
      } catch {
        fail(`${label}: invalid link URL ${JSON.stringify(attributes.href)}`)
      }

      if (isProtocolRelativeExternalHref(attributes.href, pageUrl)) {
        fail(`${label}: external links must declare the HTTPS scheme explicitly: ${attributes.href}`)
      }
      if (hasHttpCredentials(target)) {
        fail(`${label}: HTTP(S) links must not include embedded URL credentials`)
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

    const expectedAccessibleName = `Enquire about the ${packageName} package`
    if (attributes['aria-label'] !== expectedAccessibleName) {
      fail(
        `${label}: ${packageName} enquiry accessible name must be ` +
          JSON.stringify(expectedAccessibleName)
      )
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

  return {
    pricingEnquiryCount: enquiries.length,
    pricingEnquiryAccessibleNameCount: enquiries.length
  }
}

function validatePricingPackageConsistency(pages) {
  const packagesByView = new Map([
    ['summary', new Map()],
    ['detail', new Map()]
  ])
  const packageOrderByView = new Map([
    ['summary', []],
    ['detail', []]
  ])
  let semanticPricingLabelCount = 0

  for (const [index, html] of pages.entries()) {
    const label = `route ${routes[index].path}`
    const packages = openingTags(html).filter(
      ({ attributes }) => attributes['data-pricing-view']
    )

    for (const { attributes, raw } of packages) {
      const view = attributes['data-pricing-view']
      const viewPackages = packagesByView.get(view)
      if (!viewPackages) fail(`${label}: unknown pricing view ${JSON.stringify(view)}: ${raw}`)

      const id = attributes['data-pricing-id']?.trim()
      const packageIndex = attributes['data-pricing-index']?.trim()
      const name = attributes['data-pricing-name']?.trim()
      const price = attributes['data-pricing-price']?.trim()
      const from = attributes['data-pricing-from']?.trim()
      const tagline = attributes['data-pricing-tagline']?.trim()
      const audience = attributes['data-pricing-audience']?.trim()
      if (
        !id ||
        !packageIndex ||
        !name ||
        !price ||
        !['true', 'false'].includes(from) ||
        !tagline ||
        !audience
      ) {
        fail(
          `${label}: pricing package identity must include id, index, name, price, from semantics, tagline and audience: ${raw}`
        )
      }
      if (viewPackages.has(id)) {
        fail(`${label}: duplicate ${view} pricing package ${JSON.stringify(id)}`)
      }

      viewPackages.set(id, {
        index: packageIndex,
        name,
        price,
        from: from === 'true',
        tagline,
        audience
      })
      packageOrderByView.get(view).push(id)
    }

    const view = index === 0 ? 'summary' : 'detail'
    const priceLabels = elementsWithContentAttribute(html, 'data-pricing-label-for')
    const labelsByPackage = new Map()
    for (const { attributes, content, raw } of priceLabels) {
      const id = attributes['data-pricing-label-for']?.trim()
      if (!id) fail(`${label}: pricing label must identify its package: ${raw}`)
      if (labelsByPackage.has(id)) fail(`${label}: duplicate pricing label for ${JSON.stringify(id)}`)
      labelsByPackage.set(id, renderedText(content))
    }

    const viewPackages = packagesByView.get(view)
    if (labelsByPackage.size !== viewPackages.size) {
      fail(
        `${label}: expected one visible price label per package, found ` +
          `${labelsByPackage.size} labels for ${viewPackages.size} packages`
      )
    }
    for (const [id, pricingPackage] of viewPackages) {
      const actualLabel = labelsByPackage.get(id)
      const expectedLabel = `${pricingPackage.from ? 'from ' : ''}${pricingPackage.price}`
      if (actualLabel !== expectedLabel) {
        fail(
          `${label}: ${JSON.stringify(id)} price label must be ` +
            `${JSON.stringify(expectedLabel)}; found ${JSON.stringify(actualLabel)}`
        )
      }
      semanticPricingLabelCount += 1
    }
  }

  const summaryPackages = packagesByView.get('summary')
  const detailPackages = packagesByView.get('detail')
  if (summaryPackages.size !== 5 || detailPackages.size !== 5) {
    fail(
      `Pricing packages: expected five summary and five detail entries, found ` +
        `${summaryPackages.size} and ${detailPackages.size}`
    )
  }

  for (const [id, summary] of summaryPackages) {
    const detail = detailPackages.get(id)
    if (!detail) fail(`Pricing packages: ${JSON.stringify(id)} is missing from the detail view`)
    if (
      summary.index !== detail.index ||
      summary.name !== detail.name ||
      summary.price !== detail.price ||
      summary.from !== detail.from ||
      summary.tagline !== detail.tagline ||
      summary.audience !== detail.audience
    ) {
      fail(
        `Pricing packages: ${JSON.stringify(id)} differs between views ` +
          `(${summary.index} ${summary.name} ${summary.price} from=${summary.from} ` +
          `tagline=${JSON.stringify(summary.tagline)} audience=${JSON.stringify(summary.audience)} vs ` +
          `${detail.index} ${detail.name} ${detail.price} from=${detail.from} ` +
          `tagline=${JSON.stringify(detail.tagline)} audience=${JSON.stringify(detail.audience)})`
      )
    }
  }

  const summaryOrder = packageOrderByView.get('summary')
  const detailOrder = packageOrderByView.get('detail')
  if (JSON.stringify(summaryOrder) !== JSON.stringify(detailOrder)) {
    fail(
      `Pricing packages: order differs between views ` +
        `(${summaryOrder.join(', ')} vs ${detailOrder.join(', ')})`
    )
  }

  const packageNumbers = summaryOrder.map((id) => summaryPackages.get(id).index)
  const expectedNumbers = summaryOrder.map((_, index) => String(index + 1).padStart(2, '0'))
  if (JSON.stringify(packageNumbers) !== JSON.stringify(expectedNumbers)) {
    fail(
      `Pricing packages: numbering must be unique and sequential ` +
        `(${expectedNumbers.join(', ')} expected; found ${packageNumbers.join(', ')})`
    )
  }

  const rangeLabels = elementsWithContentAttribute(pages[1], 'data-pricing-range-for')
  const rangeLabelsByGroup = new Map()
  for (const { attributes, content, raw } of rangeLabels) {
    const group = attributes['data-pricing-range-for']?.trim()
    if (!group) fail(`route /pricing: pricing range label must identify its group: ${raw}`)
    if (rangeLabelsByGroup.has(group)) {
      fail(`route /pricing: duplicate pricing range label for ${JSON.stringify(group)}`)
    }
    rangeLabelsByGroup.set(group, renderedText(content))
  }

  const expectedRangeGroups = new Map([
    [
      'fixed',
      [...detailPackages.values()].filter((item) => !item.from).map((item) => item.index)
    ],
    [
      'from',
      [...detailPackages.values()].filter((item) => item.from).map((item) => item.index)
    ]
  ])
  if (rangeLabelsByGroup.size !== expectedRangeGroups.size) {
    fail(
      `route /pricing: expected ${expectedRangeGroups.size} package range labels, ` +
        `found ${rangeLabelsByGroup.size}`
    )
  }
  for (const [group, numbers] of expectedRangeGroups) {
    if (numbers.length === 0) fail(`Pricing packages: ${group} range has no packages`)
    const expectedRange = `${numbers[0]} — ${numbers.at(-1)}`
    const actualRange = rangeLabelsByGroup.get(group)
    if (actualRange !== expectedRange) {
      fail(
        `route /pricing: ${group} package range must be ${JSON.stringify(expectedRange)}; ` +
          `found ${JSON.stringify(actualRange)}`
      )
    }
  }

  return {
    consistentPricingPackageCount: summaryPackages.size,
    pricingViewCount: packagesByView.size,
    orderedPricingPackageCount: summaryOrder.length,
    numberedPricingPackageCount: packageNumbers.length,
    semanticPricingLabelCount,
    pricingRangeLabelCount: rangeLabelsByGroup.size,
    descriptivePricingPackageCount: summaryPackages.size
  }
}

function validatePricingMetadata(html) {
  const detailPackages = new Map(
    openingTags(html)
      .filter(({ attributes }) => attributes['data-pricing-view'] === 'detail')
      .map(({ attributes }) => [
        attributes['data-pricing-id'],
        {
          name: attributes['data-pricing-name'],
          price: attributes['data-pricing-price']
        }
      ])
  )
  const price = (id) => {
    const item = detailPackages.get(id)
    if (!item?.price) fail(`Pricing metadata: missing published package ${JSON.stringify(id)}`)
    return item.price
  }
  const expectedDescription =
    `Website packages from ${price('starter')}, ` +
    `e-commerce from ${price('ecommerce')}, and ` +
    `custom web systems from ${price('systems')} — ` +
    'with scope, limits and running costs stated up front.'
  const description = tags(html, 'meta').find(
    ({ attributes }) => attributes.name === 'description'
  )?.attributes.content

  if (description !== expectedDescription) {
    fail(
      `Pricing metadata: description must match published package prices: ` +
        JSON.stringify(expectedDescription)
    )
  }

  return { pricingMetadataPriceCount: 3 }
}

function validatePricingTimelines(html) {
  const timelinesByPackage = new Map()
  const detailPackages = openingTags(html).filter(
    ({ attributes }) => attributes['data-pricing-view'] === 'detail'
  )

  for (const { attributes, raw } of detailPackages) {
    const id = attributes['data-pricing-id']?.trim()
    const timeline = attributes['data-pricing-timeline']?.trim()
    if (!id || !timeline) fail(`Pricing timelines: package must identify its timeline: ${raw}`)
    if (timelinesByPackage.has(id)) {
      fail(`Pricing timelines: duplicate package ${JSON.stringify(id)}`)
    }

    if (timeline !== 'Scoped per build') {
      const duration = timeline.match(/^(\d+)–(\d+) (days|weeks)$/)
      if (!duration) {
        fail(`Pricing timelines: ${JSON.stringify(id)} has invalid duration ${JSON.stringify(timeline)}`)
      }
      if (Number(duration[1]) >= Number(duration[2])) {
        fail(`Pricing timelines: ${JSON.stringify(id)} duration must increase`)
      }
    }
    timelinesByPackage.set(id, timeline)
  }

  const visibleTimelines = new Map()
  for (const { attributes, content, raw } of elementsWithContentAttribute(
    html,
    'data-pricing-timeline-for'
  )) {
    const id = attributes['data-pricing-timeline-for']?.trim()
    if (!id) fail(`Pricing timelines: visible timeline must identify its package: ${raw}`)
    if (visibleTimelines.has(id)) {
      fail(`Pricing timelines: duplicate visible timeline for ${JSON.stringify(id)}`)
    }
    visibleTimelines.set(id, renderedText(content))
  }

  if (timelinesByPackage.size !== 5 || visibleTimelines.size !== timelinesByPackage.size) {
    fail(
      `Pricing timelines: expected five package and visible timelines, found ` +
        `${timelinesByPackage.size} and ${visibleTimelines.size}`
    )
  }
  for (const [id, expectedTimeline] of timelinesByPackage) {
    const actualTimeline = visibleTimelines.get(id)
    if (actualTimeline !== expectedTimeline) {
      fail(
        `Pricing timelines: ${JSON.stringify(id)} must display ` +
          `${JSON.stringify(expectedTimeline)}; found ${JSON.stringify(actualTimeline)}`
      )
    }
  }

  return { validatedPricingTimelineCount: timelinesByPackage.size }
}

function validatePricingScopeLists(html) {
  const expectedByPackage = new Map()
  for (const { attributes, raw } of openingTags(html).filter(
    ({ attributes }) => attributes['data-pricing-view'] === 'detail'
  )) {
    const id = attributes['data-pricing-id']?.trim()
    const includesCount = Number(attributes['data-pricing-includes-count'])
    const limitsCount = Number(attributes['data-pricing-limits-count'])
    if (
      !id ||
      !Number.isInteger(includesCount) ||
      includesCount < 1 ||
      !Number.isInteger(limitsCount) ||
      limitsCount < 1
    ) {
      fail(`Pricing scope: package must declare positive includes and limits counts: ${raw}`)
    }
    if (expectedByPackage.has(id)) fail(`Pricing scope: duplicate package ${JSON.stringify(id)}`)
    expectedByPackage.set(id, { includesCount, limitsCount })
  }

  const collect = (attribute, label) => {
    const entries = new Map()
    for (const { attributes, content, raw } of elementsWithContentAttribute(html, attribute)) {
      const id = attributes[attribute]?.trim()
      const text = renderedText(content)
      if (!id || !text) fail(`Pricing scope: ${label} must identify its package and have text: ${raw}`)
      if (!expectedByPackage.has(id)) {
        fail(`Pricing scope: ${label} references unknown package ${JSON.stringify(id)}`)
      }
      const items = entries.get(id) || []
      if (items.includes(text)) {
        fail(`Pricing scope: duplicate ${label} for ${JSON.stringify(id)}: ${JSON.stringify(text)}`)
      }
      items.push(text)
      entries.set(id, items)
    }
    return entries
  }

  const includesByPackage = collect('data-pricing-includes-for', 'included feature')
  const limitsByPackage = collect('data-pricing-limits-for', 'written limit')
  let pricingInclusionCount = 0
  let pricingLimitCount = 0

  if (expectedByPackage.size !== 5) {
    fail(`Pricing scope: expected five packages, found ${expectedByPackage.size}`)
  }
  for (const [id, expected] of expectedByPackage) {
    const includes = includesByPackage.get(id) || []
    const limits = limitsByPackage.get(id) || []
    if (includes.length !== expected.includesCount || limits.length !== expected.limitsCount) {
      fail(
        `Pricing scope: ${JSON.stringify(id)} expected ${expected.includesCount} included features ` +
          `and ${expected.limitsCount} limits; found ${includes.length} and ${limits.length}`
      )
    }
    pricingInclusionCount += includes.length
    pricingLimitCount += limits.length
  }

  return {
    validatedPricingScopePackageCount: expectedByPackage.size,
    pricingInclusionCount,
    pricingLimitCount
  }
}

function validateRunningCosts(html) {
  const expectedById = new Map()
  for (const { attributes, raw } of openingTags(html).filter(
    ({ attributes }) => attributes['data-running-cost-id']
  )) {
    const id = attributes['data-running-cost-id']?.trim()
    const item = renderedText(attributes['data-running-cost-item'] || '')
    const price = renderedText(attributes['data-running-cost-price'] || '')
    const note = renderedText(attributes['data-running-cost-note'] || '')
    if (!id || !item || !price || !note) {
      fail(`Running costs: row must identify a complete item, price and note: ${raw}`)
    }
    if (expectedById.has(id)) fail(`Running costs: duplicate row ${JSON.stringify(id)}`)
    expectedById.set(id, { item, price, note })
  }

  if (expectedById.size !== 7) {
    fail(`Running costs: expected seven rows, found ${expectedById.size}`)
  }

  const collect = (attribute, field) => {
    const values = new Map()
    for (const { attributes, content, raw } of elementsWithContentAttribute(html, attribute)) {
      const id = attributes[attribute]?.trim()
      const text = renderedText(content)
      if (!id || !text) fail(`Running costs: visible ${field} must identify its row and have text: ${raw}`)
      if (!expectedById.has(id)) {
        fail(`Running costs: visible ${field} references unknown row ${JSON.stringify(id)}`)
      }
      const entries = values.get(id) || []
      entries.push(text)
      values.set(id, entries)
    }
    return values
  }

  const items = collect('data-running-cost-item-for', 'item')
  const prices = collect('data-running-cost-price-for', 'price')
  const notes = collect('data-running-cost-note-for', 'note')
  let visibleFieldCount = 0

  for (const [id, expected] of expectedById) {
    const actualItems = items.get(id) || []
    const actualPrices = prices.get(id) || []
    const actualNotes = notes.get(id) || []
    if (
      actualItems.length !== 1 ||
      actualItems[0] !== expected.item ||
      actualPrices.length !== 1 ||
      actualPrices[0] !== expected.price ||
      actualNotes.length !== 2 ||
      actualNotes.some((note) => note !== expected.note)
    ) {
      fail(
        `Running costs: ${JSON.stringify(id)} must render its canonical item and price once ` +
          `and its responsive note twice`
      )
    }
    visibleFieldCount += actualItems.length + actualPrices.length + actualNotes.length
  }

  return { runningCostRowCount: expectedById.size, runningCostVisibleFieldCount: visibleFieldCount }
}

function validatePricingProcess(html) {
  const expectedSteps = []
  const seenIndexes = new Set()
  for (const { attributes, raw } of openingTags(html).filter(
    ({ attributes }) => attributes['data-process-index']
  )) {
    const index = attributes['data-process-index']?.trim()
    const name = renderedText(attributes['data-process-name'] || '')
    const body = renderedText(attributes['data-process-body'] || '')
    if (!index || !name || !body) {
      fail(`Pricing process: step must have a complete index, name and description: ${raw}`)
    }
    if (seenIndexes.has(index)) {
      fail(`Pricing process: duplicate step index ${JSON.stringify(index)}`)
    }
    seenIndexes.add(index)
    expectedSteps.push({ index, name, body })
  }

  if (expectedSteps.length !== 5) {
    fail(`Pricing process: expected five steps, found ${expectedSteps.length}`)
  }
  const expectedIndexes = expectedSteps.map((_, index) => String(index + 1).padStart(2, '0'))
  const actualIndexes = expectedSteps.map(({ index }) => index)
  if (actualIndexes.join('|') !== expectedIndexes.join('|')) {
    fail(
      `Pricing process: expected sequential indexes ${expectedIndexes.join(', ')}; ` +
        `found ${actualIndexes.join(', ')}`
    )
  }

  const collect = (attribute, field) => {
    const values = new Map()
    for (const { attributes, content, raw } of elementsWithContentAttribute(html, attribute)) {
      const index = attributes[attribute]?.trim()
      const text = renderedText(content)
      if (!index || !text) {
        fail(`Pricing process: visible ${field} must identify its step and have text: ${raw}`)
      }
      if (!seenIndexes.has(index)) {
        fail(`Pricing process: visible ${field} references unknown step ${JSON.stringify(index)}`)
      }
      if (values.has(index)) {
        fail(`Pricing process: duplicate visible ${field} for ${JSON.stringify(index)}`)
      }
      values.set(index, text)
    }
    return values
  }

  const visibleIndexes = collect('data-process-index-for', 'index')
  const visibleNames = collect('data-process-name-for', 'name')
  const visibleBodies = collect('data-process-body-for', 'description')
  for (const expected of expectedSteps) {
    if (
      visibleIndexes.get(expected.index) !== expected.index ||
      visibleNames.get(expected.index) !== expected.name ||
      visibleBodies.get(expected.index) !== expected.body
    ) {
      fail(`Pricing process: step ${JSON.stringify(expected.index)} must match its canonical content`)
    }
  }

  const ranges = elementsWithContentAttribute(html, 'data-process-range')
  const expectedRange = `${expectedIndexes[0]} — ${expectedIndexes.at(-1)}`
  if (
    ranges.length !== 1 ||
    ranges[0].attributes['data-process-range'] !== expectedRange ||
    renderedText(ranges[0].content) !== expectedRange
  ) {
    fail(`Pricing process: range must be ${JSON.stringify(expectedRange)}`)
  }

  return { pricingProcessStepCount: expectedSteps.length, pricingProcessFieldCount: 15 }
}

function validateFinePrintTerms(html) {
  const expectedTerms = []
  const seenIds = new Set()
  for (const { attributes, raw } of openingTags(html).filter(
    ({ attributes }) => attributes['data-fine-print-key']
  )) {
    const id = attributes['data-fine-print-key']?.trim()
    const number = attributes['data-fine-print-number']?.trim()
    const text = renderedText(attributes['data-fine-print-text'] || '')
    if (!id || !number || !text) {
      fail(`Pricing fine print: term must have a complete id, number and description: ${raw}`)
    }
    if (seenIds.has(id)) fail(`Pricing fine print: duplicate term id ${JSON.stringify(id)}`)
    seenIds.add(id)
    expectedTerms.push({ id, number, text })
  }

  if (expectedTerms.length !== 6) {
    fail(`Pricing fine print: expected six terms, found ${expectedTerms.length}`)
  }
  for (const [index, term] of expectedTerms.entries()) {
    const expectedNumber = String(index + 1).padStart(2, '0')
    if (term.number !== expectedNumber) {
      fail(
        `Pricing fine print: ${JSON.stringify(term.id)} must be numbered ` +
          `${expectedNumber}; found ${JSON.stringify(term.number)}`
      )
    }
  }

  const collect = (attribute, field) => {
    const values = new Map()
    for (const { attributes, content, raw } of elementsWithContentAttribute(html, attribute)) {
      const id = attributes[attribute]?.trim()
      const text = renderedText(content)
      if (!id || !text) {
        fail(`Pricing fine print: visible ${field} must identify its term and have text: ${raw}`)
      }
      if (!seenIds.has(id)) {
        fail(`Pricing fine print: visible ${field} references unknown term ${JSON.stringify(id)}`)
      }
      if (values.has(id)) {
        fail(`Pricing fine print: duplicate visible ${field} for ${JSON.stringify(id)}`)
      }
      values.set(id, text)
    }
    return values
  }

  const visibleNumbers = collect('data-fine-print-number-for', 'number')
  const visibleDescriptions = collect('data-fine-print-text-for', 'description')
  for (const expected of expectedTerms) {
    if (
      visibleNumbers.get(expected.id) !== expected.number ||
      visibleDescriptions.get(expected.id) !== expected.text
    ) {
      fail(`Pricing fine print: ${JSON.stringify(expected.id)} must match its canonical content`)
    }
  }

  return { finePrintTermCount: expectedTerms.length, finePrintVisibleFieldCount: 12 }
}

function validateCommercialTerms(html) {
  const collect = (attribute) => {
    const values = new Map()
    for (const { attributes, content, raw } of elementsWithContentAttribute(html, attribute)) {
      const id = attributes[attribute]?.trim()
      if (!id) fail(`Pricing terms: ${attribute} must identify its commercial term: ${raw}`)
      if (values.has(id)) fail(`Pricing terms: duplicate ${attribute} for ${JSON.stringify(id)}`)
      values.set(id, renderedText(content))
    }
    return values
  }

  const summaries = collect('data-commercial-term-summary')
  const details = collect('data-commercial-term-detail')
  const paymentSummary = summaries.get('payment')
  const paymentDetail = details.get('payment')
  const payment = paymentSummary?.match(/^(\d+)% \/ (\d+)%$/)
  if (!payment) {
    fail(`Pricing terms: invalid payment summary ${JSON.stringify(paymentSummary)}`)
  }
  const [, depositPercent, approvalPercent] = payment
  if (Number(depositPercent) + Number(approvalPercent) !== 100) {
    fail('Pricing terms: payment percentages must total 100%')
  }
  const expectedPaymentDetail =
    `${depositPercent}% to start, ${approvalPercent}% on approval before the site goes live.`
  if (paymentDetail !== expectedPaymentDetail) {
    fail(
      `Pricing terms: payment detail must be ${JSON.stringify(expectedPaymentDetail)}; ` +
        `found ${JSON.stringify(paymentDetail)}`
    )
  }

  const quoteValiditySummary = summaries.get('quote-validity')
  const quoteValidityDetail = details.get('quote-validity')
  const quoteValidity = quoteValiditySummary?.match(/^(\d+) days$/)
  if (!quoteValidity) {
    fail(`Pricing terms: invalid quote-validity summary ${JSON.stringify(quoteValiditySummary)}`)
  }
  const expectedQuoteValidityDetail = `Quotes hold for ${quoteValidity[1]} days.`
  if (quoteValidityDetail !== expectedQuoteValidityDetail) {
    fail(
      `Pricing terms: quote-validity detail must be ` +
        `${JSON.stringify(expectedQuoteValidityDetail)}; found ${JSON.stringify(quoteValidityDetail)}`
    )
  }

  if (summaries.size !== 2) {
    fail(`Pricing terms: expected two commercial summaries, found ${summaries.size}`)
  }

  return { synchronizedCommercialTermCount: summaries.size }
}

function validateRuntimeUrl(value, label, reference, runtimeAssets) {
  if (referenceIsEmpty(value)) {
    fail(`${label}: runtime asset in ${reference} must be present and non-empty`)
  }
  if (referenceHasSurroundingWhitespace(value)) {
    fail(`${label}: runtime asset in ${reference} must not contain leading or trailing whitespace`)
  }
  if (value.startsWith('#')) return

  if (referenceHasLiteralControlCharacter(value)) {
    fail(`${label}: runtime asset in ${reference} must not contain literal ASCII control characters`)
  }
  if (isProtocolRelativeReference(value)) {
    fail(`${label}: runtime asset in ${reference} must declare the HTTPS scheme explicitly`)
  }
  if (referenceHasMalformedPercentEncoding(value)) {
    fail(`${label}: runtime asset in ${reference} contains malformed percent-encoding`)
  }
  if (referenceHasPercentEncodedControlCharacter(value)) {
    fail(`${label}: runtime asset in ${reference} must not percent-encode ASCII control characters`)
  }
  if (referenceHasControlCharacterReference(value)) {
    fail(`${label}: runtime asset in ${reference} has a character reference that decodes to an ASCII control`)
  }

  let url
  try {
    url = new URL(value, siteUrl)
  } catch {
    fail(`${label}: invalid runtime asset URL in ${reference}`)
  }

  if (!new Set(['https:', 'data:', 'blob:']).has(url.protocol)) {
    fail(`${label}: runtime asset in ${reference} must use HTTPS, data or blob`)
  }
  if (hasHttpCredentials(url)) {
    fail(`${label}: runtime asset in ${reference} must not include embedded HTTP(S) credentials`)
  }
  if (url.protocol === 'data:' || url.protocol === 'blob:') return
  if (url.origin !== new URL(siteUrl).origin) {
    fail(`${label}: third-party runtime asset is not allowed in ${reference}: ${value}`)
  }

  runtimeAssets.add(url.href)
}

function validateCssRuntimeAssets(css, label, runtimeAssets) {
  for (const match of css.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)) {
    validateRuntimeUrl(match[2], label, 'CSS url()', runtimeAssets)
  }

  for (const match of css.matchAll(/@import\s+(['"])(.*?)\1/gi)) {
    validateRuntimeUrl(match[2], label, 'CSS @import', runtimeAssets)
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
        if (!Object.hasOwn(element.attributes, attribute)) continue
        const value = element.attributes[attribute]
        const srcsetCandidates = attribute === 'srcset' ? parseSrcsetCandidates(value) : null
        if (attribute === 'srcset' && !srcsetCandidates) {
          fail(`${label}: <${element.name}> srcset contains an invalid or empty candidate`)
        }
        if (
          srcsetRequiresSizes(srcsetCandidates) &&
          !hasValidSizesAttribute(element.attributes.sizes)
        ) {
          fail(`${label}: <${element.name}> width-based srcset requires a valid sizes attribute`)
        }
        const values = attribute === 'srcset'
          ? srcsetCandidates.map(({ url }) => url)
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
  const elements = openingTags(html)
  const seenIds = new Set()
  const elementsById = new Map()
  for (const element of elements) {
    if (!Object.hasOwn(element.attributes, 'id')) continue

    const id = element.attributes.id
    if (id.trim().length === 0) fail(`${label}: id attributes must not be empty`)
    if (/[\t\n\f\r ]/.test(id)) fail(`${label}: id attributes must not contain ASCII whitespace`)
    if (seenIds.has(id)) fail(`${label}: duplicate id attribute ${JSON.stringify(id)}`)
    seenIds.add(id)
    elementsById.set(id, element)
  }

  const idReferenceAttributes = ['aria-controls', 'aria-describedby', 'aria-labelledby', 'aria-owns']
  for (const element of elements) {
    const referenceAttributes =
      element.name === 'label' ? ['for', ...idReferenceAttributes] : idReferenceAttributes

    for (const attribute of referenceAttributes) {
      if (!Object.hasOwn(element.attributes, attribute)) continue

      const references = element.attributes[attribute].split(/\s+/).filter(Boolean)
      if (references.length === 0) {
        fail(`${label}: ${attribute} must reference at least one id: ${element.raw}`)
      }

      if (attribute === 'for' && references.length !== 1) {
        fail(`${label}: label for must reference exactly one id: ${element.raw}`)
      }

      const duplicateReference = references.find(
        (reference, index) => references.indexOf(reference) !== index
      )
      if (duplicateReference) {
        fail(
          `${label}: ${attribute} repeats id reference ${JSON.stringify(duplicateReference)}: ${element.raw}`
        )
      }

      for (const reference of references) {
        if (!seenIds.has(reference)) {
          fail(`${label}: ${attribute} references missing id ${JSON.stringify(reference)}`)
        }
        if (attribute === 'for' && !isLabelableElement(elementsById.get(reference))) {
          fail(`${label}: label for references non-labelable element ${JSON.stringify(reference)}`)
        }
      }
    }
  }

  for (const element of elements) {
    if (hasInvalidTabindex(element)) {
      fail(`${label}: tabindex must be a valid integer: ${element.raw}`)
    }

    if (hasPositiveTabindex(element)) {
      fail(`${label}: positive tabindex disrupts natural keyboard order: ${element.raw}`)
    }

    if (
      element.attributes['aria-hidden']?.trim().toLowerCase() === 'true' &&
      isFocusableElement(element)
    ) {
      fail(`${label}: focusable <${element.name}> must not use aria-hidden=true: ${element.raw}`)
    }
  }

  for (const container of elementsWithContentAttribute(html, 'aria-hidden')) {
    if (container.attributes['aria-hidden']?.trim().toLowerCase() !== 'true') continue

    const focusableDescendant = openingTags(container.content).find(isFocusableElement)
    if (focusableDescendant) {
      fail(
        `${label}: aria-hidden <${container.name}> contains focusable descendant <${focusableDescendant.name}>: ${focusableDescendant.raw}`
      )
    }
  }

  for (const element of interactiveElements(html)) {
    const focusableDescendant = focusableInteractiveDescendant(element)
    if (focusableDescendant) {
      fail(
        `${label}: interactive <${element.name}> contains focusable descendant <${focusableDescendant.name}>: ${focusableDescendant.raw}`
      )
    }
  }

  const labels = labelElements(html)
  for (const labelElement of labels) {
    const hasAttributeName = ['aria-label', 'aria-labelledby', 'title'].some(
      (attribute) => labelElement.attributes[attribute]?.trim()
    )
    const hasTextName = renderedText(labelElement.content).length > 0
    const hasImageName = tags(labelElement.content, 'img').some(
      ({ attributes }) => attributes.alt?.trim()
    )

    if (!hasAttributeName && !hasTextName && !hasImageName) {
      fail(`${label}: <label> has no accessible name: ${labelElement.raw}`)
    }
  }

  const formControls = elements.filter(
    (element) => element.name !== 'button' && isLabelableElement(element)
  )
  for (const control of formControls) {
    const hasAttributeName = ['aria-label', 'aria-labelledby', 'title'].some(
      (attribute) => control.attributes[attribute]?.trim()
    )
    const hasAssociatedLabel = labels.some(
      (labelElement) =>
        (control.attributes.id && labelElement.attributes.for?.trim() === control.attributes.id) ||
        labelElement.content.includes(control.raw)
    )

    if (!hasAttributeName && !hasAssociatedLabel && !hasNativeInputName(control)) {
      fail(`${label}: <${control.name}> has no accessible name: ${control.raw}`)
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
const { idParserProbeCount } = validateElementIdParsing()
const { ariaHiddenFocusProbeCount } = validateAriaHiddenFocusParsing()
const { nestedInteractiveProbeCount } = validateNestedInteractiveParsing()
const { anchorHrefProbeCount } = validateAnchorHrefParsing()
const { hrefWhitespaceProbeCount } = validateHrefWhitespaceParsing()
const { hrefControlProbeCount } = validateHrefControlCharacterParsing()
const { hrefControlReferenceProbeCount } = validateHrefControlCharacterReferenceParsing()
const { hrefPercentEncodingProbeCount } = validateHrefPercentEncodingParsing()
const { hrefPercentEncodedControlProbeCount } = validateHrefPercentEncodedControlParsing()
const { httpCredentialProbeCount } = validateHttpCredentialParsing()
const { httpCredentialReferenceProbeCount } = validateHttpCredentialReferenceParsing()
const { referencePercentEncodingProbeCount } = validateReferencePercentEncodingParsing()
const { referencePercentEncodedControlProbeCount } =
  validateReferencePercentEncodedControlParsing()
const { referenceControlCharacterProbeCount } = validateReferenceControlCharacterParsing()
const { referenceLiteralControlProbeCount } = validateReferenceLiteralControlCharacterParsing()
const { referenceWhitespaceProbeCount } = validateReferenceWhitespaceParsing()
const { emptyReferenceProbeCount } = validateEmptyReferenceParsing()
const { referenceSchemeProbeCount } = validateReferenceSchemeParsing()
const { srcsetProbeCount } = validateSrcsetParsing()
const { sizesProbeCount } = validateSizesParsing()
const { protocolRelativeExternalProbeCount } = validateProtocolRelativeExternalParsing()
const { protocolRelativeReferenceProbeCount } = validateProtocolRelativeReferenceParsing()
const { protocolRelativeMachineReferenceProbeCount } =
  validateProtocolRelativeMachineReferenceParsing()
const { tabindexOrderProbeCount } = validateTabindexOrderParsing()
const { tabindexValueProbeCount } = validateTabindexValueParsing()
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
  validateMetadataUrlReferences(html, label)
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
const { pricingEnquiryCount, pricingEnquiryAccessibleNameCount } = validatePricingEnquiries(
  generatedPages[1],
  'route /pricing'
)
const {
  consistentPricingPackageCount,
  pricingViewCount,
  orderedPricingPackageCount,
  numberedPricingPackageCount,
  semanticPricingLabelCount,
  pricingRangeLabelCount,
  descriptivePricingPackageCount
} = validatePricingPackageConsistency(generatedPages)
const { pricingMetadataPriceCount } = validatePricingMetadata(generatedPages[1])
const { validatedPricingTimelineCount } = validatePricingTimelines(generatedPages[1])
const {
  validatedPricingScopePackageCount,
  pricingInclusionCount,
  pricingLimitCount
} = validatePricingScopeLists(generatedPages[1])
const { runningCostRowCount, runningCostVisibleFieldCount } = validateRunningCosts(generatedPages[1])
const { pricingProcessStepCount, pricingProcessFieldCount } = validatePricingProcess(
  generatedPages[1]
)
const { finePrintTermCount, finePrintVisibleFieldCount } = validateFinePrintTerms(
  generatedPages[1]
)
const { synchronizedCommercialTermCount } = validateCommercialTerms(generatedPages[1])
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

const homeStructuredData = structuredData(generatedPages[0], 'route /')
for (const schema of homeStructuredData) {
  validateSafeUrlReferences(
    [schema['@context'], schema.url, schema.image, ...(schema.sameAs || [])],
    'route /: JSON-LD'
  )
}

const homePerson = homeStructuredData.find(
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

validateSafeUrlReferences(
  [manifest.id, manifest.start_url, manifest.scope, ...(manifest.icons || []).map(({ src }) => src)],
  'site.webmanifest'
)

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

validateSafeUrlReferences(sitemapUrls, 'sitemap.xml')

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
validateSafeUrlReferences(
  advertisedSitemaps.map(({ value }) => value),
  'robots.txt Sitemap directive'
)
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
  `Validated ${routes.length} indexable routes with resolved router elements and ${primaryNavigationLinkCount} prerendered primary navigation links backed by ${mobileNavigation.mobileTargetRuleCount} mobile target rule, unique ids and resolved accessibility references backed by ${idParserProbeCount} exact-id parser probes, ${ariaHiddenFocusProbeCount} aria-hidden focus probes, ${nestedInteractiveProbeCount} nested-interactive probes, ${anchorHrefProbeCount} anchor href probes, ${hrefWhitespaceProbeCount} href whitespace probes, ${hrefControlProbeCount} href control-character probes, ${hrefControlReferenceProbeCount} href control-reference probes, ${hrefPercentEncodingProbeCount} href percent-encoding probes, ${hrefPercentEncodedControlProbeCount} href encoded-control probes, ${httpCredentialProbeCount} HTTP credential probes, ${httpCredentialReferenceProbeCount} HTTP credential reference probes, ${referencePercentEncodingProbeCount} URL reference percent-encoding probes, ${referencePercentEncodedControlProbeCount} URL reference encoded-control probes, ${referenceControlCharacterProbeCount} URL reference character probes, ${referenceLiteralControlProbeCount} URL reference literal-control probes, ${referenceWhitespaceProbeCount} URL reference whitespace probes, ${emptyReferenceProbeCount} empty URL reference probes, ${referenceSchemeProbeCount} URL reference scheme probes, ${srcsetProbeCount} srcset candidate probes, ${sizesProbeCount} sizes attribute probes, ${protocolRelativeExternalProbeCount} protocol-relative external-link probes, ${protocolRelativeReferenceProbeCount} protocol-relative metadata/asset probes, ${protocolRelativeMachineReferenceProbeCount} protocol-relative machine-reference probes, ${tabindexOrderProbeCount} tabindex order probes and ${tabindexValueProbeCount} tabindex value probes, ${accessibleControlCount} links and buttons with accessible names including ${descriptiveProjectLinkCount} descriptive project links representing ${projectConsistency.linkedProjectCount} linked projects consistently across ${projectConsistency.projectLayoutCount} layouts, ${unlinkedProjectConsistency.unlinkedProjectCount} unlinked project remaining non-interactive across ${unlinkedProjectConsistency.projectLayoutCount} layouts, ${projectScreenshots.projectScreenshotCount} uniquely sourced project screenshots with matching alternative text, and ${newTabLinkCount} new-tab announcements backed by ${screenReaderOnly.screenReaderOnlyRuleCount} visually-hidden CSS rules, ${hiddenExternalArrowCount} hidden decorative external-link arrows, and ${focusStyles.focusRuleCount} visible focus style, ${informativeImageCount} informative and ${decorativeImageCount} explicitly decorative images, ${eagerImageCount} eager high-priority and ${lazyImageCount} lazy images with asynchronous decoding, intrinsic dimensions for ${renderedImageDimensions.size} rendered image assets, ${runtimeAssets.size} self-hosted runtime assets, ${reducedMotion.keyframeCount} animation definitions with ${reducedMotion.reducedMotionBlockCount} reduced-motion fallbacks, ${internalLinkCount} internal links and fragments, ${externalHttpsLinkCount} HTTPS external links, ${contactLinkCount} readable contact links across ${contactDestinationCount} well-formed destinations including ${pricingEnquiryCount} package-specific enquiry subjects with ${pricingEnquiryAccessibleNameCount} package-specific accessible names, ${consistentPricingPackageCount} pricing packages with matching names, prices, taglines and audiences and ${orderedPricingPackageCount}-item order across ${pricingViewCount} views, ${descriptivePricingPackageCount} synchronized package descriptions, ${numberedPricingPackageCount} unique sequential package numbers, ${semanticPricingLabelCount} fixed/from price labels matching package semantics, ${pricingRangeLabelCount} synchronized package range labels, ${pricingMetadataPriceCount} synchronized metadata prices, ${validatedPricingTimelineCount} well-formed visible package timelines, ${validatedPricingScopePackageCount} packages with ${pricingInclusionCount} included features and ${pricingLimitCount} written limits, ${runningCostRowCount} recurring-cost rows with ${runningCostVisibleFieldCount} synchronized responsive field renderings, ${pricingProcessStepCount} sequential process steps with ${pricingProcessFieldCount} synchronized visible fields, ${finePrintTermCount} fine-print terms with ${finePrintVisibleFieldCount} synchronized visible fields, and ${synchronizedCommercialTermCount} synchronized commercial terms, document setup, custom 404 recovery, accessibility, unique route metadata, social share image, optimized favicon, install icons, ${serviceImages.length} optimized service images, web manifest, Person structured data, robots access and sitemap discovery, ${assetPaths.size} page assets, and asset budgets (${budgetSummary.join(', ')}).`
)
