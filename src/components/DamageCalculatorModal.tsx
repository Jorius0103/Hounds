import React, { useState, useEffect } from 'react';
import { NPC, ActionLogEntry, ExtraItem, BodyArmorLocation } from '../types/rpg';
import { Shield, Zap, Heart, X, Sparkles, Package, Plus, Minus, Star, AlertTriangle, Info, Crosshair } from 'lucide-react';
import { calculateLocationDamage, migrateArmorLocations, normalizeLocationKey, sanitizeHitLocationRule } from '../utils/gurps';

interface DamageCalculatorModalProps {
  npc: NPC;
  isOpen: boolean;
  onClose: () => void;
  onApplyDamage: (npcId: string, finalDamage: number, logEntry: Omit<ActionLogEntry, 'id'>) => void;
  onApplyFatigue: (
    npcId: string,
    fpDelta: number,
    logEntry: Omit<ActionLogEntry, 'id'>,
    spellData?: {
      spellName: string;
      isActiveSpell: boolean;
      targetId: string;
      targetName: string;
      round: number;
      duration?: number;
    },
    manaStoneUsage?: {
      itemId: string;
      amount: number;
    }
  ) => void;
  onApplyItemChange?: (
    npcId: string,
    itemId: string,
    delta: number,
    logEntry: Omit<ActionLogEntry, 'id'>
  ) => void;
  onAddQuickItem?: (npcId: string, item: ExtraItem) => void;
  isPlayerView?: boolean;
  combatants?: NPC[];
  currentRound?: number;
  currentUserName?: string;
}

