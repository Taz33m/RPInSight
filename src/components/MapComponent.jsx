'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import Image from 'next/image'
import SearchBar from '@/components/SearchBar'
import PuckmanAvatar from '@/components/PuckmanAvatar'
import DataMethodologyPanel from '@/components/DataMethodologyPanel'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

const campusCenter = [
  parseFloat(process.env.NEXT_PUBLIC_CAMPUS_CENTER_LNG),
  parseFloat(process.env.NEXT_PUBLIC_CAMPUS_CENTER_LAT)
]

export default function MapComponent() {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const popup = useRef(null)
  const [mapInstance, setMapInstance] = useState(null)
  const [puckmanState, setPuckmanState] = useState('STANDARD')

  const createPopupContent = useCallback((feature) => {
    const properties = feature.properties;
    if (!properties) return null;

    let content = `
      <div class="p-4 max-w-sm">
        <h3 class="font-bold text-lg mb-2 text-red-800">${properties.name || 'Unnamed Location'}</h3>`;

    if (properties.location) {
      content += `<p class="text-sm mb-2 text-gray-600">${properties.location}</p>`;
    }

    if (properties.departments && Array.isArray(properties.departments)) {
      content += `
        <div class="text-sm mb-3">
          <div class="font-semibold mb-1">Departments:</div>
          <ul class="list-disc pl-4">
            ${properties.departments.map(dept => `<li>${dept}</li>`).join('')}
          </ul>
        </div>`;
    }

    if (properties.notes) {
      content += `
        <div class="text-sm mb-3">
          <div class="font-semibold mb-1">Notes:</div>
          <p class="text-gray-700">${properties.notes}</p>
        </div>`;
    }

    if (properties.additional_info_link) {
      content += `
        <div class="text-sm mb-2">
          <a href="${properties.additional_info_link}" target="_blank" class="text-blue-600 hover:text-blue-800 underline">
            More Information
          </a>
        </div>`;
    }

    if (properties.hours) {
      content += `<div class="text-sm mb-3">
        <div class="font-semibold mb-1">Hours:</div>`;
      
      if (typeof properties.hours === 'object') {
        Object.entries(properties.hours).forEach(([day, times]) => {
          const formattedDay = day
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join('-');
          
          content += `<div class="mb-1">
            <span class="font-medium">${formattedDay}:</span>
            <span class="pl-2">${times}</span>
          </div>`;
        });
      } else {
        content += `<div class="pl-2">${properties.hours}</div>`;
      }
      
      content += `</div>`;
    }

    if (properties.features && Array.isArray(properties.features)) {
      content += `
        <div class="text-sm mb-3">
          <div class="font-semibold mb-1">Features:</div>
          <ul class="list-disc pl-4">
            ${properties.features.map(feature => `<li>${feature}</li>`).join('')}
          </ul>
        </div>`;
    }

    if (properties.menu_link) {
      content += `
        <div class="text-sm mb-2">
          <a href="${properties.menu_link}" target="_blank" class="text-blue-600 hover:text-blue-800 underline">
            View Menu
          </a>
        </div>`;
    }

    content += '</div>';
    return content;
  }, []);

  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: process.env.NEXT_PUBLIC_MAPBOX_STYLE_URL,
      center: campusCenter,
      zoom: 15,
      fadeDuration: 250,
      crossSourceCollisions: true
    })

    popup.current = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: true,
      className: 'custom-popup',
      maxWidth: '300px',
      offset: [15, 0]
    })

    map.current.on('load', () => {
      map.current.on('click', (e) => {
        const features = map.current.queryRenderedFeatures(e.point)
        
        if (!features.length) {
          popup.current.remove()
          return
        }

        const feature = features[0]
        const coordinates = feature.geometry.coordinates.slice()
        
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360
        }
        
        const popupContent = createPopupContent(feature)
        
        if (popupContent) {
          popup.current
            .setLngLat(coordinates)
            .setHTML(popupContent)
            .addTo(map.current)
        }
      })

      map.current.on('mouseenter', (e) => {
        const features = map.current.queryRenderedFeatures(e.point)
        if (features.length) {
          map.current.getCanvas().style.cursor = 'pointer'
        }
      })

      map.current.on('mouseleave', () => {
        map.current.getCanvas().style.cursor = ''
      })

      console.log('Map loaded, setting instance');
      setMapInstance(map.current);
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
  }, [createPopupContent])

  const handleFeatureClick = useCallback((e) => {
    const feature = e.features[0];
    if (!feature) return;

    if (popup.current) {
      popup.current.remove();
    }

    popup.current = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: true,
      className: 'custom-popup',
      maxWidth: '300px',
      offset: [15, 0]
    })
      .setLngLat(feature.geometry.coordinates)
      .setHTML(createPopupContent(feature))
      .addTo(map.current);
  }, [createPopupContent])

  useEffect(() => {
    if (!map.current) return;

    map.current.on('click', 'dining-points', handleFeatureClick);
    map.current.on('click', 'study-points', handleFeatureClick);
    map.current.on('click', 'lecture-points', handleFeatureClick);
    map.current.on('click', 'parking-points', handleFeatureClick);

    return () => {
      if (map.current) {
        map.current.off('click', 'dining-points', handleFeatureClick);
        map.current.off('click', 'study-points', handleFeatureClick);
        map.current.off('click', 'lecture-points', handleFeatureClick);
        map.current.off('click', 'parking-points', handleFeatureClick);
      }
    };
  }, [handleFeatureClick]);

  return (
    <div className="flex flex-col h-screen">
      <div className="flex flex-grow">
        <div className="w-1/4 p-4 bg-gradient-to-b from-white to-gray-50 shadow-lg z-10">
          <div className="flex flex-col items-center justify-start">
            <Image
              src="/logov1.png"
              alt="RPI Logo"
              width={100}
              height={40}
              className="object-contain mb-4"
            />
            <PuckmanAvatar 
              state={puckmanState} 
              onClick={() => {
                // Focus the search input when Puckman is clicked
                const searchInput = document.querySelector('textarea');
                if (searchInput) searchInput.focus();
              }}
            />
          </div>
          <div className="mt-4">
            <SearchBar 
              map={mapInstance}
              onSearch={(location) => {
                console.log('Search callback received location:', location);
              }}
              onPuckmanStateChange={setPuckmanState}
            /> 
          </div>
          <DataMethodologyPanel />
        </div>
        <div ref={mapContainer} className="flex-grow" />
      </div>
      <footer className="h-[27px] bg-gradient-to-r from-red-900 to-red-700 text-white text-xs flex items-center justify-between px-4">
        <span>© 2024 Tazeem Mahashin, RPInSights</span>
        <span className="text-gray-200">Troy, NY 12180</span>
      </footer>
    </div>
  )
}
