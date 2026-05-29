import { useEffect, useRef } from 'react'
import {
  Viewer,
  Entity,
  Cartesian3,
  Color,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  defined,
  PointGraphics,
} from 'cesium'
import { useRestaurants } from '../../hooks/useRestaurants'
import { useAppStore, RestaurantRow } from '../../stores/useAppStore'

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
  const hideHighRisk = useAppStore((s) => s.hideHighRisk)
  const setSelectedRestaurant = useAppStore((s) => s.setSelectedRestaurant)

  const entitiesRef = useRef<Map<number, Entity>>(new Map())
  const handlerRef = useRef<ScreenSpaceEventHandler | null>(null)

  // 1. Create entities once when data is loaded
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || !restaurants) return

    const currentEntities = entitiesRef.current

    // Safely handle if data is wrapped in rows array or directly an array
    const records: any[] = Array.isArray(restaurants)
      ? restaurants
      : (restaurants as any).rows || [];

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

      if (hideHighRisk && data.open_violation_count > 0) {
        show = false
      }

      entity.show = show
    })
  }, [searchTerm, hideHighRisk, restaurants])

  // 3. Handle click events
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return

    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas)
    handlerRef.current = handler

    handler.setInputAction((clickEvent: any) => {
      const pickedObject = viewer.scene.pick(clickEvent.position)

      if (defined(pickedObject) && defined(pickedObject.id)) {
        const entity = pickedObject.id as Entity
        const data = entity.properties?.restaurantData?.getValue() as RestaurantRow | undefined

        if (data) {
          setSelectedRestaurant(data)
        }
      } else {
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