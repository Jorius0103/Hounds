import React, { useState, useMemo } from 'react';
import { Combat, UserRole, NPC } from '../types/rpg';
import { CombatLogCard } from './CombatLogCard';
import { ScrollText, Trash2, Search, X, SlidersHorizontal } from 'lucide-react';

interface GeneralCombatLogProps {
  activeCombat: Combat | undefined;
  additionalCharacters?: NPC[];
  onSelectNpc: (npcId: string) => void;
  selectedNpcId: string;
  currentUserRole: UserRole;
  onClearHistory?: () => void;
  onDeleteEntry?: (entryId: string, npcId?: string) => void;
}

export const GeneralCombatLog: React.FC<GeneralCombatLogProps> = ({
  activeCombat,
  additionalCharacters,
  onSelectNpc,
  selectedNpcId,
  currentUserRole,
  onClearHistory,
  onDeleteEntry,
}) => {
  // Filtro 1: Tipo de Personagem (Todos | Jogadores | NPCs)
  const [characterFilter, setCharacterFilter] = useState<'all' | 'players' | 'npcs'>('all');

  // Filtro 2: Busca Livre
  const [searchTerm, setSearchTerm] = useState('');

  // Collect and sort all logs across all active combat NPCs and Personagens
  const allLogs = useMemo(() => {
    const combinedCharacters = [
      ...(additionalCharacters || []),
      ...(activeCombat?.npcs?.filter((n) => !additionalCharacters?.some((p) => p.id === n.id)) || [])
    ];
    if (combinedCharacters.length === 0) return [];

    const list: any[] = [];
    for (const npc of combinedCharacters) {
      if ((currentUserRole === 'jogador' || currentUserRole === 'visualizador') && npc.isVisibleToPlayer === false) {
        continue;
      }

      for (const entry of npc.history || []) {
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

  // Apply filters
  const filteredLogs = useMemo(() => {
    return allLogs.filter((entry) => {
      // 1. Filtro de Tipo de Personagem
      if (characterFilter === 'players' && entry.npcCharacterType !== 'player') {
        return false;
      }
      if (characterFilter === 'npcs' && entry.npcCharacterType === 'player') {
        return false;
      }

      // 2. Campo de busca livre
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesNpc = entry.npcName?.toLowerCase().includes(query);
        const matchesPlayer = entry.playerName?.toLowerCase().includes(query);
        const matchesDesc = entry.description?.toLowerCase().includes(query);
        const matchesLoc = entry.hitLocation?.toLowerCase().includes(query);
        const matchesItem = entry.itemName?.toLowerCase().includes(query);
        const matchesDmgType = entry.damageType?.toLowerCase().includes(query);
        if (!matchesNpc && !matchesPlayer && !matchesDesc && !matchesLoc && !matchesItem && !matchesDmgType) {
          return false;
        }
      }

      return true;
    });
  }, [allLogs, characterFilter, searchTerm]);

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
                onClick={() => {
                  if (confirm('Deseja limpar todo o histórico de combate de todos os NPCs desta cena?')) {
                    onClearHistory();
                  }
                }}
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
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCharacterFilter('all');
                }}
                className="mt-1 text-xs text-amber-400 hover:underline font-semibold"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          filteredLogs.map((entry) => (
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
                isPlayer={currentUserRole === 'jogador' || currentUserRole === 'visualizador'}
                onDeleteEntry={currentUserRole === 'mestre' ? onDeleteEntry : undefined}
              />
            </div>
          ))
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2 border-t border-slate-800 bg-slate-950/70 text-[10px] text-slate-500 flex items-center justify-between px-3">
        <span>Clique no card para abrir o personagem</span>
        <span className="font-mono text-amber-400/80 font-bold">{activeCombat?.name || 'Combate'}</span>
      </div>
    </div>
  );
};
