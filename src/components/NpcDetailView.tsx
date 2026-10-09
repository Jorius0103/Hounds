import React, { useState, useRef, useEffect } from 'react';
import { NPC, Weapon, ParryEntry, BodyArmorLocation, ExtraItem, UserRole } from '../types/rpg';
import { NpcAvatar } from './NpcAvatar';
import { getHpStatus, getFpStatus, DEFAULT_TURN_ACTIONS, COMBAT_MANEUVERS, getCombatManeuver } from '../utils/gurps';
import { TurnActionsTracker } from './TurnActionsTracker';
import { SpellsModal } from './SpellsModal';
import { CombatLogCard } from './CombatLogCard';
import { systemLogger } from '../utils/systemLogger';
import {
  Shield,
  Heart,
  Zap,
  Sword,
  Sparkles,
  Plus,
  Minus,
  Trash2,
  Copy,
  Info,
  History,
  Eye,
  EyeOff,
  Skull,
  Star,
  Edit2,
  AlertTriangle,
  Lock,
  Users,
  Footprints,
  ShieldCheck,
  RotateCcw,
  Package,
  UserCheck,
  Target,
} from 'lucide-react';

const getItemIcon = (name: string) => {
  const lower = (name || '').toLowerCase();
  if (lower.includes('mana') || lower.includes('pedra')) {
    return <Sparkles size={14} className="text-cyan-400 shrink-0" />;
  }
  if (lower.includes('flecha') || lower.includes('arco') || lower.includes('muni')) {
    return <Target size={14} className="text-amber-400 shrink-0" />;
  }
  if (lower.includes('escudo') || lower.includes('shield') || lower.includes('defesa')) {
    return <Shield size={14} className="text-emerald-400 shrink-0" />;
  }
  return <Package size={14} className="text-slate-400 shrink-0" />;
};

interface NpcDetailViewProps {
  npc: NPC;
  onUpdateNpc: (updatedNpc: NPC) => void;
  onDeleteNpc: (id: string) => void;
  onDuplicateNpc: (npc: NPC) => void;
  onOpenAvatarPicker: (npc: NPC) => void;
  onOpenConditionsCrud: () => void;
  onOpenDamageCalculator: (npc: NPC) => void;
  onOpenWeaponModal: (weapon?: Weapon) => void;
  isPlayerUser?: boolean;
  currentUserRole?: UserRole;
}

