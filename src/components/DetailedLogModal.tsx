import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ActionLogEntry, MesaRole, Combat } from '../types/rpg';
import { CombatLogCard } from './CombatLogCard';
import { ConfirmModal } from './ConfirmModal';
import {
  ScrollText,
  X,
  Trash2,
  Search,
  Copy,
  Check,
  LayoutList,
  Table as TableIcon,
  Filter,
  Dices,
  Activity,
  Users,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Calendar,
} from 'lucide-react';

interface DetailedLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: any[];
  activeCombat?: Combat;
  currentUserRole: MesaRole;
  currentUserName?: string;
  canDelete?: boolean;
  onClearHistory?: () => void;
  onDeleteEntry?: (entryId: string, npcId?: string, revertValues?: boolean) => void;
  onUpdateEntryComment?: (entryId: string, npcId: string | undefined, comment: string) => void;
  onSelectNpc?: (npcId: string) => void;
  initialEntityFilter?: 'all' | 'players' | 'npcs';
  initialTypeFilter?: 'all' | 'status' | 'rolls';
  initialRoundFilter?: number | 'all';
  initialSearch?: string;
}

function getEntryDateTime(entry: any): { dateStr: string; timeStr: string; full: string; dateISO: string } {
  let dateObj: Date | null = null;
  if (entry.timestampMs && typeof entry.timestampMs === 'number' && entry.timestampMs > 1000000000000) {
    dateObj = new Date(entry.timestampMs);
  } else if (entry.id) {
    const parts = String(entry.id).split('-');
    for (let i = 1; i < parts.length; i++) {
      const num = parseInt(parts[i], 10);
      if (!isNaN(num) && num > 1000000000000) {
        dateObj = new Date(num);
        break;
      }
    }
  }

  if (!dateObj && entry.timestamp && typeof entry.timestamp === 'string' && entry.timestamp.includes('T')) {
    const parsed = Date.parse(entry.timestamp);
    if (!isNaN(parsed)) dateObj = new Date(parsed);
  }

  if (dateObj && !isNaN(dateObj.getTime())) {
    const dateStr = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    const dateISO = `${y}-${m}-${d}`;
    return { dateStr, timeStr, full: `${dateStr} ${timeStr}`, dateISO };
  }

  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const todayISO = `${y}-${m}-${d}`;
  const todayStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  if (entry.timestamp && typeof entry.timestamp === 'string') {
    if (entry.timestamp.includes('/') || entry.timestamp.includes('-')) {
      return { dateStr: '', timeStr: entry.timestamp, full: entry.timestamp, dateISO: todayISO };
    }
    return { dateStr: todayStr, timeStr: entry.timestamp, full: `${todayStr} ${entry.timestamp}`, dateISO: todayISO };
  }

  return { dateStr: todayStr, timeStr: '—', full: todayStr, dateISO: todayISO };
}

