<script setup lang="ts">
const stats = [
  { value: '3', label: 'Years building' },
  { value: '5', label: 'Shipped projects' },
  { value: '6', label: 'Service lines' }
]
</script>

<template>
  <section id="index" class="relative pb-section pt-10 lg:pt-20" @pointermove="trackPointerVars">
    <!-- The one halftone accent up top: dissolves into the corner, and drifts
         a cell or so against the cursor. -->
    <div
      aria-hidden="true"
      class="halftone halftone-drift mask-corner pointer-events-none absolute -right-6 -top-4 hidden h-64 w-64 opacity-[0.16] lg:block"
    />

    <div class="relative grid gap-10 lg:grid-cols-[1fr_16rem] lg:items-end lg:gap-14">
      <div>
        <p class="reveal label">Baguio, Philippines · UTC+8</p>

        <h1 class="page-title reveal reveal-1 mt-5">hello</h1>

        <p class="reveal reveal-2 mt-6 max-w-measure text-lg text-gray-500">
          — it's <span class="text-ink">Christian Colewan</span>, a developer. I build systems,
          desktop apps, web systems, mobile apps, and the sites businesses run on.
        </p>

        <div class="reveal reveal-3 mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          <a href="#contact" class="btn">
            Book a call
            <span aria-hidden="true">↗</span>
          </a>
          <a href="#work" class="btn-quiet text-gray-500 transition-colors hover:text-ink">
            See the work
            <span aria-hidden="true" class="arrow">→</span>
          </a>
        </div>
      </div>

      <!-- Portrait dissolving into dots along its bottom edge. -->
      <figure class="reveal reveal-2 relative mx-auto w-full max-w-[16rem] lg:mx-0">
        <div
          aria-hidden="true"
          class="halftone halftone-dense mask-dissolve absolute -inset-x-6 bottom-0 h-40 opacity-90"
        />
        <img
          src="/images/portrait.png"
          alt="Christian Colewan"
          class="mask-photo relative w-full rounded-md object-cover grayscale"
        />
      </figure>
    </div>

    <!-- Stat row: the dividers are the design. -->
    <dl
      class="reveal reveal-4 mt-14 grid grid-cols-3 border-l border-t border-gray-200 sm:max-w-measure"
    >
      <div v-for="stat in stats" :key="stat.label" class="border-b border-r border-gray-200 p-4">
        <dt class="label">{{ stat.label }}</dt>
        <dd class="font-display mt-2 text-2xl tabular-nums text-ink">{{ stat.value }}</dd>
      </div>
    </dl>
  </section>
</template>
