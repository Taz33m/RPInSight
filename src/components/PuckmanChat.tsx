import React, { useState } from 'react';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from 'lucide-react';

interface PuckmanChatProps {
  map: mapboxgl.Map | null;
  onSearch: (location: SearchResult) => void;
}

interface SearchResult {
  content?: string;
  buildingName?: string;
  coordinates?: [number, number] | null;
}

const PuckmanChat: React.FC<PuckmanChatProps> = ({ onSearch }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [puckmanState, setPuckmanState] = useState<'STANDARD' | 'HAPPY' | 'IDEA' | 'CONFUSED'>('STANDARD');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePuckmanClick = () => {
    setIsOpen(!isOpen);
    setPuckmanState(isOpen ? 'STANDARD' : 'IDEA');
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setPuckmanState('CONFUSED');

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();
      onSearch(data);
      setPuckmanState('HAPPY');
    } catch (error) {
      console.error('Search error:', error);
      setPuckmanState('CONFUSED');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute bottom-8 left-4 z-50 flex items-end">
      <div 
        className="cursor-pointer transition-transform hover:scale-105"
        onClick={handlePuckmanClick}
      >
        <Image
          src={`/${puckmanState}.png`}
          alt="Campus search assistant"
          width={100}
          height={100}
          className="drop-shadow-lg"
        />
      </div>

      {isOpen && (
        <div className="ml-4 mb-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden transition-all">
          <div className="p-4">
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask me anything about RPI campus..."
              className="min-h-[80px] mb-2"
            />
            <Button 
              onClick={handleSearch}
              className="w-full bg-gradient-to-r from-red-900 to-red-700 hover:from-red-800 hover:to-red-600"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Ask campus assistant
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PuckmanChat;
