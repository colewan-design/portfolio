<script setup lang="ts">
withDefaults(
  defineProps<{
    items: string[]
    /** Seconds for one full pass. Longer reads calmer. */
    speed?: number
    reverse?: boolean
  }>(),
  { speed: 42, reverse: false }
)
</script>

<template>
  <!-- Wholly decorative: the words repeat and carry no information the page
       does not already state, so it is hidden from assistive tech outright
       rather than duplicated into the accessibility tree. -->
  <div aria-hidden="true" class="tape mask-x select-none">
    <div
      class="tape-track"
      :style="{
        animationDuration: `${speed}s`,
        animationDirection: reverse ? 'reverse' : 'normal'
      }"
    >
      <!-- Exactly two identical runs: translating the track -50% then lands
           run two precisely where run one began, so the loop has no seam. -->
      <div v-for="run in 2" :key="run" class="tape-run">
        <span v-for="(item, i) in items" :key="i" class="tape-item">
          {{ item }}
          <span class="tape-node">▪</span>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tape {
  overflow: hidden;
  border-block: 1px solid var(--hairline);
  background-color: rgb(var(--bg) / 0.55);
  backdrop-filter: blur(3px);
}

.tape-track {
  display: flex;
  width: max-content;
  animation-name: marquee;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

.tape-run {
  display: flex;
  flex: none;
}

.tape-item {
  display: inline-flex;
  align-items: center;
  gap: 1.6rem;
  padding-inline: 0.8rem;
  padding-block: 0.55rem;
  font-family: var(--font-mono);
  font-size: var(--text-micro);
  line-height: 1.5;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: rgb(var(--gray-700));
  white-space: nowrap;
}

.tape-node {
  color: rgb(var(--gray-500));
}

/* A motionless marquee is just a truncated sentence, so it stops entirely
   rather than crawling slowly. */
@media (prefers-reduced-motion: reduce) {
  .tape-track {
    animation: none;
  }
}
</style>
