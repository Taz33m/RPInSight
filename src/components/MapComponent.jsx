'use client'

import React, { useState, useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Search, Map } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

mapboxgl.accessToken = 'pk.eyJ1IjoibWFwc2d1eSIsImEiOiJjbTB0Y2hua3Uwd3NoMnFxNWNtZXR4YW8wIn0.RZRd1UCQu5BlH3ARl0bNWA'

const campusCenter = [-73.6826, 42.7302]

const campusLocations = [
  {
    name: 'Rensselaer Union',
    coordinates: [-73.6766, 42.7302],
    description: 'Student union building with dining, student activities, and meeting spaces',
    type: 'student_center'
  },
  {
    name: 'Folsom Library',
    coordinates: [-73.6829, 42.7291],
    description: 'Main campus library with study spaces and research resources',
    type: 'library'
  },
  {
    name: 'EMPAC',
    coordinates: [-73.6839, 42.7288],
    description: 'Experimental Media and Performing Arts Center',
    type: 'arts'
  },
  {
    name: 'Commons Dining Hall',
    coordinates: [-73.6775, 42.7298],
    description: 'Main dining facility on campus',
    type: 'dining'
  },
  {
    name: 'Walker Laboratory',
    coordinates: [-73.6830, 42.7308],
    description: 'Historic academic building with laboratories and classrooms',
    type: 'academic'
  }
]

export default function MapComponent() {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLocation, setSelectedLocation] = useState(null)

  useEffect(() => {
    if (map.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapsguy/cm3al9nju00ik01qs9zqq8tbd',
      center: campusCenter,
      zoom: 15
    })

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true
      })
    )

    map.current.on('load', () => {
      // Add markers for campus locations
      campusLocations.forEach(location => {
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div class="p-2">
            <h3 class="font-bold text-lg">${location.name}</h3>
            <p class="text-sm mt-1">${location.description}</p>
            <p class="text-xs mt-1 text-gray-500">Type: ${location.type}</p>
          </div>
        `)

        const marker = new mapboxgl.Marker({
          color: getMarkerColor(location.type)
        })
          .setLngLat(location.coordinates)
          .setPopup(popup)
          .addTo(map.current)

        marker.getElement().addEventListener('click', () => {
          setSelectedLocation(location)
        })
      })
    })
  }, [])

  const getMarkerColor = (type) => {
    const colors = {
      student_center: '#FF0000',
      library: '#0000FF',
      arts: '#800080',
      dining: '#FFA500',
      academic: '#008000'
    }
    return colors[type] || '#000000'
  }

  const handleSearch = () => {
    const location = campusLocations.find(loc => 
      loc.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    if (location) {
      setSelectedLocation(location)
      map.current.flyTo({
        center: location.coordinates,
        zoom: 17
      })
    }
  }

  const handleRoute = () => {
    // Implement routing functionality here
    console.log('Routing to selected location')
  }

  return (
    <div className="flex h-screen">
      <div className="w-1/4 p-4 bg-white shadow-lg z-10">
        <h1 className="text-2xl font-bold mb-4 text-red-800">RPInSight</h1>
        <div className="flex mb-4">
          <Input
            type="text"
            placeholder="Search campus locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-grow mr-2"
          />
          <Button onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        {selectedLocation && (
          <Card>
            <CardHeader>
              <CardTitle>{selectedLocation.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-2">{selectedLocation.description}</p>
              <p className="text-sm text-gray-500 mb-4">Type: {selectedLocation.type}</p>
              <p className="text-sm">Coordinates: {selectedLocation.coordinates.join(', ')}</p>
              <Button onClick={handleRoute} className="mt-4">
                <Map className="h-4 w-4 mr-2" />
                Route Here
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      <div ref={mapContainer} className="flex-grow" />
    </div>
  )
}