import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { installBridgeChild } from './bridge/child'

// Embedded in an iframe without its own Intacct session? Route all Intacct
// calls through the parent page over the bridge (postMessage). Standalone
// pages are untouched — installBridgeChild() is a no-op for them.
installBridgeChild()

// HashRouter: works from file:// and when embedded via copy-paste single HTML
// (no server rewrites needed, unlike BrowserRouter).
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
