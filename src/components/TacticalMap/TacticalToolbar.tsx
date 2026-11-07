import React, { useState, useRef } from 'react';
import {
  TacticalState,
  TacticalBackgroundKey,
  TACTICAL_MAP_PRESETS,
  GridType,
  TacticalLayer,
  TacticalViewMode,
  TacticalFogMode,
  TacticalWall,
  TacticalDoor,
} from '../../types/tactical';
import {
  MousePointer,
  Ruler,
  CircleDot,
  Crosshair,
  Eye,
  EyeOff,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Sliders,
  Layers,
  Map as MapIcon,
  Sparkles,
  ShieldAlert,
  Compass,
  Upload,
  Eraser,
  Grid,
  Users,
  Check,
  ScrollText,
  CheckCheck,
  ShieldCheck,
  X,
  Lock,
  Unlock,
  Move,
  Sun,
  Moon,
  Flame,
  Lightbulb,
  SunMedium,
  Trash2,
  Square,
  Circle,
  Pentagon,
  Paintbrush,
  Plus,
  Minus,
  Pin,
  Armchair,
  FileImage,
  DoorClosed,
  DoorOpen,
  Spline,
  PenTool,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { rotateTacticalState90 } from '../../utils/tacticalMath';
import { UserAccount } from '../../types/rpg';

export type TacticalToolMode = 'select' | 'ruler' | 'area' | 'terrain' | 'fog' | 'light' | 'wall' | 'door';

interface TacticalToolbarProps {
  tacticalState: TacticalState;
  zoom?: number;
  onUpdateTacticalState: (updated: Partial<TacticalState>) => void;
  activeTool: TacticalToolMode;
  onSelectTool: (tool: TacticalToolMode) => void;
  onResetView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onClearMarkers: () => void;
  onAutoPlaceTokens: () => void;
  onOpenTokensModal?: () => void;
  tokensCount?: number;
  currentUserRole: string;
  onOpenPlayerPermissions?: () => void;
  editorCount?: number;
  users?: UserAccount[];
  editorUserIds?: string[];
  onTogglePlayerPermission?: (userId: string) => void;
  onSetAllPlayerPermissions?: (allow: boolean) => void;
  wallPointsCount?: number;
  onFinishWall?: () => void;
  onCancelWall?: () => void;
  onUndoWallPoint?: () => void;
  onCloseWallPolygon?: () => void;
  onClearWalls?: () => void;
  onDeleteWall?: (wallId: string) => void;
  selectedWallId?: string | null;
  onSelectWall?: (wallId: string | null) => void;
  onClearDoors?: () => void;
  onDeleteDoor?: (doorId: string) => void;
  onToggleDoor?: (doorId: string) => void;
  onToggleAllDoors?: (open: boolean) => void;
  selectedDoorId?: string | null;
  onSelectDoor?: (doorId: string | null) => void;
  fogBrushMode?: 'reveal' | 'hide';
  onSetFogBrushMode?: (mode: 'reveal' | 'hide') => void;
  fogSubTool?: 'box' | 'light';
  onSetFogSubTool?: (subTool: 'box' | 'light') => void;
  fogShape?: 'rect' | 'circle' | 'polygon';
  onSetFogShape?: (shape: 'rect' | 'circle' | 'polygon') => void;
  fogCircleRadius?: number;
  onSetFogCircleRadius?: (radius: number) => void;
  fogPolyPointsCount?: number;
  onCloseFogPolygon?: () => void;
  onUndoFogPolyPoint?: () => void;
  onCancelFogPolygon?: () => void;
  lightAction?: 'add' | 'remove';
  onSetLightAction?: (action: 'add' | 'remove') => void;
  onRevealAllFog?: () => void;
  onHideAllFog?: () => void;
  onAddLightAtCenter?: () => void;
  customLightRadius?: number;
  onSetCustomLightRadius?: (radius: number) => void;
  customLightColor?: string;
  onSetCustomLightColor?: (color: string) => void;
  customLightAngle?: number;
  onSetCustomLightAngle?: (angle: number) => void;
  customLightRotation?: number;
  onSetCustomLightRotation?: (rot: number) => void;
  rulerMode?: 'free' | 'fixed';
  onSetRulerMode?: (mode: 'free' | 'fixed') => void;
  rulerType?: 'line' | 'blast' | 'fixed';
  onSetRulerType?: (type: 'line' | 'blast' | 'fixed') => void;
  rulerFixedYards?: number;
  onSetRulerFixedYards?: (yards: number) => void;
  onFixRulerMarker?: () => void;
  onClearRulerMarkers?: () => void;
  hasActiveRuler?: boolean;
  areaRadius?: number;
  onSetAreaRadius?: (radius: number) => void;
  areaColor?: string;
  onSetAreaColor?: (color: string) => void;
  onClearAreaMarkers?: () => void;
  keepMeasurementsOnMap?: boolean;
  onSetKeepMeasurementsOnMap?: (keep: boolean) => void;
  activeRulerMarkersCount?: number;
  onOpenPropsModal?: () => void;
  propsCount?: number;
  isPlayerView?: boolean;
  onTogglePlayerView?: () => void;
  isLogCollapsed?: boolean;
  onToggleLogCollapse?: () => void;
}

export const TacticalToolbar: React.FC<TacticalToolbarProps> = ({
  tacticalState,
  zoom,
  onUpdateTacticalState,
  activeTool,
  onSelectTool,
  onResetView,
  onZoomIn,
  onZoomOut,
  onClearMarkers,
  onAutoPlaceTokens,
  onOpenTokensModal,
  tokensCount,
  onOpenPropsModal,
  propsCount = 0,
  currentUserRole,
  onOpenPlayerPermissions,
  editorCount = 0,
  users = [],
  editorUserIds = [],
  onTogglePlayerPermission,
  onSetAllPlayerPermissions,
  wallPointsCount = 0,
  onFinishWall,
  onCancelWall,
  onUndoWallPoint,
  onCloseWallPolygon,
  onClearWalls,
  onDeleteWall,
  selectedWallId,
  onSelectWall,
  onClearDoors,
  onDeleteDoor,
  onToggleDoor,
  onToggleAllDoors,
  selectedDoorId,
  onSelectDoor,
  fogBrushMode = 'reveal',
  onSetFogBrushMode,
  fogSubTool = 'box',
  onSetFogSubTool,
  fogShape = 'rect',
  onSetFogShape,
  fogCircleRadius = 5,
  onSetFogCircleRadius,
  fogPolyPointsCount = 0,
  onCloseFogPolygon,
  onUndoFogPolyPoint,
  onCancelFogPolygon,
  lightAction = 'add',
  onSetLightAction,
  onRevealAllFog,
  onHideAllFog,
  onAddLightAtCenter,
  customLightRadius = 5,
  onSetCustomLightRadius,
  customLightColor = '#f59e0b',
  onSetCustomLightColor,
  customLightAngle = 360,
  onSetCustomLightAngle,
  customLightRotation = 0,
  onSetCustomLightRotation,
  rulerMode = 'free',
  onSetRulerMode,
  rulerType = 'line',
  onSetRulerType,
  rulerFixedYards = 5,
  onSetRulerFixedYards,
  onFixRulerMarker,
  onClearRulerMarkers,
  hasActiveRuler = false,
  areaRadius = 3,
  onSetAreaRadius,
  areaColor = '#ef4444',
  onSetAreaColor,
  onClearAreaMarkers,
  keepMeasurementsOnMap = true,
  onSetKeepMeasurementsOnMap,
  activeRulerMarkersCount = 0,
  isPlayerView = false,
  onTogglePlayerView,
  isLogCollapsed = false,
  onToggleLogCollapse,
}) => {
  const [mapConfigOpen, setMapConfigOpen] = useState(false);
  const [sliderBaseWidth, setSliderBaseWidth] = useState<number | null>(null);
  const [sliderBaseHexSize, setSliderBaseHexSize] = useState<number | null>(null);
  const [customUrlInput, setCustomUrlInput] = useState(tacticalState.customImageUrl || '');
  const [isLightListOpen, setIsLightListOpen] = useState(false);
  const [isWallsDoorsOpen, setIsWallsDoorsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMaster = currentUserRole === 'mestre';
  const activeLayer: TacticalLayer = tacticalState.activeLayer || 'tokens';
  const currentFogMode: TacticalFogMode =
    tacticalState.fogMode || (tacticalState.fogEnabled ? 'dynamic' : 'open');

  const currentPreset =
    TACTICAL_MAP_PRESETS.find((p) => p.key === tacticalState.backgroundKey) ||
    TACTICAL_MAP_PRESETS[0];

  return (
    <div
      id="tactical-top-toolbar-container"
      className="flex flex-col gap-1.5 pointer-events-auto"
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseMove={(e) => e.stopPropagation()}
    >
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl p-1.5 shadow-xl flex flex-col gap-1.5 z-20">
        {/* LINHA 1: SELETOR DE CAMADAS & FERRAMENTAS DO TABULEIRO */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {/* Seletor de Camadas (Mapa, Tokens, Mestre) */}
        {isMaster && (
          <div className="flex items-center gap-0.5 bg-slate-950 p-0.5 rounded-lg border border-slate-800 shadow-inner">
            <span className="text-[9px] text-slate-500 uppercase font-mono font-bold px-1 select-none">
              Camada:
            </span>
            <button
              onClick={() => onUpdateTacticalState({ activeLayer: 'map' })}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                activeLayer === 'map'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
              title="Nível 1: Camada do Mapa (Imagem base e alinhamento do grid - tokens ficam ocultos para calibrar)"
            >
              <MapIcon size={13} />
              <span>1. Mapa</span>
            </button>

            <button
              onClick={() => onUpdateTacticalState({ activeLayer: 'tokens' })}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                activeLayer === 'tokens'
                  ? 'bg-emerald-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
              title="Nível 2: Camada de Jogadores (Visão real dos Jogadores: combatentes, portas e tokens públicos)"
            >
              <Users size={13} />
              <span>2. Jogadores</span>
            </button>

            <button
              onClick={() => onUpdateTacticalState({ activeLayer: 'gm' })}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                activeLayer === 'gm'
                  ? 'bg-purple-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
              title="Nível 3: Camada do Mestre (Tokens secretos, monstros e anotações com flag do mestre)"
            >
              <ShieldAlert size={13} />
              <span>3. Mestre (GM)</span>
            </button>
          </div>
        )}

        {/* Ferramentas do Tabuleiro */}
        <div className="flex items-center gap-0.5 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={() => onSelectTool('select')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTool === 'select'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Selecionar e mover combatentes (arraste os tokens pelo mapa)"
          >
            <MousePointer size={14} />
            <span>Mover</span>
          </button>

          <button
            onClick={() => onSelectTool('ruler')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTool === 'ruler'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Régua Tática de Distância, Áreas de Efeito e Alcance GURPS"
          >
            <Ruler size={14} />
            <span>Medir</span>
          </button>

          {isMaster && (
            <>
              {activeLayer === 'map' ? (
                <>
                  <button
                    onClick={() => onSelectTool('wall')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      activeTool === 'wall'
                        ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Construir Paredes por Ligação de Polígonos (bloqueia luminosidade)"
                  >
                    <Spline size={14} />
                    <span>Paredes</span>
                    {(tacticalState.walls || []).length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-amber-500/20 text-amber-300">
                        {(tacticalState.walls || []).length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => onSelectTool('door')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      activeTool === 'door'
                        ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Inserir Portas (podem ser abertas ou fechadas para deixar luz passar)"
                  >
                    <DoorClosed size={14} />
                    <span>Portas</span>
                    {(tacticalState.doors || []).length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-amber-500/20 text-amber-300">
                        {(tacticalState.doors || []).length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => onSelectTool('light')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      activeTool === 'light'
                        ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Inserir Luzes (Focos de luz livres no mapa com raio, ângulo e controle liga/desliga)"
                  >
                    <Flame size={14} />
                    <span>Inserir Luzes</span>
                    {(tacticalState.lights || []).length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-amber-500/20 text-amber-300">
                        {(tacticalState.lights || []).length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      onSelectTool('fog');
                      onSetFogBrushMode?.('hide');
                      onSetFogSubTool?.('box');
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      activeTool === 'fog' && fogBrushMode === 'hide'
                        ? 'bg-rose-600 text-white shadow-sm font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Ocultar Áreas (arraste no mapa para esconder áreas dos jogadores - áreas ocultadas não aparecem nem com visualização)"
                  >
                    <EyeOff size={14} />
                    <span>Ocultar Áreas</span>
                  </button>

                  <button
                    onClick={() => {
                      onSelectTool('fog');
                      onSetFogBrushMode?.('reveal');
                      onSetFogSubTool?.('box');
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      activeTool === 'fog' && fogBrushMode === 'reveal'
                        ? 'bg-emerald-600 text-white shadow-sm font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Mostrar Áreas (arraste no mapa para liberar visualização de áreas aos jogadores)"
                  >
                    <Eye size={14} />
                    <span>Mostrar Áreas</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => onSelectTool('terrain')}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      activeTool === 'terrain'
                        ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Pincel de Terreno (Coberturas, Paredes, Terreno Difícil)"
                  >
                    <ShieldAlert size={14} />
                    <span>Terreno</span>
                  </button>

                  <button
                    onClick={() => {
                      onSelectTool('fog');
                      onSetFogBrushMode?.('hide');
                      onSetFogSubTool?.('box');
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      activeTool === 'fog' && fogBrushMode === 'hide'
                        ? 'bg-rose-600 text-white shadow-sm font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Ocultar Áreas"
                  >
                    <EyeOff size={14} />
                    <span>Ocultar Áreas</span>
                  </button>

                  <button
                    onClick={() => {
                      onSelectTool('fog');
                      onSetFogBrushMode?.('reveal');
                      onSetFogSubTool?.('box');
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      activeTool === 'fog' && fogBrushMode === 'reveal'
                        ? 'bg-emerald-600 text-white shadow-sm font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Mostrar Áreas"
                  >
                    <Eye size={14} />
                    <span>Mostrar Áreas</span>
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* LINHA 2: CONFIGURAÇÕES & VISÃO (ESQUERDA) | ZOOM & TOKENS (DIREITA) */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
        {/* Esquerda: Configuração do Mapa e Grid + Visão Mestre/Jogador */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Opções na Camada 1. Mapa: botão Configuração do Mapa e Grid */}
        {isMaster && activeLayer === 'map' && (
          <div className="relative">
            <button
              onClick={() => {
                const next = !mapConfigOpen;
                if (next) {
                  setSliderBaseWidth(tacticalState.mapImageWidth || 2000);
                  setSliderBaseHexSize(tacticalState.hexSize || 38);
                  onUpdateTacticalState({ mapImageLocked: false });
                } else {
                  onUpdateTacticalState({ mapImageLocked: true });
                }
                setMapConfigOpen(next);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer ${
                mapConfigOpen
                  ? 'bg-amber-500 text-slate-950 font-bold border border-amber-500'
                  : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
              }`}
              title="Configuração do Mapa e Grid"
            >
              <Sliders size={13} />
              <span>Configuração do Mapa e Grid</span>
            </button>

            {mapConfigOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => {
                    setMapConfigOpen(false);
                    onUpdateTacticalState({ mapImageLocked: true });
                  }}
                  onWheel={(e) => e.stopPropagation()}
                />
                <div
                  className="absolute top-full left-0 mt-2 w-96 max-w-[95vw] bg-slate-950 border border-amber-500/50 rounded-2xl shadow-2xl p-4 z-50 text-xs space-y-4 max-h-[85vh] overflow-y-auto"
                  onWheel={(e) => e.stopPropagation()}
                >
                  {/* Cabeçalho */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-200 font-bold">
                    <span className="flex items-center gap-1.5 text-amber-400 text-sm">
                      <Sliders size={15} /> Configuração do Mapa & Grid
                    </span>
                    <button
                      onClick={() => {
                        setMapConfigOpen(false);
                        onUpdateTacticalState({ mapImageLocked: true });
                      }}
                      className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  {/* SEÇÃO 1: IMAGEM DE FUNDO (UPLOAD E URL) */}
                  <div className="space-y-2.5 p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
                        <Upload size={13} className="text-amber-400" /> Imagem de Fundo do Mapa
                      </span>
                      {tacticalState.backgroundKey === 'custom' && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono font-bold">
                          Personalizada
                        </span>
                      )}
                    </div>

                    {/* Botão de Upload de Arquivo Local */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const dataUrl = event.target?.result as string;
                          if (dataUrl) {
                            const img = new Image();
                            img.onload = () => {
                              setSliderBaseWidth(img.naturalWidth);
                              onUpdateTacticalState({
                                backgroundKey: 'custom',
                                customImageUrl: dataUrl,
                                mapImageWidth: img.naturalWidth,
                                mapImageHeight: img.naturalHeight,
                                mapImageX: 0,
                                mapImageY: 0,
                                mapRotation: 0,
                              });
                            };
                            img.src = dataUrl;
                          }
                        };
                        reader.readAsDataURL(file);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="hidden"
                    />

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95"
                      >
                        <Upload size={14} />
                        <span>Fazer Upload do Computador</span>
                      </button>
                    </div>

                    {/* Ou Link da Internet */}
                    <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                      <span className="text-[10px] text-slate-400 block font-semibold">
                        Ou insira um link de imagem da Web:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={customUrlInput}
                          onChange={(e) => setCustomUrlInput(e.target.value)}
                          placeholder="https://exemplo.com/mapa.jpg"
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!customUrlInput.trim()) return;
                            const img = new Image();
                            img.onload = () => {
                              setSliderBaseWidth(img.naturalWidth);
                              onUpdateTacticalState({
                                backgroundKey: 'custom',
                                customImageUrl: customUrlInput.trim(),
                                mapImageWidth: img.naturalWidth,
                                mapImageHeight: img.naturalHeight,
                                mapImageX: 0,
                                mapImageY: 0,
                                mapRotation: 0,
                              });
                            };
                            img.onerror = () => {
                              onUpdateTacticalState({
                                backgroundKey: 'custom',
                                customImageUrl: customUrlInput.trim(),
                              });
                            };
                            img.src = customUrlInput.trim();
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold rounded-lg text-xs"
                        >
                          Aplicar
                        </button>
                      </div>
                    </div>

                    {/* Informações da Imagem Carregada e Ajuste de Tamanho (Mantendo Proporção) */}
                    {(() => {
                      const curMapW = tacticalState.mapImageWidth || 2000;
                      const curMapH = tacticalState.mapImageHeight || 1400;
                      const mapAspect = curMapW / curMapH;

                      const baseW = sliderBaseWidth || curMapW;
                      const minW = Math.min(curMapW - 200, Math.max(300, Math.round(baseW * 0.3)));
                      const maxW = Math.max(curMapW + 200, Math.round(baseW * 1.7));

                      const handleResizeMapWidth = (newW: number) => {
                        const safeW = Math.max(200, Math.min(10000, Math.round(newW)));
                        const safeH = Math.max(150, Math.round(safeW / (mapAspect || 1.428)));
                        onUpdateTacticalState({
                          mapImageWidth: safeW,
                          mapImageHeight: safeH,
                        });
                      };

                      return (
                        <div className="space-y-2 p-2.5 bg-slate-950/80 border border-slate-800/80 rounded-lg text-[11px] text-slate-300">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-slate-400 font-semibold">
                              <FileImage size={13} className="text-amber-400" />
                              <span>Tamanho da Imagem do Mapa:</span>
                            </span>
                            {/* Opção de Girar o Mapa e Tokens em 90° */}
                            <button
                              type="button"
                              onClick={() => {
                                onUpdateTacticalState(rotateTacticalState90(tacticalState));
                              }}
                              className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                              title="Girar o mapa e todas as suas configurações e tokens em 90° no sentido horário"
                            >
                              <RotateCw size={11} />
                              <span>Girar 90° ({tacticalState.mapRotation || 0}°)</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 flex items-center justify-between">
                              <span className="text-[10px] text-slate-400">Largura:</span>
                              <span className="font-mono text-xs font-bold text-amber-300">
                                {curMapW}px
                              </span>
                            </div>
                            <span className="text-slate-500 font-bold">×</span>
                            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 flex items-center justify-between">
                              <span className="text-[10px] text-slate-400">Altura:</span>
                              <span className="font-mono text-xs font-bold text-amber-300">
                                {curMapH}px
                              </span>
                            </div>
                          </div>

                          {/* Slider de Redimensionamento Proporcional */}
                          <div className="pt-1">
                            <input
                              type="range"
                              min={minW}
                              max={maxW}
                              step="20"
                              value={curMapW}
                              onChange={(e) => handleResizeMapWidth(Number(e.target.value))}
                              className="w-full accent-amber-500"
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* SEÇÃO 2: CALIBRAÇÃO DA GRADE (GRID) */}
                  <div className="space-y-3 p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
                      <Grid size={13} className="text-amber-400" /> Calibração da Grade & Escala Tática
                    </span>

                    {/* Escala da Grade: Tamanho do Hexágono (hexSize) */}
                    {(() => {
                      const curHex = tacticalState.hexSize || 38;
                      const baseHex = sliderBaseHexSize || curHex;
                      const minHex = Math.min(curHex - 5, Math.max(10, Math.round(baseHex * 0.35)));
                      const maxHex = Math.max(curHex + 5, Math.round(baseHex * 1.65));

                      return (
                        <div className="space-y-1">
                          <div className="flex justify-end text-[11px] text-slate-300 font-semibold">
                            <span className="font-mono text-amber-400 font-bold">
                              {curHex}px
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateTacticalState({
                                  hexSize: Math.max(10, curHex - 1),
                                })
                              }
                              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-white rounded font-mono font-bold"
                              title="Diminuir hexágono"
                            >
                              -
                            </button>
                            <input
                              type="range"
                              min={minHex}
                              max={maxHex}
                              value={curHex}
                              onChange={(e) =>
                                onUpdateTacticalState({ hexSize: Number(e.target.value) })
                              }
                              className="flex-1 accent-amber-500"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateTacticalState({
                                  hexSize: Math.min(140, curHex + 1),
                                })
                              }
                              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-white rounded font-mono font-bold"
                              title="Aumentar hexágono"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Contraste da Grade: Clara vs Escura */}
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">
                        Contraste da Grade:
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateTacticalState({
                              gridColor: '#cbd5e1',
                              gridOpacity: 0.28,
                            })
                          }
                          className={`px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                            tacticalState.gridColor !== '#0f172a' &&
                            tacticalState.gridColor !== '#000000' &&
                            tacticalState.gridColor !== '#1e293b'
                              ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold'
                              : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-850'
                          }`}
                        >
                          <Moon size={12} />
                          <span>Grade Clara</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateTacticalState({
                              gridColor: '#0f172a',
                              gridOpacity: 0.65,
                            })
                          }
                          className={`px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                            tacticalState.gridColor === '#0f172a' ||
                            tacticalState.gridColor === '#000000' ||
                            tacticalState.gridColor === '#1e293b'
                              ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold'
                              : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-850'
                          }`}
                        >
                          <Sun size={12} />
                          <span>Grade Escura</span>
                        </button>
                      </div>
                    </div>

                    {/* Opacidade da Grade */}
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>Opacidade das Linhas:</span>
                        <span className="font-mono text-amber-300 font-bold">
                          {Math.round((tacticalState.gridOpacity ?? 0.28) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.05"
                        max="0.8"
                        step="0.05"
                        value={tacticalState.gridOpacity ?? 0.28}
                        onChange={(e) =>
                          onUpdateTacticalState({ gridOpacity: Number(e.target.value) })
                        }
                        className="w-full accent-amber-500"
                      />
                    </div>

                    {/* SEÇÃO 3: ILUMINAÇÃO & VISÃO DOS JOGADORES */}
                    <div className="pt-2.5 border-t border-slate-800 space-y-2">
                      <label className="flex items-start gap-2.5 cursor-pointer select-none py-2 px-2.5 bg-slate-950/70 border border-slate-800 rounded-xl hover:border-amber-500/50 transition-colors">
                        <input
                          type="checkbox"
                          checked={tacticalState.useLightingVision !== false}
                          onChange={(e) => {
                            onUpdateTacticalState({
                              useLightingVision: e.target.checked,
                              fogEnabled: true,
                            });
                          }}
                          className="w-4 h-4 mt-0.5 rounded text-amber-500 focus:ring-amber-400 accent-amber-500 cursor-pointer"
                        />
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                            <Flame size={13} className="text-amber-400" />
                            Usar Iluminação
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                            {tacticalState.useLightingVision !== false
                              ? 'Habilitado: jogadores só veem o que estiver revelado pelo mestre e na visão/luz deles.'
                              : 'Desabilitado: jogadores veem tudo o que o mestre disponibilizar no mapa.'}
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Simulação de Visão do Jogador para o Mestre */}
        {isMaster && onTogglePlayerView && (
          <button
            type="button"
            onClick={onTogglePlayerView}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer shrink-0 ${
              isPlayerView
                ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-850'
            }`}
            title={
              isPlayerView
                ? 'Simulando VISÃO DO JOGADOR (escuridão total). Clique para voltar à visão do Mestre.'
                : 'Visão do MESTRE (névoa translúcida). Clique para ver como os Jogadores veem o mapa.'
            }
          >
            {isPlayerView ? <EyeOff size={13} className="text-purple-200" /> : <Eye size={13} className="text-amber-400" />}
            <span>{isPlayerView ? 'Visão: Jogador' : 'Visão: Mestre'}</span>
          </button>
        )}
      </div>

              {/* Centro: Controles Compactos da Ferramenta Ativa (Sem textos explicativos) */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-center overflow-x-auto no-scrollbar py-0.5">
          {/* 1. Medir */}
          {activeTool === 'ruler' && (
            <div className="flex items-center gap-1.5 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => onSetRulerType?.('line')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                  rulerType === 'line'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Distância (Seta)"
              >
                <Ruler size={12} />
                <span>Distância (Seta)</span>
              </button>
              <button
                type="button"
                onClick={() => onSetRulerType?.('blast')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                  rulerType === 'blast'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Área de Efeito"
              >
                <CircleDot size={12} />
                <span>Área de Efeito</span>
              </button>

              {rulerType === 'blast' && (
                <div className="flex items-center gap-1 pl-1.5 border-l border-slate-800">
                  <span className="text-[10px] text-slate-400 font-mono">Raio:</span>
                  <button
                    type="button"
                    onClick={() => onSetAreaRadius?.(Math.max(1, (areaRadius || 3) - 1))}
                    className="p-0.5 text-slate-400 hover:text-white cursor-pointer"
                    title="Diminuir raio"
                  >
                    <Minus size={11} />
                  </button>
                  <span className="font-mono font-bold text-amber-300 text-xs px-0.5">
                    {areaRadius || 3} yd
                  </span>
                  <button
                    type="button"
                    onClick={() => onSetAreaRadius?.((areaRadius || 3) + 1)}
                    className="p-0.5 text-slate-400 hover:text-white cursor-pointer"
                    title="Aumentar raio"
                  >
                    <Plus size={11} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 2. Paredes */}
          {isMaster && activeTool === 'wall' && (
            <div className="flex items-center gap-1.5 shrink-0">
              {wallPointsCount > 0 ? (
                <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-0.5 rounded-lg border border-amber-500/50">
                  <span className="text-[11px] font-mono font-bold text-amber-300">
                    {wallPointsCount} {wallPointsCount === 1 ? 'vértice' : 'vértices'}
                  </span>
                  <button
                    type="button"
                    onClick={onFinishWall}
                    disabled={wallPointsCount < 2}
                    className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold rounded text-[11px] flex items-center gap-1 cursor-pointer"
                    title="Concluir parede (Enter)"
                  >
                    <Check size={11} />
                    <span>Concluir</span>
                  </button>
                  <button
                    type="button"
                    onClick={onCloseWallPolygon}
                    disabled={wallPointsCount < 3}
                    className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold rounded text-[11px] flex items-center gap-1 cursor-pointer"
                    title="Fechar Polígono"
                  >
                    <RotateCw size={11} />
                    <span>Fechar</span>
                  </button>
                  <button
                    type="button"
                    onClick={onUndoWallPoint}
                    className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                    title="Desfazer último ponto"
                  >
                    <RotateCcw size={11} />
                  </button>
                  <button
                    type="button"
                    onClick={onCancelWall}
                    className="p-1 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 rounded cursor-pointer"
                    title="Cancelar parede"
                  >
                    <X size={11} />
                  </button>
                </div>
              ) : (
                <span className="text-[11px] text-amber-300/80 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                  ✏️ Clique no mapa para iniciar parede
                </span>
              )}
            </div>
          )}

          {/* 3. Portas */}
          {isMaster && activeTool === 'door' && (
            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => onToggleAllDoors?.(true)}
                className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded text-xs font-bold flex items-center gap-1 cursor-pointer"
                title="Abrir Todas as Portas"
              >
                <DoorOpen size={12} />
                <span>Abrir Todas</span>
              </button>
              <button
                type="button"
                onClick={() => onToggleAllDoors?.(false)}
                className="px-2 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded text-xs font-bold flex items-center gap-1 cursor-pointer"
                title="Fechar Todas as Portas"
              >
                <DoorClosed size={12} />
                <span>Fechar Todas</span>
              </button>
            </div>
          )}

          {/* 4. Luzes */}
          {isMaster && activeTool === 'light' && (
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Raio */}
              <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 font-mono">Raio:</span>
                <button
                  type="button"
                  onClick={() => onSetCustomLightRadius?.(Math.max(1, (customLightRadius || 5) - 1))}
                  className="p-0.5 text-slate-400 hover:text-white cursor-pointer"
                >
                  <Minus size={11} />
                </button>
                <span className="font-mono font-bold text-amber-300 text-xs px-1">
                  {customLightRadius || 5} yd
                </span>
                <button
                  type="button"
                  onClick={() => onSetCustomLightRadius?.((customLightRadius || 5) + 1)}
                  className="p-0.5 text-slate-400 hover:text-white cursor-pointer"
                >
                  <Plus size={11} />
                </button>
              </div>

              {/* Ângulos */}
              <div className="flex items-center gap-1 bg-slate-950 px-1 py-0.5 rounded-lg border border-slate-800">
                {[360, 180, 90].map((deg) => (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => onSetCustomLightAngle?.(deg)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                      (customLightAngle || 360) === deg
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {deg === 360 ? '360°' : deg === 180 ? '180°' : '90°'}
                  </button>
                ))}
              </div>

              {/* Giro */}
              {customLightAngle && customLightAngle < 360 && (
                <div className="flex items-center gap-1 bg-slate-950 px-1.5 py-0.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-mono">Giro:</span>
                  <button
                    type="button"
                    onClick={() => onSetCustomLightRotation?.(((customLightRotation ?? 0) - 15 + 360) % 360)}
                    className="p-0.5 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <RotateCcw size={11} />
                  </button>
                  <span className="font-mono font-bold text-amber-300 text-xs px-0.5">
                    {customLightRotation ?? 0}°
                  </span>
                  <button
                    type="button"
                    onClick={() => onSetCustomLightRotation?.(((customLightRotation ?? 0) + 15) % 360)}
                    className="p-0.5 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <RotateCw size={11} />
                  </button>
                </div>
              )}

              {onAddLightAtCenter && (
                <button
                  type="button"
                  onClick={onAddLightAtCenter}
                  className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded text-xs font-bold flex items-center gap-1 cursor-pointer"
                  title="Adicionar Foco de Luz no Centro do Mapa"
                >
                  <Plus size={11} />
                  <span>Luz no Centro</span>
                </button>
              )}
            </div>
          )}

          {/* 5. Ocultar / Mostrar Áreas (Fog: Retângulo, Círculo e Polígono) */}
          {isMaster && activeTool === 'fog' && (
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
              {/* Badge indicativo do modo ativo */}
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border ${
                fogBrushMode === 'hide'
                  ? 'bg-rose-950/60 text-rose-400 border-rose-800/60'
                  : 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
              }`}>
                {fogBrushMode === 'hide' ? (
                  <>
                    <EyeOff size={13} />
                    <span>Ocultar:</span>
                  </>
                ) : (
                  <>
                    <Eye size={13} />
                    <span>Mostrar:</span>
                  </>
                )}
              </span>

              {/* Seletor das 3 formas: Retângulo, Círculo, Polígono */}
              <div className="flex items-center gap-0.5 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => onSetFogShape?.('rect')}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                    fogShape === 'rect'
                      ? fogBrushMode === 'hide'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title="Retângulo: clique e arraste no mapa"
                >
                  <Square size={12} />
                  <span>Retângulo</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSetFogShape?.('circle')}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                    fogShape === 'circle'
                      ? fogBrushMode === 'hide'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title="Círculo: defina o raio em jardas e clique no mapa para estampar"
                >
                  <Circle size={12} />
                  <span>Círculo</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSetFogShape?.('polygon')}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                    fogShape === 'polygon'
                      ? fogBrushMode === 'hide'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title="Polígono: clique no mapa para criar vértices; fecha no 1º ponto ou no botão Fechar Polígono"
                >
                  <Pentagon size={12} />
                  <span>Polígono</span>
                </button>
              </div>

              {/* Controles específicos da forma selecionada */}
              {fogShape === 'circle' && (
                <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-mono">Raio:</span>
                  <button
                    type="button"
                    onClick={() => onSetFogCircleRadius?.(Math.max(1, (fogCircleRadius || 5) - 1))}
                    className="p-0.5 text-slate-400 hover:text-white cursor-pointer"
                    title="Diminuir raio"
                  >
                    <Minus size={11} />
                  </button>
                  <span className={`font-mono font-bold text-xs px-1 ${fogBrushMode === 'hide' ? 'text-rose-300' : 'text-emerald-300'}`}>
                    {fogCircleRadius || 5} yd
                  </span>
                  <button
                    type="button"
                    onClick={() => onSetFogCircleRadius?.((fogCircleRadius || 5) + 1)}
                    className="p-0.5 text-slate-400 hover:text-white cursor-pointer"
                    title="Aumentar raio"
                  >
                    <Plus size={11} />
                  </button>
                </div>
              )}

              {fogShape === 'polygon' && (
                <div className="flex items-center gap-1">
                  {fogPolyPointsCount > 0 ? (
                    <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                      <span className="font-mono text-[11px] text-amber-300 font-bold">
                        {fogPolyPointsCount} {fogPolyPointsCount === 1 ? 'vértice' : 'vértices'}
                      </span>
                      {fogPolyPointsCount >= 3 && (
                        <button
                          type="button"
                          onClick={onCloseFogPolygon}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                            fogBrushMode === 'hide'
                              ? 'bg-rose-600 hover:bg-rose-500 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          }`}
                          title="Fechar e aplicar polígono (ou clique no 1º ponto / Enter)"
                        >
                          <Check size={11} />
                          <span>Fechar Polígono</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={onUndoFogPolyPoint}
                        className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                        title="Desfazer último ponto"
                      >
                        <RotateCcw size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={onCancelFogPolygon}
                        className="p-1 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 rounded cursor-pointer"
                        title="Cancelar polígono"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                      Clique no mapa para ligar os pontos
                    </span>
                  )}
                </div>
              )}

              {/* Contador de áreas e botão Limpar */}
              <span className="text-[11px] font-mono text-slate-400 ml-1">
                {(tacticalState.fogRects || []).length} áreas
              </span>
              {(tacticalState.fogRects || []).length > 0 && (
                <button
                  type="button"
                  onClick={() => onUpdateTacticalState({ fogRects: [] })}
                  className="px-2 py-0.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 rounded text-xs font-medium transition-all flex items-center gap-1 cursor-pointer"
                  title="Remover todas as áreas"
                >
                  <Trash2 size={11} />
                  <span>Limpar</span>
                </button>
              )}
            </div>
          )}

          {/* 6. Botão Unificado: Paredes, Portas e Iluminações do Mapa */}
          {isMaster && (activeLayer === 'map' || activeTool === 'wall' || activeTool === 'door' || activeTool === 'light') && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsWallsDoorsOpen(!isWallsDoorsOpen)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                  isWallsDoorsOpen
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-amber-500/50 hover:text-white'
                }`}
                title="Gerenciar Paredes, Portas e Iluminações do Mapa (excluir ou inspecionar)"
              >
                <Sliders size={12} className={isWallsDoorsOpen ? "text-slate-950" : "text-amber-400"} />
                <span>
                  {(tacticalState.walls || []).length}P / {(tacticalState.doors || []).length}D / {(tacticalState.lights || []).length}L
                </span>
              </button>

              {isWallsDoorsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsWallsDoorsOpen(false)}
                  />
                  <div className="absolute top-full right-0 mt-2 w-84 max-w-[95vw] bg-slate-950 border border-amber-500/50 rounded-2xl shadow-2xl p-3.5 z-50 text-xs space-y-3 max-h-[85vh] overflow-y-auto">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-200 font-bold">
                      <span className="flex items-center gap-1.5 text-amber-400">
                        <Sliders size={14} /> Paredes, Portas & Luzes do Mapa
                      </span>
                      <button
                        onClick={() => setIsWallsDoorsOpen(false)}
                        className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {/* Resumo de Paredes */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-slate-300 font-semibold text-[11px]">
                        <span className="flex items-center gap-1">
                          <Spline size={12} className="text-amber-400" /> Paredes Poligonais ({(tacticalState.walls || []).length})
                        </span>
                        {(tacticalState.walls || []).length > 0 && (
                          <button
                            type="button"
                            onClick={onClearWalls}
                            className="text-rose-400 hover:text-rose-300 text-[10px] underline cursor-pointer"
                          >
                            Limpar todas
                          </button>
                        )}
                      </div>
                      <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                        {(tacticalState.walls || []).length === 0 ? (
                          <div className="text-[11px] text-slate-500 italic p-1.5 text-center">
                            Nenhuma parede construída ainda.
                          </div>
                        ) : (
                          (tacticalState.walls || []).map((w, idx) => {
                            const isSelected = selectedWallId === w.id;
                            return (
                              <div
                                key={w.id || idx}
                                onClick={() => onSelectWall?.(isSelected ? null : w.id)}
                                className={`flex items-center justify-between px-2 py-1.5 rounded border text-[11px] cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-sky-500/25 border-sky-400 text-sky-200 ring-1 ring-sky-400 font-bold shadow-xs'
                                    : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
                                }`}
                                title="Clique para destacar e localizar esta parede no mapa"
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[10px] ${isSelected ? 'text-sky-300' : 'text-slate-500'}`}>
                                    {isSelected ? '📍' : `#${idx + 1}`}
                                  </span>
                                  <span>
                                    Parede #{idx + 1} ({w.points?.length || 0} vértices{w.closed ? ', fechada' : ''})
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteWall?.(w.id);
                                  }}
                                  className="text-slate-400 hover:text-rose-400 p-0.5 rounded hover:bg-rose-500/20 transition-colors cursor-pointer"
                                  title="Excluir esta parede"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Resumo de Portas */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                      <div className="flex items-center justify-between text-slate-300 font-semibold text-[11px]">
                        <span className="flex items-center gap-1">
                          <DoorClosed size={12} className="text-amber-400" /> Portas ({(tacticalState.doors || []).length})
                        </span>
                        {(tacticalState.doors || []).length > 0 && (
                          <button
                            type="button"
                            onClick={onClearDoors}
                            className="text-rose-400 hover:text-rose-300 text-[10px] underline cursor-pointer"
                          >
                            Limpar todas
                          </button>
                        )}
                      </div>
                      <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                        {(tacticalState.doors || []).length === 0 ? (
                          <div className="text-[11px] text-slate-500 italic p-1.5 text-center">
                            Nenhuma porta inserida ainda.
                          </div>
                        ) : (
                          (tacticalState.doors || []).map((d, idx) => {
                            const isSelected = selectedDoorId === d.id;
                            return (
                              <div
                                key={d.id || idx}
                                onClick={() => onSelectDoor?.(isSelected ? null : d.id)}
                                className={`flex items-center justify-between px-2 py-1.5 rounded border text-[11px] cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-sky-500/25 border-sky-400 text-sky-200 ring-1 ring-sky-400 font-bold shadow-xs'
                                    : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
                                }`}
                                title="Clique para destacar e localizar esta porta no mapa"
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[10px] ${isSelected ? 'text-sky-300' : 'text-slate-500'}`}>
                                    {isSelected ? '📍' : `#${idx + 1}`}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onToggleDoor?.(d.id);
                                    }}
                                    className={`px-1.5 py-0.2 rounded font-bold text-[10px] transition-colors cursor-pointer ${
                                      d.isOpen
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    }`}
                                  >
                                    {d.isOpen ? 'Aberta' : 'Fechada'}
                                  </button>
                                  <span>Porta #{idx + 1}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteDoor?.(d.id);
                                  }}
                                  className="text-slate-400 hover:text-rose-400 p-0.5 rounded hover:bg-rose-500/20 transition-colors cursor-pointer"
                                  title="Excluir esta porta"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Resumo de Focos de Luz */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                      <div className="flex items-center justify-between text-slate-300 font-semibold text-[11px]">
                        <span className="flex items-center gap-1">
                          <Flame size={12} className="text-amber-400" /> Iluminações ({(tacticalState.lights || []).length})
                        </span>
                        {(tacticalState.lights || []).length > 0 && (
                          <button
                            type="button"
                            onClick={() => onUpdateTacticalState({ lights: [] })}
                            className="text-rose-400 hover:text-rose-300 text-[10px] underline cursor-pointer"
                          >
                            Limpar todas
                          </button>
                        )}
                      </div>
                      <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                        {(tacticalState.lights || []).length === 0 ? (
                          <div className="text-[11px] text-slate-500 italic p-1.5 text-center">
                            Nenhum foco de luz adicionado ainda.
                          </div>
                        ) : (
                          (tacticalState.lights || []).map((l, idx) => (
                            <div
                              key={l.id || idx}
                              className="flex items-center justify-between px-2 py-1.5 rounded border border-slate-800 bg-slate-900/80 text-[11px]"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span>{l.active !== false ? '🔥' : '🪔'}</span>
                                <div className="truncate">
                                  <div className="font-semibold text-slate-200 truncate">
                                    {l.label || `Luz #${idx + 1}`}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    {l.radius} yd • {l.angle ? `${l.angle}°` : '360°'}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0 ml-1">
                                {l.angle && l.angle < 360 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextRot = (((l.rotation ?? 0) + 15) % 360);
                                      const updated = (tacticalState.lights || []).map((item) =>
                                        item.id === l.id ? { ...item, rotation: nextRot } : item
                                      );
                                      onUpdateTacticalState({ lights: updated });
                                    }}
                                    className="p-1 rounded text-amber-400 hover:bg-amber-500/20 cursor-pointer"
                                    title="Girar foco (+15°)"
                                  >
                                    <RotateCw size={11} />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = (tacticalState.lights || []).map((item) =>
                                      item.id === l.id ? { ...item, active: item.active === false ? true : false } : item
                                    );
                                    onUpdateTacticalState({ lights: updated });
                                  }}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                                    l.active !== false
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
                                  }`}
                                  title={l.active !== false ? 'Clique para APAGAR' : 'Clique para ACENDER'}
                                >
                                  {l.active !== false ? 'Acesa' : 'Apagada'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = (tacticalState.lights || []).filter((item) => item.id !== l.id);
                                    onUpdateTacticalState({ lights: updated });
                                  }}
                                  className="text-slate-400 hover:text-rose-400 p-0.5 rounded hover:bg-rose-500/20 transition-colors cursor-pointer"
                                  title="Excluir este foco de luz"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

{/* Direita: Controles de Zoom e Tokens no Tabuleiro */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Controles de Zoom e Centralização */}
        <div className="flex items-center gap-0.5 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={onZoomOut}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Reduzir Zoom (-)"
          >
            <ZoomOut size={13} />
          </button>
          <span className="font-mono text-[11px] text-amber-300 font-bold px-1.5">
            {Math.round((typeof zoom === 'number' ? zoom : tacticalState.zoom || 1) * 100)}%
          </span>
          <button
            onClick={onZoomIn}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Aumentar Zoom (+)"
          >
            <ZoomIn size={13} />
          </button>
          <button
            onClick={onResetView}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors ml-0.5"
            title="Restaurar Posição e Zoom 100%"
          >
            <RotateCcw size={13} />
          </button>
        </div>

        {/* Tokens no Tabuleiro */}
        {isMaster && (
          <button
            type="button"
            onClick={onOpenTokensModal}
            className="px-2.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
            title="Selecionar quais tokens exibir no tabuleiro"
          >
            <Users size={14} className="text-amber-400" />
            <span>Tokens no Tabuleiro</span>
            {typeof tokensCount === 'number' && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {tokensCount}
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  </div>

    </div>
  );
};
