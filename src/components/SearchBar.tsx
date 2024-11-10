import React, { useState, useEffect, ChangeEvent, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { Search, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import TransportModeSelector from './TransportModeSelector';

interface SearchBarProps {
  map: mapboxgl.Map | null;
  onSearch: (location: any) => void;
}

interface AIResponse {
  content: string;
  buildingName: string;
  coordinates: [number, number] | null;
}

const SearchBar: React.FC<SearchBarProps> = ({ map, onSearch }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [showTransportModes, setShowTransportModes] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'walking' | 'cycling' | 'driving'>('walking');
  const [routeLayer, setRouteLayer] = useState<string | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const userLocationRef = useRef<[number, number] | null>(null);

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setQuery(e.target.value);
    // Automatically adjust height
    e.target.style.height = 'inherit';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const clearMarker = () => {
    console.log('Clearing existing marker...');
    if (markerRef.current) {
      console.log('Removing existing marker');
      markerRef.current.remove();
      markerRef.current = null;
    }
  };

  const searchWithAI = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    clearMarker();
    console.log('Starting search...', { mapAvailable: !!map });

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query,
          userLocation: userLocationRef.current 
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Search response data:', data);

      if (!map) {
        console.error('Map instance not available');
        throw new Error('Map not initialized');
      }

      if (!data.coordinates) {
        console.error('No coordinates in response');
        throw new Error('No coordinates found');
      }

      // Update AI response state
      setAiResponse({
        content: typeof data.content === 'object' ? JSON.stringify(data.content) : data.content,
        buildingName: data.buildingName,
        coordinates: data.coordinates
      });

      console.log('Creating marker with:', {
        map: !!map,
        coordinates: data.coordinates
      });

      // Create new marker
      const marker = new mapboxgl.Marker({
        color: "#C41E3A",
        scale: 1.2
      })
        .setLngLat(data.coordinates)
        .addTo(map);

      markerRef.current = marker;

      // Fly to location
      map.flyTo({
        center: data.coordinates,
        zoom: 17,
        duration: 2000
      });

      // Check if we should show transport modes
      if (userLocationRef.current) {
        setShowTransportModes(true);
      }

    } catch (error) {
      console.error('Search error:', error);
      setAiResponse({
        content: 'Sorry, I encountered an error processing your request.',
        buildingName: '',
        coordinates: null
      });
    } finally {
      setLoading(false);
    }
  };

  // Add debug useEffect
  useEffect(() => {
    console.log('Current state:', {
      showTransportModes,
      hasCoordinates: aiResponse?.coordinates !== null,
      userLocation: userLocationRef.current
    });
  }, [showTransportModes, aiResponse, userLocationRef.current]);

  // Cleanup marker when component unmounts
  useEffect(() => {
    return () => {
      clearMarker();
    };
  }, []);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Search when Enter is pressed (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      searchWithAI();
    }
  };

  const requestUserLocation = () => {
    if (!map) return;

    const geolocateControl = map._controls.find(
      control => control instanceof mapboxgl.GeolocateControl
    ) as mapboxgl.GeolocateControl;

    if (geolocateControl) {
      geolocateControl.trigger(); // This will prompt for location permission and get location
    }
  };

  const fetchAndDisplayRoute = async (mode: 'walking' | 'cycling' | 'driving') => {
    if (!userLocationRef.current || !aiResponse?.coordinates) {
      alert('Please enable location services to see directions');
      return;
    }

    setLoading(true);
    try {
      console.log('Fetching route with:', {
        origin: userLocationRef.current,
        destination: aiResponse.coordinates,
        mode
      });

      const response = await fetch('/api/directions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          origin: userLocationRef.current,
          destination: aiResponse.coordinates,
          mode
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Route data received:', data);

      if (data.error) {
        throw new Error(data.error);
      }

      // Remove existing route layer if any
      if (routeLayer && map) {
        map.removeLayer(routeLayer);
        map.removeSource(routeLayer);
      }

      // Add the new route layer
      const routeId = `route-${Date.now()}`;
      
      if (!map.getSource(routeId)) {
        map.addSource(routeId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: data.routes[0].geometry
          }
        });
      }

      map.addLayer({
        id: routeId,
        type: 'line',
        source: routeId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#991b1b',
          'line-width': 4,
          'line-opacity': 0.8
        }
      });

      setRouteLayer(routeId);

      // Fit the map to show the entire route
      const coordinates = data.routes[0].geometry.coordinates;
      const bounds = coordinates.reduce((bounds, coord) => {
        return bounds.extend(coord);
      }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

      map.fitBounds(bounds, {
        padding: 50,
        duration: 1000
      });

    } catch (error) {
      console.error('Error fetching route:', error);
      alert('Error fetching route. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Add cleanup for route layer
  useEffect(() => {
    return () => {
      if (map && routeLayer) {
        map.removeLayer(routeLayer);
        map.removeSource(routeLayer);
      }
    };
  }, [map, routeLayer]);

  // Update the existing useEffect for geolocation
  useEffect(() => {
    if (!map) return;

    const geolocateControl = map._controls.find(
      control => control instanceof mapboxgl.GeolocateControl
    ) as mapboxgl.GeolocateControl;

    if (geolocateControl) {
      // Listen for the geolocate event
      geolocateControl.on('geolocate', (e: GeolocationPosition) => {
        const { longitude, latitude } = e.coords;
        userLocationRef.current = [longitude, latitude];
        console.log('User location updated:', userLocationRef.current);
        
        // If we have a destination already, show transport modes
        if (aiResponse?.coordinates) {
          setShowTransportModes(true);
        }
      });

      // Also listen for when location is available
      geolocateControl.on('trackuserlocationstart', () => {
        console.log('Location tracking started');
      });

      // Check if location is already available
      if (geolocateControl._watchState === 'ACTIVE') {
        const position = geolocateControl._accuratePosition;
        if (position) {
          userLocationRef.current = [position.coords.longitude, position.coords.latitude];
          console.log('Retrieved existing user location:', userLocationRef.current);
          if (aiResponse?.coordinates) {
            setShowTransportModes(true);
          }
        }
      }
    }
  }, [map, aiResponse]);

  return (
    <div className="relative w-full space-y-2">
      <div className="flex gap-2">
        <Textarea
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyPress}
          placeholder="Find any campus location..."
          className="flex-grow min-h-[40px] max-h-[120px] resize-none py-2 px-3"
          disabled={loading}
          rows={1}
        />
        <Button 
          onClick={searchWithAI}
          className="bg-gradient-to-r from-red-900 to-red-700 hover:from-red-800 hover:to-red-600 h-auto"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 text-white animate-spin" />
          ) : (
            <Search className="h-4 w-4 text-white" />
          )}
        </Button>
      </div>

      {aiResponse && aiResponse.content && (
        <div className="w-full p-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 transition-all duration-200 ease-in-out">
          <div className="text-sm text-gray-700">
            <span className="font-semibold text-red-800">Puckman: </span>
            {aiResponse.content}
          </div>
          {aiResponse.buildingName && (
            <div className="mt-2 text-xs text-gray-500">
              Location: {aiResponse.buildingName}
            </div>
          )}
          
          {aiResponse.coordinates && !userLocationRef.current && (
            <div className="mt-2 p-2 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600">
                Want directions? 
                <Button
                  variant="link"
                  className="text-red-800 hover:text-red-700 p-0 ml-1"
                  onClick={requestUserLocation}
                >
                  Enable location services
                </Button>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Add debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-500 mt-2">
          Debug: ShowTransportModes: {showTransportModes.toString()} | 
          Has Coordinates: {Boolean(aiResponse?.coordinates).toString()} |
          Has User Location: {Boolean(userLocationRef.current).toString()}
        </div>
      )}

      {showTransportModes && aiResponse?.coordinates && (
        <TransportModeSelector
          selectedMode={selectedMode}
          onModeChange={(mode) => {
            console.log('Transport mode selected:', mode);
            setSelectedMode(mode);
            fetchAndDisplayRoute(mode);
          }}
        />
      )}
    </div>
  );
};

export default SearchBar;
