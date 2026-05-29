// ==============================================================
// src/components/globe/GlobeView.tsx — CesiumJS Viewer Initialization
// ==============================================================
//
// WHAT THIS FILE DOES:
// This component has ONE job: create the CesiumJS Viewer and
// make it available to the rest of the app via `viewerRef`.
//
// It renders NOTHING visible — the Viewer draws directly into
// the #cesiumContainer div defined in App.tsx. This component
// is purely a "lifecycle manager" for the Cesium Viewer.
//
// THE viewerRef PATTERN (key concept — read carefully):
// ======================================================
// The Cesium Viewer is a complex, stateful object that manages
// its own WebGL rendering context, DOM canvas, and animation loop.
//
// If we stored the Viewer in React state (useState), any state
// update would trigger a re-render, which would DESTROY and
// RECREATE the Viewer — causing a visible flash, memory leaks,
// and broken WebGL contexts.
//
// Instead, we use a `ref` (useRef). A ref holds a value that:
//   - PERSISTS across renders (doesn't reset)
//   - Does NOT trigger re-renders when changed
//   - Can be read/written by any component that has access to it
//
// The ref is created in App.tsx (the parent) and passed down
// as a prop. This makes App.tsx the "owner" — it can share the
// same ref with GlobeView, RestaurantLayer, and CameraController
// so they ALL access the SAME Viewer instance.
//
// LIFECYCLE:
//   1. App.tsx creates: viewerRef = useRef(null)
//   2. App.tsx renders: <GlobeView viewerRef={viewerRef} />
//   3. GlobeView's useEffect runs ONCE on mount:
//      a. Reads the Cesium Ion token from .env
//      b. Creates the Cesium Viewer
//      c. Assigns the Viewer to viewerRef.current immediately
//      d. Notifies the parent that the viewer is ready
//      e. Loads Google Photorealistic 3D Tiles (async)
//      f. Flies the camera to Philadelphia
//   4. Other components (RestaurantLayer, CameraController) read
//      viewerRef.current to interact with the 3D scene.
//   5. When the app unmounts, the cleanup function calls
//      viewer.destroy() to release all WebGL resources.
// ==============================================================

import { useEffect } from 'react'
import {
  Viewer,
  Cesium3DTileset,
  Ion,
  Cartesian3,
  Math as CesiumMath,
  createWorldTerrainAsync,
} from 'cesium'

// Required CSS for Cesium's built-in widgets (timeline, navigation).
// Even though we disable most widgets, the base stylesheet is still
// needed for the canvas to render correctly.
import 'cesium/Build/Cesium/Widgets/widgets.css'

// ==============================================================
// Props Interface
// ==============================================================
// GlobeView receives the viewerRef from App.tsx as a prop.
// React.MutableRefObject<Viewer | null> means:
//   - It's a ref object (has a .current property)
//   - .current is either a Cesium Viewer or null
//   - It starts as null and we assign the Viewer later
//
// onReady is a callback that App.tsx passes so it knows when
// the Viewer is fully constructed. This triggers a state update
// that causes child components to re-render with the viewer available.
interface GlobeViewProps {
  viewerRef: React.MutableRefObject<Viewer | null>
  onReady: () => void
}

