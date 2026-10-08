<script setup lang="ts">
const { theme, cycleTheme } = useTheme()

const nextLabel = computed(() =>
  theme.value === 'light' ? 'dark' : theme.value === 'dark' ? 'system' : 'light'
)
</script>

<template>
  <button
    type="button"
    class="btn-quiet text-gray-500 transition-colors duration-200 hover:text-ink"
    :aria-label="`Theme: ${theme}. Switch to ${nextLabel}.`"
    :title="`Theme: ${theme}`"
    @click="cycleTheme($event)"
  >
    <span aria-hidden="true" class="font-mono text-2xs">
      {{ theme === 'light' ? '○' : theme === 'dark' ? '●' : '◐' }}
    </span>
    <span>{{ theme }}</span>
  </button>
</template>