export const DetailedLogModal: React.FC<DetailedLogModalProps> = ({
  isOpen,
  onClose,
  logs,
  activeCombat,
  currentUserRole,
  currentUserName,
  canDelete,
  onClearHistory,
  onDeleteEntry,
  onUpdateEntryComment,
  onSelectNpc,
  initialEntityFilter = 'all',
  initialTypeFilter = 'all',
  initialRoundFilter = 'all',
  initialSearch = '',
}) => {
  const userCanDelete = canDelete !== undefined ? canDelete : (currentUserRole === 'mestre');

  const [entityFilter, setEntityFilter] = useState<'all' | 'players' | 'npcs'>(initialEntityFilter);
  const [typeFilter, setTypeFilter] = useState<'all' | 'status' | 'rolls'>(initialTypeFilter);
  const [roundFilter, setRoundFilter] = useState<number | 'all'>(initialRoundFilter);
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [copied, setCopied] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  // Sincroniza filtros caso receba valores iniciais ao abrir
  useEffect(() => {
    if (isOpen) {
      setViewMode('table');
      setEntityFilter(initialEntityFilter);
      setTypeFilter(initialTypeFilter);
      setRoundFilter(initialRoundFilter);
      setDateFilter('all');
      setSearchTerm(initialSearch);
      setCurrentPage(1);
    }
  }, [isOpen, initialEntityFilter, initialTypeFilter, initialRoundFilter, initialSearch]);

  // Tecla Escape para fechar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !clearConfirmOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, clearConfirmOpen, onClose]);

  // Reset de página ao alterar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [entityFilter, typeFilter, roundFilter, dateFilter, searchTerm, pageSize]);

  // Rodadas disponíveis
  const availableRounds = useMemo(() => {
    const roundsSet = new Set<number>();
    if (activeCombat?.currentRound !== undefined) {
      roundsSet.add(activeCombat.currentRound);
    }
    for (const entry of logs) {
      if (entry.round !== undefined) {
        roundsSet.add(entry.round);
      }
    }
    if (roundsSet.size === 0) {
      roundsSet.add(0);
    }
    return Array.from(roundsSet).sort((a, b) => a - b);
  }, [logs, activeCombat?.currentRound]);

  // Filtragem
  const filteredLogs = useMemo(() => {
    return logs.filter((entry) => {
      // 0. Filtro de Data
      if (dateFilter !== 'all') {
        const dt = getEntryDateTime(entry);
        if (dt.dateISO !== dateFilter) return false;
      }

      // 1. Filtro de Rodada
      if (roundFilter !== 'all') {
        const entryRound = entry.round !== undefined ? entry.round : 0;
        if (entryRound !== roundFilter) return false;
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

      // 4. Busca Livre
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesNpc = entry.npcName?.toLowerCase().includes(q);
        const matchesPlayer = entry.playerName?.toLowerCase().includes(q);
        const matchesDesc = entry.description?.toLowerCase().includes(q);
        const matchesLoc = entry.hitLocation?.toLowerCase().includes(q);
        const matchesItem = entry.itemName?.toLowerCase().includes(q);
        const matchesDmgType = entry.damageType?.toLowerCase().includes(q);
        const matchesAttacker = entry.attackerName?.toLowerCase().includes(q);
        const matchesComment = entry.comment?.toLowerCase().includes(q);
        const matchesAuthor =
          entry.authorName?.toLowerCase().includes(q) ||
          entry.author?.toLowerCase().includes(q);

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
  }, [logs, dateFilter, roundFilter, entityFilter, typeFilter, searchTerm]);

  // Estatísticas rápidas
  const stats = useMemo(() => {
    const totalRolls = logs.filter((l) => l.type === 'roll').length;
    const totalStatus = logs.filter((l) => l.type !== 'roll').length;
    const playersCount = logs.filter((l) => l.npcCharacterType === 'player').length;
    const npcsCount = logs.filter((l) => l.npcCharacterType !== 'player').length;
    return { totalRolls, totalStatus, playersCount, npcsCount };
  }, [logs]);

  // Paginação
  const effectivePageSize = pageSize === -1 ? Math.max(1, filteredLogs.length) : pageSize;
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / effectivePageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * effectivePageSize;
  const paginatedLogs = useMemo(() => {
    if (pageSize === -1) return filteredLogs;
    return filteredLogs.slice(startIdx, startIdx + effectivePageSize);
  }, [filteredLogs, startIdx, effectivePageSize, pageSize]);

  // Copiar log formatado
  const handleCopyLog = () => {
    try {
      const text = filteredLogs
        .map((entry, idx) => {
          const roundText = entry.round !== undefined ? `[Rodada ${entry.round}]` : '[Sem rodada]';
          const dt = getEntryDateTime(entry);
          const timeText = `[${dt.full}]`;
          const author = entry.authorName || entry.author || 'Mesa';
          const target = entry.npcName || 'Geral';
          const type = entry.type === 'roll' ? 'ROLAGEM' : 'STATUS/AÇÃO';
          const desc = entry.description || entry.typeBadge?.label || '';
          const comment = entry.comment ? ` | Comentário: ${entry.comment}` : '';
          return `${idx + 1}. ${roundText} ${timeText} [${type}] ${author} -> ${target}: ${desc}${comment}`;
        })
        .join('\n');

      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('Falha ao copiar log', e);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
      }}
      className="flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div
        style={{
          background: '#0b1120',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9)',
        }}
        className="w-full max-w-5xl h-[92vh] max-h-[920px] rounded-2xl flex flex-col overflow-hidden text-slate-200 relative"
      >
        {/* Cabeçalho */}
        <div
          style={{
            background: 'linear-gradient(to right, rgba(69, 26, 3, 0.6), #0f172a, #0b1120)',
            borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
          }}
          className="px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 shrink-0"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-md">
              <ScrollText size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-amber-300 tracking-wide">
                  Log Detalhado da Mesa
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-900 text-amber-400 border border-slate-700">
                  {filteredLogs.length} de {logs.length} eventos
                </span>
                {activeCombat?.name && (
                  <span className="text-[10px] font-semibold text-slate-400 border-l border-slate-700 pl-2">
                    Combate: <strong className="text-amber-300/90">{activeCombat.name}</strong>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                <span className="flex items-center gap-1">
                  <Dices size={12} className="text-amber-400" />
                  <span>{stats.totalRolls} Rolagens</span>
                </span>
                <span className="flex items-center gap-1">
                  <Activity size={12} className="text-cyan-400" />
                  <span>{stats.totalStatus} Ações de Status</span>
                </span>
                <span className="flex items-center gap-1">
                  <Users size={12} className="text-emerald-400" />
                  <span>{stats.playersCount} Personagens / {stats.npcsCount} NPCs</span>
                </span>
              </div>
            </div>
          </div>

          {/* Ações da barra superior */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyLog}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Copiar eventos visíveis para a área de transferência"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Copiar Log'}</span>
            </button>

            {currentUserRole === 'mestre' && onClearHistory && logs.length > 0 && (
              <button
                type="button"
                onClick={() => setClearConfirmOpen(true)}
                className="px-2.5 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 hover:text-rose-100 border border-rose-800/80 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Limpar histórico de combate de todos os NPCs e Personagens"
              >
                <Trash2 size={14} />
                <span className="hidden sm:inline">Limpar Todo o Log</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-colors ml-1 cursor-pointer"
              title="Fechar (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Barra de Filtros e Controles */}
        <div className="p-3 sm:px-6 sm:py-3 border-b border-slate-800 bg-slate-950/60 space-y-2.5 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Bloco 1: Origem e Tipo */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Filtro 1: Entidade */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500 font-semibold shrink-0 text-[11px]">Origem:</span>
                <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEntityFilter('all')}
                    className={`px-2 py-1 rounded text-center text-xs font-bold transition-all cursor-pointer ${
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
                    className={`px-2 py-1 rounded text-center text-xs font-bold transition-all cursor-pointer ${
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
                    className={`px-2 py-1 rounded text-center text-xs font-bold transition-all cursor-pointer ${
                      entityFilter === 'npcs'
                        ? 'bg-purple-950 text-purple-300 border border-purple-700/60 shadow-xs'
                        : 'text-slate-400 hover:text-purple-300'
                    }`}
                  >
                    NPCs
                  </button>
                </div>
              </div>

              {/* Filtro 2: Tipo de Evento */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500 font-semibold shrink-0 text-[11px]">Tipo:</span>
                <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setTypeFilter('all')}
                    className={`px-2 py-1 rounded text-center text-xs font-bold transition-all cursor-pointer ${
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
                    className={`px-2 py-1 rounded text-center text-xs font-bold transition-all cursor-pointer ${
                      typeFilter === 'status'
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60 shadow-xs'
                        : 'text-slate-400 hover:text-cyan-300'
                    }`}
                    title="Alterações de status e condições"
                  >
                    Status
                  </button>
                  <button
                    type="button"
                    onClick={() => setTypeFilter('rolls')}
                    className={`px-2 py-1 rounded text-center text-xs font-bold transition-all cursor-pointer ${
                      typeFilter === 'rolls'
                        ? 'bg-amber-950 text-amber-300 border border-amber-600/60 shadow-xs'
                        : 'text-slate-400 hover:text-amber-300'
                    }`}
                    title="Rolagens de dados"
                  >
                    Rolagens
                  </button>
                </div>
              </div>

              {/* Filtro 3: Data (Compacto) */}
              <div className="flex items-center gap-1 text-xs shrink-0">
                <span className="text-slate-500 font-semibold shrink-0 text-[11px] flex items-center gap-1">
                  <Calendar size={12} className="text-amber-400" />
                  Data:
                </span>
                <div className="flex items-center gap-1 bg-slate-900 px-1.5 py-1 rounded-lg border border-slate-800">
                  <input
                    type="date"
                    value={dateFilter === 'all' ? '' : dateFilter}
                    onChange={(e) => setDateFilter(e.target.value || 'all')}
                    className="bg-transparent text-[11px] text-white font-mono focus:outline-none cursor-pointer w-[105px] max-w-[110px] [color-scheme:dark] p-0"
                    title="Filtrar eventos por data"
                  />
                  {dateFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setDateFilter('all')}
                      className="p-0.5 text-slate-400 hover:text-white cursor-pointer shrink-0"
                      title="Limpar filtro de data"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Bloco 2: Rodada + Alternância de Visualização */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-semibold text-[11px]">Rodada:</span>
                <select
                  value={roundFilter}
                  onChange={(e) =>
                    setRoundFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
                  }
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                >
                  <option value="all">Todas as Rodadas</option>
                  {availableRounds.map((r) => (
                    <option key={r} value={r}>
                      {r === 0 ? 'Rodada 0 (Prep)' : `Rodada ${r}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Botões de modo de visualização */}
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`p-1 rounded transition-colors cursor-pointer ${
                    viewMode === 'cards'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Visualização em Cards Detalhados"
                >
                  <LayoutList size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-1 rounded transition-colors cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Visualização em Tabela / Linhas"
                >
                  <TableIcon size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Linha de Busca e Itens por Página */}
          <div className="flex items-center gap-2 pt-0.5">
            <div className="relative flex-1">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Filtrar por nome, combatente, golpe, arma, local, dano, comentário ou autor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-800 rounded-lg pl-8 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  title="Limpar busca"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0 text-xs text-slate-400">
              <span className="hidden sm:inline text-[11px]">Exibir:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                <option value={10}>10 / pág</option>
                <option value={20}>20 / pág</option>
                <option value={50}>50 / pág</option>
                <option value={-1}>Todos</option>
              </select>
            </div>
          </div>
        </div>

        {/* Conteúdo Principal (Scroll) */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 bg-slate-950/40">
          {filteredLogs.length === 0 ? (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-500">
              <Filter size={32} className="text-slate-600 mb-1" />
              <div className="text-sm font-semibold text-slate-300">
                {logs.length === 0 ? 'Nenhum evento registrado ainda' : 'Nenhum evento corresponde aos filtros'}
              </div>
              <p className="text-xs text-slate-400 max-w-sm">
                {logs.length === 0
                  ? 'Os lançamentos de dano, fadiga, curas, condições e rolagens aparecerão aqui.'
                  : 'Tente ajustar os filtros de origem, tipo, rodada ou limpar o termo de busca.'}
              </p>
              {(searchTerm || entityFilter !== 'all' || typeFilter !== 'all' || roundFilter !== 'all' || dateFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setEntityFilter('all');
                    setTypeFilter('all');
                    setRoundFilter('all');
                    setDateFilter('all');
                  }}
                  className="mt-2 text-xs text-amber-400 hover:underline font-semibold cursor-pointer"
                >
                  Limpar todos os filtros
                </button>
              )}
            </div>
          ) : viewMode === 'cards' ? (
            /* Modo Cards com visualização expandida/detalhada */
            paginatedLogs.map((entry, ix) => {
              const prevRound = ix > 0 ? (paginatedLogs[ix - 1].round ?? 0) : null;
              const currentEntryRound = entry.round ?? 0;
              const isNewRound = ix === 0 || prevRound !== currentEntryRound;
              const roundTitle =
                currentEntryRound === 0
                  ? 'Rodada 0 (Preparação)'
                  : `Rodada ${currentEntryRound}`;

              return (
                <React.Fragment key={entry.id || ix}>
                  {isNewRound && (
                    <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-amber-400 pt-2 pb-1">
                      <span className="flex-1 h-px bg-slate-800" />
                      <span className="bg-slate-900/90 px-3 py-1 rounded-full border border-slate-800 text-[11px]">
                        {roundTitle}
                      </span>
                      <span className="flex-1 h-px bg-slate-800" />
                    </div>
                  )}
                  <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 hover:border-amber-500/30 transition-all p-1">
                    <CombatLogCard
                      entry={entry}
                      showNpcInfo={true}
                      onSelectNpc={onSelectNpc}
                      isCompact={false}
                      showFullDateTime={true}
                      currentUserRole={currentUserRole}
                      currentUserName={currentUserName}
                      isPlayer={currentUserRole === 'jogador'}
                      onDeleteEntry={userCanDelete ? onDeleteEntry : undefined}
                      onUpdateEntryComment={onUpdateEntryComment}
                    />
                  </div>
                </React.Fragment>
              );
            })
          ) : (
            /* Modo Tabela / Linhas para auditoria detalhada */
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/70">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 text-[11px] font-bold uppercase">
                      <th className="py-2.5 px-3 text-center w-20">Rodada</th>
                      <th className="py-2.5 px-3 whitespace-nowrap min-w-[130px]">Dia e Hora</th>
                      <th className="py-2.5 px-3">Combatente / Alvo</th>
                      <th className="py-2.5 px-3">Tipo</th>
                      <th className="py-2.5 px-3">Descrição / Efeito</th>
                      <th className="py-2.5 px-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {paginatedLogs.map((entry) => {
                      const isRoll = entry.type === 'roll';
                      const isPlayerChar = entry.npcCharacterType === 'player';
                      const isPassDay =
                        entry.itemName === 'Passar o Dia' ||
                        entry.npcName === 'Passar o Dia' ||
                        (entry.id && String(entry.id).includes('passday')) ||
                        (entry.description && entry.description.startsWith('Passar '));
                      const dt = getEntryDateTime(entry);
                      const rNum = entry.round !== undefined ? entry.round : 0;
                      return (
                        <tr key={entry.id} className="hover:bg-slate-800/40 transition-colors">
                          {/* Coluna 1: Rodada */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span
                              className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-300 inline-block"
                              title={rNum === 0 ? 'Rodada 0 (Preparação)' : `Rodada ${rNum}`}
                            >
                              R.{rNum}
                            </span>
                          </td>

                          {/* Coluna 2: Dia e Hora */}
                          <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px]">
                            <div className="text-slate-200 font-semibold">{dt.dateStr}</div>
                            <div className="text-slate-400 text-[10px]">{dt.timeStr}</div>
                          </td>

                          {/* Coluna 3: Combatente / Alvo */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {isPassDay ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800/70 inline-flex items-center gap-1">
                                🌅 Passar o dia
                              </span>
                            ) : (
                              <>
                                <div className="font-bold text-slate-200">
                                  {entry.npcName || 'Mesa'}
                                </div>
                                <div className="text-[10px]">
                                  {isPlayerChar ? (
                                    <span className="text-emerald-400 font-semibold">Personagem</span>
                                  ) : (
                                    <span className="text-purple-400 font-semibold">NPC</span>
                                  )}
                                  {entry.playerName ? ` (${entry.playerName})` : ''}
                                </div>
                              </>
                            )}
                          </td>

                          {/* Coluna 4: Tipo */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {isRoll ? (
                              <div className="flex flex-col gap-1 items-start">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800/70 inline-block">
                                  Rolagem
                                </span>
                                {currentUserRole === 'mestre' && (entry.author === 'mestre' || entry.isSecret) && (
                                  <span
                                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${
                                      entry.isSecret
                                        ? 'bg-rose-950/80 text-rose-300 border-rose-700/60'
                                        : 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                                    }`}
                                    title={entry.isSecret ? 'Rolagem Oculta do Mestre' : 'Rolagem Visível para todos'}
                                  >
                                    {entry.isSecret ? '👁️‍🗨️ Oculta' : '👁️ Visível'}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/70 inline-block">
                                Status ({entry.type})
                              </span>
                            )}
                          </td>

                          {/* Coluna 5: Descrição / Efeito */}
                          <td className="py-2.5 px-3 text-slate-300 max-w-sm break-words text-[11px]">
                            <span>{entry.description || '—'}</span>
                            {entry.comment && (
                              <span className="text-amber-300/90 italic font-sans ml-1">
                                ({entry.comment})
                              </span>
                            )}
                          </td>

                          {/* Coluna 6: Ações */}
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            {userCanDelete && onDeleteEntry && (
                              <button
                                type="button"
                                onClick={() => onDeleteEntry(entry.id, entry.npcId, false)}
                                className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Excluir este registro"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Barra de Paginação e Rodapé */}
        <div className="px-4 sm:px-6 py-2.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3 text-xs shrink-0 flex-wrap">
          <div className="text-slate-400 font-mono text-[11px]">
            {filteredLogs.length > 0 ? (
              <>
                Exibindo <span className="text-amber-300 font-bold">{startIdx + 1}</span>–
                <span className="text-amber-300 font-bold">
                  {Math.min(startIdx + effectivePageSize, filteredLogs.length)}
                </span>{' '}
                de <span className="text-amber-300 font-bold">{filteredLogs.length}</span> eventos
              </>
            ) : (
              '0 eventos'
            )}
          </div>

          {pageSize !== -1 && totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none text-slate-200 border border-slate-800 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ChevronLeft size={14} />
                <span className="hidden sm:inline">Anterior</span>
              </button>

              <span className="px-2.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300 font-mono font-bold text-xs">
                Página {safePage} de {totalPages}
              </span>

              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none text-slate-200 border border-slate-800 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span className="hidden sm:inline">Próxima</span>
                <ChevronRight size={14} />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Modal de Confirmação para Limpeza Total */}
      <ConfirmModal
        isOpen={clearConfirmOpen}
        title="Limpar Histórico da Mesa"
        message="Deseja limpar todo o histórico de combate e eventos da mesa de todos os NPCs e Personagens? Esta ação é definitiva e não pode ser desfeita."
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

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};
