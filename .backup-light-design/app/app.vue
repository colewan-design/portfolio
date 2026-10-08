<template>
  <div class="min-h-screen bg-bg font-sans text-ink">
    <NuxtRouteAnnouncer />

    <a
      href="#main"
      class="btn sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
    >
      Skip to content
    </a>

    <AppSidebar />
    <AppHeader />

    <div class="lg:pl-sidebar">
      <main id="main" class="mx-auto w-full max-w-page px-4 sm:px-6">
        <NuxtPage />
      </main>
      <AppFooter />
    </div>
  </div>
</template>
