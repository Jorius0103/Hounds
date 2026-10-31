import React, { useState, useEffect } from 'react';
import { NPC, MesaRole, UserAccount } from '../types/rpg';
import { NpcAvatar } from './NpcAvatar';
import { CombatHomeScreen } from './CombatHomeScreen';
import { getHpStatus, getFpStatus, getCombatManeuver, getConditionDescription, getCrippledBodyParts } from '../utils/gurps';
import { Eye, EyeOff, Skull, Users, Shield, UserPlus, Heart, X, ArrowUpDown, Sun } from 'lucide-react';

interface NpcListBarProps {
  npcs: NPC[];
  selectedNpcId: string;
  onSelectNpc: (id: string) => void;
  onAddNewNpc: () => void;
  onOpenPassDayModal?: () => void;
  canPassDay?: boolean;
  onFilterChange?: (filter: 'all' | 'players' | 'npcs' | 'alive' | 'dead', count: number) => void;
  onUpdateNpc?: (id: string, updates: Partial<NPC>) => void;
  currentUserRole?: MesaRole;
  currentRound?: number;
  onUpdateRound?: (round: number) => void;
  canControlRound?: boolean;
  isNoCombat?: boolean;
  isHomeScreen?: boolean;
  customMasterOrder?: string[];
  onSaveMasterOrder?: (orderIds: string[]) => void;
  onlinePlayerNames?: Set<string>;
  users?: UserAccount[];
}