export const NpcDetailView: React.FC<NpcDetailViewProps> = ({
  npc,
  onUpdateNpc,
  onDeleteNpc,
  onDuplicateNpc,
  onOpenAvatarPicker,
  onOpenConditionsCrud,
  onOpenDamageCalculator,
  onOpenWeaponModal,
  isPlayerUser = false,
  currentUserRole = 'mestre',
}) => {
  const [activeTab, setActiveTab] = useState<'weapons' | 'spells' | 'armor' | 'traits'>('weapons');
  const [spellsModalOpen, setSpellsModalOpen] = useState(false);

  const isViewer = currentUserRole === 'visualizador';
  const isMaster = currentUserRole === 'mestre';
  const isPlayerChar = npc.characterType === 'player';
  const canEdit = !isViewer && (isMaster || isPlayerChar);

  const hpStat = getHpStatus(npc.hpCurrent, npc.hpMax);
  const fpStat = getFpStatus(npc.fpCurrent, npc.fpMax);

  const currentNpcRef = useRef(npc);
  useEffect(() => {
    currentNpcRef.current = npc;
  }, [npc]);

  // Quick field updates helper (bloqueado para visualizador e protegido contra inconsistências)
  const updateField = <K extends keyof NPC>(field: K, value: NPC[K]) => {
    if (isViewer) return;
    if (!isMaster && !isPlayerChar) {
      // Quando for NPC visualizado por jogador, apenas campos de interação permitidos
      const allowedNpcFields: (keyof NPC)[] = [
        'assistantNotes',
        'turnActions',
        'extraItems',
        'statusConditions',
        'combatManeuver',
      ];
      if (!allowedNpcFields.includes(field)) return;
    }
    const now = Date.now();
    const next = { ...currentNpcRef.current, [field]: value, updatedAt: now };
    currentNpcRef.current = next;
    onUpdateNpc(next);
  };

  // Remove single condition
  const removeCondition = (condLabel: string) => {
    const updated = (npc.statusConditions || []).filter((c) => c !== condLabel);
    updateField('statusConditions', updated);
  };

  // Parries helpers (Default 1, but user can add N, with parryType)
  const parriesList = npc.parries && npc.parries.length > 0
    ? npc.parries
    : [{ id: 'parry-default', weaponName: '', parryType: '', value: 0, notes: '' }];

  const handleAddParry = () => {
    const newParry: ParryEntry = {
      id: `parry-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      weaponName: '',
      parryType: '',
      value: 0,
      notes: '',
    };
    updateField('parries', [...parriesList, newParry]);
  };

  const handleUpdateParry = (index: number, updated: ParryEntry) => {
    const copy = [...parriesList];
    copy[index] = updated;
    updateField('parries', copy);
  };

  const handleRemoveParry = (index: number) => {
    if (parriesList.length <= 1) return;
    const copy = parriesList.filter((_, i) => i !== index);
    updateField('parries', copy);
  };

  const handleRemoveWeapon = (weaponId: string) => {
    const copy = npc.weapons.filter((w) => w.id !== weaponId);
    updateField('weapons', copy);
  };

  // Armor Location helpers
  const handleAddArmorLocation = () => {
    const newLoc: BodyArmorLocation = {
      id: `armor-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      location: 'Nova Localização',
      penalty: '0',
      armorName: '',
      dr: 0,
      notes: '',
    };
    updateField('armorLocations', [...npc.armorLocations, newLoc]);
  };

  const handleUpdateArmorLocation = (index: number, updated: BodyArmorLocation) => {
    const copy = [...npc.armorLocations];
    copy[index] = updated;
    updateField('armorLocations', copy);
  };

  const handleRemoveArmorLocation = (locationId: string) => {
    const copy = npc.armorLocations.filter((l) => l.id !== locationId);
    updateField('armorLocations', copy);
  };

  // Sorted spells: Favorites always at the top
  const sortedSpells = [...npc.spells].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return a.name.localeCompare(b.name);
  });

  const handleToggleSpellFavorite = (spellId: string) => {
    const updated = npc.spells.map((s) =>
      s.id === spellId ? { ...s, isFavorite: !s.isFavorite } : s
    );
    updateField('spells', updated);
  };

  const handleRemoveSpell = (spellId: string) => {
    const list = npc.spells.filter((s) => s.id !== spellId);
    updateField('spells', list);
  };

  // =========================================================================
  // CAMPO DE ALERTAS UNIFICADO (PV, FADIGA, MORTALIDADE, ESTADOS, DEFESAS != 0, SHOCK)
  // =========================================================================
  const turn = npc.turnActions || DEFAULT_TURN_ACTIONS;

  const renderUnifiedAlerts = (isPlayer: boolean) => {
    const alerts: { id: string; badgeClass: string; text: string; icon?: React.ComponentType<{ size?: number; className?: string }> }[] = [];

    // 1. Mortalidade (Apenas para NPCs)
    if (npc.characterType !== 'player' && npc.isDead) {
      alerts.push({
        id: 'dead',
        badgeClass: 'bg-red-950/90 border-red-600 text-red-200 font-black',
        text: 'NPC Morto / Abatido',
        icon: Skull,
      });
    }

    // 2. Pontos de Vida (apenas avisos críticos de regras)
    if (!isPlayer) {
      if (hpStat.warningText) {
        alerts.push({
          id: 'hp-warn',
          badgeClass: 'bg-red-950/90 border-red-600 text-red-300 font-bold',
          text: `PV: ${hpStat.warningText}`,
          icon: AlertTriangle,
        });
      }

      // 3. Fadiga (apenas avisos críticos de regras)
      if (fpStat.warningText) {
        alerts.push({
          id: 'fp-warn',
          badgeClass: 'bg-cyan-950/90 border-cyan-600 text-cyan-300 font-bold',
          text: `Fadiga: ${fpStat.warningText}`,
          icon: Zap,
        });
      }
    }

    // 4. Lista todas as Condições & Estados
    if (npc.statusConditions && npc.statusConditions.length > 0) {
      npc.statusConditions.forEach((cond) => {
        alerts.push({
          id: `cond-${cond}`,
          badgeClass: 'bg-purple-950/80 border-purple-500 text-purple-200 font-semibold',
          text: cond,
        });
      });
    }

    // 5. Defesas & Ações do Turno (sempre que algum valor for diferente de 0)
    if (turn.parryCount > 0) {
      alerts.push({
        id: 'parry',
        badgeClass: 'bg-amber-950/80 border-amber-500 text-amber-300 font-semibold',
        text: `Aparou: ${turn.parryCount}x`,
        icon: Shield,
      });
    }
    if (turn.dodgeCount > 0) {
      alerts.push({
        id: 'dodge',
        badgeClass: 'bg-cyan-950/80 border-cyan-500 text-cyan-300 font-semibold',
        text: `Esquivou: ${turn.dodgeCount}x`,
        icon: Footprints,
      });
    }
    if (turn.blockCount > 0) {
      alerts.push({
        id: 'block',
        badgeClass: 'bg-emerald-950/80 border-emerald-500 text-emerald-300 font-semibold',
        text: `Bloqueou: ${turn.blockCount}x`,
        icon: Shield,
      });
    }
    if (turn.usedRetreat) {
      alerts.push({
        id: 'retreat',
        badgeClass: 'bg-blue-950/80 border-blue-500 text-blue-300 font-semibold',
        text: 'Recuou',
      });
    }
    if (turn.usedFatigueThisTurn) {
      alerts.push({
        id: 'used-fp',
        badgeClass: 'bg-orange-950/80 border-orange-500 text-orange-300 font-semibold',
        text: 'Usou Fadiga',
      });
    }

    // 6. Shock com a quantidade
    if (turn.shock > 0) {
      alerts.push({
        id: 'shock',
        badgeClass: 'bg-rose-950 border-rose-500 text-rose-300 font-black animate-pulse',
        text: `Shock: -${turn.shock}`,
        icon: AlertTriangle,
      });
    }

    if (alerts.length === 0) return null;

    return (
      <div className="flex flex-wrap items-center justify-end gap-1.5 p-2 bg-slate-950/90 border border-slate-800 rounded-xl max-w-2xl shadow-sm">
        {alerts.map((al) => {
          const Icon = al.icon;
          return (
            <span
              key={al.id}
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs border ${al.badgeClass}`}
            >
              {Icon && <Icon size={12} className="shrink-0" />}
              <span>{al.text}</span>
            </span>
          );
        })}
      </div>
    );
  };

  const handleResetTurn = () => {
    updateField('turnActions', {
      ...turn,
      parryCount: 0,
      dodgeCount: 0,
      blockCount: 0,
      usedRetreat: false,
      usedBlockThisTurn: false,
      usedFatigueThisTurn: false,
      fatigueAmountUsed: 0,
      notes: '',
    });
  };

  const handleResetShock = () => {
    updateField('turnActions', {
      ...turn,
      shock: 0,
    });
  };

  const adjustTurnCount = (key: 'parryCount' | 'dodgeCount' | 'blockCount' | 'shock', delta: number) => {
    const current = turn[key] || 0;
    updateField('turnActions', {
      ...turn,
      [key]: Math.max(0, current + delta),
    });
  };

  // Gerenciamento de Itens Extras (Flechas, Pedras de Mana, Escudos, etc.)
  const handleAddExtraItem = (preset?: { name: string; max: number }) => {
    const newItem: ExtraItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: preset?.name || 'Novo Recurso',
      current: preset?.max || 10,
      max: preset?.max || 10,
    };
    const currentList = currentNpcRef.current.extraItems || [];
    const items = [...currentList, newItem];
    systemLogger.addLog(
      'LOCAL_EDIT',
      `Item extra adicionado em "${currentNpcRef.current.name}": ${newItem.name}`,
      newItem
    );
    updateField('extraItems', items);
  };

  const handleUpdateExtraItem = (itemId: string, updates: Partial<ExtraItem>) => {
    const currentList = currentNpcRef.current.extraItems || [];
    const items = currentList.map((it) => (it.id === itemId ? { ...it, ...updates } : it));
    updateField('extraItems', items);
  };

  const handleAdjustExtraItem = (itemId: string, delta: number) => {
    const currentExtra = currentNpcRef.current.extraItems || [];
    const items = currentExtra.map((it) => {
      if (it.id === itemId) {
        const next = Math.max(0, it.current + delta);
        return { ...it, current: next };
      }
      return it;
    });
    updateField('extraItems', items);
  };

  const handleRemoveExtraItem = (itemId: string) => {
    const currentList = currentNpcRef.current.extraItems || [];
    const targetItem = currentList.find((it) => it.id === itemId);
    const items = currentList.filter((it) => it.id !== itemId);
    systemLogger.addLog(
      'DELETE_ITEM',
      `Item extra excluído de "${currentNpcRef.current.name}": ${targetItem?.name || itemId}`,
      { itemId, item: targetItem, remainingItemsCount: items.length }
    );
    updateField('extraItems', items);
  };

  // =========================================================================
  // PERFIL JOGADOR / VISUALIZADOR PARA NPCs
  // (Jogadores e visualizadores NÃO podem ver PV, FP, defesas, atributos ou abas dos NPCs)
  // =========================================================================
  if (isPlayerUser && !isPlayerChar) {
    return (
      <div className="space-y-4">
        {/* Identidade do NPC + Botão Lançar Dano */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 transition-all">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-3.5">
              <NpcAvatar
                avatar={npc.avatar}
                preset={npc.avatarPreset}
                name={npc.name || 'NPC'}
                size="lg"
              />

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-bold text-white">
                    {npc.name || '(Sem Nome)'}
                  </h2>

                  {/* Manobra de Combate do NPC */}
                  {(() => {
                    const activeManeuver = getCombatManeuver(npc.combatManeuver);
                    return (
                      <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 font-semibold">Manobra:</span>
                        <select
                          disabled={isViewer}
                          value={npc.combatManeuver || ''}
                          onChange={(e) => updateField('combatManeuver', e.target.value || undefined)}
                          style={
                            activeManeuver
                              ? {
                                  backgroundColor: activeManeuver.bgHex,
                                  color: activeManeuver.textHex,
                                  borderColor: activeManeuver.borderHex,
                                }
                              : undefined
                          }
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-all border outline-none truncate max-w-[135px] ${
                            activeManeuver
                              ? 'shadow-sm font-bold'
                              : 'text-slate-400 bg-slate-900 border-slate-750 hover:border-slate-600'
                          } ${isViewer ? 'opacity-80 cursor-default' : ''}`}
                          title="Selecionar Manobra de Combate do Turno"
                        >
                          <option value="" className="bg-slate-900 text-slate-300">
                            -- Manobra --
                          </option>
                          {COMBAT_MANEUVERS.map((m) => (
                            <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })()}
                </div>
                {npc.title && (
                  <div className="text-xs text-amber-400 font-medium mt-0.5">{npc.title}</div>
                )}
              </div>
            </div>

            {/* Ações do Jogador: Alerta Geral ao lado do Lançar Dano */}
            <div className="flex items-center justify-end gap-2.5 w-full sm:w-auto min-w-0">
              <div className="min-w-0 flex justify-end">
                {renderUnifiedAlerts(true)}
              </div>

              {!isViewer ? (
                <button
                  onClick={() => onOpenDamageCalculator(npc)}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow transition-colors active:scale-95 whitespace-nowrap shrink-0"
                >
                  <Heart size={15} />
                  <span>Lançar Dano / Fadiga</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-950/40 border border-cyan-800/60 rounded-xl text-cyan-300 text-xs font-semibold shrink-0">
                  <Eye size={14} />
                  <span>Visualizador</span>
                </div>
              )}
            </div>
          </div>

          {/* Campo de Anotações Compartilhado (Jogador e Mestre podem editar) */}
          <div className="bg-slate-950/70 border border-blue-900/40 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-300">
              <Users size={14} className="text-blue-400" />
              <span>Observações Gerais</span>
            </div>
            <textarea
              rows={2}
              value={npc.assistantNotes || ''}
              readOnly={isViewer}
              onChange={(e) => updateField('assistantNotes', e.target.value)}
              placeholder="Digite observações do combate..."
              className="w-full bg-slate-900 border border-slate-750 rounded-lg p-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* ITENS EXTRAS & RECURSOS (Visão do Jogador) */}
          {npc.extraItems && npc.extraItems.length > 0 && (
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                  <Package size={14} />
                  <span>Itens Extras &amp; Recursos (Flechas, Mana, Escudo...)</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {npc.extraItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-900/80 border border-slate-750 rounded-xl p-2.5 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1 flex items-center gap-2">
                      {getItemIcon(item.name)}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate">{item.name}</div>
                        <div className="text-[11px] font-mono text-amber-300">
                          {item.current} <span className="text-slate-500 font-normal">/ {item.max}</span>
                        </div>
                      </div>
                    </div>
                    {!isViewer && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleAdjustExtraItem(item.id, -1)}
                          className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 font-bold text-xs flex items-center justify-center active:scale-95"
                          title="-1 item"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdjustExtraItem(item.id, 1)}
                          className="w-6 h-6 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center active:scale-95"
                          title="+1 item"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Condições & Estados */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Condições & Estados</span>
              {!isViewer && (
                <button
                  onClick={onOpenConditionsCrud}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                  title="Adicionar ou alterar estados"
                >
                  <Plus size={13} />
                  <span>Alterar Estados (CRUD)</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap min-h-[32px]">
              {(!npc.statusConditions || npc.statusConditions.length === 0) ? (
                <span className="text-[11px] text-slate-500 italic">
                  Nenhum estado crítico ativo.
                </span>
              ) : (
                npc.statusConditions.map((cond) => (
                  <span
                    key={cond}
                    className="inline-flex items-center gap-1 bg-red-950/70 border border-red-800 text-red-200 text-[11px] px-2 py-0.5 rounded-lg font-medium"
                  >
                    <span>{cond}</span>
                    {!isViewer && (
                      <button
                        onClick={() => removeCondition(cond)}
                        className="text-red-400 hover:text-white ml-0.5 font-bold"
                        title="Remover estado"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Controle de Defesas & Ações do Turno e Shock */}
          <TurnActionsTracker
            tracker={npc.turnActions || DEFAULT_TURN_ACTIONS}
            onChange={(updated) => updateField('turnActions', updated)}
            npcName={npc.name}
            isReadOnly={isViewer}
          />
        </div>
      </div>
    );
  }

  // =========================================================================
  // PERFIL MESTRE (LAYOUT CLÁSSICO ROBUSTO E COMPLETO)
  // =========================================================================
  return (
    <div className="space-y-4">
      {/* 1. CABEÇALHO DO NPC: Identidade, Badges & Ações Rápidas */}
      <div className={`bg-slate-900 border rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 transition-all ${
        npc.isDead ? 'border-red-900/60 bg-slate-950/90' : 'border-slate-800'
      }`}>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Esquerda: Avatar + Identidade */}
          <div className="flex items-center gap-3.5 w-full lg:w-auto min-w-0">
            {/* Avatar */}
            <div className="relative group shrink-0">
              <NpcAvatar
                avatar={npc.avatar}
                preset={npc.avatarPreset}
                name={npc.name || 'NPC'}
                size="lg"
                onClick={() => !isViewer && onOpenAvatarPicker(npc)}
                className={!isViewer ? 'cursor-pointer' : 'cursor-default'}
              />
              {!isViewer && (
                <button
                  onClick={() => onOpenAvatarPicker(npc)}
                  className="absolute inset-0 bg-black/50 text-white text-[10px] font-semibold opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center transition-opacity"
                >
                  Foto
                </button>
              )}
            </div>

            {/* Identidade */}
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  value={npc.name}
                  readOnly={isViewer}
                  onChange={(e) => updateField('name', e.target.value)}
                  className={`bg-transparent text-xl font-bold border-b border-transparent hover:border-slate-700 focus:border-amber-500 focus:outline-none transition-colors px-1 max-w-[220px] sm:max-w-xs ${
                    npc.characterType !== 'player' && npc.isDead ? 'text-red-300 line-through' : 'text-white'
                  } ${isViewer ? 'cursor-default' : ''}`}
                  placeholder="Nome do Personagem..."
                />

                {npc.characterType !== 'player' && (
                  <input
                    type="text"
                    value={npc.title}
                    readOnly={isViewer}
                    onChange={(e) => updateField('title', e.target.value)}
                    className={`bg-transparent text-xs text-amber-400 font-medium border-b border-transparent hover:border-slate-700 focus:border-amber-500 focus:outline-none transition-colors px-1 max-w-[180px] truncate ${isViewer ? 'cursor-default' : ''}`}
                    placeholder="Título / Cargo..."
                  />
                )}
              </div>

              {/* Linha 2: Status, Tipo e Toggles de Visibilidade / Vida */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {/* Status de Perfil Fixo: Personagem vs NPC */}
                {npc.characterType === 'player' ? (
                  <div
                    className="flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-lg border bg-emerald-950/80 border-emerald-600/70 text-emerald-300 shadow-sm"
                    title="Perfil Fixo: Personagem (não editável)"
                  >
                    <Shield size={12} className="text-emerald-400" />
                    <span>Personagem</span>
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-lg border bg-purple-950/80 border-purple-700/60 text-purple-300 shadow-sm"
                    title="Perfil Fixo: NPC (não editável)"
                  >
                    <Users size={12} className="text-purple-400" />
                    <span>NPC</span>
                  </div>
                )}

                {npc.characterType === 'player' && (
                  <div className="flex items-center gap-1 text-[11px] text-emerald-300 bg-slate-950 px-2 py-0.5 rounded-lg border border-emerald-900/50">
                    <span className="text-slate-400 font-normal">Player:</span>
                    <input
                      type="text"
                      value={npc.playerName || ''}
                      readOnly={isViewer}
                      onChange={(e) => updateField('playerName', e.target.value)}
                      placeholder="Nome real..."
                      className={`bg-transparent text-emerald-300 font-semibold w-20 focus:outline-none placeholder-slate-600 ${isViewer ? 'cursor-default' : ''}`}
                    />
                  </div>
                )}

                {/* Controles exclusivos de NPCs (Ocultos para Personagens Fixos) */}
                {isMaster && npc.characterType !== 'player' && (
                  <>
                    {/* Toggle Visível */}
                    <button
                      type="button"
                      onClick={() => updateField('isVisibleToPlayer', !npc.isVisibleToPlayer)}
                      className={`flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-lg border transition-all ${
                        npc.isVisibleToPlayer
                          ? 'bg-blue-950/80 border-blue-600 text-blue-300 hover:bg-blue-900'
                          : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                      title={npc.isVisibleToPlayer ? 'Visível para os jogadores' : 'Oculto para os jogadores'}
                    >
                      {npc.isVisibleToPlayer ? <Eye size={12} className="text-blue-400" /> : <EyeOff size={12} />}
                      <span>{npc.isVisibleToPlayer ? 'Visível' : 'Oculto'}</span>
                    </button>

                    {/* Toggle Vivo / Morto */}
                    <button
                      type="button"
                      onClick={() => updateField('isDead', !npc.isDead)}
                      className={`flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-lg border transition-all ${
                        npc.isDead
                          ? 'bg-red-950 border-red-600 text-red-300 ring-1 ring-red-600/50 hover:bg-red-900'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                      title={npc.isDead ? 'Marcado como Morto' : 'Marcar como Morto'}
                    >
                      <Skull size={12} className={npc.isDead ? 'text-red-400' : 'text-slate-500'} />
                      <span>{npc.isDead ? 'Morto' : 'Vivo'}</span>
                    </button>
                  </>
                )}
              </div>

              {/* Linha 3: Manobra de Combate e Biometria (Peso & Altura) organizados lado a lado sem quebra */}
              <div className="flex items-center gap-2.5 flex-wrap text-xs pt-0.5">
                {/* Seleção de Manobra de Combate (sem nome da cor, apenas o nome da manobra com sua cor de fundo) */}
                {(() => {
                  const activeManeuver = getCombatManeuver(npc.combatManeuver);
                  return (
                    <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-0.5 rounded-lg border border-slate-800 shrink-0">
                      <span className="text-[10px] text-slate-400 font-semibold">Manobra:</span>
                      <select
                        disabled={isViewer}
                        value={npc.combatManeuver || ''}
                        onChange={(e) => updateField('combatManeuver', e.target.value || undefined)}
                        style={
                          activeManeuver
                            ? {
                                backgroundColor: activeManeuver.bgHex,
                                color: activeManeuver.textHex,
                                borderColor: activeManeuver.borderHex,
                              }
                            : undefined
                        }
                        className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer transition-all border outline-none truncate max-w-[130px] ${
                          activeManeuver
                            ? 'shadow-sm font-bold'
                            : 'text-slate-400 bg-slate-900 border-slate-750 hover:border-slate-600'
                        } ${isViewer ? 'opacity-80 cursor-default' : ''}`}
                        title="Selecionar Manobra de Combate do Turno"
                      >
                        <option value="" className="bg-slate-900 text-slate-300">
                          -- Nenhuma --
                        </option>
                        {COMBAT_MANEUVERS.map((m) => (
                          <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })()}

                {/* Peso & Altura - Agrupamento estável shrink-0 */}
                <div className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-950 px-2.5 py-0.5 rounded-lg border border-slate-800 shrink-0">
                  <span>Peso:</span>
                  <input
                    type="text"
                    value={npc.weight}
                    readOnly={isViewer}
                    onChange={(e) => updateField('weight', e.target.value)}
                    className={`bg-transparent text-slate-200 w-14 text-center focus:outline-none ${isViewer ? 'cursor-default' : ''}`}
                    placeholder="-"
                  />
                  <span className="text-slate-600">|</span>
                  <span>Altura:</span>
                  <input
                    type="text"
                    value={npc.height}
                    readOnly={isViewer}
                    onChange={(e) => updateField('height', e.target.value)}
                    className={`bg-transparent text-slate-200 w-14 text-center focus:outline-none ${isViewer ? 'cursor-default' : ''}`}
                    placeholder="-"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Direita: Alertas Unificados ao lado de Botão Dano + Ações */}
          <div className="flex items-center justify-end gap-2.5 self-start lg:self-center w-full lg:w-auto min-w-0">
            {/* Alertas Unificados (sempre ao lado, com quebra limpa interna se houver muitos) */}
            <div className="min-w-0 flex justify-end">
              {renderUnifiedAlerts(false)}
            </div>

            {/* Bloco de Ações Fixo (shrink-0 para NUNCA cair para baixo dos alertas) */}
            {!isViewer ? (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onOpenDamageCalculator(npc)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow transition-all active:scale-95 whitespace-nowrap shrink-0"
                >
                  <Heart size={15} />
                  <span>Lançar Dano / Fadiga</span>
                </button>

                {isMaster && (
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={() => onDuplicateNpc(npc)}
                      title="Duplicar este personagem com numeração incremental"
                      className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 rounded-lg border border-slate-700 transition-colors flex items-center justify-center"
                    >
                      <Copy size={13} />
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Excluir ${npc.name || 'este personagem'}?`)) {
                          onDeleteNpc(npc.id);
                        }
                      }}
                      title="Excluir este personagem"
                      className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-900/40 rounded-lg border border-rose-800/40 transition-colors flex items-center justify-center"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-950/40 border border-cyan-800/60 rounded-xl text-cyan-300 text-xs font-semibold shrink-0">
                <Eye size={14} />
                <span>Visualizador</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. OBSERVAÇÕES: Duas Colunas (Mestre e Compartilhadas) */}
      <div className={`grid grid-cols-1 ${isMaster ? 'md:grid-cols-2' : ''} gap-3`}>
        {/* Observações Privadas do Mestre */}
        {isMaster && (
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
              <Lock size={13} className="text-amber-400" />
              <span>Observações Privadas do Mestre</span>
            </div>
            <textarea
              rows={2}
              value={npc.masterNotes || ''}
              onChange={(e) => updateField('masterNotes', e.target.value)}
              placeholder="Anotações privadas do mestre, segredos, táticas..."
              className="w-full bg-slate-950/90 border border-amber-500/20 rounded-lg p-2 text-xs text-amber-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        )}

        {/* Observações Gerais Compartilhadas */}
        <div className="bg-blue-950/20 border border-blue-500/30 rounded-xl p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-300">
            <Users size={13} className="text-blue-400" />
            <span>Observações Gerais</span>
          </div>
          <textarea
            rows={2}
            value={npc.assistantNotes || ''}
            readOnly={isViewer}
            onChange={(e) => updateField('assistantNotes', e.target.value)}
            placeholder="Anotações visíveis e editáveis pelo jogador e pelo mestre..."
            className="w-full bg-slate-950/90 border border-blue-500/20 rounded-lg p-2 text-xs text-blue-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 3. GRID PRINCIPAL: Coluna 1 (Vitals & Defesas) | Coluna 2 (Condições & Atributos) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* COLUNA DA ESQUERDA (6 cols): PV & FP, Defesas Ativas, Ações do Turno e Itens Extras */}
        <div className="lg:col-span-6 space-y-3">
          {/* Card: Pontos de Vida e Pontos de Fadiga Lado a Lado (Ampliado verticalmente com fonte maior) */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Pontos de Vida */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                <div className="flex items-center gap-1.5">
                  <Heart size={15} className="text-rose-500" />
                  <span className="uppercase tracking-wider text-xs font-bold">Pontos de Vida</span>
                </div>
                {npc.hpMax > 0 && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${hpStat.badgeBg}`}>
                    {hpStat.label}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-0.5">
                <div className="flex items-center gap-1.5 text-lg font-mono font-black">
                  <input
                    type="number"
                    disabled={isViewer}
                    value={npc.hpCurrent ?? ''}
                    onChange={(e) => updateField('hpCurrent', e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
                    placeholder="Atual"
                    className={`w-14 sm:w-16 bg-slate-950 border border-slate-750 rounded-lg text-center py-1 sm:py-1.5 font-mono font-black text-base sm:text-lg focus:outline-none ${
                      npc.hpCurrent <= 0 ? 'text-red-400' : npc.hpCurrent < npc.hpMax ? 'text-yellow-400' : 'text-emerald-400'
                    } ${isViewer ? 'opacity-90' : ''}`}
                    title="Vida Atual"
                  />
                  <span className="text-slate-500 font-semibold text-sm">/</span>
                  <input
                    type="number"
                    disabled={isViewer}
                    value={npc.hpMax ?? ''}
                    onChange={(e) => updateField('hpMax', e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
                    placeholder="Máx"
                    className={`w-14 sm:w-16 bg-slate-950 border border-slate-750 rounded-lg text-center py-1 sm:py-1.5 text-slate-300 font-mono text-base sm:text-lg font-black focus:outline-none ${isViewer ? 'opacity-90' : ''}`}
                    title="Vida Máxima"
                  />
                </div>

                {!isViewer && (
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateField('hpCurrent', (npc.hpCurrent || 0) - 1)}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 font-mono font-black text-sm flex items-center justify-center active:scale-95"
                      title="-1 Vida"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField('hpCurrent', (npc.hpCurrent || 0) + 1)}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono font-black text-sm flex items-center justify-center active:scale-95"
                      title="+1 Vida"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>

              {/* Barra de Vida */}
              {npc.hpMax > 0 && (
                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden mt-1">
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

            {/* Pontos de Fadiga */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                <div className="flex items-center gap-1.5">
                  <Zap size={15} className="text-cyan-400" />
                  <span className="uppercase tracking-wider text-xs font-bold">Pontos de Fadiga</span>
                </div>
                {npc.fpMax > 0 && (
                  <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded">
                    {fpStat.label}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-0.5">
                <div className="flex items-center gap-1.5 text-lg font-mono font-black">
                  <input
                    type="number"
                    disabled={isViewer}
                    value={npc.fpCurrent ?? ''}
                    onChange={(e) => updateField('fpCurrent', e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
                    placeholder="Atual"
                    className={`w-14 sm:w-16 bg-slate-950 border border-slate-750 rounded-lg text-center py-1 sm:py-1.5 text-cyan-300 font-mono font-black text-base sm:text-lg focus:outline-none ${isViewer ? 'opacity-90' : ''}`}
                    title="Fadiga Atual"
                  />
                  <span className="text-slate-500 font-semibold text-sm">/</span>
                  <input
                    type="number"
                    disabled={isViewer}
                    value={npc.fpMax ?? ''}
                    onChange={(e) => updateField('fpMax', e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
                    placeholder="Máx"
                    className={`w-14 sm:w-16 bg-slate-950 border border-slate-750 rounded-lg text-center py-1 sm:py-1.5 text-slate-300 font-mono text-base sm:text-lg font-black focus:outline-none ${isViewer ? 'opacity-90' : ''}`}
                    title="Fadiga Máxima"
                  />
                </div>

                {!isViewer && (
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateField('fpCurrent', (npc.fpCurrent || 0) - 1)}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono font-black text-sm flex items-center justify-center active:scale-95"
                      title="-1 Fadiga"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField('fpCurrent', (npc.fpCurrent || 0) + 1)}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-black text-sm flex items-center justify-center active:scale-95"
                      title="+1 Fadiga"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>

              {/* Barra de Fadiga */}
              {npc.fpMax > 0 && (
                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden mt-1">
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

          {/* Card: Defesas Ativas (Trocado para a coluna da esquerda) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
              <div className="flex items-center gap-2">
                <Shield size={15} className="text-amber-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Defesas Ativas
                </h3>
              </div>
              {!isViewer && (
                <button
                  onClick={handleAddParry}
                  className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800 hover:border-amber-500/50 transition-colors"
                  title="Adicionar outra arma para cálculo de Aparar"
                >
                  <Plus size={11} />
                  <span>Aparar</span>
                </button>
              )}
            </div>

            {/* Grid de Defesas: Esquiva, Bloqueio e Aparar todos do mesmo tamanho compacto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Card Esquiva */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-1.5 px-2 flex items-center justify-between gap-1.5">
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold text-cyan-300 leading-tight">Esquiva</div>
                  <input
                    type="text"
                    disabled={isViewer}
                    value={npc.dodgeNotes ?? ''}
                    placeholder="Comentário..."
                    onChange={(e) => updateField('dodgeNotes', e.target.value)}
                    className="w-full bg-transparent text-[9px] text-slate-400 placeholder-slate-600 focus:outline-none focus:text-slate-200 truncate mt-0.5"
                    title="Comentário sobre Esquiva (ex: Speed + 3)"
                  />
                </div>
                <input
                  type="number"
                  disabled={isViewer}
                  value={npc.dodge ?? ''}
                  placeholder="-"
                  onChange={(e) => updateField('dodge', e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
                  className={`w-11 bg-slate-900 border border-cyan-800/50 rounded-md text-center font-mono font-black text-xs text-cyan-300 py-0.5 focus:outline-none shrink-0 ${isViewer ? 'opacity-90' : ''}`}
                  title="Valor da Esquiva"
                />
              </div>

              {/* Card Bloqueio */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-1.5 px-2 flex items-center justify-between gap-1.5">
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold text-emerald-300 leading-tight">Bloqueio</div>
                  <input
                    type="text"
                    disabled={isViewer}
                    value={npc.blockNotes ?? ''}
                    placeholder="Comentário..."
                    onChange={(e) => updateField('blockNotes', e.target.value)}
                    className="w-full bg-transparent text-[9px] text-slate-400 placeholder-slate-600 focus:outline-none focus:text-slate-200 truncate mt-0.5"
                    title="Comentário sobre Bloqueio (ex: Escudo / 2 + 3)"
                  />
                </div>
                <input
                  type="number"
                  disabled={isViewer}
                  value={npc.block ?? ''}
                  placeholder="-"
                  onChange={(e) => updateField('block', e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
                  className={`w-11 bg-slate-900 border border-emerald-800/50 rounded-md text-center font-mono font-black text-xs text-emerald-300 py-0.5 focus:outline-none shrink-0 ${isViewer ? 'opacity-90' : ''}`}
                  title="Valor do Bloqueio"
                />
              </div>

              {/* Cards de Aparar no mesmo formato e tamanho dos de Esquiva e Bloqueio */}
              {parriesList.map((parry, idx) => (
                <div
                  key={parry.id}
                  className="bg-slate-950/90 border border-slate-800 rounded-lg p-1.5 px-2 flex items-center justify-between gap-1.5"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-[10px] font-bold text-amber-400 shrink-0">Aparar:</span>
                      <input
                        type="text"
                        disabled={isViewer}
                        value={parry.weaponName}
                        onChange={(e) => handleUpdateParry(idx, { ...parry, weaponName: e.target.value })}
                        placeholder="Nome da arma..."
                        className="w-full bg-transparent text-[11px] font-bold text-amber-200 placeholder-slate-600 focus:outline-none truncate"
                        title="Nome da arma de Aparar"
                      />
                    </div>
                    <input
                      type="text"
                      disabled={isViewer}
                      value={parry.notes ?? ''}
                      placeholder="Comentário..."
                      onChange={(e) => handleUpdateParry(idx, { ...parry, notes: e.target.value })}
                      className="w-full bg-transparent text-[9px] text-slate-400 placeholder-slate-600 focus:outline-none focus:text-slate-200 truncate mt-0.5"
                      title="Comentário sobre Aparar"
                    />
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      disabled={isViewer}
                      value={parry.value ?? ''}
                      placeholder="-"
                      onChange={(e) =>
                        handleUpdateParry(idx, {
                          ...parry,
                          value: e.target.value === '' ? 0 : parseInt(e.target.value, 10),
                        })
                      }
                      className={`w-11 bg-slate-900 border border-amber-500/40 rounded-md text-center font-mono font-black text-xs text-amber-300 py-0.5 focus:outline-none ${isViewer ? 'opacity-90' : ''}`}
                      title="Valor do Aparar"
                    />
                    {!isViewer && parriesList.length > 1 && (
                      <button
                        onClick={() => handleRemoveParry(idx)}
                        className="text-slate-500 hover:text-rose-400 font-bold text-xs p-0.5 transition-colors"
                        title="Remover este Aparar"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card: ITENS EXTRAS & RECURSOS (Flechas, Pedras de Mana, Escudos, etc.) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
              <div className="flex items-center gap-2">
                <Package size={15} className="text-amber-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Itens Extras &amp; Recursos
                </h3>
              </div>

              {/* Botões de Adição Rápida */}
              {!isViewer && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleAddExtraItem({ name: 'Flechas', max: 20 })}
                    className="text-[10px] font-bold text-amber-300 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-800/60 px-2 py-0.5 rounded-lg transition-colors"
                    title="Cadastrar Flechas (Total: 20)"
                  >
                    + Flechas
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddExtraItem({ name: 'Pedras de Mana', max: 5 })}
                    className="text-[10px] font-bold text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/60 px-2 py-0.5 rounded-lg transition-colors"
                    title="Cadastrar Pedras de Mana (Total: 5)"
                  >
                    + Mana
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddExtraItem({ name: 'Escudo', max: 30 })}
                    className="text-[10px] font-bold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/60 px-2 py-0.5 rounded-lg transition-colors"
                    title="Cadastrar Escudo (Durabilidade: 30)"
                  >
                    + Escudo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddExtraItem()}
                    className="p-1 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                    title="Adicionar outro recurso personalizado"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              )}
            </div>

            {/* Lista de Itens Extras */}
            {(!npc.extraItems || npc.extraItems.length === 0) ? (
              <div className="py-2.5 text-center text-xs text-slate-500 italic">
                Nenhum item extra cadastrado.
              </div>
            ) : (
              <div className="space-y-1.5">
                {npc.extraItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-950/90 border border-slate-800 rounded-xl p-2 flex items-center justify-between gap-2 hover:border-slate-750 transition-colors"
                  >
                    {/* Nome do Item com Ícone */}
                    <div className="flex-1 min-w-0 flex items-center gap-1.5">
                      {getItemIcon(item.name)}
                      <input
                        type="text"
                        disabled={isViewer}
                        value={item.name}
                        onChange={(e) => handleUpdateExtraItem(item.id, { name: e.target.value })}
                        className={`w-full bg-transparent text-xs font-bold text-white focus:outline-none focus:border-b focus:border-amber-500 ${isViewer ? 'cursor-default' : ''}`}
                        placeholder="Nome do Item..."
                      />
                    </div>

                    {/* Inputs Atual / Total */}
                    <div className="flex items-center gap-1 text-xs font-mono font-bold">
                      <input
                        type="number"
                        min="0"
                        disabled={isViewer}
                        value={item.current ?? ''}
                        onChange={(e) =>
                          handleUpdateExtraItem(item.id, {
                            current: e.target.value === '' ? 0 : parseInt(e.target.value, 10),
                          })
                        }
                        className={`w-12 bg-slate-900 border border-slate-750 rounded-lg text-center py-0.5 text-amber-300 focus:outline-none ${isViewer ? 'opacity-90' : ''}`}
                        title="Quantidade Atual"
                      />
                      <span className="text-slate-500 font-normal">/</span>
                      <input
                        type="number"
                        min="0"
                        disabled={isViewer}
                        value={item.max ?? ''}
                        onChange={(e) =>
                          handleUpdateExtraItem(item.id, {
                            max: e.target.value === '' ? 0 : parseInt(e.target.value, 10),
                          })
                        }
                        className={`w-12 bg-slate-900 border border-slate-750 rounded-lg text-center py-0.5 text-slate-400 focus:outline-none ${isViewer ? 'opacity-90' : ''}`}
                        title="Quantidade Total / Máxima"
                      />
                    </div>

                    {/* Botões Rápidos - e + */}
                    {!isViewer && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleAdjustExtraItem(item.id, -1)}
                          className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 font-bold text-xs flex items-center justify-center active:scale-95"
                          title="-1 item"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdjustExtraItem(item.id, 1)}
                          className="w-6 h-6 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center active:scale-95"
                          title="+1 item"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveExtraItem(item.id)}
                          className="text-slate-500 hover:text-rose-400 font-bold px-1 text-sm ml-0.5"
                          title="Excluir item"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* COLUNA DA DIREITA (6 cols): Condições & Estados Críticos e Atributos GURPS */}
        <div className="lg:col-span-6 space-y-3">
          {/* Card: Condições & Estados Críticos */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Condições &amp; Estados Críticos
              </span>
              {!isViewer && (
                <button
                  onClick={onOpenConditionsCrud}
                  className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800 hover:border-amber-500/50 transition-colors"
                  title="Gerenciar lista de condições"
                >
                  <Plus size={12} />
                  <span>Gerenciar</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap min-h-[32px]">
              {(!npc.statusConditions || npc.statusConditions.length === 0) ? (
                <span className="text-[11px] text-slate-500 italic">
                  Nenhum estado crítico ativo no momento.
                </span>
              ) : (
                npc.statusConditions.map((cond) => (
                  <span
                    key={cond}
                    className="inline-flex items-center gap-1 bg-red-950/70 border border-red-800 text-red-200 text-[11px] px-2 py-0.5 rounded-lg font-medium"
                  >
                    <span>{cond}</span>
                    {!isViewer && (
                      <button
                        onClick={() => removeCondition(cond)}
                        className="text-red-400 hover:text-white font-bold ml-0.5"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Card: Controle de Defesas & Ações do Turno */}
          <TurnActionsTracker
            tracker={npc.turnActions || DEFAULT_TURN_ACTIONS}
            onChange={(updated) => updateField('turnActions', updated)}
            npcName={npc.name}
            isReadOnly={isViewer}
          />

          {/* Card: Atributos GURPS (Primários e Secundários) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-3">
            {/* Primários */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                Atributos Primários
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { key: 'st', label: 'ST', val: npc.st },
                  { key: 'dx', label: 'DX', val: npc.dx },
                  { key: 'iq', label: 'IQ', val: npc.iq },
                  { key: 'ht', label: 'HT', val: npc.ht },
                ].map(({ key, label, val }) => (
                  <div key={key} className="bg-slate-950 border border-slate-800 rounded-xl p-2 flex flex-col items-center justify-center text-center">
                    <div className="text-[10px] font-bold text-slate-400 mb-0.5 text-center w-full">{label}</div>
                    <input
                      type="number"
                      disabled={isViewer}
                      value={val ?? ''}
                      placeholder="-"
                      onChange={(e) =>
                        updateField(key as any, e.target.value === '' ? 0 : parseInt(e.target.value, 10))
                      }
                      className={`w-full bg-transparent text-center font-mono font-black text-sm text-amber-300 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isViewer ? 'opacity-90' : ''}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Secundários */}
            <div className="space-y-1.5 border-t border-slate-800/80 pt-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Atributos Secundários
              </div>
              <div className="grid grid-cols-5 gap-1.5 text-center">
                {[
                  { key: 'per', label: 'Per', val: npc.per, step: '1' },
                  { key: 'will', label: 'Will', val: npc.will, step: '1' },
                  { key: 'basicSpeed', label: 'Speed', val: npc.basicSpeed, step: '0.25' },
                ].map(({ key, label, val, step }) => (
                  <div key={key} className="bg-slate-950 border border-slate-800 rounded-lg p-1.5 flex flex-col items-center justify-center text-center">
                    <div className="text-[9px] font-bold text-slate-400 text-center w-full">
                      {label}
                    </div>
                    <input
                      type="number"
                      step={step}
                      disabled={isViewer}
                      value={val ?? ''}
                      placeholder="-"
                      onChange={(e) =>
                        updateField(
                          key as any,
                          e.target.value === ''
                            ? 0
                            : step === '0.25'
                            ? parseFloat(e.target.value)
                            : parseInt(e.target.value, 10)
                        )
                      }
                      className={`w-full bg-transparent text-center font-mono font-bold text-xs text-slate-200 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isViewer ? 'opacity-90' : ''}`}
                    />
                  </div>
                ))}

                {/* Move com suporte a texto flexível (ex: "6 (-1 Peso)") */}
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-1.5 flex flex-col items-center justify-center text-center">
                  <div className="text-[9px] font-bold text-slate-400 text-center w-full">Move</div>
                  <input
                    type="text"
                    disabled={isViewer}
                    value={npc.basicMove ?? ''}
                    placeholder="Ex: 6 (-1)"
                    onChange={(e) => updateField('basicMove', e.target.value)}
                    className={`w-full bg-transparent text-center font-mono font-bold text-xs text-slate-200 focus:outline-none ${isViewer ? 'opacity-90' : ''}`}
                    title="Deslocamento / Move (aceita texto como '6 (-1 Peso)')"
                  />
                </div>

                {/* RD Natural */}
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-1.5 flex flex-col items-center justify-center text-center">
                  <div className="text-[9px] font-bold text-amber-300 text-center w-full">RD Nat.</div>
                  <input
                    type="number"
                    step="1"
                    disabled={isViewer}
                    value={npc.naturalDr ?? ''}
                    placeholder="-"
                    onChange={(e) =>
                      updateField('naturalDr', e.target.value === '' ? 0 : parseInt(e.target.value, 10))
                    }
                    className={`w-full bg-transparent text-center font-mono font-black text-xs text-amber-300 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isViewer ? 'opacity-90' : ''}`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 7. TABS NAVIGATION */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('weapons')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'weapons'
              ? 'bg-amber-500 text-slate-950 font-bold shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sword size={14} />
          <span>Armas & Ataques ({npc.weapons.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('spells')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'spells'
              ? 'bg-amber-500 text-slate-950 font-bold shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles size={14} />
          <span>Magias ({npc.spells.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('armor')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'armor'
              ? 'bg-amber-500 text-slate-950 font-bold shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Shield size={14} />
          <span>Armadura por Localização ({npc.armorLocations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('traits')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'traits'
              ? 'bg-amber-500 text-slate-950 font-bold shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Info size={14} />
          <span>Traços & Equipamentos</span>
        </button>
      </div>

      {/* 8. TAB CONTENT: ARMAS & ATAQUES (NH MAIOR + PERÍCIAS E PERKS DE COMBATE ABAIXO) */}
      {activeTab === 'weapons' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Sword size={18} className="text-amber-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Armas & Ataques
                  </h3>
                </div>
              </div>

              {!isViewer && (
                <button
                  onClick={() => onOpenWeaponModal()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-colors"
                >
                  <Plus size={14} />
                  <span>Cadastrar Arma</span>
                </button>
              )}
            </div>

            {npc.weapons.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 italic space-y-2">
                <p>Nenhuma arma cadastrada para este personagem.</p>
                {!isViewer && (
                  <button
                    onClick={() => onOpenWeaponModal()}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs"
                  >
                    + Cadastrar Primeira Arma
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {npc.weapons.map((w) => (
                  <div
                    key={w.id}
                    className="p-3.5 bg-slate-950/80 border border-slate-800 hover:border-slate-750 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    {/* Left: Weapon Name & NH bem maior em destaque */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* NH BEM MAIOR PARA VISUALIZAÇÃO ÁGIL DO MESTRE */}
                      <div className="flex flex-col items-center justify-center bg-amber-950/60 border border-amber-500/60 px-3.5 py-1.5 rounded-xl shrink-0 shadow-sm min-w-[56px]">
                        <span className="text-[9px] text-amber-400 font-extrabold uppercase tracking-widest leading-none">NH</span>
                        <span className={`font-mono font-black text-amber-300 tabular-nums leading-tight ${String(w.nh || '').length > 3 ? 'text-lg' : 'text-2xl'}`}>
                          {w.nh}
                        </span>
                      </div>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-baseline gap-2 flex-wrap min-w-0">
                          <span className="font-bold text-white text-base leading-tight">
                            {w.name}
                          </span>
                          {w.notes && (
                            <span className="text-[11px] text-amber-200/90 italic font-normal">
                              • {w.notes}
                            </span>
                          )}
                        </div>

                        {/* Múltiplos Modos de Ataque (Dano / Tipo / Alcance) */}
                        {w.modes && w.modes.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            {w.modes.map((m, i) => (
                              <div
                                key={m.id || i}
                                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] font-mono flex items-center gap-2 text-slate-300"
                              >
                                {m.name && <span className="font-bold text-amber-300 font-sans">{m.name}:</span>}
                                <span>Dano: <strong className="text-white">{m.damage}</strong></span>
                                {m.type && <span className="text-slate-400 font-sans">({m.type})</span>}
                                {m.reach && <span className="text-slate-400">Alc: {m.reach}</span>}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300 font-mono">
                            {w.damage && <span>Dano: <strong className="text-white">{w.damage}</strong></span>}
                            {w.type && <span>({w.type})</span>}
                            {w.reach && <span>· Alcance: {w.reach}</span>}
                          </div>
                        )}
                      </div>
                    </div>

                    {!isViewer && (
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => onOpenWeaponModal(w)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors"
                          title="Editar arma"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleRemoveWeapon(w.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
                          title="Excluir arma"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* DOIS CAMPOS ABAIXO DAS ARMAS: PERÍCIAS DE COMBATE E PERK DE COMBATE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Perícias de Combate */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-amber-400 block">
                Perícias de Combate
              </label>
              <textarea
                rows={3}
                value={npc.combatSkills || ''}
                readOnly={isViewer}
                onChange={(e) => updateField('combatSkills', e.target.value)}
                placeholder="Ex: Espada Larga-14, Escudo-13, Briga-12, Luta no Chão-11..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Perk / Peculiaridades de Combate */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-amber-400 block">
                Perk / Peculiaridades de Combate
              </label>
              <textarea
                rows={3}
                value={npc.combatPerks || ''}
                readOnly={isViewer}
                onChange={(e) => updateField('combatPerks', e.target.value)}
                placeholder="Ex: Puxada Rápida, Postura Firme, Lutar no Escuro, Pele Grossa..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* 9. TAB CONTENT: MAGIAS */}
      {activeTab === 'spells' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Grimório de Magias
                </h3>
              </div>
            </div>

            {!isViewer && (
              <button
                onClick={() => setSpellsModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-colors self-start sm:self-auto"
              >
                <Plus size={14} />
                <span>Gerenciar / Cadastrar Magias</span>
              </button>
            )}
          </div>

          {/* 3-Column Grid of Spells */}
          {npc.spells.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 italic space-y-2">
              <p>Nenhuma magia cadastrada.</p>
              {!isViewer && (
                <button
                  onClick={() => setSpellsModalOpen(true)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs"
                >
                  + Abrir Cadastro de Magias
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {sortedSpells.map((s) => (
                <div
                  key={s.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                    s.isFavorite
                      ? 'bg-amber-950/30 border-amber-500/60 ring-1 ring-amber-500/30'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-750'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {!isViewer ? (
                      <button
                        type="button"
                        onClick={() => handleToggleSpellFavorite(s.id)}
                        className={`p-1 rounded transition-colors shrink-0 ${
                          s.isFavorite
                            ? 'text-amber-400 hover:text-amber-300'
                            : 'text-slate-600 hover:text-slate-400'
                        }`}
                        title={s.isFavorite ? 'Remover dos favoritos' : 'Favoritar magia'}
                      >
                        <Star size={16} fill={s.isFavorite ? 'currentColor' : 'none'} />
                      </button>
                    ) : (
                      <span className="p-1 shrink-0">
                        <Star size={16} fill={s.isFavorite ? 'currentColor' : 'none'} className={s.isFavorite ? 'text-amber-400' : 'text-slate-600'} />
                      </span>
                    )}

                    <span className="text-xs font-semibold text-white truncate">
                      {s.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-xs font-bold text-amber-300 bg-slate-900 border border-amber-500/40 px-2 py-0.5 rounded">
                      NH {s.nh}
                    </span>

                    {!isViewer && (
                      <button
                        onClick={() => handleRemoveSpell(s.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Excluir magia"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 10. TAB CONTENT: ARMADURA POR LOCALIZAÇÃO */}
      {activeTab === 'armor' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Armadura por Localização
                </h3>
              </div>
            </div>

            {!isViewer && (
              <button
                onClick={handleAddArmorLocation}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-colors"
              >
                <Plus size={14} />
                <span>+ Adicionar Localização</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold text-[11px]">
                  <th className="pb-2 w-40 pl-2">Local do Corpo</th>
                  <th className="pb-2 min-w-[140px]">Peça de Armadura</th>
                  <th className="pb-2 w-24">RD Base</th>
                  <th className="pb-2 w-24">Modif. RD</th>
                  <th className="pb-2 min-w-[160px]">Dano que Interfere</th>
                  {!isViewer && <th className="pb-2 w-12 text-center">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {npc.armorLocations.map((loc, idx) => (
                  <tr key={loc.id} className="hover:bg-slate-850/50">
                    <td className="py-2.5 pl-2 font-semibold text-slate-200 text-xs">
                      <input
                        type="text"
                        disabled={isViewer}
                        value={loc.location}
                        onChange={(e) =>
                          handleUpdateArmorLocation(idx, { ...loc, location: e.target.value })
                        }
                        className={`w-full max-w-[170px] bg-transparent border-b border-transparent hover:border-slate-700 focus:border-amber-500 focus:outline-none text-slate-200 text-xs px-1 ${isViewer ? 'cursor-default' : ''}`}
                        placeholder="Local..."
                      />
                    </td>

                    <td className="py-2.5">
                      <input
                        type="text"
                        disabled={isViewer}
                        value={loc.armorName}
                        onChange={(e) =>
                          handleUpdateArmorLocation(idx, { ...loc, armorName: e.target.value })
                        }
                        className={`w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs ${isViewer ? 'cursor-default opacity-90' : ''}`}
                      />
                    </td>

                    <td className="py-2.5">
                      <div className="flex items-center gap-1 font-mono">
                        <input
                          type="number"
                          min="0"
                          disabled={isViewer}
                          value={loc.dr || ''}
                          placeholder="0"
                          onChange={(e) =>
                            handleUpdateArmorLocation(idx, {
                              ...loc,
                              dr: e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10)),
                            })
                          }
                          className={`w-14 bg-slate-950 border border-amber-600/60 rounded px-1 py-1 text-center font-bold text-amber-300 ${isViewer ? 'opacity-90' : ''}`}
                        />
                        {npc.naturalDr > 0 && (
                          <span className="text-[10px] text-slate-500" title={`RD Natural: +${npc.naturalDr}`}>
                            (+{npc.naturalDr})
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Modificador RD (ex: -2, +1) */}
                    <td className="py-2.5">
                      <div className="flex items-center gap-1 font-mono">
                        <input
                          type="number"
                          disabled={isViewer}
                          value={loc.drModifier !== undefined && loc.drModifier !== 0 ? loc.drModifier : ''}
                          placeholder="0"
                          onChange={(e) =>
                            handleUpdateArmorLocation(idx, {
                              ...loc,
                              drModifier: e.target.value === '' ? 0 : parseInt(e.target.value, 10),
                            })
                          }
                          className={`w-14 bg-slate-950 border rounded px-1 py-1 text-center font-bold text-xs focus:outline-none ${
                            (loc.drModifier || 0) < 0
                              ? 'text-rose-400 border-rose-800/80 bg-rose-950/20'
                              : (loc.drModifier || 0) > 0
                              ? 'text-emerald-400 border-emerald-800/80 bg-emerald-950/20'
                              : 'text-slate-400 border-slate-800'
                          } ${isViewer ? 'opacity-90' : ''}`}
                          title="Modificador de RD (ex: -2 para -2 RD, +1 para +1 RD)"
                        />
                      </div>
                    </td>

                    {/* Tipo de Dano que Interfere */}
                    <td className="py-2.5">
                      <select
                        disabled={isViewer}
                        value={loc.modifierDamageType || ''}
                        onChange={(e) =>
                          handleUpdateArmorLocation(idx, {
                            ...loc,
                            modifierDamageType: e.target.value,
                          })
                        }
                        className={`w-full bg-slate-950 border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                          loc.modifierDamageType
                            ? 'text-amber-300 border-amber-600/70 font-semibold'
                            : 'text-slate-500 border-slate-800'
                        } ${isViewer ? 'cursor-default opacity-90' : ''}`}
                      >
                        <option value="" className="bg-slate-900 text-slate-400">-- Nenhum --</option>
                        <option value="contusao" className="bg-slate-900 text-amber-200">Contusão (crushing)</option>
                        <option value="corte" className="bg-slate-900 text-amber-200">Corte (cutting)</option>
                        <option value="empalamento" className="bg-slate-900 text-amber-200">Empalamento (impaling)</option>
                        <option value="perfurante" className="bg-slate-900 text-amber-200">Perfurante (piercing)</option>
                        <option value="queima" className="bg-slate-900 text-amber-200">Queimadura (burning)</option>
                      </select>
                    </td>

                    {!isViewer && (
                      <td className="py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveArmorLocation(loc.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                          title="Remover esta localização de armadura"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 11. TAB CONTENT: TRAÇOS & EQUIPAMENTOS (LIMPO CONFORME SOLICITADO) */}
      {activeTab === 'traits' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vantagens */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-amber-400 block">
                Vantagens
              </label>
              <textarea
                rows={3}
                value={npc.advantages}
                readOnly={isViewer}
                onChange={(e) => updateField('advantages', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Desvantagens */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-rose-400 block">
                Desvantagens
              </label>
              <textarea
                rows={3}
                value={npc.disadvantages}
                readOnly={isViewer}
                onChange={(e) => updateField('disadvantages', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Perícias Gerais */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-amber-400 block">
                Perícias Gerais
              </label>
              <textarea
                rows={3}
                value={npc.skills}
                readOnly={isViewer}
                onChange={(e) => updateField('skills', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Equipamentos Carregados */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                Equipamentos Carregados (Inventory)
              </label>
              <textarea
                rows={3}
                value={npc.equipment}
                readOnly={isViewer}
                onChange={(e) => updateField('equipment', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Spells Modal */}
      <SpellsModal
        isOpen={spellsModalOpen}
        onClose={() => setSpellsModalOpen(false)}
        spells={npc.spells}
        onSave={(updatedSpells) => updateField('spells', updatedSpells)}
        npcName={npc.name || 'NPC'}
      />
    </div>
  );
};
