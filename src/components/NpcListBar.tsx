import React, { useState } from 'react';
import { NPC, UserRole } from '../types/rpg';
import { NpcAvatar } from './NpcAvatar';
import { getHpStatus, getFpStatus, getCombatManeuver, getConditionDescription } from '../utils/gurps';
import { Eye, EyeOff, Skull, Plus, Minus, Users, Shield, UserPlus, Heart, X } from 'lucide-react';

interface NpcListBarProps {
  npcs: NPC[];
  selectedNpcId: string;
  onSelectNpc: (id: string) => void;
  onAddNewNpc: () => void;
  onAddNewPlayer?: () => void;
  onUpdateNpc?: (id: string, updates: Partial<NPC>) => void;
  currentUserRole?: UserRole;
  currentRound?: number;
  onUpdateRound?: (round: number) => void;
  canControlRound?: boolean;
  isNoCombat?: boolean;
}

export const NpcListBar: React.FC<NpcListBarProps> = ({
  npcs,
  selectedNpcId,
  onSelectNpc,
  onAddNewNpc,
  onAddNewPlayer,
  currentUserRole = 'mestre',
  currentRound = 0,
  onUpdateRound,
  canControlRound,
  isNoCombat = false,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'players' | 'npcs' | 'alive' | 'dead'>('all');

  // Se jogador, exibe apenas os que estão visíveis (personagens são sempre visíveis)
  const rawDisplayedNpcs =
    currentUserRole === 'jogador'
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

  // Ordenação: Personagens primeiro (por Speed decrescente e desempate por nome),
  // seguidos por todos os NPCs (por ordem alfabética de Nome)
  const displayedNpcs = [...filteredNpcs].sort((a, b) => {
    const isPlayerA = a.characterType === 'player';
    const isPlayerB = b.characterType === 'player';

    // Personagens vêm primeiro, NPCs depois
    if (isPlayerA && !isPlayerB) return -1;
    if (!isPlayerA && isPlayerB) return 1;

    // Se ambos forem Personagens: manter ordem por Speed decrescente (e desempate por nome)
    if (isPlayerA && isPlayerB) {
      const speedA = a.basicSpeed ?? 0;
      const speedB = b.basicSpeed ?? 0;
      if (speedB !== speedA) {
        return speedB - speedA;
      }
      return (a.name || '').localeCompare(b.name || '', 'pt-BR');
    }

    // Se ambos forem NPCs: listar por ordem alfabética de Nome
    return (a.name || '').localeCompare(b.name || '', 'pt-BR');
  });

  return (
    <div className="bg-slate-900/95 border-b border-slate-800/80 px-3 py-2 w-full">
      <div className="w-full flex flex-col md:flex-row items-start md:items-center gap-3">
        {/* PAINEL DA ESQUERDA: Filtros em cima e Criação embaixo (economizando espaço horizontal) */}
        <div className="flex flex-col items-start gap-1.5 shrink-0 md:border-r border-slate-800/80 md:pr-3">
          {/* EM CIMA: FILTROS DE VISUALIZAÇÃO */}
          <div className="flex items-center flex-wrap bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 text-xs shadow-inner">
            <button
              type="button"
              onClick={() => setFilterType('all')}
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
              onClick={() => setFilterType('players')}
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
              onClick={() => setFilterType('npcs')}
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
              onClick={() => setFilterType('alive')}
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
              onClick={() => setFilterType('dead')}
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

          {/* EMBAIXO: BOTÕES DE ADIÇÃO / CADASTRO E CONTROLE DE RODADAS */}
          <div className="flex items-center gap-1.5 text-xs w-full flex-wrap">
            {currentUserRole === 'mestre' && (
              <>
                {onAddNewPlayer && (
                  <button
                    onClick={onAddNewPlayer}
                    className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-emerald-800 hover:bg-emerald-700 text-emerald-100 rounded-lg shadow-sm transition-all active:scale-95 whitespace-nowrap border border-emerald-600/50"
                    title="Gerenciar personagens no combate ativo ou cadastrar novo"
                  >
                    <UserPlus size={12} className="text-emerald-300" />
                    <span>+ Personagens</span>
                  </button>
                )}

                <button
                  onClick={onAddNewNpc}
                  disabled={isNoCombat}
                  className={`flex-1 flex items-center justify-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg shadow-sm transition-all whitespace-nowrap border ${
                    isNoCombat
                      ? 'bg-slate-850 text-slate-500 border-slate-750/60 cursor-not-allowed opacity-50'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400/60 active:scale-95'
                  }`}
                  title={isNoCombat ? 'Não é possível cadastrar NPCs no modo "Sem combate"' : 'Adicionar Novo NPC ao combate ativo'}
                >
                  <span>+ NPC</span>
                </button>
              </>
            )}

            {/* Controle de Rodadas (iniciando em 0, com botões aprimorados de menos e mais) */}
            {(() => {
              const canEditRound = canControlRound ?? (currentUserRole === 'mestre');
              return (
                <div
                  className={`flex items-center bg-slate-900 border border-slate-750 rounded-xl p-0.5 shadow-md shadow-slate-950/60 shrink-0 ${
                    canEditRound ? 'ml-auto sm:ml-2' : ''
                  }`}
                >
                  {canEditRound && (
                    <button
                      type="button"
                      disabled={currentRound <= 0}
                      onClick={() => onUpdateRound && onUpdateRound(Math.max(0, currentRound - 1))}
                      className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 hover:border-slate-600 disabled:opacity-25 disabled:cursor-not-allowed transition-all active:scale-90 shadow-xs"
                      title="Diminuir rodada (-1)"
                    >
                      <Minus size={12} strokeWidth={3} />
                    </button>
                  )}

                  <div className="flex items-center gap-1 px-2 py-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none font-sans">
                      Rodada
                    </span>
                    <span className="text-xs font-black text-amber-400 font-mono tracking-wider select-none min-w-[14px] text-center">
                      {currentRound}
                    </span>
                  </div>

                  {canEditRound && (
                    <button
                      type="button"
                      onClick={() => onUpdateRound && onUpdateRound(currentRound + 1)}
                      className="w-6 h-6 flex items-center justify-center rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black border border-amber-400/80 transition-all active:scale-90 shadow-xs"
                      title="Avançar rodada (+1)"
                    >
                      <Plus size={12} strokeWidth={3} />
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* LISTA DE CARDS: Espalha até o final à direita com preenchimento completo */}
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
            <div className="flex flex-wrap items-center gap-2">
              {displayedNpcs.map((npc) => {
                const isSelected = npc.id === selectedNpcId;
                const hpStat = getHpStatus(npc.hpCurrent, npc.hpMax);
                const fpStat = getFpStatus(npc.fpCurrent, npc.fpMax);
                const isPlayerChar = npc.characterType === 'player';
                const isDeadChar = Boolean(npc.isDead);
                const activeManeuver = getCombatManeuver(npc.combatManeuver);

                const hasConditions = Boolean(npc.statusConditions && npc.statusConditions.length > 0);
                const hasCriticalHpFp =
                  currentUserRole === 'mestre'
                    ? Boolean(
                        (hpStat.warningTexts && hpStat.warningTexts.length > 0) ||
                        (fpStat.warningTexts && fpStat.warningTexts.length > 0)
                      )
                    : Boolean(npc.hpCurrent <= npc.hpMax * 0.33 || npc.fpCurrent <= 0);

                const hasAlerts = hasConditions || hasCriticalHpFp;
                const showDeadMarker = isDeadChar;
                const showSpeed = isPlayerChar || currentUserRole === 'mestre';

                // Esquema de cores:
                // Selecionado = Azul
                // Morto = Vermelho
                // Alerta de Condições & Estados Críticos = Amarelo
                // Personagem sem nada = Verde
                // NPC sem nada = Cinza
                let cardColorClasses = '';
                let nameColor = '';

                if (isSelected) {
                  cardColorClasses =
                    'bg-blue-950/40 border-blue-500 ring-2 ring-blue-500 shadow-md shadow-blue-950/60 hover:bg-blue-950/50';
                  nameColor = 'text-white';
                } else if (isDeadChar) {
                  cardColorClasses =
                    'bg-red-950/35 border-red-600 ring-1 ring-red-500/70 hover:bg-red-950/45 shadow-[0_0_8px_rgba(239,68,68,0.25)]';
                  nameColor = 'text-red-400 line-through';
                } else if (hasAlerts) {
                  cardColorClasses =
                    'bg-amber-950/25 border-amber-500 ring-1 ring-amber-400/80 hover:bg-amber-950/35 shadow-[0_0_8px_rgba(245,158,11,0.25)]';
                  nameColor = 'text-amber-200';
                } else if (isPlayerChar) {
                  cardColorClasses =
                    'bg-emerald-950/30 border-emerald-600/70 hover:border-emerald-500 hover:bg-emerald-950/40 shadow-xs';
                  nameColor = 'text-emerald-200';
                } else {
                  cardColorClasses =
                    'bg-slate-950/70 border-slate-750 hover:border-slate-600 hover:bg-slate-850 shadow-xs';
                  nameColor = 'text-slate-200';
                }

                return (
                  <button
                    key={npc.id}
                    onClick={() => onSelectNpc(npc.id)}
                    className={`group relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all border shrink-0 w-[195px] sm:w-[215px] ${cardColorClasses}`}
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
                            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-tighter bg-emerald-950/80 px-1 rounded border border-emerald-800/60">
                              {npc.playerName || 'PC'}
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
                          <div className="flex items-center justify-between text-[10px] font-mono mt-1">
                            <span className={`font-semibold ${npc.hpCurrent <= 0 ? 'text-red-400 font-bold' : 'text-rose-300'}`}>
                              PV {npc.hpCurrent}/{npc.hpMax}
                            </span>
                            <span className="text-cyan-300">
                              FP {npc.fpCurrent}/{npc.fpMax}
                            </span>
                          </div>

                          {/* Linha 3: Barra de Vida Dinâmica */}
                          <div className="w-full bg-slate-900 rounded-full h-1 mt-0.5 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                npc.hpCurrent <= 0
                                  ? 'bg-red-600'
                                  : npc.hpCurrent < npc.hpMax * 0.33
                                  ? 'bg-rose-500'
                                  : npc.hpCurrent < npc.hpMax
                                  ? 'bg-yellow-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{
                                width: `${Math.max(0, Math.min(100, npc.hpMax > 0 ? (npc.hpCurrent / npc.hpMax) * 100 : 0))}%`,
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
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded border truncate max-w-[105px] shadow-xs"
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
      </div>
    </div>
  );
};
