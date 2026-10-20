import React, { useState, useMemo } from 'react';
import { Combat, UserAccount } from '../types/rpg';
import { SyncStatus } from '../utils/onlineSync';
import { Swords, Settings, Plus, EyeOff, Map, Columns, FileText, ShieldCheck, Eye, Users, LayoutGrid, Dices } from 'lucide-react';
import { DicePickerModal } from './DicePickerModal';

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
  onRollDice,
  isMestre = false,
  hideGmRolls = false,
  onToggleHideGmRolls,
}) => {
  const [dicePickerOpen, setDicePickerOpen] = useState(false);
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
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur border-b border-slate-800/80 px-3 lg:px-5 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 flex-wrap">
        {/* Zone 1: Brand title & Combat selector / CRUD */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Swords size={16} />
            </div>
            <span className="text-sm font-bold tracking-tight text-white whitespace-nowrap hidden sm:inline">
              Mesa de Combate
            </span>
            <span className="text-sm font-bold tracking-tight text-white whitespace-nowrap sm:hidden">
              GURPS
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 ml-1.5 shadow-xs">
              v1.2.0
            </span>
          </div>

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
                      {c.id === 'combat-vazio' || c.name.toLowerCase().includes('vazio') || c.name.toLowerCase().trim() === 'sem combate' ? 'Sem combate' : `${c.name} (${c.npcs?.length || 0} NPCs)`}
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

          {/* Botão Tela Inicial (após Jogadores) */}
          {onOpenHomeScreen && (
            <button
              type="button"
              onClick={onOpenHomeScreen}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg transition-all shadow-sm font-medium border ${
                isHomeScreen
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-amber-500/40 text-slate-300 hover:text-white'
              }`}
              title="Voltar para a Tela Inicial da Mesa de Combate"
            >
              <LayoutGrid size={13} className="text-amber-400" />
              <span className="text-[11px] font-semibold">Tela Inicial</span>
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

        {/* Zone 2: Dice Roller (3D6 e 1D6) e Toggle de Ocultar Rolagens para o Mestre */}
        {onRollDice && (
          <div className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0">
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
              className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-xs font-black rounded-lg transition-all shadow-md font-mono border border-amber-400/60 cursor-pointer"
              title="Rolar 3D6 com animação e registrar no log de combate"
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-slate-950">
                <rect width="18" height="18" x="3" y="3" rx="3" />
                <circle cx="8" cy="8" r="1.5" fill="currentColor" />
                <circle cx="16" cy="16" r="1.5" fill="currentColor" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              </svg>
              <span>3D6</span>
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
              type="button"
              onClick={() => setDicePickerOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 active:scale-95 text-amber-300 hover:text-white text-xs font-black rounded-lg transition-all shadow-sm font-mono border border-slate-750 hover:border-amber-500/50 cursor-pointer"
              title="Abrir seletor de dados Roll20 (D4, D6, D8, D10, D12, D20, D100)"
            >
              <Dices size={13} className="text-amber-400" />
              <span className="hidden sm:inline">Dados</span>
            </button>
          </div>
        )}
      </div>

      <DicePickerModal
        isOpen={dicePickerOpen}
        onClose={() => setDicePickerOpen(false)}
        onRoll={(count, sides) => onRollDice?.(count, sides)}
      />
    </header>
  );
};