export const DamageCalculatorModal: React.FC<DamageCalculatorModalProps> = ({
  npc,
  isOpen,
  onClose,
  onApplyDamage,
  onApplyFatigue,
  onApplyItemChange,
  onAddQuickItem,
  isPlayerView = false,
  combatants = [],
  currentRound = 1,
  currentUserName,
}) => {
  const [mode, setMode] = useState<'damage' | 'fatigue' | 'heal' | 'item'>('damage');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [rawDamage, setRawDamage] = useState<number | ''>('');
  const [damageType, setDamageType] = useState<string>('');
  const [bypassDr, setBypassDr] = useState<boolean>(false);
  const [selectedAttackerId, setSelectedAttackerId] = useState<string>('');
  const [customDescription, setCustomDescription] = useState<string>('');

  // Distinção de visão:
  // De Personagens o jogador pode ver tudo.
  // De NPC o jogador tem visão restrita para não saber os dados dos NPCs.
  const isNpcTarget = npc.characterType !== 'player';
  const isRestrictedNpcView = isPlayerView && isNpcTarget;

  // Identifica pedras de mana entre os itens extras
  const isManaStoneItem = (it: ExtraItem) => {
    if (it.category === 'mana') return true;
    const lower = (it.name || '').toLowerCase();
    return lower.includes('mana') || lower.includes('pedra');
  };

  // Pedras de mana para a aba Fadiga (ligadas à energia de magias - apenas FAVORITADAS)
  // Jogadores só podem tirar fadiga de NPCs da fadiga real, não podem visualizar pedras de mana de NPCs
  const manaStones = isRestrictedNpcView
    ? []
    : (npc.extraItems || [])
        .filter(isManaStoneItem)
        .filter((it) => Boolean(it.isFavorite));

  // Itens Extras disponíveis na aba Item (exclui Pedras de Mana e lista apenas FAVORITADOS)
  // Controle de itens extras de NPCs fica apenas com o Mestre
  const availableItems = isRestrictedNpcView
    ? []
    : (npc.extraItems || [])
        .filter((it) => !isManaStoneItem(it))
        .filter((it) => Boolean(it.isFavorite));

  // Fatigue state (Padrão 0)
  const [fatigueDelta, setFatigueDelta] = useState<number | ''>(0);
  const [isSpellExpenditure, setIsSpellExpenditure] = useState<boolean>(false);
  const [fatigueSpellName, setFatigueSpellName] = useState<string>('');
  const [isSpellActive, setIsSpellActive] = useState<boolean>(false);
  const [isAreaSpell, setIsAreaSpell] = useState<boolean>(false);
  const [spellTargetId, setSpellTargetId] = useState<string>(npc.id);
  const [spellTargetFilter, setSpellTargetFilter] = useState<'all' | 'player' | 'npc'>('all');
  const [spellRound, setSpellRound] = useState<number>(currentRound ?? 0);
  const [spellDuration, setSpellDuration] = useState<number | ''>('');

  useEffect(() => {
    if (isOpen) {
      setSpellRound(currentRound ?? 0);
      setHealAmount(1);
    }
  }, [isOpen, currentRound]);

  // Seleção de recurso a gastar na aba de Fadiga: 'fp' para Fadiga Própria ou o ID de uma Pedra de Mana
  const [selectedFatigueSource, setSelectedFatigueSource] = useState<string>('fp');
  const effectiveFatigueSource = isRestrictedNpcView ? 'fp' : selectedFatigueSource;
  const selectedStone = effectiveFatigueSource !== 'fp'
    ? manaStones.find((s) => s.id === effectiveFatigueSource)
    : undefined;

  // Heal state (Agora pode curar PV ou curar Fadiga!)
  const [healTarget, setHealTarget] = useState<'hp' | 'fp'>('hp');
  const [healAmount, setHealAmount] = useState<number>(1);

  // Extra Item state (Flechas, Escudos, etc. - Sem pedras de mana)
  const [selectedItemId, setSelectedItemId] = useState<string>(
    (availableItems[0]?.id) || ''
  );
  const [itemAction, setItemAction] = useState<'lose' | 'gain'>('lose');
  const [itemDelta, setItemDelta] = useState<number | ''>(0);

  const [eyeConfirmed, setEyeConfirmed] = useState<boolean>(false);
  const [customMultiplier, setCustomMultiplier] = useState<number | ''>(1.0);

  const activeKit = React.useMemo(() => {
    if (!npc.armorKits || npc.armorKits.length === 0) return null;
    return npc.armorKits.find((k) => k.isActive || k.id === npc.activeArmorKitId) || npc.armorKits[0];
  }, [npc.armorKits, npc.activeArmorKitId]);

  const effectiveLocations = React.useMemo(() => {
    const rawLocs = activeKit?.locations || npc.armorLocations;
    return migrateArmorLocations(rawLocs, npc.id);
  }, [activeKit, npc.armorLocations, npc.id]);

  // Ordenação por número de acerto (rollTarget) na ordem de rolagem 3d6 exclusiva para a seleção de local nesta janela
  const sortedDropdownLocations = React.useMemo(() => {
    const parseRollTarget = (r?: string) => {
      if (!r || r === '-' || r === '—') return 999;
      const match = r.match(/\d+/);
      return match ? parseInt(match[0], 10) : 999;
    };
    return [...effectiveLocations].sort((a, b) => parseRollTarget(a.rollTarget) - parseRollTarget(b.rollTarget));
  }, [effectiveLocations]);

  if (!isOpen) return null;

  const isNoLocation = selectedLocationId === 'sem-parte';
  const selectedLoc = isNoLocation ? undefined : effectiveLocations.find((l) => l.id === selectedLocationId);
  const baseArmorDr = selectedLoc ? selectedLoc.dr : 0;

  const isDamageTypeMatch = (modType?: string, incomingType?: string): boolean => {
    if (!modType || !incomingType) return false;
    const m = modType.toLowerCase().trim();
    const d = incomingType.toLowerCase().trim();
    if (m === d) return true;
    if ((m === 'contusao' || m === 'crushing') && (d === 'contusao' || d === 'crushing')) return true;
    if ((m === 'corte' || m === 'cutting') && (d === 'corte' || d === 'cutting')) return true;
    if ((m === 'empalamento' || m === 'impaling') && (d === 'empalamento' || d === 'impaling')) return true;
    if ((m.startsWith('perfurante') || m === 'piercing') && (d.startsWith('perfurante') || d === 'piercing')) return true;
    if ((m === 'queima' || m === 'burning' || m === 'queimadura') && (d === 'queima' || d === 'burning' || d === 'queimadura')) return true;
    return false;
  };

  const getEffectiveLocModifiers = (loc?: BodyArmorLocation) => {
    if (!loc) return [];
    if (Array.isArray(loc.drModifiers) && loc.drModifiers.length > 0) {
      return loc.drModifiers
        .filter((m) => m && (Number(m.drModifier) || 0) !== 0 && m.modifierDamageType?.trim())
        .map((m) => ({ drModifier: Number(m.drModifier) || 0, modifierDamageType: m.modifierDamageType.trim() }));
    }
    if (loc.drModifier !== undefined && (Number(loc.drModifier) || 0) !== 0 && loc.modifierDamageType?.trim()) {
      return [{ drModifier: Number(loc.drModifier) || 0, modifierDamageType: loc.modifierDamageType.trim() }];
    }
    return [];
  };

  const matchingLocModifiers = selectedLoc
    ? getEffectiveLocModifiers(selectedLoc).filter((m) => isDamageTypeMatch(m.modifierDamageType, damageType))
    : [];

  const appliedArmorDrModifier = matchingLocModifiers.reduce((sum, m) => sum + m.drModifier, 0);
  const appliesArmorModifier = matchingLocModifiers.length > 0;

  const numericRawDamage = typeof rawDamage === 'number' ? rawDamage : 0;

  const damageCalc = calculateLocationDamage({
    locationName: selectedLoc ? selectedLoc.location : '',
    damageType,
    rawDamage: numericRawDamage,
    baseArmorDr,
    armorDrModifier: appliedArmorDrModifier,
    naturalDr: npc.naturalDr || 0,
    appliesArmorModifier,
    bypassDr,
    isNoLocation,
    customMultiplier: typeof customMultiplier === 'number' ? customMultiplier : 1.0,
    hpMax: npc.hpMax,
  });

  const {
    armorDr,
    naturalDr,
    locationBonusDr,
    totalDr: locationDr,
    penetratingDamage,
    woundMultiplier: multiplier,
    finalDamage,
    bodyPartDamage,
    isDamageCapped,
    partHp,
    bodyPartStatusAlert,
    appliedRules,
    requiresEyeConfirmation,
    eyeWarningMessage,
    torsoVitalsNotice,
  } = damageCalc;

  const vitalsLoc = effectiveLocations.find((l) => normalizeLocationKey(l.location) === 'vitals');

  const isDamageFormReady = Boolean(
    selectedLocationId &&
    rawDamage !== '' &&
    (damageType || isNoLocation) &&
    (damageType !== 'personalizado' || customMultiplier !== '') &&
    (!requiresEyeConfirmation || eyeConfirmed)
  );

  const handleConfirmDamage = () => {
    if (!isDamageFormReady) return;
    const locName = isNoLocation
      ? 'Sem parte do Corpo'
      : (selectedLoc ? selectedLoc.location : 'Geral');
    const matchingModText = matchingLocModifiers
      .map((m) => `${m.drModifier >= 0 ? `+${m.drModifier}` : m.drModifier} vs ${m.modifierDamageType}`)
      .join(', ');
    const armorNotes = isNoLocation
      ? 'Sem armadura (RD 0)'
      : appliesArmorModifier
      ? `${armorDr} arm (${baseArmorDr}${matchingModText ? ` [${matchingModText}]` : ''})`
      : `${armorDr} arm`;
    const effectiveTypeLabel = damageType === 'personalizado'
      ? `Personalizado (x${multiplier})`
      : damageType || (isNoLocation ? 'Direto' : '');
    const bonusDrText = locationBonusDr > 0 ? ` + ${locationBonusDr} bônus Cabeça` : '';
    const attacker = combatants.find((c) => c.id === selectedAttackerId);
    const attackerPrefix = attacker ? `[Atacante: ${attacker.name}] ` : '';
    const descDamageTypeLabel = damageType === 'personalizado' ? `Personalizado x${multiplier}` : damageType;
    const desc = customDescription.trim()
      ? `${attackerPrefix}${customDescription.trim()}`
      : (isNoLocation
        ? `${attackerPrefix}Dano Direto (Sem parte do corpo) | Dano: ${numericRawDamage}${damageType ? ` (${descDamageTypeLabel})` : ''} | RD: 0 | Final: -${finalDamage} PV`
        : isDamageCapped
        ? `${attackerPrefix}Local: ${locName} | Dano: ${numericRawDamage} (${descDamageTypeLabel}) | RD: ${locationDr} (${armorNotes} + ${naturalDr} nat${bonusDrText}) | Penetrante: ${penetratingDamage} | Mod: x${multiplier} | Dano no Membro: ${bodyPartDamage} PV | Final nos PV: -${finalDamage} PV (Limitado pela Vida da Parte)`
        : `${attackerPrefix}Local: ${locName} | Dano: ${numericRawDamage} (${descDamageTypeLabel}) | RD: ${locationDr} (${armorNotes} + ${naturalDr} nat${bonusDrText}) | Penetrante: ${penetratingDamage} | Mod: x${multiplier} | Final: -${finalDamage} PV`);

    onApplyDamage(npc.id, finalDamage, {
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      round: currentRound ?? 0,
      author: isPlayerView ? (currentUserName || 'assistente') : 'mestre',
      authorName: currentUserName || (isPlayerView ? 'Jogador' : 'Mestre'),
      type: 'damage',
      amount: finalDamage,
      description: desc,
      npcId: npc.id,
      npcName: npc.name,
      npcAvatar: npc.avatar,
      npcPreset: npc.avatarPreset,
      npcCharacterType: npc.characterType,
      attackerId: attacker?.id,
      attackerName: attacker?.name,
      hitLocation: locName,
      rawDamage: numericRawDamage,
      damageType: effectiveTypeLabel,
      naturalDr,
      armorDr,
      totalDr: locationDr,
      penetratingDamage,
      woundMultiplier: multiplier,
      finalDamage,
      bodyPartDamage,
      hpBefore: npc.hpCurrent,
      hpAfter: npc.hpCurrent - finalDamage,
    });
    onClose();
  };

  const handleConfirmFatigue = () => {
    const numFatigue = typeof fatigueDelta === 'number' ? fatigueDelta : 0;
    const targetChar = combatants.find((c) => c.id === spellTargetId) || npc;
    const spellNameTrimmed = isSpellExpenditure ? fatigueSpellName.trim() : '';

    const targetStone = selectedFatigueSource !== 'fp'
      ? manaStones.find((s) => s.id === selectedFatigueSource)
      : undefined;

    let costLabel = '';
    let personalFpSpend = 0;
    let manaStoneUsage: { itemId: string; amount: number } | undefined = undefined;

    if (targetStone) {
      personalFpSpend = 0;
      manaStoneUsage = { itemId: targetStone.id, amount: numFatigue };
      costLabel = `-${numFatigue} Mana [${targetStone.name}]`;
    } else {
      personalFpSpend = numFatigue;
      costLabel = `-${numFatigue} FP`;
    }

    let autoDesc = `Gasto de fadiga: ${costLabel}.`;
    if (spellNameTrimmed) {
      if (isSpellActive) {
        const durText = typeof spellDuration === 'number' && spellDuration > 0 ? ` [Duração: ${spellDuration}R]` : '';
        if (isAreaSpell) {
          autoDesc = `Magia Ativa [${spellNameTrimmed}] em Área (R${spellRound}${durText}): ${costLabel}.`;
        } else {
          autoDesc = `Magia Ativa [${spellNameTrimmed}] lançada em ${targetChar.name} (R${spellRound}${durText}): ${costLabel}.`;
        }
      } else {
        autoDesc = `Magia [${spellNameTrimmed}] lançada: ${costLabel}.`;
      }
    }
    const desc = customDescription.trim() || autoDesc;

    const spellData = spellNameTrimmed
      ? {
          spellName: spellNameTrimmed,
          isActiveSpell: isSpellActive,
          targetId: isAreaSpell ? 'area' : targetChar.id,
          targetName: isAreaSpell ? 'Área / Ambiente' : targetChar.name,
          round: spellRound !== undefined && !isNaN(Number(spellRound)) ? Number(spellRound) : (currentRound ?? 0),
          duration: typeof spellDuration === 'number' && spellDuration > 0 ? spellDuration : undefined,
          isAreaSpell: isAreaSpell,
        }
      : undefined;

    onApplyFatigue(
      npc.id,
      -personalFpSpend,
      {
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        round: currentRound ?? 0,
        author: isPlayerView ? (currentUserName || 'assistente') : 'mestre',
        authorName: currentUserName || (isPlayerView ? 'Jogador' : 'Mestre'),
        type: 'fatigue',
        amount: numFatigue,
        description: desc,
        npcId: npc.id,
        npcName: npc.name,
        npcAvatar: npc.avatar,
        npcPreset: npc.avatarPreset,
        npcCharacterType: npc.characterType,
        fpBefore: npc.fpCurrent,
        fpAfter: npc.fpCurrent - personalFpSpend,
        itemId: targetStone?.id,
        itemName: targetStone?.name,
      },
      spellData,
      manaStoneUsage
    );
    onClose();
  };

  const handleConfirmHeal = () => {
    if (healTarget === 'hp') {
      const desc = customDescription.trim() || `Recuperação de PV: +${healAmount} PV.`;
      onApplyDamage(npc.id, -healAmount, {
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        round: currentRound ?? 0,
        author: isPlayerView ? (currentUserName || 'assistente') : 'mestre',
        authorName: currentUserName || (isPlayerView ? 'Jogador' : 'Mestre'),
        type: 'heal',
        amount: healAmount,
        description: desc,
        npcId: npc.id,
        npcName: npc.name,
        npcAvatar: npc.avatar,
        npcPreset: npc.avatarPreset,
        npcCharacterType: npc.characterType,
        hpBefore: npc.hpCurrent,
        hpAfter: Math.min(npc.hpMax, npc.hpCurrent + healAmount),
      });
    } else {
      const desc = customDescription.trim() || `Descanso / Recuperação de Fadiga: +${healAmount} FP.`;
      onApplyFatigue(npc.id, healAmount, {
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        round: currentRound ?? 0,
        author: isPlayerView ? (currentUserName || 'assistente') : 'mestre',
        authorName: currentUserName || (isPlayerView ? 'Jogador' : 'Mestre'),
        type: 'rest',
        amount: healAmount,
        description: desc,
        npcId: npc.id,
        npcName: npc.name,
        npcAvatar: npc.avatar,
        npcPreset: npc.avatarPreset,
        npcCharacterType: npc.characterType,
        fpBefore: npc.fpCurrent,
        fpAfter: Math.min(npc.fpMax, npc.fpCurrent + healAmount),
      });
    }
    onClose();
  };

  const targetItem = availableItems.find((it) => it.id === selectedItemId) || availableItems[0];

  const handleConfirmItem = () => {
    if (!targetItem) return;

    // Se o item ainda não estiver cadastrado no npc, cadastra
    if (onAddQuickItem && (!npc.extraItems || !npc.extraItems.some((it) => it.id === targetItem.id))) {
      onAddQuickItem(npc.id, targetItem);
    }

    const numericItemDelta = typeof itemDelta === 'number' ? itemDelta : 0;
    const delta = itemAction === 'lose' ? -numericItemDelta : numericItemDelta;
    const currentVal = targetItem.current ?? 0;
    const newVal = Math.max(0, currentVal + delta);
    const actionLabel = itemAction === 'lose' ? 'Gasto / Perda' : 'Ganho / Recarga';

    const desc =
      customDescription.trim() ||
      `${actionLabel} de ${Math.abs(delta)}x ${targetItem.name} (${currentVal} -> ${newVal} / Total: ${targetItem.max}).`;

    if (onApplyItemChange) {
      onApplyItemChange(npc.id, targetItem.id, delta, {
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        round: currentRound ?? 0,
        author: isPlayerView ? (currentUserName || 'assistente') : 'mestre',
        authorName: currentUserName || (isPlayerView ? 'Jogador' : 'Mestre'),
        type: 'item',
        amount: delta,
        description: desc,
        npcId: npc.id,
        npcName: npc.name,
        npcAvatar: npc.avatar,
        npcPreset: npc.avatarPreset,
        npcCharacterType: npc.characterType,
        itemId: targetItem.id,
        itemName: targetItem.name,
        itemBefore: currentVal,
        itemAfter: newVal,
      });
    }
    onClose();
  };

  const effectiveMode = isRestrictedNpcView && (mode === 'item' || mode === 'heal') ? 'damage' : mode;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-750 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Heart className="text-rose-400" size={20} />
            <h3 className="text-base font-bold text-white">
              Lançar Dano / Fadiga{isRestrictedNpcView ? '' : ' / Itens'}: <span className="text-amber-400">{npc.name || 'NPC'}</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Mode: Damage / Fatigue / Heal / Item */}
        <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 gap-1 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setMode('damage')}
            className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 ${
              effectiveMode === 'damage' ? 'bg-rose-900/60 text-rose-200 border border-rose-700/50' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield size={13} />
            <span>Dano (PV)</span>
          </button>
          <button
            onClick={() => setMode('fatigue')}
            className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 ${
              effectiveMode === 'fatigue' ? 'bg-cyan-900/60 text-cyan-200 border border-cyan-700/50' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap size={13} />
            <span>Fadiga (FP)</span>
          </button>
          {!isRestrictedNpcView && (
            <button
              onClick={() => setMode('item')}
              className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 ${
                effectiveMode === 'item' ? 'bg-amber-900/60 text-amber-200 border border-amber-700/50' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Package size={13} />
              <span>Itens Extras</span>
            </button>
          )}
          {!isRestrictedNpcView && (
            <button
              onClick={() => setMode('heal')}
              className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 ${
                effectiveMode === 'heal' ? 'bg-emerald-900/60 text-emerald-200 border border-emerald-700/50' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles size={13} />
              <span>Cura</span>
            </button>
          )}
        </div>

        {effectiveMode === 'damage' && (
          <div className="space-y-4">
            {/* Hit Location Selector: Para o jogador atacando NPC mostra APENAS o local, sem armadura nem RD! */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Local do Corpo Atingido
              </label>
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="" disabled hidden>-- Selecione o Local do Corpo --</option>
                <option value="sem-parte" className="bg-slate-900 text-amber-300 font-bold">
                  ⚡ Sem parte do Corpo (Dano Direto / Sem Armadura)
                </option>
                {sortedDropdownLocations.map((loc) => {
                  const locMods = getEffectiveLocModifiers(loc);
                  const modText = locMods.length > 0
                    ? ` [${locMods.map((m) => `${m.drModifier >= 0 ? `+${m.drModifier}` : m.drModifier} vs ${m.modifierDamageType}`).join(', ')}]`
                    : '';
                  const rollPrefix = loc.rollTarget ? `[${loc.rollTarget}] ` : '';
                  return (
                    <option key={loc.id} value={loc.id}>
                      {isRestrictedNpcView
                        ? `${rollPrefix}${loc.location}`
                        : `${rollPrefix}${loc.location} — ${loc.armorName || 'Sem armadura'} (RD ${loc.dr}${modText}${
                            npc.naturalDr > 0 ? ` + ${npc.naturalDr} Natural` : ''
                          })`}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Damage value and damage type */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Dano Bruto Rolado
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="Ex: 8"
                  value={rawDamage}
                  onChange={(e) => setRawDamage(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm font-mono font-bold text-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Tipo de Dano {isNoLocation && <span className="text-[10px] text-slate-400 font-normal">(Opcional para Dano Direto)</span>}
                </label>
                <select
                  value={damageType}
                  onChange={(e) => setDamageType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">{isNoLocation ? '-- Direto nos PV (x1.0) --' : '-- Selecione o Tipo de Dano --'}</option>
                  <option value="corte">Corte (x1.5)</option>
                  <option value="empalamento">Empalamento (x2.0)</option>
                  <option value="perfurante">Perfurante (x1.0)</option>
                  <option value="perfurante_grande">Perfurante Grande (x1.5)</option>
                  <option value="perfurante_pequeno">Perfurante Pequeno (x0.5)</option>
                  <option value="contusao">Contusão (x1.0)</option>
                  <option value="queima">Queima / Fogo (x1.0)</option>
                  <option value="personalizado">Personalizado</option>
                </select>
              </div>
            </div>

            {/* Caixa para definir Multiplicador Livre quando o Tipo de Dano "Personalizado" é selecionado */}
            {damageType === 'personalizado' && (
              <div className="p-3 bg-slate-950/90 border border-amber-500/50 rounded-xl space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-amber-400 font-bold text-xs">⚡</span>
                    <label className="text-xs font-bold text-amber-300 whitespace-nowrap">
                      Multiplicador de Dano:
                    </label>
                  </div>
                  <div
                    style={{ width: '56px', minWidth: '56px', maxWidth: '56px', flexShrink: 0 }}
                    className="relative flex items-center justify-between bg-slate-900 border border-slate-800 focus-within:border-amber-500 rounded-lg overflow-hidden px-1.5 py-0.5"
                  >
                    <span className="text-amber-400 font-mono font-bold text-xs mr-2 select-none shrink-0">x</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="1.0"
                      value={customMultiplier}
                      onChange={(e) => setCustomMultiplier(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                      className="w-full bg-transparent text-white font-mono font-bold text-xs text-center focus:outline-none p-0 m-0"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
                  {[0.5, 1.0, 1.5, 2.0, 3.0, 4.0].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCustomMultiplier(val)}
                      className={`flex-1 py-1 text-xs font-mono font-bold rounded-md transition-all text-center ${
                        customMultiplier === val
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                      }`}
                    >
                      x{val}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Regra Adicional da Parte do Corpo (se houver) */}
            {selectedLoc?.additionalRule && (
              <div className="flex items-start gap-2 p-2.5 bg-blue-950/40 border border-blue-800/60 rounded-xl text-blue-200 text-xs">
                <Info size={15} className="text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-blue-300">Regra de {selectedLoc.location}:</span>{' '}
                  <span>{sanitizeHitLocationRule(selectedLoc.additionalRule)}</span>
                </div>
              </div>
            )}

            {/* Alerta de Confirmação para Dano no Olho (Regra do Eye) */}
            {requiresEyeConfirmation && (
              <div className="p-3 bg-amber-950/70 border border-amber-600/80 rounded-xl space-y-2">
                <div className="flex items-start gap-2 text-amber-300 text-xs font-semibold">
                  <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <span>{eyeWarningMessage}</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-amber-200 font-medium pl-6">
                  <input
                    type="checkbox"
                    checked={eyeConfirmed}
                    onChange={(e) => setEyeConfirmed(e.target.checked)}
                    className="rounded bg-slate-900 border-amber-500 text-amber-500 focus:ring-0"
                  />
                  <span>Confirmar e permitir registro deste dano no Olho</span>
                </label>
              </div>
            )}

            {/* Alerta de Regra de Torso -> Vitals */}
            {torsoVitalsNotice && (
              <div className="p-3 bg-amber-950/70 border border-amber-600/80 rounded-xl space-y-2 animate-in fade-in">
                <div className="flex items-start gap-2 text-amber-300 text-xs font-semibold">
                  <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold text-amber-200 block">Regra de Torso:</span>
                    <span className="text-amber-300 font-normal leading-relaxed block">
                      Sempre que um ataque dos tipos Contusão, Perfuração ou Queima / fogo:
                      <br />
                      Role 1d, se o resultado for 1, o ataque atinge o Vitals.
                    </span>
                  </div>
                </div>
                {vitalsLoc && selectedLocationId !== vitalsLoc.id && (
                  <div className="pl-6 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedLocationId(vitalsLoc.id)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-amber-600/25 hover:bg-amber-600/45 text-amber-200 hover:text-white border border-amber-500/50 rounded-lg transition-colors cursor-pointer shadow-sm"
                      title="Mudar o local atingido para Órgãos Vitais (Vitals)"
                    >
                      <Crosshair size={13} className="text-amber-400" />
                      <span>Se tirou 1 no dado: Mudar alvo para Vitals</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Bypass DR option (Apenas Mestre ou para Personagens) */}
            {!isRestrictedNpcView && !isNoLocation && (
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bypassDr}
                  onChange={(e) => setBypassDr(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-0"
                />
                <span>Ignorar Armadura / RD</span>
              </label>
            )}

            {/* Resumo do Cálculo: Oculto para o jogador ao atacar NPC! De Personagens o jogador pode ver tudo */}
            {!isRestrictedNpcView && (
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1 font-mono text-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1 flex items-center justify-between">
                  <span>Resumo do Cálculo GURPS:</span>
                  <span className="text-slate-400 font-sans">
                    {isNoLocation ? 'Sem parte do Corpo (Dano Direto)' : (selectedLoc ? selectedLoc.location : 'Geral')}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Dano Bruto Rolado:</span>
                  <span className="text-white font-bold">{rawDamage || 0} {damageType ? `(${damageType})` : '(Dano Direto)'}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>RD Armadura:</span>
                  <div className="flex items-center gap-1.5 font-bold">
                    {isNoLocation ? (
                      <span className="text-emerald-400">0 (Sem parte do corpo)</span>
                    ) : (
                      <>
                        <span className="text-amber-400">{armorDr}</span>
                        {appliesArmorModifier && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-normal border ${
                            appliedArmorDrModifier < 0
                              ? 'bg-rose-950/70 border-rose-800 text-rose-300'
                              : 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
                          }`}>
                            ({baseArmorDr} {appliedArmorDrModifier >= 0 ? `+${appliedArmorDrModifier}` : appliedArmorDrModifier} vs {matchingLocModifiers.map((m) => m.modifierDamageType).join(', ')})
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {!isNoLocation && (
                  <div className="flex justify-between text-slate-400">
                    <span>RD Natural + Bônus:</span>
                    <span className="text-amber-400 font-bold">
                      {naturalDr}{locationBonusDr > 0 ? ` (+${locationBonusDr} Crânio)` : ''}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400">
                  <span>RD Total Considerada:</span>
                  <span className="text-amber-300 font-bold">
                    {isNoLocation ? '0 (Direto nos PV)' : bypassDr ? '0 (Ignorada)' : locationDr}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Dano Penetrante:</span>
                  <span className="text-white font-bold">{penetratingDamage}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Modificador de Ferimento:</span>
                  <span className="text-white">x{multiplier} {damageType ? `(${damageType})` : '(Direto)'}</span>
                </div>

                {!isNoLocation && selectedLoc && (
                  <div className={`flex justify-between text-xs font-mono ${
                    isDamageCapped ? 'text-amber-300 bg-amber-950/40 p-2 rounded-lg border border-amber-600/40 font-sans' : 'text-slate-400'
                  }`}>
                    <span>Dano Total no Membro ({selectedLoc.location}):</span>
                    <span className="text-white font-bold">
                      {bodyPartDamage} PV{isDamageCapped ? ` (Limite PV do Membro: ${partHp} PV)` : (partHp ? ` (Vida: ${partHp} PV)` : '')}
                    </span>
                  </div>
                )}

                {appliedRules.length > 0 && (
                  <div className="pt-1 flex flex-wrap gap-1 font-sans">
                    {appliedRules.map((rule, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-amber-950/60 border border-amber-700/60 text-amber-300 rounded text-[10px] font-semibold">
                        ⚡ {rule}
                      </span>
                    ))}
                  </div>
                )}

                <div className="border-t border-slate-800 pt-2 flex justify-between text-sm font-bold text-rose-400">
                  <span>Dano Final nos PV:</span>
                  <span className="text-base font-black">
                    -{finalDamage} PV {isDamageCapped ? `(de ${bodyPartDamage} no membro)` : ''}
                  </span>
                </div>
              </div>
            )}

            {/* Causador do Dano / Atacante (Opcional) */}
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Quem deu o dano? / Atacante (opcional)
              </label>
              <select
                value={selectedAttackerId}
                onChange={(e) => setSelectedAttackerId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="">Nenhum / Não especificado</option>
                {combatants.length > 0 && (
                  <>
                    {combatants.filter((c) => c.characterType === 'player').length > 0 && (
                      <optgroup label="Personagens (Jogadores)">
                        {combatants
                          .filter((c) => c.characterType === 'player')
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              👤 {c.name}
                            </option>
                          ))}
                      </optgroup>
                    )}
                    {combatants.filter((c) => c.characterType !== 'player').length > 0 && (
                      <optgroup label="NPCs">
                        {combatants
                          .filter((c) => c.characterType !== 'player')
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              👾 {c.name}
                            </option>
                          ))}
                      </optgroup>
                    )}
                  </>
                )}
              </select>
            </div>

            {/* Description/Notes */}
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Nota da Ação / Descrição (opcional)
              </label>
              <input
                type="text"
                placeholder="Anotação do golpe..."
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>



            <button
              onClick={handleConfirmDamage}
              disabled={!isDamageFormReady}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
            >
              <Heart size={16} />
              <span>{isRestrictedNpcView ? 'Lançar Dano' : `Aplicar -${finalDamage} PV de Dano`}</span>
            </button>
          </div>
        )}

        {effectiveMode === 'fatigue' && (
          <div className="space-y-3">
            {/* Seleção de Fonte: Fadiga Real vs Pedras de Mana */}
            {isRestrictedNpcView ? (
              <div className="bg-slate-950/70 border border-cyan-800/60 rounded-xl p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap size={14} className="text-cyan-400" />
                  <span className="text-xs font-bold text-white">Fadiga Real (FP)</span>
                </div>
                <span className="text-[10px] text-slate-400 italic">
                  Gasto debitado da fadiga do NPC
                </span>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-semibold text-slate-300">
                    Fonte de Energia / Fadiga para o Gasto:
                  </label>
                  {manaStones.length > 0 && (
                    <span className="text-[10px] text-cyan-400 font-mono">
                      {manaStones.length + 1} opções disponíveis
                    </span>
                  )}
                </div>
                <div className="max-h-36 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5 custom-scrollbar">
                  {/* Opção 1: Fadiga Própria */}
                  <button
                    type="button"
                    onClick={() => setSelectedFatigueSource('fp')}
                    className={`py-1.5 px-2.5 rounded-lg border text-left transition-all flex items-center justify-between ${
                      selectedFatigueSource === 'fp'
                        ? 'bg-cyan-950/70 border-cyan-500 ring-1 ring-cyan-500/50 text-white shadow-sm'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Zap size={14} className={selectedFatigueSource === 'fp' ? 'text-cyan-400' : 'text-slate-500'} />
                      <span className="text-xs font-bold truncate">Fadiga Própria (FP)</span>
                    </div>
                    <div className="text-right shrink-0 font-mono text-xs font-bold text-cyan-300">
                      {npc.fpCurrent} <span className="text-[10px] text-slate-400 font-normal">/ {npc.fpMax}</span>
                    </div>
                  </button>

                  {/* Opções Pedras de Mana (se existirem na ficha) */}
                  {manaStones.map((stone) => {
                    const isSelected = selectedFatigueSource === stone.id;
                    const isEmpty = (stone.current ?? 0) <= 0;
                    return (
                      <button
                        key={stone.id}
                        type="button"
                        onClick={() => setSelectedFatigueSource(stone.id)}
                        className={`py-1.5 px-2.5 rounded-lg border text-left transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-cyan-950/70 border-cyan-500 ring-1 ring-cyan-500/50 text-white shadow-sm'
                            : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs">💎</span>
                          <span className="text-xs font-bold truncate" title={stone.name}>
                            {stone.name}
                          </span>
                        </div>
                        <div className="text-right shrink-0 font-mono text-xs font-bold">
                          <span className={isEmpty ? 'text-rose-400' : 'text-cyan-300'}>
                            {stone.current ?? 0}
                          </span>{' '}
                          <span className="text-[10px] text-slate-400 font-normal">/ {stone.max}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantidade a Gastar (linha compacta) */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <label className="text-xs font-semibold text-slate-300 block truncate">
                  {selectedStone ? `Gastar da ${selectedStone.name}:` : isRestrictedNpcView ? 'Quantidade de Fadiga Real (FP):' : 'Quantidade de Fadiga (FP):'}
                </label>
                {selectedStone && (
                  <span className="text-[10px] font-mono text-cyan-400 block">
                    Disponível na pedra: {selectedStone.current ?? 0}
                  </span>
                )}
              </div>
              <input
                type="number"
                min="0"
                max={selectedStone ? selectedStone.current : undefined}
                value={fatigueDelta}
                onChange={(e) => setFatigueDelta(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-base text-center font-mono font-bold text-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            {/* Checkbox: É Magia? (linha compacta) */}
            <div className="flex items-center justify-between px-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isSpellExpenditure}
                  onChange={(e) => setIsSpellExpenditure(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-900 border-purple-700 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-purple-400" />
                  É Magia / Conjurando Magia
                </span>
              </label>
              <span className="text-[10px] text-slate-500">
                {isSpellExpenditure ? 'Preencha os dados abaixo' : 'Gasto comum de fadiga'}
              </span>
            </div>

            {/* Magia informada (visível somente se 'É Magia' estiver marcado) */}
            {isSpellExpenditure && (
              <div className="bg-slate-950/70 border border-purple-900/40 rounded-xl p-2.5 space-y-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1">
                      <Sparkles size={12} className="text-purple-400" />
                      Nome da Magia:
                    </span>
                    {!isRestrictedNpcView && npc.spells && npc.spells.length > 0 && (
                      <span className="text-[9px] text-slate-500">Ou escolha da ficha:</span>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Ex: Escudo, Criar Ar, Luz..."
                    value={fatigueSpellName}
                    onChange={(e) => setFatigueSpellName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-750 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />

                  {/* Chips de magias da ficha do conjurador (apenas para Personagens ou Mestre; oculto para jogador vendo NPC) */}
                  {!isRestrictedNpcView && npc.spells && npc.spells.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {npc.spells.map((sp) => (
                        <button
                          key={sp.id}
                          type="button"
                          onClick={() => setFatigueSpellName(sp.name)}
                          className={`text-[9px] px-1.5 py-0.5 rounded border transition-all ${
                            fatigueSpellName === sp.name
                              ? 'bg-purple-900/60 border-purple-500 text-purple-200 font-bold'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                          }`}
                        >
                          {sp.name} (NH {sp.nh})
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Checkbox: Magia Ativa */}
                <div className="pt-1 border-t border-slate-800/60">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isSpellActive}
                      onChange={(e) => setIsSpellActive(e.target.checked)}
                      className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-purple-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-purple-300">Magia Ativa / Sustentada</span>
                      <span className="text-slate-500 text-[10px] ml-1.5">
                        (registra em "Magias Ativas" e "Sob Efeito")
                      </span>
                    </div>
                  </label>
                </div>

                {/* Configuração de Alvo e Rodada se Magia Ativa marcada */}
                {isSpellActive && (
                  <div className="space-y-2 pt-1.5 border-t border-purple-900/40 bg-purple-950/20 p-2 rounded-lg">
                    {/* Campo Magia em área */}
                    <div className="flex items-center justify-between bg-slate-900/60 p-2 rounded-lg border border-purple-900/30">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isAreaSpell}
                          onChange={(e) => setIsAreaSpell(e.target.checked)}
                          className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                          <span>🌐</span> Magia em área
                        </span>
                      </label>
                      <span className="text-[10px] text-slate-500">
                        {isAreaSpell ? 'Registra apenas no conjurador (sem alvo individual)' : 'Vincula a um alvo específico'}
                      </span>
                    </div>

                    {isAreaSpell ? (
                      <div className="flex flex-wrap items-center justify-between gap-1.5 bg-slate-900/90 border border-purple-900/40 rounded-lg px-2.5 py-1.5">
                        <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                          <span>🌐</span> Alvo: Área / Ambiente
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 shrink-0">Rodada:</span>
                            <input
                              type="number"
                              min="0"
                              value={spellRound}
                              onChange={(e) => setSpellRound(Math.max(0, parseInt(e.target.value, 10) || 0))}
                              className="w-14 bg-slate-900 border border-slate-750 rounded-lg px-1.5 py-0.5 text-xs text-center font-mono font-bold text-amber-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 shrink-0">Duração:</span>
                            <input
                              type="number"
                              min="1"
                              placeholder="Opc."
                              value={spellDuration}
                              onChange={(e) => setSpellDuration(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10) || 1))}
                              className="w-14 bg-slate-900 border border-slate-750 rounded-lg px-1.5 py-0.5 text-xs text-center font-mono text-purple-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
                              title="Quantidade de rodadas que a magia dura (opcional)"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-1 text-[10px]">
                          <span className="font-bold text-purple-300">Alvo da Magia:</span>
                          <div className="flex items-center gap-0.5 bg-slate-900 p-0.5 rounded border border-slate-800">
                            <button
                              type="button"
                              onClick={() => setSpellTargetFilter('all')}
                              className={`px-1.5 py-0.5 rounded ${spellTargetFilter === 'all' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                            >
                              Todos
                            </button>
                            <button
                              type="button"
                              onClick={() => setSpellTargetFilter('player')}
                              className={`px-1.5 py-0.5 rounded ${spellTargetFilter === 'player' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                            >
                              Jogadores
                            </button>
                            <button
                              type="button"
                              onClick={() => setSpellTargetFilter('npc')}
                              className={`px-1.5 py-0.5 rounded ${spellTargetFilter === 'npc' ? 'bg-purple-700 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                            >
                              NPCs
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-1.5 items-center">
                          <div className="sm:col-span-2">
                            <select
                              value={spellTargetId}
                              onChange={(e) => setSpellTargetId(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-750 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                            >
                              <option value={npc.id}>★ {npc.name} (Próprio Conjurador)</option>
                              {combatants
                                .filter((c) => c.id !== npc.id)
                                .filter((c) => {
                                  if (spellTargetFilter === 'player') return c.characterType === 'player';
                                  if (spellTargetFilter === 'npc') return c.characterType !== 'player';
                                  return true;
                                })
                                .map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.characterType === 'player' ? '👤 ' : '👾 '}
                                    {c.name} {c.isDead ? '(Morto)' : ''}
                                  </option>
                                ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 shrink-0">Rodada:</span>
                            <input
                              type="number"
                              min="0"
                              value={spellRound}
                              onChange={(e) => setSpellRound(Math.max(0, parseInt(e.target.value, 10) || 0))}
                              className="w-full bg-slate-900 border border-slate-750 rounded-lg px-1.5 py-0.5 text-xs text-center font-mono font-bold text-amber-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 shrink-0">Duração:</span>
                            <input
                              type="number"
                              min="1"
                              placeholder="Opc."
                              value={spellDuration}
                              onChange={(e) => setSpellDuration(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10) || 1))}
                              className="w-full bg-slate-900 border border-slate-750 rounded-lg px-1.5 py-0.5 text-xs text-center font-mono text-purple-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
                              title="Quantidade de rodadas que a magia dura (opcional)"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Motivo do Gasto (opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Magia, Esforço Extra, Corrida..."
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            {(() => {
              const totalVal = typeof fatigueDelta === 'number' ? fatigueDelta : 0;
              return (
                <button
                  onClick={handleConfirmFatigue}
                  className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                >
                  <Zap size={14} />
                  <span>
                    {isRestrictedNpcView
                      ? `Gastar ${totalVal} FP da Fadiga Real`
                      : selectedStone
                      ? `Gastar ${totalVal} Mana de ${selectedStone.name}`
                      : `Gastar ${totalVal} FP de Fadiga`}
                  </span>
                </button>
              );
            })()}
          </div>
        )}

        {!isRestrictedNpcView && effectiveMode === 'heal' && (
          <div className="space-y-4">
            {/* Escolha entre curar PV ou curar Fadiga */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                O que você deseja curar / recuperar?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setHealTarget('hp')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    healTarget === 'hp'
                      ? 'bg-rose-950 border-rose-500 text-rose-200 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Heart size={14} className={healTarget === 'hp' ? 'text-rose-400' : ''} />
                  <span>Curar Pontos de Vida (PV)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHealTarget('fp')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    healTarget === 'fp'
                      ? 'bg-cyan-950 border-cyan-500 text-cyan-200 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Zap size={14} className={healTarget === 'fp' ? 'text-cyan-400' : ''} />
                  <span>Recuperar Fadiga (FP)</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Quantidade a Recuperar (+{healTarget === 'hp' ? 'PV' : 'FP'})
              </label>
              <input
                type="number"
                min="1"
                value={healAmount}
                onChange={(e) => setHealAmount(Math.max(1, parseInt(e.target.value) || 1))}
                className={`w-32 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-lg font-mono font-bold focus:outline-none focus:ring-1 ${
                  healTarget === 'hp' ? 'text-rose-400 focus:ring-rose-500' : 'text-cyan-300 focus:ring-cyan-500'
                }`}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Descrição da Cura (Poção, Magia de Cura, Descanso)
              </label>
              <input
                type="text"
                placeholder="Ex: Poção de Cura Menor..."
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <button
              onClick={handleConfirmHeal}
              className={`w-full py-2.5 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 ${
                healTarget === 'hp' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-cyan-600 hover:bg-cyan-500'
              }`}
            >
              <Sparkles size={16} />
              <span>
                {healTarget === 'hp'
                  ? `Curar +${healAmount} Pontos de Vida (PV)`
                  : `Recuperar +${healAmount} Pontos de Fadiga (FP)`}
              </span>
            </button>
          </div>
        )}

        {/* MODO ITEM EXTRA: Flechas, Pedras de Mana, Escudos, etc. (Apenas Personagens ou Mestre) */}
        {!isRestrictedNpcView && effectiveMode === 'item' && (
          availableItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 italic space-y-1.5 bg-slate-950/40 rounded-xl border border-slate-800 p-4">
              <p className="font-bold text-amber-300 flex items-center justify-center gap-1.5 not-italic">
                <Star size={15} className="fill-amber-400 text-amber-400" />
                <span>Nenhum item extra favoritado</span>
              </p>
              <p className="text-[11px] text-slate-300 not-italic">
                Apenas os itens marcados como favoritos aparecem nesta tela de ações rápidas.
              </p>
              <p className="text-[10px] text-slate-500">
                Favorite itens clicando na estrela ⭐ na seção &quot;Itens Extras &amp; Recursos&quot; da ficha para usá-los aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Escolha do Item Extra */}
              <div>
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <label className="text-xs font-semibold text-slate-300 shrink-0">
                    Selecione o Item / Recurso:
                  </label>
                  <span className="text-[11px] text-amber-400 font-medium whitespace-nowrap shrink-0 truncate">
                    {targetItem?.name}: <span className="font-mono font-bold">{targetItem?.current ?? 0} / {targetItem?.max ?? 0}</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {availableItems.map((item) => {
                    const isSel = item.id === selectedItemId;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedItemId(item.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isSel
                            ? 'bg-amber-950/70 border-amber-500 text-amber-200 ring-1 ring-amber-500/70'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-850'
                        }`}
                      >
                        <div className="text-xs font-bold truncate">{item.name}</div>
                        <div className="text-[11px] font-mono mt-1 flex items-center justify-between gap-1 whitespace-nowrap overflow-hidden">
                          <span className="text-slate-400 text-[10px] shrink-0">Qtd:</span>
                          <span className="font-bold text-amber-300 font-mono whitespace-nowrap tabular-nums shrink-0">
                            {item.current} / {item.max}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ação: Perda / Gasto (-) ou Ganho / Recarga (+) */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Tipo de Lançamento:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setItemAction('lose')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      itemAction === 'lose'
                        ? 'bg-rose-950 border-rose-500 text-rose-200 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Minus size={14} className={itemAction === 'lose' ? 'text-rose-400' : ''} />
                    <span>Gastar / Perder (-)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setItemAction('gain')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      itemAction === 'gain'
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-200 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Plus size={14} className={itemAction === 'gain' ? 'text-emerald-400' : ''} />
                    <span>Recarregar / Ganhar (+)</span>
                  </button>
                </div>
              </div>

              {/* Quantidade a alterar */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Quantidade a {itemAction === 'lose' ? 'Gastar' : 'Ganhar'}
                </label>
                <div>
                  <input
                    type="number"
                    min="0"
                    value={itemDelta}
                    onChange={(e) => setItemDelta(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className={`w-32 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-lg font-mono font-bold text-center focus:outline-none focus:ring-1 ${
                      itemAction === 'lose'
                        ? 'text-rose-400 focus:ring-rose-500'
                        : 'text-emerald-400 focus:ring-emerald-500'
                    }`}
                  />
                </div>
              </div>

              {/* Resumo do Lançamento */}
              {targetItem && (
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between text-xs font-mono gap-2 flex-wrap sm:flex-nowrap">
                  <span className="text-slate-400 shrink-0">
                    Previsão para {targetItem.name}:
                  </span>
                  <span className="font-bold text-slate-200 whitespace-nowrap shrink-0">
                    {targetItem.current} →{' '}
                    <span
                      className={
                        itemAction === 'lose' ? 'text-rose-400 font-black' : 'text-emerald-400 font-black'
                      }
                    >
                      {Math.max(
                        0,
                        targetItem.current +
                          (itemAction === 'lose'
                            ? -(typeof itemDelta === 'number' ? itemDelta : 0)
                            : typeof itemDelta === 'number'
                            ? itemDelta
                            : 0)
                      )}
                    </span>{' '}
                    <span className="text-slate-500 font-normal">/ {targetItem.max}</span>
                  </span>
                </div>
              )}

              {/* Descrição / Motivo */}
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Motivo / Descrição da Ação (opcional)
                </label>
                <input
                  type="text"
                  placeholder={
                    targetItem?.name.toLowerCase().includes('flecha')
                      ? 'Ex: Disparo contra o orc na torre...'
                      : targetItem?.name.toLowerCase().includes('escudo')
                      ? 'Ex: Bloqueou golpe pesado de machado...'
                      : 'Ex: Conjuração de bola de fogo...'
                  }
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

            {/* Botão de Confirmação */}
            <button
              onClick={handleConfirmItem}
              className={`w-full py-2.5 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 ${
                itemAction === 'lose' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              <Package size={16} />
              <span>
                Confirmar {itemAction === 'lose' ? 'Gasto' : 'Ganho'} de {itemDelta}x {targetItem?.name || 'Item'}
              </span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
