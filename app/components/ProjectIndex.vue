<script setup lang="ts">
import { projects } from '~/data/projects'

/* The discipline column reads off the tags already on each project rather
   than duplicating them into a second field that could drift. */
function discipline(tags: string[]) {
  return tags.join(' · ')
}
</script>

<template>
  <section id="work" class="mx-auto max-w-page px-5">
    <div class="grid gap-10 lg:grid-cols-[18rem_1fr] lg:gap-16">
      <h2 class="display rise text-h3 lg:sticky lg:top-28 lg:self-start">
        A selection of<br />
        <span class="display-dim">recent work.</span>
      </h2>

      <div class="rise">
        <!-- Column head. Mirrors the row grid exactly so the two stay aligned,
             but is not a `.row` — it takes no hairline and no hover. -->
        <div
          class="micro grid grid-cols-[2.5rem_1fr_auto] items-center gap-4 pb-2 sm:grid-cols-[3rem_1fr_10rem_2rem]"
        >
          <span>No.</span>
          <span>Project</span>
          <span class="hidden sm:block">Discipline</span>
          <span aria-hidden="true" class="text-right sm:text-center">↗</span>
        </div>

        <component
          :is="project.url ? 'a' : 'div'"
          v-for="(project, i) in projects"
          :key="project.name"
          :href="project.url || undefined"
          :target="project.url ? '_blank' : undefined"
          :rel="project.url ? 'noopener' : undefined"
          :aria-label="project.url ? `View ${project.name} project (opens in a new tab)` : undefined"
          :data-project-name="project.name"
          :data-project-linked="project.url ? 'true' : 'false'"
          class="row group grid-cols-[2.5rem_1fr_auto] sm:grid-cols-[3rem_1fr_10rem_2rem]"
        >
          <span class="micro">{{ String(i + 1).padStart(2, '0') }}</span>

          <span
            class="font-display text-lg uppercase leading-tight tracking-tight text-gray-800 transition-colors duration-200 group-hover:text-ink"
          >
            {{ project.name }}
          </span>

          <span class="micro hidden sm:block">{{ discipline(project.tags) }}</span>

          <span
            aria-hidden="true"
            class="micro text-right transition-colors duration-200 group-hover:text-ink sm:text-center"
          >
            {{ project.url ? '↗' : '—' }}
          </span>

          <span v-if="project.url" class="sr-only">(opens in a new tab)</span>
        </component>

        <!-- Closes the table: rows only draw a top hairline. -->
        <div class="border-t" />
      </div>
    </div>
  </section>
</template>
