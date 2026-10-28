import React, { useState, useMemo, useEffect } from 'react';
import { Combat, UserRole, NPC } from '../types/rpg';
import { CombatLogCard } from './CombatLogCard';
import { ScrollText, Trash2, Search, X, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

const PAGE_SIZE = 10;

interface GeneralCombatLogProps {
  activeCombat: Combat | undefined;
  additionalCharacters?: NPC[];
  sessionEvents?: any[];
  onSelectNpc: (npcId: string) => void;
  selectedNpcId: string;
  currentUserRole: UserRole;
  currentUserName?: string;
  onClearHistory?: () => void;
  onDeleteEntry?: (entryId: string, npcId?: string, revertValues?: boolean) => void;
  onUpdateEntryComment?: (entryId: string, npcId?: string, comment: string) => void;
}

export const GeneralCombatLog: React.FC<GeneralCombatLogProps> = ({
  activeCombat,
  additionalCharacters,
  sessionEvents = [],
  onSelectNpc,
  selectedNpcId,
  currentUserRole,
  currentUserName,
  onClearHistory,
  onDeleteEntry,
  onUpdateEntryComment,
}) => {
  // Filtro 1: Rodada ('all' ou número da rodada)
  const [selectedRoundFilter, setSelectedRoundFilter] = useState<number | 'all'>('all');

  // Filtro 2: Tipo de Personagem / Rolagens (Todos | Jogadores | NPCs | Rolagens)
  const [characterFilter, setCharacterFilter] = useState<'all' | 'players' | 'npcs' | 'rolls'>('all');

  // Filtro 3: Busca Livre
  const [searchTerm, setSearchTerm] = useState('');
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedRoundFilter, characterFilter, searchTerm, activeCombat?.id]);

  // Collect and sort all logs across all active combat NPCs and Personagens
  const allLogs = useMemo(() => {
    const isNoCombat =
      !activeCombat ||
      activeCombat.id === 'combat-vazio' ||
      activeCombat.name?.toLowerCase().includes('vazio') ||
      activeCombat.name?.toLowerCase().trim() === 'sem combate';
    const combinedCharacters = [
      ...(additionalCharacters || []),
      ...(isNoCombat ? [] : activeCombat?.npcs?.filter((n) => !additionalCharacters?.some((p) => p.id === n.id)) || [])
    ];

    const list: any[] = [];
    const seenIds = new Set<string>();

    // 1. Eventos e rolagens gerais (do combate ativo ou da sessão livre)
    const baseEvents = activeCombat ? (activeCombat.events || []) : (sessionEvents || []);
    for (const ev of baseEvents) {
      if (currentUserRole === 'jogador' && (ev.isSecret || (ev as any).hiddenFromPlayers)) {
        continue;
      }
      if (!seenIds.has(ev.id)) {
        seenIds.add(ev.id);
        let comment = ev.comment;
        if (!comment && ev.npcId) {
          const char = combinedCharacters.find((c) => c.id === ev.npcId);
          const histEntry = char?.history?.find((h: any) => h.id === ev.id);
          if (histEntry?.comment) {
            comment = histEntry.comment;
          }
        }
        list.push({
          ...ev,
          comment,
          npcName: ev.npcName || ev.authorName || 'Mestre',
          npcCharacterType: ev.npcCharacterType || 'npc',
        });
      }
    }

    // 2. Histórico individual dos combatentes
    for (const npc of combinedCharacters) {
      const isPlayerChar = npc.characterType === 'player';

      // 1. Visibilidade do combatente:
      // Personagens são SEMPRE visíveis para jogadores (podem ver completo).
      // NPCs respeitam a visibilidade isVisibleToPlayer.
      if (currentUserRole === 'jogador' && !isPlayerChar && npc.isVisibleToPlayer === false) {
        continue;
      }

      for (const entry of npc.history || []) {
        // Se a rolagem ou evento estiver oculto para jogadores, oculta
        if (currentUserRole === 'jogador' && (entry.isSecret || (entry as any).hiddenFromPlayers)) {
          continue;
        }

        // 2. As alterações de status feitas pelo mestre nos NPCs não devem refletir para os jogadores
        if (currentUserRole === 'jogador' && !isPlayerChar && entry.author === 'mestre' && entry.type !== 'roll') {
          continue;
        }

        if (!seenIds.has(entry.id)) {
          seenIds.add(entry.id);
          list.push({
            ...entry,
            npcId: npc.id,
            npcName: npc.name || 'Personagem',
            npcAvatar: npc.avatar,
            npcPreset: npc.avatarPreset,
            npcCharacterType: npc.characterType || 'npc',
            playerName: npc.playerName || '',
          });
        } else {
          const existing = list.find((x) => x.id === entry.id);
          if (existing && !existing.comment && entry.comment) {
            existing.comment = entry.comment;
          }
        }
      }
    }

    // Sort newest to oldest
    return list.sort((a, b) => {
      const getEpoch = (entry: ActionLogEntry): number => {
        if (entry.timestampMs && typeof entry.timestampMs === 'number') return entry.timestampMs;
        if (entry.id) {
          const parts = entry.id.split('-');
          for (let i = 1; i < parts.length; i++) {
            const num = parseInt(parts[i], 10);
            if (!isNaN(num) && num > 1000000000000) return num;
          }
        }
        if (entry.timestamp && entry.timestamp.includes('T')) {
          const parsed = Date.parse(entry.timestamp);
          if (!isNaN(parsed)) return parsed;
        }
        return 0;
      };

      const timeA = getEpoch(a);
      const timeB = getEpoch(b);
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

      // 2. Filtro de Tipo de Personagem / Rolagens / Status
      if (characterFilter === 'status' && entry.type === 'roll') {
        return false;
      }
      if (characterFilter === 'rolls' && entry.type !== 'roll') {
        return false;
      }
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

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const paginatedLogs = useMemo(
    () => filteredLogs.slice(startIdx, startIdx + PAGE_SIZE),
    [filteredLogs, startIdx]
  );

  return (
    <div
      style={{
        background: '#0b1120',
        border: '1px solid rgba(245, 158, 11, 0.35)',
        boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.7)',
      }}
      className="rounded-2xl shadow-2xl flex flex-col h-[calc(100vh-140px)] min-h-[500px] overflow-hidden"
    >
      {/* Header Padronizado com Gradiente Âmbar e Identidade Visual Clara de Log */}
      <div
        style={{
          padding: '10px 16px',
          borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
          background: 'linear-gradient(to right, rgba(69, 26, 3, 0.45), #0f172a, #0f172a)',
          flexShrink: 0,
        }}
        className="space-y-2.5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-xs">
              <ScrollText size={17} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black text-amber-300 uppercase tracking-widest">
                  Log de Combate
                </h3>
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-400 border border-amber-800/60">
                  Histórico
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Rolagens, danos e eventos da mesa em tempo real
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-900 text-amber-300 border border-slate-700">
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
              onClick={() => setCharacterFilter('status')}
              className={`flex-1 py-0.5 rounded text-center font-bold transition-all ${
                characterFilter === 'status'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60 shadow-xs'
                  : 'text-slate-400 hover:text-cyan-300'
              }`}
              title="Exibe apenas alterações de status (sem rolagens)"
            >
              Status
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
            <button
              onClick={() => setCharacterFilter('rolls')}
              className={`flex-1 py-0.5 rounded text-center font-bold transition-all ${
                characterFilter === 'rolls'
                  ? 'bg-amber-950 text-amber-300 border border-amber-600/60 shadow-xs'
                  : 'text-slate-400 hover:text-amber-300'
              }`}
            >
              Rolagens
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
          paginatedLogs.map((entry, ix) => {
            const prevRound = ix > 0 ? (paginatedLogs[ix - 1].round ?? 0) : null;
            const currentEntryRound = entry.round ?? 0;
            const isNewRound = ix === 0 || prevRound !== currentEntryRound;
            const isNoCombat = !activeCombat || activeCombat.id === 'combat-vazio' || activeCombat.name?.toLowerCase().includes('vazio') || activeCombat.name?.toLowerCase().trim() === 'sem combate';
            const curRound = isNoCombat ? 0 : (activeCombat?.currentRound ?? (activeCombat as any)?.round ?? 0);
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
                    onUpdateEntryComment={onUpdateEntryComment}
                  />
                </div>
              </React.Fragment>
            );
          })
        )}
      </div>

      {/* Pagination Bar (10 em 10) */}
      {filteredLogs.length > 0 && (
        <div className="px-3 py-2 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between gap-2 text-[11px]">
          <span className="text-slate-400 font-mono text-[10px]">
            {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, filteredLogs.length)} de {filteredLogs.length}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, Math.min(p, totalPages) - 1))}
              className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none text-slate-200 border border-slate-800 font-semibold flex items-center gap-0.5 transition-colors"
              title="Página anterior"
            >
              <ChevronLeft size={12} />
              <span>Ant.</span>
            </button>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300 font-mono font-bold text-[10px]">
              Pág. {safePage}/{totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, Math.min(p, totalPages) + 1))}
              className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none text-slate-200 border border-slate-800 font-semibold flex items-center gap-0.5 transition-colors"
              title="Próxima página"
            >
              <span>Próx.</span>
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}

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
