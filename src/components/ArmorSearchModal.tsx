import React, { useState, useEffect, useMemo } from 'react';
import { Search, Shield, X, Check, Wrench } from 'lucide-react';
import {
  ArmorCatalogItem,
  loadArmorCatalog,
  parseArmorDr,
  ParsedArmorDR,
} from '../utils/armorCatalog';
import { BodyArmorLocation } from '../types/rpg';

interface ArmorSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetLocation: BodyArmorLocation | null;
  targetLocationIndex: number | null;
  allLocations: BodyArmorLocation[];
  onEquipArmor: (
    armor: {
      name: string;
      dr: string | number;
      category?: string;
      location?: string;
      notes?: string;
    },
    parsed: ParsedArmorDR,
    targetIndex: number
  ) => void;
}

export const ArmorSearchModal: React.FC<ArmorSearchModalProps> = ({
  isOpen,
  onClose,
  targetLocation,
  targetLocationIndex,
  allLocations,
  onEquipArmor,
}) => {
  const [catalog, setCatalog] = useState<ArmorCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocationIndex, setSelectedLocationIndex] = useState<number>(0);
  const [equippedFeedback, setEquippedFeedback] = useState<string>('');

  // Manual Form States
  const [manualName, setManualName] = useState('');
  const [manualDr, setManualDr] = useState<number | ''>(0);
  const [manualMod1, setManualMod1] = useState<number | ''>('');
  const [manualMod1Type, setManualMod1Type] = useState('');
  const [manualMod2, setManualMod2] = useState<number | ''>('');
  const [manualMod2Type, setManualMod2Type] = useState('');

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      loadArmorCatalog()
        .then((data) => {
          setCatalog(data.filter((item) => item.type !== 'Shield'));
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
        });

      setSearchQuery('');
      setSelectedLocationIndex(targetLocationIndex ?? 0);
      setManualName('');
      setManualDr(0);
      setManualMod1('');
      setManualMod1Type('');
      setManualMod2('');
      setManualMod2Type('');
      setEquippedFeedback('');
    }
  }, [isOpen, targetLocationIndex]);

  // Selected Location
  const currentLocation = allLocations[selectedLocationIndex] || targetLocation || allLocations[0];

  // Filtered armors with tokenized search
  const filteredArmors = useMemo(() => {
    const rawQuery = searchQuery.toLowerCase().trim();
    const tokens = rawQuery.split(/\s+/).filter(Boolean);

    return catalog.filter((item) => {
      if (tokens.length > 0) {
        const fullText = `${item.name || ''} ${item.category || ''} ${item.location || ''} ${item.book || ''} ${item.notes || ''} ${item.dr || ''}`.toLowerCase();
        const matchesAll = tokens.every((tok) => fullText.includes(tok));
        if (!matchesAll) return false;
      }
      return true;
    });
  }, [catalog, searchQuery]);

  // Handler for manual submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() && manualDr === '') return;

    const baseDr = typeof manualDr === 'number' ? manualDr : parseInt(manualDr, 10) || 0;
    const modifiers = [];
    if (manualMod1 !== '' && manualMod1Type) {
      modifiers.push({
        drModifier: typeof manualMod1 === 'number' ? manualMod1 : parseInt(manualMod1, 10) || 0,
        modifierDamageType: manualMod1Type,
      });
    }
    if (manualMod2 !== '' && manualMod2Type) {
      modifiers.push({
        drModifier: typeof manualMod2 === 'number' ? manualMod2 : parseInt(manualMod2, 10) || 0,
        modifierDamageType: manualMod2Type,
      });
    }

    const parsed: ParsedArmorDR = {
      baseDr,
      rawDr: String(baseDr),
      drModifiers: modifiers,
      summary: `RD Base: ${baseDr}`,
    };

    const locName = currentLocation?.location || 'Parte selecionada';
    onEquipArmor(
      {
        name: manualName.trim() || 'Armadura Personalizada',
        dr: String(baseDr),
        category: 'Personalizada',
        location: currentLocation?.location,
      },
      parsed,
      selectedLocationIndex
    );

    // Feedback visual sem fechar a janela
    setEquippedFeedback(`"${manualName.trim() || 'Armadura'}" equipada em ${locName}!`);
    setTimeout(() => setEquippedFeedback(''), 3000);

    // Limpa campos manuais para próximo cadastro
    setManualName('');
    setManualDr(0);
    setManualMod1('');
    setManualMod1Type('');
    setManualMod2('');
    setManualMod2Type('');
  };

  // Handler for catalog equip
  const handleCatalogEquip = (armor: ArmorCatalogItem, parsed: ParsedArmorDR) => {
    const locName = currentLocation?.location || 'Parte selecionada';
    onEquipArmor(armor, parsed, selectedLocationIndex);

    // Feedback visual sem fechar a janela
    setEquippedFeedback(`"${armor.name}" equipada em ${locName}!`);
    setTimeout(() => setEquippedFeedback(''), 3000);
  };

  if (!isOpen) return null;

  return (
    // Não fecha ao clicar fora da janela (sem onClick={onClose} no backdrop)
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Sem label GURPS 4e) */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Shield size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Armaduras e Proteções
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Selecione a parte do corpo e equipe quantas peças desejar. A janela permanece aberta até clicar em Fechar.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Topo: Seleção da Parte do Corpo AO LADO do Cadastro Manual */}
        <div className="p-3.5 border-b border-slate-800/80 bg-slate-950/40 space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
            {/* 1. Seleção da Parte do Corpo */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-slate-300 whitespace-nowrap">
                Parte do Corpo:
              </span>
              <select
                value={selectedLocationIndex}
                onChange={(e) => setSelectedLocationIndex(Number(e.target.value))}
                className="bg-slate-900 border border-amber-500/50 rounded-xl px-3 py-1.5 text-xs font-bold text-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-inner"
              >
                {allLocations.map((loc, idx) => (
                  <option
                    key={loc.id || `${loc.location}-${idx}`}
                    value={idx}
                    className="bg-slate-900 text-slate-100"
                  >
                    {loc.location} (Roll {loc.rollTarget || '—'}) {loc.armorName ? `— Atual: ${loc.armorName} (RD ${loc.dr})` : '— Sem armadura'}
                  </option>
                ))}
              </select>
            </div>

            {/* Separador vertical em telas grandes */}
            <div className="hidden lg:block w-px h-8 bg-slate-800" />

            {/* 2. Cadastro Manual ao lado da seleção de parte do corpo */}
            <form onSubmit={handleManualSubmit} className="flex-1 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1 shrink-0">
                <Wrench size={12} className="text-amber-400" />
                <span>Manual:</span>
              </span>

              <input
                type="text"
                required
                placeholder="Nome da peça (ex: Heavy Plate, Couro...)"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                className="flex-1 min-w-[140px] bg-slate-900 border border-slate-750 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />

              <div className="flex items-center gap-1">
                <span className="text-[11px] text-slate-400 font-semibold">RD:</span>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="RD"
                  value={manualDr}
                  onChange={(e) => setManualDr(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                  className="w-14 bg-slate-900 border border-amber-600/60 rounded-lg px-1.5 py-1 text-center text-xs font-bold text-amber-300 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-1">
                <input
                  type="number"
                  placeholder="Mod"
                  value={manualMod1}
                  onChange={(e) => setManualMod1(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                  className="w-14 bg-slate-900 border border-slate-750 rounded-lg px-1.5 py-1 text-center text-xs font-bold text-white font-mono focus:outline-none"
                  title="Modificador de RD (ex: -2 ou +1)"
                />
                <select
                  value={manualMod1Type}
                  onChange={(e) => setManualMod1Type(e.target.value)}
                  className="bg-slate-900 border border-slate-750 rounded-lg px-1.5 py-1 text-xs text-slate-300 focus:outline-none"
                >
                  <option value="">vs Dano</option>
                  <option value="contusao">Contusão</option>
                  <option value="corte">Corte</option>
                  <option value="empalamento">Empalamento</option>
                  <option value="perfurante">Perfurante</option>
                  <option value="queima">Queima</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <input
                  type="number"
                  placeholder="Mod 2"
                  value={manualMod2}
                  onChange={(e) => setManualMod2(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                  className="w-14 bg-slate-900 border border-slate-750 rounded-lg px-1.5 py-1 text-center text-xs font-bold text-white font-mono focus:outline-none"
                  title="Segundo modificador (opcional)"
                />
                <select
                  value={manualMod2Type}
                  onChange={(e) => setManualMod2Type(e.target.value)}
                  className="bg-slate-900 border border-slate-750 rounded-lg px-1.5 py-1 text-xs text-slate-300 focus:outline-none"
                >
                  <option value="">vs Dano</option>
                  <option value="contusao">Contusão</option>
                  <option value="corte">Corte</option>
                  <option value="empalamento">Empalamento</option>
                  <option value="perfurante">Perfurante</option>
                  <option value="queima">Queima</option>
                </select>
              </div>

              <button
                type="submit"
                className="flex items-center gap-1 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-all shadow-xs shrink-0 cursor-pointer active:scale-95"
                title={`Equipar armadura manual em ${currentLocation?.location}`}
              >
                <Check size={12} />
                <span>Equipar</span>
              </button>
            </form>
          </div>

          {/* Feedback visual de equipamento realizado */}
          {equippedFeedback && (
            <div className="px-3 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center justify-between animate-in fade-in duration-150">
              <span className="flex items-center gap-1.5">
                <Check size={13} className="text-emerald-400" />
                {equippedFeedback}
              </span>
              <span className="text-[10px] text-slate-400">Você pode continuar equipando outras partes</span>
            </div>
          )}

          {/* Busca logo acima da lista de peças de armaduras */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar armadura no catálogo logo abaixo (ex: Heavy Plate, Mail, Leather, RD 9...)"
              className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-750 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Lista de Armaduras do Catálogo */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2 divide-y divide-slate-800/40 scrollbar-thin">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">Carregando catálogo de armaduras...</p>
            </div>
          ) : filteredArmors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 space-y-3">
              <Shield size={36} className="text-slate-700" />
              <p className="text-xs font-medium">Nenhuma armadura encontrada.</p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs text-amber-400 hover:underline"
              >
                Limpar busca
              </button>
            </div>
          ) : (
            filteredArmors.map((armor) => {
              const parsed = parseArmorDr(armor);

              return (
                <div
                  key={armor.id || armor.name}
                  className="pt-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 hover:border-amber-500/50 hover:bg-slate-850/40 transition-all group"
                >
                  {/* Detalhes da Armadura */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white text-sm group-hover:text-amber-300 transition-colors">
                        {armor.name}
                      </span>

                      {armor.category && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60">
                          {armor.category}
                        </span>
                      )}

                      {armor.tl !== undefined && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-850 text-slate-400 border border-slate-800">
                          TL {armor.tl}
                        </span>
                      )}

                      {armor.book && (
                        <span className="text-[10px] text-slate-500">
                          {armor.book} {armor.page || ''}
                        </span>
                      )}
                    </div>

                    {/* Badges de RD e Modificadores */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs">
                        <span>RD Base: {parsed.baseDr}</span>
                        {armor.dr.includes('*') && (
                          <span className="text-[9px] font-normal text-amber-400" title="Flexível">
                            *
                          </span>
                        )}
                      </span>

                      {parsed.drModifiers.map((mod, mi) => {
                        const isNeg = mod.drModifier < 0;
                        const isPos = mod.drModifier > 0;
                        const sign = isPos ? `+${mod.drModifier}` : `${mod.drModifier}`;
                        const dtLabel =
                          mod.modifierDamageType === 'contusao'
                            ? 'Contusão'
                            : mod.modifierDamageType === 'corte'
                            ? 'Corte'
                            : mod.modifierDamageType === 'empalamento'
                            ? 'Empalamento'
                            : mod.modifierDamageType === 'perfurante'
                            ? 'Perfurante'
                            : mod.modifierDamageType === 'queima'
                            ? 'Queima'
                            : mod.modifierDamageType;

                        return (
                          <span
                            key={mi}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[11px] font-bold border ${
                              isNeg
                                ? 'bg-rose-950/60 text-rose-300 border-rose-800/80'
                                : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80'
                            }`}
                          >
                            {sign} RD vs {dtLabel}
                          </span>
                        );
                      })}

                      {armor.cost && (
                        <span className="text-[11px] text-slate-400 px-1">
                          {armor.cost}
                        </span>
                      )}
                      {armor.weight && (
                        <span className="text-[11px] text-slate-400 px-1">
                          {armor.weight} lb
                        </span>
                      )}
                    </div>

                    {(armor.footnotes || armor.notes) && (
                      <p className="text-[11px] text-slate-400 line-clamp-1 italic">
                        {armor.footnotes || armor.notes}
                      </p>
                    )}
                  </div>

                  {/* Botão de Equipar na Parte Selecionada (sem fechar modal) */}
                  <div className="shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCatalogEquip(armor, parsed)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                      <Check size={13} />
                      <span>Equipar em {currentLocation?.location}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé Limpo (sem a label removida) */}
        <div className="flex items-center justify-end px-5 py-2.5 border-t border-slate-800 bg-slate-950/80 text-xs text-slate-400">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium text-xs cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
