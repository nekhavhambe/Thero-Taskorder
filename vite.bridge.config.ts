import { defineConfig } from 'vite'

// Standalone iframe-bridge bundle: `npm run build:bridge` emits
// dist/bridge/thero-bridge.es.js (ESM) + thero-bridge.umd.js (plain <script>).
// Dependency-free by design — src/bridge/* imports only the Intacct service
// layer, never React — so any parent page can load it independently:
//
//   ESM:  import { createBridgeHost, createDefaultActions } from './bridge/thero-bridge.es.js';
//   UMD:  <script src="./bridge/thero-bridge.umd.js"></script> <!-- window.TheroBridge -->
//
// outDir is scoped to dist/bridge so this build never wipes the app bundle;
// run it AFTER the app build (which clears dist/).
export default defineConfig({
  // Don't re-copy public/ here — the app build already places public files
  // (e.g. bridge-host.html) at dist root; this build only adds dist/bridge/.
  publicDir: false,
  build: {
    outDir: 'dist/bridge',
    emptyOutDir: true,
    lib: {
      entry: 'src/bridge/index.ts',
      name: 'TheroBridge',
      formats: ['es', 'umd'],
      fileName: (format) => `thero-bridge.${format}.js`,
    },
    rollupOptions: {
      // Bundle everything in — the file must work with zero npm deps.
      external: [],
    },
  },
})
