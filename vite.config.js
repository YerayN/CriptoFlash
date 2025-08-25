import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages base path
export default defineConfig({
  plugins: [react()],
  base: "/CriptoFlash/",
})
