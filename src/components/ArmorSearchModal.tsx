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
  ArrowRight,
} from 'lucide-react';
import {
  ArmorCatalogItem,
  loadArmorCatalog,
  parseArmorDr,
  doesArmorFitLocation,
  getCoveredLocationsForArmor,
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
    armor: ArmorCatalogItem,
    parsed: ParsedArmorDR,
    targetIndex: number,
    applyToAllCovered: boolean
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
  const [filterMode, setFilterMode] = useState<'recommended' | 'all'>('recommended');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [applyToAllParts, setApplyToAllParts] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      loadArmorCatalog()
        .then((data) => {
          setCatalog(data.filter((item) => item.type !== 'Shield')); // Exclui escudos normais da armadura de corpo
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
        });
      setSearchQuery('');
      setFilterMode(targetLocation ? 'recommended' : 'all');
      setSelectedCategory('all');
      setApplyToAllParts(false);
    }
  }, [isOpen, targetLocation]);

  // Unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    catalog.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set).sort();
  }, [catalog]);

  // Filtered armors
  const filteredArmors = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return catalog.filter((item) => {
      // 1. Text search
      if (q) {
        const nameMatch = (item.name || '').toLowerCase().includes(q);
        const catMatch = (item.category || '').toLowerCase().includes(q);
        const locMatch = (item.location || '').toLowerCase().includes(q);
        const bookMatch = (item.book || '').toLowerCase().includes(q);
        const notesMatch = (item.notes || '').toLowerCase().includes(q);
        const fnMatch = (item.footnotes || '').toLowerCase().includes(q);
        const drMatch = (item.dr || '').toLowerCase().includes(q);
        if (!nameMatch && !catMatch && !locMatch && !bookMatch && !notesMatch && !fnMatch && !drMatch) {
          return false;
        }
      }

      // 2. Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      // 3. Recommended for target location
      if (filterMode === 'recommended' && targetLocation) {
        return doesArmorFitLocation(item.location, targetLocation.location);
      }

      return true;
    });
  }, [catalog, searchQuery, filterMode, selectedCategory, targetLocation]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Shield size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Banco de Dados de Armaduras
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  GURPS 4e
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {targetLocation ? (
                  <span>
                    Equipar em:{' '}
                    <span className="font-bold text-amber-300">
                      {targetLocation.location}
                    </span>{' '}
                    (Roll {targetLocation.rollTarget})
                  </span>
                ) : (
                  'Selecione uma peça para equipar'
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar: Search & Filters */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/40 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome, tipo, RD, localização, livro..."
                className="w-full pl-9 pr-9 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all shadow-inner"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Mode Switch: Recommended vs All */}
            {targetLocation && (
              <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl self-start sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setFilterMode('recommended')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    filterMode === 'recommended'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Sparkles size={13} />
                  <span>Sugeridas para {targetLocation.location}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    filterMode === 'all'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <span>Todas ({catalog.length})</span>
                </button>
              </div>
            )}
          </div>

          {/* Subfilters: Categories and Options */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-slate-500 text-[11px] font-medium flex items-center gap-1 shrink-0">
                <Filter size={12} /> Categoria:
              </span>
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors border ${
                  selectedCategory === 'all'
                    ? 'bg-slate-800 border-amber-500/60 text-amber-300'
                    : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                Todas
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors border ${
                    selectedCategory === cat
                      ? 'bg-slate-800 border-amber-500/60 text-amber-300'
                      : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Checkbox: Apply to all covered parts */}
            {targetLocation && (
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none py-1 px-2 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={applyToAllParts}
                  onChange={(e) => setApplyToAllParts(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-500/40 bg-slate-900 cursor-pointer"
                />
                <span className="text-[11px]">
                  Equipar em <strong className="text-amber-300">todas as partes</strong> cobertas pela peça
                </span>
              </label>
            )}
          </div>
        </div>

        {/* Content: Armor List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-800/40 scrollbar-thin">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">Carregando banco de armaduras...</p>
            </div>
          ) : filteredArmors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 space-y-3">
              <Shield size={36} className="text-slate-700" />
              <p className="text-xs font-medium">Nenhuma armadura encontrada com estes filtros.</p>
              {filterMode === 'recommended' && targetLocation && (
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className="text-xs text-amber-400 hover:underline flex items-center gap-1"
                >
                  <span>Ver todas as armaduras do catálogo</span>
                  <ArrowRight size={12} />
                </button>
              )}
            </div>
          ) : (
            filteredArmors.map((armor) => {
              const parsed = parseArmorDr(armor);
              const coveredParts = getCoveredLocationsForArmor(
                armor.location,
                allLocations
              );

              return (
                <div
                  key={armor.id || armor.name}
                  className="pt-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 hover:border-amber-500/50 hover:bg-slate-850/40 transition-all group"
                >
                  {/* Left Column: Details */}
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
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <BookOpen size={10} />
                          {armor.book} {armor.page || ''}
                        </span>
                      )}
                    </div>

                    {/* Stats & Rules badges */}
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
                            ? 'Queimadura'
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
                            <span>
                              {sign} RD vs {dtLabel}
                            </span>
                          </span>
                        );
                      })}

                      {/* Location Coverage */}
                      {armor.location && (
                        <span className="text-[11px] text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                          Cobre: <strong className="text-slate-200">{armor.location}</strong>
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

                    {/* Footnotes snippet if any */}
                    {(armor.footnotes || armor.notes) && (
                      <p className="text-[11px] text-slate-400 line-clamp-1 italic">
                        {armor.footnotes || armor.notes}
                      </p>
                    )}
                  </div>

                  {/* Right Column: Equip Action */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (targetLocationIndex !== null) {
                          onEquipArmor(armor, parsed, targetLocationIndex, applyToAllParts);
                          onClose();
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-all shadow-sm active:scale-95"
                    >
                      <Check size={13} />
                      <span>
                        {applyToAllParts && coveredParts.length > 1
                          ? `Equipar em ${coveredParts.length} partes`
                          : targetLocation
                          ? `Equipar em ${targetLocation.location}`
                          : 'Equipar'}
                      </span>
                    </button>

                    {coveredParts.length > 1 && !applyToAllParts && (
                      <span className="text-[10px] text-slate-400">
                        Cobre também: {coveredParts.filter((p) => p !== targetLocation?.location).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-slate-950/80 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Info size={13} className="text-amber-400" />
            <span>
              Ao selecionar, os campos <strong>RD Base</strong>, <strong>Modificadores</strong> e{' '}
              <strong>Dano que Interfere</strong> serão preenchidos automaticamente.
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

