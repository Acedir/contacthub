import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Relative asset paths keep the same build working on localhost, Docker and
  // GitHub Pages project sites (https://<user>.github.io/contacthub/).
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
  build: {
    // ExcelJS is intentionally isolated into a lazy chunk (~930 KB raw,
    // ~256 KB gzip) and only downloaded when an Excel action is used.
    chunkSizeWarningLimit: 1000,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    reporters: 'default',
  },
})
