<script setup lang="ts">
const services = [
  { name: 'Systems', note: 'Internal tooling', image: '/images/services/systems.png' },
  { name: 'Desktop Apps', note: 'Native & cross-platform', image: '/images/services/desktop-apps.png' },
  { name: 'Web Systems', note: 'Dashboards & portals', image: '/images/services/web-systems.png' },
  { name: 'Mobile Apps', note: 'iOS & Android', image: '/images/services/mobile-apps.png' },
  { name: 'Business Websites', note: 'Marketing & brochure', image: '/images/services/business-websites.png' },
  { name: 'CRM Websites', note: 'Pipelines & clients', image: '/images/services/crm-websites.png' }
]
</script>

<template>
  <section id="services" class="pb-section">
    <SectionHeading index="03" title="services" :note="`${services.length} lines`" />

    <p class="mb-10 max-w-measure text-gray-500">
      End-to-end development across desktop, web, and mobile — from internal systems to
      client-facing business and CRM sites.
    </p>

    <!-- Hairlines instead of gaps: the dividers are the grid. -->
    <ul class="grid grid-cols-2 border-l border-t border-gray-200 lg:grid-cols-3">
      <li
        v-for="(service, i) in services"
        :key="service.name"
        class="rise group border-b border-r border-gray-200 p-5 transition-colors duration-200 hover:bg-gray-50"
      >
        <span class="label">{{ String(i + 1).padStart(2, '0') }}</span>
        <img
          :src="service.image"
          alt=""
          aria-hidden="true"
          loading="lazy"
          class="mt-4 h-10 w-10 object-contain grayscale opacity-70 transition-opacity duration-200 group-hover:opacity-100 dark:invert"
        />
        <h3 class="mt-4 text-sm font-medium text-ink">{{ service.name }}</h3>
        <p class="label mt-1.5">{{ service.note }}</p>
      </li>
    </ul>
  </section>
</template>
