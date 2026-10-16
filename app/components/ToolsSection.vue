<script setup lang="ts">
import { tools } from '~/data/tools'
</script>

<template>
  <section id="tools" class="mx-auto max-w-page px-5">
    <div class="grid gap-10 lg:grid-cols-[18rem_1fr] lg:gap-16">
      <div class="rise lg:sticky lg:top-28 lg:self-start">
        <h2 class="display text-h3">
          Things I<br />
          <span class="display-dim">use myself.</span>
        </h2>
        <p class="micro mt-6 max-w-[28ch] leading-[1.9] text-gray-600">
          Small tools built to solve my own problem, left online because they solve someone else's
          too. Free, no sign-up.
        </p>
      </div>

      <!-- Hairlines instead of gaps, as in the services strip: the outer rules
           are left undrawn so only the interior divisions show. -->
      <ul class="rise -mt-px grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="(tool, i) in tools" :key="tool.url" class="border-t">
          <a
            :href="tool.url"
            target="_blank"
            rel="noopener"
            class="group flex h-full flex-col px-1 py-7 transition-colors duration-300 hover:bg-gray-100 sm:px-5"
          >
            <div class="flex items-center justify-between gap-3">
              <span class="micro">{{ String(i + 1).padStart(2, '0') }}</span>
              <span class="micro transition-colors duration-200 group-hover:text-ink">↗</span>
            </div>

            <h3
              class="font-display mt-3 text-h3 uppercase leading-none tracking-tight text-gray-800 transition-colors duration-200 group-hover:text-ink"
            >
              {{ tool.name }}
            </h3>

            <p class="mt-4 text-sm text-gray-600">{{ tool.blurb }}</p>

            <!-- Pushed to the foot so the notes line up across cards whose
                 blurbs run to different lengths. -->
            <p class="micro mt-auto pt-6 normal-case">{{ tool.note }}</p>
            <span class="sr-only">(opens in a new tab)</span>
          </a>
        </li>
      </ul>
    </div>
  </section>
</template>
