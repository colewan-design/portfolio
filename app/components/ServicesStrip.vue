<script setup lang="ts">
const services = [
  { name: 'Systems', note: 'Internal tooling' },
  { name: 'Desktop Apps', note: 'Native & cross-platform' },
  { name: 'Web Systems', note: 'Dashboards & portals' },
  { name: 'Mobile Apps', note: 'iOS & Android' },
  { name: 'Business Websites', note: 'Marketing & brochure' },
  { name: 'CRM Websites', note: 'Pipelines & clients' }
]
</script>

<template>
  <section id="services" class="mx-auto max-w-page px-5">
    <div class="grid gap-10 lg:grid-cols-[18rem_1fr] lg:gap-16">
      <h2 class="display rise text-h3">
        What I<br />
        <span class="display-dim">build.</span>
      </h2>

      <!-- Hairlines instead of gaps: negative margins pull the outer rules off
           the edge so only the interior divisions are drawn. -->
      <ul class="rise -mt-px grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <li
          v-for="(service, i) in services"
          :key="service.name"
          class="group border-t px-1 py-6 transition-colors duration-300 hover:bg-gray-100 sm:px-5"
        >
          <span class="micro">{{ String(i + 1).padStart(2, '0') }}</span>
          <h3
            class="font-display mt-3 text-h3 uppercase leading-none tracking-tight text-gray-800 transition-colors duration-200 group-hover:text-ink"
          >
            {{ service.name }}
          </h3>
          <p class="micro mt-2.5">{{ service.note }}</p>
        </li>
      </ul>
    </div>
  </section>
</template>
