import React, { useState, useMemo } from 'react';
import { NPC, ConditionDefinition } from '../types/rpg';
import { NpcAvatar } from './NpcAvatar';
import { getHpStatus, getFpStatus } from '../utils/gurps';
import {
  Shield,
  Swords,
  Heart,
  Zap,
  Search,
  Users,
  Skull,
  EyeOff,
  Plus,
  ArrowRight,
  Activity,
  CheckCircle2,
  X,
  Crosshair,
} from 'lucide-react';

interface HomeOverviewProps {
  characters: NPC[];
  onSelectCharacter: (npcId: string) => void;
  onAddNewPlayer?: () => void;
  onAddNewNpc?: () => void;
  currentUserRole?: string;
  conditions?: ConditionDefinition[];
}

type FilterCategory = 'all' | 'players' | 'npcs' | 'alive' | 'injured' | 'dead';
type SortOption = 'default' | 'name' | 'hp' | 'speed';

export const HomeOverview: React.FC<HomeOverviewProps> = ({
  characters,
  onSelectCharacter,
  onAddNewPlayer,
  onAddNewNpc,
  currentUserRole = 'mestre',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('all');
  const [sortBy, setSortBy] = useState<SortOption>('default');

  // Jogadores só enxergam quem não estiver explicitamente oculto
  const visibleCharacters = useMemo(() => {
    if (currentUserRole === 'jogador') {
      return characters.filter((c) => c.characterType === 'player' || c.isVisibleToPlayer !== false);
    }
    return characters;
  }, [characters, currentUserRole]);

  // Contadores para o painel de estatísticas
  const stats = useMemo(() => {
    const total = visibleCharacters.length;
    const players = visibleCharacters.filter((c) => c.characterType === 'player').length;
    const npcs = visibleCharacters.filter((c) => c.characterType !== 'player').length;
    const dead = visibleCharacters.filter((c) => Boolean(c.isDead)).length;
    const injured = visibleCharacters.filter(
      (c) => !c.isDead && c.hpCurrent < c.hpMax
    ).length;
    const healthy = visibleCharacters.filter(
      (c) => !c.isDead && c.hpCurrent >= c.hpMax
    ).length;

    return { total, players, npcs, dead, injured, healthy };
  }, [visibleCharacters]);

  // Filtragem e ordenação
  const filteredAndSortedCharacters = useMemo(() => {
    let result = visibleCharacters.filter((npc) => {
      // Filtro de texto
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const matchName = npc.name?.toLowerCase().includes(query);
        const matchTitle = npc.title?.toLowerCase().includes(query);
        const matchPlayer = npc.playerName?.toLowerCase().includes(query);
        const matchWeapons = npc.weapons?.some((w) => w.name?.toLowerCase().includes(query));
        if (!matchName && !matchTitle && !matchPlayer && !matchWeapons) {
          return false;
        }
      }

      // Filtro por categoria
      if (categoryFilter === 'players') return npc.characterType === 'player';
      if (categoryFilter === 'npcs') return npc.characterType !== 'player';
      if (categoryFilter === 'alive') return !npc.isDead;
      if (categoryFilter === 'dead') return Boolean(npc.isDead);
      if (categoryFilter === 'injured') return !npc.isDead && npc.hpCurrent < npc.hpMax;

      return true;
    });

    // Ordenação
    return result.sort((a, b) => {
      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '', 'pt-BR');
      }

      if (sortBy === 'hp') {
        const ratioA = a.hpMax > 0 ? a.hpCurrent / a.hpMax : 1;
        const ratioB = b.hpMax > 0 ? b.hpCurrent / b.hpMax : 1;
        return ratioA - ratioB;
      }

      if (sortBy === 'speed') {
        const speedA = a.basicSpeed ?? 0;
        const speedB = b.basicSpeed ?? 0;
        return speedB - speedA;
      }

      // 'default': Personagens primeiro (ordenados por Speed desc), depois NPCs (ordenados por Nome)
      const isPlayerA = a.characterType === 'player';
      const isPlayerB = b.characterType === 'player';

      if (isPlayerA && !isPlayerB) return -1;
      if (!isPlayerA && isPlayerB) return 1;

      if (isPlayerA && isPlayerB) {
        const speedA = a.basicSpeed ?? 0;
        const speedB = b.basicSpeed ?? 0;
        if (speedB !== speedA) return speedB - speedA;
        return (a.name || '').localeCompare(b.name || '', 'pt-BR');
      }

      return (a.name || '').localeCompare(b.name || '', 'pt-BR');
    });
  }, [visibleCharacters, searchTerm, categoryFilter, sortBy]);

  return (
    <div className="w-full space-y-4 pb-12 animate-fadeIn">
      {/* 1. CABEÇALHO & ESTATÍSTICAS RÁPIDAS */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 backdrop-blur shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
              <Swords size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Tela Inicial & Visão Geral
                </h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {visibleCharacters.length} Combatentes
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Visão consolidada com as principais informações de todos os combatentes. Clique em qualquer card para gerenciar a ficha completa.
              </p>
            </div>
          </div>

          {/* Botões de Criação Rápida (para Mestre ou Usuários com Permissão) */}
          {currentUserRole !== 'jogador' && (
            <div className="flex items-center gap-2 shrink-0">
              {onAddNewPlayer && (
                <button
                  type="button"
                  onClick={onAddNewPlayer}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/40 transition-all border border-emerald-500/40"
                >
                  <Plus size={15} />
                  <span>Cadastrar Personagem</span>
                </button>
              )}
              {onAddNewNpc && (
                <button
                  type="button"
                  onClick={onAddNewNpc}
                  className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-amber-950/40 transition-all border border-amber-400/50"
                >
                  <Plus size={15} />
                  <span>Criar NPC</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Métricas e Resumos em Cards Compactos */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3 mt-4 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 sm:p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Shield size={18} />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Personagens</div>
              <div className="text-base sm:text-lg font-black text-white">{stats.players}</div>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 sm:p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Users size={18} />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">NPCs no Combate</div>
              <div className="text-base sm:text-lg font-black text-white">{stats.npcs}</div>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 sm:p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Saudáveis</div>
              <div className="text-base sm:text-lg font-black text-white">{stats.healthy}</div>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 sm:p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Activity size={18} />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Feridos</div>
              <div className="text-base sm:text-lg font-black text-amber-400">{stats.injured}</div>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 sm:p-3 flex items-center gap-3 col-span-2 sm:col-span-1">
            <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Skull size={18} />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Baixas / Mortos</div>
              <div className="text-base sm:text-lg font-black text-rose-400">{stats.dead}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. BARRA DE PESQUISA, FILTROS E ORDENAÇÃO */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Campo de Pesquisa */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por nome, classe, jogador ou armas..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/80 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Botões de Filtros Rápidos */}
        <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto py-0.5">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              categoryFilter === 'all'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'bg-slate-950/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>Todos</span>
            <span className="text-[10px] opacity-80">({visibleCharacters.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter('players')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              categoryFilter === 'players'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-slate-950/80 text-slate-400 hover:text-emerald-300 border border-slate-800'
            }`}
          >
            <Shield size={12} />
            <span>Personagens</span>
            <span className="text-[10px] opacity-80">({stats.players})</span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter('npcs')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              categoryFilter === 'npcs'
                ? 'bg-purple-600 text-white shadow'
                : 'bg-slate-950/80 text-slate-400 hover:text-purple-300 border border-slate-800'
            }`}
          >
            <Users size={12} />
            <span>NPCs</span>
            <span className="text-[10px] opacity-80">({stats.npcs})</span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter('injured')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              categoryFilter === 'injured'
                ? 'bg-amber-600 text-white shadow'
                : 'bg-slate-950/80 text-slate-400 hover:text-amber-300 border border-slate-800'
            }`}
          >
            <Activity size={12} />
            <span>Feridos</span>
            <span className="text-[10px] opacity-80">({stats.injured})</span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter('dead')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              categoryFilter === 'dead'
                ? 'bg-rose-600 text-white shadow'
                : 'bg-slate-950/80 text-slate-400 hover:text-rose-300 border border-slate-800'
            }`}
          >
            <Skull size={12} />
            <span>Mortos</span>
            <span className="text-[10px] opacity-80">({stats.dead})</span>
          </button>
        </div>

        {/* Dropdown de Ordenação */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] text-slate-400 font-medium">Ordenar:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-amber-500 font-medium"
          >
            <option value="default">Padrão (Personagens / Speed)</option>
            <option value="name">Nome (A - Z)</option>
            <option value="hp">Menor Vida % (Urgência)</option>
            <option value="speed">Maior Velocidade Básica</option>
          </select>
        </div>
      </div>

      {/* 3. GRID DE CARDS DOS PERSONAGENS E NPCS */}
      {filteredAndSortedCharacters.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-8 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-xl bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
            <Search size={22} className="text-slate-500" />
          </div>
          <h3 className="text-base font-bold text-white">Nenhum combatente encontrado</h3>
          <p className="text-xs text-slate-400">
            Nenhum combatente corresponde aos filtros ou busca selecionados.
          </p>
          {(searchTerm || categoryFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('all');
              }}
              className="mt-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold rounded-lg transition-colors"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
          {filteredAndSortedCharacters.map((npc) => {
            const isPlayer = npc.characterType === 'player';
            const hpStatus = getHpStatus(npc.hpCurrent, npc.hpMax);
            const fpStatus = getFpStatus(npc.fpCurrent, npc.fpMax);

            // Cálculos percentuais com limites
            const hpPercent = npc.hpMax > 0 ? Math.max(0, Math.min(100, (npc.hpCurrent / npc.hpMax) * 100)) : 0;
            const fpPercent = npc.fpMax > 0 ? Math.max(0, Math.min(100, (npc.fpCurrent / npc.fpMax) * 100)) : 0;

            // Cor da barra de HP
            const hpBarColor =
              npc.isDead
                ? 'bg-rose-600'
                : npc.hpCurrent <= 0
                ? 'bg-red-500'
                : npc.hpCurrent <= Math.ceil(npc.hpMax / 3)
                ? 'bg-amber-500'
                : npc.hpCurrent < npc.hpMax
                ? 'bg-lime-500'
                : 'bg-emerald-500';

            // Armas principais para exibição
            const mainWeapons = (npc.weapons || []).slice(0, 2);

            return (
              <div
                key={npc.id}
                onClick={() => onSelectCharacter(npc.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSelectCharacter(npc.id);
                  }
                }}
                className={`group relative flex flex-col justify-between bg-slate-900/90 hover:bg-slate-850 border rounded-2xl p-4 cursor-pointer transition-all duration-200 shadow-md hover:shadow-xl hover:-translate-y-1 ${
                  npc.isDead
                    ? 'border-rose-900/40 hover:border-rose-600/80 opacity-75'
                    : isPlayer
                    ? 'border-slate-800 hover:border-emerald-500/70 hover:shadow-emerald-950/20'
                    : 'border-slate-800 hover:border-purple-500/70 hover:shadow-purple-950/20'
                }`}
              >
                <div>
                  {/* Linha Superior: Avatar, Identificação e Badges */}
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <NpcAvatar
                        avatar={npc.avatar}
                        preset={npc.avatarPreset}
                        name={npc.name}
                        size="md"
                        className="rounded-xl border border-slate-700 shadow"
                      />
                      {npc.isDead && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center border border-slate-900 shadow">
                          <Skull size={11} />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                          {npc.name}
                        </h3>
                        {/* Tag de Tipo */}
                        <span
                          className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                            isPlayer
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-600/50'
                              : 'bg-purple-950 text-purple-300 border-purple-600/50'
                          }`}
                        >
                          {isPlayer ? 'Personagem' : 'NPC'}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {npc.title || (isPlayer ? 'Personagem Jogador' : 'NPC / Combatente')}
                      </p>

                      {isPlayer && npc.playerName && (
                        <div className="flex items-center gap-1 text-[10px] text-emerald-400/90 font-medium mt-0.5 truncate">
                          <span>Jogador:</span>
                          <span className="font-semibold text-emerald-300">{npc.playerName}</span>
                        </div>
                      )}

                      {/* Badge Oculto para Jogadores (visível para o Mestre) */}
                      {npc.isVisibleToPlayer === false && currentUserRole === 'mestre' && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800/80 px-1.5 py-0.2 rounded border border-slate-700 mt-1">
                          <EyeOff size={10} />
                          <span>Oculto</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Barras de Recursos: PV e PF */}
                  <div className="mt-3.5 space-y-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                    {/* Pontos de Vida (PV) */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-1.5">
                          <Heart size={12} className="text-rose-400" />
                          <span className="text-[11px] font-bold text-slate-300">PV</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-slate-400">
                            {hpStatus.label}
                          </span>
                          <span className="font-mono text-xs font-bold text-white">
                            {npc.hpCurrent} / {npc.hpMax}
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${hpBarColor}`}
                          style={{ width: `${hpPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Pontos de Fadiga (PF) */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-1.5">
                          <Zap size={12} className="text-cyan-400" />
                          <span className="text-[11px] font-bold text-slate-300">PF</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-slate-400">
                            {fpStatus.label}
                          </span>
                          <span className="font-mono text-xs font-bold text-white">
                            {npc.fpCurrent} / {npc.fpMax}
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-cyan-500 transition-all duration-300"
                          style={{ width: `${fpPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Atributos Básicos GURPS: ST, DX, IQ, HT */}
                  <div className="grid grid-cols-4 gap-1.5 mt-3 text-center">
                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg py-1 px-0.5">
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">ST</div>
                      <div className="text-xs font-bold text-white font-mono">{npc.st ?? 10}</div>
                    </div>
                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg py-1 px-0.5">
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">DX</div>
                      <div className="text-xs font-bold text-white font-mono">{npc.dx ?? 10}</div>
                    </div>
                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg py-1 px-0.5">
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">IQ</div>
                      <div className="text-xs font-bold text-white font-mono">{npc.iq ?? 10}</div>
                    </div>
                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg py-1 px-0.5">
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">HT</div>
                      <div className="text-xs font-bold text-white font-mono">{npc.ht ?? 10}</div>
                    </div>
                  </div>

                  {/* Defesas Ativas & Velocidade */}
                  <div className="grid grid-cols-3 gap-1.5 mt-2 text-center text-[10px]">
                    <div className="bg-slate-950/50 border border-slate-800/60 rounded-lg p-1">
                      <span className="text-slate-400 block text-[9px]">Esquiva</span>
                      <span className="font-bold text-amber-300 font-mono text-xs">{npc.dodge ?? '-'}</span>
                    </div>
                    <div className="bg-slate-950/50 border border-slate-800/60 rounded-lg p-1">
                      <span className="text-slate-400 block text-[9px]">Aparar</span>
                      <span className="font-bold text-amber-300 font-mono text-xs">
                        {npc.parries?.[0]?.value ?? '-'}
                      </span>
                    </div>
                    <div className="bg-slate-950/50 border border-slate-800/60 rounded-lg p-1">
                      <span className="text-slate-400 block text-[9px]">Velocidade</span>
                      <span className="font-bold text-slate-200 font-mono text-xs">
                        {npc.basicSpeed ?? '-'}
                      </span>
                    </div>
                  </div>

                  {/* Armas Principais / Ataques */}
                  {mainWeapons.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800/70 space-y-1">
                      <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                        <Crosshair size={11} className="text-amber-400" />
                        <span>Ataques Principais</span>
                      </div>
                      <div className="space-y-1">
                        {mainWeapons.map((w, idx) => (
                          <div
                            key={w.id || idx}
                            className="flex items-center justify-between text-[11px] bg-slate-950/40 px-2 py-0.5 rounded border border-slate-800/40 text-slate-300"
                          >
                            <span className="truncate max-w-[120px] font-medium">{w.name}</span>
                            <div className="flex items-center gap-1.5 font-mono text-[10px] text-amber-300 shrink-0">
                              <span>NH {w.nh}</span>
                              {(w.damage || w.modes?.[0]?.damage) && (
                                <span className="text-slate-400 text-[10px]">
                                  ({w.damage || w.modes?.[0]?.damage})
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Condições Ativas / Manobra */}
                  {(npc.statusConditions?.length > 0 || npc.combatManeuver) && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800/70 flex items-center gap-1 flex-wrap">
                      {npc.combatManeuver && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-950/70 text-blue-300 border border-blue-700/50">
                          {npc.combatManeuver}
                        </span>
                      )}
                      {(npc.statusConditions || []).map((cond, idx) => (
                        <span
                          key={idx}
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-600/50"
                        >
                          {cond}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Rodapé do Card: Ação de Abrir Ficha */}
                <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 group-hover:text-amber-400 font-bold transition-colors">
                  <span className="text-[11px]">Ver Ficha Completa</span>
                  <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
