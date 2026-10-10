import React, { useState } from 'react';
import { Combat, UserAccount } from '../types/rpg';
import { SyncStatus } from '../utils/onlineSync';
import { Swords, Settings, Plus, EyeOff, Map, Columns, FileText } from 'lucide-react';

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
}

export const TopNav: React.FC<TopNavProps> = ({
  combats,
  activeCombatId,
  onSelectCombat,
  onNewCombat,
  activeViewMode,
  onSelectViewMode,
}) => {
  const [combatMenuOpen, setCombatMenuOpen] = useState(false);

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
          </div>

          {/* Combat selector & CRUD de combates */}
          <div className="relative flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 shadow-inner ml-1">
            <span className="text-[11px] text-slate-400 pl-1.5 pr-0.5 font-medium whitespace-nowrap hidden md:inline">
              Combate:
            </span>

            <select
              value={activeCombatId}
              onChange={(e) => onSelectCombat(e.target.value)}
              className="bg-transparent text-[11px] font-semibold text-amber-300 py-1 px-1.5 rounded focus:outline-none focus:ring-1 focus:ring-amber-500 max-w-[140px] sm:max-w-[200px] truncate cursor-pointer"
            >
              {combats.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                  {c.id === 'combat-vazio' || c.name.toLowerCase().includes('vazio')
                    ? 'Sem combate (Apenas personagens)'
                    : `${c.name} (${c.npcs?.length || 0} NPCs)`}
                </option>
              ))}
            </select>

            {/* Roldana com CRUD de combates */}
            <button
              onClick={() => setCombatMenuOpen(!combatMenuOpen)}
              title="Opções de Combates"
              className={`p-1 rounded transition-colors ${
                combatMenuOpen
                  ? 'text-amber-400 bg-slate-800'
                  : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
              }`}
            >
              <Settings
                size={13}
                className={combatMenuOpen ? 'rotate-45 transition-transform' : 'transition-transform'}
              />
            </button>

            {/* Dropdown Menu com CRUD de Combates e Sem Combate */}
            {combatMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setCombatMenuOpen(false)}
                />
                <div className="absolute top-full left-0 mt-1.5 w-60 bg-slate-900 border border-slate-750 rounded-xl shadow-2xl p-1.5 z-50 text-xs space-y-1">
                  <button
                    onClick={() => {
                      setCombatMenuOpen(false);
                      onNewCombat();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-amber-300 transition-colors text-left font-medium"
                  >
                    <Plus size={14} className="text-amber-400" />
                    <span>Novo / Gerenciar Combates</span>
                  </button>

                  <div className="h-px bg-slate-800 my-1" />

                  <button
                    onClick={() => {
                      setCombatMenuOpen(false);
                      handleSelectVazio();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-amber-300 transition-colors text-left font-medium"
                  >
                    <EyeOff size={14} className="text-amber-400" />
                    <span>Sem Combate (Apenas Personagens)</span>
                  </button>
                </div>
              </>
            )}
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

          {/* Botão direto: Sem Combate (Apenas Personagens) */}
          <button
            onClick={handleSelectVazio}
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg transition-all shadow-sm font-medium border ${
              isVazio
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="Exibir apenas a lista de personagens, sem nenhum NPC de combate"
          >
            <EyeOff size={13} className="text-amber-400" />
            <span className="text-[11px]">Sem Combate (Apenas Personagens)</span>
          </button>
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
      </div>
    </header>
  );
};

