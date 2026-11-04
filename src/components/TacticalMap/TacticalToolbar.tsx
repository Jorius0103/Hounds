import React, { useState } from 'react';
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
  Eye,
  EyeOff,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
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
  fogBrushRadius?: number;
  onSetFogBrushRadius?: (radius: number) => void;
  fogShape?: 'brush' | 'box';
  onSetFogShape?: (shape: 'brush' | 'box') => void;
  onRevealAllFog?: () => void;
  onHideAllFog?: () => void;
  selectedLightPreset?: { label: string; radius: number; color: string };
  onSelectLightPreset?: (preset: { label: string; radius: number; color: string }) => void;
  customLightRadius?: number;
  onSetCustomLightRadius?: (radius: number) => void;
  customLightColor?: string;
  onSetCustomLightColor?: (color: string) => void;
  rulerMode?: 'free' | 'fixed';
  onSetRulerMode?: (mode: 'free' | 'fixed') => void;
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
  currentUserRole,
  onOpenPlayerPermissions,
  editorCount = 0,
  users = [],
  editorUserIds = [],
  onTogglePlayerPermission,
  onSetAllPlayerPermissions,
  fogBrushMode = 'reveal',
  onSetFogBrushMode,
  fogBrushRadius = 1,
  onSetFogBrushRadius,
  fogShape = 'brush',
  onSetFogShape,
  onRevealAllFog,
  onHideAllFog,
  selectedLightPreset = { label: 'Tocha', radius: 4, color: '#f59e0b' },
  onSelectLightPreset,
  customLightRadius = 5,
  onSetCustomLightRadius,
  customLightColor = '#f59e0b',
  onSetCustomLightColor,
  rulerMode = 'free',
  onSetRulerMode,
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [mapCalibrateOpen, setMapCalibrateOpen] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState(tacticalState.customImageUrl || '');

  const isMaster = currentUserRole === 'mestre';
  const activeLayer: TacticalLayer = tacticalState.activeLayer || 'tokens';

  const currentPreset =
    TACTICAL_MAP_PRESETS.find((p) => p.key === tacticalState.backgroundKey) ||
    TACTICAL_MAP_PRESETS[0];

  return (
    <div
      className="flex flex-col gap-1.5 pointer-events-auto"
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
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
              title="Nível 1: Camada do Mapa (Imagem base e alinhamento do grid hexagonal - tokens ficam ocultos para calibrar)"
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
            title="Régua Tática de Distância e Tabela de Alcance GURPS"
          >
            <Ruler size={14} />
            <span>Medir</span>
          </button>

          <button
            onClick={() => onSelectTool('area')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTool === 'area'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Modelo de Área de Efeito (Explosões, Magias de Área, Granadas)"
          >
            <CircleDot size={14} />
            <span>Área</span>
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
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activeTool === 'fog'
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Ocultação de Áreas / Névoa de Guerra (Estilo Roll20)"
              >
                {tacticalState.fogEnabled ? <EyeOff size={14} /> : <Eye size={14} />}
                <span>Ocultar</span>
              </button>

              <button
                onClick={() => onSelectTool('light')}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activeTool === 'light'
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Focos de Luz (Tochas, Lanternas, Fogueiras no mapa)"
              >
                <Flame size={14} />
                <span>Luz</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. CALIBRAÇÃO DO MAPA & CONFIGURAÇÕES */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Botão de Calibração do Mapa (visível na camada de mapa) */}
        {isMaster && activeLayer === 'map' && (
          <div className="relative">
            <button
              onClick={() => setMapCalibrateOpen(!mapCalibrateOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition-all shadow-sm animate-pulse"
              title="Calibrar Imagem Base & Grid Hexagonal"
            >
              <Sliders size={13} />
              <span>Calibrar Grid & Imagem</span>
            </button>

            {mapCalibrateOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMapCalibrateOpen(false)}
                />
                <div className="absolute top-full right-0 mt-2 w-80 bg-slate-950 border border-amber-500/50 rounded-xl shadow-2xl p-4 z-50 text-xs space-y-3.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-slate-200 font-bold">
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <MapIcon size={14} /> Escalonar Mapa & Grid
                    </span>
                    <button
                      onClick={() => setMapCalibrateOpen(false)}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Arraste a imagem pelo mapa para posicionar. Use os controles abaixo para dimensionar a imagem e alinhar os hexágonos com a imagem de baixo:
                  </p>

                  {/* Tamanho do Hexágono (hexSize) */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-300 font-semibold">
                      <span>Tamanho do Grid Hexagonal:</span>
                      <span className="font-mono text-amber-400 font-bold">
                        {tacticalState.hexSize}px
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          onUpdateTacticalState({
                            hexSize: Math.max(16, (tacticalState.hexSize || 38) - 1),
                          })
                        }
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-white rounded font-mono font-bold"
                      >
                        -
                      </button>
                      <input
                        type="range"
                        min="18"
                        max="85"
                        value={tacticalState.hexSize || 38}
                        onChange={(e) =>
                          onUpdateTacticalState({ hexSize: Number(e.target.value) })
                        }
                        className="flex-1 accent-amber-500"
                      />
                      <button
                        onClick={() =>
                          onUpdateTacticalState({
                            hexSize: Math.min(100, (tacticalState.hexSize || 38) + 1),
                          })
                        }
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-white rounded font-mono font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Cor do Grid: Clara vs Escura para contraste com o mapa */}
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-300 font-semibold block">
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
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
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
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        <Sun size={12} />
                        <span>Grade Escura</span>
                      </button>
                    </div>
                  </div>

                  {/* Escala da Imagem (%) */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-300 font-semibold">
                      <span>Escala da Imagem de Fundo:</span>
                      <span className="font-mono text-amber-400 font-bold">
                        {Math.round((tacticalState.mapImageScale || 1) * 100)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          onUpdateTacticalState({
                            mapImageScale: Math.max(
                              0.2,
                              Number(((tacticalState.mapImageScale || 1) - 0.05).toFixed(2))
                            ),
                          })
                        }
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-white rounded font-mono font-bold"
                      >
                        -
                      </button>
                      <input
                        type="range"
                        min="0.2"
                        max="3"
                        step="0.02"
                        value={tacticalState.mapImageScale || 1}
                        onChange={(e) =>
                          onUpdateTacticalState({ mapImageScale: Number(e.target.value) })
                        }
                        className="flex-1 accent-amber-500"
                      />
                      <button
                        onClick={() =>
                          onUpdateTacticalState({
                            mapImageScale: Math.min(
                              4,
                              Number(((tacticalState.mapImageScale || 1) + 0.05).toFixed(2))
                            ),
                          })
                        }
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-white rounded font-mono font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Deslocamento X e Y (Offset) */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="space-y-1">
                      <span className="text-slate-400">Offset X:</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            onUpdateTacticalState({
                              mapImageX: (tacticalState.mapImageX || 0) - 5,
                            })
                          }
                          className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
                        >
                          ◀
                        </button>
                        <span className="font-mono text-amber-300 text-center flex-1">
                          {tacticalState.mapImageX || 0}px
                        </span>
                        <button
                          onClick={() =>
                            onUpdateTacticalState({
                              mapImageX: (tacticalState.mapImageX || 0) + 5,
                            })
                          }
                          className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
                        >
                          ▶
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-slate-400">Offset Y:</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            onUpdateTacticalState({
                              mapImageY: (tacticalState.mapImageY || 0) - 5,
                            })
                          }
                          className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
                        >
                          ▲
                        </button>
                        <span className="font-mono text-amber-300 text-center flex-1">
                          {tacticalState.mapImageY || 0}px
                        </span>
                        <button
                          onClick={() =>
                            onUpdateTacticalState({
                              mapImageY: (tacticalState.mapImageY || 0) + 5,
                            })
                          }
                          className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
                        >
                          ▼
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Botões de Ação Rápida */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                    <button
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
                      onClick={() =>
                        onUpdateTacticalState({
                          mapImageX: 0,
                          mapImageY: 0,
                          mapImageScale: 1,
                        })
                      }
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold text-center"
                    >
                      Resetar Posição
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Seletor de Mapa de Fundo */}
        <div className="relative">
          <button
            onClick={() => setMapPickerOpen(!mapPickerOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-medium text-slate-200 hover:text-white transition-colors"
            title="Escolher Mapa de Fundo"
          >
            <MapIcon size={14} className="text-amber-400" />
            <span className="max-w-[120px] truncate">{currentPreset.name}</span>
          </button>

          {mapPickerOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMapPickerOpen(false)}
              />
              <div className="absolute top-full right-0 mt-2 w-80 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl p-3 z-50 text-xs space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800 text-slate-300 font-bold">
                  <span>Mapas de Batalha & Cenários</span>
                  <span className="text-[10px] text-amber-400 uppercase font-mono">The Hounds</span>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                  {TACTICAL_MAP_PRESETS.map((preset) => {
                    const isSelected = tacticalState.backgroundKey === preset.key;
                    return (
                      <button
                        key={preset.key}
                        onClick={() => {
                          onUpdateTacticalState({ backgroundKey: preset.key });
                          setMapPickerOpen(false);
                        }}
                        className={`w-full text-left p-2 rounded-lg border transition-all flex items-start gap-2.5 ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500/60 text-white'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700'
                        }`}
                      >
                        <div
                          className="w-3.5 h-3.5 rounded-full mt-0.5 shrink-0 border border-white/20"
                          style={{ backgroundColor: preset.themeColor }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-xs flex items-center justify-between">
                            <span>{preset.name}</span>
                            {preset.url && (
                              <span className="text-[9px] bg-slate-800 text-amber-300 px-1 py-0.2 rounded font-mono">
                                Campanha
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 line-clamp-1">
                            {preset.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {tacticalState.backgroundKey === 'custom' && (
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <label className="text-[11px] font-semibold text-slate-300 block">
                      URL da Imagem do Mapa:
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={customUrlInput}
                        onChange={(e) => setCustomUrlInput(e.target.value)}
                        placeholder="https://exemplo.com/mapa.jpg"
                        className="flex-1 bg-slate-900 border border-slate-750 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                      <button
                        onClick={() => {
                          onUpdateTacticalState({ customImageUrl: customUrlInput });
                        }}
                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs"
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Botão de Configurações Gerais do Grid */}
        <div className="relative">
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className={`p-1.5 rounded-lg border transition-colors ${
              settingsOpen
                ? 'bg-slate-800 border-amber-500/50 text-amber-400'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Ajustar Grade Hexagonal, Escala e Visibilidade"
          >
            <Sliders size={14} />
          </button>

          {/* Botão Rápido de Alternância de Cor do Grid: Clara / Escura */}
          <button
            type="button"
            onClick={() => {
              const isDark =
                tacticalState.gridColor === '#0f172a' ||
                tacticalState.gridColor === '#000000' ||
                tacticalState.gridColor === '#1e293b';
              if (isDark) {
                onUpdateTacticalState({
                  gridColor: '#cbd5e1',
                  gridOpacity: 0.28,
                });
              } else {
                onUpdateTacticalState({
                  gridColor: '#0f172a',
                  gridOpacity: 0.65,
                });
              }
            }}
            className={`p-1.5 rounded-lg border transition-all ml-1 ${
              tacticalState.gridColor === '#0f172a' ||
              tacticalState.gridColor === '#000000' ||
              tacticalState.gridColor === '#1e293b'
                ? 'bg-slate-900 border-amber-500/50 text-amber-400 shadow-xs'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title={
              tacticalState.gridColor === '#0f172a' ||
              tacticalState.gridColor === '#000000' ||
              tacticalState.gridColor === '#1e293b'
                ? 'Grade Escura ativa (ideal para mapas claros). Clique para alternar para Grade Clara.'
                : 'Grade Clara ativa (ideal para mapas escuros). Clique para alternar para Grade Escura.'
            }
          >
            {tacticalState.gridColor === '#0f172a' ||
            tacticalState.gridColor === '#000000' ||
            tacticalState.gridColor === '#1e293b' ? (
              <Sun size={14} className="text-amber-400" />
            ) : (
              <Moon size={14} className="text-slate-400" />
            )}
          </button>

          {settingsOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setSettingsOpen(false)}
              />
              <div className="absolute top-full right-0 mt-2 w-72 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl p-3.5 z-50 text-xs space-y-3.5">
                <div className="font-bold text-slate-200 border-b border-slate-800 pb-1.5 flex items-center justify-between">
                  <span>Propriedades do Grid Tático</span>
                  <span className="text-[10px] text-amber-400 font-mono">GURPS 4e</span>
                </div>

                {/* Tipo de Grade */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    Tipo de Formato da Grade:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => onUpdateTacticalState({ gridType: 'hex' })}
                      className={`px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border ${
                        tacticalState.gridType === 'hex'
                          ? 'bg-amber-500 text-slate-950 border-amber-500'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      <Sparkles size={13} />
                      <span>Hexagonal (GURPS)</span>
                    </button>
                    <button
                      onClick={() => onUpdateTacticalState({ gridType: 'square' })}
                      className={`px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border ${
                        tacticalState.gridType === 'square'
                          ? 'bg-amber-500 text-slate-950 border-amber-500'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      <Grid size={13} />
                      <span>Quadrado (Masmorra)</span>
                    </button>
                  </div>
                </div>

                {/* Tamanho da Célula (Raio Hex) */}
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Tamanho do Hexágono:</span>
                    <span className="font-mono text-amber-300 font-bold">
                      {tacticalState.hexSize}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="80"
                    value={tacticalState.hexSize}
                    onChange={(e) => onUpdateTacticalState({ hexSize: Number(e.target.value) })}
                    className="w-full accent-amber-500"
                  />
                </div>

                {/* Opacidade da Grade */}
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Opacidade das Linhas:</span>
                    <span className="font-mono text-amber-300 font-bold">
                      {Math.round(tacticalState.gridOpacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.8"
                    step="0.05"
                    value={tacticalState.gridOpacity}
                    onChange={(e) =>
                      onUpdateTacticalState({ gridOpacity: Number(e.target.value) })
                    }
                    className="w-full accent-amber-500"
                  />
                </div>

                {/* Contraste da Grade: Clara vs Escura */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    Contraste da Linha do Grid:
                  </label>
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
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
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
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      <Sun size={12} />
                      <span>Grade Escura</span>
                    </button>
                  </div>
                </div>

                {/* Alternância de Névoa de Guerra */}
                {isMaster && (
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-300 text-xs">
                        Névoa de Guerra
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Oculta áreas não exploradas dos jogadores
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        onUpdateTacticalState({ fogEnabled: !tacticalState.fogEnabled })
                      }
                      className={`px-2 py-1 rounded-md text-[11px] font-bold ${
                        tacticalState.fogEnabled
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {tacticalState.fogEnabled ? 'Ativada' : 'Desativada'}
                    </button>
                  </div>
                )}
              </div>
            </>
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
    </div>

      {/* BARRA DE CONTROLE: OCULTAÇÃO / FOG OF WAR (ESTILO ROLL20) */}
      {isMaster && activeTool === 'fog' && (
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-2 shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 font-bold text-slate-200">
              <EyeOff size={14} className="text-amber-400" />
              <span>Ocultação do Mapa:</span>
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
              {tacticalState.fogEnabled ? 'Ativada' : 'Desativada'}
            </button>
          </div>

          {/* Formato: Pincel vs Retângulo de Seleção */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase font-mono font-bold px-1 select-none">
              Formato:
            </span>
            <button
              type="button"
              onClick={() => onSetFogShape?.('brush')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                fogShape === 'brush'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Pincel Livre"
            >
              <Paintbrush size={12} />
              <span>Pincel</span>
            </button>
            <button
              type="button"
              onClick={() => onSetFogShape?.('box')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                fogShape === 'box'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Seleção Retangular (arraste formando um retângulo para revelar cômodos)"
            >
              <Square size={12} />
              <span>Retângulo</span>
            </button>
          </div>

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
              title="Revelar áreas para os jogadores"
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
              title="Ocultar áreas dos jogadores"
            >
              <EyeOff size={13} />
              <span>Ocultar</span>
            </button>
          </div>

          {/* Raio do Pincel (visível apenas no modo Pincel) */}
          {fogShape === 'brush' && (
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-mono font-bold px-1 select-none">
                Raio:
              </span>
              <button
                type="button"
                onClick={() => onSetFogBrushRadius?.(0)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  fogBrushRadius === 0
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="1 Hexágono"
              >
                1 Hex
              </button>
              <button
                type="button"
                onClick={() => onSetFogBrushRadius?.(1)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  fogBrushRadius === 1
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="3 Hexes (raio de 1 jarda)"
              >
                3 Hexes
              </button>
              <button
                type="button"
                onClick={() => onSetFogBrushRadius?.(2)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  fogBrushRadius === 2
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="7 Hexes (raio de 2 jardas)"
              >
                7 Hexes
              </button>
            </div>
          )}

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
        </div>
      )}

      {/* BARRA DE CONTROLE: FOCOS DE LUZ (ILUMINAÇÃO DINÂMICA) */}
      {isMaster && activeTool === 'light' && (
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-2 shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 font-bold text-slate-200">
              <Flame size={14} className="text-amber-400" />
              <span>Focos de Luz:</span>
            </span>
            <span className="text-[11px] text-slate-400">
              Clique no mapa para posicionar luz com o alcance especificado.
            </span>
          </div>

          {/* Raio Customizado em Jardas */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase font-mono font-bold px-1 select-none">
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
              className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center font-mono font-bold text-amber-300 text-xs focus:outline-none focus:border-amber-500"
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

          {/* Presets Rápidos */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase font-mono font-bold px-1 select-none">
              Presets:
            </span>
            {[
              { label: 'Tocha', radius: 4, color: '#f59e0b', emoji: '🔥' },
              { label: 'Lanterna', radius: 7, color: '#fbbf24', emoji: '🏮' },
              { label: 'Fogueira', radius: 10, color: '#f97316', emoji: '🏕️' },
              { label: 'Magia', radius: 15, color: '#38bdf8', emoji: '✨' },
            ].map((preset) => {
              const isSelected = (customLightRadius || 5) === preset.radius;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    onSetCustomLightRadius?.(preset.radius);
                    onSetCustomLightColor?.(preset.color);
                  }}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>{preset.emoji}</span>
                  <span>{preset.label} ({preset.radius}y)</span>
                </button>
              );
            })}
          </div>

          {/* Gerenciar Luzes Existentes */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-amber-300 font-mono font-bold bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-lg">
              {(tacticalState.lights || []).length} focos no mapa
            </span>
            {(tacticalState.lights || []).length > 0 && (
              <button
                type="button"
                onClick={() => onUpdateTacticalState({ lights: [] })}
                className="px-2.5 py-1 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 rounded-lg text-xs font-medium transition-all flex items-center gap-1"
                title="Remover todos os focos de luz fixos do mapa"
              >
                <Trash2 size={12} />
                <span>Limpar Luzes</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* BARRA DE CONTROLE: RÉGUA TÁTICA (MEDIR) */}
      {activeTool === 'ruler' && (
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-2 shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 font-bold text-slate-200">
              <Ruler size={14} className="text-amber-400" />
              <span>Medição Tática GURPS:</span>
            </span>
            <span className="text-[11px] text-slate-400">
              {rulerMode === 'fixed'
                ? 'Passe o mouse ou clique no mapa para ver o círculo de alcance exato.'
                : 'Clique e arraste pelo mapa para medir distância em jardas e penalidade.'}
            </span>
          </div>

          {/* Modo de Medição */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase font-mono font-bold px-1 select-none">
              Modo:
            </span>
            <button
              type="button"
              onClick={() => onSetRulerMode?.('free')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                rulerMode === 'free'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Livre (A → B)
            </button>
            <button
              type="button"
              onClick={() => onSetRulerMode?.('fixed')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                rulerMode === 'fixed'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Alcance Fixo (Raio)
            </button>
          </div>

          {/* Input de Jardas no Modo Fixo */}
          {rulerMode === 'fixed' && (
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

          {/* Botões de Ação */}
          <div className="flex items-center gap-1.5">
            {/* Toggle: Manter Medições no Mapa */}
            <button
              type="button"
              onClick={() => onSetKeepMeasurementsOnMap?.(!keepMeasurementsOnMap)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                keepMeasurementsOnMap
                  ? 'bg-emerald-600/90 hover:bg-emerald-600 text-white font-bold shadow-xs'
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
              }`}
              title="Quando ativado, cada medição feita ao soltar o mouse fica fixada no mapa para todos"
            >
              <Pin size={12} className={keepMeasurementsOnMap ? 'text-white' : 'text-slate-400'} />
              <span>{keepMeasurementsOnMap ? 'Manter no Mapa: Sim' : 'Manter no Mapa: Não'}</span>
            </button>

            {/* Contador de medições ativas no mapa */}
            {activeRulerMarkersCount > 0 && (
              <span className="text-[11px] text-amber-300 font-mono font-bold bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-lg">
                {activeRulerMarkersCount} {activeRulerMarkersCount === 1 ? 'medição' : 'medições'}
              </span>
            )}

            {hasActiveRuler && (
              <button
                type="button"
                onClick={onFixRulerMarker}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-all shadow-md flex items-center gap-1"
                title="Fixar medição na mesa para que todos os jogadores vejam"
              >
                <Pin size={12} />
                <span>Fixar Medição</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClearRulerMarkers}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium transition-all"
              title="Limpar medição ativa e todas as réguas fixadas no mapa"
            >
              Limpar Medições
            </button>
          </div>
        </div>
      )}

      {/* BARRA DE CONTROLE: MODELO DE ÁREA (ÁREA DE EFEITO) */}
      {activeTool === 'area' && (
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-2 shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 font-bold text-slate-200">
              <CircleDot size={14} className="text-amber-400" />
              <span>Área de Efeito:</span>
            </span>
            <span className="text-[11px] text-slate-400">
              Clique no mapa para fixar a área de efeito (visível para todos os jogadores na camada Tokens).
            </span>
          </div>

          {/* Raio em Jardas */}
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

          {/* Cores */}
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

          {/* Limpar Áreas */}
          <button
            type="button"
            onClick={onClearAreaMarkers}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium transition-all"
            title="Remover áreas de efeito fixadas no mapa"
          >
            Limpar Áreas
          </button>
        </div>
      )}
    </div>
  );
};
