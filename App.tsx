
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { Compass, ChevronLeft, ChevronRight, Trash2, X, AlertCircle, Lock, Layers, Shield, User as UserIcon, Download, Upload, Copy, Check, Search, FileText, Loader2, HelpCircle } from 'lucide-react';
import { LOCATIONS, DEFAULT_MAP_IMAGE, PIN_IMAGES } from './constants';
import { Location, CustomPin, PinType } from './types';
import MapMarker from './components/MapMarker';
import CustomMarker from './components/CustomMarker';

const PIN_TYPES: { type: PinType; label: string; color: string }[] = [
  // 1열: 지역, 돌발, 마멋, 퍼즐
  { type: '퀘', label: '지역', color: 'bg-sky-500' },
  { type: '토', label: '돌발', color: 'bg-rose-500' },
  { type: '도', label: '마멋', color: 'bg-purple-500' },
  { type: '퍼', label: '퍼즐', color: 'bg-indigo-500' },
  // 2열: 달열쇠, 상자, 새알, 감자
  { type: '달', label: '달열쇠', color: 'bg-amber-400' },
  { type: '아', label: '상자', color: 'bg-emerald-500' },
  { type: '새', label: '새알', color: 'bg-orange-500' },
  { type: '감', label: '감자', color: 'bg-yellow-600' },
  // 3열: 기억, 추억, 회상, 망각
  { type: '기', label: '기억', color: 'bg-cyan-500' },
  { type: '추', label: '추억', color: 'bg-pink-500' },
  { type: '회', label: '회상', color: 'bg-blue-500' },
  { type: '망', label: '망각', color: 'bg-gray-500' },
  // 4열: 생기, 태고, 순수, 활력
  { type: '생', label: '생기', color: 'bg-emerald-400' },
  { type: '태', label: '태고', color: 'bg-amber-700' },
  { type: '순', label: '순수', color: 'bg-sky-300' },
  { type: '활', label: '활력', color: 'bg-lime-500' },
];

const MASS_ACTION_TYPES: PinType[] = ['퀘', '토', '도', '달', '아', '퍼'];
const NO_COMMENT_TYPES: PinType[] = ['감', '기', '추', '회', '망', '생', '태', '순', '활'];

const ADMIN_HASH = "MTAwNTE=";
const STORAGE_KEY = 'dragon_sword_custom_pins';
const FADED_STORAGE_KEY = 'dragon_sword_faded_pins';
const RESET_STORAGE_KEY = 'dragon_sword_last_weekly_reset';

// 공식 데이터 URL (Raw 버전)
const RELEASE_DATA_URL = "https://raw.githubusercontent.com/Duritz-Labs/DragonSwordMaps/main/MapData_Relese/dragonsword_pins_Relese.csv";

const getFadedKey = (pin: CustomPin | { type: PinType, x: number, y: number }) => {
  return `${pin.type}_${pin.x.toFixed(3)}_${pin.y.toFixed(3)}`;
};

const getLastMonday9AM = (now: Date) => {
  const d = new Date(now);
  d.setHours(9, 0, 0, 0);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  if (d.getTime() > now.getTime()) {
    d.setDate(d.getDate() - 7);
  }
  return d.getTime();
};

