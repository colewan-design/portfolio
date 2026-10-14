// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

const siteUrl = 'https://christiancolewan.tech'
const siteTitle = 'Christian Colewan — Developer'
const siteDescription =
  'Christian Colewan — a Baguio-based developer building systems, desktop apps, web systems, mobile apps, and business sites.'
const shareImage = `${siteUrl}/images/logo.png`

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
      title: siteTitle,
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: siteDescription
        },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'Christian Colewan Portfolio' },
        { property: 'og:title', content: siteTitle },
        { property: 'og:description', content: siteDescription },
        { property: 'og:image', content: shareImage },
        { property: 'og:image:type', content: 'image/png' },
        { property: 'og:image:width', content: '1254' },
        { property: 'og:image:height', content: '1254' },
        { property: 'og:image:alt', content: 'Christian Colewan portfolio logo' },
        { name: 'twitter:card', content: 'summary' },
        { name: 'twitter:title', content: siteTitle },
        { name: 'twitter:description', content: siteDescription },
        { name: 'twitter:image', content: shareImage },
        { name: 'twitter:image:alt', content: 'Christian Colewan portfolio logo' },
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
