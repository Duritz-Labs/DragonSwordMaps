
import React from 'react';

interface MapMarkerProps {
  x: number;
  y: number;
  isSelected: boolean;
  onClick: () => void;
}

const MapMarker: React.FC<MapMarkerProps> = ({ x, y, isSelected, onClick }) => {
  return (
    <div
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer group pointer-events-auto"
      style={{ left: `${x}%`, top: `${y}%` }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {/* Interaction Area (Larger than visual) */}
      <div className="absolute -inset-4 rounded-full" />
      
      {/* Outer Glow Ring */}
      <div className={`
        absolute inset-0 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full transition-all duration-500
        ${isSelected ? 'bg-amber-500/30 animate-pulse' : 'bg-transparent group-hover:bg-amber-500/20'}
      `} />
      
      {/* Minimal Pin Point */}
      <div className={`
        w-2.5 h-2.5 rounded-full border-2 border-white/90 shadow-[0_0_8px_rgba(245,158,11,0.8)] transition-all duration-300
        ${isSelected ? 'bg-amber-400 scale-125 ring-2 ring-amber-500/50' : 'bg-amber-600 scale-100 group-hover:scale-110'}
      `} />
      
      {/* Center White Core */}
      <div className={`
        absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full transition-opacity
        ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
      `} />
    </div>
  );
};

export default MapMarker;
