import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Shield,
  X,
  Check,
  Filter,
  Info,
  Sparkles,
  BookOpen,
  PlusCircle,
  Layers,
  Wrench,
  Globe,
} from 'lucide-react';
import {
  ArmorCatalogItem,
  loadArmorCatalog,
  parseArmorDr,
  doesArmorFitLocation,
  getCoveredLocationsForArmor,
  ParsedArmorDR,
  GURPS_CORE_ARMOR_TYPES,
} from '../utils/armorCatalog';
import { BodyArmorLocation } from '../types/rpg';

export type ArmorEquipScope = 'single' | 'whole_body' | 'covered';

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
    targetIndex: number,
    scope: ArmorEquipScope
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
  const [activeTab, setActiveTab] = useState<'catalog' | 'manual'>('catalog');
  const [catalog, setCatalog] = useState<ArmorCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterMode, setFilterMode] = useState<'all' | 'recommended'>('all');

  // Manual Form States
  const [manualName, setManualName] = useState('');
  const [manualDr, setManualDr] = useState<number | ''>(0);
  const [manualMod1, setManualMod1] = useState<number | ''>('');
  const [manualMod1Type, setManualMod1Type] = useState('');
  const [manualMod2, setManualMod2] = useState<number | ''>('');
  const [manualMod2Type, setManualMod2Type] = useState('');
  const [manualScope, setManualScope] = useState<ArmorEquipScope>('single');

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
      setFilterMode('all'); // Padrão 'all' para permitir colocar qualquer tipo de armadura em qualquer parte
      setSelectedCategory('all');
      setActiveTab('catalog');
      // Reset manual form
      setManualName('');
      setManualDr(0);
      setManualMod1('');
      setManualMod1Type('');
      setManualMod2('');
      setManualMod2Type('');
      setManualScope('single');
    }
  }, [isOpen, targetLocation]);

  // Unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    // Categorias essenciais de materiais primeiro
    const priority = ['Plate', 'Segmented Plate', 'Mail', 'Leather', 'Scale', 'Cloth', 'Brigandine'];
    catalog.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    const rest = Array.from(set).filter((c) => !priority.includes(c)).sort();
    const existingPriority = priority.filter((c) => set.has(c));
    return [...existingPriority, ...rest];
  }, [catalog]);

  // Filtered armors with tokenized search
  const filteredArmors = useMemo(() => {
    const rawQuery = searchQuery.toLowerCase().trim();
    const tokens = rawQuery.split(/\s+/).filter(Boolean);

    return catalog.filter((item) => {
      // 1. Text search across tokens (e.g. "heavy plate" matches "Plate, Heavy")
      if (tokens.length > 0) {
        const fullText = `${item.name || ''} ${item.category || ''} ${item.location || ''} ${item.book || ''} ${item.notes || ''} ${item.dr || ''}`.toLowerCase();
        const matchesAll = tokens.every((tok) => fullText.includes(tok));
        if (!matchesAll) return false;
      }

      // 2. Category filter
      if (selectedCategory !== 'all') {
        const itemCat = (item.category || '').toLowerCase();
        const selCat = selectedCategory.toLowerCase();
        if (!itemCat.includes(selCat)) return false;
      }

      // 3. Optional recommended filter (if user turns it on)
      if (filterMode === 'recommended' && targetLocation) {
        return doesArmorFitLocation(item.location, targetLocation.location);
      }

      return true;
    });
  }, [catalog, searchQuery, filterMode, selectedCategory, targetLocation]);

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

    const targetIdx = targetLocationIndex ?? 0;
    onEquipArmor(
      {
        name: manualName.trim() || 'Armadura Personalizada',
        dr: String(baseDr),
        category: 'Personalizada',
        location: manualScope === 'whole_body' ? 'all' : targetLocation?.location,
      },
      parsed,
      targetIdx,
      manualScope
    );
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Shield size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Armaduras e Proteções
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  GURPS 4e
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {targetLocation ? (
                  <span>
                    Parte selecionada:{' '}
                    <strong className="text-amber-300">
                      {targetLocation.location}
                    </strong>{' '}
                    (Roll {targetLocation.rollTarget})
                  </span>
                ) : (
                  'Catálogo geral de armaduras'
                )}
              </p>
            </div>
          </div>

          {/* Navigation Tabs between Catalog & Manual */}
          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('catalog')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'catalog'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers size={13} />
                <span>Tipos & Catálogo</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'manual'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Wrench size={13} />
                <span>Cadastrar Manual</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* TAB 1: CATALOG & PRESETS */}
        {activeTab === 'catalog' && (
          <>
            {/* Toolbar: Search & Material Filter */}
            <div className="p-3.5 border-b border-slate-800/80 bg-slate-950/40 space-y-2.5">
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar tipo (ex: Heavy Plate, Mail, Leather, Light Plate, RD 9...)"
                    className="w-full pl-9 pr-9 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-inner"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Filter Mode Toggle */}
                {targetLocation && (
                  <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl shrink-0">
                    <button
                      type="button"
                      onClick={() => setFilterMode('all')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        filterMode === 'all'
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Todos os Tipos ({catalog.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterMode('recommended')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        filterMode === 'recommended'
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Sparkles size={11} />
                      <span>Filtro ({targetLocation.location})</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Material & Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                <span className="text-slate-500 text-[11px] font-medium flex items-center gap-1 shrink-0">
                  <Filter size={11} /> Tipo:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`px-2.5 py-0.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors border ${
                    selectedCategory === 'all'
                      ? 'bg-slate-800 border-amber-500/60 text-amber-300'
                      : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Todos
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-0.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors border ${
                      selectedCategory === cat
                        ? 'bg-slate-800 border-amber-500/60 text-amber-300'
                        : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Armor List */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-2 divide-y divide-slate-800/40 scrollbar-thin">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
                  <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs">Carregando catálogo de armaduras...</p>
                </div>
              ) : filteredArmors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500 space-y-3">
                  <Shield size={36} className="text-slate-700" />
                  <p className="text-xs font-medium">Nenhuma armadura encontrada com estes filtros.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                      setFilterMode('all');
                    }}
                    className="text-xs text-amber-400 hover:underline"
                  >
                    Limpar filtros e ver todos os tipos
                  </button>
                </div>
              ) : (
                filteredArmors.map((armor) => {
                  const parsed = parseArmorDr(armor);
                  const isCorePreset = armor.id?.startsWith('core-armor');

                  return (
                    <div
                      key={armor.id || armor.name}
                      className="pt-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 hover:border-amber-500/50 hover:bg-slate-850/40 transition-all group"
                    >
                      {/* Left: Details */}
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

                          {isCorePreset && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Tipo Padrão
                            </span>
                          )}

                          {armor.tl !== undefined && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-850 text-slate-400 border border-slate-800">
                              TL {armor.tl}
                            </span>
                          )}

                          {armor.book && (
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <BookOpen size={10} />
                              {armor.book} {armor.page || ''}
                            </span>
                          )}
                        </div>

                        {/* Badges: RD and Modifiers */}
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          {/* Base DR */}
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs">
                            <span>RD Base: {parsed.baseDr}</span>
                            {armor.dr.includes('*') && (
                              <span className="text-[9px] font-normal text-amber-400" title="Flexível">
                                *
                              </span>
                            )}
                          </span>

                          {/* Modifiers */}
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

                          {armor.location && (
                            <span className="text-[11px] text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                              {armor.location === 'all' ? (
                                <strong className="text-emerald-400">Qualquer parte / Todo o corpo</strong>
                              ) : (
                                <span>Cobre: <strong className="text-slate-200">{armor.location}</strong></span>
                              )}
                            </span>
                          )}

                          {armor.cost && (
                            <span className="text-[11px] text-slate-400 px-1.5 py-0.5">
                              {armor.cost}
                            </span>
                          )}
                          {armor.weight && (
                            <span className="text-[11px] text-slate-400 px-1.5 py-0.5">
                              {armor.weight} lb
                            </span>
                          )}
                        </div>

                        {/* Notes snippet */}
                        {(armor.footnotes || armor.notes) && (
                          <p className="text-[11px] text-slate-400 line-clamp-1 italic">
                            {armor.footnotes || armor.notes}
                          </p>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0">
                        {/* 1. Equip on Single Part */}
                        <button
                          type="button"
                          onClick={() => {
                            const targetIdx = targetLocationIndex ?? 0;
                            onEquipArmor(armor, parsed, targetIdx, 'single');
                            onClose();
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-all shadow-sm active:scale-95"
                          title={`Equipar somente em ${targetLocation?.location || 'esta parte'}`}
                        >
                          <Check size={13} />
                          <span>
                            {targetLocation ? `Equipar em ${targetLocation.location}` : 'Equipar'}
                          </span>
                        </button>

                        {/* 2. Equip on Whole Body */}
                        <button
                          type="button"
                          onClick={() => {
                            const targetIdx = targetLocationIndex ?? 0;
                            onEquipArmor(armor, parsed, targetIdx, 'whole_body');
                            onClose();
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 hover:text-amber-300 text-slate-300 text-[11px] font-semibold rounded-lg transition-colors border border-slate-700/70"
                          title="Aplica esta armadura em todas as 19 partes do corpo (como Gildur com Heavy Plate em tudo)"
                        >
                          <Globe size={11} className="text-amber-400" />
                          <span>Equipar no Corpo Inteiro (19 partes)</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* TAB 2: MANUAL REGISTRATION */}
        {activeTab === 'manual' && (
          <form onSubmit={handleManualSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Wrench size={15} className="text-amber-400" />
                Cadastrar Armadura Manualmente
              </h4>
              <p className="text-xs text-slate-400">
                Cadastre qualquer armadura personalizada ou caseira preenchendo o nome, a RD base e os modificadores.
                Você pode aplicá-la apenas na parte selecionada ou no corpo inteiro.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nome */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-300">
                  Nome da Armadura / Peça:
                </label>
                <input
                  type="text"
                  required
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Ex: Heavy Plate, Couro Reforçado, Elmo de Aço, Cota Élfica..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  autoFocus
                />
              </div>

              {/* RD Base */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  RD Base (Resistência a Dano):
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={manualDr}
                  onChange={(e) => setManualDr(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                  placeholder="Ex: 9, 6, 4..."
                  className="w-full px-3 py-2 bg-slate-950 border border-amber-600/60 rounded-xl text-sm font-bold text-amber-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                />
              </div>

              {/* Onde Equipar */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Onde Aplicar:
                </label>
                <div className="flex items-center gap-2 pt-1">
                  <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="manualScope"
                      checked={manualScope === 'single'}
                      onChange={() => setManualScope('single')}
                      className="text-amber-500 focus:ring-amber-500/50"
                    />
                    <span>
                      Apenas em: <strong className="text-amber-300">{targetLocation?.location || 'Parte selecionada'}</strong>
                    </span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none ml-2">
                    <input
                      type="radio"
                      name="manualScope"
                      checked={manualScope === 'whole_body'}
                      onChange={() => setManualScope('whole_body')}
                      className="text-amber-500 focus:ring-amber-500/50"
                    />
                    <span>
                      <strong className="text-emerald-400">Corpo Inteiro</strong> (todas as partes)
                    </span>
                  </label>
                </div>
              </div>

              {/* Modificador 1 */}
              <div className="space-y-1.5 p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                <label className="text-xs font-semibold text-slate-300">
                  Modificador de RD 1 (Opcional):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={manualMod1}
                    onChange={(e) => setManualMod1(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                    placeholder="Ex: -2 ou +1"
                    className="w-24 px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-bold text-white font-mono focus:outline-none"
                  />
                  <select
                    value={manualMod1Type}
                    onChange={(e) => setManualMod1Type(e.target.value)}
                    className="flex-1 px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="">Nenhum / Selecione dano</option>
                    <option value="contusao">vs Contusão</option>
                    <option value="corte">vs Corte</option>
                    <option value="empalamento">vs Empalamento</option>
                    <option value="perfurante">vs Perfurante</option>
                    <option value="queima">vs Queima / Fogo</option>
                  </select>
                </div>
                <span className="text-[10px] text-slate-500">
                  Ex: Cota de malha tem -2 vs Contusão.
                </span>
              </div>

              {/* Modificador 2 */}
              <div className="space-y-1.5 p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                <label className="text-xs font-semibold text-slate-300">
                  Modificador de RD 2 (Opcional):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={manualMod2}
                    onChange={(e) => setManualMod2(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                    placeholder="Ex: +1"
                    className="w-24 px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-bold text-white font-mono focus:outline-none"
                  />
                  <select
                    value={manualMod2Type}
                    onChange={(e) => setManualMod2Type(e.target.value)}
                    className="flex-1 px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="">Nenhum / Selecione dano</option>
                    <option value="contusao">vs Contusão</option>
                    <option value="corte">vs Corte</option>
                    <option value="empalamento">vs Empalamento</option>
                    <option value="perfurante">vs Perfurante</option>
                    <option value="queima">vs Queima / Fogo</option>
                  </select>
                </div>
                <span className="text-[10px] text-slate-500">
                  Segundo modificador se houver.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('catalog')}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
              >
                <Check size={14} />
                <span>Salvar e Equipar Armadura</span>
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-2.5 border-t border-slate-800 bg-slate-950/80 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Info size={13} className="text-amber-400" />
            <span>
              Você pode equipar em qualquer parte do corpo ou no corpo inteiro (19 partes), além de editar valores diretamente na tabela da ficha.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium text-xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
