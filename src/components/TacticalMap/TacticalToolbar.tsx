import React, { useState, useRef } from 'react';
import {
  TacticalState,
  TacticalBackgroundKey,
  TACTICAL_MAP_PRESETS,
  GridType,
  TacticalLayer,
  TacticalViewMode,
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
} from 'lucide-react';
import { UserAccount } from '../../types/rpg';

export type TacticalToolMode = 'select' | 'ruler' | 'area' | 'terrain' | 'fog' | 'light';

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
}) => {
  const [mapConfigOpen, setMapConfigOpen] = useState(false);
  const [sliderBaseWidth, setSliderBaseWidth] = useState<number | null>(null);
  const [sliderBaseHexSize, setSliderBaseHexSize] = useState<number | null>(null);
  const [customUrlInput, setCustomUrlInput] = useState(tacticalState.customImageUrl || '');
  const [isLightListOpen, setIsLightListOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMaster = currentUserRole === 'mestre';
  const activeLayer: TacticalLayer = tacticalState.activeLayer || 'tokens';

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
                onClick={() => onSelectTool('fog')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activeTool === 'fog'
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Ocultação de Áreas / Névoa de Guerra & Focos de Luz"
              >
                {tacticalState.fogEnabled ? <EyeOff size={14} /> : <Eye size={14} />}
                <span>Ocultar</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. MAPAS DO SISTEMA, CONFIGURAÇÃO DO MAPA & ELEMENTOS DE CENÁRIO */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Botão de Elementos & Cenário (Props / Mobília Roll20) */}
        {isMaster && (
          <button
            type="button"
            onClick={onOpenPropsModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold transition-all shadow-sm"
            title="Elementos & Cenário (Mesas de taverna, baús, barris, portas e mobília sobre o mapa)"
          >
            <Armchair size={13} className="text-amber-400" />
            <span>Elementos / Cenário</span>
            {typeof propsCount === 'number' && propsCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-amber-500/30 text-amber-200">
                {propsCount}
              </span>
            )}
          </button>
        )}

        {/* Botão Unificado: Configuração do Mapa (Upload, Imagem, Cenários e Grid) */}
        {isMaster && (
          <div className="relative">
            <button
              onClick={() => {
                const next = !mapConfigOpen;
                if (next) {
                  setSliderBaseWidth(tacticalState.mapImageWidth || 2000);
                  setSliderBaseHexSize(tacticalState.hexSize || 38);
                }
                setMapConfigOpen(next);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                mapConfigOpen
                  ? 'bg-amber-500 text-slate-950 font-bold border border-amber-500'
                  : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
              }`}
              title="Configuração do Mapa (Upload de Imagem e Calibração do Grid)"
            >
              <Sliders size={13} />
              <span>Configuração do Mapa</span>
            </button>

            {mapConfigOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMapConfigOpen(false)}
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
                      onClick={() => setMapConfigOpen(false)}
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

                      // Slider com ponto inicial no meio (50%) e margem balanceada para os dois lados
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
                            <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                              <Lock size={10} /> Proporção Preservada
                            </span>
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

                          {/* Slider e Botões de Redimensionamento Proporcional */}
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleResizeMapWidth(curMapW - 100)}
                              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-white rounded font-mono font-bold text-xs"
                              title="Diminuir 100px"
                            >
                              -100
                            </button>
                            <input
                              type="range"
                              min={minW}
                              max={maxW}
                              step="20"
                              value={curMapW}
                              onChange={(e) => handleResizeMapWidth(Number(e.target.value))}
                              className="flex-1 accent-amber-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleResizeMapWidth(curMapW + 100)}
                              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-white rounded font-mono font-bold text-xs"
                              title="Aumentar 100px"
                            >
                              +100
                            </button>
                          </div>

                          {/* Presets Rápidos */}
                          <div className="flex items-center justify-between gap-1 text-[10px] pt-0.5">
                            <button
                              type="button"
                              onClick={() => handleResizeMapWidth(1200)}
                              className="flex-1 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 text-center"
                            >
                              1200px
                            </button>
                            <button
                              type="button"
                              onClick={() => handleResizeMapWidth(2000)}
                              className="flex-1 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 text-center"
                            >
                              2000px
                            </button>
                            <button
                              type="button"
                              onClick={() => handleResizeMapWidth(3000)}
                              className="flex-1 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 text-center"
                            >
                              3000px
                            </button>
                            <button
                              type="button"
                              onClick={() => handleResizeMapWidth(4000)}
                              className="flex-1 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 text-center"
                            >
                              4000px
                            </button>
                          </div>
                          <div className="text-[10px] text-slate-400 italic">
                            Altere o tamanho da imagem para calibrar a escala das salas e do grid sem esticar nem distorcer.
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

                    {/* Escala da Grade: Tamanho do Hexágono (hexSize) com ponto inicial no meio */}
                    {(() => {
                      const curHex = tacticalState.hexSize || 38;
                      const baseHex = sliderBaseHexSize || curHex;
                      const minHex = Math.min(curHex - 5, Math.max(10, Math.round(baseHex * 0.35)));
                      const maxHex = Math.max(curHex + 5, Math.round(baseHex * 1.65));

                      return (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-slate-300 font-semibold">
                            <span>Tamanho do Hexágono (Célula do Grid):</span>
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
                          <div className="text-[10px] text-slate-400 italic">
                            Aumente ou diminua o tamanho de cada hexágono para alinhar a grade perfeitamente com a imagem do mapa.
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

                    {/* Travar Mapa & Névoa de Guerra */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateTacticalState({
                            mapImageLocked: !tacticalState.mapImageLocked,
                          })
                        }
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold transition-all ${
                          tacticalState.mapImageLocked
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-750'
                        }`}
                      >
                        {tacticalState.mapImageLocked ? (
                          <>
                            <Lock size={12} />
                            <span>Mapa Travado</span>
                          </>
                        ) : (
                          <>
                            <Unlock size={12} />
                            <span>Travar Posição</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onUpdateTacticalState({ fogEnabled: !tacticalState.fogEnabled })
                        }
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${
                          tacticalState.fogEnabled
                            ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold'
                            : 'bg-slate-850 text-slate-400 hover:text-white border-slate-750'
                        }`}
                      >
                        Névoa: {tacticalState.fogEnabled ? 'Ativada' : 'Desativada'}
                      </button>
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
        </div>
      </div>

      {/* BARRA DE CONTROLE: OCULTAÇÃO DO MAPA & FOCOS DE LUZ (UNIFICADOS) */}
      {isMaster && activeTool === 'fog' && (
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-2 shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-1">
          {/* 1. Ativação da Névoa & Seleção de Sub-ferramenta */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 font-bold text-slate-200">
              <EyeOff size={14} className="text-amber-400" />
              <span>Ocultação:</span>
            </span>

            {/* Alternar Ativação da Névoa */}
            <button
              type="button"
              onClick={() => onUpdateTacticalState({ fogEnabled: !tacticalState.fogEnabled })}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                tacticalState.fogEnabled
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {tacticalState.fogEnabled ? 'Névoa Ativada' : 'Névoa Desativada'}
            </button>
          </div>

          {/* Seletor: Retângulo de Névoa vs Foco de Luz */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => onSetFogSubTool?.('box')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                fogSubTool === 'box'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Seleção Retangular em linhas retas para revelar ou cobrir áreas com névoa"
            >
              <Square size={13} />
              <span>Retângulo</span>
            </button>
            <button
              type="button"
              onClick={() => onSetFogSubTool?.('light')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                fogSubTool === 'light'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Colocar focos de luz (tochas, lanternas, fogueiras) no mapa"
            >
              <Flame size={13} />
              <span>Foco de Luz</span>
            </button>
          </div>

          {/* CONTROLES QUANDO RETÂNGULO ESTÁ ATIVO */}
          {fogSubTool === 'box' && (
            <>
              {/* Modo: Revelar vs Ocultar */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-mono font-bold px-1 select-none">
                  Ação:
                </span>
                <button
                  type="button"
                  onClick={() => onSetFogBrushMode?.('reveal')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    fogBrushMode === 'reveal'
                      ? 'bg-emerald-600 text-white font-bold shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Revelar áreas para os jogadores (corta a névoa em linhas retas)"
                >
                  <Eye size={13} />
                  <span>Revelar</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSetFogBrushMode?.('hide')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    fogBrushMode === 'hide'
                      ? 'bg-rose-600 text-white font-bold shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Recobrir áreas dos jogadores com escuridão"
                >
                  <EyeOff size={13} />
                  <span>Ocultar</span>
                </button>
              </div>

              {/* Ações em Lote */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onRevealAllFog}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium transition-all"
                  title="Revelar todo o mapa instantaneamente"
                >
                  Revelar Tudo
                </button>
                <button
                  type="button"
                  onClick={onHideAllFog}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium transition-all"
                  title="Cobrir todo o mapa com escuridão"
                >
                  Ocultar Tudo
                </button>
              </div>
            </>
          )}

          {/* CONTROLES QUANDO FOCO DE LUZ ESTÁ ATIVO */}
          {fogSubTool === 'light' && (
            <>
              {/* Seletor de Ação: Inserir Luz vs Remover Luz */}
              <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => onSetLightAction?.('add')}
                  className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    lightAction === 'add'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Modo Inserir: clique no mapa para posicionar novos focos de luz"
                >
                  <Plus size={12} className={lightAction === 'add' ? 'text-amber-400' : ''} />
                  <span>Inserir Luz</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSetLightAction?.('remove')}
                  className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    lightAction === 'remove'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-xs'
                      : 'text-slate-400 hover:text-rose-300'
                  }`}
                  title="Modo Remover: clique em qualquer foco de luz no mapa para excluí-lo"
                >
                  <Trash2 size={12} className={lightAction === 'remove' ? 'text-rose-400' : ''} />
                  <span>Remover Luz</span>
                </button>
              </div>

              {lightAction === 'add' && (
                <>
                  <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-mono font-bold px-1 select-none">
                      Raio:
                    </span>
                    <button
                      type="button"
                      onClick={() => onSetCustomLightRadius?.(Math.max(1, (customLightRadius || 5) - 1))}
                      className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                      title="Diminuir 1 jarda"
                    >
                      <Minus size={11} />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={customLightRadius || 5}
                      onChange={(e) => onSetCustomLightRadius?.(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center font-mono font-bold text-amber-300 text-xs focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-[11px] text-amber-400 font-bold pr-1">yd</span>
                    <button
                      type="button"
                      onClick={() => onSetCustomLightRadius?.((customLightRadius || 5) + 1)}
                      className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                      title="Aumentar 1 jarda"
                    >
                      <Plus size={11} />
                    </button>
                  </div>

                  {/* 3 Botões de Ângulo: 360°, 180°, 90° */}
                  <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => onSetCustomLightAngle?.(360)}
                      className={`px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                        (customLightAngle || 360) === 360
                          ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Foco de Luz Circular Total (360°)"
                    >
                      360°
                    </button>
                    <button
                      type="button"
                      onClick={() => onSetCustomLightAngle?.(180)}
                      className={`px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                        customLightAngle === 180
                          ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Foco de Luz Semicircular (180° - Arandela/Porta)"
                    >
                      180°
                    </button>
                    <button
                      type="button"
                      onClick={() => onSetCustomLightAngle?.(90)}
                      className={`px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                        customLightAngle === 90
                          ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Foco de Luz em Cone (90° - Lanterna/Holofote)"
                    >
                      90°
                    </button>
                  </div>

                  {/* Giro em passos de 30° (frente e trás) para 180° ou 90° */}
                  {customLightAngle && customLightAngle < 360 && (
                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-mono font-bold px-1 select-none">
                        Giro:
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onSetCustomLightRotation?.(((customLightRotation ?? 0) - 30 + 360) % 360)
                        }
                        className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white cursor-pointer"
                        title="Girar 30° para trás / anti-horário"
                      >
                        <RotateCcw size={12} />
                      </button>
                      <span className="font-mono font-bold text-amber-300 text-xs px-1 min-w-[34px] text-center select-none">
                        {(customLightRotation ?? 0)}°
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onSetCustomLightRotation?.(((customLightRotation ?? 0) + 30) % 360)
                        }
                        className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white cursor-pointer"
                        title="Girar 30° para frente / horário"
                      >
                        <RotateCw size={12} />
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Gerenciar Luzes Existentes */}
              <div className="relative flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsLightListOpen((prev) => !prev)}
                  className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                    isLightListOpen
                      ? 'bg-amber-500/30 text-amber-200 border-amber-400'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                  }`}
                  title="Clique para ver a lista de focos de luz"
                >
                  <Flame size={12} className="text-amber-400" />
                  <span>{(tacticalState.lights || []).length} luzes</span>
                </button>
                {(tacticalState.lights || []).length > 0 && (
                  <button
                    type="button"
                    onClick={() => onUpdateTacticalState({ lights: [] })}
                    className="px-2 py-1 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer"
                    title="Remover todos os focos de luz fixos do mapa"
                  >
                    <Trash2 size={12} />
                    <span>Limpar Todas</span>
                  </button>
                )}

                {/* Dropdown com a lista individual de luzes para apagar ou excluir uma a uma */}
                {isLightListOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900/98 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 text-xs text-slate-200">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                      <span className="font-bold text-amber-300 flex items-center gap-1.5">
                        <Flame size={14} className="text-amber-400" />
                        Luzes no Mapa ({(tacticalState.lights || []).length})
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsLightListOpen(false)}
                        className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    </div>

                    {(tacticalState.lights || []).length === 0 ? (
                      <p className="text-slate-400 italic text-center py-3">Nenhum foco de luz ativo no momento.</p>
                    ) : (
                      <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                        {(tacticalState.lights || []).map((l, idx) => (
                          <div
                            key={l.id}
                            className="flex items-center justify-between bg-slate-950/70 border border-slate-800/80 rounded-lg px-2 py-1.5 hover:border-slate-700"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm">🔥</span>
                              <div>
                                <div className="font-semibold text-slate-200">
                                  {l.label || `Luz #${idx + 1}`}
                                </div>
                                <div className="text-[10px] text-amber-400/90 font-mono">
                                  Raio: {l.radius} yd • {l.angle ? `${l.angle}°` : '360°'}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {l.angle && l.angle < 360 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextRot = (((l.rotation ?? 0) + 30) % 360);
                                    const updated = (tacticalState.lights || []).map((item) =>
                                      item.id === l.id ? { ...item, rotation: nextRot } : item
                                    );
                                    onUpdateTacticalState({ lights: updated });
                                  }}
                                  className="p-1 rounded text-amber-400 hover:bg-amber-500/20 cursor-pointer"
                                  title={`Girar foco (+30° atual: ${l.rotation ?? 0}°)`}
                                >
                                  <RotateCcw size={12} />
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
                                className={`p-1 rounded cursor-pointer ${
                                  l.active !== false ? 'text-amber-400 hover:bg-amber-500/20' : 'text-slate-500 hover:bg-slate-800'
                                }`}
                                title={l.active !== false ? 'Apagar foco' : 'Acender foco'}
                              >
                                {l.active !== false ? <Eye size={13} /> : <EyeOff size={13} />}
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
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
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
                : rulerType === 'fixed'
                ? 'Passe o mouse ou clique no mapa para ver o círculo de alcance exato.'
                : '1º clique marca origem, 2º clique fixa medição.'}
            </span>
          </div>

          {/* Seletor de Tipo: Distância vs Área de Efeito vs Alcance Fixo */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase font-mono font-bold px-1 select-none">
              Tipo:
            </span>
            <button
              type="button"
              onClick={() => onSetRulerType?.('line')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
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
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                rulerType === 'blast'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Modelo de Área de Efeito (Explosões, Magias, Granadas)"
            >
              <CircleDot size={12} />
              <span>Área de Efeito</span>
            </button>
            <button
              type="button"
              onClick={() => onSetRulerType?.('fixed')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                rulerType === 'fixed'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Alcance Fixo (Raio GURPS a partir de um ponto/token)"
            >
              <Crosshair size={12} />
              <span>Alcance Fixo</span>
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
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
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
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                >
                  <Plus size={11} />
                </button>
                {[1, 2, 3, 5, 8].map((yd) => (
                  <button
                    key={yd}
                    type="button"
                    onClick={() => onSetAreaRadius?.(yd)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                      areaRadius === yd
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-400 hover:text-white bg-slate-850'
                    }`}
                  >
                    {yd}y
                  </button>
                ))}
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
                    className={`w-4 h-4 rounded-full border transition-transform ${
                      areaColor === c.color ? 'scale-125 border-white ring-2 ring-white/50' : 'border-transparent hover:scale-110'
                    }`}
                    style={{ backgroundColor: c.color }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Controles para Alcance Fixo */}
          {rulerType === 'fixed' && (
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-mono font-bold px-1 select-none">
                Alcance:
              </span>
              <button
                type="button"
                onClick={() => onSetRulerFixedYards?.(Math.max(1, (rulerFixedYards || 5) - 1))}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
              >
                <Minus size={11} />
              </button>
              <input
                type="number"
                min={1}
                max={100}
                value={rulerFixedYards || 5}
                onChange={(e) => onSetRulerFixedYards?.(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center font-mono font-bold text-amber-300 text-xs focus:outline-none focus:border-amber-500"
              />
              <span className="text-[11px] text-amber-400 font-bold pr-1">yd</span>
              <button
                type="button"
                onClick={() => onSetRulerFixedYards?.((rulerFixedYards || 5) + 1)}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
              >
                <Plus size={11} />
              </button>
              {[1, 3, 5, 7, 10, 15].map((yd) => (
                <button
                  key={yd}
                  type="button"
                  onClick={() => onSetRulerFixedYards?.(yd)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                    rulerFixedYards === yd
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-white bg-slate-850'
                  }`}
                >
                  {yd}y
                </button>
              ))}
            </div>
          )}

          {/* Ações e Contadores */}
          <div className="flex items-center gap-1.5">
            {activeRulerMarkersCount > 0 && (
              <span className="text-[11px] text-amber-300 font-mono font-bold bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-lg">
                {activeRulerMarkersCount} {activeRulerMarkersCount === 1 ? 'marcação no mapa' : 'marcações no mapa'}
              </span>
            )}
            <button
              type="button"
              onClick={onClearRulerMarkers}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium transition-all"
              title="Limpar todas as medições e áreas fixadas no mapa"
            >
              Limpar Medições
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
