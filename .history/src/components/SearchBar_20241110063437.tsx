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
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const searchLocations = () => {
    if (!map) return;

    // Search through specific layers
    const layers = [
      'dining-points',
      'study-points',
      'lecture-points',
      'parking-points'
    ];

    let allFeatures: any[] = [];
    layers.forEach(layer => {
      if (map.getLayer(layer)) {
        const features = map.querySourceFeatures('composite', {
          sourceLayer: layer,
          filter: ['has', 'name']
        });
        allFeatures = [...allFeatures, ...features];
      }
    });

    const matchingLocations = allFeatures.filter(feature => 
      feature.properties?.name?.toLowerCase().includes(query.toLowerCase())
    );

    // Remove duplicates based on name
    const uniqueLocations = Array.from(
      new Map(matchingLocations.map(item => [item.properties.name, item])).values()
    );

    setSuggestions(uniqueLocations);
  };

  const handleLocationSelect = (location: any) => {
    if (!map) return;
    onSearch(location);
    setQuery(location.properties.name);
    setSuggestions([]);
  };

  useEffect(() => {
    if (query.length >= 2) {
      searchLocations();
    } else {
      setSuggestions([]);
    }
  }, [query, map]);

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
