<script setup lang="ts">
import type { Project } from '~/data/projects'

const props = defineProps<{
  plates: Array<Project & { no: string }>
}>()

/* Position in `plates`, or null while the viewer is shut. */
const index = defineModel<number | null>({ required: true })

const dialog = ref<HTMLDialogElement | null>(null)
const strip = ref<HTMLElement | null>(null)

const plate = computed(() => (index.value === null ? null : (props.plates[index.value] ?? null)))

/* A native modal dialog: the browser supplies the focus trap, Escape, and the
   return of focus to the plate that opened it, so none of that is rebuilt
   here. The model is the only state — the element just follows it.
   Flushed after render because showModal() hands focus to the first control it
   finds: run any earlier and the dialog is still empty, so focus lands on the
   dialog itself instead of on Close. */
watch(
  index,
  (now) => {
    const el = dialog.value
    if (!el) return

    if (now === null) {
      if (el.open) el.close()
      return
    }

    if (!el.open) el.showModal()

    strip.value
      ?.querySelector('[aria-current="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'center' })
  },
  { flush: 'post' }
)

function step(by: number) {
  if (index.value === null) return
  const count = props.plates.length
  index.value = (index.value + by + count) % count
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowRight') step(1)
  else if (event.key === 'ArrowLeft') step(-1)
}

/* A drag has to be clearly sideways to turn the page, or scrolling the label
   on a phone would keep flipping plates. */
let startX = 0
let startY = 0

function onTouchStart(event: TouchEvent) {
  const touch = event.changedTouches[0]
  if (!touch) return
  startX = touch.clientX
  startY = touch.clientY
}

function onTouchEnd(event: TouchEvent) {
  const touch = event.changedTouches[0]
  if (!touch) return
  const dx = touch.clientX - startX
  const dy = touch.clientY - startY
  if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1)
}

function host(url: string) {
  return new URL(url).host.replace(/^www\./, '')
}
</script>

