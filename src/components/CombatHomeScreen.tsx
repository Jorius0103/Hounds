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
  Star,
  Package,
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

          // Observações Gerais (assistantNotes / masterNotes)
          const generalNotes = (
            (npc.assistantNotes || '') +
            (isMaster && npc.masterNotes ? `${npc.assistantNotes ? ' • ' : ''}[Mestre] ${npc.masterNotes}` : '') ||
            (npc as any).notes ||
            ''
          ).trim();

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
            if (isPlayerRole && w.includes('Teste de morte (HT) a cada múltiplo')) {
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
              id: `crippled-${p.key}`,
              text: `${p.name}: ${p.statusLabel || 'Inutilizado'}`,
              badgeClass: p.badgeClass || 'bg-rose-950/90 border-rose-600 text-rose-300 font-bold',
              tooltip: `${p.name} ${p.statusLabel || 'Inutilizado'}: Dano acumulado (${p.damage}) atingiu o limiar (${p.displayHp} PV)!`,
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
                borderColor: isDead ? '#dc2626' : hasWarning ? '#f59e0b' : '#047857',
              }}
              className={`group relative flex flex-col rounded-xl p-2.5 text-left transition-all cursor-pointer border-2 shadow-md hover:shadow-lg space-y-1.5 ${
                isDead
                  ? 'bg-red-950/25 border-red-600/80 hover:border-red-500'
                  : hasWarning
                  ? 'bg-slate-900/95 border-amber-500/70 hover:border-amber-400'
                  : 'bg-slate-900/95 border-emerald-700 hover:border-emerald-600'
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
                    <div className="flex items-baseline gap-1.5 flex-wrap min-w-0">
                      <h3
                        className={`text-lg font-black truncate leading-tight ${
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
                      {isPlayerChar && npc.playerName && (
                        <span
                          className="text-sm font-semibold text-emerald-400 truncate max-w-[140px]"
                          title={`Jogador: ${npc.playerName}`}
                        >
                          ({npc.playerName})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      {!isPlayerChar && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-300 bg-purple-950/80 px-1.5 py-0.2 rounded border border-purple-700/60">
                          <Users size={11} className="text-purple-400" />
                          NPC
                        </span>
                      )}
                      {!isPlayerChar && isMaster && (
                        <span
                          title={npc.isVisibleToPlayer ? 'Visível para Jogadores' : 'Oculto para Jogadores'}
                          className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-1 py-0.2 rounded border ${
                            npc.isVisibleToPlayer
                              ? 'bg-blue-950/70 border-blue-700/60 text-blue-300'
                              : 'bg-slate-950 border-slate-800 text-slate-500'
                          }`}
                        >
                          {npc.isVisibleToPlayer ? <Eye size={11} /> : <EyeOff size={11} />}
                        </span>
                      )}
                      {showDetailedStats && (
                        <span
                          className="text-[11px] font-mono font-bold text-amber-300 bg-slate-950 px-1.5 py-0.2 rounded border border-slate-800"
                          title="Basic Speed"
                        >
                          ⚡ Spd {npc.basicSpeed ?? 0}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* CENTRO DO CABEÇALHO: PV E FP COM BARRA DE PROGRESSO DOBRADA */}
                {showDetailedStats && (
                  <div className="flex items-center gap-3 shrink-0 bg-slate-950/80 border border-slate-800/80 rounded-lg px-2.5 py-1">
                    {/* PV */}
                    <div className="flex flex-col min-w-[130px] sm:min-w-[140px]">
                      <div className="flex items-center justify-between gap-1 text-xs leading-tight">
                        <span className="inline-flex items-center gap-0.5 font-bold text-rose-400">
                          <Heart size={11} className="text-rose-500 fill-rose-500/20 shrink-0" />
                          PV
                        </span>
                        <span className="font-mono font-black">
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
                          <span className="text-slate-500 text-[10px] mx-0.5">/</span>
                          <span className="text-slate-300 text-[10px]">{npc.hpMax}</span>
                        </span>
                      </div>
                      {npc.hpMax > 0 && (
                        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden mt-0.5">
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

                    <div className="h-6 w-[1px] bg-slate-800" />

                    {/* FP */}
                    <div className="flex flex-col min-w-[130px] sm:min-w-[140px]">
                      <div className="flex items-center justify-between gap-1 text-xs leading-tight">
                        <span className="inline-flex items-center gap-0.5 font-bold text-cyan-300">
                          <Zap size={11} className="text-cyan-400 fill-cyan-400/20 shrink-0" />
                          FP
                        </span>
                        <span className="font-mono font-black">
                          <span className="text-cyan-300">{npc.fpCurrent}</span>
                          <span className="text-slate-500 text-[10px] mx-0.5">/</span>
                          <span className="text-slate-300 text-[10px]">{npc.fpMax}</span>
                        </span>
                      </div>
                      {npc.fpMax > 0 && (
                        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden mt-0.5">
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

              {/* CONTEÚDO PRINCIPAL (DISTRIBUIÇÃO DINÂMICA EM 2 COLUNAS SEM GAPS VERTICAIS) */}
              {(() => {
                const contentBlocks: React.ReactNode[] = [];

                // 1. Bloco de Defesas Ativas (SEM TÍTULO "DEFESAS ATIVAS")
                if (hasDefenses) {
                  const hasBlock = (npc.block ?? 0) > 0;
                  contentBlocks.push(
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
                    </div>
                  );
                }

                // 2. Bloco de Recursos Favoritados (SEM TÍTULO "RECURSOS FAVORITADOS")
                if (hasFavoriteItems) {
                  contentBlocks.push(
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
                    </div>
                  );
                }

                  // 3. Bloco de Magias (MANTÉM TÍTULOS DE "Magias Ativas" E "Sob Efeito")
                  if (hasSpells) {
                    contentBlocks.push(
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
                      </div>
                    );
                  }

                  // 4. Bloco de Alertas de Turno (SEM TÍTULO "Turno:")
                  if (hasAlerts) {
                    contentBlocks.push(
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
                      </div>
                    );
                  }

                  // 5. Bloco de Observações (SEM TÍTULO "Obs:")
                  if (generalNotes) {
                    contentBlocks.push(
                      <div key="obs" className="bg-slate-950/80 border border-slate-800/80 rounded-lg px-2 py-1 text-[11px] text-slate-300">
                        <span className="italic line-clamp-2" title={generalNotes}>
                          {generalNotes}
                        </span>
                      </div>
                    );
                  }

                  if (contentBlocks.length === 0) return null;

                  const colLeft = contentBlocks.filter((_, i) => i % 2 === 0);
                  const colRight = contentBlocks.filter((_, i) => i % 2 === 1);

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
