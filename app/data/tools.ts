/**
 * Small utilities I built and put online, as opposed to the client work in
 * `projects.ts`. They are listed rather than screenshotted: a tool is judged
 * by what it does and whether it's one click away, so adding one here is a
 * single entry with no asset work — and the numbering is derived at render
 * time, so entries can be added or reordered without renumbering by hand.
 */

export interface Tool {
  name: string
  /** One line on what it does. Kept short enough to sit on a card. */
  blurb: string
  /** The property worth knowing before clicking — cost, privacy, input format. */
  note: string
  url: string
}

export const tools: Tool[] = [
  {
    name: 'MetaClean',
    blurb:
      'Strips C2PA credentials, EXIF, XMP and PNG prompt chunks out of an image.',
    note: 'Runs in your browser — nothing is uploaded',
    url: 'https://metaclean.salidumay.com/'
  },
  {
    name: 'GPX to Video',
    blurb: 'Turns a recorded GPX route into a rendered flyover video.',
    note: 'Takes a .gpx track export',
    url: 'https://gpx2video.salidumay.com/'
  },
  {
    name: 'BG Remover',
    blurb: 'Cuts the background out of an image and returns a clean cutout.',
    note: 'PNG, JPEG and WebP in, transparent PNG out',
    url: 'https://bg-remover.salidumay.com/'
  }
]
