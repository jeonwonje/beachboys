import { defineConfig } from 'vite';

// Relative base, so the site works at any GitHub Pages path and on localhost.
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
    rollupOptions: { input: { main: 'index.html', game: 'game.html' } },
  },
  server: { host: '127.0.0.1', port: 5173 },
});
