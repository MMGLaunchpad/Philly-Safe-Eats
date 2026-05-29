// ==============================================================
// src/components/globe/CameraController.tsx — Camera Fly-To Manager
// ==============================================================
//
// WHAT THIS FILE DOES:
// Watches the Zustand store for selectedRestaurant changes.
// When a restaurant is selected (by clicking a pin), this
// component animates the camera to that restaurant's location.
//
// WHY A SEPARATE COMPONENT?
// Separating camera logic from RestaurantLayer keeps each
// component focused on ONE job:
//   - RestaurantLayer = manage entity pins + filtering
//   - CameraController = manage camera animations
//
// HOW IT WORKS:
//   1. Subscribes to selectedRestaurant in Zustand
//   2. When selectedRestaurant changes from null to a RestaurantRow,
//      calls viewer.camera.flyTo() with the restaurant's lat/lng
//   3. The camera smoothly animates to a "street view" angle
//      (300m altitude, 45° pitch) looking at the building
// ==============================================================

import { useEffect } from 'react'
import {
  Viewer,
  Cartesian3,
  Math as CesiumMath,
} from 'cesium'
import { useAppStore } from '../../stores/useAppStore'

interface CameraControllerProps {
  viewerRef: React.MutableRefObject<Viewer | null>
}

export default function CameraController({ viewerRef }: CameraControllerProps) {
  // Subscribe to the currently selected restaurant.
  // When the user clicks a pin, this value changes from null
  // to a RestaurantRow, triggering this effect.
  const selectedRestaurant = useAppStore((s) => s.selectedRestaurant)

  useEffect(() => {
    const viewer = viewerRef.current

    // Guard: don't fly if there's no viewer or no selection
    if (!viewer || viewer.isDestroyed() || !selectedRestaurant) return

    // Animate the camera to the selected restaurant's coordinates.
    // Cartesian3.fromDegrees converts lat/lng/height to Cesium's
    // internal ECEF coordinate system.
    //
    // Height = 300m gives a "street-level overview" that clearly
    // shows the selected building and its surroundings.
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(
        selectedRestaurant.lng,
        selectedRestaurant.lat,
        300 // meters above ground
      ),
      orientation: {
        heading: CesiumMath.toRadians(0),   // Face north
        pitch: CesiumMath.toRadians(-45),   // 45° downward angle
        roll: 0,
      },
      duration: 1.5, // seconds — smooth but not too slow
    })

    console.log(
      `[CameraController] 🎥 Flying to ${selectedRestaurant.tradename || selectedRestaurant.address}`
    )
  }, [selectedRestaurant, viewerRef])

  // Renders nothing — purely a side-effect component
  return null
}
