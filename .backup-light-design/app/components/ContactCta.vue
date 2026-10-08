<template>
  <section id="contact" class="pb-section">
    <SectionHeading index="04" title="contact" note="Baguio · UTC+8" />

    <div class="card rise relative overflow-hidden p-6 sm:p-8">
      <div
        aria-hidden="true"
        class="halftone mask-corner pointer-events-none absolute -right-8 -top-8 h-48 w-48 opacity-[0.14]"
      />

      <div class="relative max-w-measure">
        <p class="flex items-center gap-2">
          <span
            aria-hidden="true"
            class="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent"
          />
          <span class="label">Available for work</span>
        </p>

        <h3 class="mt-5 text-3xl font-semibold text-ink">Have something to build?</h3>
        <p class="mt-4 text-gray-500">
          Send a short note about what you're working on — the problem, the users, and roughly when
          you need it live. I'll reply with how I'd approach it.
        </p>

        <div class="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
          <a href="mailto:cts.colewan@gmail.com" class="btn">
            Book a call
            <span aria-hidden="true">↗</span>
          </a>
          <a
            href="mailto:cts.colewan@gmail.com"
            class="link font-mono text-xs text-gray-500 transition-colors hover:text-ink"
          >
            cts.colewan@gmail.com
          </a>
        </div>
      </div>
    </div>
  </section>
</template>
