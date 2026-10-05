import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import { installBridgeChild } from "./bridge/child";


installBridgeChild();


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <Suspense
        fallback={
          <div className="min-h-screen bg-slate-50 p-8">Loading...</div>
        }
      >
        <App />
      </Suspense>
    </HashRouter>
  </StrictMode>,
);
