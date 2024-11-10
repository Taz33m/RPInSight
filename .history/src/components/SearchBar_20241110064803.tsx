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

  const clearMarker = () => {
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setQuery(e.target.value);
    e.target.style.height = 'inherit';
    e.target.style.height = `${e.target.scrollHeight}px`;
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
        body: JSON.stringify({ query }),
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

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (query.length >= 2) {
        searchWithAI();
      } else {
        setSuggestions([]);
        setAiResponse(null);
        clearMarker();
      }
    }, 300);

    return () => {
      clearTimeout(delaySearch);
    };
  }, [query]);

  // Cleanup marker when component unmounts
  useEffect(() => {
    return () => {
      clearMarker();
    };
  }, []);

  return (
    <div className="relative w-full space-y-2">
      <div className="flex gap-2">
        <Textarea
          value={query}
          onChange={handleInputChange}
          placeholder="Search for any campus location..."
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
            <span className="font-semibold text-red-800">AI Assistant: </span>
            {aiResponse.content}
          </div>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((location, index) => (
            <button
              key={index}
              className="w-full px-4 py-2 text-left hover:bg-gray-100"
              onClick={() => {
                onSearch(location);
                setSuggestions([]);
                setQuery(location.properties.name);
                setAiResponse(null);
              }}
            >
              <div className="font-medium">{location.properties.name}</div>
              {location.properties.location && (
                <div className="text-sm text-gray-500">{location.properties.location}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