const App: React.FC = () => {
  const [entryMode, setEntryMode] = useState<'NONE' | 'USER' | 'ADMIN'>('NONE');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [mapLoading, setMapLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedFilters, setSelectedFilters] = useState<PinType[]>([]);
  
  const [customPins, setCustomPins] = useState<CustomPin[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    try {
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [fadedPinKeys, setFadedPinKeys] = useState<string[]>(() => {
    const saved = localStorage.getItem(FADED_STORAGE_KEY);
    try {
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [massActionTarget, setMassActionTarget] = useState<{ type: PinType; status: 'COMPLETE' | 'RESET' } | null>(null);
  const filterLongPressTimer = useRef<number | null>(null);

  // 원격 데이터 동기화 함수
  const syncReleaseData = async () => {
    setSyncing(true);
    try {
      const response = await fetch(RELEASE_DATA_URL);
      if (!response.ok) throw new Error("데이터를 불러올 수 없습니다.");
      const text = await response.text();
      const lines = text.split('\n');
      
      const newPins: CustomPin[] = [];
      const newFadedKeys: string[] = [];
      const existingKeys = new Set(customPins.map(p => getFadedKey(p)));

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const matches = line.match(/([^,]+),"?(.*?)"?,([-?\d.]+),([-?\d.]+),?(true|false)?/i);
        if (matches) {
          const [, typeStr, comment, xStr, yStr, fadedStr] = matches;
          const type = typeStr as PinType;
          const x = parseFloat(xStr);
          const y = parseFloat(yStr);
          const isFadedInCSV = fadedStr?.toLowerCase() === 'true';
          const key = getFadedKey({ type, x, y });

          // 기존에 없는 핀만 추가
          if (!existingKeys.has(key)) {
            const newPin = {
              id: Math.random().toString(36).substr(2, 9),
              type,
              comment: comment.replace(/""/g, '"'),
              x, y, createdAt: Date.now()
            };
            newPins.push(newPin);
            // CSV에 탐색완료 상태인 경우에만 추가
            if (isFadedInCSV) newFadedKeys.push(key);
          }
        }
      }

      if (newPins.length > 0) {
        setCustomPins(prev => [...prev, ...newPins]);
        // 기존 사용자의 fadedPinKeys에 CSV에서 새로 가져온 탐색완료 키 합치기
        setFadedPinKeys(prev => Array.from(new Set([...prev, ...newFadedKeys])));
        showSuccess(`최신 데이터 ${newPins.length}개가 동기화되었습니다.`);
      }
    } catch (err) {
      console.error("Sync Error:", err);
      showAlert("최신 데이터 동기화에 실패했습니다.");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const checkWeeklyReset = () => {
      const now = new Date();
      const lastMonday9AM = getLastMonday9AM(now);
      const lastResetStr = localStorage.getItem(RESET_STORAGE_KEY);
      const lastResetTime = lastResetStr ? parseInt(lastResetStr, 10) : 0;

      if (lastResetTime < lastMonday9AM) {
        setFadedPinKeys(prev => {
          const newFaded = prev.filter(key => !key.startsWith('퀘_') && !key.startsWith('토_'));
          localStorage.setItem(FADED_STORAGE_KEY, JSON.stringify(newFaded));
          return newFaded;
        });
        localStorage.setItem(RESET_STORAGE_KEY, lastMonday9AM.toString());
        showSuccess("주간 탐색 정보가 갱신되었습니다 (지역, 돌발)");
      }
    };

    if (entryMode !== 'NONE') {
      checkWeeklyReset();
      syncReleaseData(); // 입장 시 자동 동기화
    }
  }, [entryMode]);

  useEffect(() => {
    localStorage.setItem(FADED_STORAGE_KEY, JSON.stringify(fadedPinKeys));
  }, [fadedPinKeys]);
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customPins));
  }, [customPins]);

  const toggleFilter = (type: PinType) => {
    setSelectedFilters(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type) 
        : [...prev, type]
    );
  };

  const filteredPins = selectedFilters.length === 0 
    ? customPins 
    : customPins.filter(pin => selectedFilters.includes(pin.type));

  const [pendingPin, setPendingPin] = useState<{ x: number, y: number, xPct: number, yPct: number } | null>(null);
  const [editingPin, setEditingPin] = useState<CustomPin | null>(null);
  const [infoPin, setInfoPin] = useState<CustomPin | null>(null);

  const [activePinType, setActivePinType] = useState<PinType | null>(null);
  const [pinComment, setPinComment] = useState('');
  
  const [deletingPinId, setDeletingPinId] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [mouseCoords, setMouseCoords] = useState<{ x: number; y: number } | null>(null);
  const transformComponentRef = useRef<ReactZoomPanPinchRef>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const isInitialCenterDone = useRef(false);
  const longPressTimer = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const CANVAS_WIDTH = 2600;
  const CANVAS_HEIGHT = 3500;
  const SIDEBAR_WIDTH = 320;

  const validatePassword = (input: string) => {
    if (!input) return false;
    try {
      return btoa(input.trim()) === ADMIN_HASH;
    } catch (e) {
      return false;
    }
  };

  const handleLocationClick = useCallback((loc: Location) => {
    setSelectedLocationId(loc.id);
    if (transformComponentRef.current) {
      const zoomLevel = 1.4;
      const targetX = (loc.x / 100) * CANVAS_WIDTH;
      const targetXCenter = targetX * zoomLevel;
      const currentSidebarWidth = isSidebarOpen ? SIDEBAR_WIDTH : 0;
      const visibleWidth = window.innerWidth - currentSidebarWidth;
      const x = -(targetXCenter - (visibleWidth / 2 + currentSidebarWidth));
      const y = -( (loc.y / 100) * CANVAS_HEIGHT * zoomLevel - window.innerHeight / 2);
      transformComponentRef.current.setTransform(x, y, zoomLevel, 800, "easeOut");
    }
  }, [isSidebarOpen]);

  useEffect(() => {
    if (entryMode === 'NONE' || mapLoading) {
      isInitialCenterDone.current = false;
      return;
    }
    if (isInitialCenterDone.current) return;
    const orbis = LOCATIONS.find(l => l.id === 'orbis');
    if (orbis) {
      setTimeout(() => {
        if (transformComponentRef.current) {
          handleLocationClick(orbis);
          isInitialCenterDone.current = true;
        }
      }, 500);
    }
  }, [handleLocationClick, entryMode, mapLoading]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const state = transformComponentRef.current?.instance.transformState;
    if (!state) return;
    const localX = (e.clientX - rect.left) / state.scale;
    const localY = (e.clientY - rect.top) / state.scale;
    const x = Math.max(0, Math.min(CANVAS_WIDTH, Math.round(localX)));
    const y = Math.max(0, Math.min(CANVAS_HEIGHT, Math.round(CANVAS_HEIGHT - localY)));
    setMouseCoords({ x, y });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (entryMode !== 'ADMIN' || mapLoading) return;
    if (pendingPin || deletingPinId || editingPin) return;
    const startX = e.clientX;
    const startY = e.clientY;
    longPressTimer.current = window.setTimeout(() => {
      if (!mapRef.current) return;
      const rect = mapRef.current.getBoundingClientRect();
      const state = transformComponentRef.current?.instance.transformState;
      if (!state) return;
      const clickX = (startX - rect.left) / state.scale;
      const clickY = (startY - rect.top) / state.scale;
      setPendingPin({
        x: clickX, y: clickY,
        xPct: (clickX / CANVAS_WIDTH) * 100,
        yPct: (clickY / CANVAS_HEIGHT) * 100
      });
      setActivePinType(null);
      setPinComment('');
      longPressTimer.current = null;
    }, 1000);
  };

  const handleMouseUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleFilterPointerDown = (type: PinType) => {
    if (entryMode !== 'USER' || !MASS_ACTION_TYPES.includes(type)) return;
    
    filterLongPressTimer.current = window.setTimeout(() => {
      const typePins = customPins.filter(p => p.type === type);
      if (typePins.length === 0) return;

      const foundCount = typePins.filter(p => fadedPinKeys.includes(getFadedKey(p))).length;
      const isAllFound = foundCount === typePins.length;

      setMassActionTarget({
        type,
        status: isAllFound ? 'RESET' : 'COMPLETE'
      });
      filterLongPressTimer.current = null;
    }, 2000);
  };

  const handleFilterPointerUp = () => {
    if (filterLongPressTimer.current) {
      clearTimeout(filterLongPressTimer.current);
      filterLongPressTimer.current = null;
    }
  };

  const executeMassAction = () => {
    if (!massActionTarget) return;
    const { type, status } = massActionTarget;
    const typePins = customPins.filter(p => p.type === type);
    const keysToUpdate = typePins.map(p => getFadedKey(p));

    if (status === 'COMPLETE') {
      setFadedPinKeys(prev => Array.from(new Set([...prev, ...keysToUpdate])));
      showSuccess(`${PIN_TYPES.find(t => t.type === type)?.label} 전체가 탐색 완료되었습니다.`);
    } else {
      setFadedPinKeys(prev => prev.filter(k => !keysToUpdate.includes(k)));
      showSuccess(`${PIN_TYPES.find(t => t.type === type)?.label} 전체 탐색이 취소되었습니다.`);
    }
    setMassActionTarget(null);
  };

  const showAlert = (msg: string) => {
    setAlertMessage(msg);
    setTimeout(() => setAlertMessage(null), 3000);
  };

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const createPin = () => {
    if (!pendingPin || !activePinType) return;
    const newPin: CustomPin = {
      id: Math.random().toString(36).substr(2, 9),
      type: activePinType,
      comment: NO_COMMENT_TYPES.includes(activePinType) ? '' : pinComment,
      x: pendingPin.xPct,
      y: pendingPin.yPct,
      createdAt: Date.now()
    };
    setCustomPins(prev => [...prev, newPin]);
    setPendingPin(null);
    setActivePinType(null);
    setPinComment('');
    showSuccess("새로운 맵핀이 등록되었습니다.");
  };

  const startEditPin = (pin: CustomPin) => {
    setEditingPin(pin);
    setActivePinType(pin.type);
    setPinComment(pin.comment);
  };

  const updatePin = () => {
    if (!editingPin || !activePinType) return;
    setCustomPins(prev => prev.map(p => 
      p.id === editingPin.id 
        ? { ...p, type: activePinType, comment: NO_COMMENT_TYPES.includes(activePinType) ? '' : pinComment }
        : p
    ));
    setEditingPin(null);
    setActivePinType(null);
    setPinComment('');
    showSuccess("맵핀 정보가 수정되었습니다.");
  };

  const toggleFindPin = (pin: CustomPin) => {
    const key = getFadedKey(pin);
    setFadedPinKeys(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key) 
        : [...prev, key]
    );
    if (!fadedPinKeys.includes(key)) {
      showSuccess("탐색 완료! 핀이 흐려집니다.");
    }
    setInfoPin(null);
  };

  const requestDeletePin = (id: string) => {
    if (entryMode !== 'ADMIN') return;
    setDeletingPinId(id);
    setDeletePassword('');
  };

  const confirmDeletePin = () => {
    if (validatePassword(deletePassword)) {
      setCustomPins(prev => prev.filter(p => p.id !== deletingPinId));
      setDeletingPinId(null);
      setDeletePassword('');
      showSuccess("맵핀이 삭제되었습니다.");
    } else {
      showAlert("관리자 비밀번호가 틀립니다.");
    }
  };

  const handleAdminLogin = () => {
    if (validatePassword(loginPassword)) {
      setEntryMode('ADMIN');
      setShowLoginPassword(false);
      setLoginPassword('');
    } else {
      showAlert("관리자 비밀번호가 틀립니다.");
    }
  };

  const exportCSV = () => {
    if (customPins.length === 0) {
      showAlert("내보낼 맵핀 데이터가 없습니다.");
      return;
    }
    let csvContent = "type,comment,x,y,faded\n";
    customPins.forEach(pin => {
      const isFaded = fadedPinKeys.includes(getFadedKey(pin));
      const comment = `"${(pin.comment || '').replace(/"/g, '""')}"`;
      csvContent += `${pin.type},${comment},${pin.x},${pin.y},${isFaded}\n`;
    });
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:T]/g, '').split('.')[0];
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `dragonsword_pins_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess("탐색 상태를 포함한 CSV 파일이 다운로드되었습니다.");
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      try {
        const lines = text.split('\n');
        const newPins: CustomPin[] = [];
        const newFadedKeys: string[] = [];
        const existingKeys = new Set(customPins.map(p => getFadedKey(p)));
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const matches = line.match(/([^,]+),"?(.*?)"?,([-?\d.]+),([-?\d.]+),?(true|false)?/i);
          if (matches) {
            const [, typeStr, comment, xStr, yStr, fadedStr] = matches;
            const type = typeStr as PinType;
            const x = parseFloat(xStr);
            const y = parseFloat(yStr);
            const isFaded = fadedStr?.toLowerCase() === 'true';
            const key = getFadedKey({ type, x, y });
            if (!existingKeys.has(key)) {
              const newPin = {
                id: Math.random().toString(36).substr(2, 9),
                type,
                comment: comment.replace(/""/g, '"'),
                x, y, createdAt: Date.now()
              };
              newPins.push(newPin);
              if (isFaded) newFadedKeys.push(key);
            }
          }
        }
        if (newPins.length > 0) {
          setCustomPins(prev => [...prev, ...newPins]);
          setFadedPinKeys(prev => Array.from(new Set([...prev, ...newFadedKeys])));
          showSuccess(`${newPins.length}개의 신규 맵핀과 탐색 정보가 병합되었습니다.`);
        } else {
          showAlert("이미 모든 핀 정보를 보유하고 있거나 유효한 데이터가 없습니다.");
        }
      } catch (err) {
        showAlert("파일 형식이 잘못되었습니다.");
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  if (entryMode === 'NONE') {
    return (
      <div className="relative h-screen w-screen flex items-center justify-center bg-[#020617] overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none scale-110 blur-sm">
          <img src={DEFAULT_MAP_IMAGE} alt="BG" className="w-full h-full object-cover" />
        </div>
        {alertMessage && (
          <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 duration-300">
            <div className="bg-rose-600/90 backdrop-blur-md px-6 py-3 rounded-full border border-rose-400/50 shadow-lg flex items-center gap-3">
              <AlertCircle size={20} className="text-white" />
              <span className="text-sm font-bold text-white">{alertMessage}</span>
            </div>
          </div>
        )}
        <div className="relative z-10 flex flex-col items-center max-w-sm w-full p-8 text-center space-y-8 animate-in fade-in zoom-in duration-1000">
          <div className="space-y-4">
            <div className="w-24 h-24 mx-auto rounded-3xl overflow-hidden border-2 border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.3)] bg-slate-900 flex items-center justify-center">
              <img src="https://i.ibb.co/j9sZB1Hk/main-icon.webp" alt="Icon" className="w-full h-full object-cover" />
            </div>
            <div className="space-y-1">
              <h1 className="font-fantasy text-3xl font-bold text-amber-100 tracking-[0.2em]">DRAGON SWORD</h1>
              <p className="text-amber-500/80 font-bold tracking-[0.5em] text-sm uppercase">Maps</p>
            </div>
          </div>
          {!showLoginPassword ? (
            <div className="w-full flex flex-col items-center space-y-3">
              <button onClick={() => setEntryMode('USER')} className="group relative px-6 py-3 bg-slate-900/80 border border-white/10 rounded-2xl hover:border-amber-500/50 hover:bg-amber-500/10 transition-all flex items-center gap-4 min-w-[200px]">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-amber-400 transition-colors shrink-0">
                  <UserIcon size={20} />
                </div>
                <div className="text-left">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">입장하기</p>
                  <p className="text-base font-bold text-white tracking-tight">일반유저</p>
                </div>
              </button>
              <button onClick={() => setShowLoginPassword(true)} className="group relative px-6 py-3 bg-slate-900/80 border border-white/10 rounded-2xl hover:border-amber-500/50 hover:bg-amber-500/10 transition-all flex items-center gap-4 min-w-[200px]">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-amber-400 transition-colors shrink-0">
                  <Shield size={20} />
                </div>
                <div className="text-left">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">제작/수정</p>
                  <p className="text-base font-bold text-white tracking-tight">관리자</p>
                </div>
              </button>
            </div>
          ) : (
            <div className="w-full p-6 bg-slate-900/90 border border-amber-500/30 rounded-3xl space-y-5 animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-sm font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
                  <Lock size={16} /> 관리자 인증
                </span>
                <button onClick={() => { setShowLoginPassword(false); setLoginPassword(''); }} className="text-slate-500 hover:text-white">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] text-slate-400 flex items-center gap-1 uppercase tracking-wider font-bold">비밀번호</label>
                  <input autoFocus type="password" maxLength={5} placeholder="숫자 5자리" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value.replace(/[^0-9]/g, ''))} onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()} className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 tracking-[0.6em] font-mono text-center transition-all" />
                </div>
                <button onClick={handleAdminLogin} disabled={loginPassword.length < 5} className="w-full py-4 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95">입장</button>
              </div>
            </div>
          )}
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] opacity-40">Duritz Creative © 2026</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#020617] select-none text-slate-200">
      <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileImport} className="hidden" />

      {(mapLoading || syncing) && (
        <div className="fixed inset-0 z-[100] bg-[#020617] flex flex-col items-center justify-center transition-opacity duration-1000">
          <div className="relative flex items-center justify-center">
            <div className="w-24 h-24 border-t-2 border-b-2 border-amber-500/50 rounded-full animate-spin"></div>
            <div className="absolute w-2 h-2 bg-amber-400 rounded-full orbit-dot"></div>
            <Compass className="absolute text-amber-500/50 animate-pulse" size={32} />
          </div>
          <div className="mt-8 space-y-2 text-center">
            <h2 className="font-fantasy text-xl text-amber-100 tracking-[0.3em] animate-pulse uppercase">
              {syncing ? "데이터 동기화 중..." : "지도 데이터를 불러오는 중..."}
            </h2>
            <p className="text-[10px] text-amber-500/60 font-bold uppercase tracking-widest">
              {syncing ? "대현자의 기록을 불러오고 있습니다" : "대륙의 전경을 캔버스에 그리는 중입니다"}
            </p>
          </div>
        </div>
      )}

      {alertMessage && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[110] animate-in slide-in-from-top-4 duration-300">
          <div className="bg-rose-600/90 backdrop-blur-md px-6 py-3 rounded-full border border-rose-400/50 shadow-lg flex items-center gap-3">
            <AlertCircle size={20} className="text-white" />
            <span className="text-sm font-bold text-white">{alertMessage}</span>
          </div>
        </div>
      )}
      {successMessage && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[110] animate-in slide-in-from-top-4 duration-300">
          <div className="bg-emerald-600/90 backdrop-blur-md px-6 py-3 rounded-full border border-emerald-400/50 shadow-lg flex items-center gap-3">
            <Check size={20} className="text-white" />
            <span className="text-sm font-bold text-white">{successMessage}</span>
          </div>
        </div>
      )}

      <aside className={`fixed inset-y-0 left-0 w-80 bg-slate-950/70 backdrop-blur-xl border-r border-amber-500/20 flex flex-col shadow-[20px_0_50px_rgba(0,0,0,0.5)] z-40 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="absolute top-1/2 -right-10 -translate-y-1/2 pointer-events-none">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="w-10 h-24 bg-slate-950/70 backdrop-blur-xl border border-amber-500/20 border-l-0 rounded-r-2xl flex items-center justify-center cursor-pointer pointer-events-auto hover:bg-slate-900/90 transition-all group shadow-lg">
            {isSidebarOpen ? <ChevronLeft className="text-amber-500/70 group-hover:text-amber-400" size={24} /> : <ChevronRight className="text-amber-500/70 group-hover:text-amber-400" size={24} />}
          </button>
        </div>
        <div className="h-full flex flex-col p-6 overflow-hidden">
          <div className="flex items-center gap-3 mb-8"><div className="w-10 h-10 rounded-lg overflow-hidden border border-amber-500/30 shadow-lg flex items-center justify-center shrink-0"><img src="https://i.ibb.co/j9sZB1Hk/main-icon.webp" alt="Icon" className="w-full h-full object-cover" /></div><h1 className="font-fantasy text-2xl font-bold text-amber-100 tracking-tighter">드래곤소드</h1></div>
          
          <div className="flex-none mb-6">
            <div className="flex items-center justify-between mb-3 border-b border-amber-500/10 pb-2">
              <p className="text-[11px] text-amber-500/80 font-bold uppercase tracking-[0.2em] flex items-center gap-2"><Layers size={12} /> 맵핀 필터</p>
              {entryMode === 'USER' && (
                <div className="text-[9px] text-slate-500 flex items-center gap-1 group relative cursor-help">
                  <HelpCircle size={10} />
                  <span>롱프레스 도움말</span>
                  <div className="absolute bottom-full right-0 mb-2 w-48 bg-slate-900 border border-white/10 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-[10px] text-slate-300 shadow-2xl leading-relaxed">
                    필터 버튼을 2초간 꾹 누르면 해당 타입의 핀들을 한 번에 탐색 완료/취소할 수 있습니다.
                  </div>
                </div>
              )}
            </div>
            {/* 그리드 설정을 4열로 변경 */}
            <div className="grid grid-cols-4 gap-1.5 w-full">
              {/* ALL 버튼을 첫 번째 행 전체 너비로 설정하고 높이를 절반으로 줄임 */}
              <button 
                onClick={() => setSelectedFilters([])} 
                className={`col-span-4 relative flex flex-col items-center justify-center py-1 rounded-lg text-[11px] font-bold border transition-all text-center overflow-hidden ${selectedFilters.length === 0 ? 'bg-amber-600/30 border-amber-400 text-amber-100 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-slate-800/40 border-white/5 text-slate-500 hover:text-slate-300'}`}
              >
                <span className="relative z-10">ALL</span>
              </button>
              {PIN_TYPES.map(pt => {
                const totalCount = customPins.filter(p => p.type === pt.type).length;
                const foundCount = customPins.filter(p => p.type === pt.type && fadedPinKeys.includes(getFadedKey(p))).length;
                const hideBadge = ['새', '감', '기', '추', '회', '망', '생', '태', '순', '활'].includes(pt.type);
                
                return (
                  <button 
                    key={pt.type} 
                    onClick={() => toggleFilter(pt.type)} 
                    onPointerDown={() => handleFilterPointerDown(pt.type)}
                    onPointerUp={handleFilterPointerUp}
                    onPointerLeave={handleFilterPointerUp}
                    className={`relative flex flex-col items-center justify-center aspect-square rounded-lg border transition-all overflow-hidden touch-none ${selectedFilters.includes(pt.type) ? 'border-amber-400 shadow-lg scale-[1.02]' : 'border-white/5 opacity-70 hover:opacity-100'}`}
                  >
                    <img src={PIN_IMAGES[pt.type]} alt={pt.label} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 w-full h-1/3 bg-black/60 flex items-center justify-center px-0.5">
                      <span className="text-[11px] font-bold text-white truncate w-full text-center tracking-tighter">{pt.label}</span>
                    </div>
                    {totalCount > 0 && !hideBadge && (
                      <div className="absolute top-0 right-0 bg-amber-500/90 text-white text-[8px] font-black px-1 py-0.5 rounded-bl-md border-l border-b border-amber-600/50 shadow-sm z-20">
                        {entryMode === 'USER' ? `${foundCount}/${totalCount}` : totalCount}
                      </div>
                    )}
                    {selectedFilters.includes(pt.type) && (
                      <div className="absolute inset-0 ring-2 ring-inset ring-amber-400/50 pointer-events-none" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="flex-none mb-2"><p className="text-[11px] text-amber-500/80 font-bold uppercase tracking-[0.2em] mb-3 border-b border-amber-500/10 pb-2">주요 지역</p></div>
          <div className="flex-1 overflow-y-auto pr-1 mb-6 grid grid-cols-3 gap-2 scrollbar-thin scrollbar-thumb-amber-600/40 scrollbar-track-transparent">
            {LOCATIONS.map(loc => (
              <button key={loc.id} onClick={() => handleLocationClick(loc)} className={`w-full h-11 flex items-center justify-center px-1 rounded-lg border transition-all duration-200 group ${selectedLocationId === loc.id ? 'bg-amber-600/20 border-amber-500/40 text-amber-100 shadow-[inset_0_0_10px_rgba(245,158,11,0.05)]' : 'bg-transparent border-white/10 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'}`}>
                <span className="text-[10px] font-medium leading-tight text-center break-keep">{loc.name}</span>
              </button>
            ))}
          </div>

          {entryMode === 'ADMIN' && (
            <div className="flex-none mt-4 mb-6">
              <p className="text-[11px] text-amber-500/80 font-bold uppercase tracking-[0.2em] mb-3 border-b border-amber-500/10 pb-2 flex items-center gap-2">
                <Layers size={12} /> 맵핀 관리
              </p>
              <div className={`grid grid-cols-2 gap-2`}>
                <button onClick={() => fileInputRef.current?.click()} className="flex flex-row items-center justify-center py-2.5 px-2 bg-slate-800/50 border border-white/10 rounded-xl hover:bg-slate-800 transition-all gap-1.5 group">
                  <Upload size={14} className="text-slate-400 group-hover:text-white shrink-0" />
                  <span className="text-[11px] font-bold text-slate-400 group-hover:text-white whitespace-nowrap">불러오기</span>
                </button>
                <button onClick={exportCSV} className="flex flex-row items-center justify-center py-2.5 px-2 bg-amber-600/10 border border-amber-500/30 rounded-xl hover:bg-amber-600/20 transition-all gap-1.5 group">
                  <FileText size={14} className="text-amber-500 group-hover:scale-110 shrink-0" />
                  <span className="text-[11px] font-bold text-amber-200 whitespace-nowrap">내보내기</span>
                </button>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-white/10 mt-auto flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold tracking-widest uppercase">{entryMode === 'ADMIN' ? <><Shield size={10} className="text-amber-500" /><span className="text-amber-500/80">Admin Mode</span></> : <><UserIcon size={10} /><span className="text-slate-500">User Mode</span></>}</div>
            <button onClick={() => { setEntryMode('NONE'); setMapLoading(true); setShowLoginPassword(false); setLoginPassword(''); setSelectedLocationId(null); isInitialCenterDone.current = false; }} className="text-[9px] text-slate-600 hover:text-slate-400 underline decoration-slate-800">모드 변경하기</button>
          </div>
        </div>
      </aside>

      <main className={`h-full w-full relative overflow-hidden transition-opacity duration-1000 ${mapLoading ? 'opacity-0' : 'opacity-100'}`}>
        <TransformWrapper ref={transformComponentRef} initialScale={0.75} minScale={0.4} maxScale={4} limitToBounds={true} disabled={!!pendingPin || !!deletingPinId || !!editingPin || !!infoPin || !!massActionTarget}>
          {() => (
            <TransformComponent wrapperStyle={{ width: '100vw', height: '100vh' }} contentStyle={{ width: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT}px` }}>
              <div ref={mapRef} className={`relative w-full h-full bg-[#0d1117] overflow-hidden cursor-grab active:cursor-grabbing`} onMouseMove={handleMouseMove} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
                <img src={DEFAULT_MAP_IMAGE} alt="Map" className="absolute inset-0 w-full h-full object-fill pointer-events-none" fetchpriority="high" decoding="async" onLoad={() => setMapLoading(false)} />
                {!mapLoading && (
                  <>
                    <div className="absolute inset-0 w-full h-full pointer-events-none">
                      {LOCATIONS.map((loc) => (
                        <div key={loc.id} className="pointer-events-auto">
                          <MapMarker x={loc.x} y={loc.y} isSelected={selectedLocationId === loc.id} onClick={() => handleLocationClick(loc)} />
                        </div>
                      ))}
                    </div>
                    <div className="absolute inset-0 w-full h-full pointer-events-none">
                      {filteredPins.map((pin) => (
                        <CustomMarker 
                          key={pin.id} type={pin.type} comment={pin.comment} x={pin.x} y={pin.y} isAdmin={entryMode === 'ADMIN'} 
                          isFaded={entryMode === 'USER' && fadedPinKeys.includes(getFadedKey(pin))} onDelete={() => requestDeletePin(pin.id)} 
                          onClick={() => { 
                            if (entryMode === 'ADMIN') {
                              startEditPin(pin);
                            } else {
                              if (!NO_COMMENT_TYPES.includes(pin.type) || pin.type === '새') {
                                setInfoPin(pin);
                              }
                            }
                          }}
                        />
                      ))}
                    </div>
                    {pendingPin && (
                       <div className="absolute z-30 -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-pulse" style={{ left: `${pendingPin.xPct}%`, top: `${pendingPin.yPct}%` }}>
                         <div className="w-8 h-8 rounded-full border-4 border-amber-500/50 bg-amber-500/20 flex items-center justify-center"><div className="w-1 h-1 bg-amber-500 rounded-full"></div></div>
                       </div>
                    )}
                  </>
                )}
              </div>
            </TransformComponent>
          )}
        </TransformWrapper>
        {mouseCoords && !pendingPin && !mapLoading && (
          <div className="absolute bottom-8 right-8 z-40 bg-slate-950/90 backdrop-blur-xl px-4 py-2 rounded-xl border border-amber-500/20 text-amber-200 text-xs font-mono pointer-events-none">X: {mouseCoords.x} Y: {mouseCoords.y}</div>
        )}
      </main>
      
      {massActionTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] w-[360px] space-y-8">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-3xl overflow-hidden border-2 border-amber-500/40 bg-slate-950 p-2">
                <img src={PIN_IMAGES[massActionTarget.type]} alt="Target" className="w-full h-full object-contain" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-fantasy font-bold text-amber-100 tracking-wider">
                  {PIN_TYPES.find(t => t.type === massActionTarget.type)?.label} 맵핀 일괄 처리
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed font-medium">
                  해당 맵핀 전체를 <span className={massActionTarget.status === 'COMPLETE' ? "text-emerald-400" : "text-rose-400"}>
                    {massActionTarget.status === 'COMPLETE' ? "탐색완료" : "탐색취소"}
                  </span> 처리 하시겠습니까?
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setMassActionTarget(null)} className="py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl transition-all shadow-lg active:scale-95">아니오</button>
              <button onClick={executeMassAction} className="py-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-2xl transition-all shadow-lg active:scale-95">예</button>
            </div>
          </div>
        </div>
      )}

      {infoPin && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setInfoPin(null)}>
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-7 shadow-2xl w-80 space-y-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
               <div className="flex items-center gap-3">
                  <img src={PIN_IMAGES[infoPin.type]} alt={infoPin.type} className="w-8 h-8 object-contain" />
                  <span className="text-sm font-bold text-amber-100 uppercase tracking-widest">{PIN_TYPES.find(t => t.type === infoPin.type)?.label}</span>
               </div>
               <button onClick={() => setInfoPin(null)} className="text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <div className="space-y-2">
                 <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Description</label>
                 <div className="bg-slate-950/50 rounded-xl p-4 border border-white/5 text-sm text-slate-200 leading-relaxed min-h-[80px]">{infoPin.comment || "상세 설명이 없습니다."}</div>
            </div>
            {infoPin.type !== '새' && infoPin.type !== '감' && !['생', '태', '순', '활'].includes(infoPin.type) && (
              <button onClick={() => toggleFindPin(infoPin)} className={`w-full py-4 flex items-center justify-center gap-2 font-bold rounded-2xl transition-all active:scale-95 shadow-lg ${fadedPinKeys.includes(getFadedKey(infoPin)) ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-amber-600 text-white hover:bg-amber-500'}`}>
                <Search size={18} />
                {fadedPinKeys.includes(getFadedKey(infoPin)) ? "Find Cancel (탐색 취소)" : "Find (탐색 완료)"}
              </button>
            )}
          </div>
        </div>
      )}

      {(pendingPin || editingPin) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => { setPendingPin(null); setEditingPin(null); }}>
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 shadow-2xl w-80 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-sm font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2"><Compass size={18} /> {editingPin ? "맵핀 수정" : "맵핀 추가"}</span>
              <button onClick={() => { setPendingPin(null); setEditingPin(null); }} className="text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {PIN_TYPES.map(pt => (
                <button key={pt.type} onClick={() => setActivePinType(pt.type)} className={`relative aspect-square rounded-xl flex items-center justify-center border transition-all overflow-hidden ${activePinType === pt.type ? `border-amber-400 ring-2 ring-amber-400 scale-105 shadow-[0_0_15px_rgba(245,158,11,0.3)]` : `bg-slate-800/40 border-white/5 hover:border-white/20`}`}>
                  <img src={PIN_IMAGES[pt.type]} alt={pt.label} className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute bottom-0 left-0 w-full h-1/3 bg-black/60 flex items-center justify-center px-0.5">
                    <span className="text-[11px] font-bold text-white truncate w-full text-center tracking-tighter">{pt.label}</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="space-y-4">
              {activePinType && !NO_COMMENT_TYPES.includes(activePinType) && (
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">코멘트</label>
                  <input autoFocus type="text" placeholder="위치 설명을 입력하세요..." value={pinComment} onChange={(e) => setPinComment(e.target.value)} className="w-full bg-slate-950/80 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all" />
                </div>
              )}
              <button onClick={editingPin ? updatePin : createPin} disabled={!activePinType} className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-sm font-bold rounded-xl transition-all shadow-lg active:scale-95">{editingPin ? "정보 수정하기" : "핀 설치하기"}</button>
            </div>
          </div>
        </div>
      )}

      {deletingPinId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setDeletingPinId(null)}>
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-6 shadow-2xl w-80 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <span className="text-sm font-bold text-rose-500 uppercase tracking-widest flex items-center gap-2"><Trash2 size={18} /> 맵핀 삭제</span>
              <button onClick={() => setDeletingPinId(null)} className="text-slate-500 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] text-slate-400 flex items-center gap-1 uppercase tracking-wider font-bold"><Lock size={10} /> 관리자 비밀번호 확인</label>
                <input autoFocus type="password" maxLength={5} placeholder="숫자 5자리" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value.replace(/[^0-9]/g, ''))} onKeyDown={(e) => e.key === 'Enter' && confirmDeletePin()} className="w-full bg-slate-950/80 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 text-center tracking-[0.4em] font-mono transition-all" />
              </div>
              <p className="text-[10px] text-slate-500 text-center">삭제를 위해 관리자 번호를 다시 입력해주세요.</p>
              <button onClick={confirmDeletePin} disabled={deletePassword.length < 5} className="w-full py-3 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-sm font-bold rounded-xl transition-all shadow-lg active:scale-95">삭제 확인</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
