<script setup lang="ts">
const route = useRoute()
const siteUrl = 'https://christiancolewan.tech'

/* Canonical and Open Graph URLs follow the active route so /pricing is not
   incorrectly attributed to the homepage when it is shared or indexed. */
const pageUrl = computed(() => new URL(route.path, siteUrl).toString())

useHead(() => ({
  link: [{ rel: 'canonical', href: pageUrl.value }],
  meta: [{ property: 'og:url', content: pageUrl.value }]
}))
</script>

<template>
  <div class="min-h-screen bg-bg font-sans text-ink">
    <NuxtRouteAnnouncer />

    <a
      href="#main"
      class="bracket-solid sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-60"
    >
      Skip to content
    </a>

    <SiteNav />

    <main id="main">
      <NuxtPage />
    </main>

    <FooterMark />
  </div>
</template>