export default function GlobeView({ viewerRef, onReady }: GlobeViewProps) {
  // useEffect runs AFTER the component renders to the DOM.
  // The empty dependency array [] means it runs ONCE — on mount.
  // This is the right place to create the Viewer because the
  // #cesiumContainer div must already exist in the DOM before
  // CesiumJS can render into it.
  useEffect(() => {
    // Guard against double-initialization. If the viewer already
    // exists (e.g., from a hot-reload), skip creation.
    if (viewerRef.current) {
      onReady()
      return
    }

    // ==============================================================
    // Step 1: Read the Cesium Ion Token
    // ==============================================================
    // Vite exposes environment variables from .env as import.meta.env.
    // Only variables prefixed with VITE_ are exposed (for security).
    const ionToken = import.meta.env.VITE_CESIUM_ION_TOKEN as string | undefined

    // !! SPEC REQUIREMENT: Warn if the token is missing !!
    // Without a valid Ion token, the 3D Tiles won't load and
    // the globe will show only a blank Earth with no buildings.
    if (!ionToken || ionToken === 'REPLACE_ME') {
      console.warn(
        '[Philly Safe Eats] ⚠️ VITE_CESIUM_ION_TOKEN is missing or not set.\n' +
        'The 3D photorealistic tiles will NOT load.\n' +
        'Get a free token at https://ion.cesium.com and add it to your .env file.'
      )
    } else {
      // Set the global Cesium Ion access token.
      // This MUST be done BEFORE creating the Viewer, because the
      // Viewer immediately tries to load Ion-hosted assets.
      Ion.defaultAccessToken = ionToken
    }

    // ==============================================================
    // Step 2: Create the Cesium Viewer
    // ==============================================================
    // The first argument ('cesiumContainer') is the ID of the div
    // to render into. This must match id="cesiumContainer" in App.tsx.
    //
    // The second argument is a configuration object. We disable
    // most of Cesium's built-in UI widgets because we're building
    // our own custom glassmorphism UI on top.
    let viewer: Viewer
    try {
      viewer = new Viewer('cesiumContainer', {
        // Disable all the built-in Cesium UI widgets.
        // We want a clean, minimal canvas with our own overlays.
        animation: false,           // The time/date animation clock
        baseLayerPicker: false,     // Imagery/terrain source switcher
        fullscreenButton: false,    // Browser fullscreen toggle
        geocoder: false,            // Cesium's built-in search bar
        homeButton: false,          // "Reset camera to Earth" button
        infoBox: false,             // Default entity info popup
        sceneModePicker: false,     // 2D / Columbus / 3D mode toggle
        selectionIndicator: false,  // Green circle around selected entities
        timeline: false,            // Time scrubber at the bottom
        navigationHelpButton: false, // "?" help button
      })
    } catch (err) {
      console.error(
        '[GlobeView] ❌ Failed to create CesiumJS Viewer. This usually means:\n' +
        '  - The #cesiumContainer div is missing from the DOM\n' +
        '  - WebGL is not supported in this browser\n' +
        '  - Another Viewer is already attached to the same container',
        err
      )
      return
    }

    // ==============================================================
    // Step 3: Store the Viewer in the Ref IMMEDIATELY
    // ==============================================================
    // THIS IS THE CRITICAL STEP that connects GlobeView to the
    // rest of the app. By assigning to viewerRef.current RIGHT AWAY
    // (before the async 3D tiles load), we make the Viewer accessible
    // to RestaurantLayer and CameraController as soon as possible.
    //
    // Previously, this was done AFTER the async IIFE, which caused a
    // race condition where child components couldn't access the viewer.
    viewerRef.current = viewer

    // Notify the parent (App.tsx) that the viewer is constructed
    // and ready for child components to use.
    onReady()

    console.log('[GlobeView] ✅ Cesium Viewer created successfully')

    // ==============================================================
    // Step 4: Load Terrain (async, non-blocking)
    // ==============================================================
    // We set up terrain asynchronously so it doesn't block viewer
    // creation. If terrain loading fails, the globe still works
    // — it just shows a flat earth surface.
    ;(async () => {
      try {
        const terrainProvider = await createWorldTerrainAsync()
        if (!viewer.isDestroyed()) {
          viewer.terrainProvider = terrainProvider
          console.log('[GlobeView] ✅ World Terrain loaded')
        }
      } catch (err) {
        console.warn(
          '[GlobeView] ⚠️ Failed to load World Terrain. The globe will render flat.',
          err
        )
      }
    })()

    // ==============================================================
    // Step 5: Load Google Photorealistic 3D Tiles (async, non-blocking)
    // ==============================================================
    // Asset 2275207 is Google's photorealistic 3D city scans,
    // available through Cesium Ion. This gives us realistic 3D
    // buildings for Philadelphia (and the entire world).
    //
    // This is async because the tileset metadata must be downloaded
    // before tiles can start streaming. We use an IIFE (Immediately
    // Invoked Function Expression) to handle the async/await.
    ;(async () => {
      try {
        // Download the tileset metadata from Cesium Ion
        const tileset = await Cesium3DTileset.fromIonAssetId(2275207)

        // Guard: viewer might have been destroyed while we were loading
        if (!viewer.isDestroyed()) {
          // Add the tileset to the scene's primitives collection.
          // Cesium will now stream 3D building tiles as the camera moves.
          viewer.scene.primitives.add(tileset)
          console.log('[GlobeView] ✅ Google Photorealistic 3D Tiles loaded')
        }
      } catch (err) {
        // This usually means the Ion token is invalid or doesn't
        // have permission to access the Google 3D Tiles asset.
        console.error(
          '[GlobeView] ❌ Failed to load 3D Tiles. Check your Ion token ' +
          'and ensure it has access to asset 2275207.',
          err
        )
      }
    })()

    // ==============================================================
    // Step 6: Fly the Camera to Philadelphia
    // ==============================================================
    // On startup, we animate the camera from its default position
    // (looking at Earth from space) down to Center City Philadelphia.
    //
    // Cartesian3.fromDegrees(longitude, latitude, height) converts
    // familiar lat/lng coordinates into Cesium's internal 3D
    // coordinate system (ECEF — Earth-Centered Earth-Fixed).
    //
    // The orientation tilts the camera to show the 3D buildings
    // at an angle, rather than looking straight down (bird's eye).
    //
    // Center City Philadelphia coordinates:
    //   Latitude:  39.9526° N
    //   Longitude: -75.1652° W
    //   Height:    1500 meters above ground (good overview altitude)
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(-75.1652, 39.9526, 1500),

      // Camera orientation — controls which direction the camera "looks"
      orientation: {
        // heading: compass direction. 0 = north. CesiumMath.toRadians(0) = north.
        heading: CesiumMath.toRadians(0),

        // pitch: vertical tilt. -90° = straight down. -45° = angled view.
        // We use -35° for a nice 3D perspective that showcases buildings.
        pitch: CesiumMath.toRadians(-35),

        // roll: rotation around the viewing axis. 0 = no tilt.
        roll: 0,
      },

      // Animation duration in seconds. 2.5s feels smooth and cinematic.
      duration: 2.5,
    })

    // ==============================================================
    // Step 7: Cleanup Function (runs when component unmounts)
    // ==============================================================
    // React calls this function when GlobeView is removed from the
    // DOM. We MUST destroy the Viewer to release:
    //   - The WebGL rendering context
    //   - Web Workers (tile decoders, terrain processors)
    //   - GPU memory (texture buffers, vertex arrays)
    //
    // Forgetting to call destroy() causes memory leaks and "too
    // many WebGL contexts" errors if the component remounts.
    return () => {
      if (!viewer.isDestroyed()) {
        viewer.destroy()
      }
      // Clear the ref so other components know the Viewer is gone
      viewerRef.current = null
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty array = run only on mount, never on re-render

  // GlobeView renders NOTHING — the Viewer draws directly into
  // the #cesiumContainer div defined in App.tsx. Returning null
  // means this component contributes no HTML to the page.
  return null
}
