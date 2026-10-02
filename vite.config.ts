import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import mkcert from 'vite-plugin-mkcert'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vite.dev/config/
// Configured to produce ONE self-contained .html file for copy-paste embedding.
export default defineConfig({
  // Relative paths so the build works from GitHub Pages (project subpath)
  // and when the single file is embedded on other websites.
  base: './',
  plugins: [react(), tailwindcss(), mkcert({ hosts: ['localhost', 'thero.co.za'] }), viteSingleFile()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    // HTTPS is provided by vite-plugin-mkcert (Vite 8 no longer accepts `https: true`).
  },
})
