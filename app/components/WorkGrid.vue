<script setup lang="ts">
import { projects } from '~/data/projects'
</script>

<template>
  <section class="mx-auto max-w-page px-5">
    <ul class="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
      <li v-for="project in projects" :key="project.name" class="rise">
        <component
          :is="project.url ? 'a' : 'div'"
          :href="project.url || undefined"
          :target="project.url ? '_blank' : undefined"
          :rel="project.url ? 'noopener' : undefined"
          :aria-label="project.url ? `View ${project.name} project (opens in a new tab)` : undefined"
          :data-project-name="project.name"
          :data-project-linked="project.url ? 'true' : 'false'"
          class="tile group block"
        >
          <img
            :src="project.image"
            :alt="`Screenshot of ${project.name}`"
            :data-project-name="project.name"
            :width="project.imageWidth"
            :height="project.imageHeight"
            loading="lazy"
            decoding="async"
            class="aspect-16/10 w-full object-cover grayscale transition duration-700 ease-settle group-hover:scale-[1.05] group-hover:grayscale-0"
          />

          <!-- Caption bar over the foot of the image, always legible against
               the scrim rather than depending on what the shot happens to
               show underneath. -->
          <div
            class="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-linear-to-t from-bg via-bg/85 to-transparent px-3 pb-2.5 pt-8"
          >
            <span class="micro-ink truncate">{{ project.name }}</span>
            <span class="micro shrink-0 transition-colors duration-200 group-hover:text-ink">
              {{ project.url ? 'See details' : 'In dev' }}
            </span>
          </div>

          <span v-if="project.url" class="sr-only">(opens in a new tab)</span>
        </component>
      </li>
    </ul>
  </section>
</template>
