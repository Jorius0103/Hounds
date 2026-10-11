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
  Users,
  Check,
  CheckCheck,
  ShieldCheck,
  X,
} from 'lucide-react';
import { UserAccount } from '../../types/rpg';

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
  onOpenPlayerPermissions?: () => void;
  editorCount?: number;
  users?: UserAccount[];
  editorUserIds?: string[];
  onTogglePlayerPermission?: (userId: string) => void;
  onSetAllPlayerPermissions?: (allow: boolean) => void;
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
  onOpenPlayerPermissions,
  editorCount = 0,
  users = [],
  editorUserIds = [],
  onTogglePlayerPermission,
  onSetAllPlayerPermissions,
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [playersPopoverOpen, setPlayersPopoverOpen] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState(tacticalState.customImageUrl || '');

  const isMaster = currentUserRole === 'mestre';
  const playerUsers = users.filter((u) => u.role === 'jogador');

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
            <>
              {/* Botão e Popover de Permissões dos Jogadores na Mesa Tática */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setPlayersPopoverOpen(!playersPopoverOpen);
                    setSettingsOpen(false);
                    setMapPickerOpen(false);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all ${
                    playersPopoverOpen
                      ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-sm'
                      : editorCount > 0
                      ? 'bg-slate-950 border-emerald-500/40 text-emerald-300 hover:bg-slate-850'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-850'
                  }`}
                  title="Gerenciar quais jogadores possuem permissão de edição na mesa"
                >
                  <Users
                    size={14}
                    className={editorCount > 0 ? 'text-emerald-400' : 'text-amber-400'}
                  />
                  <span className="hidden sm:inline font-medium">Jogadores</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold font-mono border ${
                      editorCount > 0
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {editorCount}
                  </span>
                </button>

                {playersPopoverOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setPlayersPopoverOpen(false)}
                    />
                    <div className="absolute top-full right-0 mt-2 w-84 sm:w-96 max-w-[calc(100vw-1.5rem)] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-3.5 sm:p-4 z-50 text-xs space-y-3 animate-in fade-in zoom-in-95 duration-150">
                      {/* Header do Popover */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                            <Users size={16} />
                          </div>
                          <div>
                            <div className="font-bold text-white text-xs flex items-center gap-1.5">
                              <span>Jogadores da Campanha</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-slate-850 border border-slate-750 text-amber-300">
                                {editorCount} de {playerUsers.length} editores
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Permissão de edição e tokens
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPlayersPopoverOpen(false)}
                          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-850 transition-colors"
                        >
                          <X size={15} />
                        </button>
                      </div>

                      {/* Ações Rápidas */}
                      <div className="flex items-center justify-between gap-2 bg-slate-900/90 p-2 rounded-xl border border-slate-800/80">
                        <span className="text-[11px] text-slate-400 font-medium pl-0.5">
                          Acesso rápido:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSetAllPlayerPermissions?.(true)}
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/70 rounded-lg transition-all active:scale-95 shadow-xs"
                            title="Conceder permissão de edição a todos os jogadores cadastrados"
                          >
                            <CheckCheck size={12} />
                            <span>Liberar Todos</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onSetAllPlayerPermissions?.(false)}
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-lg transition-all active:scale-95 shadow-xs"
                            title="Bloquear todos os jogadores (modo espectador)"
                          >
                            <EyeOff size={12} />
                            <span>Bloquear Todos</span>
                          </button>
                        </div>
                      </div>

                      {/* Lista de Jogadores */}
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {playerUsers.length === 0 ? (
                          <div className="py-6 text-center text-xs text-slate-400 bg-slate-900/40 rounded-xl border border-dashed border-slate-800 p-4 space-y-1.5">
                            <Users size={20} className="mx-auto text-slate-500" />
                            <div className="font-semibold text-slate-300">
                              Nenhum jogador cadastrado
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Cadastre jogadores na aba Usuários do Hub.
                            </div>
                          </div>
                        ) : (
                          playerUsers.map((u) => {
                            const isAllowed =
                              editorUserIds.includes(u.id) || editorUserIds.includes(u.name);
                            const initials = (u.name || '?').slice(0, 2).toUpperCase();

                            return (
                              <div
                                key={u.id}
                                onClick={() => onTogglePlayerPermission?.(u.id)}
                                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 select-none ${
                                  isAllowed
                                    ? 'bg-emerald-950/25 border-emerald-500/40 hover:bg-emerald-950/35 shadow-xs'
                                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-750 hover:bg-slate-900/80'
                                }`}
                                title={
                                  isAllowed
                                    ? `Clique para revogar permissão de ${u.name}`
                                    : `Clique para conceder permissão para ${u.name}`
                                }
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                                      isAllowed
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-inner'
                                        : 'bg-slate-800 text-slate-400 border border-slate-750'
                                    }`}
                                  >
                                    {initials}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-white truncate">
                                      {u.name}
                                    </div>
                                    <div className="flex items-center gap-1 mt-0.5">
                                      {isAllowed ? (
                                        <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                                          <ShieldCheck size={11} className="shrink-0" />
                                          <span>Editor liberado</span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
                                          <Eye size={11} className="shrink-0 text-slate-400" />
                                          <span>Espectador</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Slider Switch */}
                                <div
                                  className={`w-11 h-6 rounded-full transition-all relative flex items-center px-0.5 shadow-inner shrink-0 cursor-pointer ${
                                    isAllowed
                                      ? 'bg-emerald-500'
                                      : 'bg-slate-800 border border-slate-700'
                                  }`}
                                >
                                  <div
                                    className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 flex items-center justify-center ${
                                      isAllowed
                                        ? 'translate-x-5 text-emerald-600'
                                        : 'translate-x-0.5 text-slate-400'
                                    }`}
                                  >
                                    {isAllowed ? (
                                      <Check size={11} strokeWidth={3} />
                                    ) : (
                                      <Eye size={10} strokeWidth={2.5} />
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Footer do Popover */}
                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Sincronizado em tempo real</span>
                        </div>
                        {onOpenPlayerPermissions && (
                          <button
                            type="button"
                            onClick={() => {
                              setPlayersPopoverOpen(false);
                              onOpenPlayerPermissions();
                            }}
                            className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2 transition-colors"
                          >
                            Abrir em tela cheia
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={onAutoPlaceTokens}
                className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Posicionar todos os combatentes da cena na mesa tática"
              >
                <Compass size={13} />
                <span className="hidden xl:inline">Posicionar Todos</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
