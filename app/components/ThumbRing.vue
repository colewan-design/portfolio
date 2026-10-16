<script setup lang="ts">
import { projects } from '~/data/projects'

/* A true 3D cylinder: each card is rotated to its own slice and pushed out by
   the radius, so it sits tangent to the ring rather than facing the camera.
   That tangency is the whole look — cards rake away at the edges and swing
   flat as they pass the front, which is what reads as a ribbon instead of a
   handful of floating rectangles.

   The band is centred on the chest, not the head. Centred higher, the near
   arc of any cylinder crosses the face, because the nearest point of a ring
   projects to its centre. */

/* Nothing in CSS can carry one element through the portrait's stacking layer
   part-way round a lap, so the ring is drawn twice: this component renders one
   half of it. `far` goes behind the figure, `near` in front, and each hides
   itself for the half of the lap it does not own. The handover happens at the
   two moments the card is exactly edge-on to the camera, so the swap has
   nothing visible to pop.

   Because the far copy is occluded by the figure, the radius has to exceed the
   silhouette's half-width by a good margin — at a radius near the shoulder line
   only a thin sliver of the back half would ever clear the body. */
const props = withDefaults(defineProps<{ half?: 'near' | 'far' }>(), { half: 'far' })

const SPIN_SECONDS = 40

/* The band only reads as a ribbon if the cards nearly touch; one card per
   project leaves gaps wider than the cards themselves, which reads as a few
   rectangles drifting about instead. The deck is laid twice round the ring. */
const SLOTS = projects.length * 2

/* The two passes interleave rather than run one after the other: even slots
   carry the deck in order, odd slots carry it again rotated half a turn, so a
   thumbnail's twin sits across the ring where it is small, dim, and behind the
   figure. Interleaving is also what lets phones drop every odd slot — see the
   stylesheet — and keep a complete deck at even spacing. Laying the passes end
   to end would leave them with one project per slot over half the ring. */
function slotProject(i: number) {
  const seq = Math.floor(i / 2)
  const opposite = (seq + Math.floor(projects.length / 2)) % projects.length
  return projects[i % 2 === 0 ? seq : opposite]!
}

const cards = computed(() =>
  Array.from({ length: SLOTS }, (_, i) => {
    const project = slotProject(i)
    return {
      key: `${project.name}-${i}`,
      image: project.image,
      width: project.imageWidth,
      height: project.imageHeight,
      /* Even spacing comes from offsetting each card into a single shared
         animation rather than giving each its own start angle. */
      delay: -(SPIN_SECONDS / SLOTS) * i
    }
  })
)
</script>

<template>
  <div
    aria-hidden="true"
    class="ring-stage pointer-events-none select-none"
    :class="props.half === 'near' ? 'ring-stage--near' : 'ring-stage--far'"
  >
    <div class="ring-tilt">
      <figure
        v-for="card in cards"
        :key="card.key"
        class="ring-card"
        :style="{
          animationDuration: `${SPIN_SECONDS}s`,
          animationDelay: `${card.delay}s`
        }"
      >
        <!-- Two faces. Cards face outward, so for half the lap the viewer sees
             the reverse — which without a back face renders as a mirrored
             screenshot. The back copy is pre-flipped so it reads correctly
             whichever side is turned toward the camera. -->
        <img
          class="face"
          :src="card.image"
          :width="card.width"
          :height="card.height"
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
        />
        <img
          class="face face-back"
          :src="card.image"
          :width="card.width"
          :height="card.height"
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
        />
      </figure>
    </div>
  </div>
</template>

<style scoped>
.ring-stage {
  /* Radius and card width are one setting, not two: the ribbon holds together
     only while the arc each card occupies stays close to the card's own width.
     At 20 cards that means a pitch of 2πr / 20, so the width tracks the radius
     up through the breakpoints rather than being chosen for legibility. */
  --ring-radius: 170px;
  --card-w: 76px;

  position: absolute;
  inset: 0;
  /* Deliberately shallow. At 900px the front of the ring magnifies ~1.7x and
     the near cards swell over the face; 1500 keeps the depth cue while
     holding the band to a roughly even weight all the way round. */
  perspective: 1500px;
  perspective-origin: 50% 50%;
}

/* A phone gets one pass of the deck, not two. The radius shrinks faster than
   the card does at this size, so the full set laps over itself into a smear
   where no single thumbnail is legible; dropping every odd slot leaves the
   whole deck, still evenly spaced, with room to read each card. */
@media (max-width: 639px) {
  .ring-card:nth-child(even) {
    display: none;
  }
}

@media (min-width: 640px) {
  .ring-stage {
    --ring-radius: 280px;
    --card-w: 88px;
  }
}

@media (min-width: 1024px) {
  .ring-stage {
    --ring-radius: 390px;
    --card-w: 106px;
  }
}

@media (min-width: 1440px) {
  .ring-stage {
    --ring-radius: 430px;
    --card-w: 116px;
  }
}

/* Rolled off true and tipped slightly toward the viewer, so the band runs
   high-left to low-right instead of straight across. */
.ring-tilt {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  /* Pitch decides how tall the ellipse stands, and the band has to stay on the
     torso: shoulder at the top of the lap, waist at the bottom. Vertical travel
     runs with sin(pitch) while width stays at the radius, so 20deg spans about
     300px against an 860px width — a belt round the body rather than a hoop
     that clears the head. Opening it further is what pushed the ring up past
     the ears; flattening it much below this and the cards stop travelling and
     merely slide in and out at the sides.
     The sign matters as much as the size. Tipped this way the ring is seen from
     slightly above, which puts the near half low and the far half high: cards
     sweep across the chest in front, climb out at the shoulders, and pass
     behind the back. Tipped the other way the near half is the top of the
     ellipse and the front cards cross the face. The roll sets the diagonal. */
  transform: rotateZ(-14deg) rotateX(-20deg);
}

.ring-card {
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--card-w);
  aspect-ratio: 16 / 10;
  margin-top: calc(var(--card-w) / -3.2);
  margin-left: calc(var(--card-w) / -2);
  transform-style: preserve-3d;

  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

/* The third animation is the only difference between the two copies: it blanks
   each card for the half of the lap the other layer is drawing. Visibility,
   not opacity — ring-depth already owns opacity, and a second animation on the
   same property would simply replace it. */
.ring-stage--far .ring-card {
  animation-name: ring-orbit, ring-depth, ring-half-far;
}

.ring-stage--near .ring-card {
  animation-name: ring-orbit, ring-depth, ring-half-near;
}

.face {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  backface-visibility: hidden;
  border: 1px solid rgb(250 250 249 / 0.22);
  background-color: rgb(var(--gray-100));
  box-shadow: 0 20px 44px -26px rgb(0 0 0 / 0.95);
  filter: grayscale(1) contrast(1.08);
}

.face-back {
  transform: rotateY(180deg);
}

@media (prefers-reduced-motion: reduce) {
  .ring-stage {
    display: none;
  }
}
</style>
