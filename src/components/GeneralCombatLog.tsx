import React, { useState, useMemo, useEffect } from 'react';
import { Combat, UserRole, MesaRole, NPC, ActionLogEntry } from '../types/rpg';
import { CombatLogCard } from './CombatLogCard';
import { DetailedLogModal } from './DetailedLogModal';
import { ScrollText, Search, X, SlidersHorizontal, Maximize2, PanelRightClose, ChevronRight } from 'lucide-react';

interface GeneralCombatLogProps {
  activeCombat: Combat | undefined;
  additionalCharacters?: NPC[];
  sessionEvents?: any[];
  onSelectNpc: (npcId: string) => void;
  selectedNpcId: string;
  currentUserRole: MesaRole;
  currentUserName?: string;
  canDelete?: boolean;
  onClearHistory?: () => void;
  onDeleteEntry?: (entryId: string, npcId?: string, revertValues?: boolean) => void;
  onUpdateEntryComment?: (entryId: string, npcId: string | undefined, comment: string) => void;
  onToggleCollapse?: () => void;
}

export const GeneralCombatLog: React.FC<GeneralCombatLogProps> = ({
  activeCombat,
  additionalCharacters,
  sessionEvents = [],
  onSelectNpc,
  selectedNpcId,
  currentUserRole,
  currentUserName,
  canDelete,
  onClearHistory,
  onDeleteEntry,
  onUpdateEntryComment,
  onToggleCollapse,
}) => {
  const userCanDelete = canDelete !== undefined ? canDelete : (currentUserRole === 'mestre');

  // Filtro de Rodada ('all' ou número da rodada)
  const [selectedRoundFilter, setSelectedRoundFilter] = useState<number | 'all'>('all');

  // Filtro 1: Entidade (Todos | Personagens | NPCs)
  const [entityFilter, setEntityFilter] = useState<'all' | 'players' | 'npcs'>('all');

  // Filtro 2: Tipo de Evento (Todos | Status | Rolagens)
  const [typeFilter, setTypeFilter] = useState<'all' | 'status' | 'rolls'>('all');

  // Filtro 3: Busca Livre
  const [searchTerm, setSearchTerm] = useState('');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedRoundFilter, entityFilter, typeFilter, searchTerm, pageSize, activeCombat?.id]);

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

    // 1. Eventos e rolagens gerais da Mesa de RPG (Globais, não pertencem a combates)
    const baseEvents = [
      ...(sessionEvents || []),
      ...(activeCombat?.events || [])
    ];
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
  }, [activeCombat, additionalCharacters, currentUserRole, sessionEvents]);

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

  // Apply filters: Rodada, Entidade (Personagens vs NPCs), Tipo (Status vs Rolagens) e Busca Livre
  const filteredLogs = useMemo(() => {
    return allLogs.filter((entry) => {
      // 1. Filtro de Rodada
      if (selectedRoundFilter !== 'all') {
        const entryRound = entry.round !== undefined ? entry.round : 0;
        if (entryRound !== selectedRoundFilter) {
          return false;
        }
      }

      // 2. Filtro de Entidade (Personagens vs NPCs)
      if (entityFilter === 'players' && entry.npcCharacterType !== 'player') {
        return false;
      }
      if (entityFilter === 'npcs' && entry.npcCharacterType === 'player') {
        return false;
      }

      // 3. Filtro de Tipo (Status vs Rolagens)
      if (typeFilter === 'status' && entry.type === 'roll') {
        return false;
      }
      if (typeFilter === 'rolls' && entry.type !== 'roll') {
        return false;
      }

      // 4. Campo de busca livre
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesNpc = entry.npcName?.toLowerCase().includes(query);
        const matchesPlayer = entry.playerName?.toLowerCase().includes(query);
        const matchesDesc = entry.description?.toLowerCase().includes(query);
        const matchesLoc = entry.hitLocation?.toLowerCase().includes(query);
        const matchesItem = entry.itemName?.toLowerCase().includes(query);
        const matchesDmgType = entry.damageType?.toLowerCase().includes(query);
        const matchesAttacker = entry.attackerName?.toLowerCase().includes(query);
        const matchesComment = entry.comment?.toLowerCase().includes(query);
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
          !matchesAttacker &&
          !matchesComment
        ) {
          return false;
        }
      }

      return true;
    });
  }, [allLogs, selectedRoundFilter, entityFilter, typeFilter, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const paginatedLogs = useMemo(
    () => filteredLogs.slice(startIdx, startIdx + pageSize),
    [filteredLogs, startIdx, pageSize]
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
              <h3 className="text-xs font-black text-amber-300 uppercase tracking-widest">
                Log da Mesa
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-900 text-amber-300 border border-slate-700">
              {filteredLogs.length} / {allLogs.length}
            </span>

            {/* Botão de Exibir/Ocultar Filtros */}
            <button
              type="button"
              onClick={() => setShowFilters((prev) => !prev)}
              className={`px-2 py-1 rounded-lg border transition-colors flex items-center gap-1 text-[10px] font-semibold cursor-pointer ${
                showFilters
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-900/90 text-slate-400 hover:text-white border-slate-700/80 hover:border-slate-600'
              }`}
              title={showFilters ? 'Ocultar filtros do log' : 'Exibir filtros do log'}
            >
              <SlidersHorizontal size={12} />
              <span className="hidden sm:inline">Filtros</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDetailModalOpen(true)}
              className="px-2 py-1 text-slate-300 hover:text-amber-300 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/40 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-semibold cursor-pointer"
              title="Abrir janela com visualização detalhada do log e ferramentas da mesa"
            >
              <Maximize2 size={12} />
              <span>Detalhado</span>
            </button>

            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1.5 text-slate-400 hover:text-amber-300 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/40 rounded-lg transition-colors flex items-center justify-center cursor-pointer group"
                title="Recolher aba lateral de log (seta para a direita)"
              >
                <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="space-y-2 pt-1 border-t border-slate-800/80">
            {/* Filtro 1: Origem / Entidade (Todos | Personagens | NPCs) */}
            <div className="flex items-center justify-between gap-1 text-[10px]">
              <span className="text-slate-500 font-semibold px-1 shrink-0 w-11">Origem:</span>
              <div className="flex-1 flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setEntityFilter('all')}
                  className={`flex-1 py-0.5 rounded text-center font-bold transition-all cursor-pointer ${
                    entityFilter === 'all'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setEntityFilter('players')}
                  className={`flex-1 py-0.5 rounded text-center font-bold transition-all cursor-pointer ${
                    entityFilter === 'players'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60 shadow-xs'
                      : 'text-slate-400 hover:text-emerald-300'
                  }`}
                >
                  Personagens
                </button>
                <button
                  type="button"
                  onClick={() => setEntityFilter('npcs')}
                  className={`flex-1 py-0.5 rounded text-center font-bold transition-all cursor-pointer ${
                    entityFilter === 'npcs'
                      ? 'bg-purple-950 text-purple-300 border border-purple-700/60 shadow-xs'
                      : 'text-slate-400 hover:text-purple-300'
                  }`}
                >
                  NPCs
                </button>
              </div>
            </div>

            {/* Filtro 2: Tipo de Evento (Todos | Status | Rolagens) */}
            <div className="flex items-center justify-between gap-1 text-[10px]">
              <span className="text-slate-500 font-semibold px-1 shrink-0 w-11">Tipo:</span>
              <div className="flex-1 flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setTypeFilter('all')}
                  className={`flex-1 py-0.5 rounded text-center font-bold transition-all cursor-pointer ${
                    typeFilter === 'all'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('status')}
                  className={`flex-1 py-0.5 rounded text-center font-bold transition-all cursor-pointer ${
                    typeFilter === 'status'
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60 shadow-xs'
                      : 'text-slate-400 hover:text-cyan-300'
                  }`}
                  title="Exibe alterações de status e condições"
                >
                  Status
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('rolls')}
                  className={`flex-1 py-0.5 rounded text-center font-bold transition-all cursor-pointer ${
                    typeFilter === 'rolls'
                      ? 'bg-amber-950 text-amber-300 border border-amber-600/60 shadow-xs'
                      : 'text-slate-400 hover:text-amber-300'
                  }`}
                  title="Exibe apenas rolagens de dados"
                >
                  Rolagens
                </button>
              </div>
            </div>

            {/* Filtro de Rodada Compacto + Busca Menor e Alinhada ao Lado */}
            <div className="flex items-center gap-1.5 text-[10px]">
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-slate-500 font-semibold px-0.5 shrink-0">Rodada:</span>
                <select
                  value={selectedRoundFilter}
                  onChange={(e) =>
                    setSelectedRoundFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
                  }
                  className="w-20 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                  title="Filtrar por rodada"
                >
                  <option value="all">Todas</option>
                  {availableRounds.map((r) => (
                    <option key={r} value={r}>
                      {r === 0 ? '0' : `${r}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative flex-1 min-w-0">
                <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar no log..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-7 pr-6 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    title="Limpar busca"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
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
            {(searchTerm || entityFilter !== 'all' || typeFilter !== 'all' || selectedRoundFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setEntityFilter('all');
                  setTypeFilter('all');
                  setSelectedRoundFilter('all');
                }}
                className="mt-1 text-xs text-amber-400 hover:underline font-semibold cursor-pointer"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          paginatedLogs.map((entry) => (
            <div
              key={entry.id}
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
                onDeleteEntry={undefined}
                onUpdateEntryComment={onUpdateEntryComment}
              />
            </div>
          ))
        )}
      </div>

      {/* Pagination Bar */}
      {filteredLogs.length > 0 && (
        <div className="px-3 py-2 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-mono text-[10px]">
              {startIdx + 1}–{Math.min(startIdx + pageSize, filteredLogs.length)} de {filteredLogs.length}
            </span>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 pl-1 border-l border-slate-800">
              <span>Exibir:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] text-amber-300 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, Math.min(p, totalPages) - 1))}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none text-slate-200 border border-slate-800 font-semibold transition-colors cursor-pointer"
              title="Página anterior"
            >
              « Ant.
            </button>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300 font-mono font-bold text-[10px]">
              Pág. {safePage}/{totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, Math.min(p, totalPages) + 1))}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none text-slate-200 border border-slate-800 font-semibold transition-colors cursor-pointer"
              title="Próxima página"
            >
              Próx. »
            </button>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="p-2 border-t border-slate-800 bg-slate-950/70 text-[10px] text-slate-500 flex items-center justify-between px-3">
        <span>Clique no card para abrir o personagem</span>
        <span className="font-mono text-amber-400/80 font-bold">{activeCombat?.name || 'Combate'}</span>
      </div>

      {/* Modal com Visualização Detalhada do Log e Ações da Mesa */}
      <DetailedLogModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        logs={allLogs}
        activeCombat={activeCombat}
        currentUserRole={currentUserRole}
        currentUserName={currentUserName}
        canDelete={userCanDelete}
        onClearHistory={onClearHistory}
        onDeleteEntry={onDeleteEntry}
        onUpdateEntryComment={onUpdateEntryComment}
        onSelectNpc={onSelectNpc}
        initialEntityFilter={entityFilter}
        initialTypeFilter={typeFilter}
        initialRoundFilter={selectedRoundFilter}
        initialSearch={searchTerm}
      />
    </div>
  );
};
