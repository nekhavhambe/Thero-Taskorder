// Inlines dist/bridge/thero-bridge.umd.js into the copy-paste parent snippet,
// so the host page needs no external bridge file. Run via `npm run build:snippet`
// (chained after build:bridge in `npm run build`).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const bundle = readFileSync('dist/bridge/thero-bridge.umd.js', 'utf8').trim();
if (bundle.toLowerCase().includes('</script')) {
  throw new Error('Bundle contains a closing </script> tag and cannot be inlined safely.');
}

const snippet = `<!-- Copy everything below into your parent/host HTML page. -->
<!-- Bridge bundle is inlined (regenerate with npm run build:snippet) — no external files needed. -->
<!-- 1. The app iframe (id must match initParentBridge, default 'intacct'). -->
<iframe id="intacct" src="https://YOUR-APP-URL/" style="width:100%;height:800px;border:0"></iframe>

<!-- 2. Bridge bundle + init (after the iframe element). -->
<script>${bundle}</script>
<script>
  // The parent owns the Intacct session; the iframed app has none.
  window._sess = 'PASTE_INTACCT_SESSION_ID_HERE';
  TheroBridge.initParentBridge(); // looks up <iframe id="intacct">
</script>
`;

writeFileSync('public/bridge-parent-snippet.html', snippet);
// The app build already copied public/ to dist/ — refresh that copy too.
if (existsSync('dist')) {
  writeFileSync('dist/bridge-parent-snippet.html', snippet);
}
console.log(`bridge-parent-snippet.html regenerated (${snippet.length} bytes, bundle ${bundle.length} bytes).`);
