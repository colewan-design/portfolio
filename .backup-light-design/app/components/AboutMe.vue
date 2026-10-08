<script setup lang="ts">
const facts = [
  { key: 'Based in', value: 'Baguio, Philippines' },
  { key: 'Experience', value: '3 years' },
  { key: 'Focus', value: 'Systems & product' },
  { key: 'Status', value: 'Available for work' }
]
</script>

<template>
  <section id="about" class="pb-section">
    <SectionHeading index="01" title="about" note="Who you'd be working with" />

    <div class="grid gap-10 lg:grid-cols-[1fr_18rem] lg:gap-14">
      <div class="rise max-w-measure">
        <h3 class="text-3xl font-semibold text-ink">Baguio, Philippines</h3>
        <p class="mt-5 text-gray-500">
          I'm a Baguio-based developer with three years of experience building systems, desktop
          apps, web systems, mobile apps, business websites, and CRM websites.
        </p>
        <p class="mt-4 text-gray-500">
          Most of my work is end-to-end: I take a rough idea, shape the data model, build the
          interface, and stay on it after it ships. I like small, legible systems that a team can
          actually maintain — and I'd rather cut a feature than ship a fragile one.
        </p>
      </div>

      <dl class="rise divide-y divide-gray-200 border-y border-gray-200">
        <div v-for="fact in facts" :key="fact.key" class="flex items-baseline gap-4 py-3">
          <dt class="label w-24 shrink-0">{{ fact.key }}</dt>
          <dd class="font-mono text-xs text-ink">{{ fact.value }}</dd>
        </div>
      </dl>
    </div>
  </section>
</template>
