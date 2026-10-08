<script setup lang="ts">
/* Both orbit layers must sit on exactly the same ellipse or cards jump as they
   hand over, so the box is declared once and z-order is the only difference. */
/* Chest height, not the middle of the figure. The ring is tipped toward the
   viewer, so it hangs below its own centre — perspective magnifies the near arc
   and shrinks the far one, which drops the ellipse's visual middle by roughly
   0.1r. Setting the centre near the collarbone is what lands the far arc on the
   shoulder line and the near arc at the waist; raise these and the band climbs
   back around the head.
   Below lg the ring is measured from the bottom in vw, not from the top in
   percent, because that is how the figure itself is measured there: the
   portrait sits on the bottom edge and its width cap — not the height cap —
   decides how tall it comes out, so its chest stays at a fixed multiple of the
   viewport width above the floor while a percentage of the viewport height
   drifts across phone aspect ratios. At lg the height cap binds instead and a
   percentage tracks it. */
const orbitBox =
  'absolute bottom-[38vw] left-[72%] h-[560px] w-[1000px] -translate-x-1/2 translate-y-1/2 sm:bottom-[19vw] lg:bottom-auto lg:top-[66%] lg:-translate-y-1/2'

const tape = [
  'Turning complexity into clarity',
  'Developer',
  'Baguio · UTC+8',
  'Systems · Web · Mobile · Desktop'
]
</script>

<template>
  <section
    id="index"
    class="grain relative isolate flex min-h-svh flex-col justify-end overflow-hidden pb-7 pt-28"
  >
    <!-- Cold light, centred on the head rather than the section, so the figure
         reads as lit from behind instead of floating on a gradient. -->
    <div
      aria-hidden="true"
      class="wash absolute inset-0 -z-30 opacity-90 lg:left-[18%] lg:opacity-100"
    />

    <!-- Far half of the lap, behind the figure: cards climb past the shoulder
         and are swallowed by the body rather than sliding over it. -->
    <div :class="[orbitBox, '-z-[26]']">
      <ThumbRing half="far" />
    </div>

    <!-- Figure. Sized by height rather than width: on a wide-but-short viewport
         a width cap leaves it small while a height cap fills the frame. The
         source is waist-up, so the head lands in the top third and the torso
         gives the orbit something to cross. -->
    <img
      src="/images/portrait.webp"
      alt="Christian Colewan"
      class="mask-figure pointer-events-none absolute bottom-0 left-[72%] -z-20 max-h-[76svh] w-[min(84vw,400px)] max-w-none -translate-x-1/2 object-contain object-bottom grayscale sm:max-h-[84svh] sm:w-[min(52vw,480px)] lg:max-h-[92svh] lg:w-[min(54vw,720px)]"
    />

    <!-- Near half, in front of the figure. Same box, same ellipse, same phase —
         only the stacking layer differs, which is what lets one card appear to
         travel a full lap through the body. It still sits under the headline so
         the text is never crossed. -->
    <div :class="[orbitBox, '-z-[14]']">
      <ThumbRing half="near" />
    </div>


    <!-- Text scrim. The orbit and the figure both reach into the text column
         on narrow screens, where there is no room to simply move them apart. -->
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-y-0 left-0 -z-[5] w-[78%] bg-linear-to-r from-bg via-bg/85 to-transparent lg:hidden"
    />

    <div class="relative z-10 mx-auto w-full max-w-page px-5 pb-10">
      <h1 class="display reveal text-h1 max-w-[13ch]">
        Work that<br />
        begins <span class="display-dim">with</span><br />
        the problem.
      </h1>

      <p class="micro reveal reveal-1 mt-8 max-w-[46ch] leading-[1.9] text-gray-700">
        Systems, desktop apps, web systems, mobile apps, and the sites businesses run on —
        built end to end for founders, startups, and established businesses.
      </p>

      <div class="reveal reveal-2 mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
        <a href="#work" class="bracket">Explore work</a>
        <a href="#contact" class="bracket">Start a project</a>
      </div>
    </div>

    <!-- Tape rides the bottom edge, tilted just off true. It is deliberately
         wider than the viewport: a 1.2deg tilt travels ~30px vertically across
         1440px, and at exactly 100% the section's overflow clip shears the
         ends off into what looks like two separate strips. -->
    <div
      aria-hidden="true"
      class="relative z-20 mt-8 w-[112vw] -translate-x-[6vw] -rotate-[1.2deg]"
    >
      <MarqueeTape :items="tape" :speed="52" />
    </div>
  </section>
</template>
