import React, { useState } from 'react';
import { NPC, ActionLogEntry, ExtraItem } from '../types/rpg';
import { Shield, Zap, Heart, X, Sparkles, Package, Plus, Minus } from 'lucide-react';

interface DamageCalculatorModalProps {
  npc: NPC;
  isOpen: boolean;
  onClose: () => void;
  onApplyDamage: (npcId: string, finalDamage: number, logEntry: Omit<ActionLogEntry, 'id'>) => void;
  onApplyFatigue: (npcId: string, fpDelta: number, logEntry: Omit<ActionLogEntry, 'id'>) => void;
  onApplyItemChange?: (
    npcId: string,
    itemId: string,
    delta: number,
    logEntry: Omit<ActionLogEntry, 'id'>
  ) => void;
  onAddQuickItem?: (npcId: string, item: ExtraItem) => void;
  isPlayerView?: boolean;
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
}) => {
  const [mode, setMode] = useState<'damage' | 'fatigue' | 'heal' | 'item'>('damage');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [rawDamage, setRawDamage] = useState<number | ''>('');
  const [damageType, setDamageType] = useState<string>('');
  const [bypassDr, setBypassDr] = useState<boolean>(false);
  const [customDescription, setCustomDescription] = useState<string>('');

  // Fatigue state (Padrão 0)
  const [fatigueDelta, setFatigueDelta] = useState<number | ''>(0);

  // Heal state (Agora pode curar PV ou curar Fadiga!)
  const [healTarget, setHealTarget] = useState<'hp' | 'fp'>('hp');
  const [healAmount, setHealAmount] = useState<number>(3);

  // Extra Item state (Flechas, Pedras de Mana, Escudo, etc. - Respeita a lista do NPC)
  const availableItems = npc.extraItems || [];

  const [selectedItemId, setSelectedItemId] = useState<string>(
    (availableItems[0]?.id) || ''
  );
  const [itemAction, setItemAction] = useState<'lose' | 'gain'>('lose');
  const [itemDelta, setItemDelta] = useState<number | ''>(0);

  if (!isOpen) return null;

  const isNoLocation = selectedLocationId === 'sem-parte';
  const selectedLoc = isNoLocation ? undefined : npc.armorLocations.find((l) => l.id === selectedLocationId);
  const baseArmorDr = selectedLoc ? selectedLoc.dr : 0;

  // Verifica se a armadura possui modificador de RD contra este tipo de dano
  const appliesArmorModifier = Boolean(
    selectedLoc &&
    selectedLoc.drModifier !== undefined &&
    selectedLoc.drModifier !== 0 &&
    selectedLoc.modifierDamageType &&
    damageType &&
    (
      selectedLoc.modifierDamageType.toLowerCase() === damageType.toLowerCase() ||
      (selectedLoc.modifierDamageType === 'contusao' && (damageType === 'contusao' || damageType === 'crushing')) ||
      (selectedLoc.modifierDamageType === 'corte' && (damageType === 'corte' || damageType === 'cutting')) ||
      (selectedLoc.modifierDamageType === 'empalamento' && (damageType === 'empalamento' || damageType === 'impaling')) ||
      (selectedLoc.modifierDamageType === 'perfurante' && (damageType.startsWith('perfurante') || damageType === 'piercing')) ||
      (selectedLoc.modifierDamageType === 'queima' && (damageType === 'queima' || damageType === 'burning'))
    )
  );

  const armorDrMod = appliesArmorModifier ? (selectedLoc?.drModifier || 0) : 0;
  const armorDr = isNoLocation ? 0 : Math.max(0, baseArmorDr + armorDrMod);
  const naturalDr = isNoLocation ? 0 : (npc.naturalDr || 0);
  const locationDr = isNoLocation ? 0 : (bypassDr ? 0 : (armorDr + naturalDr));

  // GURPS damage multipliers after penetrating DR:
  const getMultiplier = (type: string) => {
    switch (type) {
      case 'corte': return 1.5;
      case 'empalamento': return 2.0;
      case 'perfurante_grande': return 1.5;
      case 'perfurante_pequeno': return 0.5;
      case 'contusao': return 1.0;
      case 'perfurante': return 1.0;
      case 'queima': return 1.0;
      default: return 1.0;
    }
  };

  const numericRawDamage = typeof rawDamage === 'number' ? rawDamage : 0;
  const penetratingDamage = Math.max(0, numericRawDamage - locationDr);
  const multiplier = damageType ? getMultiplier(damageType) : 1.0;
  const finalDamage = Math.floor(penetratingDamage * multiplier);

  const isDamageFormReady = Boolean(
    selectedLocationId &&
    rawDamage !== '' &&
    (damageType || isNoLocation)
  );

  const handleConfirmDamage = () => {
    if (!isDamageFormReady) return;
    const locName = isNoLocation
      ? 'Sem parte do Corpo'
      : (selectedLoc ? selectedLoc.location : 'Geral');
    const armorNotes = isNoLocation
      ? 'Sem armadura (RD 0)'
      : appliesArmorModifier
      ? `${armorDr} arm (${baseArmorDr}${armorDrMod >= 0 ? `+${armorDrMod}` : armorDrMod} vs ${selectedLoc?.modifierDamageType})`
      : `${armorDr} arm`;
    const effectiveTypeLabel = damageType || (isNoLocation ? 'Direto' : '');
    const desc = customDescription.trim() ||
      (isNoLocation
        ? `Dano Direto (Sem parte do corpo) | Dano: ${numericRawDamage}${damageType ? ` (${damageType} x${multiplier})` : ''} | RD: 0 | Final: -${finalDamage} PV`
        : `Local: ${locName} | Dano: ${numericRawDamage} (${damageType}) | RD: ${locationDr} (${armorNotes} + ${naturalDr} nat) | Penetrante: ${penetratingDamage} | Mod: x${multiplier} | Final: -${finalDamage} PV`);

    onApplyDamage(npc.id, finalDamage, {
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      author: isPlayerView ? 'assistente' : 'mestre',
      type: 'damage',
      amount: finalDamage,
      description: desc,
      npcId: npc.id,
      npcName: npc.name,
      npcAvatar: npc.avatar,
      npcPreset: npc.avatarPreset,
      hitLocation: locName,
      rawDamage: numericRawDamage,
      damageType: effectiveTypeLabel,
      naturalDr,
      armorDr,
      totalDr: locationDr,
      penetratingDamage,
      woundMultiplier: multiplier,
      finalDamage,
      hpBefore: npc.hpCurrent,
      hpAfter: npc.hpCurrent - finalDamage,
    });
    onClose();
  };

  const handleConfirmFatigue = () => {
    const numFatigue = typeof fatigueDelta === 'number' ? fatigueDelta : 0;
    const desc = customDescription.trim() || `Gasto de fadiga: -${numFatigue} FP.`;
    onApplyFatigue(npc.id, -numFatigue, {
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      author: isPlayerView ? 'assistente' : 'mestre',
      type: 'fatigue',
      amount: numFatigue,
      description: desc,
      npcId: npc.id,
      npcName: npc.name,
      npcAvatar: npc.avatar,
      npcPreset: npc.avatarPreset,
      fpBefore: npc.fpCurrent,
      fpAfter: npc.fpCurrent - numFatigue,
    });
    onClose();
  };

  const handleConfirmHeal = () => {
    if (healTarget === 'hp') {
      const desc = customDescription.trim() || `Recuperação de PV: +${healAmount} PV.`;
      onApplyDamage(npc.id, -healAmount, {
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        author: isPlayerView ? 'assistente' : 'mestre',
        type: 'heal',
        amount: healAmount,
        description: desc,
        npcId: npc.id,
        npcName: npc.name,
        npcAvatar: npc.avatar,
        npcPreset: npc.avatarPreset,
        hpBefore: npc.hpCurrent,
        hpAfter: Math.min(npc.hpMax, npc.hpCurrent + healAmount),
      });
    } else {
      const desc = customDescription.trim() || `Descanso / Recuperação de Fadiga: +${healAmount} FP.`;
      onApplyFatigue(npc.id, healAmount, {
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        author: isPlayerView ? 'assistente' : 'mestre',
        type: 'rest',
        amount: healAmount,
        description: desc,
        npcId: npc.id,
        npcName: npc.name,
        npcAvatar: npc.avatar,
        npcPreset: npc.avatarPreset,
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
        author: isPlayerView ? 'assistente' : 'mestre',
        type: 'item',
        amount: delta,
        description: desc,
        npcId: npc.id,
        npcName: npc.name,
        npcAvatar: npc.avatar,
        npcPreset: npc.avatarPreset,
        itemId: targetItem.id,
        itemName: targetItem.name,
        itemBefore: currentVal,
        itemAfter: newVal,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-750 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Heart className="text-rose-400" size={20} />
            <h3 className="text-base font-bold text-white">
              Lançar Dano / Fadiga / Itens: <span className="text-amber-400">{npc.name || 'NPC'}</span>
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
              mode === 'damage' ? 'bg-rose-900/60 text-rose-200 border border-rose-700/50' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield size={13} />
            <span>Dano (PV)</span>
          </button>
          <button
            onClick={() => setMode('fatigue')}
            className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 ${
              mode === 'fatigue' ? 'bg-cyan-900/60 text-cyan-200 border border-cyan-700/50' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap size={13} />
            <span>Fadiga (FP)</span>
          </button>
          <button
            onClick={() => setMode('item')}
            className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 ${
              mode === 'item' ? 'bg-amber-900/60 text-amber-200 border border-amber-700/50' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Package size={13} />
            <span>Itens Extras</span>
          </button>
          {!isPlayerView && (
            <button
              onClick={() => setMode('heal')}
              className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 ${
                mode === 'heal' ? 'bg-emerald-900/60 text-emerald-200 border border-emerald-700/50' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles size={13} />
              <span>Cura</span>
            </button>
          )}
        </div>

        {mode === 'damage' && (
          <div className="space-y-4">
            {/* Hit Location Selector: Para o jogador mostra APENAS o local, sem armadura nem RD! */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Local do Corpo Atingido
              </label>
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="" disabled>-- Selecione o Local do Corpo --</option>
                <option value="sem-parte" className="bg-slate-900 text-amber-300 font-bold">
                  ⚡ Sem parte do Corpo (Dano Direto / Sem Armadura)
                </option>
                {npc.armorLocations.map((loc) => {
                  const modText = loc.drModifier && loc.modifierDamageType
                    ? ` [${loc.drModifier >= 0 ? `+${loc.drModifier}` : loc.drModifier} vs ${loc.modifierDamageType}]`
                    : '';
                  return (
                    <option key={loc.id} value={loc.id}>
                      {isPlayerView
                        ? loc.location
                        : `${loc.location} — ${loc.armorName || 'Sem armadura'} (RD ${loc.dr}${modText}${
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
                </select>
              </div>
            </div>

            {/* Bypass DR option (Apenas Mestre) */}
            {!isPlayerView && !isNoLocation && (
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

            {/* Resumo do Cálculo: Oculto para o jogador! Apenas o Mestre pode ver o resumo */}
            {!isPlayerView && (
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
                            armorDrMod < 0
                              ? 'bg-rose-950/70 border-rose-800 text-rose-300'
                              : 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
                          }`}>
                            ({baseArmorDr} {armorDrMod >= 0 ? `+${armorDrMod}` : armorDrMod} vs {selectedLoc?.modifierDamageType})
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {!isNoLocation && (
                  <div className="flex justify-between text-slate-400">
                    <span>RD Natural do NPC:</span>
                    <span className="text-amber-400 font-bold">{naturalDr}</span>
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
                <div className="border-t border-slate-800 pt-2 flex justify-between text-sm font-bold text-rose-400">
                  <span>Dano Final nos PV:</span>
                  <span className="text-base font-black">-{finalDamage} PV</span>
                </div>
              </div>
            )}

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

            {!isDamageFormReady && (
              <p className="text-[11px] text-amber-400 text-center font-medium bg-amber-950/40 border border-amber-800/40 rounded-lg p-2">
                {!selectedLocationId
                  ? 'Selecione o Local do Corpo (ou "Sem parte do Corpo") e informe o Dano Bruto.'
                  : !rawDamage && rawDamage !== 0
                  ? 'Informe o Dano Bruto rolado.'
                  : 'Selecione o Tipo de Dano.'}
              </p>
            )}

            <button
              onClick={handleConfirmDamage}
              disabled={!isDamageFormReady}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
            >
              <Heart size={16} />
              <span>{isPlayerView ? 'Lançar Dano' : `Aplicar -${finalDamage} PV de Dano`}</span>
            </button>
          </div>
        )}

        {mode === 'fatigue' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Quantidade de Fadiga (FP) a Gastar
              </label>
              <input
                type="number"
                min="0"
                value={fatigueDelta}
                onChange={(e) => setFatigueDelta(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-32 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-lg font-mono font-bold text-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Motivo do Gasto (Magia, Esforço Extra, Corrida)
              </label>
              <input
                type="text"
                placeholder="Motivo do gasto..."
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <button
              onClick={handleConfirmFatigue}
              className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
            >
              <Zap size={16} />
              <span>Gastar {fatigueDelta} FP</span>
            </button>
          </div>
        )}

        {mode === 'heal' && (
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

        {/* MODO ITEM EXTRA: Flechas, Pedras de Mana, Escudos, etc. */}
        {mode === 'item' && (
          availableItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 italic space-y-1 bg-slate-950/40 rounded-xl border border-slate-800 p-4">
              <p className="font-medium text-slate-300">Nenhum item extra cadastrado neste personagem.</p>
              <p className="text-[11px] text-slate-500">
                Adicione itens (como Flechas, Mana ou Escudo) na seção &quot;Itens Extras &amp; Recursos&quot; da ficha para lançar gastos ou recargas.
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
