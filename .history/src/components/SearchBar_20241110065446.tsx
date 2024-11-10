import React, { useState, useEffect, ChangeEvent, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { Search, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const userLocationRef = useRef<[number, number] | null>(null);

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setQuery(e.target.value);
    // Automatically adjust height
    e.target.style.height = 'inherit';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const clearMarker = () => {
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  };

  const searchWithAI = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    clearMarker();

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

      const data: AIResponse = await response.json();
      setAiResponse(data);
      
      if (map && data.coordinates) {
        // Remove existing marker if any
        clearMarker();

        // Create new marker
        markerRef.current = new mapboxgl.Marker({
          color: "#C41E3A", // RPI Red
          scale: 1.2
        })
          .setLngLat(data.coordinates)
          .addTo(map);

        // Fly to location
        map.flyTo({
          center: data.coordinates,
          zoom: 17,
          duration: 2000
        });
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

  useEffect(() => {
    if (!map) return;

    // Find the GeolocateControl instance
    const controls = map.getControls();
    const geolocateControl = Array.from(controls).find(
      ([, control]) => control instanceof mapboxgl.GeolocateControl
    )?.[1] as mapboxgl.GeolocateControl;

    if (geolocateControl) {
      geolocateControl.on('geolocate', (e: GeolocationPosition) => {
        userLocationRef.current = [e.coords.longitude, e.coords.latitude];
        console.log('User location updated:', userLocationRef.current);
      });
    }
  }, [map]);

  return (
    <div className="relative w-full space-y-2">
      <div className="flex gap-2">
        <Textarea
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyPress}
          placeholder="Get to any campus location..."
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
        </div>
      )}
    </div>
  );
};

export default SearchBar;
