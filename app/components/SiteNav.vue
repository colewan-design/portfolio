<script setup lang="ts">
import { navItems, navIds } from '~/data/nav'

const active = useActiveSection(navIds)
const sectionHref = useSectionHref()
const route = useRoute()

/* An item with its own route is marked from the path; the rest follow the
   scroll spy, which only has sections to observe on the index. */
function isActive(item: (typeof navItems)[number]) {
  if (item.to) return route.path === item.to
  return route.path === '/' && active.value === item.id
}

/* The wordmark sits over the hero's glow, so the bar only grows a ground
   once the page has moved past it. On a routed page there is no glow to sit
   over, so it starts grounded. */
const scrolled = ref(route.path !== '/')

onMounted(() => {
  const onScroll = () => {
    scrolled.value = route.path !== '/' || window.scrollY > 24
  }
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
  watch(() => route.path, onScroll)
  onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
})
</script>

<template>
  <header
    class="fixed inset-x-0 top-0 z-50 transition-colors duration-500"
    :class="scrolled ? 'border-b bg-bg/80 backdrop-blur-md' : 'border-b border-transparent'"
  >
    <div class="mx-auto flex max-w-page flex-col items-center gap-2.5 px-5 py-4 sm:gap-3">
      <a
        :href="sectionHref('index')"
        class="font-display text-lg font-semibold lowercase tracking-tight text-ink"
      >
        christian colewan
      </a>

      <nav aria-label="Sections" class="w-full min-[400px]:w-auto">
        <ul
          class="grid grid-cols-3 items-center gap-x-4 gap-y-2.5 min-[400px]:flex min-[400px]:gap-3 sm:gap-4"
        >
          <li
            v-for="(item, i) in navItems.slice(1)"
            :key="item.id"
            class="flex items-center justify-center min-[400px]:gap-3 sm:gap-4"
          >
            <!-- Nodes separate the single-row treatment. The compact grid omits
                 them so every link keeps an even tap and focus area. -->
            <span
              v-if="i > 0"
              aria-hidden="true"
              class="hidden size-[3px] bg-gray-500 min-[400px]:block"
            />
            <!-- Section links stay plain anchors so the CSS smooth scroll keeps
                 owning the motion; only a real route goes through the router. -->
            <component
              :is="item.to ? 'NuxtLink' : 'a'"
              v-bind="item.to ? { to: item.to } : { href: sectionHref(item.id) }"
              class="micro transition-colors duration-200 hover:text-ink"
              :class="isActive(item) && 'text-ink'"
              :aria-current="isActive(item) ? (item.to ? 'page' : 'location') : undefined"
            >
              {{ item.label }}
            </component>
          </li>
        </ul>
      </nav>
    </div>
  </header>
</template>
