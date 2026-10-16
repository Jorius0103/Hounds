import React, { useMemo, useState } from 'react';
import { ActionLogEntry, UserRole } from '../types/rpg';
import { NpcAvatar } from './NpcAvatar';
import { Heart, Zap, Sparkles, Coffee, Shield, Target, FileText, Package, Trash2, AlertTriangle, RotateCcw } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface CombatLogCardProps {
  entry: ActionLogEntry;
  showNpcInfo?: boolean;
  onSelectNpc?: (npcId: string) => void;
  isCompact?: boolean;
  currentUserRole?: UserRole;
  currentUserName?: string;
  isPlayer?: boolean;
  onDeleteEntry?: (entryId: string, npcId?: string) => void;
}

export const CombatLogCard: React.FC<CombatLogCardProps> = ({
  entry,
  showNpcInfo = false,
  onSelectNpc,
  isCompact = false,
  currentUserRole,
  currentUserName,
  isPlayer = false,
  onDeleteEntry,
}) => {
  const isDamage = entry.type === 'damage';
  const isFatigue = entry.type === 'fatigue';
  const isHeal = entry.type === 'heal';
  const isRest = entry.type === 'rest';

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const isPlayerView = isPlayer || currentUserRole === 'jogador';
  const isNpcTarget = (entry as any).npcCharacterType !== 'player';

  // Sanitize description for players on NPCs (never leak RD, armor, penetration or formulas)
  const displayDescription = useMemo(() => {
    if (!entry.description) return '';
    if (!isPlayerView || !isNpcTarget) return entry.description;
    
    // If it's an auto-generated formula with RD / Penetrante / Mod, omit it because the player card already shows local and damage
    if (
      entry.description.includes('RD:') ||
      entry.description.includes('RD ') ||
      entry.description.includes('Penetrante:') ||
      entry.description.includes('Mod:') ||
      entry.description.includes('Dano Rolado') ||
      entry.description.startsWith('Local:')
    ) {
      return '';
    }

    // Strip any residual RD mentions from custom notes
    return entry.description
      .replace(/\|?\s*RD\s*[^|,\n]*/gi, '')
      .replace(/\|?\s*Penetrante\s*[^|,\n]*/gi, '')
      .replace(/\|?\s*Mod\s*[^|,\n]*/gi, '')
      .trim();
  }, [entry.description, isPlayerView]);

  // Badge styles based on type and variableKey
  const getTypeBadge = () => {
    switch (entry.type) {
      case 'damage': {
        const isRawView = isPlayerView && isNpcTarget;
        const rawAmt = entry.rawDamage ?? entry.amount ?? 0;
        return {
          icon: <Heart size={12} className="text-rose-400" />,
          label: isRawView ? `${rawAmt} Dano Bruto` : `-${entry.finalDamage ?? entry.amount ?? 0} PV`,
          bg: 'bg-rose-950/70 border-rose-800/80 text-rose-300',
        };
      }
      case 'fatigue':
        return {
          icon: <Zap size={12} className="text-cyan-400" />,
          label: `-${entry.amount ?? 0} FP`,
          bg: 'bg-cyan-950/70 border-cyan-800/80 text-cyan-300',
        };
      case 'heal':
        return {
          icon: <Sparkles size={12} className="text-emerald-400" />,
          label: `+${entry.amount ?? 0} PV`,
          bg: 'bg-emerald-950/70 border-emerald-800/80 text-emerald-300',
        };
      case 'rest':
        return {
          icon: <Coffee size={12} className="text-blue-400" />,
          label: `+${entry.amount ?? 0} FP`,
          bg: 'bg-blue-950/70 border-blue-800/80 text-blue-300',
        };
      case 'item': {
        const amt = entry.amount ?? 0;
        const sign = amt > 0 ? `+${amt}` : `${amt}`;
        return {
          icon: <Package size={12} className="text-amber-400" />,
          label: amt !== 0 ? `${sign} ${entry.itemName || 'Item'}` : `${entry.itemName || 'Item'}`,
          bg: 'bg-amber-950/70 border-amber-800/80 text-amber-300',
        };
      }
      default: {
        const vk = entry.variableKey || (entry as any).keys || '';
        const desc = entry.description || '';
        if (vk === 'hpCurrent' || vk === 'hpMax' || desc.startsWith('PV:') || desc.startsWith('PV máx.:')) {
          return {
            icon: <Heart size={12} className="text-rose-400" />,
            label: 'PV',
            bg: 'bg-rose-950/70 border-rose-800/80 text-rose-300',
          };
        }
        if (vk === 'fpCurrent' || vk === 'fpMax' || desc.startsWith('FP:') || desc.startsWith('FP máx.:')) {
          return {
            icon: <Zap size={12} className="text-cyan-400" />,
            label: 'Fadiga',
            bg: 'bg-cyan-950/70 border-cyan-800/80 text-cyan-300',
          };
        }
        if (
          vk.startsWith('ta.parry') ||
          vk.startsWith('ta.dodge') ||
          vk.startsWith('ta.block') ||
          vk === 'ta.usedRetreat' ||
          desc.includes('Aparar') ||
          desc.includes('Esquiva') ||
          desc.includes('Bloqueio') ||
          desc.includes('Recuo')
        ) {
          return {
            icon: <Shield size={12} className="text-amber-400" />,
            label: 'Defesa',
            bg: 'bg-amber-950/70 border-amber-800/80 text-amber-300',
          };
        }
        if (vk === 'ta.shock' || desc.startsWith('Choque:')) {
          return {
            icon: <AlertTriangle size={12} className="text-amber-400" />,
            label: 'Choque',
            bg: 'bg-amber-950/70 border-amber-800/80 text-amber-300',
          };
        }
        if (vk.startsWith('item.')) {
          return {
            icon: <Package size={12} className="text-amber-400" />,
            label: 'Item',
            bg: 'bg-amber-950/70 border-amber-800/80 text-amber-300',
          };
        }
        if (entry.type === 'spell' || vk.startsWith('actSpell.') || vk.startsWith('affSpell.')) {
          return {
            icon: <Sparkles size={12} className="text-purple-400" />,
            label: 'Magia',
            bg: 'bg-purple-950/70 border-purple-800/80 text-purple-300',
          };
        }
        if (entry.type === 'turn' || desc.startsWith('Turno de')) {
          return {
            icon: <RotateCcw size={12} className="text-blue-400" />,
            label: 'Turno',
            bg: 'bg-blue-950/70 border-blue-800/80 text-blue-300',
          };
        }
        if (entry.type === 'condition' || vk === 'cond' || desc.startsWith('Condição')) {
          return {
            icon: <AlertTriangle size={12} className="text-purple-400" />,
            label: 'Condição',
            bg: 'bg-purple-950/70 border-purple-800/80 text-purple-300',
          };
        }
        return {
          icon: <FileText size={12} className="text-slate-400" />,
          label: entry.type === 'edit' ? 'Ajuste' : 'Nota',
          bg: 'bg-slate-800 border-slate-700 text-slate-300',
        };
      }
    }
  };

  const badge = getTypeBadge();
  const vk = entry.variableKey || (entry as any).keys || '';
  const desc = entry.description || '';
  const isHp = isDamage || vk === 'hpCurrent' || desc.startsWith('PV:');
  const isFp = isFatigue || vk === 'fpCurrent' || desc.startsWith('FP:');
  const isDef = vk.startsWith('ta.parry') || vk.startsWith('ta.dodge') || vk.startsWith('ta.block') || vk === 'ta.shock';

  return (
    <div
      onClick={() => entry.npcId && onSelectNpc?.(entry.npcId)}
      className={`bg-slate-950/80 border rounded-xl transition-all shadow-sm ${
        isHp
          ? 'border-rose-950/60 hover:border-rose-800/80'
          : isFp
          ? 'border-cyan-950/60 hover:border-cyan-800/80'
          : isDef
          ? 'border-amber-950/60 hover:border-amber-800/80'
          : 'border-slate-800/80 hover:border-slate-750'
      } ${entry.npcId && onSelectNpc ? 'cursor-pointer hover:bg-slate-900/90' : ''} ${
        isCompact ? 'p-2 space-y-1.5' : 'p-3 space-y-2'
      }`}
    >
      {/* Header: NPC Identity, Type Badge, Author & Time */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {showNpcInfo && (
            <div className="flex items-center gap-1.5 min-w-0">
              <NpcAvatar
                avatar={entry.npcAvatar}
                preset={entry.npcPreset}
                name={entry.npcName || 'NPC'}
                size="sm"
              />
              <span className="text-xs font-bold text-white truncate max-w-[120px] sm:max-w-[150px]">
                {entry.npcName || 'NPC'}
              </span>
            </div>
          )}

          <span
            className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${badge.bg}`}
          >
            {badge.icon}
            <span>{badge.label}</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900 border border-slate-750 text-amber-300 shrink-0"
            title={entry.round === 0 ? 'Rodada 0 (Preparação)' : `Rodada ${entry.round ?? 0}`}
          >
            R{entry.round !== undefined ? entry.round : 0}
          </span>
          <span
            className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${
              entry.author === 'mestre'
                ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                : 'bg-blue-950/60 text-blue-300 border-blue-800/60'
            }`}
          >
            {entry.authorName || (entry.author === 'assistente' ? (currentUserName || 'Jogador') : entry.author)}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {entry.timestamp}
          </span>
          {onDeleteEntry && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteConfirmOpen(true);
              }}
              className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/60 rounded transition-colors"
              title="Excluir este registro"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Attacker / Damage Dealer Info */}
      {entry.attackerName && (
        <div className="flex items-center gap-1.5 text-[11px] bg-amber-950/30 border border-amber-900/40 px-2 py-0.5 rounded-md text-amber-200">
          <span className="text-amber-400/80 font-sans text-[10px] font-semibold">Atacante:</span>
          <span className="font-bold font-sans flex items-center gap-1">⚔️ {entry.attackerName}</span>
        </div>
      )}

      {/* Detailed GURPS Damage Breakdown */}
      {isDamage && (
        <div className="bg-slate-900/90 border border-slate-800/90 rounded-lg p-2 space-y-1.5">
          {/* VISÃO COMPLETA (Mestre ou alvo Personagem): Tabela completa com Local, Dano Rolado, RD Total e Penetrante/Mod */}
          {(!isPlayerView || !isNpcTarget) ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] font-mono">
                {/* Local Atingido */}
                <div className="bg-slate-950 border border-slate-800/80 rounded px-1.5 py-1">
                  <div className="text-[9px] text-slate-400 font-sans flex items-center gap-1">
                    <Target size={10} className="text-amber-400" />
                    <span>Local</span>
                  </div>
                  <div className="text-amber-300 font-bold truncate">
                    {entry.hitLocation || 'Geral'}
                  </div>
                </div>

                {/* Dano Rolado */}
                <div className="bg-slate-950 border border-slate-800/80 rounded px-1.5 py-1">
                  <div className="text-[9px] text-slate-400 font-sans">Dano Rolado</div>
                  <div className="text-white font-bold">
                    {entry.rawDamage ?? '-'} <span className="text-[10px] text-slate-400 font-normal">({entry.damageType || 'corte'})</span>
                  </div>
                </div>

                {/* RD Total (Armadura & Natural) */}
                <div className="bg-slate-950 border border-slate-800/80 rounded px-1.5 py-1">
                  <div className="text-[9px] text-slate-400 font-sans flex items-center gap-1">
                    <Shield size={10} className="text-cyan-400" />
                    <span>RD Total</span>
                  </div>
                  <div className="text-cyan-300 font-bold" title={`RD Armadura: ${entry.armorDr ?? 0} | RD Natural: ${entry.naturalDr ?? 0}`}>
                    {entry.totalDr ?? ((entry.armorDr || 0) + (entry.naturalDr || 0))}
                    <span className="text-[9px] text-slate-500 font-normal ml-1">
                      ({entry.armorDr ?? 0} arm + {entry.naturalDr ?? 0} nat)
                    </span>
                  </div>
                </div>

                {/* Dano Penetrante & Modificador */}
                <div className="bg-slate-950 border border-slate-800/80 rounded px-1.5 py-1">
                  <div className="text-[9px] text-slate-400 font-sans">Penetrante / Mod</div>
                  <div className="text-amber-200 font-bold">
                    {entry.penetratingDamage ?? '-'} <span className="text-[10px] text-slate-400 font-normal">(x{entry.woundMultiplier ?? '1.0'})</span>
                  </div>
                </div>
              </div>

              {/* Dano Final Aplicado (Mestre) */}
              <div className="flex items-center justify-between border-t border-slate-800/70 pt-1 text-[11px] font-mono">
                <span className="text-slate-400">Dano Final Aplicado:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-rose-400 font-bold">
                    -{entry.finalDamage ?? entry.amount ?? 0} PV
                  </span>
                  {entry.hpBefore !== undefined && entry.hpAfter !== undefined && (
                    <span className="text-[10px] text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                      PV: {entry.hpBefore} → <strong className={entry.hpAfter <= 0 ? 'text-red-400' : 'text-emerald-400'}>{entry.hpAfter}</strong>
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* VISÃO DO JOGADOR: APENAS O DANO QUE DEU E O LOCAL, SEM NENHUMA MENÇÃO A RD OU CÁLCULOS */
            <div className="flex items-center justify-between bg-slate-950/90 border border-rose-950/80 rounded-lg px-2.5 py-1.5 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-sans text-[11px] flex items-center gap-1">
                  <Target size={11} className="text-amber-400" />
                  <span>Local:</span>
                </span>
                <span className="text-amber-300 font-bold">
                  {entry.hitLocation || 'Geral'}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {isNpcTarget ? (
                  <div className="flex items-center gap-1.5 font-sans">
                    <span className="text-slate-400 text-[11px]">Dano bruto dado:</span>
                    <span className="text-rose-300 font-bold text-xs bg-rose-950/60 px-2 py-0.5 rounded border border-rose-900/60 font-mono">
                      {entry.rawDamage ?? entry.amount ?? 0} {entry.damageType ? `(${entry.damageType})` : ''}
                    </span>
                  </div>
                ) : (
                  <>
                    <span className="text-slate-400 font-sans text-[11px]">Dano sofrido:</span>
                    <span className="text-rose-400 font-bold text-sm">
                      -{entry.finalDamage ?? entry.amount ?? 0} PV
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fatigue / Heal Vitals indicator */}
      {!isDamage && (entry.fpBefore !== undefined || entry.hpBefore !== undefined) && (
        <div className="flex items-center justify-between text-[11px] font-mono bg-slate-900/60 px-2 py-1 rounded border border-slate-800/60">
          <span className="text-slate-400">
            {isFatigue ? 'Fadiga:' : isHeal ? 'PV:' : 'Recurso:'}
          </span>
          <span className="text-white font-bold">
            {isNpcTarget && isPlayerView
              ? isFatigue
                ? 'Fadiga alterada'
                : isHeal
                ? 'Recuperação de PV'
                : 'Recurso ajustado'
              : isFatigue && entry.fpBefore !== undefined && entry.fpAfter !== undefined
              ? (isPlayerView ? `Fadiga gasta: -${entry.amount || 0} FP` : `FP: ${entry.fpBefore} → ${entry.fpAfter}`)
              : isHeal && entry.hpBefore !== undefined && entry.hpAfter !== undefined
              ? (isPlayerView ? `Cura: +${entry.amount || 0} PV` : `PV: ${entry.hpBefore} → ${entry.hpAfter}`)
              : isRest && entry.fpBefore !== undefined && entry.fpAfter !== undefined
              ? (isPlayerView ? `Descanso: +${entry.amount || 0} FP` : `FP: ${entry.fpBefore} → ${entry.fpAfter}`)
              : ''}
          </span>
        </div>
      )}

      {/* Description / Custom Note */}
      {displayDescription && (
        <div className="text-[11px] text-slate-300 font-sans leading-relaxed">
          {displayDescription}
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        title="Excluir Registro de Combate"
        message="Deseja excluir este registro do histórico de combate? Os valores lançados por este registro serão restaurados no personagem."
        confirmText="Excluir e Restaurar"
        cancelText="Cancelar"
        isDanger={true}
        onConfirm={() => {
          onDeleteEntry?.(entry.id, entry.npcId);
          setDeleteConfirmOpen(false);
        }}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
};
