import React, { useState } from 'react';
import {
  TacticalState,
  TacticalBackgroundKey,
  TACTICAL_MAP_PRESETS,
  GridType,
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
} from 'lucide-react';

export type TacticalToolMode = 'select' | 'ruler' | 'area' | 'terrain' | 'fog';

interface TacticalToolbarProps {
  tacticalState: TacticalState;
  onUpdateTacticalState: (updated: Partial<TacticalState>) => void;
  activeTool: TacticalToolMode;
  onSelectTool: (tool: TacticalToolMode) => void;
  onResetView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onClearMarkers: () => void;
  onAutoPlaceTokens: () => void;
  currentUserRole: string;
}

export const TacticalToolbar: React.FC<TacticalToolbarProps> = ({
  tacticalState,
  onUpdateTacticalState,
  activeTool,
  onSelectTool,
  onResetView,
  onZoomIn,
  onZoomOut,
  onClearMarkers,
  onAutoPlaceTokens,
  currentUserRole,
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState(tacticalState.customImageUrl || '');

  const isMaster = currentUserRole === 'mestre';

  const currentPreset =
    TACTICAL_MAP_PRESETS.find((p) => p.key === tacticalState.backgroundKey) ||
    TACTICAL_MAP_PRESETS[0];

  return (
    <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl p-1.5 shadow-xl flex flex-wrap items-center justify-between gap-2 z-20">
      {/* Ferramentas de Interação */}
      <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
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
          <span>Mover / Seleção</span>
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
          <span>Medir Distância</span>
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
          <span>Área / Explosão</span>
        </button>

        {isMaster && (
          <>
            <button
              onClick={() => onSelectTool('terrain')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTool === 'terrain'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Pincel de Terreno (Coberturas, Paredes, Terreno Difícil)"
            >
              <ShieldAlert size={14} />
              <span>Cobertura / Terreno</span>
            </button>

            <button
              onClick={() => onSelectTool('fog')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
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

      {/* Controles de Mapa e Visualização */}
      <div className="flex items-center gap-1.5">
        {/* Seletor de Mapa */}
        <div className="relative">
          <button
            onClick={() => setMapPickerOpen(!mapPickerOpen)}
            className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-medium text-slate-200 hover:text-white transition-colors"
            title="Escolher Mapa de Fundo"
          >
            <MapIcon size={14} className="text-amber-400" />
            <span className="max-w-[130px] truncate">{currentPreset.name}</span>
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

        {/* Botão de Configurações da Grade */}
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
                    min="26"
                    max="65"
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
            {Math.round(tacticalState.zoom * 100)}%
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
              onClick={onAutoPlaceTokens}
              className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Posicionar todos os combatentes da cena na mesa tática"
            >
              <Compass size={13} />
              <span className="hidden xl:inline">Posicionar Todos</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
