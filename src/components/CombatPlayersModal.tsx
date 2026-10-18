import React, { useState } from 'react';
import { NPC } from '../types/rpg';
import { Users, Eye, EyeOff, Plus, X, Search, Check, AlertCircle } from 'lucide-react';

interface CombatPlayersModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: NPC[];
  activePlayerIds: string[];
  onTogglePlayer: (playerId: string) => void;
  onSetAllPlayers: (show: boolean) => void;
  onAddNewPlayer: () => void;
}

export const CombatPlayersModal: React.FC<CombatPlayersModalProps> = ({
  isOpen,
  onClose,
  players,
  activePlayerIds,
  onTogglePlayer,
  onSetAllPlayers,
  onAddNewPlayer,
}) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filteredPlayers = players
    .filter((p) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        (p.name || '').toLowerCase().includes(q) ||
        (p.playerName || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-750 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Users size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Personagens na Mesa de Combate</h3>
              <p className="text-[11px] text-slate-400">
                Habilite ou desabilite quais personagens aparecem na mesa de combate ou cadastre novos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar: Search & Batch actions */}
        <div className="space-y-2 shrink-0">
          <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
            <span className="text-slate-400 text-[11px]">
              {activePlayerIds.length} de {players.length} personagens habilitados na mesa
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onSetAllPlayers(true)}
                className="px-2 py-1 text-[11px] font-semibold bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded-lg transition-colors flex items-center gap-1"
              >
                <Eye size={12} />
                <span>Habilitar Todos</span>
              </button>
              <button
                type="button"
                onClick={() => onSetAllPlayers(false)}
                className="px-2 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-lg transition-colors flex items-center gap-1"
              >
                <EyeOff size={12} />
                <span>Desabilitar Todos</span>
              </button>
            </div>
          </div>

          {players.length > 4 && (
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar personagem..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}
        </div>

        {/* Player List */}
        <div className="space-y-2 overflow-y-auto flex-1 pr-1 min-h-[160px] max-h-72">
          {filteredPlayers.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 p-4">
              Nenhum personagem encontrado.
            </div>
          ) : (
            filteredPlayers.map((player) => {
              const isInCombat = activePlayerIds.includes(player.id);
              return (
                <div
                  key={player.id}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isInCombat
                      ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isInCombat
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}
                    >
                      {(player.name || '?').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                        <span>{player.name || 'Sem nome'}</span>
                        {player.playerName && (
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({player.playerName})
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                        <span className={isInCombat ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                          {isInCombat ? 'Habilitado na Mesa' : 'Desabilitado'}
                        </span>
                        <span>•</span>
                        <span>PV {player.hpCurrent ?? '?'}/{player.hpMax ?? '?'}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onTogglePlayer(player.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                      isInCombat
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {isInCombat ? <Eye size={13} /> : <EyeOff size={13} />}
                    <span>{isInCombat ? 'Habilitado' : 'Desabilitado'}</span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 shrink-0 gap-2">
          <button
            type="button"
            onClick={() => {
              onAddNewPlayer();
            }}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-emerald-300 border border-emerald-500/30 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span>+ Criar Novo Personagem</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-colors"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};

