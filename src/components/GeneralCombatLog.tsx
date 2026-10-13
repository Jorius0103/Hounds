import React, { useState, useMemo } from 'react';
import { Combat, UserRole, NPC } from '../types/rpg';
import { CombatLogCard } from './CombatLogCard';
import { ScrollText, Trash2, Search, X, SlidersHorizontal } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface GeneralCombatLogProps {
  activeCombat: Combat | undefined;
  additionalCharacters?: NPC[];
  onSelectNpc: (npcId: string) => void;
  selectedNpcId: string;
  currentUserRole: UserRole;
  currentUserName?: string;
  onClearHistory?: () => void;
  onDeleteEntry?: (entryId: string, npcId?: string) => void;
}

export const GeneralCombatLog: React.FC<GeneralCombatLogProps> = ({
  activeCombat,
  additionalCharacters,
  onSelectNpc,
  selectedNpcId,
  currentUserRole,
  currentUserName,
  onClearHistory,
  onDeleteEntry,
}) => {
  // Filtro 1: Rodada ('all' ou número da rodada)
  const [selectedRoundFilter, setSelectedRoundFilter] = useState<number | 'all'>('all');

  // Filtro 2: Tipo de Personagem (Todos | Jogadores | NPCs)
  const [characterFilter, setCharacterFilter] = useState<'all' | 'players' | 'npcs'>('all');

  // Filtro 3: Busca Livre
  const [searchTerm, setSearchTerm] = useState('');
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  // Collect and sort all logs across all active combat NPCs and Personagens
  const allLogs = useMemo(() => {
    const combinedCharacters = [
      ...(additionalCharacters || []),
      ...(activeCombat?.npcs?.filter((n) => !additionalCharacters?.some((p) => p.id === n.id)) || [])
    ];
    if (combinedCharacters.length === 0) return [];

    const list: any[] = [];
    for (const npc of combinedCharacters) {
      const isPlayerChar = npc.characterType === 'player';

      // 1. Visibilidade do combatente:
      // Personagens são SEMPRE visíveis para jogadores (podem ver completo).
      // NPCs respeitam a visibilidade isVisibleToPlayer.
      if (currentUserRole === 'jogador' && !isPlayerChar && npc.isVisibleToPlayer === false) {
        continue;
      }

      for (const entry of npc.history || []) {
        // 2. As alterações feitas pelo mestre nos NPCs não devem refletir para os jogadores
        if (currentUserRole === 'jogador' && !isPlayerChar && entry.author === 'mestre') {
          continue;
        }

        list.push({
          ...entry,
          npcId: npc.id,
          npcName: npc.name || 'Personagem',
          npcAvatar: npc.avatar,
          npcPreset: npc.avatarPreset,
          npcCharacterType: npc.characterType || 'npc',
          playerName: npc.playerName || '',
        });
      }
    }

    // Sort newest to oldest
    return list.sort((a, b) => {
      const timeA = a.id ? parseInt(a.id.split('-')[1] || '0', 10) : 0;
      const timeB = b.id ? parseInt(b.id.split('-')[1] || '0', 10) : 0;
      if (timeA && timeB && timeA !== timeB) return timeB - timeA;
      return String(b.timestamp || '').localeCompare(String(a.timestamp || ''));
    });
  }, [activeCombat, additionalCharacters, currentUserRole]);

  // Lista de rodadas disponíveis no combate e no histórico
  const availableRounds = useMemo(() => {
    const roundsSet = new Set<number>();
    if (activeCombat?.currentRound !== undefined) {
      roundsSet.add(activeCombat.currentRound);
    }
    for (const entry of allLogs) {
      if (entry.round !== undefined) {
        roundsSet.add(entry.round);
      }
    }
    if (roundsSet.size === 0) {
      roundsSet.add(0);
    }
    return Array.from(roundsSet).sort((a, b) => a - b);
  }, [allLogs, activeCombat?.currentRound]);

  // Apply filters: Rodada, Tipo de Personagem e Busca Livre funcionam em conjunto
  const filteredLogs = useMemo(() => {
    return allLogs.filter((entry) => {
      // 1. Filtro de Rodada
      if (selectedRoundFilter !== 'all') {
        const entryRound = entry.round !== undefined ? entry.round : 0;
        if (entryRound !== selectedRoundFilter) {
          return false;
        }
      }

      // 2. Filtro de Tipo de Personagem
      if (characterFilter === 'players' && entry.npcCharacterType !== 'player') {
        return false;
      }
      if (characterFilter === 'npcs' && entry.npcCharacterType === 'player') {
        return false;
      }

      // 3. Campo de busca livre
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesNpc = entry.npcName?.toLowerCase().includes(query);
        const matchesPlayer = entry.playerName?.toLowerCase().includes(query);
        const matchesDesc = entry.description?.toLowerCase().includes(query);
        const matchesLoc = entry.hitLocation?.toLowerCase().includes(query);
        const matchesItem = entry.itemName?.toLowerCase().includes(query);
        const matchesDmgType = entry.damageType?.toLowerCase().includes(query);
        const matchesAttacker = entry.attackerName?.toLowerCase().includes(query);
        const matchesAuthor =
          entry.authorName?.toLowerCase().includes(query) ||
          entry.author?.toLowerCase().includes(query);
        if (
          !matchesNpc &&
          !matchesPlayer &&
          !matchesDesc &&
          !matchesLoc &&
          !matchesItem &&
          !matchesDmgType &&
          !matchesAuthor &&
          !matchesAttacker
        ) {
          return false;
        }
      }

      return true;
    });
  }, [allLogs, selectedRoundFilter, characterFilter, searchTerm]);

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl shadow-xl flex flex-col h-[calc(100vh-140px)] min-h-[500px] overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-slate-800 space-y-2 bg-slate-950/70">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <ScrollText size={16} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Log Geral de Combate
              </h3>
              <p className="text-[10px] text-slate-400">
                Histórico em tempo real
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-slate-700">
              {filteredLogs.length} / {allLogs.length}
            </span>

            {currentUserRole === 'mestre' && onClearHistory && allLogs.length > 0 && (
              <button
                type="button"
                onClick={() => setClearConfirmOpen(true)}
                className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                title="Limpar histórico de combate de todos os NPCs"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Filtro por Tipo de Personagem (Todos | Jogadores | NPCs) */}
        <div className="flex items-center justify-between gap-1 text-[10px]">
          <span className="text-slate-500 font-semibold px-1 shrink-0">Alvo:</span>
          <div className="flex-1 flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setCharacterFilter('all')}
              className={`flex-1 py-0.5 rounded text-center font-bold transition-all ${
                characterFilter === 'all'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setCharacterFilter('players')}
              className={`flex-1 py-0.5 rounded text-center font-bold transition-all ${
                characterFilter === 'players'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60 shadow-xs'
                  : 'text-slate-400 hover:text-emerald-300'
              }`}
            >
              Jogadores
            </button>
            <button
              onClick={() => setCharacterFilter('npcs')}
              className={`flex-1 py-0.5 rounded text-center font-bold transition-all ${
                characterFilter === 'npcs'
                  ? 'bg-purple-950 text-purple-300 border border-purple-700/60 shadow-xs'
                  : 'text-slate-400 hover:text-purple-300'
              }`}
            >
              NPCs
            </button>
          </div>
        </div>

        {/* Filtro por Rodada */}
        <div className="flex items-center justify-between gap-1 text-[10px]">
          <span className="text-slate-500 font-semibold px-1 shrink-0">Rodada:</span>
          <div className="flex-1 flex items-center gap-1.5">
            <select
              value={selectedRoundFilter}
              onChange={(e) =>
                setSelectedRoundFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="all">Todas as Rodadas</option>
              {availableRounds.map((r) => {
                const count = allLogs.filter((l) => (l.round ?? 0) === r).length;
                return (
                  <option key={r} value={r}>
                    {r === 0 ? 'Rodada 0 (Preparação)' : `Rodada ${r}`} ({count} {count === 1 ? 'evento' : 'eventos'})
                  </option>
                );
              })}
            </select>
            {selectedRoundFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedRoundFilter('all')}
                className="px-2 py-1 text-[10px] text-amber-400 hover:text-white bg-slate-800 border border-slate-700 rounded-lg font-medium whitespace-nowrap transition-colors"
                title="Ver todas as rodadas"
              >
                Todas
              </button>
            )}
          </div>
        </div>

        {/* 3. Campo de Busca Livre */}
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nome, golpe, arma, local, item..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-7 pr-7 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              title="Limpar busca"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Log Feed List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-500">
            <SlidersHorizontal size={26} className="text-slate-600" />
            <div className="text-xs font-semibold text-slate-400">
              {allLogs.length === 0
                ? 'Nenhum evento registrado ainda'
                : 'Nenhum evento encontrado'}
            </div>
            <p className="text-[11px] max-w-[240px] leading-relaxed">
              {allLogs.length === 0
                ? 'Os lançamentos de dano, fadiga, curas e condições aparecerão aqui em tempo real.'
                : 'Tente ajustar os filtros acima ou limpar a busca de texto.'}
            </p>
            {(searchTerm || characterFilter !== 'all' || selectedRoundFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCharacterFilter('all');
                  setSelectedRoundFilter('all');
                }}
                className="mt-1 text-xs text-amber-400 hover:underline font-semibold"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          filteredLogs.map((entry, ix) => {
            const prevRound = ix > 0 ? (filteredLogs[ix - 1].round ?? 0) : null;
            const currentEntryRound = entry.round ?? 0;
            const isNewRound = ix === 0 || prevRound !== currentEntryRound;
            const curRound = activeCombat?.currentRound ?? (activeCombat as any)?.round ?? 0;
            const isCurrent = currentEntryRound === curRound;
            const roundTitle = currentEntryRound === 0
              ? (isCurrent ? 'Rodada 0 (Preparação) · em andamento' : 'Rodada 0 (Preparação)')
              : (isCurrent ? `Rodada ${currentEntryRound} · em andamento` : `Rodada ${currentEntryRound}`);

            return (
              <React.Fragment key={entry.id}>
                {isNewRound && (
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-amber-400 pt-1">
                    <span className="flex-1 h-px bg-slate-800" />
                    <span>{roundTitle}</span>
                    <span className="flex-1 h-px bg-slate-800" />
                  </div>
                )}
                <div
                  className={entry.npcId === selectedNpcId ? 'ring-1 ring-amber-400/60 rounded-xl' : ''}
                >
                  <CombatLogCard
                    entry={entry}
                    showNpcInfo={true}
                    onSelectNpc={onSelectNpc}
                    isCompact={true}
                    currentUserRole={currentUserRole}
                    currentUserName={currentUserName}
                    isPlayer={currentUserRole === 'jogador'}
                    onDeleteEntry={currentUserRole === 'mestre' ? onDeleteEntry : undefined}
                  />
                </div>
              </React.Fragment>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2 border-t border-slate-800 bg-slate-950/70 text-[10px] text-slate-500 flex items-center justify-between px-3">
        <span>Clique no card para abrir o personagem</span>
        <span className="font-mono text-amber-400/80 font-bold">{activeCombat?.name || 'Combate'}</span>
      </div>

      <ConfirmModal
        isOpen={clearConfirmOpen}
        title="Limpar Histórico de Combate"
        message="Deseja limpar todo o histórico de combate de todos os NPCs e Personagens? Esta ação não pode ser desfeita."
        confirmText="Limpar Histórico"
        cancelText="Cancelar"
        isDanger={true}
        onConfirm={() => {
          onClearHistory?.();
          setClearConfirmOpen(false);
        }}
        onCancel={() => setClearConfirmOpen(false)}
      />
    </div>
  );
};
