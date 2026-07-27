import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  server: {
    port: 5174,
    open: true,
  },
  preview: {
    port: 5174,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@supabase')) {
            return 'supabase';
          }
        },
      },
    },
  },
});
