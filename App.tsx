
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

// Constants
const MAP_IMAGE_URL = "https://raw.githubusercontent.com/Duritz-Labs/DragonSwordMaps/main/MapData_Relese/DragonSword_Simple.jpg";
const LOGO_IMAGE_URL = "https://raw.githubusercontent.com/Duritz-Labs/DragonSwordMaps/main/MapData_Relese/icon/main_icon.jpg";
const INITIAL_DATA_URL = "https://raw.githubusercontent.com/Duritz-Labs/DragonSwordMaps/main/MapData_Relese/DragonSwordMappinData_Relese.CSV";
const LOCAL_STORAGE_KEY = "dragon_sword_map_pins_v1";
const RESET_TIMESTAMP_KEY = "dragon_sword_last_reset_v1";

const ORIG_WIDTH = 3638;
const ORIG_HEIGHT = 4855;
const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;
const PIN_SIZE = 25;

interface FilterItem {
  id: number;
  name: string;
  icon: string;
}

interface MapPin {
  id: string;
  type: string;
  x: number;
  y: number;
  comment: string;
  faded: boolean;
}

const FILTER_ITEMS: FilterItem[] = [
  { id: 1, name: "지역", icon: "https://raw.githubusercontent.com/Duritz-Labs/DragonSwordMaps/main/MapData_Relese/icon/quest_new.png" },
  { id: 2, name: "돌발", icon: "https://raw.githubusercontent.com/Duritz-Labs/DragonSwordMaps/main/MapData_Relese/icon/Eliminate_new.png" },
  { id: 3, name: "상자", icon: "https://raw.githubusercontent.com/Duritz-Labs/DragonSwordMaps/main/MapData_Relese/icon/itembox.png" },
  { id: 4, name: "달열쇠", icon: "https://raw.githubusercontent.com/Duritz-Labs/DragonSwordMaps/main/MapData_Relese/icon/moonkeybox_new.png" },
  { id: 5, name: "미니게임", icon: "https://raw.githubusercontent.com/Duritz-Labs/DragonSwordMaps/main/MapData_Relese/icon/minagame.png" },
  { id: 6, name: "퍼즐", icon: "https://raw.githubusercontent.com/Duritz-Labs/DragonSwordMaps/main/MapData_Relese/icon/puzzle.png" },
  { id: 7, name: "새알", icon: "https://raw.githubusercontent.com/Duritz-Labs/DragonSwordMaps/main/MapData_Relese/icon/egg_new.png" },
  { id: 8, name: "감자", icon: "https://raw.githubusercontent.com/Duritz-Labs/DragonSwordMaps/main/MapData_Relese/icon/potato.png" },
  { id: 9, name: "기억", icon: "https://raw.githubusercontent.com/Duritz-Labs/DragonSwordMaps/main/MapData_Relese/icon/ki_erk_crystal.png" },
  { id: 10, name: "추억", icon: "https://raw.githubusercontent.com/Duritz-Labs/DragonSwordMaps/main/MapData_Relese/icon/chu_erk_crystal.png" },
  { id: 11, name: "회상", icon: "https://raw.githubusercontent.com/Duritz-Labs/DragonSwordMaps/main/MapData_Relese/icon/hoy_sang_crystal.png" },
  { id: 12, name: "망각", icon: "https://raw.githubusercontent.com/Duritz-Labs/DragonSwordMaps/main/MapData_Relese/icon/mang_gak_crystal.png" },
  { id: 13, name: "생기", icon: "https://raw.githubusercontent.com/Duritz-Labs/DragonSwordMaps/main/MapData_Relese/icon/saeng-gi_fluit.png" },
  { id: 14, name: "태고", icon: "https://raw.githubusercontent.com/Duritz-Labs/DragonSwordMaps/main/MapData_Relese/icon/taego_seed.png" },
  { id: 15, name: "순수", icon: "https://raw.githubusercontent.com/Duritz-Labs/DragonSwordMaps/main/MapData_Relese/icon/sunsu_drop.png" },
  { id: 16, name: "활력", icon: "https://raw.githubusercontent.com/Duritz-Labs/DragonSwordMaps/main/MapData_Relese/icon/hwallyeog_leaf.png" },
];

