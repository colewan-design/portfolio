<script setup lang="ts">
import { navItems, elsewhere } from '~/data/nav'

const open = ref(false)
const closeButton = ref<HTMLButtonElement | null>(null)

function close() {
  open.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) close()
}

watch(open, async (isOpen) => {
  document.body.style.overflow = isOpen ? 'hidden' : ''
  if (isOpen) {
    await nextTick()
    closeButton.value?.focus()
  }
})

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <header
    class="sticky top-0 z-40 border-b border-gray-200 bg-bg/90 backdrop-blur-md lg:hidden"
  >
    <div class="flex items-center justify-between px-4 py-3.5">
      <a href="#index" class="flex items-center gap-2.5" aria-label="Home">
        <img
          src="/images/logo.png"
          alt=""
          aria-hidden="true"
          class="h-6 w-auto grayscale dark:invert"
        />
        <span class="text-sm font-medium text-ink">Christian Colewan</span>
      </a>

      <button
        type="button"
        class="btn-quiet text-gray-500"
        aria-haspopup="dialog"
        :aria-expanded="open"
        @click="open = true"
      >
        Menu
      </button>
    </div>

    <!-- Full-screen overlay menu -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200 ease-settle"
        enter-from-class="opacity-0"
        leave-active-class="transition-opacity duration-200 ease-settle"
        leave-to-class="opacity-0"
      >
        <div
          v-if="open"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          class="fixed inset-0 z-50 flex flex-col bg-bg lg:hidden"
        >
          <div
            aria-hidden="true"
            class="halftone mask-corner pointer-events-none absolute inset-x-0 top-0 h-56 opacity-[0.14]"
          />

          <div class="relative flex items-center justify-between border-b border-gray-200 px-4 py-3.5">
            <span class="label">Navigation</span>
            <button ref="closeButton" type="button" class="btn-quiet text-gray-500" @click="close">
              Close
            </button>
          </div>

          <nav class="relative flex-1 overflow-y-auto px-4 py-8" aria-label="Sections">
            <ul class="space-y-5">
              <li v-for="item in navItems" :key="item.id">
                <a
                  :href="`#${item.id}`"
                  class="flex items-baseline gap-4 lowercase"
                  @click="close"
                >
                  <span class="section-marker w-6">{{ item.index }}</span>
                  <span class="text-2xl text-ink">{{ item.label }}</span>
                </a>
              </li>
            </ul>

            <div class="mt-10 border-t border-gray-200 pt-6">
              <p class="label mb-3">Elsewhere</p>
              <ul class="space-y-2">
                <li v-for="link in elsewhere" :key="link.href">
                  <a
                    :href="link.href"
                    :target="link.href.startsWith('http') ? '_blank' : undefined"
                    :rel="link.href.startsWith('http') ? 'noopener' : undefined"
                    class="link-muted font-mono text-xs"
                    @click="close"
                  >
                    {{ link.label
                    }}<span v-if="link.href.startsWith('http')" aria-hidden="true"> ↗</span>
                  </a>
                </li>
              </ul>
            </div>
          </nav>

          <div class="relative border-t border-gray-200 px-4 py-4">
            <ThemeToggle />
          </div>
        </div>
      </Transition>
    </Teleport>
  </header>
</template>
