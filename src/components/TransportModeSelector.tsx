import React from 'react';
import { Car, Bike, Footprints } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TransportModeSelectorProps {
  selectedMode: 'walking' | 'cycling' | 'driving';
  onModeChange: (mode: 'walking' | 'cycling' | 'driving') => void;
}

const TransportModeSelector: React.FC<TransportModeSelectorProps> = ({
  selectedMode,
  onModeChange,
}) => {
  return (
    <div className="flex gap-2 mt-2">
      <Button
        variant={selectedMode === 'walking' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onModeChange('walking')}
        className={`${
          selectedMode === 'walking' 
            ? 'bg-red-800 hover:bg-red-700' 
            : 'hover:bg-red-800 hover:text-white'
        } text-white`}
      >
        <Footprints className="h-4 w-4 mr-1" />
        Walk
      </Button>
      <Button
        variant={selectedMode === 'cycling' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onModeChange('cycling')}
        className={`${
          selectedMode === 'cycling' 
            ? 'bg-red-800 hover:bg-red-700' 
            : 'hover:bg-red-800 hover:text-white'
        } text-white`}
      >
        <Bike className="h-4 w-4 mr-1" />
        Bike
      </Button>
      <Button
        variant={selectedMode === 'driving' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onModeChange('driving')}
        className={`${
          selectedMode === 'driving' 
            ? 'bg-red-800 hover:bg-red-700' 
            : 'hover:bg-red-800 hover:text-white'
        } text-white`}
      >
        <Car className="h-4 w-4 mr-1" />
        Drive
      </Button>
    </div>
  );
};

export default TransportModeSelector;
