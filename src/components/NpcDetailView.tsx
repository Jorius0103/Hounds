import React, { useState, useRef, useEffect, useMemo } from 'react';
import { NPC, Weapon, ParryEntry, BodyArmorLocation, ExtraItem, UserRole, ArmorKit } from '../types/rpg';
import { NpcAvatar } from './NpcAvatar';
import {
  getHpStatus,
  getFpStatus,
  DEFAULT_TURN_ACTIONS,
  COMBAT_MANEUVERS,
  getCombatManeuver,
  getConditionDescription,
  createDefaultArmorLocations,
  createDefaultArmorKit,
  calculateLocationHp,
  isSameLocation,
} from '../utils/gurps';
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
  Check,
  Layers,
} from 'lucide-react';

const getItemIcon = (name: string, category?: string) => {
  const cat = category || '';
  if (cat === 'mana') return <Sparkles size={14} className="text-cyan-400 shrink-0" />;
  if (cat === 'shield') return <Shield size={14} className="text-emerald-400 shrink-0" />;
  if (cat === 'arrows') return <Target size={14} className="text-amber-400 shrink-0" />;
  if (cat === 'other') return <Package size={14} className="text-slate-400 shrink-0" />;

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
  onRemoveActiveSpell?: (casterId: string, spellId: string) => void;
  onRemoveAffectedSpell?: (targetId: string, spellId: string) => void;
  isPlayerUser?: boolean;
  currentUserRole?: UserRole;
  hasEditPermission?: boolean;
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
  onRemoveActiveSpell,
  onRemoveAffectedSpell,
  isPlayerUser = false,
  currentUserRole = 'mestre',
  hasEditPermission = false,
}) => {
  const [activeTab, setActiveTab] = useState<'weapons' | 'spells' | 'armor' | 'traits'>('weapons');
  const [spellsModalOpen, setSpellsModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const isMaster = currentUserRole === 'mestre';
  const isViewer = !isMaster && !hasEditPermission;
  const isPlayerChar = npc.characterType === 'player';
  const canEdit = !isViewer && (isMaster || isPlayerChar);

  const hpStat = getHpStatus(npc.hpCurrent, npc.hpMax);
  const fpStat = getFpStatus(npc.fpCurrent, npc.fpMax);

  const currentNpcRef = useRef(npc);
  useEffect(() => {
    currentNpcRef.current = npc;
  }, [npc]);

  // Estados para lançamento manual rápido de Magias Ativas
  const [isAddingActiveSpell, setIsAddingActiveSpell] = useState(false);
  const [manualActiveSpellName, setManualActiveSpellName] = useState('');
  const [manualActiveSpellCost, setManualActiveSpellCost] = useState<number | ''>('');
  const [manualActiveSpellRound, setManualActiveSpellRound] = useState<number>(1);
  const [manualActiveSpellIsArea, setManualActiveSpellIsArea] = useState(false);
  const [manualActiveSpellTargetName, setManualActiveSpellTargetName] = useState('');

  // Estados para inclusão manual de Magias Sob Efeito
  const [isAddingAffectedSpell, setIsAddingAffectedSpell] = useState(false);
  const [manualAffectedSpellName, setManualAffectedSpellName] = useState('');
  const [manualAffectedSpellCaster, setManualAffectedSpellCaster] = useState('');
  const [manualAffectedSpellRound, setManualAffectedSpellRound] = useState<number>(1);

  // Helper para favoritar / desfavoritar Itens Extras & Recursos
  const handleToggleFavoriteExtraItem = (itemId: string) => {
    if (isViewer) return;
    if (!isMaster && !isPlayerChar) return;
    const currentList = currentNpcRef.current.extraItems || [];
    const items = currentList.map((it) =>
      it.id === itemId ? { ...it, isFavorite: !it.isFavorite } : it
    );
    updateField('extraItems', items);
  };

  const handleConfirmManualActiveSpell = () => {
    if (!manualActiveSpellName.trim()) return;
    const targetName = manualActiveSpellIsArea
      ? 'Área / Ambiente'
      : (manualActiveSpellTargetName.trim() || npc.name);
    const newEntry = {
      id: `spell-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      spellName: manualActiveSpellName.trim(),
      targetId: manualActiveSpellIsArea ? 'area' : npc.id,
      targetName: targetName,
      round: Number(manualActiveSpellRound) || 1,
      cost: typeof manualActiveSpellCost === 'number' ? manualActiveSpellCost : 0,
      createdAt: new Date().toISOString(),
    };
    const nextList = [...(npc.activeSpells || []), newEntry];
    updateField('activeSpells', nextList);

    // Se houver custo de fadiga e o usuário informou, atualiza fpCurrent
    if (typeof manualActiveSpellCost === 'number' && manualActiveSpellCost > 0) {
      updateField('fpCurrent', Math.max(-npc.fpMax, (npc.fpCurrent || 0) - manualActiveSpellCost));
    }

    setManualActiveSpellName('');
    setManualActiveSpellCost('');
    setManualActiveSpellRound(1);
    setManualActiveSpellIsArea(false);
    setManualActiveSpellTargetName('');
    setIsAddingActiveSpell(false);
  };

  const handleConfirmManualAffectedSpell = () => {
    if (!manualAffectedSpellName.trim()) return;
    const newEntry = {
      id: `effect-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      spellName: manualAffectedSpellName.trim(),
      casterName: manualAffectedSpellCaster.trim() || 'Desconhecido',
      round: Number(manualAffectedSpellRound) || 1,
      createdAt: new Date().toISOString(),
    };
    const nextList = [...(npc.affectedSpells || []), newEntry];
    updateField('affectedSpells', nextList);
    setManualAffectedSpellName('');
    setManualAffectedSpellCaster('');
    setManualAffectedSpellRound(1);
    setIsAddingAffectedSpell(false);
  };

  // Lista de campos com valores totais/atributos base que apenas o Mestre pode alterar
  const masterOnlyFields: (keyof NPC)[] = [
    'hpMax',
    'fpMax',
    'dodge',
    'dodgeNotes',
    'block',
    'blockNotes',
    'parries',
    'st',
    'dx',
    'iq',
    'ht',
    'per',
    'will',
    'basicSpeed',
    'basicMove',
    'naturalDr',
  ];

  // Quick field updates helper (bloqueado para visualizador e protegido contra inconsistências)
  const updateField = <K extends keyof NPC>(field: K, value: NPC[K]) => {
    if (isViewer) return;
    if (!isMaster && masterOnlyFields.includes(field)) return;
    if (!isMaster && !isPlayerChar) {
      // Quando for NPC visualizado por jogador editor, apenas campos de combate/interação permitidos
      const allowedNpcFields: (keyof NPC)[] = [
        'assistantNotes',
        'turnActions',
        'extraItems',
        'statusConditions',
        'combatManeuver',
        'hpCurrent',
        'fpCurrent',
        'activeSpells',
        'affectedSpells',
        'isDead',
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
    if (!isMaster) return;
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
    if (!isMaster) return;
    const copy = [...parriesList];
    copy[index] = updated;
    updateField('parries', copy);
  };

  const handleRemoveParry = (index: number) => {
    if (!isMaster || parriesList.length <= 1) return;
    const copy = parriesList.filter((_, i) => i !== index);
    updateField('parries', copy);
  };

  const handleRemoveWeapon = (weaponId: string) => {
    const copy = npc.weapons.filter((w) => w.id !== weaponId);
    updateField('weapons', copy);
  };

  // Armor Kits & Locations helpers
  const kits: ArmorKit[] = useMemo(() => {
    if (npc.armorKits && npc.armorKits.length > 0) {
      return npc.armorKits;
    }
    const locs = npc.armorLocations && npc.armorLocations.length > 0
      ? npc.armorLocations
      : createDefaultArmorLocations(npc.id);
    return [
      {
        id: npc.activeArmorKitId || `kit-${npc.id}-1`,
        name: 'Kit Principal',
        isActive: true,
        locations: locs,
      },
    ];
  }, [npc.armorKits, npc.activeArmorKitId, npc.armorLocations, npc.id]);

  const [selectedKitId, setSelectedKitId] = useState<string>(
    npc.activeArmorKitId || kits[0]?.id || 'kit-principal'
  );

  useEffect(() => {
    if (!kits.some((k) => k.id === selectedKitId) && kits[0]) {
      setSelectedKitId(kits[0].id);
    }
  }, [kits, selectedKitId]);

  const currentKit = useMemo(() => {
    return kits.find((k) => k.id === selectedKitId) || kits[0];
  }, [kits, selectedKitId]);

  const currentLocations = currentKit?.locations || npc.armorLocations;

  const handleAddArmorKit = () => {
    if (isViewer) return;
    const newKitId = `kit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newKit: ArmorKit = {
      id: newKitId,
      name: `Kit de Armadura ${kits.length + 1}`,
      isActive: false,
      locations: createDefaultArmorLocations(npc.id),
    };
    const nextKits = [...kits, newKit];
    updateField('armorKits', nextKits);
    setSelectedKitId(newKitId);
  };

  const handleEquipArmorKit = (kitId: string) => {
    if (isViewer) return;
    const targetKit = kits.find((k) => k.id === kitId);
    if (!targetKit) return;
    const nextKits = kits.map((k) => ({
      ...k,
      isActive: k.id === kitId,
    }));
    updateField('armorKits', nextKits);
    updateField('activeArmorKitId', kitId);
    updateField('armorLocations', targetKit.locations);
  };

  const handleRemoveArmorKit = (kitId: string) => {
    if (isViewer || kits.length <= 1) return;
    const nextKits = kits.filter((k) => k.id !== kitId);
    let nextActiveId = npc.activeArmorKitId;
    if (kitId === npc.activeArmorKitId || !nextKits.some((k) => k.id === nextActiveId)) {
      nextKits[0].isActive = true;
      nextActiveId = nextKits[0].id;
      updateField('armorLocations', nextKits[0].locations);
    }
    updateField('armorKits', nextKits);
    updateField('activeArmorKitId', nextActiveId);
    if (selectedKitId === kitId) {
      setSelectedKitId(nextKits[0].id);
    }
  };

  const [editingKitId, setEditingKitId] = useState<string | null>(null);
  const [editingKitNameDraft, setEditingKitNameDraft] = useState<string>('');

  const handleStartRenameKit = (kit: ArmorKit) => {
    if (isViewer) return;
    setEditingKitId(kit.id);
    setEditingKitNameDraft(kit.name);
  };

  const handleSaveRenameKit = () => {
    if (!editingKitId || !editingKitNameDraft.trim()) {
      setEditingKitId(null);
      return;
    }
    const nextKits = kits.map((k) =>
      k.id === editingKitId ? { ...k, name: editingKitNameDraft.trim() } : k
    );
    updateField('armorKits', nextKits);
    setEditingKitId(null);
  };

  const handleUpdateArmorLocation = (index: number, updated: BodyArmorLocation) => {
    if (isViewer) return;
    const nextLocations = [...currentLocations];
    nextLocations[index] = updated;

    const nextKits = kits.map((k) =>
      k.id === currentKit.id ? { ...k, locations: nextLocations } : k
    );
    updateField('armorKits', nextKits);

    // Se o kit editado for o ativo, mantém npc.armorLocations sincronizado!
    if (currentKit.isActive || currentKit.id === npc.activeArmorKitId) {
      updateField('armorLocations', nextLocations);
    }
  };

  // Estado para cadastro / edição de Regra Adicional
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null);
  const [ruleDraft, setRuleDraft] = useState<string>('');

  const handleOpenEditRule = (index: number, currentRuleText: string) => {
    if (isViewer) return;
    setEditingRuleIndex(index);
    setRuleDraft(currentRuleText || '');
  };

  const handleSaveRule = () => {
    if (editingRuleIndex === null) return;
    const targetLoc = currentLocations[editingRuleIndex];
    if (targetLoc) {
      handleUpdateArmorLocation(editingRuleIndex, {
        ...targetLoc,
        additionalRule: ruleDraft.trim(),
      });
    }
    setEditingRuleIndex(null);
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
  // =========================================================================
  // ALERTAS SEPARADOS: 1) CONDIÇÕES, ESTADOS, PV E FADIGA / 2) DEFESAS & AÇÕES DO TURNO
  // =========================================================================
  const turn = npc.turnActions || DEFAULT_TURN_ACTIONS;

  // Div 1: Alertas Críticos (Condições & Estados Críticos, Pontos de Vida e Pontos de Fadiga)
  const renderCriticalAlertsBox = (isPlayer: boolean = false) => {
    const alerts: { id: string; badgeClass: string; text: string; icon?: React.ComponentType<{ size?: number; className?: string }> }[] = [];

    // 1. Mortalidade
    if (npc.isDead) {
      alerts.push({
        id: 'dead',
        badgeClass: 'bg-red-950/90 border-red-600 text-red-200 font-black',
        text: npc.characterType === 'player' ? 'Personagem Morto' : 'NPC Morto / Abatido',
        icon: Skull,
      });
    }

    // 2. Pontos de Vida & 3. Pontos de Fadiga (Exclusivos para o Mestre: jogadores não veem alertas de PV e Fadiga)
    if (isMaster) {
      const hpWarnings = hpStat.warningTexts && hpStat.warningTexts.length > 0
        ? hpStat.warningTexts
        : (hpStat.warningText ? [hpStat.warningText] : []);

      hpWarnings.forEach((warn, idx) => {
        alerts.push({
          id: `hp-warn-${idx}`,
          badgeClass: 'bg-red-950/90 border-red-600 text-red-300 font-bold',
          text: `PV: ${warn}`,
          icon: AlertTriangle,
        });
      });

      const fpWarnings = fpStat.warningTexts && fpStat.warningTexts.length > 0
        ? fpStat.warningTexts
        : (fpStat.warningText ? [fpStat.warningText] : []);

      fpWarnings.forEach((warn, idx) => {
        alerts.push({
          id: `fp-warn-${idx}`,
          badgeClass: 'bg-cyan-950/90 border-cyan-600 text-cyan-300 font-bold',
          text: `Fadiga: ${warn}`,
          icon: Zap,
        });
      });
    }

    // 4. Lista todas as Condições & Estados Críticos
    if (npc.statusConditions && npc.statusConditions.length > 0) {
      npc.statusConditions.forEach((cond) => {
        alerts.push({
          id: `cond-${cond}`,
          badgeClass: 'bg-purple-950/80 border-purple-500 text-purple-200 font-semibold cursor-help',
          text: cond,
          tooltip: `${cond}: ${getConditionDescription(cond)}`,
        });
      });
    }

    if (alerts.length === 0) return null;

    return (
      <div
        className="flex flex-wrap items-center justify-end gap-1.5 p-2 bg-slate-950/90 border border-rose-900/40 rounded-xl max-w-2xl shadow-sm"
        title="Condições & Estados Críticos, Pontos de Vida e Fadiga"
      >
        {alerts.map((al) => {
          const Icon = al.icon;
          return (
            <span
              key={al.id}
              title={(al as any).tooltip || al.text}
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

  // Div 2: Defesas & Ações do Turno
  const renderTurnActionsBox = () => {
    const alerts: { id: string; badgeClass: string; text: string; icon?: React.ComponentType<{ size?: number; className?: string }> }[] = [];

    // Defesas & Ações do Turno
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

    // Shock com a quantidade
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
      <div
        className="flex flex-wrap items-center justify-end gap-1.5 p-2 bg-slate-950/90 border border-slate-800 rounded-xl max-w-2xl shadow-sm"
        title="Defesas & Ações do Turno"
      >
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
  const handleAddExtraItem = (preset?: { name: string; max: number; category?: 'mana' | 'shield' | 'arrows' | 'other' }) => {
    if (!isMaster) return;
    const newItem: ExtraItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: preset?.name || 'Novo Recurso',
      category: preset?.category || 'other',
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
    if (isViewer) return;
    if (!isMaster && !isPlayerChar) return;
    if (!isMaster && ('max' in updates || 'name' in updates)) return;
    const currentList = currentNpcRef.current.extraItems || [];
    const items = currentList.map((it) => (it.id === itemId ? { ...it, ...updates } : it));
    updateField('extraItems', items);
  };

  const handleAdjustExtraItem = (itemId: string, delta: number) => {
    if (isViewer) return;
    if (!isMaster && !isPlayerChar) return;
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
    if (!isMaster) return;
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

  // Renderizador unificado da div Magias (Magias Ativas & Sob Efeito)
  const renderMagiasSection = () => {
    // Jogadores não podem ver magias (Magias Ativas e Sob Efeito) dos NPCs, apenas dos jogadores
    if (!isMaster && !isPlayerChar) {
      return null;
    }
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2.5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-purple-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Magias
            </h3>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <span className="flex items-center gap-1 font-semibold text-purple-300">
              <span className="w-2 h-2 rounded-full bg-purple-500 inline-block animate-pulse"></span>
              Ativas: {(npc.activeSpells || []).length}
            </span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center gap-1 font-semibold text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block animate-pulse"></span>
              Sob Efeito: {(npc.affectedSpells || []).length}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Seção 1: Magias Ativas (Sustentadas por este conjurador) */}
          <div className="bg-slate-950/80 border border-purple-900/40 rounded-xl p-2.5 space-y-1.5">
            <div className="flex items-center justify-between border-b border-purple-950/80 pb-1">
              <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                <Sparkles size={13} className="text-purple-400" />
                <span>Magias Ativas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500 font-medium">
                  {(npc.activeSpells || []).length} ativa{(npc.activeSpells || []).length === 1 ? '' : 's'}
                </span>
                {!isViewer && (
                  <button
                    type="button"
                    onClick={() => setIsAddingActiveSpell(!isAddingActiveSpell)}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-900/60 hover:bg-purple-800 text-purple-200 text-[10px] font-bold border border-purple-700/60 transition-all active:scale-95"
                    title="Lançar ou sustentar uma magia manualmente"
                  >
                    <Plus size={11} />
                    <span>{isAddingActiveSpell ? 'Cancelar' : 'Lançar'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Formulário Inline para Lançar Magia Ativa Manualmente */}
            {!isViewer && isAddingActiveSpell && (
              <div className="bg-slate-900 border border-purple-700/60 rounded-lg p-2 space-y-2 text-xs shadow-md">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-300 text-[11px]">Nova Magia Ativa / Sustentada</span>
                  <button
                    type="button"
                    onClick={() => setIsAddingActiveSpell(false)}
                    className="text-slate-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Nome da Magia:</label>
                  <input
                    type="text"
                    value={manualActiveSpellName}
                    onChange={(e) => setManualActiveSpellName(e.target.value)}
                    placeholder="Ex: Escudo Mágico, Luz, Criar Fogo..."
                    className="w-full bg-slate-950 border border-slate-750 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    autoFocus
                  />
                  {npc.spells && npc.spells.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap mt-1">
                      <span className="text-[9px] text-slate-500">Do grimório:</span>
                      {npc.spells.map((sp) => (
                        <button
                          key={sp.id}
                          type="button"
                          onClick={() => setManualActiveSpellName(sp.name)}
                          className="text-[9px] px-1 py-0.2 rounded bg-purple-950/70 border border-purple-800/80 text-purple-300 hover:text-white hover:bg-purple-900"
                        >
                          {sp.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Custo FP (opcional):</label>
                    <input
                      type="number"
                      min="0"
                      value={manualActiveSpellCost}
                      onChange={(e) => setManualActiveSpellCost(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
                      placeholder="0"
                      className="w-full bg-slate-950 border border-slate-750 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Rodada (R):</label>
                    <input
                      type="number"
                      min="1"
                      value={manualActiveSpellRound}
                      onChange={(e) => setManualActiveSpellRound(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full bg-slate-950 border border-slate-750 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                    />
                  </div>
                </div>

                <div className="pt-0.5">
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-amber-300 font-semibold">
                    <input
                      type="checkbox"
                      checked={manualActiveSpellIsArea}
                      onChange={(e) => setManualActiveSpellIsArea(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-700 text-purple-600 focus:ring-purple-500"
                    />
                    <span>🌐 Magia em área (sem alvo específico)</span>
                  </label>
                </div>

                {!manualActiveSpellIsArea && (
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Alvo da Magia:</label>
                    <input
                      type="text"
                      value={manualActiveSpellTargetName}
                      onChange={(e) => setManualActiveSpellTargetName(e.target.value)}
                      placeholder={`Ex: ${npc.name} (Próprio Conjurador)`}
                      className="w-full bg-slate-950 border border-slate-750 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingActiveSpell(false)}
                    className="px-2 py-1 text-[11px] font-semibold text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmManualActiveSpell}
                    disabled={!manualActiveSpellName.trim()}
                    className="px-2.5 py-1 text-[11px] font-bold bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-md shadow transition-colors"
                  >
                    Confirmar Lançamento
                  </button>
                </div>
              </div>
            )}

            {(!npc.activeSpells || npc.activeSpells.length === 0) ? (
              <div className="text-[11px] text-slate-600 italic py-3 text-center">
                Nenhuma magia ativa sustentada no momento
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {npc.activeSpells.map((sp) => (
                  <div
                    key={sp.id}
                    className="bg-slate-900/90 border border-purple-800/50 hover:border-purple-600/70 rounded-lg p-2 flex items-center justify-between gap-2 text-xs transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-purple-200 truncate flex items-center gap-1.5">
                        <span className="text-sm font-black text-purple-100">{sp.spellName}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-purple-950 border border-purple-700 text-purple-300 rounded font-mono font-bold">
                          R{sp.round}
                        </span>
                        {sp.cost !== undefined && sp.cost > 0 && (
                          <span className="text-[10px] text-cyan-400 font-mono">
                            (-{sp.cost} FP)
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        Alvo: <span className="text-slate-100 font-semibold">{sp.targetName || 'Desconhecido'}</span>
                      </div>
                    </div>

                    {!isViewer && (
                      <button
                        type="button"
                        onClick={() => {
                          if (onRemoveActiveSpell) {
                            onRemoveActiveSpell(npc.id, sp.id);
                          } else {
                            const remaining = (npc.activeSpells || []).filter((s) => s.id !== sp.id);
                            updateField('activeSpells', remaining);
                          }
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1.5 hover:bg-rose-950/50 rounded-lg transition-colors shrink-0"
                        title="Encerrar / Cancelar esta magia ativa"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Seção 2: Sob Efeito (Magias que estão afetando este personagem) */}
          <div className="bg-slate-950/80 border border-cyan-900/40 rounded-xl p-2.5 space-y-1.5">
            <div className="flex items-center justify-between border-b border-cyan-950/80 pb-1">
              <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <Zap size={13} className="text-cyan-400" />
                <span>Sob Efeito</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500 font-medium">
                  {(npc.affectedSpells || []).length} efeito{(npc.affectedSpells || []).length === 1 ? '' : 's'}
                </span>
                {!isViewer && (
                  <button
                    type="button"
                    onClick={() => setIsAddingAffectedSpell(!isAddingAffectedSpell)}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-900/60 hover:bg-cyan-800 text-cyan-200 text-[10px] font-bold border border-cyan-700/60 transition-all active:scale-95"
                    title="Lançar/Adicionar efeito de magia neste alvo manualmente"
                  >
                    <Plus size={11} />
                    <span>{isAddingAffectedSpell ? 'Cancelar' : 'Lançar'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Formulário Inline para Adicionar Sob Efeito Manualmente */}
            {!isViewer && isAddingAffectedSpell && (
              <div className="bg-slate-900 border border-cyan-700/60 rounded-lg p-2 space-y-2 text-xs shadow-md">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-300 text-[11px]">Novo Efeito de Magia Ativo</span>
                  <button
                    type="button"
                    onClick={() => setIsAddingAffectedSpell(false)}
                    className="text-slate-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Nome da Magia:</label>
                  <input
                    type="text"
                    value={manualAffectedSpellName}
                    onChange={(e) => setManualAffectedSpellName(e.target.value)}
                    placeholder="Ex: Armadura Mágica, Força, Lentidão..."
                    className="w-full bg-slate-950 border border-slate-750 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Conjurador:</label>
                    <input
                      type="text"
                      value={manualAffectedSpellCaster}
                      onChange={(e) => setManualAffectedSpellCaster(e.target.value)}
                      placeholder="Nome do conjurador..."
                      className="w-full bg-slate-950 border border-slate-750 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Rodada (R):</label>
                    <input
                      type="number"
                      min="1"
                      value={manualAffectedSpellRound}
                      onChange={(e) => setManualAffectedSpellRound(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full bg-slate-950 border border-slate-750 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingAffectedSpell(false)}
                    className="px-2 py-1 text-[11px] font-semibold text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmManualAffectedSpell}
                    disabled={!manualAffectedSpellName.trim()}
                    className="px-2.5 py-1 text-[11px] font-bold bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-slate-950 rounded-md shadow transition-colors"
                  >
                    Adicionar Efeito
                  </button>
                </div>
              </div>
            )}

            {(!npc.affectedSpells || npc.affectedSpells.length === 0) ? (
              <div className="text-[11px] text-slate-600 italic py-3 text-center">
                Nenhum efeito de magia ativo no alvo
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {npc.affectedSpells.map((sp) => (
                  <div
                    key={sp.id}
                    className="bg-slate-900/90 border border-cyan-800/50 hover:border-cyan-600/70 rounded-lg p-2 flex items-center justify-between gap-2 text-xs transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-cyan-200 truncate flex items-center gap-1.5">
                        <span className="text-sm font-black text-cyan-100">{sp.spellName}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-cyan-950 border border-cyan-700 text-cyan-300 rounded font-mono font-bold">
                          R{sp.round}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        Conjurador: <span className="text-slate-100 font-semibold">{sp.casterName || 'Desconhecido'}</span>
                      </div>
                    </div>

                    {!isViewer && (
                      <button
                        type="button"
                        onClick={() => {
                          if (onRemoveAffectedSpell) {
                            onRemoveAffectedSpell(npc.id, sp.id);
                          } else {
                            const remaining = (npc.affectedSpells || []).filter((s) => s.id !== sp.id);
                            updateField('affectedSpells', remaining);
                          }
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1.5 hover:bg-rose-950/50 rounded-lg transition-colors shrink-0"
                        title="Remover este efeito de magia"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
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

            {/* Ações do Jogador: Alertas separados em divs diferentes ao lado do Lançar Dano */}
            <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto min-w-0">
              {renderTurnActionsBox()}
              {renderCriticalAlertsBox(true)}

              {!isViewer ? (
                <button
                  onClick={() => onOpenDamageCalculator(npc)}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow transition-colors active:scale-95 whitespace-nowrap shrink-0"
                >
                  <Heart size={15} />
                  <span>Lançar Dano / Fadiga</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-750 rounded-xl text-slate-400 text-xs font-semibold shrink-0">
                  <Eye size={14} />
                  <span>Espectador</span>
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
                    className="inline-flex items-center gap-1 bg-red-950/70 border border-red-800 text-red-200 text-[11px] px-2 py-0.5 rounded-lg font-medium cursor-help"
                    title={`${cond}: ${getConditionDescription(cond)}`}
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
                    npc.isDead ? 'text-red-300 line-through' : 'text-white'
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

                {/* Visibilidade exclusiva para NPCs (Apenas Mestre) */}
                {isMaster && npc.characterType !== 'player' && (
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
                )}

                {/* Toggle Vivo / Morto (Disponível para qualquer combatente, Personagem ou NPC) */}
                {!isViewer && (
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

          {/* Direita: Alertas separados em divs diferentes ao lado de Botão Dano + Ações */}
          <div className="flex flex-wrap items-center justify-end gap-2.5 self-start lg:self-center w-full lg:w-auto min-w-0">
            {renderTurnActionsBox()}
            {renderCriticalAlertsBox(false)}

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
                      type="button"
                      onClick={() => setDeleteConfirmOpen(true)}
                      title="Excluir este personagem"
                      className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-900/40 rounded-lg border border-rose-800/40 transition-colors flex items-center justify-center"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-750 rounded-xl text-slate-400 text-xs font-semibold shrink-0">
                <Eye size={14} />
                <span>Espectador</span>
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
                    disabled={!isMaster}
                    value={npc.hpMax ?? ''}
                    onChange={(e) => updateField('hpMax', e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
                    placeholder="Máx"
                    className={`w-14 sm:w-16 bg-slate-950 border border-slate-750 rounded-lg text-center py-1 sm:py-1.5 text-slate-300 font-mono text-base sm:text-lg font-black focus:outline-none ${!isMaster ? 'opacity-90 cursor-not-allowed' : ''}`}
                    title={isMaster ? "Vida Máxima" : "Vida Máxima (apenas Mestre pode editar)"}
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
                    disabled={!isMaster}
                    value={npc.fpMax ?? ''}
                    onChange={(e) => updateField('fpMax', e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
                    placeholder="Máx"
                    className={`w-14 sm:w-16 bg-slate-950 border border-slate-750 rounded-lg text-center py-1 sm:py-1.5 text-slate-300 font-mono text-base sm:text-lg font-black focus:outline-none ${!isMaster ? 'opacity-90 cursor-not-allowed' : ''}`}
                    title={isMaster ? "Fadiga Máxima" : "Fadiga Máxima (apenas Mestre pode editar)"}
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

          {/* Card: Magias (Magias Ativas & Sob Efeito) - Posicionamento de Meia Largura */}
          {renderMagiasSection()}

          {/* Card: Defesas Ativas (Trocado para a coluna da esquerda) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
              <div className="flex items-center gap-2">
                <Shield size={15} className="text-amber-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Defesas Ativas
                </h3>
              </div>
              {isMaster && (
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
                    disabled={!isMaster}
                    value={npc.dodgeNotes ?? ''}
                    placeholder="Comentário..."
                    onChange={(e) => updateField('dodgeNotes', e.target.value)}
                    className="w-full bg-transparent text-[9px] text-slate-400 placeholder-slate-600 focus:outline-none focus:text-slate-200 truncate mt-0.5"
                    title="Comentário sobre Esquiva (ex: Speed + 3)"
                  />
                </div>
                <input
                  type="number"
                  disabled={!isMaster}
                  value={npc.dodge ?? ''}
                  placeholder="-"
                  onChange={(e) => updateField('dodge', e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
                  className={`w-11 bg-slate-900 border border-cyan-800/50 rounded-md text-center font-mono font-black text-xs text-cyan-300 py-0.5 focus:outline-none shrink-0 ${!isMaster ? 'opacity-90 cursor-not-allowed' : ''}`}
                  title="Valor da Esquiva"
                />
              </div>

              {/* Card Bloqueio */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-1.5 px-2 flex items-center justify-between gap-1.5">
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold text-emerald-300 leading-tight">Bloqueio</div>
                  <input
                    type="text"
                    disabled={!isMaster}
                    value={npc.blockNotes ?? ''}
                    placeholder="Comentário..."
                    onChange={(e) => updateField('blockNotes', e.target.value)}
                    className="w-full bg-transparent text-[9px] text-slate-400 placeholder-slate-600 focus:outline-none focus:text-slate-200 truncate mt-0.5"
                    title="Comentário sobre Bloqueio (ex: Escudo / 2 + 3)"
                  />
                </div>
                <input
                  type="number"
                  disabled={!isMaster}
                  value={npc.block ?? ''}
                  placeholder="-"
                  onChange={(e) => updateField('block', e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
                  className={`w-11 bg-slate-900 border border-emerald-800/50 rounded-md text-center font-mono font-black text-xs text-emerald-300 py-0.5 focus:outline-none shrink-0 ${!isMaster ? 'opacity-90 cursor-not-allowed' : ''}`}
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
                        disabled={!isMaster}
                        value={parry.weaponName}
                        onChange={(e) => handleUpdateParry(idx, { ...parry, weaponName: e.target.value })}
                        placeholder="Nome da arma..."
                        className="w-full bg-transparent text-[11px] font-bold text-amber-200 placeholder-slate-600 focus:outline-none truncate"
                        title="Nome da arma de Aparar"
                      />
                    </div>
                    <input
                      type="text"
                      disabled={!isMaster}
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
                      disabled={!isMaster}
                      value={parry.value ?? ''}
                      placeholder="-"
                      onChange={(e) =>
                        handleUpdateParry(idx, {
                          ...parry,
                          value: e.target.value === '' ? 0 : parseInt(e.target.value, 10),
                        })
                      }
                      className={`w-11 bg-slate-900 border border-amber-500/40 rounded-md text-center font-mono font-black text-xs text-amber-300 py-0.5 focus:outline-none ${!isMaster ? 'opacity-90 cursor-not-allowed' : ''}`}
                      title="Valor do Aparar"
                    />
                    {isMaster && parriesList.length > 1 && (
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
              {isMaster && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleAddExtraItem({ name: 'Flechas', max: 20, category: 'arrows' })}
                    className="text-[10px] font-bold text-amber-300 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-800/60 px-2 py-0.5 rounded-lg transition-colors"
                    title="Cadastrar Flechas (Total: 20)"
                  >
                    + Flechas
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddExtraItem({ name: 'Pedras de Mana', max: 5, category: 'mana' })}
                    className="text-[10px] font-bold text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/60 px-2 py-0.5 rounded-lg transition-colors"
                    title="Cadastrar Pedras de Mana (Total: 5)"
                  >
                    + Mana
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddExtraItem({ name: 'Escudo', max: 30, category: 'shield' })}
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
                      {!isViewer && (
                        <button
                          type="button"
                          onClick={() => handleToggleFavoriteExtraItem(item.id)}
                          className={`w-6 h-6 rounded flex items-center justify-center transition-colors shrink-0 ${
                            item.isFavorite
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                              : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                          }`}
                          title={item.isFavorite ? 'Remover dos favoritos (Lançar Dano)' : 'Favoritar item (exibir em Lançar Dano)'}
                        >
                          <Star size={13} className={item.isFavorite ? 'fill-amber-400' : ''} />
                        </button>
                      )}
                      {getItemIcon(item.name, item.category)}
                      <input
                        type="text"
                        disabled={!isMaster}
                        value={item.name}
                        onChange={(e) => handleUpdateExtraItem(item.id, { name: e.target.value })}
                        className={`w-full bg-transparent text-xs font-bold text-white focus:outline-none focus:border-b focus:border-amber-500 ${!isMaster ? 'cursor-default' : ''}`}
                        placeholder="Nome do Item..."
                      />
                    </div>

                    {/* Coluna de Categoria do Recurso */}
                    <div className="shrink-0">
                      {isMaster ? (
                        <select
                          value={item.category || (item.name.toLowerCase().includes('mana') || item.name.toLowerCase().includes('pedra') ? 'mana' : item.name.toLowerCase().includes('escudo') ? 'shield' : item.name.toLowerCase().includes('flecha') ? 'arrows' : 'other')}
                          onChange={(e) => handleUpdateExtraItem(item.id, { category: e.target.value as any })}
                          className="bg-slate-900 border border-slate-750 text-[10px] text-slate-300 font-semibold rounded-md px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          title="Categoria do recurso"
                        >
                          <option value="mana">Pedra de Mana</option>
                          <option value="shield">Escudo</option>
                          <option value="arrows">Flechas</option>
                          <option value="other">Outros</option>
                        </select>
                      ) : (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${
                          item.category === 'mana' || item.name.toLowerCase().includes('mana') || item.name.toLowerCase().includes('pedra')
                            ? 'bg-cyan-950/80 border-cyan-800 text-cyan-300'
                            : item.category === 'shield' || item.name.toLowerCase().includes('escudo')
                            ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                            : item.category === 'arrows' || item.name.toLowerCase().includes('flecha')
                            ? 'bg-amber-950/80 border-amber-800 text-amber-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}>
                          {item.category === 'mana' || item.name.toLowerCase().includes('mana') || item.name.toLowerCase().includes('pedra')
                            ? 'Pedra de Mana'
                            : item.category === 'shield' || item.name.toLowerCase().includes('escudo')
                            ? 'Escudo'
                            : item.category === 'arrows' || item.name.toLowerCase().includes('flecha')
                            ? 'Flechas'
                            : 'Outros'}
                        </span>
                      )}
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
                        disabled={!isMaster}
                        value={item.max ?? ''}
                        onChange={(e) =>
                          handleUpdateExtraItem(item.id, {
                            max: e.target.value === '' ? 0 : parseInt(e.target.value, 10),
                          })
                        }
                        className={`w-12 bg-slate-900 border border-slate-750 rounded-lg text-center py-0.5 text-slate-400 focus:outline-none ${!isMaster ? 'opacity-90 cursor-not-allowed' : ''}`}
                        title={isMaster ? "Quantidade Total / Máxima" : "Quantidade Total (apenas Mestre pode editar)"}
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
                        {isMaster && (
                          <button
                            type="button"
                            onClick={() => handleRemoveExtraItem(item.id)}
                            className="text-slate-500 hover:text-rose-400 font-bold px-1 text-sm ml-0.5"
                            title="Excluir item"
                          >
                            ×
                          </button>
                        )}
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
                    className="inline-flex items-center gap-1 bg-red-950/70 border border-red-800 text-red-200 text-[11px] px-2 py-0.5 rounded-lg font-medium cursor-help"
                    title={`${cond}: ${getConditionDescription(cond)}`}
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
                      disabled={!isMaster}
                      value={val ?? ''}
                      placeholder="-"
                      onChange={(e) =>
                        updateField(key as any, e.target.value === '' ? 0 : parseInt(e.target.value, 10))
                      }
                      className={`w-full bg-transparent text-center font-mono font-black text-sm text-amber-300 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${!isMaster ? 'opacity-90 cursor-not-allowed' : ''}`}
                      title={isMaster ? label : `${label} (apenas Mestre pode editar)`}
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
                      disabled={!isMaster}
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
                      className={`w-full bg-transparent text-center font-mono font-bold text-xs text-slate-200 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${!isMaster ? 'opacity-90 cursor-not-allowed' : ''}`}
                      title={isMaster ? label : `${label} (apenas Mestre pode editar)`}
                    />
                  </div>
                ))}

                {/* Move com suporte a texto flexível (ex: "6 (-1 Peso)") */}
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-1.5 flex flex-col items-center justify-center text-center">
                  <div className="text-[9px] font-bold text-slate-400 text-center w-full">Move</div>
                  <input
                    type="text"
                    disabled={!isMaster}
                    value={npc.basicMove ?? ''}
                    placeholder="Ex: 6 (-1)"
                    onChange={(e) => updateField('basicMove', e.target.value)}
                    className={`w-full bg-transparent text-center font-mono font-bold text-xs text-slate-200 focus:outline-none ${!isMaster ? 'opacity-90 cursor-not-allowed' : ''}`}
                    title={isMaster ? "Deslocamento / Move (aceita texto como '6 (-1 Peso)')" : "Move (apenas Mestre pode editar)"}
                  />
                </div>

                {/* RD Natural */}
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-1.5 flex flex-col items-center justify-center text-center">
                  <div className="text-[9px] font-bold text-amber-300 text-center w-full">RD Nat.</div>
                  <input
                    type="number"
                    step="1"
                    disabled={!isMaster}
                    value={npc.naturalDr ?? ''}
                    placeholder="-"
                    onChange={(e) =>
                      updateField('naturalDr', e.target.value === '' ? 0 : parseInt(e.target.value, 10))
                    }
                    className={`w-full bg-transparent text-center font-mono font-black text-xs text-amber-300 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${!isMaster ? 'opacity-90 cursor-not-allowed' : ''}`}
                    title={isMaster ? "RD Natural" : "RD Natural (apenas Mestre pode editar)"}
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

      {/* 10. TAB CONTENT: ARMADURA POR LOCALIZAÇÃO (MODELO EXCEL + KITS + REGRAS) */}
      {activeTab === 'armor' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
          {/* Header com Kits de Armadura */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Armadura por Localização
              </h3>
            </div>

            {/* Ações e Botão de + Kit de Armadura */}
            {!isViewer && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddArmorKit}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-colors shadow-sm"
                  title="Adicionar uma nova lista de partes do corpo (novo kit de armadura)"
                >
                  <Plus size={14} />
                  <span>+ Kit de Armadura</span>
                </button>
              </div>
            )}
          </div>

          {/* Abas dos Kits de Armadura */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 pr-1">
                <Layers size={13} className="text-amber-400" />
                <span>Kits:</span>
              </span>
              {kits.map((kit) => {
                const isSelected = kit.id === currentKit.id;
                const isEquipped = kit.isActive || kit.id === npc.activeArmorKitId;

                return (
                  <div
                    key={kit.id}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                      isSelected
                        ? 'bg-slate-800 border-amber-500/80 text-white shadow-sm'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    {editingKitId === kit.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={editingKitNameDraft}
                          onChange={(e) => setEditingKitNameDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRenameKit();
                            if (e.key === 'Escape') setEditingKitId(null);
                          }}
                          className="bg-slate-900 border border-amber-500 text-white text-xs px-1.5 py-0.5 rounded w-28 focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleSaveRenameKit}
                          className="text-emerald-400 hover:text-emerald-300 p-0.5"
                          title="Salvar nome"
                        >
                          <Check size={12} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setSelectedKitId(kit.id)}
                          className="flex items-center gap-1.5"
                        >
                          <span>{kit.name}</span>
                          {isEquipped && (
                            <span className="flex items-center gap-0.5 text-[9px] font-bold px-1 py-0.2 bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 rounded">
                              <ShieldCheck size={10} />
                              Equipado
                            </span>
                          )}
                        </button>

                        {!isViewer && (
                          <div className="flex items-center gap-0.5 pl-1 border-l border-slate-700/60 ml-1">
                            {!isEquipped && (
                              <button
                                type="button"
                                onClick={() => handleEquipArmorKit(kit.id)}
                                className="text-[10px] text-slate-400 hover:text-emerald-400 px-1 py-0.5 hover:bg-slate-700/50 rounded transition-colors"
                                title="Equipar este kit no personagem"
                              >
                                Equipar
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleStartRenameKit(kit)}
                              className="text-slate-500 hover:text-amber-400 p-0.5 rounded"
                              title="Renomear este kit"
                            >
                              <Edit2 size={11} />
                            </button>
                            {kits.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveArmorKit(kit.id)}
                                className="text-slate-500 hover:text-rose-400 p-0.5 rounded"
                                title="Excluir este kit"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tabela de Localizações no Modelo do Excel */}
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold text-[11px] bg-slate-950/80">
                  <th className="py-2.5 px-2 min-w-[140px] text-center whitespace-nowrap">Roll</th>
                  <th className="py-2.5 px-3 w-28">Parte do Corpo</th>
                  <th className="py-2.5 px-3 min-w-[150px]">Armadura</th>
                  <th className="py-2.5 px-3 w-20 text-center">RD Base</th>
                  <th className="py-2.5 px-3 w-20 text-center">Modif. RD</th>
                  <th className="py-2.5 px-3 min-w-[140px]">Dano que Interfere</th>
                  <th className="py-2.5 px-3 w-24 text-center">Vida Total</th>
                  <th className="py-2.5 px-3 w-24 text-center">Dano Tomado</th>
                  <th className="py-2.5 px-3 min-w-[220px]">Regra Adicional</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {currentLocations.map((loc, idx) => {
                  const hpInfo = calculateLocationHp(loc.location, npc.hpMax);

                  // Dano tomado calculado se não tiver sido editado manualmente
                  const calculatedDmg = typeof loc.damageTaken === 'number'
                    ? loc.damageTaken
                    : (npc.history || [])
                        .filter((h) => h.type === 'damage' && isSameLocation(h.hitLocation || '', loc.location))
                        .reduce((sum, h) => sum + (h.finalDamage || h.amount || 0), 0);

                  return (
                    <tr key={loc.id || `${loc.location}-${idx}`} className="hover:bg-slate-850/50 transition-colors">
                      {/* 1. Roll (Fixa, não edita - espaço ampliado e fonte ajustada para linha única) */}
                      <td className="py-2.5 px-2 text-center font-mono font-bold text-amber-400 text-[10px] leading-tight whitespace-nowrap bg-slate-950/30">
                        {loc.rollTarget || '—'}
                      </td>

                      {/* 2. Parte do Corpo (Fixa, não edita) */}
                      <td className="py-2.5 px-3 font-bold text-slate-100 text-xs whitespace-nowrap">
                        {loc.location}
                      </td>

                      {/* 3. Armadura (Editável) */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          disabled={isViewer}
                          value={loc.armorName || ''}
                          placeholder="Peça de armadura..."
                          onChange={(e) =>
                            handleUpdateArmorLocation(idx, { ...loc, armorName: e.target.value })
                          }
                          className={`w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs ${
                            isViewer ? 'cursor-default opacity-90' : ''
                          }`}
                        />
                      </td>

                      {/* 4. RD Base (Editável - sem acréscimo de RD natural) */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1 font-mono">
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
                            className={`w-14 bg-slate-950 border border-amber-600/60 rounded px-1 py-1 text-center font-bold text-amber-300 text-xs focus:outline-none ${
                              isViewer ? 'opacity-90' : ''
                            }`}
                          />
                        </div>
                      </td>

                      {/* 5. Modif. RD (Editável) */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1 font-mono">
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

                      {/* 6. Dano que Interfere (Editável) */}
                      <td className="py-2.5 px-3">
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

                      {/* 7. Vida Total (Calculada, olha PV Máximo e fórmula do Excel) */}
                      <td className="py-2.5 px-3 text-center font-mono">
                        {hpInfo.value !== null ? (
                          <div className="flex flex-col items-center" title={`Vida Total desta parte: ${hpInfo.formulaLabel} (${hpInfo.display} PV)`}>
                            <span className="font-bold text-emerald-400 text-xs">
                              {hpInfo.display}
                            </span>
                            <span className="text-[9px] text-slate-500 font-sans tracking-tight">
                              {hpInfo.formulaLabel}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs font-mono">---</span>
                        )}
                      </td>

                      {/* 8. Dano Tomado (Calcula soma dos danos deste combate, editável pelo usuário) */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <input
                            type="number"
                            min="0"
                            disabled={isViewer}
                            value={calculatedDmg || ''}
                            placeholder="0"
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10));
                              handleUpdateArmorLocation(idx, { ...loc, damageTaken: val });
                            }}
                            className={`w-14 bg-slate-950 border rounded px-1 py-1 text-center font-bold text-xs font-mono focus:outline-none ${
                              calculatedDmg > 0
                                ? 'text-rose-400 border-rose-800/80 bg-rose-950/30'
                                : 'text-slate-400 border-slate-800'
                            } ${isViewer ? 'opacity-90' : ''}`}
                            title="Dano tomado nesta parte do corpo neste combate (editável)"
                          />
                        </div>
                      </td>

                      {/* 9. Regra Adicional (Tooltip e cadastro/edição) */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 group">
                          {loc.additionalRule ? (
                            <div
                              className="flex-1 flex items-center gap-1.5 bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-lg px-2.5 py-1 cursor-help transition-colors"
                              title={loc.additionalRule}
                            >
                              <Info size={13} className="text-amber-400 shrink-0" />
                              <span className="text-[11px] text-slate-300 truncate max-w-[220px]">
                                {loc.additionalRule}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-600 italic text-[11px] px-1 flex-1">
                              ---
                            </span>
                          )}

                          {!isViewer && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditRule(idx, loc.additionalRule || '')}
                              className="p-1 text-slate-500 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors shrink-0"
                              title="Cadastrar ou editar regra adicional para esta parte do corpo"
                            >
                              <Edit2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Modal / Diálogo para Cadastrar / Editar Regra Adicional */}
          {editingRuleIndex !== null && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Shield size={18} className="text-amber-400" />
                    <h3 className="text-sm font-bold text-white">
                      Regra Adicional: {currentLocations[editingRuleIndex]?.location}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingRuleIndex(null)}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Cadastrar Regra Específica
                  </label>
                  <textarea
                    rows={3}
                    value={ruleDraft}
                    onChange={(e) => setRuleDraft(e.target.value)}
                    placeholder="Ex: Perfurante, perfurante grande e empalamento vira x1..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none placeholder-slate-600"
                  />
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Esta regra é exibida no tooltip da tabela e considerada pelo calculador de dano em combate.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingRuleIndex(null)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveRule}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition-colors shadow-md"
                  >
                    Salvar Regra
                  </button>
                </div>
              </div>
            </div>
          )}
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

      {/* Confirmação Segura de Exclusão de Personagem */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-750 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Excluir Personagem</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Remover <strong>"{npc.name || 'este personagem'}"</strong> deste combate?
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800 leading-relaxed">
              {npc.characterType === 'player'
                ? 'A ficha continuará salva globalmente e poderá ser adicionada novamente a qualquer combate.'
                : 'O NPC e seus registros serão excluídos permanentemente deste combate.'}
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteNpc(npc.id);
                  setDeleteConfirmOpen(false);
                }}
                className="px-3.5 py-1.5 text-xs text-white bg-rose-600 hover:bg-rose-500 font-bold rounded-lg shadow-sm transition-colors"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
