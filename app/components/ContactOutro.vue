<script setup lang="ts">
import { navItems, elsewhere } from '~/data/nav'

const email = 'cts.colewan@gmail.com'

/* The outro is rendered on the pricing page too, so its index column can no
   longer assume the sections are on the current page. */
const sectionHref = useSectionHref()
</script>

<template>
  <section id="contact" class="mx-auto max-w-page px-5">
    <div class="grid gap-12 lg:grid-cols-[1fr_auto] lg:gap-16">
      <div class="rise">
        <h2 class="display text-h2 max-w-[14ch]">
          Let's build<br />
          <span class="display-dim">something solid.</span>
        </h2>

        <p class="micro mt-8 max-w-[52ch] leading-[1.9] text-gray-700">
          Send a short note about what you're working on — the problem, the users, and roughly when
          you need it live. I'll reply with how I'd approach it.
        </p>

        <div class="mt-10 flex flex-wrap items-center gap-x-7 gap-y-4">
          <a :href="`mailto:${email}`" class="bracket-solid">Start a project</a>
          <a :href="`mailto:${email}`" class="bracket">{{ email }}</a>
        </div>
      </div>

      <!-- Two link columns, as in the reference's outro. -->
      <div class="rise grid grid-cols-2 gap-x-12 gap-y-2 self-end sm:gap-x-20">
        <div>
          <p class="micro mb-4 text-gray-500">Index</p>
          <ul class="space-y-2.5">
            <li v-for="item in navItems" :key="item.id">
              <NuxtLink v-if="item.to" :to="item.to" class="bracket">
                {{ item.label }}
              </NuxtLink>
              <a v-else :href="sectionHref(item.id)" class="bracket">
                {{ item.label }}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <p class="micro mb-4 text-gray-500">Elsewhere</p>
          <ul class="space-y-2.5">
            <li v-for="link in elsewhere" :key="link.href">
              <a
                :href="link.href"
                :target="link.href.startsWith('http') ? '_blank' : undefined"
                :rel="link.href.startsWith('http') ? 'noopener' : undefined"
                class="bracket"
              >
                {{ link.label }}
                <span v-if="link.href.startsWith('http')" class="sr-only">
                  (opens in a new tab)
                </span>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>
