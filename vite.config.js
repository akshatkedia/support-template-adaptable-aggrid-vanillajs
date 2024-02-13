import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  publicDir: 'public',
  root: './',
  build: {
    outDir: 'dist',
  },
});