<template>
  <dialog
    ref="dialog"
    class="viewer"
    aria-labelledby="viewer-title"
    @close="index = null"
    @keydown="onKeydown"
  >
    <!-- Layout lives on this wrapper, not the dialog: a display value on the
         dialog itself would override the rule that hides it while shut. -->
    <div v-if="plate && index !== null" class="flex h-full flex-col">
      <header class="flex shrink-0 items-center justify-between gap-4 border-b px-5 py-4">
        <p class="micro">
          <span class="text-ink">{{ String(index + 1).padStart(2, '0') }}</span>
          / {{ String(plates.length).padStart(2, '0') }}
        </p>
        <button type="button" class="bracket cursor-pointer" @click="index = null">Close</button>
      </header>

      <!-- Stacked and scrolling on a phone; side by side from lg, where the
           image takes the height and the label reads like a wall text. -->
      <div
        class="min-h-0 flex-1 overflow-y-auto overscroll-contain lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-[minmax(0,1fr)] lg:overflow-visible"
      >
        <div
          class="relative h-[46svh] lg:h-auto"
          @touchstart.passive="onTouchStart"
          @touchend.passive="onTouchEnd"
        >
          <!-- Absolutely placed so its height is definite: the image's
               max-height is a percentage, and against an auto-height parent
               that resolves to nothing and a tall plate runs off the stage.
               The wider side inset at lg is the gutter the arrows stand in;
               a phone has no room for one, so there they ride the edges. -->
          <div
            class="absolute inset-5 flex items-center justify-center lg:inset-x-20 lg:inset-y-10"
            @click.self="index = null"
          >
            <!-- Keyed so each plate fades in fresh. Width and height are set
                 back to auto over the attributes: with either one fixed the
                 browser stops scaling the pair together and the hairline
                 comes away from the picture. -->
            <img
              :key="plate.image"
              :src="plate.image"
              :alt="`Screenshot of ${plate.name}`"
              :width="plate.width"
              :height="plate.height"
              class="shot h-auto max-h-full min-h-0 w-auto min-w-0 max-w-full border"
            />
          </div>

          <template v-if="plates.length > 1">
            <button
              type="button"
              class="turn left-2 lg:left-4"
              aria-label="Previous project"
              @click="step(-1)"
            >
              ←
            </button>
            <button
              type="button"
              class="turn right-2 lg:right-4"
              aria-label="Next project"
              @click="step(1)"
            >
              →
            </button>
          </template>
        </div>

        <aside
          class="flex flex-col border-t p-5 lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-t-0 lg:p-8"
        >
          <p class="micro">Plate {{ plate.no }}</p>

          <h2 id="viewer-title" class="display mt-4 text-h3">{{ plate.name }}</h2>

          <p class="mt-5 text-sm text-gray-700">{{ plate.description }}</p>

          <dl class="mt-8">
            <div class="flex items-baseline justify-between gap-4 border-t py-3.5">
              <dt class="micro">Discipline</dt>
              <dd class="font-mono text-xs text-gray-800">{{ plate.tags.join(' · ') }}</dd>
            </div>
            <div class="flex items-baseline justify-between gap-4 border-t py-3.5">
              <dt class="micro">Status</dt>
              <dd class="font-mono text-xs text-gray-800">
                {{ plate.url ? 'Live' : 'In development' }}
              </dd>
            </div>
            <div class="border-t" />
          </dl>

          <!-- Pushed to the foot of the label at lg so it holds its place as
               descriptions of different lengths come and go. -->
          <div v-if="plate.url" class="mt-8 lg:mt-auto lg:pt-8">
            <a :href="plate.url" target="_blank" rel="noopener" class="bracket-solid">
              {{ host(plate.url) }} ↗
            </a>
          </div>
        </aside>
      </div>

      <ul
        v-if="plates.length > 1"
        ref="strip"
        class="flex shrink-0 gap-2 overflow-x-auto overscroll-contain border-t px-5 py-3"
      >
        <li v-for="(item, i) in plates" :key="item.name" class="shrink-0">
          <button
            type="button"
            class="thumb"
            :aria-label="`View ${item.name}`"
            :aria-current="i === index ? 'true' : undefined"
            @click="index = i"
          >
            <img :src="item.image" alt="" class="h-11 w-[4.4rem] object-cover object-top" />
          </button>
        </li>
      </ul>
    </div>
  </dialog>
</template>

<style scoped>
/* The UA sheet caps a dialog short of the viewport and floats it in the
   middle; the viewer wants the whole frame. */
.viewer {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100dvh;
  max-width: none;
  max-height: none;
  background-color: rgb(var(--bg));
  color: rgb(var(--ink));
}

.viewer::backdrop {
  background-color: rgb(var(--bg));
}

.viewer[open] {
  animation: viewer-in 360ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.shot {
  animation: shot-in 420ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.turn {
  position: absolute;
  top: 50%;
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  transform: translateY(-50%);
  border: 1px solid var(--hairline);
  background-color: rgb(var(--bg) / 0.72);
  backdrop-filter: blur(6px);
  font-family: var(--font-mono);
  font-size: 13px;
  color: rgb(var(--gray-700));
  cursor: pointer;
  transition:
    color 240ms ease,
    border-color 240ms ease;
}

.turn:hover {
  color: rgb(var(--ink));
  border-color: var(--hairline-strong);
}

/* The strip is the wall in miniature: gray and held back until it is the
   plate on the stage. */
.thumb {
  display: block;
  border: 1px solid var(--hairline);
  opacity: 0.4;
  filter: grayscale(1);
  cursor: pointer;
  transition:
    opacity 240ms ease,
    border-color 240ms ease;
}

.thumb:hover {
  opacity: 0.8;
}

.thumb[aria-current='true'] {
  border-color: rgb(var(--ink));
  opacity: 1;
  filter: none;
}

@keyframes viewer-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes shot-in {
  from {
    opacity: 0;
    transform: scale(0.985);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>
