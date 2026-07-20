import { defineConfig } from 'vite'

export default defineConfig({
  base: '/cotizador/',
  server: {
    port: 5174,
    open: true,
  },
  preview: {
    port: 5174,
  },
})
