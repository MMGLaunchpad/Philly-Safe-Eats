import { useRef, useState, useCallback } from 'react'
import { Viewer } from 'cesium'

// Core Styles
import './App.css'

// Store and Hooks
import { useRestaurants } from './hooks/useRestaurants'

// Components
import GlobeView from './components/globe/GlobeView'
import CameraController from './components/globe/CameraController'
import RestaurantLayer from './components/globe/RestaurantLayer'
import SearchBar from './components/ui/SearchBar'
import PanicSwitch from './components/ui/PanicSwitch'
import Scorecard from './components/ui/Scorecard'

export default function App() {
  // We use a ref to hold the Viewer instance because putting it in 
  // React state (useState) would cause re-renders that destroy 
  // and recreate the WebGL context, causing flashes and crashes.
  const viewerRef = useRef<Viewer | null>(null)

  // A boolean state that flips to `true` once GlobeView has
  // finished creating the Cesium Viewer. Child components
  // (RestaurantLayer, CameraController) are only rendered AFTER
  // this becomes true, guaranteeing that viewerRef.current is
  // a valid Viewer when their useEffects run for the first time.
  //
  // This eliminates the race condition where child components
  // tried to read viewerRef.current before GlobeView had assigned it.
  const [viewerReady, setViewerReady] = useState(false)

  // Stable callback reference — won't cause GlobeView to re-render
  const handleViewerReady = useCallback(() => {
    setViewerReady(true)
  }, [])

  // Fetch data using the Carto SQL React Query hook
  const { isLoading, isError } = useRestaurants()

  return (
    <main className="app-shell">
      {/* 
        The div that Cesium injects its WebGL canvas into.
        This serves as the "background" layer of the entire app. 
      */}
      <div id="cesiumContainer" />

      {/* 
        Renders nothing visible — purely manages the Cesium Viewer 
        lifecycle, loading Google 3D Tiles, and assigning the viewerRef.
        Calls onReady once the viewer is constructed.
      */}
      <GlobeView viewerRef={viewerRef} onReady={handleViewerReady} />

      {/* 
        Only render globe-dependent components AFTER the Viewer is ready.
        This prevents race conditions where these components try to use
        the viewer before it exists.
      */}
      {viewerReady && (
        <>
          {/* 
            Renders nothing visible — manages camera animations when a 
            restaurant is selected. 
          */}
          <CameraController viewerRef={viewerRef} />

          {/* 
            Renders nothing visible — manages the translation of Carto SQL 
            rows into Cesium Entity pins, and handles click events. 
          */}
          <RestaurantLayer viewerRef={viewerRef} />
        </>
      )}

      {/* 
        The overlay UI layer. pointer-events: none ensures that clicks
        pass through the empty space down to the Cesium globe below. 
      */}
      <div className="overlay-layer">
        
        {/* Top center search and toggle controls */}
        <div className="top-bar">
          <SearchBar />
          <PanicSwitch />
        </div>

        {/* Right side drawer for the selected restaurant scorecard */}
        <Scorecard />

        {/* Branding in the bottom left */}
        <div className="app-brand">
          <span className="app-brand-emoji">🍽️</span>
          <span className="app-brand-text">Philly Safe Eats</span>
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="loading-overlay glass-card">
            <div className="spinner" />
            <span className="loading-text">Loading inspection data...</span>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="loading-overlay glass-card" style={{ border: '1px solid var(--color-danger)' }}>
            <span className="loading-text" style={{ color: 'var(--color-danger)' }}>
              Failed to load data. Please refresh.
            </span>
          </div>
        )}

      </div>
    </main>
  )
}
