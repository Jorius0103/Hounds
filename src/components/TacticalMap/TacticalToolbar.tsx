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
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl p-1.5 shadow-xl flex flex-wrap items-center justify-between gap-2 z-20">
      {/* 1. SELETOR DE 3 NÍVEIS / CAMADAS (ESTILO ROLL20) & FERRAMENTAS DE INTERAÇÃO */}
      <div className="flex flex-wrap items-center gap-1.5">
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
              title="Nível 2: Camada de Tokens (Visão real dos Jogadores: combatentes e tokens públicos)"
            >
              <Users size={13} />
              <span>2. Tokens</span>
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

        {/* Simulação de Visão do Jogador para o Mestre */}
        {isMaster && onTogglePlayerView && (
          <button
            type="button"
            onClick={onTogglePlayerView}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
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

        {/* Opções na Camada 1. Mapa: botão no final da mesma div */}
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
      </div>

        {/* Separador */}
        <div className="w-px h-5 bg-slate-800 mx-0.5" />

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

        {/* Limpar e Posicionar */}
        <div className="flex items-center gap-1">
          <button
            onClick={onClearMarkers}
            className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
            title="Limpar Linhas de Medição e Marcadores da Mesa"
          >
            <Eraser size={14} />
          </button>

          {isMaster && (
            <button
              type="button"
              onClick={onOpenTokensModal}
              className="px-2.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
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

          {/* Botão de Recolher / Expandir Log da Mesa com Setas Laterais */}
          {onToggleLogCollapse && (
            <button
              type="button"
              onClick={onToggleLogCollapse}
              className={`px-2 py-1.5 border rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer ${
                isLogCollapsed
                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-amber-500/20'
                  : 'bg-slate-800/90 hover:bg-slate-750 text-slate-300 hover:text-white border-slate-700'
              }`}
              title={isLogCollapsed ? 'Expandir Log da Mesa (◀)' : 'Recolher Log da Mesa (▶)'}
            >
              {isLogCollapsed ? (
                <>
                  <ChevronLeft size={15} className="text-slate-950 font-black" />
                  <ScrollText size={13} className="text-slate-950" />
                  <span>Log</span>
                </>
              ) : (
                <>
                  <ScrollText size={13} className="text-amber-400" />
                  <span>Log</span>
                  <ChevronRight size={15} className="text-slate-400" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* BARRA DE CONTROLE: CAMADA DO MAPA (PAREDES, PORTAS E ILUMINAÇÃO DINÂMICA) */}
      {isMaster && (activeTool === 'wall' || activeTool === 'door' || activeTool === 'light') && (
        <div className="bg-slate-900/95 backdrop-blur-md border border-amber-500/40 rounded-xl px-3 py-2 shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-1">
          {activeTool === 'wall' ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 font-bold text-amber-400 select-none">
                <Spline size={15} />
                <span>Paredes Poligonais:</span>
              </span>
              <span className="text-slate-300 text-[11px] hidden md:inline">
                Clique no mapa para ligar os pontos do polígono (não precisa ser reta).
              </span>

              {wallPointsCount > 0 ? (
                <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-amber-500/50">
                  <span className="text-[11px] font-mono font-bold text-amber-300">
                    {wallPointsCount} {wallPointsCount === 1 ? 'vértice' : 'vértices'}
                  </span>
                  <button
                    type="button"
                    onClick={onFinishWall}
                    disabled={wallPointsCount < 2}
                    className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold rounded text-[11px] flex items-center gap-1 shadow-xs"
                    title="Concluir a parede atual (Tecla Enter)"
                  >
                    <Check size={12} />
                    <span>Concluir (Enter)</span>
                  </button>
                  <button
                    type="button"
                    onClick={onCloseWallPolygon}
                    disabled={wallPointsCount < 3}
                    className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold rounded text-[11px] flex items-center gap-1"
                    title="Conecta o último ponto ao primeiro formando um polígono fechado"
                  >
                    <RotateCw size={11} />
                    <span>Fechar Polígono</span>
                  </button>
                  <button
                    type="button"
                    onClick={onUndoWallPoint}
                    className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                    title="Desfazer último ponto (Backspace)"
                  >
                    <RotateCcw size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={onCancelWall}
                    className="p-1 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 rounded"
                    title="Cancelar parede (Esc)"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <span className="text-[11px] text-amber-300/80 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  Clique no mapa para iniciar o primeiro vértice da parede
                </span>
              )}
            </div>
          ) : activeTool === 'door' ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 font-bold text-amber-400 select-none">
                <DoorClosed size={15} />
                <span>Inserção de Portas:</span>
              </span>
              <span className="text-slate-300 text-[11px]">
                Clique em 2 pontos no mapa para criar uma porta. Clique na porta a qualquer momento no mapa para abrir ou fechar.
              </span>
              <div className="flex items-center gap-1 ml-auto">
                <button
                  type="button"
                  onClick={() => onToggleAllDoors?.(true)}
                  className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded text-[11px] font-bold flex items-center gap-1"
                  title="Abre todas as portas do mapa (luz passa)"
                >
                  <DoorOpen size={12} />
                  <span>Abrir Todas</span>
                </button>
                <button
                  type="button"
                  onClick={() => onToggleAllDoors?.(false)}
                  className="px-2 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded text-[11px] font-bold flex items-center gap-1"
                  title="Fecha todas as portas do mapa (bloqueia luz)"
                >
                  <DoorClosed size={12} />
                  <span>Fechar Todas</span>
                </button>
              </div>
            </div>
          ) : activeTool === 'light' ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 font-bold text-amber-400 select-none">
                <Flame size={15} />
                <span>Luz Livre:</span>
              </span>
              <span className="text-slate-300 text-[11px]">
                Posicionamento contínuo: clique no mapa para colocar luz em qualquer lugar (não respeita hexágonos).
              </span>

              {/* Ajuste rápido do raio da luz */}
              <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 font-mono">Raio:</span>
                <button
                  type="button"
                  onClick={() => onSetCustomLightRadius?.(Math.max(1, (customLightRadius || 5) - 1))}
                  className="p-0.5 text-slate-400 hover:text-white"
                >
                  <Minus size={11} />
                </button>
                <span className="font-mono font-bold text-amber-300 text-xs px-1">
                  {customLightRadius || 5} yd
                </span>
                <button
                  type="button"
                  onClick={() => onSetCustomLightRadius?.((customLightRadius || 5) + 1)}
                  className="p-0.5 text-slate-400 hover:text-white"
                >
                  <Plus size={11} />
                </button>
              </div>

              {/* Ângulo de Abertura */}
              <div className="flex items-center gap-1 bg-slate-950 px-1.5 py-0.5 rounded-lg border border-slate-800">
                {[360, 180, 90].map((deg) => (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => onSetCustomLightAngle?.(deg)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      (customLightAngle || 360) === deg
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {deg === 360 ? '360°' : deg === 180 ? '180°' : '90°'}
                  </button>
                ))}
              </div>

              {/* Rotação se o ângulo for direcional (< 360) */}
              {customLightAngle && customLightAngle < 360 && (
                <div className="flex items-center gap-1 bg-slate-950 px-1.5 py-0.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-mono">Giro:</span>
                  <button
                    type="button"
                    onClick={() => onSetCustomLightRotation?.(((customLightRotation ?? 0) - 15 + 360) % 360)}
                    className="p-0.5 text-slate-400 hover:text-white"
                  >
                    <RotateCcw size={11} />
                  </button>
                  <span className="font-mono font-bold text-amber-300 text-xs px-0.5">
                    {customLightRotation ?? 0}°
                  </span>
                  <button
                    type="button"
                    onClick={() => onSetCustomLightRotation?.(((customLightRotation ?? 0) + 15) % 360)}
                    className="p-0.5 text-slate-400 hover:text-white"
                  >
                    <RotateCw size={11} />
                  </button>
                </div>
              )}

              {/* Gerenciar Focos de Luz */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsLightListOpen(!isLightListOpen)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                    isLightListOpen
                      ? 'bg-amber-500 text-slate-950 border-amber-500'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                  }`}
                  title="Ver lista de focos de luz para ligar/apagar ou excluir"
                >
                  <Flame size={12} />
                  <span>{(tacticalState.lights || []).length} Luzes</span>
                </button>

                {isLightListOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsLightListOpen(false)} />
                    <div className="absolute top-full left-0 mt-2 w-72 bg-slate-950 border border-amber-500/40 rounded-xl shadow-2xl p-3 z-50 text-xs space-y-2.5">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-slate-200 font-bold">
                        <span className="flex items-center gap-1.5 text-amber-400">
                          <Flame size={14} /> Focos de Luz no Tabuleiro
                        </span>
                        <button onClick={() => setIsLightListOpen(false)} className="p-0.5 text-slate-400 hover:text-white rounded">
                          <X size={13} />
                        </button>
                      </div>

                      {(tacticalState.lights || []).length === 0 ? (
                        <div className="text-slate-500 italic p-2 text-center text-[11px]">
                          Nenhum foco de luz adicionado ainda. Clique no mapa para inserir.
                        </div>
                      ) : (
                        <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                          {(tacticalState.lights || []).map((l, idx) => (
                            <div
                              key={l.id}
                              className="flex items-center justify-between px-2 py-1.5 rounded-lg border border-slate-800 bg-slate-900/80 text-[11px]"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span>{l.active !== false ? '🔥' : '🪔'}</span>
                                <div className="truncate">
                                  <div className="font-semibold text-slate-200 truncate">{l.label || `Luz #${idx + 1}`}</div>
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
                                      item.id === l.id ? { ...item, active: !item.active } : item
                                    );
                                    onUpdateTacticalState({ lights: updated });
                                  }}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                                    l.active !== false
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
                                  }`}
                                  title={l.active !== false ? 'Clique para APAGAR a luz' : 'Clique para ACENDER a luz'}
                                >
                                  {l.active !== false ? 'Acesa' : 'Apagada'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = (tacticalState.lights || []).filter((item) => item.id !== l.id);
                                    onUpdateTacticalState({ lights: updated });
                                  }}
                                  className="p-1 rounded text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 cursor-pointer"
                                  title="Excluir este foco de luz"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {onAddLightAtCenter && (
                <button
                  type="button"
                  onClick={onAddLightAtCenter}
                  className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded text-[11px] font-bold flex items-center gap-1"
                >
                  <Plus size={12} />
                  <span>Luz no Centro</span>
                </button>
              )}
            </div>
          ) : null}

          {/* Gerenciador / Lista de Paredes e Portas */}
          <div className="flex items-center gap-1.5 ml-auto">
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsWallsDoorsOpen(!isWallsDoorsOpen)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold transition-all border ${
                  isWallsDoorsOpen
                    ? 'bg-amber-500 text-slate-950 border-amber-500'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
                title="Ver lista de paredes e portas cadastradas no mapa"
              >
                <span>
                  {(tacticalState.walls || []).length}P / {(tacticalState.doors || []).length}D
                </span>
                <Sliders size={12} />
              </button>

              {isWallsDoorsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsWallsDoorsOpen(false)}
                  />
                  <div className="absolute top-full right-0 mt-2 w-80 bg-slate-950 border border-amber-500/40 rounded-xl shadow-2xl p-3 z-50 text-xs space-y-3">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-slate-200 font-bold">
                      <span className="flex items-center gap-1 text-amber-400">
                        <Spline size={14} /> Paredes & Portas do Mapa
                      </span>
                      <button
                        onClick={() => setIsWallsDoorsOpen(false)}
                        className="p-1 text-slate-400 hover:text-white rounded"
                      >
                        <X size={13} />
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
                            className="text-rose-400 hover:text-rose-300 text-[10px] underline"
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
                                  className="text-slate-400 hover:text-rose-400 p-0.5 rounded hover:bg-rose-500/20 transition-colors"
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
                            className="text-rose-400 hover:text-rose-300 text-[10px] underline"
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
                                    className={`px-1.5 py-0.2 rounded font-bold text-[10px] transition-colors ${
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
                                  className="text-slate-400 hover:text-rose-400 p-0.5 rounded hover:bg-rose-500/20 transition-colors"
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
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BARRA DE CONTROLE: OCULTAR E MOSTRAR ÁREAS */}
      {isMaster && activeTool === 'fog' && (
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-2 shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 font-bold text-slate-200 mr-1 select-none">
              {fogBrushMode === 'hide' ? (
                <EyeOff size={14} className="text-rose-400" />
              ) : (
                <Eye size={14} className="text-emerald-400" />
              )}
              <span>{fogBrushMode === 'hide' ? 'Ocultar Áreas:' : 'Mostrar Áreas:'}</span>
            </span>

            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => onSetFogBrushMode?.('hide')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  fogBrushMode === 'hide'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Ocultar Área: Desenhe um retângulo no mapa para esconder dos jogadores. Áreas ocultadas não aparecem nem com visualização."
              >
                <EyeOff size={13} />
                <span>Ocultar Área</span>
              </button>

              <button
                type="button"
                onClick={() => onSetFogBrushMode?.('reveal')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  fogBrushMode === 'reveal'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Mostrar Área: Desenhe um retângulo no mapa para liberar a visão dos jogadores."
              >
                <Eye size={13} />
                <span>Mostrar Área</span>
              </button>
            </div>

            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Arraste no mapa para desenhar o retângulo.
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {onHideAllFog && (
              <button
                type="button"
                onClick={onHideAllFog}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer"
                title="Cobre o mapa inteiro com névoa inicial"
              >
                <EyeOff size={12} />
                <span>Ocultar Tudo</span>
              </button>
            )}
            {onRevealAllFog && (
              <button
                type="button"
                onClick={onRevealAllFog}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer"
                title="Libera a visão do mapa inteiro"
              >
                <Eye size={12} />
                <span>Revelar Tudo</span>
              </button>
            )}
            <span className="text-[11px] font-mono text-slate-400 ml-1">
              {(tacticalState.fogRects || []).length} áreas
            </span>
            {(tacticalState.fogRects || []).length > 0 && (
              <button
                type="button"
                onClick={() => onUpdateTacticalState({ fogRects: [] })}
                className="px-2 py-1 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer"
                title="Remover todas as áreas ocultadas e reveladas"
              >
                <Trash2 size={12} />
                <span>Limpar</span>
              </button>
            )}
          </div>
        </div>
      )}


      {/* BARRA DE CONTROLE UNIFICADA: MEDIÇÕES (DISTÂNCIA, ÁREA DE EFEITO E ALCANCE) */}
      {activeTool === 'ruler' && (
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-2 shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 font-bold text-slate-200">
              <Ruler size={14} className="text-amber-400" />
              <span>Medir:</span>
            </span>
            <span className="text-[11px] text-slate-400">
              {rulerType === 'blast'
                ? 'Clique no mapa para posicionar a área de efeito.'
                : '1º clique marca origem, 2º clique fixa medição.'}
            </span>
          </div>

          {/* Seletor de Tipo: Distância vs Área de Efeito */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase font-mono font-bold px-1 select-none">
              Tipo:
            </span>
            <button
              type="button"
              onClick={() => onSetRulerType?.('line')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                rulerType === 'line'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Medição de Distância (1º clique inicia, 2º clique fixa)"
            >
              <Ruler size={12} />
              <span>Distância (Seta)</span>
            </button>
            <button
              type="button"
              onClick={() => onSetRulerType?.('blast')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                rulerType === 'blast'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Modelo de Área de Efeito (Explosões, Magias, Granadas)"
            >
              <CircleDot size={12} />
              <span>Área de Efeito</span>
            </button>
          </div>

          {/* Controles para Área de Efeito */}
          {rulerType === 'blast' && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-mono font-bold px-1 select-none">
                  Raio:
                </span>
                <button
                  type="button"
                  onClick={() => onSetAreaRadius?.(Math.max(1, (areaRadius || 3) - 1))}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white cursor-pointer"
                  title="Diminuir raio"
                >
                  <Minus size={11} />
                </button>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={areaRadius || 3}
                  onChange={(e) => onSetAreaRadius?.(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center font-mono font-bold text-amber-300 text-xs focus:outline-none focus:border-amber-500"
                />
                <span className="text-[11px] text-amber-400 font-bold pr-1">yd</span>
                <button
                  type="button"
                  onClick={() => onSetAreaRadius?.((areaRadius || 3) + 1)}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white cursor-pointer"
                  title="Aumentar raio"
                >
                  <Plus size={11} />
                </button>
              </div>

              {/* Cores da Área */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-mono font-bold px-1 select-none">
                  Cor:
                </span>
                {[
                  { color: '#ef4444', label: 'Fogo / Explosão' },
                  { color: '#10b981', label: 'Ácido / Gás' },
                  { color: '#0ea5e9', label: 'Gelo / Água' },
                  { color: '#8b5cf6', label: 'Mágica' },
                  { color: '#f59e0b', label: 'Luz / Sagrado' },
                ].map((c) => (
                  <button
                    key={c.color}
                    type="button"
                    onClick={() => onSetAreaColor?.(c.color)}
                    className={`w-4 h-4 rounded-full border transition-transform cursor-pointer ${
                      areaColor === c.color ? 'scale-125 border-white ring-2 ring-white/50' : 'border-transparent hover:scale-110'
                    }`}
                    style={{ backgroundColor: c.color }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Indicador de Medições no Mapa (sem botão Limpar Medições) */}
          <div className="flex items-center gap-1.5">
            {activeRulerMarkersCount > 0 && (
              <span className="text-[11px] text-amber-300 font-mono font-bold bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-lg">
                {activeRulerMarkersCount} {activeRulerMarkersCount === 1 ? 'marcação no mapa' : 'marcações no mapa'}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
