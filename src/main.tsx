// ==============================================================
// src/main.tsx — Application Entry Point
// ==============================================================
//
// WHAT THIS FILE DOES:
// This is the very FIRST file that runs when Philly Safe Eats starts.
// It has exactly two jobs:
//
//   1. SET UP React Query by wrapping the app in a QueryClientProvider.
//      React Query manages all our data fetching (the Carto API call)
//      and caching so we don't hit the server more than necessary.
//
//   2. MOUNT the React app into the browser by calling
//      ReactDOM.createRoot().render(), which attaches our entire
//      component tree to the <div id="root"> in index.html.
//
// !! IMPORTANT: React.StrictMode is INTENTIONALLY DISABLED !!
//
// Normally, you'd wrap your app in <React.StrictMode> — it's a
// best practice that helps catch bugs by running every useEffect
// TWICE during development.
//
// BUT CesiumJS creates a WebGL rendering context inside its Viewer
// constructor. If StrictMode double-invokes the effect that creates
// the Viewer, you get:
//   - Two WebGL contexts fighting over the same <canvas> element
//   - Cryptic "Cannot read properties of undefined" errors
//   - A blank or broken 3D scene
//
// This is a KNOWN limitation of CesiumJS with React 18+.
// StrictMode's double-invocation only happens in development —
// production builds are unaffected.
//
// The spec explicitly requires: "React.StrictMode must be completely
// omitted from main.tsx."
// ==============================================================

import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css' // Global styles — imported here so they apply everywhere

// ==============================================================
// React Query Configuration
// ==============================================================
//
// QueryClient is the central "brain" for all data fetching.
// It stores (caches) the API response so that if multiple
// components ask for the same data, only ONE network request
// is made. The rest get the cached result instantly.
//
// We configure default behavior that ALL queries inherit:
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // If a query fails (network error, API down), retry up to
      // 2 times before showing an error. That's 3 total attempts.
      retry: 2,

      // Don't refetch in the background when the user switches
      // browser tabs and comes back. We only want fresh data on
      // app boot or explicit user actions, not on every tab switch.
      refetchOnWindowFocus: false,
    },
  },
})

// ==============================================================
// Mount the App into the DOM
// ==============================================================
//
// ReactDOM.createRoot() initializes React's rendering engine.
// It targets the <div id="root"> element in index.html.
//
// The `!` after getElementById is a TypeScript "non-null assertion" —
// it tells TypeScript: "I guarantee this element exists." If it
// didn't exist, the app would crash immediately with an obvious
// error, so this is a safe assertion.
ReactDOM.createRoot(document.getElementById('root')!).render(
  // !! NO <React.StrictMode> wrapper here — see explanation above !!
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>,
)
