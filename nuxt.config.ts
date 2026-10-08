// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/fonts'],
  css: ['~/assets/css/main.css'],
  // Tailwind v4 ships as a Vite plugin; there is no Nuxt module for it.
  vite: { plugins: [tailwindcss()] },
  app: {
    head: {
      // The design is dark-only, so the ground is declared up front rather
      // than resolved by a bootstrap script.
      htmlAttrs: { lang: 'en', class: 'dark' },
      title: 'Christian Colewan — Developer',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'Christian Colewan — a Baguio-based developer building systems, desktop apps, web systems, mobile apps, and business sites.'
        },
        { name: 'color-scheme', content: 'dark' },
        { name: 'theme-color', content: '#0a0a0a' }
      ]
    }
  },
  fonts: {
    families: [
      // Display: condensed grotesque for the oversized uppercase headlines.
      { name: 'Barlow Condensed', provider: 'google', weights: [500, 600, 700] },
      { name: 'Geist', provider: 'google', weights: [400, 500] },
      { name: 'Geist Mono', provider: 'google', weights: [400, 500] }
    ]
  }
})
