<script setup lang="ts">
const year = new Date().getFullYear()
</script>

<template>
  <footer class="border-t border-gray-200">
    <div
      class="mx-auto flex max-w-page flex-col gap-3 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6"
    >
      <p class="label">&copy; {{ year }} Christian Colewan</p>
      <div class="flex items-center gap-5">
        <a href="mailto:cts.colewan@gmail.com" class="link-muted font-mono text-xs">
          cts.colewan@gmail.com
        </a>
        <span aria-hidden="true" class="hidden h-3 w-px bg-gray-200 sm:block" />
        <p class="label hidden sm:block">Baguio · UTC+8</p>
      </div>
    </div>
  </footer>
</template>
