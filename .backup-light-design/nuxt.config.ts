// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

// Runs before first paint so the theme never flashes.
const themeBootstrap = `(function(){try{var t=localStorage.getItem('theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var e=document.documentElement;e.classList.toggle('dark',d);e.style.colorScheme=d?'dark':'light'}catch(e){}})()`

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/fonts'],
  css: ['~/assets/css/main.css'],
  // Tailwind v4 ships as a Vite plugin; there is no Nuxt module for it.
  vite: { plugins: [tailwindcss()] },
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Christian Colewan — Developer',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'Christian Colewan — a Baguio-based developer building systems, desktop apps, web systems, mobile apps, and business sites.'
        },
        { name: 'color-scheme', content: 'light dark' },
        { name: 'theme-color', content: '#ffffff', media: '(prefers-color-scheme: light)' },
        { name: 'theme-color', content: '#0c0c0f', media: '(prefers-color-scheme: dark)' }
      ],
      script: [{ innerHTML: themeBootstrap, tagPosition: 'head' }]
    }
  },
  fonts: {
    families: [
      { name: 'Geist', provider: 'google', weights: [400, 500, 600] },
      { name: 'Geist Mono', provider: 'google', weights: [400, 500] },
      { name: 'Source Serif 4', provider: 'google', weights: [400, 600] }
    ]
  }
})
