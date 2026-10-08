<script setup lang="ts">
import { navItems, navIds, elsewhere } from '~/data/nav'

const active = useActiveSection(navIds)
const year = new Date().getFullYear()
</script>

<template>
  <aside
    class="fixed inset-y-0 left-0 z-40 hidden w-sidebar flex-col border-r border-gray-200 bg-bg px-6 py-8 lg:flex"
  >
    <!-- Identity -->
    <a href="#index" class="group block">
      <img
        src="/images/logo.png"
        alt=""
        aria-hidden="true"
        class="h-7 w-auto grayscale transition-opacity duration-200 group-hover:opacity-70 dark:invert"
      />
      <span class="mt-3 block text-sm font-medium text-ink">Christian Colewan</span>
      <span class="label mt-1 block">Developer</span>
    </a>

    <div class="my-6 border-t border-gray-200" />

    <!-- Sections -->
    <nav aria-label="Sections">
      <p class="label mb-3">Menu</p>
      <ul class="space-y-1.5">
        <li v-for="item in navItems" :key="item.id">
          <a
            :href="`#${item.id}`"
            class="group flex items-center gap-2 font-mono text-xs transition-colors duration-200"
            :class="active === item.id ? 'text-ink' : 'text-gray-500 hover:text-ink'"
            :aria-current="active === item.id ? 'true' : undefined"
          >
            <!-- Accent only on the active marker; the hover ghost stays neutral
                 so the current section is never ambiguous. -->
            <span
              aria-hidden="true"
              class="w-2 transition-opacity duration-200"
              :class="
                active === item.id
                  ? 'text-accent opacity-100'
                  : 'opacity-0 group-hover:opacity-40'
              "
              >→</span
            >
            <span>{{ item.label }}</span>
          </a>
        </li>
      </ul>
    </nav>

    <div class="my-6 border-t border-gray-200" />

    <!-- Elsewhere -->
    <nav aria-label="Elsewhere">
      <p class="label mb-3">Elsewhere</p>
      <ul class="space-y-1.5">
        <li v-for="link in elsewhere" :key="link.href">
          <a
            :href="link.href"
            :target="link.href.startsWith('http') ? '_blank' : undefined"
            :rel="link.href.startsWith('http') ? 'noopener' : undefined"
            class="link-muted font-mono text-xs"
          >
            {{ link.label }}<span v-if="link.href.startsWith('http')" aria-hidden="true"> ↗</span>
          </a>
        </li>
      </ul>
    </nav>

    <!-- Footer of the rail -->
    <div class="mt-auto space-y-4 pt-6">
      <p class="flex items-center gap-2">
        <span
          aria-hidden="true"
          class="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent"
        />
        <span class="label">Available for work</span>
      </p>
      <div class="border-t border-gray-200 pt-4">
        <ThemeToggle />
        <p class="label mt-3">&copy; {{ year }}</p>
      </div>
    </div>
  </aside>
</template>
