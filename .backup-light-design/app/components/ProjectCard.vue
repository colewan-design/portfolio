<script setup lang="ts">
import type { Project } from '~/data/projects'

const props = defineProps<{ project: Project; index: string }>()

/* An empty `url` would render `<a href="">`, which reloads the page on click.
   Unlinked projects become a plain card instead. */
const linked = computed(() => Boolean(props.project.url))
</script>

<template>
  <component
    :is="linked ? 'a' : 'div'"
    :href="linked ? project.url : undefined"
    :target="linked ? '_blank' : undefined"
    :rel="linked ? 'noopener' : undefined"
    class="card rise group relative flex flex-col overflow-hidden"
    :class="linked && 'card-hover'"
    @pointermove="trackPointerVars"
  >
    <!-- Inset hairline, 5px inside the edge — a quiet framing accent. -->
    <span
      aria-hidden="true"
      class="pointer-events-none absolute inset-[5px] rounded-[11px] border border-gray-200 opacity-60"
    />

    <!-- Before the content, so the tint sits under the text rather than over it. -->
    <span aria-hidden="true" class="spotlight pointer-events-none absolute inset-0" />

    <div class="relative m-[5px] overflow-hidden rounded-md bg-gray-100">
      <img
        :src="project.image"
        :alt="`Screenshot of ${project.name}`"
        loading="lazy"
        class="aspect-[16/10] w-full object-cover grayscale transition-transform duration-500 ease-settle group-hover:scale-[1.04]"
      />
    </div>

    <div class="relative flex flex-1 flex-col p-5 pt-4">
      <div class="flex items-center justify-between gap-3">
        <span class="label">{{ index }}</span>
        <span v-if="project.featured" class="pill-accent">Featured</span>
      </div>

      <h3 class="mt-3 text-base font-medium text-ink">{{ project.name }}</h3>
      <p class="mt-2 text-sm text-gray-500">{{ project.description }}</p>

      <div class="mt-4 flex flex-wrap gap-1.5">
        <span v-for="tag in project.tags" :key="tag" class="pill">{{ tag }}</span>
      </div>

      <span
        v-if="linked"
        class="btn-quiet mt-auto self-stretch border-t border-gray-200 pt-4 text-gray-500 transition-colors duration-200 group-hover:text-ink"
      >
        Visit site
        <span aria-hidden="true" class="arrow">↗</span>
      </span>
      <span
        v-else
        class="btn-quiet mt-auto self-stretch border-t border-gray-200 pt-4 text-gray-400"
      >
        In development
      </span>
    </div>
  </component>
</template>
