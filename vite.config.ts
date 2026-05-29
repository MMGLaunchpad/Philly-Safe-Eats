// ============================================================
// vite.config.ts — Vite Build Tool Configuration
// ============================================================
//
// WHAT IS VITE?
// Vite is the build tool / dev server for this project. When you
// run `npm run dev`, Vite starts a lightning-fast development
// server that serves your React + TypeScript code to the browser.
//
// WHY DO WE NEED A CONFIG FILE?
// CesiumJS is unusual — it ships its own static assets (Web Workers,
// image sprites, terrain encoders, etc.) that must be copied into
// the build output. Without the `vite-plugin-cesium` plugin, these
// assets would 404 and the 3D globe would silently fail to render.
//
// The plugin automates two things:
//   1. Copies Cesium's static assets (Workers/, Assets/, Widgets/)
//      into the output directory during build.
//   2. Sets the global `CESIUM_BASE_URL` variable that Cesium's
//      internal code uses to locate those assets at runtime.
// ============================================================

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import cesium from 'vite-plugin-cesium'

export default defineConfig({
  plugins: [
    // Standard React plugin — enables fast-refresh (hot module replacement)
    // so changes to React components update in the browser instantly
    // without losing component state.
    react(),

    // Cesium plugin — handles the complex asset pipeline automatically.
    // Without this, you'd need manual copy scripts and base URL config.
    cesium(),
  ],

  server: {
    // Use a unique port so Philly Safe Eats doesn't collide with
    // other Vite projects running on the default port (5173).
    port: 5188,
    // Don't automatically open the browser on startup
    open: false,
  },
})
