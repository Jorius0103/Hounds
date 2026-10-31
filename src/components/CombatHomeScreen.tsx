import React, { useState, useEffect } from 'react';
import {
  Heart,
  Zap,
  Shield,
  Sparkles,
  Footprints,
  AlertTriangle,
  Skull,
  Eye,
  EyeOff,
  Users,
  Target,
  Star,
  Package,
  Sword,
} from 'lucide-react';
import { NPC, MesaRole, UserAccount } from '../types/rpg';
import {
  getHpStatus,
  getFpStatus,
  getCombatManeuver,
  getConditionDescription,
  getCrippledBodyParts,
  DEFAULT_TURN_ACTIONS,
} from '../utils/gurps';
import { NpcAvatar } from './NpcAvatar';

interface CombatHomeScreenProps {
  npcs: NPC[];
  onSelectNpc: (id: string) => void;
  currentUserRole?: MesaRole;
  currentRound?: number;
  filterType?: string;
  filterEmptyMessage?: string;
  onlinePlayerNames?: Set<string>;
  users?: UserAccount[];
}

function getItemIcon(name: string, category?: string) {
  const cat = (category || '').toLowerCase();
  if (cat === 'mana' || cat === 'mana_stone') return <Sparkles size={11} className="text-cyan-400 shrink-0" />;
  if (cat === 'shield') return <Shield size={11} className="text-emerald-400 shrink-0" />;
  if (cat === 'arrows' || cat === 'arrow') return <Target size={11} className="text-amber-400 shrink-0" />;
  if (cat === 'other') return <Package size={11} className="text-slate-400 shrink-0" />;

  const lower = (name || '').toLowerCase();
  if (lower.includes('mana') || lower.includes('pedra') || lower.includes('energia')) {
    return <Sparkles size={11} className="text-cyan-400 shrink-0" />;
  }
  if (lower.includes('flecha') || lower.includes('arco') || lower.includes('muni') || lower.includes('tiro')) {
    return <Target size={11} className="text-amber-400 shrink-0" />;
  }
  if (lower.includes('escudo') || lower.includes('shield') || lower.includes('defesa')) {
    return <Shield size={11} className="text-emerald-400 shrink-0" />;
  }
  return <Package size={11} className="text-slate-400 shrink-0" />;
}

