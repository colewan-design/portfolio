<script setup lang="ts">
const facts = [
  { key: 'Based in', value: 'Baguio, Philippines' },
  { key: 'Experience', value: '3 years' },
  { key: 'Focus', value: 'Systems & product' },
  { key: 'Status', value: 'Available for work' }
]
</script>

<template>
  <section id="about" class="mx-auto max-w-page px-5">
    <div class="grid gap-12 lg:grid-cols-[1fr_20rem] lg:gap-16">
      <div class="rise max-w-measure">
        <p class="micro mb-8">About</p>

        <p class="text-lg text-gray-700">
          I'm a Baguio-based developer with three years of experience building systems, desktop
          apps, web systems, mobile apps, business websites, and CRM websites.
        </p>
        <p class="mt-5 text-gray-600">
          Most of my work is end-to-end: I take a rough idea, shape the data model, build the
          interface, and stay on it after it ships. I like small, legible systems that a team can
          actually maintain — and I'd rather cut a feature than ship a fragile one.
        </p>
      </div>

      <dl class="rise self-start">
        <div
          v-for="fact in facts"
          :key="fact.key"
          class="flex items-baseline justify-between gap-4 border-t py-3.5"
        >
          <dt class="micro">{{ fact.key }}</dt>
          <dd class="font-mono text-xs text-gray-800">{{ fact.value }}</dd>
        </div>
        <div class="border-t" />
      </dl>
    </div>
  </section>
</template>
