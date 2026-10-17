<script setup lang="ts">
import { contactEmail } from '~/data/nav'
import { plans, custom, running, process, terms } from '~/data/pricing'

const pageTitle = 'Pricing — Christian Colewan'

function packagePrice(id: string) {
  const item = [...plans, ...custom].find((entry) => entry.id === id)
  if (!item) throw new Error(`Missing pricing package: ${id}`)
  return item.price
}

const pageDescription =
  `Website packages from ${packagePrice('starter')}, ` +
  `e-commerce from ${packagePrice('ecommerce')}, and ` +
  `custom web systems from ${packagePrice('systems')} — ` +
  'with scope, limits and running costs stated up front.'

/* Each package links to a pre-addressed mail, so the first message already
   says which tier the enquiry is about. */
function enquiry(name: string) {
  return `mailto:${contactEmail}?subject=${encodeURIComponent(`${name} package enquiry`)}`
}

useHead({
  title: pageTitle,
  meta: [
    { name: 'description', content: pageDescription },
    { property: 'og:title', content: pageTitle },
    { property: 'og:description', content: pageDescription },
    { name: 'twitter:title', content: pageTitle },
    { name: 'twitter:description', content: pageDescription }
  ]
})
</script>

<template>
  <div>
    <!-- Clears the fixed two-row nav bar; the index gets this from the hero. -->
    <header class="mx-auto max-w-page px-5 pt-36 sm:pt-40">
      <p class="micro reveal">Services · Pricing</p>

      <h1 class="display reveal reveal-1 mt-8 text-h1 max-w-[13ch]">
        Clear prices.
        <span class="display-dim">No surprises.</span>
      </h1>

      <div class="mt-12 grid gap-10 lg:grid-cols-[1fr_20rem] lg:gap-16">
        <p class="reveal reveal-2 max-w-measure text-lg text-gray-700">
          Three fixed-price website packages, and two builds that are quoted after a conversation
          because their scope is discovered rather than assumed. Every package states what it
          includes and — just as plainly — what it doesn't.
        </p>

        <dl class="reveal reveal-3 self-start">
          <div class="flex items-baseline justify-between gap-4 border-t py-3.5">
            <dt class="micro">Currency</dt>
            <dd class="font-mono text-xs text-gray-800">PHP</dd>
          </div>
          <div class="flex items-baseline justify-between gap-4 border-t py-3.5">
            <dt class="micro">Terms</dt>
            <dd class="font-mono text-xs text-gray-800">50% / 50%</dd>
          </div>
          <div class="flex items-baseline justify-between gap-4 border-t py-3.5">
            <dt class="micro">Quote valid</dt>
            <dd class="font-mono text-xs text-gray-800">30 days</dd>
          </div>
          <div class="border-t" />
        </dl>
      </div>
    </header>

    <!-- The three advertised packages ------------------------------------- -->
    <section class="mx-auto max-w-page px-5 pt-section">
      <div class="rise flex items-baseline justify-between gap-6 border-b pb-4">
        <h2 class="display text-h3">Website packages</h2>
        <p data-pricing-range-for="fixed" class="micro hidden sm:block">01 — 03</p>
      </div>

      <ul class="rise grid grid-cols-1 md:grid-cols-3">
        <li
          v-for="plan in plans"
          :key="plan.id"
          :data-pricing-id="plan.id"
          :data-pricing-index="plan.index"
          :data-pricing-name="plan.name"
          :data-pricing-price="plan.price"
          :data-pricing-from="String(plan.from === true)"
          data-pricing-view="detail"
          class="flex flex-col border-b px-1 py-8 md:border-l md:px-6 md:first:border-l-0 md:first:pl-1 md:last:pr-1"
        >
          <span class="micro">{{ plan.index }}</span>

          <p
            :data-pricing-label-for="plan.id"
            class="font-display mt-5 text-h2 uppercase leading-none tracking-tight text-ink"
          >
            {{ plan.price }}
          </p>

          <h3
            class="font-display mt-3 text-h3 uppercase leading-none tracking-tight text-gray-800"
          >
            {{ plan.name }}
          </h3>

          <p class="mt-5 text-sm text-gray-600">{{ plan.tagline }}</p>

          <dl class="mt-7 space-y-2.5">
            <div class="flex items-baseline justify-between gap-4">
              <dt class="micro">Best for</dt>
              <dd class="font-mono text-2xs text-gray-800">{{ plan.bestFor }}</dd>
            </div>
            <div class="flex items-baseline justify-between gap-4">
              <dt class="micro">Timeline</dt>
              <dd class="font-mono text-2xs text-gray-800">{{ plan.timeline }}</dd>
            </div>
          </dl>

          <p class="micro mt-8 mb-3.5 text-gray-500">Includes</p>
          <ul class="space-y-2.5">
            <li
              v-for="line in plan.includes"
              :key="line"
              class="grid grid-cols-[0.9rem_1fr] text-sm text-gray-700"
            >
              <span aria-hidden="true" class="font-mono text-2xs text-gray-500">+</span>
              <span>{{ line }}</span>
            </li>
          </ul>

          <!-- The limits are set at the same size as the inclusions on
               purpose. They are the part of the quote that gets argued about
               later, so they are not allowed to read as small print. -->
          <p class="micro mt-8 mb-3.5 text-gray-500">Not included</p>
          <ul class="space-y-2.5">
            <li
              v-for="line in plan.limits"
              :key="line"
              class="grid grid-cols-[0.9rem_1fr] text-sm text-gray-500"
            >
              <span aria-hidden="true" class="font-mono text-2xs">—</span>
              <span>{{ line }}</span>
            </li>
          </ul>

          <div class="mt-auto pt-9">
            <a
              :href="enquiry(plan.name)"
              :aria-label="`Enquire about the ${plan.name} package`"
              :data-enquiry-name="plan.name"
              class="bracket"
            >
              Enquire
            </a>
          </div>
        </li>
      </ul>
    </section>

    <!-- Quoted, not packaged ------------------------------------------------ -->
    <section class="mx-auto max-w-page px-5 pt-section">
      <div class="rise flex items-baseline justify-between gap-6 border-b pb-4">
        <h2 class="display text-h3">Beyond a website</h2>
        <p data-pricing-range-for="from" class="micro hidden sm:block">04 — 05</p>
      </div>

      <p class="rise micro mt-6 max-w-[62ch] leading-[1.9] text-gray-600">
        These carry a starting figure rather than a fixed price. The build is scoped first, then
        quoted in writing — so the number you get is the number you pay.
      </p>

      <div class="rise mt-12 grid gap-12 lg:grid-cols-2 lg:gap-16">
        <article
          v-for="item in custom"
          :key="item.id"
          :data-pricing-id="item.id"
          :data-pricing-index="item.index"
          :data-pricing-name="item.name"
          :data-pricing-price="item.price"
          :data-pricing-from="String(item.from === true)"
          data-pricing-view="detail"
          class="border-t pt-8"
        >
          <span class="micro">{{ item.index }}</span>

          <div
            :data-pricing-label-for="item.id"
            class="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-1"
          >
            <span class="micro text-gray-500">from</span>
            <p class="font-display text-h2 uppercase leading-none tracking-tight text-ink">
              {{ item.price }}
            </p>
          </div>

          <h3 class="font-display mt-3 text-h3 uppercase leading-none tracking-tight text-gray-800">
            {{ item.name }}
          </h3>

          <p class="mt-5 max-w-measure text-sm text-gray-600">{{ item.tagline }}</p>

          <dl class="mt-7 space-y-2.5">
            <div class="flex items-baseline justify-between gap-4 sm:max-w-[26rem]">
              <dt class="micro">Best for</dt>
              <dd class="font-mono text-2xs text-gray-800">{{ item.bestFor }}</dd>
            </div>
            <div class="flex items-baseline justify-between gap-4 sm:max-w-[26rem]">
              <dt class="micro">Timeline</dt>
              <dd class="font-mono text-2xs text-gray-800">{{ item.timeline }}</dd>
            </div>
          </dl>

          <p class="micro mt-8 mb-3.5 text-gray-500">Includes</p>
          <ul class="grid gap-2.5 sm:grid-cols-2">
            <li
              v-for="line in item.includes"
              :key="line"
              class="grid grid-cols-[0.9rem_1fr] text-sm text-gray-700"
            >
              <span aria-hidden="true" class="font-mono text-2xs text-gray-500">+</span>
              <span>{{ line }}</span>
            </li>
          </ul>

          <p class="micro mt-8 mb-3.5 text-gray-500">How it's quoted</p>
          <ul class="space-y-2.5">
            <li
              v-for="line in item.limits"
              :key="line"
              class="grid grid-cols-[0.9rem_1fr] text-sm text-gray-500"
            >
              <span aria-hidden="true" class="font-mono text-2xs">—</span>
              <span>{{ line }}</span>
            </li>
          </ul>

          <div class="pt-9">
            <a
              :href="enquiry(item.name)"
              :aria-label="`Enquire about the ${item.name} package`"
              :data-enquiry-name="item.name"
              class="bracket"
            >
              Request a quote
            </a>
          </div>
        </article>
      </div>
    </section>

    <!-- The renewals -------------------------------------------------------- -->
    <section class="mx-auto max-w-page px-5 pt-section">
      <div class="grid gap-10 lg:grid-cols-[18rem_1fr] lg:gap-16">
        <div class="rise lg:sticky lg:top-28 lg:self-start">
          <h2 class="display text-h3">
            Quoted<br />
            <span class="display-dim">separately.</span>
          </h2>
          <p class="micro mt-6 max-w-[30ch] leading-[1.9] text-gray-600">
            None of this is buried in the build fee. You pay providers directly where you can, and
            you keep every account in your own name.
          </p>
        </div>

        <div class="rise">
          <div
            class="micro grid grid-cols-[1fr_auto] items-center gap-4 pb-2 sm:grid-cols-[1fr_16rem_11rem]"
          >
            <span>Item</span>
            <span class="hidden sm:block">Note</span>
            <span class="text-right">Typical cost</span>
          </div>

          <div
            v-for="cost in running"
            :key="cost.item"
            class="row grid-cols-[1fr_auto] sm:grid-cols-[1fr_16rem_11rem]"
          >
            <span class="font-display text-lg uppercase leading-tight tracking-tight text-gray-800">
              {{ cost.item }}
            </span>
            <span class="micro hidden normal-case sm:block">{{ cost.note }}</span>
            <span class="font-mono text-xs text-right text-gray-800">{{ cost.price }}</span>
            <!-- Below sm the note has no column of its own, so it wraps under
                 the row rather than being dropped. -->
            <span class="micro col-span-2 normal-case sm:hidden">{{ cost.note }}</span>
          </div>
          <div class="border-t" />
        </div>
      </div>
    </section>

    <!-- Process ------------------------------------------------------------- -->
    <section class="mx-auto max-w-page px-5 pt-section">
      <div class="rise flex items-baseline justify-between gap-6 border-b pb-4">
        <h2 class="display text-h3">How it works</h2>
        <p class="micro hidden sm:block">01 — 05</p>
      </div>

      <ol class="rise -mt-px grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        <li v-for="step in process" :key="step.index" class="border-t px-1 py-7 lg:px-4 lg:first:pl-1">
          <span class="micro">{{ step.index }}</span>
          <h3 class="font-display mt-3 text-h3 uppercase leading-none tracking-tight text-ink">
            {{ step.name }}
          </h3>
          <p class="mt-3.5 text-sm text-gray-600">{{ step.body }}</p>
        </li>
      </ol>
      <div class="border-t" />
    </section>

    <!-- Terms --------------------------------------------------------------- -->
    <section class="mx-auto max-w-page px-5 pt-section">
      <div class="grid gap-10 lg:grid-cols-[18rem_1fr] lg:gap-16">
        <h2 class="display rise text-h3">
          The<br />
          <span class="display-dim">fine print.</span>
        </h2>

        <ul class="rise max-w-[62ch] space-y-4">
          <li
            v-for="(term, i) in terms"
            :key="term"
            class="grid grid-cols-[2.5rem_1fr] items-baseline gap-4 border-t py-4"
          >
            <span class="micro">{{ String(i + 1).padStart(2, '0') }}</span>
            <span class="text-sm text-gray-700">{{ term }}</span>
          </li>
          <li class="border-t" />
        </ul>
      </div>
    </section>

    <div class="pt-section">
      <ContactOutro />
    </div>
  </div>
</template>
