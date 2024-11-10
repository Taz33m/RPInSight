import React, { useState, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import { Search } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  map: mapboxgl.Map | null;
  onSearch: (location: any) => void;
}

interface Location {
  properties: {
    name: string;
    [key: string]: any;
  };
  geometry: {
    coordinates: [number, number];
  };
}

const SearchBar: React.FC<SearchBarProps> = ({ map, onSearch }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Location[]>([]);

  const searchLocations = () => {
    if (!map) return;

    const features = map.queryRenderedFeatures();
    const matchingLocations = features.filter(feature => 
      feature.properties?.name?.toLowerCase().includes(query.toLowerCase())
    );

    setSuggestions(matchingLocations);
  };

  const handleLocationSelect = (location: Location) => {
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
          className="flex-grow transition-all duration-200 hover:shadow-md focus:shadow-md"
        />
        <Button 
          onClick={() => suggestions[0] && handleLocationSelect(suggestions[0])}
          className="bg-gradient-to-r from-red-900 to-red-700 hover:from-red-800 hover:to-red-600 transition-all duration-200"
        >
          <Search className="h-4 w-4 text-white" />
        </Button>
      </div>

      {suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((location, index) => (
            <button
              key={index}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
              onClick={() => handleLocationSelect(location)}
            >
              <div className="font-medium text-gray-900">{location.properties.name}</div>
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
