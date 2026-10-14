<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const statusCode = computed(() => props.error.statusCode || 500)
const isNotFound = computed(() => statusCode.value === 404)
const heading = computed(() => (isNotFound.value ? 'Page not found.' : 'Something went wrong.'))
const description = computed(() =>
  isNotFound.value
    ? "The page you requested doesn't exist or may have moved."
    : 'The page could not be loaded. Please return home and try again.'
)

useHead(() => ({
  title: `${heading.value} — Christian Colewan`,
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
}))

function returnHome() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <div class="grain relative isolate min-h-svh overflow-hidden bg-bg text-ink">
    <div aria-hidden="true" class="wash absolute inset-0 -z-10 opacity-80" />

    <main
      id="main"
      class="mx-auto flex min-h-svh w-full max-w-page flex-col justify-center px-5 py-20"
    >
      <p class="micro">Error {{ statusCode }}</p>

      <h1 class="display mt-6 max-w-[11ch] text-h1">
        {{ heading }}
      </h1>

      <p class="mt-8 max-w-[46ch] text-gray-600">
        {{ description }}
      </p>

      <div class="mt-10">
        <button type="button" class="bracket-solid cursor-pointer" @click="returnHome">
          Return home
        </button>
      </div>
    </main>
  </div>
</template>
