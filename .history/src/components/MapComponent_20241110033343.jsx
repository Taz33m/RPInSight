'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'

function MapComponent() {
  const mapContainer = useRef(null)
  const map = useRef(null)

  useEffect(() => {
    if (map.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapsguy/cm3al9nju00ik01qs9zqq8tbd',
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

export default MapComponent
