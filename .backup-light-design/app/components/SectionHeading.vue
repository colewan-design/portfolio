<script setup lang="ts">
defineProps<{
  index: string
  title: string
  note?: string
}>()
</script>

<template>
  <div class="rise mb-10 border-t border-gray-200 pt-4">
    <div class="flex items-baseline justify-between gap-6">
      <h2 class="section-marker">{{ index }} — {{ title }}</h2>
      <p v-if="note" class="label text-right">{{ note }}</p>
    </div>
  </div>
</template>
