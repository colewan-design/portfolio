<script setup lang="ts">
import { plans, custom } from '~/data/pricing'

/* The landing page shows the three fixed-price website packages and nothing
   else: a headline figure, who it's for, and one line of scope. The limits,
   the running costs and the terms live on /pricing, which is the page that
   has room to be precise about them. */
</script>

<template>
  <section id="pricing" class="mx-auto max-w-page px-5">
    <div class="grid gap-10 lg:grid-cols-[18rem_1fr] lg:gap-16">
      <div class="rise lg:sticky lg:top-28 lg:self-start">
        <h2 class="display text-h3">
          What it<br />
          <span class="display-dim">costs.</span>
        </h2>
        <p class="micro mt-6 max-w-[28ch] leading-[1.9] text-gray-600">
          Fixed prices for fixed scope. Domain, hosting and maintenance are quoted separately.
        </p>
      </div>

      <div class="rise">
        <!-- Hairline top only, so consecutive cards read as one table. -->
        <ul class="-mt-px grid grid-cols-1 md:grid-cols-3">
          <li
            v-for="plan in plans"
            :key="plan.id"
            :data-pricing-id="plan.id"
            :data-pricing-index="plan.index"
            :data-pricing-name="plan.name"
            :data-pricing-price="plan.price"
            :data-pricing-from="String(plan.from === true)"
            data-pricing-view="summary"
            class="group flex flex-col border-t px-1 py-7 transition-colors duration-300 hover:bg-gray-100 md:px-5"
          >
            <span class="micro">{{ plan.index }}</span>

            <p
              :data-pricing-label-for="plan.id"
              class="font-display mt-4 text-h2 uppercase leading-none tracking-tight text-ink"
            >
              {{ plan.price }}
            </p>

            <h3
              class="font-display mt-3 text-lg uppercase leading-none tracking-tight text-gray-800 transition-colors duration-200 group-hover:text-ink"
            >
              {{ plan.name }}
            </h3>

            <p class="mt-4 text-sm text-gray-600">{{ plan.tagline }}</p>

            <p class="micro mt-auto pt-6">{{ plan.bestFor }}</p>
          </li>
        </ul>
        <div class="border-t" />

        <!-- E-commerce and custom systems are deliberately not packaged with
             the three above: their scope is discovered, so they carry a floor
             price and a conversation rather than a fixed fee. -->
        <ul class="mt-10">
          <li
            v-for="item in custom"
            :key="item.id"
            :data-pricing-id="item.id"
            :data-pricing-index="item.index"
            :data-pricing-name="item.name"
            :data-pricing-price="item.price"
            :data-pricing-from="String(item.from === true)"
            data-pricing-view="summary"
            class="row grid-cols-[1fr_auto] gap-x-6 py-5"
          >
            <div>
              <h3
                class="font-display text-lg uppercase leading-tight tracking-tight text-gray-800"
              >
                {{ item.name }}
              </h3>
              <p class="micro mt-2">{{ item.bestFor }}</p>
            </div>
            <p :data-pricing-label-for="item.id" class="font-mono text-xs text-gray-800">
              <span class="text-gray-500">from</span> {{ item.price }}
            </p>
          </li>
          <li class="border-t" />
        </ul>

        <div class="mt-10">
          <NuxtLink to="/pricing" class="bracket-solid">See full pricing</NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>
