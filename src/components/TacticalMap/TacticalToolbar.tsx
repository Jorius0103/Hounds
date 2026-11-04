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
} from 'lucide-react';
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
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [mapCalibrateOpen, setMapCalibrateOpen] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState(tacticalState.customImageUrl || '');

  const isMaster = currentUserRole === 'mestre';
  const activeLayer: TacticalLayer = tacticalState.activeLayer || 'tokens';
  const viewMode: TacticalViewMode = isMaster ? (tacticalState.viewMode || 'gm') : 'player';

  const currentPreset =
    TACTICAL_MAP_PRESETS.find((p) => p.key === tacticalState.backgroundKey) ||
    TACTICAL_MAP_PRESETS[0];

  return (
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
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-all ${
                activeLayer === 'map'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
              title="Nível 1: Camada do Mapa (Imagem base redimensionável e alinhamento do grid hexagonal)"
            >
              <MapIcon size={13} />
              <span>1. Mapa</span>
            </button>

            <button
              onClick={() => onUpdateTacticalState({ activeLayer: 'tokens' })}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-all ${
                activeLayer === 'tokens'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
              title="Nível 2: Camada de Tokens & Objetos (Movimentação e combate normal)"
            >
              <Users size={13} />
              <span>2. Tokens</span>
            </button>

            <button
              onClick={() => onUpdateTacticalState({ activeLayer: 'gm' })}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-all ${
                activeLayer === 'gm'
                  ? 'bg-purple-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
              title="Nível 3: Camada do Mestre (Tokens e elementos com flag de visibilidade para jogadores)"
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
                title="Revelar ou Ocultar Névoa de Guerra"
              >
                {tacticalState.fogEnabled ? <EyeOff size={14} /> : <Eye size={14} />}
                <span>Névoa</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. MODOS DE VISÃO (MESTRE VS JOGADORES) & CONFIGURAÇÕES */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Alternância de Modo de Visão */}
        {isMaster ? (
          <div className="flex items-center gap-0.5 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => onUpdateTacticalState({ viewMode: 'gm' })}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'gm'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
              title="Visão do Mestre: Enxerga tudo, com marcações nítidas do que está visível para jogadores e para o mestre"
            >
              <ShieldCheck size={13} />
              <span>Visão Mestre</span>
            </button>

            <button
              onClick={() => onUpdateTacticalState({ viewMode: 'player' })}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'player'
                  ? 'bg-emerald-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
              title="Visão dos Jogadores: Oculta tudo que não for visível aos jogadores (tokens ocultos e áreas não exploradas)"
            >
              <Eye size={13} />
              <span>Visão Jogadores</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold">
            <Eye size={13} />
            <span>Visão de Jogador</span>
          </div>
        )}

        {/* Botão de Calibração do Mapa (quando na camada de mapa) */}
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
  );
};
