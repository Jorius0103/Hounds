import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Combat, UserAccount } from '../types/rpg';
import { SyncStatus } from '../utils/onlineSync';
import { Settings, Plus, EyeOff, Map, Columns, FileText, ShieldCheck, Eye, Users, LayoutGrid, Dices, Sun, Volume2, VolumeX, Radio, Square } from 'lucide-react';
import { DicePickerModal } from './DicePickerModal';
import { audioStreamSync, AudioStreamState } from '../utils/audioStreamSync';

export type ViewMode = 'sheets' | 'tactical' | 'split';

interface TopNavProps {
  combats: Combat[];
  activeCombatId: string;
  onSelectCombat: (id: string) => void;
  onNewCombat: () => void;
  onExport?: () => void;
  onImport?: () => void;
  currentUser?: UserAccount | null;
  onOpenUserAccounts?: () => void;
  onSwitchUser?: () => void;
  syncStatus?: SyncStatus;
  currentRoom?: string;
  onOpenOnlineRoomModal?: () => void;
  onOpenSystemLog?: () => void;
  systemLogsCount?: number;
  activeViewMode?: ViewMode;
  onSelectViewMode?: (mode: ViewMode) => void;
  onOpenPlayerPermissions?: () => void;
  editorCount?: number;
  canEditCurrent?: boolean;
  isHomeScreen?: boolean;
  onOpenHomeScreen?: () => void;
  onOpenPassDayModal?: () => void;
  onRollDice?: (diceCount: number, diceSides?: number) => void;
  isMestre?: boolean;
  hideGmRolls?: boolean;
  onToggleHideGmRolls?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  combats,
  activeCombatId,
  onSelectCombat,
  onNewCombat,
  currentUser,
  activeViewMode,
  onSelectViewMode,
  onOpenPlayerPermissions,
  editorCount = 0,
  canEditCurrent = false,
  isHomeScreen = false,
  onOpenHomeScreen,
  onOpenPassDayModal,
  onRollDice,
  isMestre = false,
  hideGmRolls = false,
  onToggleHideGmRolls,
}) => {
  const [dicePickerOpen, setDicePickerOpen] = useState(false);
  const [dicePickerCoords, setDicePickerCoords] = useState<{ top: number; right: number } | null>(null);
  const diceButtonRef = useRef<HTMLButtonElement>(null);
  const [audioState, setAudioState] = useState<AudioStreamState>(() => audioStreamSync.getState());

  const handleToggleDicePicker = () => {
    if (!dicePickerOpen && diceButtonRef.current) {
      const rect = diceButtonRef.current.getBoundingClientRect();
      setDicePickerCoords({
        top: Math.round(rect.bottom + 8),
        right: Math.max(12, Math.round(window.innerWidth - rect.right)),
      });
      setDicePickerOpen(true);
    } else {
      setDicePickerOpen(false);
    }
  };

  useEffect(() => {
    return audioStreamSync.subscribe((s) => setAudioState(s));
  }, []);
  // Filtra combates ativos para exibição na barra principal
  const activeCombats = useMemo(() => {
    return combats.filter((c) => c.isActive !== false);
  }, [combats]);

  const isVazio =
    activeCombatId === 'combat-vazio' ||
    combats.find((c) => c.id === activeCombatId)?.name?.toLowerCase().includes('vazio');

  const handleSelectVazio = () => {
    const emptyCombat = combats.find(
      (c) => c.id === 'combat-vazio' || c.name.toLowerCase().includes('vazio')
    );
    if (emptyCombat) {
      onSelectCombat(emptyCombat.id);
    } else {
      onNewCombat();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur border-b border-slate-800/80 px-3 sm:px-6 py-2">
      <div
        className="w-full max-w-[1920px] mx-auto flex items-center justify-between flex-nowrap overflow-x-auto scrollbar-none"
        style={{ gap: '80px' }}
      >
        {/* Zone 1: Combat selector / CRUD & Navigation Controls */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0 flex-nowrap">
          {/* Botão Alternar Tela Inicial / Tela Detalhada (PRIMEIRO botão da barra superior) */}
          {onOpenHomeScreen && (
            <button
              type="button"
              onClick={onOpenHomeScreen}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg transition-all shadow-sm font-medium border ${
                isHomeScreen
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-amber-500/40 text-slate-300 hover:text-white'
              }`}
              title={
                isHomeScreen
                  ? 'Ir para a Tela Detalhada dos personagens / NPCs'
                  : 'Voltar para a Tela Inicial (resumo dos personagens / NPCs)'
              }
            >
              {isHomeScreen ? (
                <>
                  <FileText size={13} className="text-amber-400" />
                  <span className="text-[11px] font-semibold">Tela Detalhada</span>
                </>
              ) : (
                <>
                  <LayoutGrid size={13} className="text-amber-400" />
                  <span className="text-[11px] font-semibold">Tela Inicial</span>
                </>
              )}
            </button>
          )}

          {/* Combat selector & CRUD de combates: Apenas o Mestre escolhe combate; Jogador apenas visualiza */}
          {currentUser?.role === 'mestre' ? (
            <>
              <div className="relative flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 shadow-inner ml-1">
                <span className="text-[11px] text-slate-400 pl-1.5 pr-0.5 font-medium whitespace-nowrap hidden md:inline">
                  Combate:
                </span>

                <select
                  value={activeCombatId}
                  onChange={(e) => onSelectCombat(e.target.value)}
                  className="bg-transparent text-[11px] font-semibold text-amber-300 py-1 px-1.5 rounded focus:outline-none focus:ring-1 focus:ring-amber-500 max-w-[140px] sm:max-w-[200px] truncate cursor-pointer"
                >
                  {activeCombats.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                      {c.id === 'combat-vazio' || c.name.toLowerCase().includes('vazio') || c.name.toLowerCase().trim() === 'sem combate' ? 'Sem combate' : `${c.name} (${c.totalNpcs != null ? c.totalNpcs : (c.npcs?.length || 0)} NPCs)`}
                    </option>
                  ))}
                </select>

                {/* Roldana de Gerenciar Combates: abre direto a tela do CRUD */}
                <button
                  type="button"
                  onClick={onNewCombat}
                  title="Gerenciar Combates da Campanha"
                  className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                >
                  <Settings size={13} />
                </button>
              </div>

              {/* Botão direto: Gerenciar Combates (CRUD) */}
              <button
                onClick={onNewCombat}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 rounded-lg text-slate-300 hover:text-white transition-all shadow-sm font-medium"
                title="Criar, renomear ou excluir combates"
              >
                <Plus size={13} className="text-amber-400" />
                <span className="text-[11px]">Gerenciar Combates</span>
              </button>
            </>
          ) : (
            /* Jogador: Indicador fixo somente leitura do combate definido pelo Mestre */
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-amber-300 font-semibold bg-slate-900 border border-slate-800 rounded-lg shadow-inner ml-1"
              title="Combate selecionado pelo Mestre"
            >
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Combate:</span>
              <span className="text-[11px] font-bold text-amber-300 max-w-[160px] sm:max-w-[220px] truncate">
                {activeCombats.find((c) => c.id === activeCombatId)?.name || 'Sem combate'}
              </span>
            </div>
          )}

          {/* Botão Mestre: Permissões de Edição dos Jogadores */}
          {currentUser?.role === 'mestre' && onOpenPlayerPermissions && (
            <button
              type="button"
              onClick={onOpenPlayerPermissions}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 rounded-lg text-slate-300 hover:text-white transition-all shadow-sm font-medium"
              title="Gerenciar quais jogadores possuem permissão de edição"
            >
              <Users
                size={13}
                className={editorCount > 0 ? 'text-emerald-400' : 'text-amber-400'}
              />
              <span className="text-[11px]">Jogadores</span>
              <span
                className={`text-[10px] px-1.5 rounded-full font-bold font-mono border ${
                  editorCount > 0
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {editorCount}
              </span>
            </button>
          )}

          {/* Botão Passar o Dia (Mestre ou Jogador com Permissão de Edição) */}
          {(currentUser?.role === 'mestre' || canEditCurrent) && onOpenPassDayModal && (
            <button
              type="button"
              onClick={onOpenPassDayModal}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg transition-all shadow-sm font-medium border bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-amber-500/40 text-amber-300 hover:text-white cursor-pointer"
              title="Passar o Dia: recarregar +1 de mana nos recursos dos Personagens"
            >
              <Sun size={13} className="text-amber-400" />
              <span className="text-[11px] font-semibold whitespace-nowrap">Passar o Dia</span>
            </button>
          )}

          {/* Badge Jogador: Indicador de Permissão de Edição ou Espectador */}
          {currentUser?.role === 'jogador' && (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                canEditCurrent
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60 shadow-sm'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
              style={{ height: '28px', flexShrink: 0 }}
              title={
                canEditCurrent
                  ? 'Permissão de edição concedida pelo Mestre (você pode alterar sua ficha e movimentar seus tokens)'
                  : 'Modo Espectador: visualização em tempo real (somente leitura)'
              }
            >
              {canEditCurrent ? (
                <>
                  <ShieldCheck size={13} className="text-emerald-400 shrink-0" />
                  <span className="text-[11px] font-bold whitespace-nowrap">Modo Jogador (Edição Liberada)</span>
                </>
              ) : (
                <>
                  <Eye size={13} className="text-slate-400 shrink-0" />
                  <span className="text-[11px] whitespace-nowrap">Modo Espectador (Leitura)</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Zone 1.5: Modo de Visualização (Ficha & Log / Mesa Tática / Dividida) */}
        {activeViewMode && onSelectViewMode && (
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 shadow-inner">
            <button
              onClick={() => onSelectViewMode('sheets')}
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                activeViewMode === 'sheets'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Visualização em Fichas, Lista de NPCs e Log de Combate"
            >
              <FileText size={13} />
              <span className="hidden sm:inline">Fichas & Log</span>
            </button>

            <button
              onClick={() => onSelectViewMode('tactical')}
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                activeViewMode === 'tactical'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
              }`}
              title="Mesa Tática Interativa (Grid Hexagonal GURPS, Tokens e Medição)"
            >
              <Map size={13} className={activeViewMode === 'tactical' ? 'text-slate-950' : 'text-amber-400'} />
              <span className="font-bold">Mesa Tática</span>
            </button>

            <button
              onClick={() => onSelectViewMode('split')}
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                activeViewMode === 'split'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Visão Dividida: Mesa Tática e Ficha lado a lado"
            >
              <Columns size={13} />
              <span className="hidden md:inline">Dividida</span>
            </button>
          </div>
        )}

        {/* Zone 2: Dice Roller (3D6, 2D6, 1D6 e + Dados) e Toggle de Ocultar Rolagens para o Mestre */}
        {onRollDice && (
          <div className="relative flex items-center gap-2 px-2.5 py-1 bg-slate-900/90 border border-slate-750 rounded-lg shadow-inner shrink-0">
            {isMestre && onToggleHideGmRolls && (
              <button
                type="button"
                onClick={onToggleHideGmRolls}
                className={`flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-lg transition-all shadow-xs border cursor-pointer ${
                  hideGmRolls
                    ? 'bg-rose-950/80 text-rose-300 border-rose-700/70 hover:bg-rose-900'
                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-700/70 hover:bg-emerald-900'
                }`}
                title={
                  hideGmRolls
                    ? 'Rolagens do Mestre Ocultas (apenas você vê a animação e o log). Clique para tornar visível.'
                    : 'Rolagens do Mestre Visíveis para todos os jogadores. Clique para ocultar.'
                }
              >
                {hideGmRolls ? (
                  <>
                    <EyeOff size={13} className="text-rose-400" />
                    <span className="hidden sm:inline">Oculto</span>
                  </>
                ) : (
                  <>
                    <Eye size={13} className="text-emerald-400" />
                    <span className="hidden sm:inline">Visível</span>
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => onRollDice(3)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 active:scale-95 text-amber-300 hover:text-white text-xs font-black rounded-lg transition-all shadow-sm font-mono border border-slate-750 hover:border-amber-500/50 cursor-pointer"
              title="Rolar 3D6 com animação e registrar no log de combate"
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-amber-400">
                <rect width="18" height="18" x="3" y="3" rx="3" />
                <circle cx="8" cy="8" r="1.5" fill="currentColor" />
                <circle cx="16" cy="16" r="1.5" fill="currentColor" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              </svg>
              <span>3D6</span>
            </button>
            <button
              type="button"
              onClick={() => onRollDice(2)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 active:scale-95 text-amber-300 hover:text-white text-xs font-black rounded-lg transition-all shadow-sm font-mono border border-slate-750 hover:border-amber-500/50 cursor-pointer"
              title="Rolar 2D6 com animação e registrar no log de combate"
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-amber-400">
                <rect width="18" height="18" x="3" y="3" rx="3" />
                <circle cx="8" cy="8" r="1.5" fill="currentColor" />
                <circle cx="16" cy="16" r="1.5" fill="currentColor" />
              </svg>
              <span>2D6</span>
            </button>
            <button
              type="button"
              onClick={() => onRollDice(1)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 active:scale-95 text-amber-300 hover:text-white text-xs font-black rounded-lg transition-all shadow-sm font-mono border border-slate-750 hover:border-amber-500/50 cursor-pointer"
              title="Rolar 1D6 com animação e registrar no log de combate"
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-amber-400">
                <rect width="18" height="18" x="3" y="3" rx="3" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              </svg>
              <span>1D6</span>
            </button>
            <button
              ref={diceButtonRef}
              type="button"
              onClick={handleToggleDicePicker}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-black rounded-lg transition-all shadow-sm font-mono border cursor-pointer ${
                dicePickerOpen
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-slate-900 hover:bg-slate-800 active:scale-95 text-amber-300 hover:text-white border-slate-750 hover:border-amber-500/50'
              }`}
              title="Abrir seletor de dados Roll20 (D4, D6, D8, D10, D12, D20, D100)"
            >
              <Dices size={13} className={dicePickerOpen ? 'text-slate-950' : 'text-amber-400'} />
              <span>+ Dados</span>
            </button>

            <DicePickerModal
              isOpen={dicePickerOpen}
              onClose={() => setDicePickerOpen(false)}
              onRoll={(count, sides) => onRollDice?.(count, sides)}
              anchorRect={dicePickerCoords}
            />
          </div>
        )}

        {/* Zone 3: Bloco de Trilha Sonora / Transmissão de Áudio */}
        <div className="flex items-center gap-2.5 px-3 py-1 bg-slate-900/95 border border-slate-750 rounded-lg shadow-inner shrink-0">
          {/* Botão de desbloqueio para Autoplay bloqueado */}
          {audioState.needsInteraction && !audioState.isBroadcasting && (
            <button
              type="button"
              onClick={() => audioStreamSync.unlockAudio()}
              className="flex items-center gap-1 px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black rounded shadow-md animate-pulse cursor-pointer shrink-0"
              title="Clique para habilitar a reprodução do áudio no seu navegador"
            >
              <span>▶ Ouvir Trilha</span>
            </button>
          )}

          {/* Indicador de Transmissão apenas com o Nome do Streamer */}
          {audioState.hasActiveBroadcast && (
            <div
              className="flex items-center gap-1.5 max-w-[120px] sm:max-w-[160px] truncate"
              title={`Transmitindo: ${audioState.broadcasterName || 'Mestre'}`}
            >
              <span className="flex h-2 w-2 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-bold text-amber-300 truncate font-mono">
                {audioState.broadcasterName || 'Mestre'}
              </span>
            </div>
          )}

          {/* Botão de Mute */}
          <button
            type="button"
            onClick={() => audioStreamSync.toggleMute()}
            className={`p-1 rounded-md transition-all cursor-pointer shrink-0 ${
              audioState.isMuted
                ? 'text-rose-400 hover:text-rose-300 bg-rose-950/40 border border-rose-800/50'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title={audioState.isMuted ? 'Música mutada (clique para ativar áudio)' : 'Mutar música'}
          >
            {audioState.isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
          </button>

          {/* Slider de Volume (tamanho dobrado) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <input
              type="range"
              min={0}
              max={100}
              value={audioState.isMuted ? 0 : audioState.volume}
              onChange={(e) => audioStreamSync.setVolume(Number(e.target.value))}
              className="w-16 sm:w-24 h-1.5 bg-slate-750 rounded-lg appearance-none cursor-pointer accent-amber-500"
              style={{ width: '80px' }}
              title={`Volume: ${audioState.isMuted ? 'Mutado' : `${audioState.volume}%`}`}
            />
            <span className="text-[10px] font-mono font-bold text-slate-400 w-5 text-right hidden sm:inline">
              {audioState.isMuted ? '0%' : `${audioState.volume}%`}
            </span>
          </div>

          {/* Botão de Transmitir / Parar (livre para Mestre e Jogadores) */}
          {audioState.isBroadcasting ? (
            <button
              type="button"
              onClick={() => audioStreamSync.stopBroadcasting()}
              className="flex items-center gap-1 px-2 py-0.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-[11px] font-bold rounded border border-rose-700/60 transition-all cursor-pointer shadow-xs ml-0.5 shrink-0"
              title="Encerrar transmissão da trilha sonora"
            >
              <Square size={11} className="fill-rose-400 text-rose-400" />
              <span className="hidden sm:inline">Parar</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => audioStreamSync.startBroadcasting(currentUser?.name || (isMestre ? 'Mestre' : 'Jogador'))}
              className="flex items-center gap-1 px-2 py-0.5 bg-slate-800 hover:bg-emerald-950 hover:text-emerald-300 text-slate-300 text-[11px] font-bold rounded border border-slate-700 hover:border-emerald-600/60 transition-all cursor-pointer shadow-xs ml-0.5 shrink-0"
              title="Transmitir áudio de uma aba do Spotify, YouTube ou do sistema para todos os jogadores"
            >
              <Radio size={11} className="text-emerald-400" />
              <span className="hidden sm:inline">Transmitir</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

