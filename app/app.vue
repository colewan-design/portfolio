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
