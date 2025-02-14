import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',  // Ensure relative paths in production build
  build: {
    outDir: 'dist',  // Ensures build output goes to `dist/`
    emptyOutDir: true, // Clears old build files
  }
});