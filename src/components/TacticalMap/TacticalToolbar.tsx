import React, { useState, useRef } from 'react';
import {
  TacticalState,
  TacticalLayer,
} from '../../types/tactical';
import {
  MousePointer,
  Ruler,
  CircleDot,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Sliders,
  Map as MapIcon,
  ShieldAlert,
  Upload,
  Grid,
  Users,
  Check,
  X,
  Sun,
  Moon,
  Trash2,
  Square,
  Circle,
  Pentagon,
  Plus,
  Minus,
  FileImage,
} from 'lucide-react';
import { rotateTacticalState90 } from '../../utils/tacticalMath';
import { UserAccount } from '../../types/rpg';

export type TacticalToolMode = 'select' | 'ruler' | 'area' | 'terrain' | 'fog';

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
  fogShape?: 'rect' | 'circle' | 'polygon';
  onSetFogShape?: (shape: 'rect' | 'circle' | 'polygon') => void;
  fogCircleRadius?: number;
  onSetFogCircleRadius?: (radius: number) => void;
  fogPolyPointsCount?: number;
  onCloseFogPolygon?: () => void;
  onUndoFogPolyPoint?: () => void;
  onCancelFogPolygon?: () => void;
  onRevealAllFog?: () => void;
  onHideAllFog?: () => void;
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
  onOpenTokensModal,
  tokensCount,
  currentUserRole,
  fogBrushMode = 'reveal',
  onSetFogBrushMode,
  fogShape = 'rect',
  onSetFogShape,
  fogCircleRadius = 5,
  onSetFogCircleRadius,
  fogPolyPointsCount = 0,
  onCloseFogPolygon,
  onUndoFogPolyPoint,
  onCancelFogPolygon,
  rulerType = 'line',
  onSetRulerType,
  areaRadius = 3,
  onSetAreaRadius,
}) => {
  const [mapConfigOpen, setMapConfigOpen] = useState(false);
  const [sliderBaseWidth, setSliderBaseWidth] = useState<number | null>(null);
  const [sliderBaseHexSize, setSliderBaseHexSize] = useState<number | null>(null);
  const [customUrlInput, setCustomUrlInput] = useState(tacticalState.customImageUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMaster = currentUserRole === 'mestre';
  const activeLayer: TacticalLayer = tacticalState.activeLayer || 'tokens';

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
              title="Nível 1: Camada do Mapa (Imagem base, alinhamento do grid e áreas ocultas)"
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
              title="Nível 2: Camada de Jogadores (Visão real dos Jogadores: combatentes e tokens públicos)"
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
              title="Nível 3: Camada do Mestre (Visão do Mestre: tokens secretos, áreas ocultas translúcidas e marcações do GM)"
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
                    onClick={() => {
                      onSelectTool('fog');
                      onSetFogBrushMode?.('hide');
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      activeTool === 'fog' && fogBrushMode === 'hide'
                        ? 'bg-rose-600 text-white shadow-sm font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Ocultar Áreas (arraste no mapa para esconder áreas dos jogadores)"
                  >
                    <EyeOff size={14} />
                    <span>Ocultar Áreas</span>
                  </button>

                  <button
                    onClick={() => {
                      onSelectTool('fog');
                      onSetFogBrushMode?.('reveal');
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
                  </div>
                </div>
              </>
            )}
          </div>
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

          {/* 2. Ocultar / Mostrar Áreas (Fog: Retângulo, Círculo e Polígono) */}
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

              {/* Botão Limpar Névoa */}
              {(tacticalState.fogRects || []).length > 0 && (
                <button
                  type="button"
                  onClick={() => onUpdateTacticalState({ fogRects: [], fogEnabled: false, fogMode: 'open' })}
                  className="px-2 py-0.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 rounded text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ml-1"
                  title="Limpar todas as áreas de névoa"
                >
                  <Trash2 size={11} />
                  <span>Limpar</span>
                </button>
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
