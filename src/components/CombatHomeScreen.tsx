import React from 'react';
import { NPC, MesaRole } from '../types/rpg';
import { NpcAvatar } from './NpcAvatar';
import {
  getHpStatus,
  getFpStatus,
  getCombatManeuver,
  getConditionDescription,
  getCrippledBodyParts,
  DEFAULT_TURN_ACTIONS,
} from '../utils/gurps';
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
  X,
} from 'lucide-react';

interface CombatHomeScreenProps {
  npcs: NPC[];
  onSelectNpc: (id: string) => void;
  currentUserRole?: MesaRole;
  currentRound?: number;
  filterType?: 'all' | 'players' | 'npcs' | 'alive' | 'dead';
}

export const CombatHomeScreen: React.FC<CombatHomeScreenProps> = ({
  npcs,
  onSelectNpc,
  currentUserRole = 'mestre',
  currentRound = 0,
  filterType = 'all',
}) => {
  if (npcs.length === 0) {
    return (
      <div className="py-12 text-center text-xs text-slate-400 italic bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 w-full">
        {currentUserRole === 'jogador' || currentUserRole === 'visualizador'
          ? 'Nenhum personagem ou NPC visível no momento.'
          : filterType === 'players'
          ? 'Nenhum Personagem cadastrado neste filtro. Clique em "+ Personagens" acima.'
          : filterType === 'npcs'
          ? 'Nenhum NPC cadastrado neste filtro. Clique em "+ NPC" acima.'
          : filterType === 'alive'
          ? 'Nenhum combatente vivo no momento.'
          : filterType === 'dead'
          ? 'Nenhum combatente morto no momento.'
          : 'Nenhum registro encontrado neste filtro.'}
      </div>
    );
  }

  return (
    <div className="w-full pt-1 pb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
        {npcs.map((npc) => {
          const isPlayerChar = npc.characterType === 'player';
          const isMaster = currentUserRole === 'mestre';
          const showFullStats = isPlayerChar || isMaster;
          const isDeadChar = Boolean(npc.isDead);
          const hpStat = getHpStatus(npc.hpCurrent, npc.hpMax);
          const fpStat = getFpStatus(npc.fpCurrent, npc.fpMax);
          const activeManeuver = getCombatManeuver(npc.combatManeuver);
          const turn = npc.turnActions || DEFAULT_TURN_ACTIONS;

          // Cálculo de Itens Extras de Mana para Fadiga Total e Fadiga Total Disponível
          const manaItems = (npc.extraItems || []).filter((it) => {
            if (it.category === 'mana') return true;
            if (it.category && it.category !== 'mana') return false;
            const lower = (it.name || '').toLowerCase();
            return lower.includes('mana') || lower.includes('pedra');
          });
          const extraManaAvailable = manaItems.reduce(
            (sum, it) => sum + (Number(it.current) || 0),
            0
          );
          const extraManaTotal = manaItems.reduce(
            (sum, it) => sum + (Number(it.max) || 0),
            0
          );
          const totalFatigueAvailable = (Number(npc.fpCurrent) || 0) + extraManaAvailable;
          const totalFatigueMax = (Number(npc.fpMax) || 0) + extraManaTotal;

          // Lista de Aparar (Defesas Ativas)
          const parriesList =
            npc.parries && npc.parries.length > 0
              ? npc.parries
              : [{ id: 'parry-default', weaponName: '', parryType: '', value: 0, notes: '' }];

          // Alertas de Defesas & Ações do Turno
          const turnAlerts: {
            id: string;
            badgeClass: string;
            text: string;
          }[] = [];

          if (turn.parryCount > 0) {
            turnAlerts.push({
              id: 'parry',
              badgeClass: 'bg-amber-950/85 border-amber-500/80 text-amber-300 font-bold',
              text: `Aparou: ${turn.parryCount}x${
                turn.parryCount > 1 ? ` (-${(turn.parryCount - 1) * 4})` : ''
              }`,
            });
          }
          if (turn.dodgeCount > 0) {
            turnAlerts.push({
              id: 'dodge',
              badgeClass: 'bg-cyan-950/85 border-cyan-500/80 text-cyan-300 font-bold',
              text: `Esquivou: ${turn.dodgeCount}x`,
            });
          }
          if (turn.blockCount > 0) {
            turnAlerts.push({
              id: 'block',
              badgeClass: 'bg-emerald-950/85 border-emerald-500/80 text-emerald-300 font-bold',
              text: `Bloqueou: ${turn.blockCount}x`,
            });
          }
          if (turn.usedRetreat) {
            turnAlerts.push({
              id: 'retreat',
              badgeClass: 'bg-blue-950/85 border-blue-500/80 text-blue-300 font-bold',
              text: 'Recuou',
            });
          }
          if (turn.usedFatigueThisTurn) {
            turnAlerts.push({
              id: 'used-fp',
              badgeClass: 'bg-orange-950/85 border-orange-500/80 text-orange-300 font-bold',
              text: 'Usou Fadiga',
            });
          }
          if (turn.shock > 0) {
            turnAlerts.push({
              id: 'shock',
              badgeClass: 'bg-rose-950 border-rose-500 text-rose-300 font-black animate-pulse',
              text: `Shock: -${turn.shock}`,
            });
          }

          // Alertas críticos / condições para cor do card e exibição rápida
          const hasConditions = Boolean(npc.statusConditions && npc.statusConditions.length > 0);
          const hpWarnings =
            hpStat.warningTexts && hpStat.warningTexts.length > 0
              ? hpStat.warningTexts
              : hpStat.warningText
              ? [hpStat.warningText]
              : [];
          const fpWarnings =
            fpStat.warningTexts && fpStat.warningTexts.length > 0
              ? fpStat.warningTexts
              : fpStat.warningText
              ? [fpStat.warningText]
              : [];
          const crippledParts = showFullStats ? getCrippledBodyParts(npc) : [];
          const hasCriticalHpFp = hpWarnings.length > 0 || fpWarnings.length > 0;
          const hasAlerts = hasConditions || hasCriticalHpFp || crippledParts.length > 0;

          let cardBorderClasses = '';
          let nameColor = '';
          if (isDeadChar) {
            cardBorderClasses =
              'bg-red-950/25 border-red-600 hover:bg-red-950/35 hover:border-red-500';
            nameColor = 'text-red-400 line-through';
          } else if (hasAlerts) {
            cardBorderClasses =
              'bg-amber-950/20 border-amber-400 hover:bg-amber-950/30 hover:border-amber-300';
            nameColor = 'text-amber-200';
          } else if (isPlayerChar) {
            cardBorderClasses =
              'bg-emerald-950/20 border-emerald-500/80 hover:bg-emerald-950/30 hover:border-emerald-400';
            nameColor = 'text-emerald-200';
          } else {
            cardBorderClasses =
              'bg-slate-950/80 border-slate-700 hover:bg-slate-900 hover:border-slate-500';
            nameColor = 'text-slate-100';
          }

          const activeSpells = npc.activeSpells || [];
          const affectedSpells = npc.affectedSpells || [];

          return (
            <div
              key={npc.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectNpc(npc.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectNpc(npc.id);
                }
              }}
              style={{ borderWidth: '2px', borderStyle: 'solid' }}
              className={`group relative flex flex-col justify-between gap-3 p-3.5 sm:p-4 rounded-2xl text-left transition-all cursor-pointer shadow-lg hover:shadow-xl ${cardBorderClasses}`}
              title={`Clique para abrir a ficha completa de ${npc.name || 'Personagem'}`}
            >
              <div className="space-y-3 w-full">
                {/* 1. CABEÇALHO DO CARD */}
                <div className="flex items-start justify-between gap-2.5 border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <NpcAvatar
                        avatar={npc.avatar}
                        preset={npc.avatarPreset}
                        name={npc.name || 'NPC'}
                        size="md"
                      />
                      {isDeadChar && (
                        <div
                          className="absolute inset-0 bg-red-950/75 rounded-full flex items-center justify-center border border-red-600/90 shadow-inner z-10"
                          title="Morto"
                        >
                          <X size={22} className="text-red-400 stroke-[3.5]" />
                        </div>
                      )}
                      {isDeadChar && (
                        <div className="absolute -bottom-1 -right-1 bg-red-950 border border-red-600 rounded-full p-0.5 text-red-400 z-20 shadow-xs">
                          <Skull size={12} />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className={`text-base font-extrabold truncate ${nameColor}`}>
                          {npc.name || '(Sem Nome)'}
                        </h3>
                        {isDeadChar && (
                          <span className="text-[10px] font-black text-red-300 bg-red-950/90 px-1.5 py-0.5 rounded border border-red-700/80 flex items-center gap-0.5">
                            <X size={10} className="stroke-[3.5] text-red-400" />
                            <span>MORTO</span>
                          </span>
                        )}
                      </div>
                      {npc.title && (
                        <div className="text-[11px] text-amber-400/90 font-medium truncate">
                          {npc.title}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Badges Direita: Tipo, Speed e Manobra */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="flex items-center gap-1">
                      {showFullStats && (
                        <span
                          className="text-[10px] font-mono font-bold text-amber-300 bg-slate-900 border border-slate-750 px-1.5 py-0.5 rounded"
                          title="Basic Speed"
                        >
                          Spd {npc.basicSpeed ?? 0}
                        </span>
                      )}

                      {isPlayerChar ? (
                        <span className="text-[10px] font-bold text-emerald-300 uppercase bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-700/60">
                          {npc.playerName || 'Personagem'}
                        </span>
                      ) : (
                        <div className="flex items-center gap-1">
                          {isMaster && (
                            <span
                              title={
                                npc.isVisibleToPlayer
                                  ? 'Visível para Jogadores'
                                  : 'Oculto para Jogadores'
                              }
                              className={npc.isVisibleToPlayer ? 'text-blue-400' : 'text-slate-500'}
                            >
                              {npc.isVisibleToPlayer ? <Eye size={13} /> : <EyeOff size={13} />}
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-purple-300 uppercase bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-700/60">
                            NPC
                          </span>
                        </div>
                      )}
                    </div>

                    {activeManeuver ? (
                      <span
                        style={{
                          backgroundColor: activeManeuver.bgHex,
                          color: activeManeuver.textHex,
                          borderColor: activeManeuver.borderHex,
                        }}
                        className="text-[10px] font-bold px-2 py-0.5 rounded border truncate max-w-[140px] shadow-xs"
                        title={`Manobra de Combate: ${activeManeuver.name}`}
                      >
                        {activeManeuver.name}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 italic">Sem manobra</span>
                    )}
                  </div>
                </div>

                {/* 2. PONTOS DE VIDA, FADIGA, FADIGA TOTAL E FADIGA TOTAL DISPONÍVEL */}
                {showFullStats && (
                  <div className="space-y-2">
                    {/* Linha 1: Pontos de Vida e Fadiga */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Pontos de Vida */}
                      <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="flex items-center gap-1 text-[11px] font-bold text-rose-300 uppercase tracking-wider">
                            <Heart size={12} className="text-rose-500 shrink-0" />
                            <span>Pontos de Vida</span>
                          </span>
                          {npc.hpMax > 0 && (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded border truncate ${hpStat.badgeBg}`}
                            >
                              {hpStat.label}
                            </span>
                          )}
                        </div>
                        <div className="flex items-baseline justify-between font-mono">
                          <span
                            className={`text-base font-black ${
                              npc.hpCurrent <= 0
                                ? 'text-red-400'
                                : npc.hpCurrent < npc.hpMax
                                ? 'text-yellow-400'
                                : 'text-emerald-400'
                            }`}
                          >
                            {npc.hpCurrent}
                            <span className="text-xs text-slate-400 font-semibold">
                              {' '}
                              / {npc.hpMax}
                            </span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">PV</span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
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
                              width: `${Math.max(
                                0,
                                Math.min(100, npc.hpMax > 0 ? (npc.hpCurrent / npc.hpMax) * 100 : 0)
                              )}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Fadiga */}
                      <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="flex items-center gap-1 text-[11px] font-bold text-cyan-300 uppercase tracking-wider">
                            <Zap size={12} className="text-cyan-400 shrink-0" />
                            <span>Fadiga</span>
                          </span>
                          {npc.fpMax > 0 && (
                            <span className="text-[9px] font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 px-1.5 py-0.5 rounded truncate">
                              {fpStat.label}
                            </span>
                          )}
                        </div>
                        <div className="flex items-baseline justify-between font-mono">
                          <span className="text-base font-black text-cyan-300">
                            {npc.fpCurrent}
                            <span className="text-xs text-slate-400 font-semibold">
                              {' '}
                              / {npc.fpMax}
                            </span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">FP</span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full bg-cyan-500 transition-all duration-300"
                            style={{
                              width: `${Math.max(
                                0,
                                Math.min(100, npc.fpMax > 0 ? (npc.fpCurrent / npc.fpMax) * 100 : 0)
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Linha 2: Fadiga Total Disponível e Fadiga Total (Somando Fadiga + Itens Extras de Mana) */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Fadiga Total Disponível */}
                      <div className="bg-slate-900/95 border border-cyan-900/50 rounded-xl p-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold text-cyan-300 uppercase tracking-wide leading-tight">
                            Fadiga Total Disponível
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                            FP ({npc.fpCurrent}) + Mana ({extraManaAvailable})
                          </div>
                        </div>
                        <span className="px-2 py-1 rounded-lg bg-cyan-950/80 border border-cyan-700/60 font-mono font-black text-sm text-cyan-200 shrink-0">
                          {totalFatigueAvailable}
                        </span>
                      </div>

                      {/* Fadiga Total */}
                      <div className="bg-slate-900/95 border border-purple-900/50 rounded-xl p-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold text-purple-300 uppercase tracking-wide leading-tight">
                            Fadiga Total
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                            FP ({npc.fpMax}) + Mana ({extraManaTotal})
                          </div>
                        </div>
                        <span className="px-2 py-1 rounded-lg bg-purple-950/80 border border-purple-700/60 font-mono font-black text-sm text-purple-200 shrink-0">
                          {totalFatigueMax}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. VALORES DAS DEFESAS ATIVAS E SEUS COMENTÁRIOS */}
                {showFullStats && (
                  <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-2.5 space-y-2">
                    <div className="flex items-center gap-1.5 border-b border-slate-800/80 pb-1">
                      <Shield size={13} className="text-amber-400 shrink-0" />
                      <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                        Defesas Ativas
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {/* Esquiva */}
                      <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-2 flex flex-col justify-between gap-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-bold text-cyan-300 truncate">
                            Esquiva
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-cyan-800/60 font-mono font-black text-xs text-cyan-300 shrink-0">
                            {npc.dodge ?? 0}
                          </span>
                        </div>
                        <div
                          className="text-[10px] text-slate-400 leading-snug break-words"
                          title={npc.dodgeNotes || 'Sem comentário'}
                        >
                          {npc.dodgeNotes ? (
                            npc.dodgeNotes
                          ) : (
                            <span className="text-slate-600 italic">Sem comentário</span>
                          )}
                        </div>
                      </div>

                      {/* Bloqueio */}
                      <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-2 flex flex-col justify-between gap-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-bold text-emerald-300 truncate">
                            Bloqueio
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-emerald-800/60 font-mono font-black text-xs text-emerald-300 shrink-0">
                            {npc.block ?? 0}
                          </span>
                        </div>
                        <div
                          className="text-[10px] text-slate-400 leading-snug break-words"
                          title={npc.blockNotes || 'Sem comentário'}
                        >
                          {npc.blockNotes ? (
                            npc.blockNotes
                          ) : (
                            <span className="text-slate-600 italic">Sem comentário</span>
                          )}
                        </div>
                      </div>

                      {/* Aparar */}
                      {parriesList.map((parry, idx) => (
                        <div
                          key={parry.id || idx}
                          className="bg-slate-950/90 border border-slate-800 rounded-lg p-2 flex flex-col justify-between gap-1"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className="text-[11px] font-bold text-amber-300 truncate"
                              title={
                                parry.weaponName ? `Aparar: ${parry.weaponName}` : 'Aparar'
                              }
                            >
                              {parry.weaponName ? `Aparar (${parry.weaponName})` : 'Aparar'}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-amber-500/50 font-mono font-black text-xs text-amber-300 shrink-0">
                              {parry.value ?? 0}
                            </span>
                          </div>
                          <div
                            className="text-[10px] text-slate-400 leading-snug break-words"
                            title={parry.notes || 'Sem comentário'}
                          >
                            {parry.notes ? (
                              parry.notes
                            ) : (
                              <span className="text-slate-600 italic">Sem comentário</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. MAGIAS ATIVAS E MAGIAS SOB EFEITO */}
                {showFullStats && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Magias Ativas */}
                    <div className="bg-slate-900/95 border border-purple-900/40 rounded-xl p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between border-b border-purple-950/80 pb-1">
                        <span className="flex items-center gap-1 text-[11px] font-bold text-purple-300">
                          <Sparkles size={12} className="text-purple-400 shrink-0" />
                          <span>Magias Ativas</span>
                        </span>
                        <span className="text-[10px] font-mono font-bold text-purple-300 bg-purple-950/80 px-1.5 rounded border border-purple-800/60">
                          {activeSpells.length}
                        </span>
                      </div>

                      {activeSpells.length === 0 ? (
                        <div className="text-[10px] text-slate-500 italic py-1">
                          Nenhuma magia ativa
                        </div>
                      ) : (
                        <div className="space-y-1 max-h-28 overflow-y-auto pr-0.5">
                          {activeSpells.map((sp) => {
                            const isExpired =
                              sp.duration !== undefined &&
                              sp.duration > 0 &&
                              currentRound >= sp.round + sp.duration;
                            return (
                              <div
                                key={sp.id}
                                className="bg-slate-950/90 border border-purple-800/40 rounded-lg px-2 py-1 text-[10px]"
                              >
                                <div className="flex items-center justify-between gap-1 font-bold text-purple-200">
                                  <span className="truncate">{sp.spellName}</span>
                                  <span className="font-mono text-[9px] text-purple-300 shrink-0">
                                    R{sp.round}
                                    {sp.cost ? ` (-${sp.cost}FP)` : ''}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-1 text-[9px] text-slate-400 mt-0.5">
                                  <span className="truncate">
                                    Alvo:{' '}
                                    <strong className="text-slate-200">
                                      {sp.targetName || npc.name}
                                    </strong>
                                  </span>
                                  {sp.duration !== undefined && sp.duration > 0 && (
                                    <span
                                      className={
                                        isExpired
                                          ? 'text-amber-300 font-bold'
                                          : 'text-purple-300 font-mono'
                                      }
                                    >
                                      {isExpired
                                        ? '⚠️ Expirou'
                                        : `${Math.max(
                                            0,
                                            sp.round + sp.duration - currentRound
                                          )}R rest.`}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Magias sob Efeito */}
                    <div className="bg-slate-900/95 border border-cyan-900/40 rounded-xl p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between border-b border-cyan-950/80 pb-1">
                        <span className="flex items-center gap-1 text-[11px] font-bold text-cyan-300">
                          <Zap size={12} className="text-cyan-400 shrink-0" />
                          <span>Magias sob Efeito</span>
                        </span>
                        <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950/80 px-1.5 rounded border border-cyan-800/60">
                          {affectedSpells.length}
                        </span>
                      </div>

                      {affectedSpells.length === 0 ? (
                        <div className="text-[10px] text-slate-500 italic py-1">
                          Nenhuma magia sob efeito
                        </div>
                      ) : (
                        <div className="space-y-1 max-h-28 overflow-y-auto pr-0.5">
                          {affectedSpells.map((sp) => {
                            const isExpired =
                              sp.duration !== undefined &&
                              sp.duration > 0 &&
                              currentRound >= sp.round + sp.duration;
                            return (
                              <div
                                key={sp.id}
                                className="bg-slate-950/90 border border-cyan-800/40 rounded-lg px-2 py-1 text-[10px]"
                              >
                                <div className="flex items-center justify-between gap-1 font-bold text-cyan-200">
                                  <span className="truncate">{sp.spellName}</span>
                                  <span className="font-mono text-[9px] text-cyan-300 shrink-0">
                                    R{sp.round}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-1 text-[9px] text-slate-400 mt-0.5">
                                  <span className="truncate">
                                    Por:{' '}
                                    <strong className="text-slate-200">
                                      {sp.casterName || 'Desconhecido'}
                                    </strong>
                                  </span>
                                  {sp.duration !== undefined && sp.duration > 0 && (
                                    <span
                                      className={
                                        isExpired
                                          ? 'text-amber-300 font-bold'
                                          : 'text-cyan-300 font-mono'
                                      }
                                    >
                                      {isExpired
                                        ? '⚠️ Expirou'
                                        : `${Math.max(
                                            0,
                                            sp.round + sp.duration - currentRound
                                          )}R rest.`}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 5. ALERTAS DE DEFESAS & AÇÕES DO TURNO (+ ALERTAS CRÍTICOS SE HOUVER) */}
                <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-1">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                      <Footprints size={12} className="text-amber-400 shrink-0" />
                      <span>Alertas de Defesas &amp; Ações do Turno</span>
                    </span>
                  </div>

                  {turnAlerts.length === 0 ? (
                    <div className="text-[10px] text-slate-500 italic py-0.5">
                      Nenhum alerta de defesa ou ação registrada no turno.
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {turnAlerts.map((al) => (
                        <span
                          key={al.id}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] border ${al.badgeClass}`}
                        >
                          <span>{al.text}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Condições & Alertas Críticos (se houver) */}
                  {(hpWarnings.length > 0 ||
                    fpWarnings.length > 0 ||
                    (npc.statusConditions && npc.statusConditions.length > 0) ||
                    crippledParts.length > 0) && (
                    <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-slate-800/70">
                      {hpWarnings.map((w, i) => (
                        <span
                          key={`hp-w-${i}`}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border bg-red-950/90 border-red-600 text-red-300 font-bold"
                        >
                          <AlertTriangle size={10} className="shrink-0" />
                          <span>PV: {w}</span>
                        </span>
                      ))}
                      {fpWarnings.map((w, i) => (
                        <span
                          key={`fp-w-${i}`}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border bg-cyan-950/90 border-cyan-600 text-cyan-300 font-bold"
                        >
                          <Zap size={10} className="shrink-0" />
                          <span>Fadiga: {w}</span>
                        </span>
                      ))}
                      {(npc.statusConditions || []).map((cond) => (
                        <span
                          key={`cond-${cond}`}
                          title={`${cond}: ${getConditionDescription(cond)}`}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border bg-purple-950/80 border-purple-500 text-purple-200 font-semibold"
                        >
                          <span>{cond}</span>
                        </span>
                      ))}
                      {crippledParts.map(({ part, statusLabel, badgeClass }) => (
                        <span
                          key={`crip-${part.key}`}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border ${
                            badgeClass || 'bg-rose-950/90 border-rose-600 text-rose-300 font-bold'
                          }`}
                        >
                          <AlertTriangle size={10} className="shrink-0" />
                          <span>
                            {part.name}: {statusLabel}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

