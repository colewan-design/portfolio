<script setup lang="ts">
/* The headline is split so the tail can be set in gray. That two-tone
   sentence is the typographic idea of the whole page, so it is structural
   here rather than something each caller re-implements with spans. */
defineProps<{
  lead: string
  tail: string
  eyebrow?: string
}>()
</script>

<template>
  <div class="mx-auto max-w-[46rem] px-5 text-center">
    <p v-if="eyebrow" class="micro rise mb-10">{{ eyebrow }}</p>

    <div class="rule-node rise mb-10" aria-hidden="true" />

    <h2 class="display rise text-h2">
      {{ lead }}
      <span class="display-dim">{{ tail }}</span>
    </h2>

    <div class="rule-node rise mt-10" aria-hidden="true" />
  </div>
</template>
