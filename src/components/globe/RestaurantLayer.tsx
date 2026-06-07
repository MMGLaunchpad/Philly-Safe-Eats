import { useEffect, useRef } from 'react'
import {
  Viewer,
  Entity,
  Cartesian3,
  Cartesian2,
  Color,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  defined,
  PointGraphics,
  Math as CesiumMath,
  HeightReference,
  BoundingSphere,
  HeadingPitchRange,
} from 'cesium'
import { useRestaurants } from '../../hooks/useRestaurants'
import { useAppStore, RestaurantRow } from '../../stores/useAppStore'
import { playInterfaceClick } from '../../utils/audio'

interface RestaurantLayerProps {
  viewerRef: React.MutableRefObject<Viewer | null>
}

function getViolationColor(count: number): Color {
  if (count === 0) return Color.fromCssColorString('#00e676') // Green
  if (count <= 2) return Color.fromCssColorString('#ff9100') // Orange
  return Color.fromCssColorString('#ff1744') // Red
}

export default function RestaurantLayer({ viewerRef }: RestaurantLayerProps) {
  const { data: restaurants } = useRestaurants()

  const searchTerm = useAppStore((s) => s.searchTerm.toLowerCase())
  const culinaryFilter = useAppStore((s) => s.culinaryFilter)
  const statusFilter = useAppStore((s) => s.statusFilter)
  const setSelectedRestaurant = useAppStore((s) => s.setSelectedRestaurant)

  const entitiesRef = useRef<Map<number, Entity>>(new Map())
  const currentSelectionRingRef = useRef<Entity | null>(null);
  const handlerRef = useRef<ScreenSpaceEventHandler | null>(null)

  // 1. Create entities once when data is loaded
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || !restaurants) return

    const currentEntities = entitiesRef.current

    const records = restaurants ?? [];

    records.forEach((restaurant) => {
      if (!restaurant || !restaurant.cartodb_id) return
      if (currentEntities.has(restaurant.cartodb_id)) return

      let rawLng = restaurant.lng
      let rawLat = restaurant.lat

      // Extract coordinates if wrapped inside an object by Carto
      if (rawLng && typeof rawLng === 'object' && Array.isArray((rawLng as any).coordinates)) {
        const coords = (rawLng as any).coordinates
        rawLng = coords[0]
        rawLat = coords[1]
      }

      const finalLng = Number(rawLng)
      const finalLat = Number(rawLat)

      // Fail-safe protection against bad records
      if (isNaN(finalLng) || isNaN(finalLat)) {
        return
      }

      const color = getViolationColor(restaurant.open_violation_count)

      const entity = viewer.entities.add({
        id: `restaurant-${restaurant.cartodb_id}`,
        position: Cartesian3.fromDegrees(finalLng, finalLat),
        point: new PointGraphics({
          pixelSize: 14,
          color: color,
          outlineColor: Color.WHITE,
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        }),
        properties: {
          restaurantData: restaurant
        }
      })

      currentEntities.set(restaurant.cartodb_id, entity)
    })

  }, [restaurants, viewerRef])

  // 2. Handle filtering
  useEffect(() => {
    const currentEntities = entitiesRef.current
    if (currentEntities.size === 0) return

    currentEntities.forEach((entity) => {
      const data = entity.properties?.restaurantData?.getValue() as RestaurantRow | undefined
      if (!data) return

      let show = true

      if (searchTerm) {
        const name = (data.tradename || data.legalname || '').toLowerCase()
        if (!name.includes(searchTerm)) {
          show = false
        }
      }

      if (culinaryFilter !== 'All Categories') {
        const name = (data.tradename || data.legalname || '').toLowerCase()
        if (!name.includes(culinaryFilter.toLowerCase())) {
          show = false
        }
      }

      if (statusFilter === 'Clean (Green)' && data.open_violation_count !== 0) show = false
      else if (statusFilter === 'Minor Notices (Orange)' && (data.open_violation_count < 1 || data.open_violation_count > 2)) show = false
      else if (statusFilter === 'High Priority (Red)' && data.open_violation_count < 3) show = false

      entity.show = show
    })
  }, [searchTerm, culinaryFilter, statusFilter, restaurants])

  // 3. Handle click events
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return

    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas)
    handlerRef.current = handler

    handler.setInputAction((clickEvent: { position: Cartesian2 }) => {
      const pickedObject = viewer.scene.pick(clickEvent.position)

      if (defined(pickedObject) && defined(pickedObject.id)) {
        const entity = pickedObject.id as Entity
        const data = entity.properties?.restaurantData?.getValue() as RestaurantRow | undefined

        if (data) {
          // 1. Play the synthesized interface chime
          playInterfaceClick();
          setSelectedRestaurant(data);

          // 2. Manage the Visual Selection Ring Graphic
          if (currentSelectionRingRef.current) {
            viewer.entities.remove(currentSelectionRingRef.current);
            currentSelectionRingRef.current = null;
          }

          // Extract safe coordinates
          let rawLng = data.lng;
          let rawLat = data.lat;
          if (rawLng && typeof rawLng === 'object' && Array.isArray((rawLng as any).coordinates)) {
            const coords = (rawLng as any).coordinates;
            rawLng = coords[0];
            rawLat = coords[1];
          }

          const positionCoords = Cartesian3.fromDegrees(Number(rawLng), Number(rawLat));
          
          // Spawns a clean, flat 3D targeted ellipse highlight
          currentSelectionRingRef.current = viewer.entities.add({
            position: positionCoords,
            name: 'Target Lock Highlight',
            ellipse: {
              semiMajorAxis: 45.0, // Scale radius in meters
              semiMinorAxis: 45.0,
              material: Color.CYAN.withAlpha(0.3), // Glassmorphic translucent cyan
              outline: true,
              outlineColor: Color.WHITE,
              outlineWidth: 2.0,
              heightReference: HeightReference.RELATIVE_TO_GROUND
            }
          });

          // 3. Absolute Camera Orientation Safe-Lock via BoundingSphere
          const boundingSphere = new BoundingSphere(positionCoords, 300.0);
          const offset = new HeadingPitchRange(
            CesiumMath.toRadians(-45.0),
            CesiumMath.toRadians(-35.0),
            650.0 // Close cinematic altitude — clears buildings while keeping subject visible
          );

          viewer.camera.flyToBoundingSphere(boundingSphere, {
            offset,
            duration: 1.8,
          });
        } else {
          // Clean up graphics layer if user clicks off into empty map space
          if (currentSelectionRingRef.current) {
            viewer.entities.remove(currentSelectionRingRef.current);
            currentSelectionRingRef.current = null;
          }
          setSelectedRestaurant(null)
        }
      } else {
        // Clean up graphics layer if user clicks off into empty map space
        if (currentSelectionRingRef.current) {
          viewer.entities.remove(currentSelectionRingRef.current);
          currentSelectionRingRef.current = null;
        }
        setSelectedRestaurant(null)
      }
    }, ScreenSpaceEventType.LEFT_CLICK)

    return () => {
      if (handlerRef.current && !handlerRef.current.isDestroyed()) {
        handlerRef.current.destroy()
      }
    }
  }, [viewerRef, setSelectedRestaurant])

  return null
}