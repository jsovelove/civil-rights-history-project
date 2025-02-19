// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'


export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './', // Change this from '/Civil-Rights-History-LLM/'
  server: {
    port: 3000,
    open: true, // This will open the browser automatically
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
})