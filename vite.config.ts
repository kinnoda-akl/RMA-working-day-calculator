import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'  // Add this import

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: true,                // Automatically opens the bundle analyzer after build
      filename: 'dist/stats.html', // Where the report will be saved
      gzipSize: true,            // Shows gzipped sizes in report
      brotliSize: true,          // Shows brotli sizes in report
      template: 'treemap'        // Uses a treemap visualization (easier to understand)
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')  // Your existing path alias remains unchanged
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // This helps separate vendor code from your application code
          vendor: ['react', 'react-dom'],
          // You can add more chunks as needed
        }
      }
    }
  }
})