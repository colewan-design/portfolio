<script setup lang="ts">
import { projects } from '~/data/projects'

/* A plate keeps the number of its place in the full list, so `03` names the
   same project whichever filter is on. */
const plates = projects.map((project, i) => {
  const ratio = +(project.width / project.height).toFixed(3)
  return {
    ...project,
    no: String(i + 1).padStart(2, '0'),
    ratio,
    /* The stacked phone layout floors the proportions at square — see the
       stylesheet. */
    stackRatio: Math.max(ratio, 1)
  }
})

/* The filters read off the tags already on each project, in the order they
   first appear, rather than a second list that could drift from the data. */
const filters = [
  { id: 'all', count: plates.length },
  ...[...new Set(projects.flatMap((project) => project.tags))].map((tag) => ({
    id: tag,
    count: plates.filter((plate) => plate.tags.includes(tag)).length
  }))
]

const active = ref('all')

const shown = computed(() =>
  active.value === 'all' ? plates : plates.filter((plate) => plate.tags.includes(active.value))
)

/* Position in `shown`, not in `plates`: the viewer steps through what is on
   the wall, so prev and next never land on a plate the filter has taken down. */
const viewing = ref<number | null>(null)
</script>

<template>
  <section id="work" class="mx-auto max-w-page px-5">
    <div class="rise flex flex-wrap items-end justify-between gap-x-12 gap-y-8">
      <h2 class="display text-h2">
        Selected<br />
        <span class="display-dim">work.</span>
      </h2>

      <div
        role="group"
        aria-label="Filter work by discipline"
        class="-mx-1 flex flex-wrap items-center"
      >
        <button
          v-for="filter in filters"
          :key="filter.id"
          type="button"
          class="work-filter"
          :aria-pressed="active === filter.id"
          @click="active = filter.id"
        >
          {{ filter.id }}
          <span class="work-filter-count">{{ String(filter.count).padStart(2, '0') }}</span>
        </button>
      </div>
    </div>

    <div class="rule-node rise mt-8" aria-hidden="true" />

    <p class="sr-only" aria-live="polite">
      Showing {{ shown.length }} of {{ plates.length }} projects
    </p>

    <!-- The wall measures itself: its row height is a share of this box, not
         of the viewport. -->
    <div class="@container mt-8">
      <ul class="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3">
        <li
          v-for="(plate, i) in shown"
          :key="plate.name"
          class="plate rise @container"
          :style="{ '--ar': plate.ratio, '--ar-stack': plate.stackRatio }"
        >
          <button
            type="button"
            class="tile group flex w-full cursor-zoom-in flex-col text-left"
            :aria-label="`View ${plate.name}`"
            @click="viewing = i"
          >
            <!-- The frame carries the proportions and the image fills it, so a
                 plate stretched a pixel or two to match its row crops by that
                 much instead of leaving a seam. -->
            <span class="frame relative block w-full shrink-0 grow overflow-hidden">
              <img
                :src="plate.image"
                :alt="`Screenshot of ${plate.name}`"
                :width="plate.width"
                :height="plate.height"
                loading="lazy"
                decoding="async"
                class="absolute inset-0 size-full object-cover object-top grayscale transition duration-700 ease-settle group-hover:scale-[1.03] group-hover:grayscale-0 group-focus-visible:grayscale-0"
              />
              <span
                aria-hidden="true"
                class="micro-ink absolute right-2.5 top-2.5 bg-bg/85 px-2 py-1 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                View
              </span>
            </span>

            <!-- Caption under the image rather than over it: the screenshot is
                 the exhibit, so nothing sits on top of it at rest. -->
            <span class="flex items-center justify-between gap-3 border-t px-3 py-2.5">
              <span class="flex min-w-0 items-baseline gap-2.5">
                <span class="micro">{{ plate.no }}</span>
                <span class="micro-ink truncate">{{ plate.name }}</span>
              </span>
              <!-- Dropped on a narrow plate, where it would squeeze the name
                   down to an ellipsis. -->
              <span class="micro hidden shrink-0 @[20rem]:block">
                {{ plate.tags.join(' · ') }}
              </span>
            </span>
          </button>
        </li>
      </ul>
    </div>

    <WorkViewer v-model="viewing" :plates="shown" />
  </section>
</template>

<style scoped>
/* Below the first breakpoint the wall is a plain stack, one plate to a line at
   its own proportions. A phone screenshot run at full width would stand taller
   than the phone it is being read on, so the stack floors it at square and
   lets the top of the screen show. */
.plate {
  display: flex;
}

.frame {
  aspect-ratio: var(--ar-stack);
}

/* From there up it is a justified wall. Each plate asks for the width its
   proportions give it at a common row height, and grows by that same
   proportion — so every plate in a row lands on one height and the row fills
   the measure with nothing cropped. The row height is a share of the wall's
   own width rather than a length, which is what keeps the rows breaking at the
   same plates at every size instead of reshuffling as the viewport moves. */
@media (min-width: 640px) {
  .plate {
    flex: var(--ar) 1 calc(var(--ar) * 20cqw);
    /* A short last row would otherwise stretch to the full measure, and one
       plate left alone by a filter becomes a banner. The cap sits just above
       the tallest a full row of these screenshots reaches — two 16:9 plates,
       about 28cqw — so it only ever binds on a row that is not full. */
    max-width: calc(var(--ar) * 30cqw);
  }

  .frame {
    aspect-ratio: var(--ar);
  }
}

/* The selected filter takes the page's bracket; the others hold the same
   space with theirs undrawn, so choosing one moves nothing. */
.work-filter {
  display: inline-flex;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.5rem 0.25rem;
  font-family: var(--font-mono);
  font-size: 9px;
  line-height: 1.5;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgb(var(--gray-600));
  cursor: pointer;
  transition: color 240ms ease;
}

.work-filter::before {
  content: '[';
}

.work-filter::after {
  content: ']';
}

.work-filter::before,
.work-filter::after {
  color: transparent;
  transition: color 240ms ease;
}

.work-filter:hover,
.work-filter[aria-pressed='true'] {
  color: rgb(var(--ink));
}

.work-filter[aria-pressed='true']::before,
.work-filter[aria-pressed='true']::after {
  color: rgb(var(--gray-500));
}

.work-filter-count {
  color: rgb(var(--gray-500));
}
</style>
