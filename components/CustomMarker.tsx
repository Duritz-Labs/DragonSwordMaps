
import React from 'react';
import { PinType } from '../types';
import { PIN_IMAGES } from '../constants';

const TINY_TYPES: PinType[] = ['감', '기', '추', '회', '망', '생', '태', '순', '활'];
const SMALL_TYPES: PinType[] = ['새'];

interface CustomMarkerProps {
  type: PinType;
  comment: string;
  x: number;
  y: number;
  isAdmin?: boolean;
  isFaded?: boolean;
  onDelete: () => void;
  onClick: () => void;
}

const CustomMarker: React.FC<CustomMarkerProps> = ({ type, comment, x, y, isAdmin, isFaded, onDelete, onClick }) => {
  let sizeClass = 'w-[24px] h-[24px]';
  if (TINY_TYPES.includes(type)) {
    sizeClass = 'w-[15px] h-[15px]';
  } else if (SMALL_TYPES.includes(type)) {
    sizeClass = 'w-[18px] h-[18px]';
  }
  
  // 관리자이거나, 새알('새') 타입이거나, 그 외 일반 타입일 경우 상호작용 가능
  const isInteractive = isAdmin || type === '새' || (!TINY_TYPES.includes(type) && !SMALL_TYPES.includes(type));

  return (
    <div
      className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 group pointer-events-auto transition-all duration-300 ${isFaded ? 'opacity-30 grayscale-[0.8] scale-90' : 'opacity-100'}`}
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <div 
        onClick={(e) => { e.stopPropagation(); if (isInteractive) onClick(); }}
        className={`${sizeClass} ${isInteractive ? 'cursor-pointer hover:scale-150' : 'cursor-default'} transition-transform relative`}
      >
        {/* Glow effect */}
        {!isFaded && <div className="absolute inset-0 bg-white/20 blur-[2px] rounded-full scale-110"></div>}
        <img 
          src={PIN_IMAGES[type]} 
          alt={type} 
          className="w-full h-full object-contain relative z-10 drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]" 
        />
      </div>

      {/* Admin Tooltip (Simple) */}
      {isAdmin && !isFaded && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded text-[9px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 shadow-xl">
          {comment || '설명 없음 (Click to Edit)'}
        </div>
      )}

      {/* Delete Button (Visible only on admin hover) */}
      {isAdmin && (
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute -top-3 -right-3 w-4 h-4 bg-red-500 rounded-full text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 border border-white/20 z-40 text-white"
        >
          ✕
        </button>
      )}
    </div>
  );
};

export default CustomMarker;
