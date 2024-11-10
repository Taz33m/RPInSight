'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import { MAPBOX_ACCESS_TOKEN, MAPBOX_STYLE_URL } from '@/lib/mapbox-config'

mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN

function Map() {
  const mapContainer = useRef(null)
  const map = useRef(null)

  useEffect(() => {
    if (map.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAPBOX_STYLE_URL,
      center: [-73.6766, 42.7291],
      zoom: 15.5,
      pitch: 45,
      bearing: -17.6,
      antialias: true
    })

    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true
      })
    )

    return () => map.current?.remove()
  }, [])

  return (
    <div className="w-full h-screen">
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  )
}

export default Map