export const NpcListBar: React.FC<NpcListBarProps> = ({
  npcs,
  selectedNpcId,
  onSelectNpc,
  onAddNewNpc,
  onOpenPassDayModal,
  canPassDay,
  onFilterChange,
  currentUserRole = 'mestre',
  currentRound = 0,
  onUpdateRound,
  canControlRound,
  isNoCombat = false,
  isHomeScreen = false,
  customMasterOrder,
  onSaveMasterOrder,
  onlinePlayerNames,
  users = [],
}) => {
  const [filterType, setFilterType] = useState<'all' | 'players' | 'npcs' | 'alive' | 'dead'>('all');
  const [sortMode, setSortMode] = useState<'speed' | 'alpha' | 'mestre'>(() => {
    try {
      const saved = localStorage.getItem('gurps_combat_sort_mode_v1');
      if (saved === 'alpha' || saved === 'speed' || saved === 'mestre') return saved;
    } catch {}
    return 'speed';
  });

  const [localOrderedIds, setLocalOrderedIds] = useState<string[] | null>(null);
  const [hasUnsavedOrder, setHasUnsavedOrder] = useState<boolean>(false);
  const [savedToast, setSavedToast] = useState<boolean>(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Sincroniza ordem local quando a ordem externa mudar e não houver edições pendentes
  useEffect(() => {
    if (!hasUnsavedOrder) {
      setLocalOrderedIds(customMasterOrder || null);
    }
  }, [customMasterOrder, hasUnsavedOrder]);

  const [, setPresenceTick] = useState<number>(0);
  useEffect(() => {
    const interval = setInterval(() => setPresenceTick((t) => t + 1), 3000);
    const onPresenceUpdate = () => setPresenceTick((t) => t + 1);
    window.addEventListener('hounds_presence_updated', onPresenceUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('hounds_presence_updated', onPresenceUpdate);
    };
  }, []);

  const getPlayerDisplayName = (npc: NPC) => {
    if (npc.userId && users) {
      const u = users.find((x) => x.id === npc.userId);
      if (u) return u.name;
    }
    return npc.playerName || 'PC';
  };

  const isPlayerOnline = (playerName?: string, userId?: string): boolean => {
    let resolvedName = playerName;
    if (userId && users) {
      const u = users.find((x) => x.id === userId);
      if (u) resolvedName = u.name;
    }
    if (!resolvedName || !resolvedName.trim()) return false;
    const pName = resolvedName.trim().toLowerCase();
    const now = Date.now();
    if (onlinePlayerNames && onlinePlayerNames.has(pName)) return true;
    try {
      const saved = localStorage.getItem('hounds_active_user');
      if (saved) {
        const u = JSON.parse(saved);
        if (u?.name && u.name.trim().toLowerCase() === pName) return true;
      }
    } catch (e) {}
    try {
      if (typeof window !== 'undefined') {
        const p = (window as any).parent;
        if (p?.hubUser?.name && p.hubUser.name.trim().toLowerCase() === pName) return true;
        if (p?.hubOnlineUsers && p.hubOnlineUsers[pName] && now - p.hubOnlineUsers[pName] < 35000) return true;
        if (p?.BoardView && typeof p.BoardView.presence === 'function') {
          const pres = p.BoardView.presence();
          if (pres && typeof pres === 'object') {
            for (const k of Object.keys(pres)) {
              const entry = pres[k];
              if (entry?.nm && entry.nm.trim().toLowerCase() === pName && (!entry.t || now - entry.t < 35000)) return true;
            }
          }
        }
        if ((window as any)._houndsOnlineUsers) {
          const last = (window as any)._houndsOnlineUsers[pName];
          if (last && now - last < 35000) return true;
        }
      }
    } catch (e) {}
    return false;
  };

  const handleSelectSortMode = (mode: 'speed' | 'alpha' | 'mestre') => {
    setSortMode(mode);
    try {
      localStorage.setItem('gurps_combat_sort_mode_v1', mode);
    } catch {}

    if (mode === 'mestre') {
      let fresh = customMasterOrder;
      if (!fresh || fresh.length === 0) {
        try {
          const s = localStorage.getItem('gurps_mesa_master_order_v1');
          if (s) {
            const p = JSON.parse(s);
            if (Array.isArray(p) && p.length > 0) fresh = p;
          }
        } catch {}
      }
      if (fresh && fresh.length > 0) {
        setLocalOrderedIds([...fresh]);
      }
    }
  };

  const isMaster = currentUserRole === 'mestre';
  const canDrag = isMaster && sortMode === 'mestre';

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (!canDrag) return;
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, overId: string) => {
    if (!canDrag || !draggedId || draggedId === overId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverId !== overId) {
      setDragOverId(overId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, overId: string) => {
    if (dragOverId === overId) {
      setDragOverId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!canDrag || !draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const currentIds = displayedNpcs.map((n) => n.id);
    const fromIndex = currentIds.indexOf(draggedId);
    const toIndex = currentIds.indexOf(targetId);

    if (fromIndex !== -1 && toIndex !== -1) {
      const newIds = [...currentIds];
      const [moved] = newIds.splice(fromIndex, 1);
      newIds.splice(toIndex, 0, moved);

      // Agrega outros IDs conhecidos fora do filtro atual
      const allKnownIds = rawDisplayedNpcs.map((n) => n.id);
      const fullOrder = Array.from(new Set([...newIds, ...allKnownIds]));

      setLocalOrderedIds(fullOrder);
      setHasUnsavedOrder(true);
    }

    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleSaveOrder = () => {
    const orderToSave = localOrderedIds || displayedNpcs.map((n) => n.id);
    if (onSaveMasterOrder) {
      onSaveMasterOrder(orderToSave);
    }
    setHasUnsavedOrder(false);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  // Se jogador ou visualizador, exibe apenas os que estão visíveis (personagens são sempre visíveis)
  const rawDisplayedNpcs =
    currentUserRole === 'jogador' || currentUserRole === 'visualizador'
      ? npcs.filter((n) => n.characterType === 'player' || n.isVisibleToPlayer !== false)
      : npcs;

  const playersCount = rawDisplayedNpcs.filter((n) => n.characterType === 'player').length;
  const npcsCount = rawDisplayedNpcs.filter((n) => n.characterType !== 'player').length;
  const aliveCount = rawDisplayedNpcs.filter((n) => !n.isDead).length;
  const deadCount = rawDisplayedNpcs.filter((n) => Boolean(n.isDead)).length;

  const filteredNpcs = rawDisplayedNpcs.filter((n) => {
    if (filterType === 'players') return n.characterType === 'player';
    if (filterType === 'npcs') return n.characterType !== 'player';
    if (filterType === 'alive') return !n.isDead;
    if (filterType === 'dead') return Boolean(n.isDead);
    return true;
  });

  useEffect(() => {
    onFilterChange?.(filterType, filteredNpcs.length);
  }, [filterType, filteredNpcs.length, onFilterChange]);

  const handleSelectFilter = (type: 'all' | 'players' | 'npcs' | 'alive' | 'dead') => {
    setFilterType(type);
    const matches = rawDisplayedNpcs.filter((n) => {
      if (type === 'players') return n.characterType === 'player';
      if (type === 'npcs') return n.characterType !== 'player';
      if (type === 'alive') return !n.isDead;
      if (type === 'dead') return Boolean(n.isDead);
      return true;
    });
    if (matches.length > 0 && !matches.some((m) => m.id === selectedNpcId)) {
      onSelectNpc(matches[0].id);
    }
  };

  // Ordenação:
  // 1. Mestre: segue a ordem customizada salva pelo Mestre via drag-and-drop.
  // 2. Speed: decrescente por velocidade básica.
  // 3. A-Z: ordem alfabética.
  const displayedNpcs = [...filteredNpcs].sort((a, b) => {
    const isPlayerA = a.characterType === 'player';
    const isPlayerB = b.characterType === 'player';

    // Ordem Mestre (disponível para todos os usuários)
    if (sortMode === 'mestre') {
      let masterOrder = localOrderedIds || customMasterOrder;
      if (!masterOrder || masterOrder.length === 0) {
        try {
          const s = localStorage.getItem('gurps_mesa_master_order_v1');
          if (s) {
            const p = JSON.parse(s);
            if (Array.isArray(p) && p.length > 0) masterOrder = p;
          }
        } catch {}
      }
      const order = masterOrder || [];
      const idxA = order.indexOf(a.id);
      const idxB = order.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      if (isPlayerA && !isPlayerB) return -1;
      if (!isPlayerA && isPlayerB) return 1;
      return (a.name || '').localeCompare(b.name || '', 'pt-BR');
    }

    if (currentUserRole === 'mestre') {
      if (sortMode === 'alpha') {
        if (isPlayerA && isPlayerB) {
          return (a.name || '').localeCompare(b.name || '', 'pt-BR');
        }
        return (a.name || '').localeCompare(b.name || '', 'pt-BR');
      }
      const speedA = a.basicSpeed ?? 0;
      const speedB = b.basicSpeed ?? 0;
      if (speedB !== speedA) {
        return speedB - speedA;
      }
      return (a.name || '').localeCompare(b.name || '', 'pt-BR');
    }

    // Para Jogadores: Personagens vêm primeiro, NPCs sempre no final
    if (isPlayerA && !isPlayerB) return -1;
    if (!isPlayerA && isPlayerB) return 1;

    // Se ambos forem Personagens: aplica a ordenação escolhida pelo usuário (Speed ou Ordem Alfabética)
    if (isPlayerA && isPlayerB) {
      if (sortMode === 'alpha') {
        return (a.name || '').localeCompare(b.name || '', 'pt-BR');
      }
      const speedA = a.basicSpeed ?? 0;
      const speedB = b.basicSpeed ?? 0;
      if (speedB !== speedA) {
        return speedB - speedA;
      }
      return (a.name || '').localeCompare(b.name || '', 'pt-BR');
    }

    // Se ambos forem NPCs: sempre listados no final por ordem alfabética
    return (a.name || '').localeCompare(b.name || '', 'pt-BR');
  });

  return (
    <div className="bg-slate-900/95 border-b border-slate-800/80 px-3 py-1.5 w-full">
      <div className="w-full flex flex-col items-start gap-2">
        {/* BARRA DO TOPO: Filtros, Ordenação, Botões de Adição e Controle de Rodadas em uma única linha compacta */}
        <div className="w-full flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-800/60">
          {/* ESQUERDA: FILTROS DE VISUALIZAÇÃO + DIV DE ORDENAÇÃO */}
          <div className="flex items-center flex-wrap gap-1.5">
            <div className="flex items-center flex-wrap bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 text-xs shadow-inner">
              <button
                type="button"
                onClick={() => handleSelectFilter('all')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg font-bold transition-all text-[11px] ${
                  filterType === 'all'
                    ? 'bg-slate-800 text-amber-400 shadow-sm border border-amber-500/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Users size={11} />
                <span>Todos ({rawDisplayedNpcs.length})</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectFilter('players')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg font-bold transition-all text-[11px] ${
                  filterType === 'players'
                    ? 'bg-emerald-950 text-emerald-300 shadow-sm border border-emerald-600/70'
                    : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-900'
                }`}
              >
                <Shield size={11} />
                <span>Personagens ({playersCount})</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectFilter('npcs')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg font-bold transition-all text-[11px] ${
                  filterType === 'npcs'
                    ? 'bg-purple-950 text-purple-300 shadow-sm border border-purple-600/70'
                    : 'text-slate-400 hover:text-purple-300 hover:bg-slate-900'
                }`}
              >
                <span>NPCs ({npcsCount})</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectFilter('alive')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg font-bold transition-all text-[11px] ${
                  filterType === 'alive'
                    ? 'bg-teal-950 text-teal-300 shadow-sm border border-teal-600/70'
                    : 'text-slate-400 hover:text-teal-300 hover:bg-slate-900'
                }`}
                title="Filtrar apenas Vivos"
              >
                <Heart size={11} className="text-teal-400" />
                <span>Vivos ({aliveCount})</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectFilter('dead')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg font-bold transition-all text-[11px] ${
                  filterType === 'dead'
                    ? 'bg-red-950 text-red-300 shadow-sm border border-red-600/70'
                    : 'text-slate-400 hover:text-red-300 hover:bg-slate-900'
                }`}
                title="Filtrar apenas Mortos"
              >
                <Skull size={11} className="text-red-400" />
                <span>Mortos ({deadCount})</span>
              </button>
            </div>

            {/* NOVA DIV DE ORDENAÇÃO (fora da div de filtros) */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 text-xs shadow-inner flex-wrap">
              <span className="flex items-center text-slate-400 px-1.5 select-none" title="Ordenação">
                <ArrowUpDown size={13} strokeWidth={2.2} />
              </span>
              <button
                type="button"
                onClick={() => handleSelectSortMode('speed')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg font-bold transition-all text-[11px] cursor-pointer ${
                  sortMode === 'speed'
                    ? 'bg-amber-950/90 text-amber-300 shadow-sm border border-amber-500/50'
                    : 'text-slate-400 hover:text-amber-300 hover:bg-slate-900'
                }`}
                title="Ordenar Personagens por Speed (decrescente)"
              >
                <span>⚡ Speed</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectSortMode('alpha')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg font-bold transition-all text-[11px] cursor-pointer ${
                  sortMode === 'alpha'
                    ? 'bg-sky-950/90 text-sky-300 shadow-sm border border-sky-500/50'
                    : 'text-slate-400 hover:text-sky-300 hover:bg-slate-900'
                }`}
                title="Ordenar Personagens por Ordem Alfabética (A-Z)"
              >
                <span>🔤 A-Z</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleSelectSortMode('mestre');
                  let fresh = customMasterOrder;
                  if (!fresh || fresh.length === 0) {
                    try {
                      const s = localStorage.getItem('gurps_mesa_master_order_v1');
                      if (s) {
                        const p = JSON.parse(s);
                        if (Array.isArray(p) && p.length > 0) fresh = p;
                      }
                    } catch {}
                  }
                  if (fresh && fresh.length > 0) {
                    setLocalOrderedIds([...fresh]);
                  }
                }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg font-bold transition-all text-[11px] cursor-pointer ${
                  sortMode === 'mestre'
                    ? 'bg-purple-950/90 text-purple-300 shadow-sm border border-purple-500/50'
                    : 'text-slate-400 hover:text-purple-300 hover:bg-slate-900'
                }`}
                title="Ordem definida pelo Mestre (clique para atualizar a ordem instantaneamente)"
              >
                <span>👑 Mestre</span>
              </button>

              {/* Botão de Salvar a Ordem do Mestre */}
              {isMaster && sortMode === 'mestre' && (
                <button
                  type="button"
                  onClick={handleSaveOrder}
                  className={`flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-bold transition-all text-[11px] shadow-sm ml-1 cursor-pointer ${
                    savedToast
                      ? 'bg-emerald-600 text-white border border-emerald-400'
                      : hasUnsavedOrder
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 ring-2 ring-amber-300'
                      : 'bg-purple-900/80 hover:bg-purple-800 text-purple-200 border border-purple-500/60'
                  }`}
                  title="Salvar esta ordem para todos os usuários"
                >
                  <span>{savedToast ? '✓ Ordem Salva!' : hasUnsavedOrder ? 'Salvar Ordem *' : 'Salvar Ordem'}</span>
                </button>
              )}
            </div>
          </div>

          {/* DIREITA (da direita p/ esquerda): Personagens, Rodadas e + NPC. Sem combate: oculta + NPC e Rodadas */}
          <div className="flex items-center justify-end gap-2 text-xs flex-wrap ml-auto">
            {currentUserRole === 'mestre' && !isNoCombat && (
              <button
                onClick={onAddNewNpc}
                className="flex items-center justify-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg shadow-sm transition-all whitespace-nowrap border bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400/60 active:scale-95"
                title="Adicionar Novo NPC ao combate ativo"
              >
                <span>+ NPC</span>
              </button>
            )}

            {/* Controle de Rodadas e Passar o Dia alinhados horizontalmente */}
            <div className="flex items-center gap-2 shrink-0">
              {!isNoCombat && (() => {
                const canEditRound = canControlRound ?? (currentUserRole === 'mestre');
                return (
                  <div className="flex items-center h-7 bg-slate-900 border border-slate-750 rounded-xl p-0.5 shadow-md shadow-slate-950/60 shrink-0">
                    {canEditRound && (
                      <button
                        type="button"
                        disabled={currentRound <= 0}
                        onClick={() => onUpdateRound && onUpdateRound(Math.max(0, currentRound - 1))}
                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-900 border border-slate-750 text-slate-300 hover:text-white hover:border-slate-600 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-sm transition-all active:scale-95"
                        title="Diminuir Rodada"
                      >
                        −
                      </button>
                    )}

                    <span className="text-xs font-black text-amber-400 font-mono tracking-wider px-2 select-none whitespace-nowrap">
                      RODADA {currentRound}
                    </span>

                    {canEditRound && (
                      <button
                        type="button"
                        onClick={() => onUpdateRound && onUpdateRound(currentRound + 1)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-900 border border-slate-750 text-slate-300 hover:text-white hover:border-slate-600 font-bold text-sm transition-all active:scale-95"
                        title="Avançar Rodada"
                      >
                        +
                      </button>
                    )}
                  </div>
                );
              })()}

              {(currentUserRole === 'mestre' || canPassDay) && onOpenPassDayModal && (
                <button
                  type="button"
                  onClick={onOpenPassDayModal}
                  className="flex items-center justify-center gap-1.5 px-2.5 h-7 text-[11px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-xl shadow-sm transition-all active:scale-95 whitespace-nowrap border border-amber-500/50 cursor-pointer shrink-0"
                  title="Passar o dia na Mesa de RPG"
                >
                  <Sun size={12} className="text-amber-400" />
                  <span>Passar o dia</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* LISTA DE CARDS: Na Tela Inicial exibe os cards detalhados (3 por linha); na ficha exibe os cards compactos (9 por linha) */}
        {isHomeScreen ? (
          <CombatHomeScreen
            npcs={displayedNpcs}
            onSelectNpc={onSelectNpc}
            currentUserRole={currentUserRole}
            currentRound={currentRound}
            filterType={filterType}
            users={users}
            onlinePlayerNames={onlinePlayerNames}
          />
        ) : (
        <div className="flex-1 min-w-0 w-full overflow-x-auto py-0.5 scrollbar-thin">
          {displayedNpcs.length === 0 ? (
            <div className="py-2.5 text-xs text-slate-400 italic">
              {currentUserRole === 'jogador'
                ? 'Nenhum personagem ou NPC visível no momento.'
                : filterType === 'players'
                ? 'Nenhum Personagem cadastrado. Clique em "+ Personagens" à esquerda.'
                : filterType === 'npcs'
                ? 'Nenhum NPC cadastrado. Clique em "+ NPC" à esquerda.'
                : filterType === 'alive'
                ? 'Nenhum combatente vivo no momento.'
                : filterType === 'dead'
                ? 'Nenhum combatente morto no momento.'
                : 'Nenhum registro encontrado neste filtro.'}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5" style={{ gap: '6px' }}>
              {displayedNpcs.map((npc) => {
                const isSelected = npc.id === selectedNpcId;
                const hpStat = getHpStatus(npc.hpCurrent, npc.hpMax);
                const fpStat = getFpStatus(npc.fpCurrent, npc.fpMax);
                const isPlayerChar = npc.characterType === 'player';
                const isDeadChar = Boolean(npc.isDead);
                const activeManeuver = getCombatManeuver(npc.combatManeuver);

                const hasConditions = Boolean(npc.statusConditions && npc.statusConditions.length > 0);
                const isPlayerRole = currentUserRole === 'jogador';
                const hpWarnsFiltered = (hpStat.warningTexts || (hpStat.warningText ? [hpStat.warningText] : [])).filter(
                  (w) => !(isPlayerRole && !isPlayerChar && w.includes('Teste de morte (HT) a cada múltiplo'))
                );
                const hasCriticalHpFp = Boolean(
                  hpWarnsFiltered.length > 0 ||
                  (fpStat.warningTexts && fpStat.warningTexts.length > 0)
                );
                const hasCrippledParts =
                  (isPlayerChar || currentUserRole === 'mestre')
                    ? getCrippledBodyParts(npc).length > 0
                    : false;

                const hasAlerts = hasConditions || hasCriticalHpFp || hasCrippledParts;
                const showDeadMarker = isDeadChar;
                const showSpeed = isPlayerChar || currentUserRole === 'mestre';

                // Esquema de cores (Borda única e limpa de 2px, sem rings ou bordas duplas):
                // Selecionado = Azul
                // Morto = Vermelho
                // Alerta de Condições & Estados Críticos = Amarelo
                // Personagem sem nada = Verde
                // NPC sem nada = Cinza
                let cardColorClasses = '';
                let nameColor = '';

                if (isSelected) {
                  cardColorClasses =
                    'bg-blue-950/60 border-blue-500 text-blue-100 shadow-md shadow-blue-950/50 outline-none';
                  nameColor = 'text-blue-100 font-black';
                } else if (isDeadChar) {
                  cardColorClasses =
                    'bg-red-950/35 border-red-600 hover:bg-red-950/45 text-red-200';
                  nameColor = 'text-red-400 line-through';
                } else if (hasAlerts) {
                  cardColorClasses =
                    'bg-amber-950/25 border-amber-400 hover:bg-amber-950/35 text-amber-200';
                  nameColor = 'text-amber-200';
                } else {
                  cardColorClasses =
                    'bg-emerald-950/25 border-emerald-700/80 hover:border-emerald-500 hover:bg-emerald-950/35 text-emerald-200';
                  nameColor = 'text-emerald-200';
                }

                return (
                  <button
                    key={npc.id}
                    onClick={() => onSelectNpc(npc.id)}
                    draggable={canDrag}
                    onDragStart={(e) => handleDragStart(e, npc.id)}
                    onDragOver={(e) => handleDragOver(e, npc.id)}
                    onDragLeave={(e) => handleDragLeave(e, npc.id)}
                    onDrop={(e) => handleDrop(e, npc.id)}
                    onDragEnd={handleDragEnd}
                    style={{
                      borderWidth: '2px',
                      borderStyle: 'solid',
                      outline: 'none',
                      borderColor: isSelected
                        ? '#3b82f6'
                        : isDeadChar
                        ? '#dc2626'
                        : hasAlerts
                        ? '#f59e0b'
                        : '#059669',
                      boxShadow: isSelected ? '0 0 10px rgba(59, 130, 246, 0.45)' : undefined,
                      background: isSelected
                        ? 'linear-gradient(135deg, rgba(30, 58, 138, 0.50) 0%, rgba(15, 23, 42, 0.95) 100%)'
                        : isDeadChar
                        ? 'rgba(69, 10, 10, 0.35)'
                        : hasAlerts
                        ? 'linear-gradient(135deg, rgba(120, 53, 15, 0.25) 0%, rgba(15, 23, 42, 0.95) 100%)'
                        : 'linear-gradient(135deg, rgba(6, 78, 59, 0.22) 0%, rgba(15, 23, 42, 0.96) 100%)',
                      width: 'calc((100% - 50px) / 9)',
                      minWidth: '150px',
                    }}
                    className={`group relative flex items-center gap-2 px-2 py-1.5 rounded-xl text-left transition-all border-2 shrink-0 outline-none focus:outline-none ${cardColorClasses} ${
                      canDrag ? 'cursor-grab active:cursor-grabbing hover:brightness-110' : 'cursor-pointer'
                    } ${draggedId === npc.id ? 'opacity-35 scale-95' : ''} ${
                      dragOverId === npc.id ? 'ring-2 ring-purple-400 border-purple-400 bg-purple-950/60 shadow-lg' : ''
                    }`}
                    title={`${npc.name || 'Personagem'} (${isPlayerChar ? 'Personagem' : 'NPC'}${
                      showSpeed ? ` | Speed: ${npc.basicSpeed ?? 0}` : ''
                    }${isDeadChar ? ' | MORTO' : ''}${
                      npc.statusConditions && npc.statusConditions.length > 0
                        ? `\nCondições: ${npc.statusConditions.map((c) => `${c} (${getConditionDescription(c)})`).join('; ')}`
                        : ''
                    })`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <NpcAvatar
                        avatar={npc.avatar}
                        preset={npc.avatarPreset}
                        name={npc.name || 'NPC'}
                        size="sm"
                      />
                      {showDeadMarker && (
                        <div
                          className="absolute inset-0 bg-red-950/75 rounded-full flex items-center justify-center border border-red-600/90 shadow-inner z-10"
                          title="Morto"
                        >
                          <X size={18} className="text-red-400 stroke-[3.5]" />
                        </div>
                      )}
                      {showDeadMarker && (
                        <div className="absolute -bottom-1 -right-1 bg-red-950 border border-red-600 rounded-full p-0.5 text-red-400 z-20 shadow-xs">
                          <Skull size={10} />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Linha 1: Nome do Personagem + Identificação */}
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-xs font-bold truncate ${nameColor}`}
                          title={npc.name || '(Sem Nome)'}
                        >
                          {npc.name || '(Sem Nome)'}
                        </span>

                        <div className="flex items-center gap-1 shrink-0">
                          {showDeadMarker && (
                            <span className="text-[9px] font-black text-red-300 bg-red-950/90 px-1 py-0.5 rounded border border-red-700/80 flex items-center gap-0.5 shadow-xs">
                              <X size={9} className="stroke-[3.5] text-red-400" />
                              <span>MORTO</span>
                            </span>
                          )}

                          {isPlayerChar ? (
                            <span
                              title={`Jogador: ${getPlayerDisplayName(npc)} (${isPlayerOnline(npc.playerName, npc.userId) ? 'Online' : 'Offline'})`}
                              className={`text-[9px] font-bold uppercase tracking-tighter shrink-0 px-1 rounded border ${
                                isPlayerOnline(npc.playerName, npc.userId)
                                  ? 'text-emerald-400 bg-emerald-950/80 border-emerald-800/60'
                                  : 'text-slate-400 bg-slate-800/80 border-slate-700/60'
                              }`}
                            >
                              {getPlayerDisplayName(npc)}
                            </span>
                          ) : (
                            <div className="flex items-center gap-1">
                              {currentUserRole === 'mestre' && (
                                <span
                                  title={npc.isVisibleToPlayer ? 'Visível para Jogadores' : 'Oculto para Jogadores'}
                                  className={npc.isVisibleToPlayer ? 'text-blue-400' : 'text-slate-500'}
                                >
                                  {npc.isVisibleToPlayer ? <Eye size={11} /> : <EyeOff size={11} />}
                                </span>
                              )}
                              <span className="text-[9px] font-bold text-purple-400 uppercase tracking-tighter bg-purple-950/80 px-1 rounded border border-purple-800/60">
                                NPC
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Linha 2 & 3: PV e FP com barras (visíveis apenas para Personagens ou para o Mestre) */}
                      {(isPlayerChar || currentUserRole === 'mestre') && (
                        <>
                                                    <div className="flex items-center justify-between text-[10px] font-mono mt-1 px-0.5">
                            <span className="font-semibold flex items-center gap-1.5">
                              <span className="text-emerald-400 font-bold tracking-wide">PV</span>
                              <span className="text-emerald-400 font-bold">{npc.hpCurrent} / {npc.hpMax}</span>
                            </span>
                            <span className="text-cyan-300 flex items-center gap-1.5">
                              <span className="text-cyan-400 font-bold tracking-wide">FP</span>
                              <span className="font-semibold">{npc.fpCurrent} / {npc.fpMax}</span>
                            </span>
                          </div>

                          {/* Linha 3: Barra de Vida Dinâmica (Verde) */}
                          <div className="w-full bg-slate-900 rounded-full h-1 mt-0.5 overflow-hidden" title={`PV: ${npc.hpCurrent}/${npc.hpMax}`}>
                            <div
                              className="h-full bg-emerald-500 transition-all duration-300"
                              style={{
                                width: `${Math.max(0, Math.min(100, npc.hpMax > 0 ? (npc.hpCurrent / npc.hpMax) * 100 : 0))}%`,
                              }}
                            />
                          </div>

                          {/* Linha 3b: Barra azul abaixo da verde de PV indicando a fadiga */}
                          <div className="w-full bg-slate-900 rounded-full h-1 mt-0.5 overflow-hidden" title={`Fadiga (FP): ${npc.fpCurrent}/${npc.fpMax}`}>
                            <div
                              className="h-full bg-cyan-500 transition-all duration-300"
                              style={{
                                width: `${Math.max(0, Math.min(100, npc.fpMax > 0 ? (npc.fpCurrent / npc.fpMax) * 100 : 0))}%`,
                              }}
                            />
                          </div>
                        </>
                      )}

                      {/* Linha 4: Speed à esquerda, Manobra de Combate estática à direita (sem contador de condições e sem dropdown) */}
                      <div className="flex items-center justify-between text-[9px] text-slate-400 mt-1 min-h-[18px]">
                        <div className="flex items-center gap-1 font-mono">
                          {showSpeed ? (
                            <span title="Basic Speed">Spd {npc.basicSpeed ?? 0}</span>
                          ) : (
                            <span className="text-[8px] text-slate-600 select-none">NPC</span>
                          )}
                        </div>

                        {/* Manobra de Combate estática (apenas o nome da manobra e sua cor cadastrada) */}
                        {activeManeuver ? (
                          <span
                            style={{
                              backgroundColor: activeManeuver.bgHex,
                              color: activeManeuver.textHex,
                              borderColor: activeManeuver.borderHex,
                            }}
                            className="text-[9px] font-bold px-1 py-0.5 rounded border truncate max-w-[80px] shadow-xs"
                            title={`Manobra de Combate: ${activeManeuver.name}`}
                          >
                            {activeManeuver.name}
                          </span>
                        ) : (
                          <span className="text-[8px] text-slate-600 italic">
                            Sem manobra
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
};

