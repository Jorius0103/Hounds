import React from 'react';
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
} from 'lucide-react';
import {
  NPC,
  UserRole,
  getHpStatus,
  getFpStatus,
  getCombatManeuver,
  getConditionDescription,
  getCrippledBodyParts,
  DEFAULT_TURN_ACTIONS,
} from '../types';
import { NpcAvatar } from './NpcAvatar';

interface CombatHomeScreenProps {
  npcs: NPC[];
  onSelectNpc: (id: string) => void;
  currentUserRole?: UserRole;
  currentRound?: number;
  filterEmptyMessage?: string;
}

function isExtraManaItem(item: { name?: string; category?: string }): boolean {
  if (!item) return false;
  if (item.category) return item.category === 'mana';
  const name = (item.name || '').toLowerCase();
  return name.includes('mana') || name.includes('pedra') || name.includes('energia');
}

export const CombatHomeScreen: React.FC<CombatHomeScreenProps> = ({
  npcs,
  onSelectNpc,
  currentUserRole = 'mestre',
  currentRound = 0,
  filterEmptyMessage = 'Nenhum personagem ou NPC encontrado neste filtro.',
}) => {
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
        {npcs.map((npc) => {
          const isPlayerChar = npc.characterType === 'player';
          const isDead = Boolean(npc.isDead);
          const showDetailedStats = isMaster || isPlayerChar;

          const hpStatus = getHpStatus(npc.hpCurrent, npc.hpMax);
          const fpStatus = getFpStatus(npc.fpCurrent, npc.fpMax);
          const maneuver = getCombatManeuver(npc.combatManeuver);

          // Itens Extras: Escudos, Flechas e Pedras de Mana
          const extraItems = npc.extraItems || [];
          const shieldItems = extraItems.filter(
            (it) =>
              it &&
              (it.category === 'shield' ||
                (it.name || '').toLowerCase().includes('escudo') ||
                (it.name || '').toLowerCase().includes('shield'))
          );
          const arrowItems = extraItems.filter(
            (it) =>
              it &&
              (it.category === 'arrows' ||
                (it.name || '').toLowerCase().includes('flecha') ||
                (it.name || '').toLowerCase().includes('arco') ||
                (it.name || '').toLowerCase().includes('muni'))
          );
          const manaStones = extraItems.filter(isExtraManaItem);
          const totalManaStonesCurrent = manaStones.reduce(
            (sum, it) => sum + (Number(it.current) || 0),
            0
          );
          const totalManaStonesMax = manaStones.reduce(
            (sum, it) => sum + (Number(it.max) || 0),
            0
          );
          const hasManaStones = manaStones.length > 0;

          // Defesas Ativas
          const parryList =
            npc.parries && npc.parries.length > 0
              ? npc.parries
              : [{ id: 'parry-default', weaponName: '', parryType: '', value: 0, notes: '' }];

          // Magias Ativas e Sob Efeito
          const activeSpells = npc.activeSpells || [];
          const affectedSpells = npc.affectedSpells || [];

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

          if (showDetailedStats) {
            const hpWarns =
              hpStatus.warningTexts && hpStatus.warningTexts.length > 0
                ? hpStatus.warningTexts
                : hpStatus.warningText
                ? [hpStatus.warningText]
                : [];
            hpWarns.forEach((w, ix) => {
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
                text: `Fadiga: ${w}`,
                badgeClass: 'bg-cyan-950/90 border-cyan-600 text-cyan-300 font-bold',
                icon: Zap,
              });
            });

            getCrippledBodyParts(npc).forEach((p) => {
              criticalAlerts.push({
                id: `crippled-${p.key}`,
                text: `${p.name}: ${p.statusLabel || 'Inutilizado'}`,
                badgeClass: p.badgeClass || 'bg-rose-950/90 border-rose-600 text-rose-300 font-bold',
                tooltip: `${p.name} ${p.statusLabel || 'Inutilizado'}: Dano acumulado (${p.damage}) atingiu o limiar (${p.displayHp} PV)!`,
                icon: AlertTriangle,
              });
            });
          }

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
              className={`group relative flex flex-col rounded-xl p-2.5 text-left transition-all cursor-pointer border-2 shadow-md hover:shadow-lg space-y-1.5 ${
                isDead
                  ? 'bg-red-950/25 border-red-600/80 hover:border-red-500'
                  : hasWarning
                  ? 'bg-slate-900/95 border-amber-500/70 hover:border-amber-400'
                  : isPlayerChar
                  ? 'bg-slate-900/95 border-emerald-500/70 hover:border-emerald-400'
                  : 'bg-slate-900/95 border-slate-700 hover:border-purple-500/70'
              }`}
            >
              {/* LINHA 1: CABEÇALHO COMPACTO */}
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
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3
                        className={`text-sm font-black truncate leading-tight ${
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
                      {npc.title && (
                        <span className="text-[10px] text-amber-400/90 font-medium truncate max-w-[120px]">
                          • {npc.title}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-wrap mt-0.5">
                      {isPlayerChar ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-300 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-700/60">
                          <Shield size={9} className="text-emerald-400" />
                          {npc.playerName ? `PC • ${npc.playerName}` : 'Personagem'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-purple-300 bg-purple-950/80 px-1.5 py-0.2 rounded border border-purple-700/60">
                          <Users size={9} className="text-purple-400" />
                          NPC
                        </span>
                      )}
                      {!isPlayerChar && isMaster && (
                        <span
                          title={npc.isVisibleToPlayer ? 'Visível para Jogadores' : 'Oculto para Jogadores'}
                          className={`inline-flex items-center gap-0.5 text-[9px] font-semibold px-1 py-0.2 rounded border ${
                            npc.isVisibleToPlayer
                              ? 'bg-blue-950/70 border-blue-700/60 text-blue-300'
                              : 'bg-slate-950 border-slate-800 text-slate-500'
                          }`}
                        >
                          {npc.isVisibleToPlayer ? <Eye size={9} /> : <EyeOff size={9} />}
                        </span>
                      )}
                      {showDetailedStats && (
                        <span
                          className="text-[9px] font-mono font-bold text-amber-300 bg-slate-950 px-1.5 py-0.2 rounded border border-slate-800"
                          title="Basic Speed"
                        >
                          ⚡ Spd {npc.basicSpeed ?? 0}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Manobra */}
                <div className="shrink-0">
                  {maneuver ? (
                    <span
                      style={{
                        backgroundColor: maneuver.bgHex,
                        color: maneuver.textHex,
                        borderColor: maneuver.borderHex,
                      }}
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded border shadow-xs block max-w-[115px] truncate"
                      title={`Manobra de Combate: ${maneuver.name}`}
                    >
                      {maneuver.name}
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-500 italic bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800/80 block">
                      Sem manobra
                    </span>
                  )}
                </div>
              </div>

              {showDetailedStats ? (
                <>
                  {/* LINHA 2: PONTOS DE VIDA E FADIGA (VALORES DESTACADOS E COMPACTOS) */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {/* Pontos de Vida */}
                    <div className="bg-slate-950/90 border border-slate-800/90 rounded-lg px-2 py-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="inline-flex items-center gap-1 font-bold text-rose-400 text-xs">
                          <Heart size={12} className="text-rose-500 fill-rose-500/20" />
                          PV
                        </span>
                        <span className="font-mono font-black text-sm">
                          <span
                            className={
                              npc.hpCurrent <= 0
                                ? 'text-red-400'
                                : npc.hpCurrent < npc.hpMax
                                ? 'text-yellow-400'
                                : 'text-emerald-400'
                            }
                          >
                            {npc.hpCurrent}
                          </span>
                          <span className="text-slate-500 text-xs mx-0.5">/</span>
                          <span className="text-slate-300 text-xs">{npc.hpMax}</span>
                        </span>
                      </div>
                      {npc.hpMax > 0 && (
                        <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
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
                              width: `${Math.max(0, Math.min(100, (npc.hpCurrent / npc.hpMax) * 100))}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Fadiga */}
                    <div className="bg-slate-950/90 border border-slate-800/90 rounded-lg px-2 py-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="inline-flex items-center gap-1 font-bold text-cyan-300 text-xs">
                          <Zap size={12} className="text-cyan-400 fill-cyan-400/20" />
                          FP
                        </span>
                        <span className="font-mono font-black text-sm">
                          <span className="text-cyan-300">{npc.fpCurrent}</span>
                          <span className="text-slate-500 text-xs mx-0.5">/</span>
                          <span className="text-slate-300 text-xs">{npc.fpMax}</span>
                        </span>
                      </div>
                      {npc.fpMax > 0 && (
                        <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                          <div
                            className="h-full bg-cyan-500 transition-all duration-300"
                            style={{
                              width: `${Math.max(0, Math.min(100, (npc.fpCurrent / npc.fpMax) * 100))}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* LINHA 3: DEFESAS ATIVAS (50%) & ITENS / RECURSOS EQUIPADOS (50%) */}
                  <div className="grid grid-cols-2 gap-1.5 items-stretch">
                    {/* METADE ESQUERDA: Defesas Ativas (grid 2x2: dois em cima, até dois embaixo) */}
                    <div className="bg-slate-950/90 border border-slate-800/90 rounded-lg p-1.5 flex flex-col justify-between">
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-slate-300">
                          <Shield size={10} className="text-amber-400" />
                          Defesas Ativas
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {/* Esquiva */}
                        <div
                          className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded px-1.5 py-0.5"
                          title={npc.dodgeNotes || 'Esquiva'}
                        >
                          <span className="text-[9px] font-bold text-cyan-400">Esq</span>
                          <span className="font-mono font-black text-xs text-cyan-300">{npc.dodge ?? 0}</span>
                        </div>

                        {/* Bloqueio */}
                        <div
                          className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded px-1.5 py-0.5"
                          title={npc.blockNotes || 'Bloqueio'}
                        >
                          <span className="text-[9px] font-bold text-emerald-400">Bloq</span>
                          <span className="font-mono font-black text-xs text-emerald-300">{npc.block ?? 0}</span>
                        </div>

                        {/* Aparar 1 */}
                        <div
                          className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded px-1.5 py-0.5"
                          title={parryList[0]?.weaponName ? `Aparar: ${parryList[0].weaponName} ${parryList[0].notes || ''}` : 'Aparar'}
                        >
                          <span className="text-[9px] font-bold text-amber-400 truncate max-w-[45px]">
                            {parryList[0]?.weaponName ? `Ap (${parryList[0].weaponName})` : 'Aparar'}
                          </span>
                          <span className="font-mono font-black text-xs text-amber-300 shrink-0">
                            {parryList[0]?.value ?? 0}
                          </span>
                        </div>

                        {/* Aparar 2 (ou indicador) */}
                        <div
                          className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded px-1.5 py-0.5"
                          title={parryList[1]?.weaponName ? `Aparar 2: ${parryList[1].weaponName} ${parryList[1].notes || ''}` : 'Segundo Aparar'}
                        >
                          <span className="text-[9px] font-bold text-amber-400 truncate max-w-[45px]">
                            {parryList[1]?.weaponName ? `Ap (${parryList[1].weaponName})` : 'Ap 2'}
                          </span>
                          <span className="font-mono font-black text-xs text-amber-300 shrink-0">
                            {parryList[1] ? parryList[1].value : '-'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* METADE DIREITA: Escudos, Flechas e Pedras de Mana */}
                    <div className="bg-slate-950/90 border border-slate-800/90 rounded-lg p-1.5 flex flex-col justify-between">
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-slate-300">
                          <Sparkles size={10} className="text-amber-400" />
                          Recursos / Equipados
                        </span>
                      </div>
                      <div className="space-y-1">
                        {/* Escudo(s) */}
                        {shieldItems.length > 0 ? (
                          shieldItems.slice(0, 2).map((sh) => (
                            <div
                              key={sh.id}
                              className="flex items-center justify-between bg-slate-900/90 border border-emerald-900/50 rounded px-1.5 py-0.5 text-[9px]"
                              title={`Escudo: ${sh.name} (PV Atual/Total)`}
                            >
                              <span className="font-bold text-emerald-300 flex items-center gap-1 truncate max-w-[70px]">
                                <Shield size={9} className="text-emerald-400 shrink-0" />
                                <span className="truncate">{sh.name || 'Escudo'}</span>
                              </span>
                              <span className="font-mono font-black text-[10px] text-white shrink-0">
                                <span className="text-emerald-300">{sh.current ?? 0}</span>
                                <span className="text-slate-500 mx-0.5">/</span>
                                <span className="text-slate-300">{sh.max ?? 0}</span>
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="flex items-center justify-between bg-slate-900/50 border border-slate-800/60 rounded px-1.5 py-0.5 text-[9px]">
                            <span className="text-slate-500 flex items-center gap-1">
                              <Shield size={9} className="text-slate-600 shrink-0" />
                              Escudo
                            </span>
                            <span className="font-mono text-slate-600 text-[10px]">-</span>
                          </div>
                        )}

                        {/* Flechas */}
                        {arrowItems.length > 0 ? (
                          arrowItems.slice(0, 2).map((ar) => (
                            <div
                              key={ar.id}
                              className="flex items-center justify-between bg-slate-900/90 border border-amber-900/50 rounded px-1.5 py-0.5 text-[9px]"
                              title={`Munição / Flechas: ${ar.name}`}
                            >
                              <span className="font-bold text-amber-300 flex items-center gap-1 truncate max-w-[70px]">
                                <Target size={9} className="text-amber-400 shrink-0" />
                                <span className="truncate">{ar.name || 'Flechas'}</span>
                              </span>
                              <span className="font-mono font-black text-[10px] text-white shrink-0">
                                <span className="text-amber-300">{ar.current ?? 0}</span>
                                <span className="text-slate-500 mx-0.5">/</span>
                                <span className="text-slate-300">{ar.max ?? 0}</span>
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="flex items-center justify-between bg-slate-900/50 border border-slate-800/60 rounded px-1.5 py-0.5 text-[9px]">
                            <span className="text-slate-500 flex items-center gap-1">
                              <Target size={9} className="text-slate-600 shrink-0" />
                              Flechas
                            </span>
                            <span className="font-mono text-slate-600 text-[10px]">-</span>
                          </div>
                        )}

                        {/* Pedras de Mana (Soma Total de todas as pedras se houver) */}
                        {hasManaStones && (
                          <div
                            className="flex items-center justify-between bg-cyan-950/60 border border-cyan-800/70 rounded px-1.5 py-0.5 text-[9px]"
                            title={`Soma de todas as ${manaStones.length} Pedras de Mana (${totalManaStonesCurrent} disp. de ${totalManaStonesMax} total)`}
                          >
                            <span className="font-bold text-cyan-300 flex items-center gap-1 truncate max-w-[85px]">
                              <Sparkles size={9} className="text-cyan-400 shrink-0" />
                              Pedras Mana
                            </span>
                            <span className="font-mono font-black text-[10px] text-cyan-200 shrink-0">
                              <strong className="text-cyan-300">{totalManaStonesCurrent}</strong>
                              <span className="text-slate-500 mx-0.5">/</span>
                              <span className="text-slate-300">{totalManaStonesMax}</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* LINHA 4: MAGIAS ATIVAS E MAGIAS SOB EFEITO */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {/* Magias Ativas */}
                    <div className="bg-slate-950/90 border border-purple-900/40 rounded-lg px-2 py-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-300">
                          <Sparkles size={10} className="text-purple-400" />
                          Magias Ativas ({activeSpells.length})
                        </span>
                      </div>
                      {activeSpells.length === 0 ? (
                        <div className="text-[9px] text-slate-600 italic truncate">Nenhuma ativa</div>
                      ) : (
                        <div className="flex flex-wrap gap-1 mt-0.5 max-h-14 overflow-y-auto">
                          {activeSpells.map((sp) => {
                            const isExpired =
                              sp.duration !== undefined &&
                              sp.duration > 0 &&
                              (currentRound ?? 0) >= (sp.round ?? 0) + sp.duration;
                            return (
                              <span
                                key={sp.id}
                                className="inline-flex items-center gap-1 bg-slate-900 border border-purple-800/50 rounded px-1.5 py-0.2 text-[9px] text-purple-100"
                                title={`Alvo: ${sp.targetName || 'Geral'} | R${sp.round}`}
                              >
                                <strong className="truncate max-w-[85px]">{sp.spellName}</strong>
                                <span className="text-slate-400 truncate max-w-[60px]">
                                  →{sp.targetName || 'Geral'}
                                </span>
                                {isExpired && <span className="text-amber-300 font-bold">⚠️</span>}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Magias sob Efeito */}
                    <div className="bg-slate-950/90 border border-cyan-900/40 rounded-lg px-2 py-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-300">
                          <Zap size={10} className="text-cyan-400" />
                          Sob Efeito ({affectedSpells.length})
                        </span>
                      </div>
                      {affectedSpells.length === 0 ? (
                        <div className="text-[9px] text-slate-600 italic truncate">Nenhum efeito</div>
                      ) : (
                        <div className="flex flex-wrap gap-1 mt-0.5 max-h-14 overflow-y-auto">
                          {affectedSpells.map((sp) => {
                            const isExpired =
                              sp.duration !== undefined &&
                              sp.duration > 0 &&
                              (currentRound ?? 0) >= (sp.round ?? 0) + sp.duration;
                            return (
                              <span
                                key={sp.id}
                                className="inline-flex items-center gap-1 bg-slate-900 border border-cyan-800/50 rounded px-1.5 py-0.2 text-[9px] text-cyan-100"
                                title={`Conjurador: ${sp.casterName || 'Desconhecido'} | R${sp.round}`}
                              >
                                <strong className="truncate max-w-[85px]">{sp.spellName}</strong>
                                <span className="text-slate-400 truncate max-w-[60px]">
                                  ({sp.casterName || '?'})
                                </span>
                                {isExpired && <span className="text-amber-300 font-bold">⚠️</span>}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg px-2 py-1 text-center text-[10px] text-slate-500 italic">
                  Estatísticas detalhadas do NPC ocultas para jogadores.
                </div>
              )}

              {/* LINHA 5: ALERTAS DE DEFESAS & AÇÕES DO TURNO */}
              <div className="bg-slate-950/90 border border-slate-800/90 rounded-lg px-2 py-1 flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 shrink-0">
                  <Shield size={10} className="text-amber-400" />
                  Turno/Alertas:
                </span>
                {turnAlerts.length === 0 &&
                criticalAlerts.length === 0 &&
                !(ta.notes && ta.notes.trim() !== '') ? (
                  <span className="text-[9px] text-slate-600 italic">Sem alertas no turno</span>
                ) : (
                  <>
                    {turnAlerts.map((alert) => {
                      const IconComp = alert.icon;
                      return (
                        <span
                          key={alert.id}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] border ${alert.badgeClass}`}
                        >
                          {IconComp && <IconComp size={9} className="shrink-0" />}
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
                          className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] border ${alert.badgeClass}`}
                        >
                          {IconComp && <IconComp size={9} className="shrink-0" />}
                          <span>{alert.text}</span>
                        </span>
                      );
                    })}
                    {ta.notes && ta.notes.trim() !== '' && (
                      <span className="text-[9px] text-slate-300 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.2 italic truncate max-w-[180px]">
                        Nota: {ta.notes}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