export const CombatHomeScreen: React.FC<CombatHomeScreenProps> = ({
  npcs,
  onSelectNpc,
  currentUserRole = 'mestre',
  currentRound = 0,
  filterEmptyMessage = 'Nenhum personagem ou NPC encontrado neste filtro.',
  onlinePlayerNames,
  users = [],
}) => {
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
    return npc.playerName || '';
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

  const isMaster = currentUserRole === 'mestre';

  if (npcs.length === 0) {
    return (
      <div className="w-full py-8 text-center text-xs text-slate-400 italic bg-slate-950/60 border border-slate-800/80 rounded-xl">
        {filterEmptyMessage}
      </div>
    );
  }

  return (
    <div className="w-full pt-0.5 pb-3">
      <div className="combat-home-grid">
        {npcs.map((npc) => {
          const isPlayerChar = npc.characterType === 'player';
          const isDead = Boolean(npc.isDead);
          const showDetailedStats = isMaster || isPlayerChar;

          const hpStatus = getHpStatus(npc.hpCurrent, npc.hpMax);
          const fpStatus = getFpStatus(npc.fpCurrent, npc.fpMax);
          const maneuver = getCombatManeuver(npc.combatManeuver);

          // Recursos e Equipamentos Favoritados (listados individualmente, sem somar pedras)
          const favoriteItems = (npc.extraItems || []).filter((it) => it && it.isFavorite);
          const hasFavoriteItems = favoriteItems.length > 0;

          // Defesas Ativas
          const parryList =
            npc.parries && npc.parries.length > 0
              ? npc.parries
              : [{ id: 'parry-default', weaponName: '', parryType: '', value: 0, notes: '' }];
          const parry1 = parryList[0];
          const parry2 = parryList.length > 1 ? parryList[1] : null;
          const hasDefenses =
            (npc.dodge ?? 0) > 0 || (npc.block ?? 0) > 0 || parryList.some((p) => (p.value ?? 0) > 0);

          // Magias Ativas e Sob Efeito
          const activeSpells = npc.activeSpells || [];
          const affectedSpells = npc.affectedSpells || [];
          const hasSpells = activeSpells.length > 0 || affectedSpells.length > 0;

          // Observações gerais (compartilhadas) e do Mestre (confidenciais, só para o Mestre)
          const generalNotes = ((npc.assistantNotes || '').trim() || ((npc as any).notes || '').trim()) as string;
          const masterNotes = (isMaster && (npc.masterNotes || '').trim()) || '';

          // Armas favoritadas na ficha
          const favoriteWeapons = (npc.weapons || []).filter((wp) => wp && wp.isFavorite);

          // Alertas de Defesas & Ações do Turno
          const ta = npc.turnActions || DEFAULT_TURN_ACTIONS;
          const turnAlerts: {
            id: string;
            text: string;
            badgeClass: string;
            icon?: React.ComponentType<{ size?: number; className?: string }>;
          }[] = [];

          if (ta.parryCount > 0) {
            turnAlerts.push({
              id: 'parry',
              text: `Aparou: ${ta.parryCount}x${ta.parryCount > 1 ? ` (-${(ta.parryCount - 1) * 4})` : ''}`,
              badgeClass: 'bg-amber-950/80 border-amber-500 text-amber-300 font-semibold',
              icon: Shield,
            });
          }
          if (ta.dodgeCount > 0) {
            turnAlerts.push({
              id: 'dodge',
              text: `Esquivou: ${ta.dodgeCount}x`,
              badgeClass: 'bg-cyan-950/80 border-cyan-500 text-cyan-300 font-semibold',
              icon: Footprints,
            });
          }
          if (ta.blockCount > 0) {
            turnAlerts.push({
              id: 'block',
              text: `Bloqueou: ${ta.blockCount}x`,
              badgeClass: 'bg-emerald-950/80 border-emerald-500 text-emerald-300 font-semibold',
              icon: Shield,
            });
          }
          if (ta.usedRetreat) {
            turnAlerts.push({
              id: 'retreat',
              text: 'Recuou',
              badgeClass: 'bg-blue-950/80 border-blue-500 text-blue-300 font-semibold',
              icon: Footprints,
            });
          }
          if (ta.usedFatigueThisTurn) {
            turnAlerts.push({
              id: 'used-fp',
              text: 'Usou Fadiga',
              badgeClass: 'bg-orange-950/80 border-orange-500 text-orange-300 font-semibold',
              icon: Zap,
            });
          }
          if (ta.shock > 0) {
            turnAlerts.push({
              id: 'shock',
              text: `Choque: -${ta.shock}`,
              badgeClass: 'bg-rose-950 border-rose-500 text-rose-300 font-black animate-pulse',
              icon: AlertTriangle,
            });
          }

          // Alertas críticos complementares (Morto, PV/FP, Membros inutilizados, Condições)
          // Refletem para todos (Mestre e Jogadores) em ambas as visões
          const criticalAlerts: {
            id: string;
            text: string;
            badgeClass: string;
            tooltip?: string;
            icon?: React.ComponentType<{ size?: number; className?: string }>;
          }[] = [];

          if (isDead) {
            criticalAlerts.push({
              id: 'dead',
              text: isPlayerChar ? 'Personagem Morto' : 'NPC Morto / Abatido',
              badgeClass: 'bg-red-950/90 border-red-600 text-red-200 font-black',
              icon: Skull,
            });
          }

          const hpWarns =
            hpStatus.warningTexts && hpStatus.warningTexts.length > 0
              ? hpStatus.warningTexts
              : hpStatus.warningText
              ? [hpStatus.warningText]
              : [];
          const isPlayerRole = currentUserRole === 'jogador';
          hpWarns.forEach((w, ix) => {
            if (isPlayerRole && !isPlayerChar && w.includes('Teste de morte (HT) a cada múltiplo')) {
              return;
            }
            criticalAlerts.push({
              id: `hp-warn-${ix}`,
              text: `PV: ${w}`,
              badgeClass: 'bg-red-950/90 border-red-600 text-red-300 font-bold',
              icon: AlertTriangle,
            });
          });

          const fpWarns =
            fpStatus.warningTexts && fpStatus.warningTexts.length > 0
              ? fpStatus.warningTexts
              : fpStatus.warningText
              ? [fpStatus.warningText]
              : [];
          fpWarns.forEach((w, ix) => {
            criticalAlerts.push({
              id: `fp-warn-${ix}`,
              text: `FP: ${w}`,
              badgeClass: 'bg-cyan-950/90 border-cyan-600 text-cyan-300 font-bold',
              icon: Zap,
            });
          });

          getCrippledBodyParts(npc).forEach((p) => {
            criticalAlerts.push({
              id: `crippled-${p.part.key}`,
              text: `${p.part.name}: ${p.statusLabel || 'Inutilizado'}`,
              badgeClass: p.badgeClass || 'bg-rose-950/90 border-rose-600 text-rose-300 font-bold',
              tooltip: `${p.part.name} ${p.statusLabel || 'Inutilizado'}: Dano acumulado (${p.effectiveDmg}) atingiu o limiar da vida da parte (${p.maxHp} PV)!`,
              icon: AlertTriangle,
            });
          });

          if (npc.statusConditions && npc.statusConditions.length > 0) {
            npc.statusConditions.forEach((cond) => {
              criticalAlerts.push({
                id: `cond-${cond}`,
                text: cond,
                badgeClass: 'bg-purple-950/80 border-purple-500 text-purple-200 font-semibold',
                tooltip: `${cond}: ${getConditionDescription(cond)}`,
              });
            });
          }

          const hasWarning = isDead || criticalAlerts.length > 0;
          const hasAlerts =
            turnAlerts.length > 0 || criticalAlerts.length > 0 || Boolean(ta.notes && ta.notes.trim() !== '');

          return (
            <div
              key={npc.id}
              onClick={() => onSelectNpc(npc.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectNpc(npc.id);
                }
              }}
              style={{
                borderColor: isDead
                  ? '#dc2626'
                  : hasWarning
                  ? '#f59e0b'
                  : isPlayerChar
                  ? '#059669'
                  : '#7c3aed',
                background: isDead
                  ? 'rgba(69, 10, 10, 0.35)'
                  : hasWarning
                  ? 'linear-gradient(135deg, rgba(120, 53, 15, 0.25) 0%, rgba(15, 23, 42, 0.95) 100%)'
                  : isPlayerChar
                  ? 'linear-gradient(135deg, rgba(6, 78, 59, 0.22) 0%, rgba(15, 23, 42, 0.96) 60%, rgba(2, 6, 23, 0.98) 100%)'
                  : 'linear-gradient(135deg, rgba(88, 28, 135, 0.22) 0%, rgba(15, 23, 42, 0.96) 60%, rgba(2, 6, 23, 0.98) 100%)',
                boxShadow: isDead
                  ? '0 4px 14px -2px rgba(220, 38, 38, 0.15)'
                  : isPlayerChar
                  ? '0 4px 14px -2px rgba(16, 185, 129, 0.15)'
                  : '0 4px 14px -2px rgba(168, 85, 247, 0.15)',
              }}
              className={`group relative flex flex-col rounded-xl p-2.5 text-left transition-all cursor-pointer border-2 shadow-md hover:shadow-lg space-y-1.5 ${
                isDead
                  ? 'border-red-600/80 hover:border-red-500'
                  : hasWarning
                  ? 'border-amber-500/70 hover:border-amber-400'
                  : isPlayerChar
                  ? 'border-emerald-700/80 hover:border-emerald-500 hover:brightness-105'
                  : 'border-purple-700/80 hover:border-purple-500 hover:brightness-105'
              }`}
            >
              {/* CABEÇALHO COMPACTO */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative shrink-0">
                    <NpcAvatar
                      avatar={npc.avatar}
                      preset={npc.avatarPreset}
                      name={npc.name || 'NPC'}
                      size="sm"
                    />
                    {isDead && (
                      <div
                        className="absolute inset-0 bg-red-950/80 rounded-xl flex items-center justify-center border border-red-600 z-10"
                        title="Morto"
                      >
                        <span className="text-red-400 font-black text-sm">✕</span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-1.5 min-w-0">
                      <h3
                        className={`text-base font-black truncate leading-tight ${
                          isDead
                            ? 'text-red-400 line-through'
                            : isPlayerChar
                            ? 'text-emerald-200'
                            : 'text-white'
                        }`}
                        title={npc.name || '(Sem Nome)'}
                      >
                        {npc.name || '(Sem Nome)'}
                      </h3>
                    </div>
                    {/* Jogador abaixo do nome do personagem, junto dos selos */}
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      {isPlayerChar && (getPlayerDisplayName(npc) || npc.playerName) && (
                        <span
                          title={`Jogador: ${getPlayerDisplayName(npc)} (${isPlayerOnline(npc.playerName, npc.userId) ? 'Online' : 'Offline'})`}
                          className={`text-[10px] font-bold uppercase tracking-tighter shrink-0 px-1.5 py-0.5 rounded border ${
                            isPlayerOnline(npc.playerName, npc.userId)
                              ? 'text-emerald-400 bg-emerald-950/80 border-emerald-800/60'
                              : 'text-slate-400 bg-slate-800/80 border-slate-700/60'
                          }`}
                        >
                          {getPlayerDisplayName(npc)}
                        </span>
                      )}
                      {!isPlayerChar && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-300 bg-purple-950/80 px-1.5 py-0.2 rounded border border-purple-700/60">
                          <Users size={10} className="text-purple-400" />
                          NPC
                        </span>
                      )}
                      {!isPlayerChar && isMaster && (
                        <span
                          title={npc.isVisibleToPlayer ? 'Visível para Jogadores' : 'Oculto para Jogadores'}
                          className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1 py-0.2 rounded border ${
                            npc.isVisibleToPlayer
                              ? 'bg-blue-950/70 border-blue-700/60 text-blue-300'
                              : 'bg-slate-950 border-slate-800 text-slate-500'
                          }`}
                        >
                          {npc.isVisibleToPlayer ? <Eye size={10} /> : <EyeOff size={10} />}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* CENTRO DO CABEÇALHO: PV E FP COM BARRAS */}
                {showDetailedStats && (
                  <div
                    className="flex flex-col shrink-0 bg-slate-950/80 border border-slate-800/80 rounded-lg px-2.5 py-1"
                    style={{ minWidth: '155px' }}
                  >
                    {/* Linha com PV e FP */}
                    <div className="flex items-center justify-between gap-2 text-xs leading-tight font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-400">
                          <Heart size={11} className="text-emerald-400 fill-emerald-400/20 shrink-0" />
                          PV
                        </span>
                        <span className="font-black text-emerald-400">
                          {npc.hpCurrent} <span className="text-slate-500 text-[10px]">/</span>{' '}
                          <span className="text-emerald-400/80 text-[10px]">{npc.hpMax}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 font-bold text-cyan-400">
                          <Zap size={11} className="text-cyan-400 fill-cyan-400/20 shrink-0" />
                          FP
                        </span>
                        <span className="font-black text-cyan-300">
                          {npc.fpCurrent} <span className="text-slate-500 text-[10px]">/</span>{' '}
                          <span className="text-cyan-300/80 text-[10px]">{npc.fpMax}</span>
                        </span>
                      </div>
                    </div>

                    {/* Barra verde de PV */}
                    {npc.hpMax > 0 && (
                      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden mt-1" title={`PV: ${npc.hpCurrent}/${npc.hpMax}`}>
                        <div
                          className="h-full bg-emerald-500 transition-all duration-300"
                          style={{
                            width: `${Math.max(0, Math.min(100, (npc.hpCurrent / npc.hpMax) * 100))}%`,
                          }}
                        />
                      </div>
                    )}

                    {/* Barra azul abaixo da verde de PV indicando a fadiga */}
                    {npc.fpMax > 0 && (
                      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden mt-1" title={`Fadiga (FP): ${npc.fpCurrent}/${npc.fpMax}`}>
                        <div
                          className="h-full bg-cyan-500 transition-all duration-300"
                          style={{
                            width: `${Math.max(0, Math.min(100, (npc.fpCurrent / npc.fpMax) * 100))}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Manobra */}
                <div className="shrink-0">
                  {maneuver ? (
                    <span
                      style={{
                        backgroundColor: maneuver.bgHex,
                        color: maneuver.textHex,
                        borderColor: maneuver.borderHex,
                      }}
                      className="text-[11px] font-bold px-2 py-0.5 rounded border shadow-xs block max-w-[125px] truncate"
                      title={`Manobra de Combate: ${maneuver.name}`}
                    >
                      {maneuver.name}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500 italic bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800/80 block">
                      Sem manobra
                    </span>
                  )}
                </div>
              </div>

              {/* LINHA DE ATRIBUTOS: primários (ST, DX, IQ, HT) e secundários (Per, Will, Spd, Move) */}
              {showDetailedStats && (
                <div
                  className="w-full flex items-center justify-between px-2.5 py-1 bg-slate-950/70 border border-slate-800/80 rounded-lg select-none text-[11px] gap-x-1 gap-y-0.5 flex-wrap"
                  title="Atributos: ST, DX, IQ, HT, Per, Will, Spd, Move"
                >
                  {[
                    { label: 'ST', title: 'Força (ST)', value: npc.st ?? 10 },
                    { label: 'DX', title: 'Destreza (DX)', value: npc.dx ?? 10 },
                    { label: 'IQ', title: 'Inteligência (IQ)', value: npc.iq ?? 10 },
                    { label: 'HT', title: 'Vitalidade (HT)', value: npc.ht ?? 10 },
                  ].map((attr) => (
                    <span key={attr.label} className="inline-flex items-center gap-1 shrink-0" title={attr.title}>
                      <span className="font-bold text-slate-400 text-[10px]">{attr.label}</span>
                      <span className="font-mono font-black text-amber-300 text-xs">{attr.value}</span>
                    </span>
                  ))}
                  <span className="inline-flex items-center gap-1 shrink-0" title="Percepção (Per)">
                    <span className="font-bold text-teal-400 text-[10px]">Per</span>
                    <span className="font-mono font-black text-teal-200 text-xs">{npc.per ?? npc.iq ?? 10}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 shrink-0" title="Vontade (Will)">
                    <span className="font-bold text-indigo-300 text-[10px]">Will</span>
                    <span className="font-mono font-black text-indigo-200 text-xs">{npc.will ?? npc.iq ?? 10}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 shrink-0" title="Basic Speed (Spd)">
                    <span className="font-bold text-amber-400 text-[10px]">Spd</span>
                    <span className="font-mono font-black text-amber-300 text-xs">{npc.basicSpeed ?? 0}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 shrink-0" title="Basic Move (Move)">
                    <span className="font-bold text-emerald-400 text-[10px]">Move</span>
                    <span className="font-mono font-black text-emerald-300 text-xs whitespace-nowrap">
                      {npc.basicMove !== undefined && npc.basicMove !== null && String(npc.basicMove).trim() !== ''
                        ? npc.basicMove
                        : npc.basicSpeed
                        ? Math.floor(npc.basicSpeed)
                        : 0}
                    </span>
                  </span>
                </div>
              )}

              {/* CONTEÚDO PRINCIPAL (DISTRIBUIÇÃO DINÂMICA EM 2 COLUNAS SEM GAPS VERTICAIS) */}
              {(() => {
                // Cada bloco vai para a coluna mais baixa até ali, pela altura estimada em px,
                // para as duas colunas terminarem perto uma da outra
                const colLeft: React.ReactNode[] = [];
                const colRight: React.ReactNode[] = [];
                let heightLeft = 0;
                let heightRight = 0;
                const pushBlock = (node: React.ReactNode, estimatedHeight: number) => {
                  if (heightLeft <= heightRight) {
                    colLeft.push(node);
                    heightLeft += estimatedHeight + (colLeft.length > 1 ? 6 : 0);
                  } else {
                    colRight.push(node);
                    heightRight += estimatedHeight + (colRight.length > 1 ? 6 : 0);
                  }
                };

                // 1. Bloco de Defesas Ativas (SEM TÍTULO "DEFESAS ATIVAS")
                if (hasDefenses) {
                  const hasBlock = (npc.block ?? 0) > 0;
                  const defenseRows = Math.ceil((1 + (hasBlock ? 1 : 0) + (parry1 ? 1 : 0) + (parry2 ? 1 : 0)) / 2);
                  pushBlock(
                    <div key="defenses" className="bg-slate-950/90 border border-slate-800/90 rounded-lg p-1.5">
                      <div className="grid grid-cols-2 gap-1">
                        {/* Esquiva */}
                        <div
                          className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded px-1.5 py-0.5"
                          title={npc.dodgeNotes || 'Esquiva'}
                        >
                          <span className="text-[11px] font-bold text-cyan-400 truncate mr-1.5">Esquiva</span>
                          <span className="font-mono font-black text-sm text-cyan-300 shrink-0">{npc.dodge ?? 0}</span>
                        </div>

                        {/* Bloqueio - Somente exibido quando > 0 */}
                        {hasBlock && (
                          <div
                            className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded px-1.5 py-0.5"
                            title={npc.blockNotes || 'Bloqueio'}
                          >
                            <span className="text-[11px] font-bold text-emerald-400 truncate mr-1.5">Bloqueio</span>
                            <span className="font-mono font-black text-sm text-emerald-300 shrink-0">{npc.block}</span>
                          </div>
                        )}

                        {/* Aparar 1 */}
                        <div
                          className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded px-1.5 py-0.5"
                          title={parry1?.weaponName ? `Aparar: ${parry1.weaponName} ${parry1.notes || ''}` : 'Aparar'}
                        >
                          <span className="text-[11px] font-bold text-amber-400 truncate max-w-[65px]">
                            {parry1?.weaponName ? `Ap (${parry1.weaponName})` : 'Aparar'}
                          </span>
                          <span className="font-mono font-black text-sm text-amber-300 shrink-0">
                            {parry1?.value ?? 0}
                          </span>
                        </div>

                        {/* Aparar 2 (se não houver, slot vazio sem borda quando houver bloqueio) */}
                        {parry2 ? (
                          <div
                            className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded px-1.5 py-0.5"
                            title={`Aparar 2: ${parry2.weaponName} ${parry2.notes || ''}`}
                          >
                            <span className="text-[11px] font-bold text-amber-400 truncate max-w-[65px]">
                              {parry2.weaponName ? `Ap (${parry2.weaponName})` : 'Ap 2'}
                            </span>
                            <span className="font-mono font-black text-sm text-amber-300 shrink-0">
                              {parry2.value}
                            </span>
                          </div>
                        ) : hasBlock ? (
                          <div className="min-h-[24px]" />
                        ) : null}
                      </div>
                    </div>,
                    18 + Math.max(1, defenseRows) * 30
                  );
                }

                // 2. Bloco de Recursos Favoritados (SEM TÍTULO "RECURSOS FAVORITADOS")
                if (hasFavoriteItems) {
                  pushBlock(
                    <div key="resources" className="bg-slate-950/90 border border-slate-800/90 rounded-lg p-1.5 space-y-1">
                      {favoriteItems.map((it) => (
                        <div
                          key={it.id}
                          className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded px-1.5 py-0.5 text-[11px]"
                          title={`${it.name} (${it.category || 'Recurso'})`}
                        >
                          <span className="font-bold text-slate-200 flex items-center gap-1.5 min-w-0 flex-1 mr-2">
                            {getItemIcon(it.name, it.category)}
                            <span className="truncate">{it.name || 'Recurso'}</span>
                          </span>
                          <span className="font-mono font-black text-xs text-white shrink-0">
                            <span className="text-emerald-300">{it.current ?? 0}</span>
                            <span className="text-slate-500 mx-0.5">/</span>
                            <span className="text-slate-300">{it.max ?? 0}</span>
                          </span>
                        </div>
                      ))}
                    </div>,
                    12 + favoriteItems.length * 24
                  );
                }

                // 2b. Armas favoritadas: um bloco por arma, com NH e os modos de ataque
                favoriteWeapons.forEach((wp) => {
                  const modeCount = wp.modes && wp.modes.length > 0 ? wp.modes.length : 1;
                  pushBlock(
                    <div
                      key={wp.id || `fav-wpn-${wp.name}`}
                      className="bg-slate-950/90 border border-amber-500/40 rounded-lg p-2 text-[11px] space-y-1 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <Sword size={13} className="text-amber-400 shrink-0" />
                          <span className="font-bold text-white text-xs truncate" title={wp.name}>
                            {wp.name}
                          </span>
                        </div>
                        <span
                          className="font-mono font-black text-amber-300 bg-amber-950/80 border border-amber-500/50 px-2 py-0.5 rounded text-[11px] shrink-0 tabular-nums shadow-xs"
                          title="Nível de Habilidade (NH)"
                        >
                          NH {wp.nh}
                        </span>
                      </div>
                      {wp.modes && wp.modes.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1 pt-0.5">
                          {wp.modes.map((md, mi) => (
                            <div
                              key={md.id || mi}
                              className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] font-mono flex items-center gap-1.5 text-slate-300"
                              title={`Ataque: ${md.name || 'Ataque'} | Dano: ${md.damage || '-'} (${md.type || ''}) | Alcance: ${md.reach || '-'}`}
                            >
                              {md.name && <span className="font-bold text-amber-400 font-sans">{md.name}:</span>}
                              <span>
                                Dano <strong className="text-white">{md.damage || '-'}</strong>
                              </span>
                              {md.type && <span className="text-slate-400 font-sans">({md.type})</span>}
                              {md.reach && <span className="text-slate-400">Alc {md.reach}</span>}
                            </div>
                          ))}
                        </div>
                      ) : wp.damage ? (
                        <div className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] font-mono inline-flex items-center gap-1.5 text-slate-300">
                          <span>
                            Dano <strong className="text-white">{wp.damage}</strong>
                          </span>
                          {wp.type && <span className="text-slate-400 font-sans">({wp.type})</span>}
                          {wp.reach && <span className="text-slate-400">Alc {wp.reach}</span>}
                        </div>
                      ) : null}
                    </div>,
                    44 + modeCount * 28
                  );
                });

                  // 3. Bloco de Magias (MANTÉM TÍTULOS DE "Magias Ativas" E "Sob Efeito")
                  if (hasSpells) {
                    pushBlock(
                      <div key="spells" className="bg-slate-950/90 border border-purple-900/40 rounded-lg p-1.5">
                        {/* Magias Ativas */}
                        {activeSpells.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-300">
                                <Sparkles size={11} className="text-purple-400" />
                                Magias Ativas ({activeSpells.length})
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1 max-h-12 overflow-y-auto">
                              {activeSpells.map((sp) => {
                                const isExpired =
                                  sp.duration !== undefined &&
                                  sp.duration > 0 &&
                                  (currentRound ?? 0) >= (sp.round ?? 0) + sp.duration;
                                return (
                                  <span
                                    key={sp.id}
                                    className="inline-flex items-center gap-1 bg-slate-900 border border-purple-800/50 rounded px-1.5 py-0.5 text-[10px] text-purple-100"
                                    title={`Alvo: ${sp.targetName || 'Geral'} | R${sp.round}`}
                                  >
                                    <strong className="truncate max-w-[75px]">{sp.spellName}</strong>
                                    <span className="text-slate-400 truncate max-w-[50px]">
                                      →{sp.targetName || 'Geral'}
                                    </span>
                                    {isExpired && <span className="text-amber-300 font-bold">⚠️</span>}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {activeSpells.length > 0 && affectedSpells.length > 0 && (
                          <div className="border-t border-purple-900/40 my-1" />
                        )}

                        {/* Magias sob Efeito */}
                        {affectedSpells.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-300">
                                <Zap size={11} className="text-cyan-400" />
                                Sob Efeito ({affectedSpells.length})
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1 max-h-12 overflow-y-auto">
                              {affectedSpells.map((sp) => (
                                <span
                                  key={sp.id}
                                  className="inline-flex items-center gap-1 bg-slate-900 border border-cyan-800/50 rounded px-1.5 py-0.5 text-[10px] text-cyan-100"
                                  title={`Conjurador: ${sp.casterName || 'Desconhecido'}`}
                                >
                                  <strong className="truncate max-w-[75px]">{sp.spellName}</strong>
                                  <span className="text-slate-400 truncate max-w-[50px]">
                                    por {sp.casterName || 'Outro'}
                                  </span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>,
                      28 + Math.min(3, activeSpells.length + affectedSpells.length) * 26
                    );
                  }

                  // 4. Bloco de Alertas de Turno (SEM TÍTULO "Turno:")
                  if (hasAlerts) {
                    pushBlock(
                      <div key="alerts" className="bg-slate-950/90 border border-slate-800/90 rounded-lg px-2 py-1 flex items-center gap-1 flex-wrap">
                        {turnAlerts.map((alert) => {
                          const IconComp = alert.icon;
                          return (
                            <span
                              key={alert.id}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[11px] border ${alert.badgeClass}`}
                            >
                              {IconComp && <IconComp size={11} className="shrink-0" />}
                              <span>{alert.text}</span>
                            </span>
                          );
                        })}
                        {criticalAlerts.map((alert) => {
                          const IconComp = alert.icon;
                          return (
                            <span
                              key={alert.id}
                              title={alert.tooltip || alert.text}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[11px] border ${alert.badgeClass}`}
                            >
                              {IconComp && <IconComp size={11} className="shrink-0" />}
                              <span>{alert.text}</span>
                            </span>
                          );
                        })}
                        {ta.notes && ta.notes.trim() !== '' && (
                          <span className="text-[11px] text-slate-300 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.2 italic truncate max-w-[150px]">
                            {ta.notes}
                          </span>
                        )}
                      </div>,
                      28 + Math.ceil((turnAlerts.length + criticalAlerts.length + (ta.notes ? 1 : 0)) / 2) * 22
                    );
                  }

                  // 5. Observações gerais (todos veem) e do Mestre (só o Mestre), em blocos separados
                  const notesHeight = (text: string) => Math.min(90, 24 + Math.ceil(text.length / 45) * 16);
                  if (generalNotes) {
                    pushBlock(
                      <div key="obs-gerais" className="bg-slate-950/90 border border-slate-800/80 rounded-lg p-2 text-[11px]" title={generalNotes}>
                        <p className="text-slate-300 italic line-clamp-3 text-xs leading-relaxed">{generalNotes}</p>
                      </div>,
                      notesHeight(generalNotes)
                    );
                  }
                  if (masterNotes) {
                    pushBlock(
                      <div key="obs-mestre" className="bg-purple-950/30 border border-purple-800/50 rounded-lg p-2 text-[11px]" title={masterNotes}>
                        <p className="text-purple-200 italic line-clamp-3 text-xs leading-relaxed">{masterNotes}</p>
                      </div>,
                      notesHeight(masterNotes)
                    );
                  }

                  if (colLeft.length === 0 && colRight.length === 0) return null;

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 items-start">
                      <div className="space-y-1.5">{colLeft}</div>
                      <div className="space-y-1.5">{colRight}</div>
                    </div>
                  );
                })()}
            </div>
          );
        })}
      </div>
    </div>
  );
};
