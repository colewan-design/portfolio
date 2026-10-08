<script setup lang="ts">
const year = new Date().getFullYear()

const tape = ['Available for work', 'Baguio · UTC+8', 'Systems · Web · Mobile · Desktop']
</script>

<template>
  <footer class="relative overflow-hidden pt-section">
    <!-- Same widening as the hero tape: a tilted band needs slack past the
         viewport edge or the overflow clip shears its ends. -->
    <div aria-hidden="true" class="w-[112vw] -translate-x-[6vw] -rotate-[1.2deg]">
      <MarqueeTape :items="tape" :speed="46" reverse />
    </div>

    <div
      class="mx-auto mt-10 flex max-w-page flex-col gap-4 px-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <p class="micro">&copy; {{ year }} Christian Colewan</p>
      <p class="micro flex items-center gap-2.5">
        <span aria-hidden="true" class="inline-block size-1.5 animate-pulse rounded-full bg-ink" />
        Available for work
      </p>
    </div>

    <!-- Oversized wordmark bled off the bottom edge. Decorative: the name is
         already announced by the nav and the copyright line. -->
    <div aria-hidden="true" class="relative mt-10 select-none">
      <p class="wordmark font-display">christian colewan</p>
    </div>
  </footer>
</template>

<style scoped>
.wordmark {
  /* Sized off the viewport so it always spans the full width, and clipped at
     the baseline so the letterforms run off the bottom of the page. */
  font-size: 15.5vw;
  font-weight: 700;
  line-height: 0.78;
  text-align: center;
  letter-spacing: -0.03em;
  white-space: nowrap;
  color: rgb(var(--gray-300));
  /* Stretched vertically, which is what gives the reference's footer mark its
     compressed, almost architectural look. */
  transform: scaleY(1.35);
  transform-origin: bottom center;
  margin-bottom: -0.06em;
}
</style>
