import React, { useState, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import { Search } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  map: mapboxgl.Map | null;
  onSearch: (location: any) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ map, onSearch }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const searchWithAI = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();
      
      // Parse the AI response and find matching locations on the map
      if (map) {
        const features = map.queryRenderedFeatures();
        const matchingLocations = features.filter(feature => 
          feature.properties?.name?.toLowerCase().includes(data.content.toLowerCase())
        );
        setSuggestions(matchingLocations);
      }
    } catch (error) {
      console.error('Search error:', error);
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
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [query]);

  return (
    <div className="relative w-full">
      <div className="flex gap-2">
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search campus locations..."
          className="flex-grow"
        />
        <Button 
          onClick={() => suggestions[0] && handleLocationSelect(suggestions[0])}
          className="bg-gradient-to-r from-red-900 to-red-700"
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((location, index) => (
            <button
              key={index}
              className="w-full px-4 py-2 text-left hover:bg-gray-100"
              onClick={() => handleLocationSelect(location)}
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
