import React from 'react';
import Image from 'next/image';

interface PuckmanAvatarProps {
  state: 'STANDARD' | 'HAPPY' | 'IDEA' | 'CONFUSED';
  onClick?: () => void;
}

const PuckmanAvatar: React.FC<PuckmanAvatarProps> = ({ state, onClick }) => {
  return (
    <div 
      className="cursor-pointer transition-transform hover:scale-105 mb-4"
      onClick={onClick}
    >
      <Image
        src={`/${state}.png`}
        alt="Campus search assistant"
        width={150}
        height={150}
        className="drop-shadow-lg"
      />
    </div>
  );
};

export default PuckmanAvatar;