const App: React.FC = () => {
  const [scale, setScale] = useState(1.0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [mouseCoords, setMouseCoords] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set(FILTER_ITEMS.map(i => i.name)));
  const [pins, setPins] = useState<MapPin[]>([]);
  const [hideFound, setHideFound] = useState(false);
  
  // Modal State
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'info' | 'bulk' | null>(null);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [modalCoords, setModalCoords] = useState({ imgX: 0, imgY: 0 });
  const [selectedPinType, setSelectedPinType] = useState<string>(FILTER_ITEMS[0].name);
  const [pinComment, setPinComment] = useState("");
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  
  // Bulk Modal specific
  const [bulkTargetCategory, setBulkTargetCategory] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<'find' | 'reset' | null>(null);

  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<number | null>(null);
  const sidebarLongPressTimer = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Hidden mode toggle refs
  const logoClickCount = useRef(0);
  const lastLogoClickTime = useRef(0);

  // Pin count calculations
  const pinStats = useMemo(() => {
    const stats: Record<string, { total: number; found: number }> = {};
    FILTER_ITEMS.forEach(item => {
      stats[item.name] = { total: 0, found: 0 };
    });
    pins.forEach(pin => {
      if (stats[pin.type]) {
        stats[pin.type].total += 1;
        if (pin.faded) stats[pin.type].found += 1;
      }
    });
    return stats;
  }, [pins]);

  const clampPosition = useCallback((newX: number, newY: number, currentScale: number) => {
    if (!containerRef.current) return { x: newX, y: newY };
    const { width: vW, height: vH } = containerRef.current.getBoundingClientRect();
    const mapW = ORIG_WIDTH * currentScale;
    const mapH = ORIG_HEIGHT * currentScale;
    let minX = vW - mapW;
    let maxX = 0;
    let minY = vH - mapH;
    let maxY = 0;
    if (mapW < vW) { minX = (vW - mapW) / 2; maxX = minX; }
    if (mapH < vH) { minY = (vH - mapH) / 2; maxY = minY; }
    return { x: Math.min(Math.max(newX, minX), maxX), y: Math.min(Math.max(newY, minY), maxY) };
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    if (modalMode) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.min(Math.max(scale + delta, MIN_SCALE), MAX_SCALE);
    if (newScale === scale) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const pointX = (mouseX - position.x) / scale;
    const pointY = (mouseY - position.y) / scale;
    const nextX = mouseX - pointX * newScale;
    const nextY = mouseY - pointY * newScale;
    setPosition(clampPosition(nextX, nextY, newScale));
    setScale(newScale);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };

    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const imgX = Math.round((mouseX - position.x) / scale);
      const imgY = Math.round(ORIG_HEIGHT - (mouseY - position.y) / scale);

      // Only allow long press for Admin mode
      if (isAdmin) {
        longPressTimer.current = window.setTimeout(() => {
          setIsDragging(false);
          setModalCoords({ imgX, imgY });
          setModalMode('add');
          setSelectedPinType(FILTER_ITEMS[0].name);
          setPinComment("");
          setDeleteConfirmInput("");
        }, 1000);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const imgX = (mouseX - position.x) / scale;
    const imgY = (mouseY - position.y) / scale;
    
    setMouseCoords({
      x: Math.min(Math.max(Math.round(imgX), 0), ORIG_WIDTH),
      y: Math.min(Math.max(Math.round(ORIG_HEIGHT - imgY), 0), ORIG_HEIGHT)
    });

    if (isDragging) {
      if (longPressTimer.current) {
         window.clearTimeout(longPressTimer.current);
         longPressTimer.current = null;
      }
      setPosition(clampPosition(e.clientX - dragStart.current.x, e.clientY - dragStart.current.y, scale));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const toggleFilter = (name: string) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const isAllActive = activeFilters.size === FILTER_ITEMS.length;

  const toggleAll = () => {
    if (isAllActive) {
      setActiveFilters(new Set());
    } else {
      setActiveFilters(new Set(FILTER_ITEMS.map(i => i.name)));
    }
  };

  const closeModal = () => {
    setModalMode(null);
    setDeleteConfirmInput("");
    setBulkTargetCategory(null);
    setBulkAction(null);
  };

  const savePin = () => {
    if (modalMode === 'add') {
      const newPin: MapPin = {
        id: Date.now().toString(),
        type: selectedPinType,
        x: modalCoords.imgX,
        y: modalCoords.imgY,
        comment: pinComment,
        faded: false,
      };
      setPins([...pins, newPin]);
    } else if (modalMode === 'edit' && selectedPinId) {
      setPins(pins.map(p => p.id === selectedPinId ? { ...p, type: selectedPinType, comment: pinComment } : p));
    }
    closeModal();
  };

  const deletePin = () => {
    if (selectedPinId && deleteConfirmInput === "0000") {
      setPins(pins.filter(p => p.id !== selectedPinId));
      closeModal();
    }
  };

  const toggleFindPin = () => {
    if (selectedPinId) {
      setPins(prev => prev.map(p => p.id === selectedPinId ? { ...p, faded: !p.faded } : p));
    }
  };

  const handlePinClick = (e: React.MouseEvent, pin: MapPin) => {
    e.stopPropagation();
    setSelectedPinId(pin.id);
    setSelectedPinType(pin.type);
    setPinComment(pin.comment);
    setModalCoords({ imgX: pin.x, imgY: pin.y });
    setDeleteConfirmInput("");
    setModalMode(isAdmin ? 'edit' : 'info');
  };

  const handleLogoClick = () => {
    const now = Date.now();
    if (now - lastLogoClickTime.current > 1000) {
      logoClickCount.current = 1;
    } else {
      logoClickCount.current += 1;
    }
    lastLogoClickTime.current = now;

    if (logoClickCount.current >= 4) {
      setIsAdmin(!isAdmin);
      logoClickCount.current = 0;
    }
  };

  // CSV Data Management
  const downloadCSV = () => {
    const headers = ["Index", "Region Code", "Comment", "X", "Y", "Faded"];
    const rows = pins.map(pin => {
      const itemIndex = FILTER_ITEMS.find(f => f.name === pin.type)?.id || 0;
      return [itemIndex, 0, `"${pin.comment.replace(/"/g, '""')}"`, pin.x, pin.y, pin.faded]; 
    });

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    // UTF-8 BOM to prevent Korean character corruption in Excel
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    const now = new Date();
    const dateStr = now.getFullYear().toString() + 
                    (now.getMonth() + 1).toString().padStart(2, '0') + 
                    now.getDate().toString().padStart(2, '0');
    const timeStr = now.getHours().toString().padStart(2, '0') + 
                    now.getMinutes().toString().padStart(2, '0') + 
                    now.getSeconds().toString().padStart(2, '0');
    
    link.setAttribute("href", url);
    link.setAttribute("download", `DragonSwordMappinData_${dateStr}_${timeStr}.CSV`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to parse CSV lines with quoted fields
  const parseCSVLine = (line: string) => {
    const result = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(cur);
        cur = "";
      } else {
        cur += char;
      }
    }
    result.push(cur);
    return result;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      const startIdx = (lines[0].toLowerCase().includes("index")) ? 1 : 0;
      
      const newPins: MapPin[] = [];
      for (let i = startIdx; i < lines.length; i++) {
        const parts = parseCSVLine(lines[i]);
        if (parts.length < 5) continue;
        
        const itemIdx = parseInt(parts[0]);
        const comment = parts[2] || "";
        const x = parseInt(parts[3]);
        const y = parseInt(parts[4]);
        const faded = parts[5]?.trim().toLowerCase() === 'true';

        const filterItem = FILTER_ITEMS.find(f => f.id === itemIdx);
        if (filterItem) {
          newPins.push({
            id: (Date.now() + i).toString(),
            type: filterItem.name,
            x,
            y,
            comment,
            faded
          });
        }
      }

      if (newPins.length > 0) {
        setPins(prev => [...prev, ...newPins]);
      }
      
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  // Helper to calculate the most recent Monday 9:00 AM
  const getLastMonday9AM = () => {
    const now = new Date();
    const result = new Date(now);
    result.setHours(9, 0, 0, 0);
    
    // Day: 0 (Sun), 1 (Mon), ..., 6 (Sat)
    const day = now.getDay();
    const diffToMonday = (day + 6) % 7; 
    
    result.setDate(now.getDate() - diffToMonday);
    
    if (now.getTime() < result.getTime()) {
      result.setDate(result.getDate() - 7);
    }
    
    return result.getTime();
  };

  // Initial Load & Merging Logic
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
        let localPins: MapPin[] = localData ? JSON.parse(localData) : [];

        const lastResetStr = localStorage.getItem(RESET_TIMESTAMP_KEY);
        const lastResetTimestamp = lastResetStr ? parseInt(lastResetStr) : 0;
        const targetResetTime = getLastMonday9AM();

        if (lastResetTimestamp < targetResetTime) {
          const categoriesToReset = ["지역", "돌발"];
          localPins = localPins.map(pin => {
            if (categoriesToReset.includes(pin.type)) {
              return { ...pin, faded: false };
            }
            return pin;
          });
          localStorage.setItem(RESET_TIMESTAMP_KEY, Date.now().toString());
        }

        const response = await fetch(INITIAL_DATA_URL);
        const text = await response.text();
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        const startIdx = (lines[0].toLowerCase().includes("index")) ? 1 : 0;

        const remotePins: MapPin[] = [];
        for (let i = startIdx; i < lines.length; i++) {
          const parts = parseCSVLine(lines[i]);
          if (parts.length < 5) continue;
          
          const itemIdx = parseInt(parts[0]);
          const comment = parts[2] || "";
          const x = parseInt(parts[3]);
          const y = parseInt(parts[4]);
          const filterItem = FILTER_ITEMS.find(f => f.id === itemIdx);
          
          if (filterItem) {
            remotePins.push({
              id: `remote-${i}`,
              type: filterItem.name,
              x,
              y,
              comment,
              faded: false
            });
          }
        }

        const mergedPins: MapPin[] = remotePins.map(rp => {
          const localMatch = localPins.find(lp => lp.type === rp.type && lp.x === rp.x && lp.y === rp.y);
          return {
            ...rp,
            faded: localMatch ? localMatch.faded : rp.faded
          };
        });

        // Keep manually added pins (those without 'remote-' prefix)
        const manualPins = localPins.filter(lp => !lp.id.startsWith('remote-'));

        setPins([...mergedPins, ...manualPins]);

      } catch (error) {
        console.error("Failed to load initial map data:", error);
        const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (localData) setPins(JSON.parse(localData));
      }
    };

    loadInitialData();
  }, []);

  // Persistent Save
  useEffect(() => {
    if (pins.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pins));
    }
  }, [pins]);

  // Center Viewport Initially
  useEffect(() => {
    if (containerRef.current) {
      const { width: vW, height: vH } = containerRef.current.getBoundingClientRect();
      const initialScale = 1.0;
      const targetImgX = 830;
      const targetImgYFromTop = ORIG_HEIGHT - 1980;
      const startX = (vW / 2) - (targetImgX * initialScale);
      const startY = (vH / 2) - (targetImgYFromTop * initialScale);
      setPosition(clampPosition(startX, startY, initialScale));
      setScale(initialScale);
    }
  }, [clampPosition]);

  const selectedItemIcon = FILTER_ITEMS.find(i => i.name === selectedPinType)?.icon;

  const getPinCountDisplay = (name: string) => {
    const stats = pinStats[name];
    if (!stats) return "0";
    
    const specialCategories = ["지역", "돌발", "상자", "달열쇠", "미니게임", "퍼즐"];
    if (specialCategories.includes(name)) {
      return `${stats.found}/${stats.total}`;
    }
    return `${stats.total}`;
  };

  // Bulk Find Handlers
  const handleFilterMouseDown = (name: string) => {
    // Always create a timer for all filters to distinguish between click and long-press
    sidebarLongPressTimer.current = window.setTimeout(() => {
      const bulkCategories = ["지역", "돌발", "상자", "달열쇠", "미니게임", "퍼즐"];
      
      // Only process bulk logic if not Admin and in a supported category
      if (!isAdmin && bulkCategories.includes(name)) {
        const categoryPins = pins.filter(p => p.type === name);
        if (categoryPins.length > 0) {
          const allFound = categoryPins.every(p => p.faded);
          setBulkTargetCategory(name);
          setBulkAction(allFound ? 'reset' : 'find');
          setModalMode('bulk');
        }
      }
      
      // Nullifying signals to MouseUp that the 2s long-press action was handled (or skipped for non-bulk items)
      sidebarLongPressTimer.current = null;
    }, 2000);
  };

  const handleFilterMouseUp = (name: string) => {
    if (sidebarLongPressTimer.current !== null) {
      // It was a short press (less than 2s), so toggle the filter normally
      window.clearTimeout(sidebarLongPressTimer.current);
      sidebarLongPressTimer.current = null;
      toggleFilter(name);
    }
  };

  const handleFilterMouseLeave = () => {
    if (sidebarLongPressTimer.current) {
      window.clearTimeout(sidebarLongPressTimer.current);
      sidebarLongPressTimer.current = null;
    }
  };
  
  const executeBulkAction = () => {
    if (bulkTargetCategory && bulkAction) {
      const newState = bulkAction === 'find';
      setPins(prev => prev.map(p => p.type === bulkTargetCategory ? { ...p, faded: newState } : p));
      closeModal();
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-[#0d0d0d] overflow-hidden cursor-crosshair touch-none select-none"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Sidebar Trigger Button */}
      {!sidebarOpen && (
        <div className="absolute top-4 left-4 z-50 pointer-events-auto">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/30 w-10 h-10 flex items-center justify-center rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all active:scale-90"
          >
            <i className="fas fa-bars text-base"></i>
          </button>
        </div>
      )}

      {/* Sidebar (Left) */}
      <div className={`absolute top-0 left-0 h-full w-[255px] z-40 bg-black/50 backdrop-blur-lg border-r border-white/10 transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full shadow-none'} shadow-2xl flex flex-col pointer-events-auto`}>
        <div className="p-4 relative flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
          <button 
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90"
          >
            <i className="fas fa-angle-left text-lg"></i>
          </button>

          <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4 pr-10">
            <img 
              src={LOGO_IMAGE_URL} 
              alt="Logo" 
              className="w-7 h-7 rounded-md shadow-lg border border-white/20 cursor-default active:scale-95 transition-transform" 
              onClick={handleLogoClick}
            />
            <h1 className="text-white font-bold text-base tracking-wider truncate">드래곤소드</h1>
          </div>

          <div>
            {!isAdmin && (
              <div className="flex justify-end mb-2 pr-1">
                <button 
                  onClick={() => setHideFound(!hideFound)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[9px] font-bold transition-all ${
                    hideFound 
                      ? 'bg-orange-500/80 border-orange-400 text-white shadow-[0_0_8px_rgba(249,115,22,0.5)]' 
                      : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white/60'
                  }`}
                >
                  <i className={`fas ${hideFound ? 'fa-eye-slash' : 'fa-eye'} text-[8px]`}></i>
                  발견 숨기기
                </button>
              </div>
            )}
            <div className="flex items-center justify-between mb-3 pr-1">
              <div className="flex items-center gap-2">
                <div className="w-1 h-3 bg-blue-500 rounded-full"></div>
                <h2 className="text-white/60 text-[11px] font-bold uppercase tracking-widest">맵핀 필터</h2>
              </div>
              <button 
                onClick={toggleAll}
                className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-bold transition-all ${
                  isAllActive 
                    ? 'bg-blue-500/80 border-blue-400 text-white shadow-[0_0_8px_rgba(59,130,246,0.5)]' 
                    : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white/60'
                }`}
              >
                {isAllActive && <i className="fas fa-check text-[7px]"></i>}
                ALL
              </button>
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              {FILTER_ITEMS.map((item) => (
                <button
                  key={item.name}
                  onMouseDown={() => handleFilterMouseDown(item.name)}
                  onMouseUp={() => handleFilterMouseUp(item.name)}
                  onMouseLeave={handleFilterMouseLeave}
                  onTouchStart={(e) => { e.preventDefault(); handleFilterMouseDown(item.name); }}
                  onTouchEnd={(e) => { e.preventDefault(); handleFilterMouseUp(item.name); }}
                  className={`relative flex flex-col items-center justify-end h-14 rounded-lg border transition-all overflow-hidden ${
                    activeFilters.has(item.name) 
                      ? 'bg-blue-500/20 border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.3)]' 
                      : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  {/* Pin Count Badge */}
                  <div className={`absolute top-1 right-1 z-10 text-[7px] font-bold px-1 py-0.5 rounded leading-none ${
                    activeFilters.has(item.name) ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/40'
                  }`}>
                    {getPinCountDisplay(item.name)}
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center p-1 pointer-events-none">
                    <img 
                      src={item.icon} 
                      alt={item.name} 
                      className={`w-full h-full object-contain transition-all duration-300 ${
                        activeFilters.has(item.name) 
                          ? 'opacity-100 scale-100 brightness-110' 
                          : 'opacity-30 scale-90 grayscale-[40%] brightness-75'
                      }`} 
                    />
                  </div>
                  <span className={`relative z-10 text-[8.5px] font-bold text-center leading-tight truncate w-full px-0.5 py-0.5 transition-colors ${
                    activeFilters.has(item.name) 
                      ? 'text-blue-100 bg-blue-900/60' 
                      : 'text-white/60 bg-black/40'
                  }`}>
                    {item.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Data Management Section */}
        <div className="p-4 border-t border-white/10 bg-white/5 flex flex-col gap-4">
          {isAdmin && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-3 bg-green-500 rounded-full"></div>
                <h2 className="text-white/60 text-[11px] font-bold uppercase tracking-widest">데이터 관리</h2>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 py-2 rounded-lg text-white text-[10px] font-bold transition-all"
                >
                  <i className="fas fa-upload text-[9px]"></i>
                  불러오기
                </button>
                <button 
                  onClick={downloadCSV}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 py-2 rounded-lg text-white text-[10px] font-bold transition-all"
                >
                  <i className="fas fa-download text-[9px]"></i>
                  다운로드
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".csv" 
                  className="hidden" 
                />
              </div>
            </div>
          )}

          <div className="flex flex-col items-center gap-1">
            <div className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest border transition-colors ${
              isAdmin 
                ? 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.3)]' 
                : 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
            }`}>
              {isAdmin ? 'ADMIN MODE' : 'USER MODE'}
            </div>
            <div className="text-white/20 text-[13.5px] mt-1 font-medium tracking-tight">
              Duritz Creative © 2026
            </div>
          </div>
        </div>
      </div>

      {/* Custom Confirmation Layer (Modals) */}
      {modalMode && (
        <div 
          className="absolute inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" 
          onMouseDown={closeModal}
        >
          {modalMode === 'bulk' ? (
            <div 
              className="bg-[#1a1a1a]/95 border border-white/10 w-[280px] p-6 rounded-2xl shadow-2xl space-y-5 text-center" 
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-center h-12 w-12 bg-blue-500/10 border border-blue-500/30 rounded-full mx-auto mb-2">
                  <i className={`fas ${bulkAction === 'find' ? 'fa-check-double' : 'fa-rotate-left'} text-blue-400`}></i>
                </div>
                <h3 className="text-white font-bold text-base">
                  [{bulkTargetCategory}]
                </h3>
                <p className="text-white/60 text-xs leading-relaxed">
                  {bulkAction === 'find' 
                    ? "모든 항목을 일괄 Find 하겠습니까?" 
                    : "모든 항목을 일괄 Find 해제 하겠습니까?"}
                </p>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={closeModal}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white/60 font-bold py-2.5 rounded-xl text-xs transition-colors"
                >
                  취소
                </button>
                <button 
                  onClick={executeBulkAction}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                >
                  확인
                </button>
              </div>
            </div>
          ) : (
            <div 
              className="bg-[#1a1a1a]/95 border border-white/10 w-[300px] p-5 rounded-2xl shadow-2xl space-y-4" 
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <h3 className="text-white font-bold text-sm">
                  {modalMode === 'add' ? '맵핀 추가' : modalMode === 'edit' ? '맵핀 수정' : '맵핀 정보'}
                </h3>
                <span className="text-white/40 font-mono text-[10px]">({modalCoords.imgX}, {modalCoords.imgY})</span>
              </div>
              
              {modalMode !== 'info' ? (
                <>
                  <div 
                    className="grid grid-cols-4 gap-2 max-h-[160px] overflow-y-auto pr-1"
                    style={{
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none'
                    }}
                  >
                    <style>{`.grid-modal-list::-webkit-scrollbar { display: none; }`}</style>
                    <div className="grid grid-cols-4 gap-2 grid-modal-list w-full col-span-4">
                      {FILTER_ITEMS.map((item) => (
                        <button
                          key={item.name}
                          onClick={() => setSelectedPinType(item.name)}
                          className={`relative flex flex-col items-center justify-end h-12 rounded-lg border transition-all overflow-hidden ${
                            selectedPinType === item.name 
                              ? 'bg-blue-500/30 border-blue-500' 
                              : 'bg-white/5 border-white/5 hover:bg-white/10'
                          }`}
                        >
                          <div className="absolute inset-0 flex items-center justify-center p-1">
                            <img src={item.icon} alt={item.name} className="w-full h-full object-contain" />
                          </div>
                          <span className={`relative z-10 text-[8px] font-bold w-full text-center truncate px-0.5 py-0.5 ${selectedPinType === item.name ? 'text-white bg-blue-600/50' : 'text-white/40 bg-black/20'}`}>
                            {item.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-white/40 font-bold uppercase">코멘트</label>
                    <input 
                      type="text" 
                      value={pinComment}
                      onChange={(e) => setPinComment(e.target.value)}
                      placeholder="간략한 코멘트 입력..."
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-blue-500 transition-colors"
                      autoFocus
                    />
                  </div>

                  {modalMode === 'edit' && (
                    <div className="space-y-1.5 bg-red-900/10 p-2 rounded-lg border border-red-500/10">
                      <label className="text-[10px] text-red-400 font-bold uppercase block mb-1">삭제 확인 (0000 입력)</label>
                      <input 
                        type="text" 
                        value={deleteConfirmInput}
                        onChange={(e) => setDeleteConfirmInput(e.target.value)}
                        placeholder="0000 입력 시 삭제 가능"
                        className="w-full bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-red-500 transition-colors"
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4 py-2">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center p-2 shadow-inner">
                      <img src={selectedItemIcon} alt={selectedPinType} className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1">
                      <div className="text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-1">{selectedPinType}</div>
                      <div className="text-white text-sm font-medium leading-relaxed break-all">
                        {pinComment || "코멘트가 없습니다."}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button 
                  onClick={closeModal}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white/60 font-bold py-2 rounded-lg text-xs transition-colors"
                >
                  닫기
                </button>
                
                {modalMode === 'info' && (
                  <button 
                    onClick={() => {
                      toggleFindPin();
                      closeModal();
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-lg text-xs transition-all shadow-lg shadow-green-500/20 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <i className="fas fa-search"></i>
                    Find
                  </button>
                )}

                {modalMode === 'edit' && (
                  <button 
                    onClick={deletePin}
                    disabled={deleteConfirmInput !== "0000"}
                    className={`flex-1 font-bold py-2 rounded-lg text-xs transition-all border ${
                      deleteConfirmInput === "0000" 
                        ? 'bg-red-600 border-red-500 text-white hover:bg-red-500 shadow-lg shadow-red-500/20 cursor-pointer' 
                        : 'bg-red-900/20 border-red-500/20 text-red-400/30 cursor-not-allowed opacity-50'
                    }`}
                  >
                    삭제
                  </button>
                )}
                
                {(modalMode === 'add' || modalMode === 'edit') && (
                  <button 
                    onClick={savePin}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg text-xs transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                  >
                    확인
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Map Content */}
      <div 
        className="absolute transition-transform duration-75 ease-out"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: '0 0',
          width: ORIG_WIDTH,
          height: ORIG_HEIGHT,
        }}
      >
        <img 
          src={MAP_IMAGE_URL} 
          alt="Dragon Sword Map"
          className="w-full h-full pointer-events-none select-none"
          draggable={false}
          onLoad={() => setPosition(prev => clampPosition(prev.x, prev.y, scale))}
        />

        {/* Render Saved Pins */}
        {pins
          .filter(pin => {
            const isVisible = activeFilters.has(pin.type);
            if (!isVisible) return false;
            if (!isAdmin && hideFound && pin.faded) return false;
            return true;
          })
          .map(pin => {
            const filterItem = FILTER_ITEMS.find(i => i.name === pin.type);
            const icon = filterItem?.icon;
            const isFaded = isAdmin ? false : pin.faded;
            const currentPinSize = ["기억", "추억", "회상", "망각", "감자"].includes(pin.type) ? 20 : PIN_SIZE;
            
            return (
              <div 
                key={pin.id}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => handlePinClick(e, pin)}
                className={`absolute group z-20 cursor-pointer transition-all hover:scale-125 ${isFaded ? 'opacity-30' : 'opacity-100'}`}
                style={{
                  left: pin.x,
                  top: ORIG_HEIGHT - pin.y,
                  width: currentPinSize,
                  height: currentPinSize,
                  transform: `translate(-50%, -50%)`,
                }}
              >
                <img 
                  src={icon} 
                  className="w-full h-full object-contain drop-shadow-[0_0_3px_rgba(0,0,0,0.8)]"
                  alt={pin.type}
                />
                {isAdmin && !pin.faded && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block pointer-events-none z-50">
                    <div className="bg-black/90 text-white text-[10px] font-bold px-2 py-1 rounded border border-white/20 whitespace-nowrap shadow-xl">
                      {pin.comment || pin.type}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Simplified Unified Display (Bottom Right) */}
      <div className="absolute bottom-6 right-6 z-30 pointer-events-none">
        <div className="bg-black/70 backdrop-blur-md border border-white/10 px-5 py-1.5 rounded-full shadow-2xl flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-blue-400 font-bold text-[9px] uppercase tracking-wider">Zoom</span>
            <span className="text-white font-mono text-base leading-none">{Math.round(scale * 100)}%</span>
          </div>
          <div className="w-px h-3 bg-white/10"></div>
          <div className="flex items-center gap-1.5">
            <span className="text-blue-400 font-bold text-[9px] uppercase tracking-wider">X</span>
            <span className="text-white font-mono text-base leading-none">{mouseCoords.x.toLocaleString()}</span>
          </div>
          <div className="w-px h-3 bg-white/10"></div>
          <div className="flex items-center gap-1.5">
            <span className="text-blue-400 font-bold text-[9px] uppercase tracking-wider">Y</span>
            <span className="text-white font-mono text-base leading-none">{mouseCoords.y.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Drag Overlay Feedback */}
      {isDragging && (
        <div className="absolute inset-0 z-10 cursor-grabbing bg-transparent" />
      )}
    </div>
  );
};

export default App;
