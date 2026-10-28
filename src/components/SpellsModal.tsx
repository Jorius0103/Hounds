import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Spell } from '../types/rpg';
import { Sparkles, Plus, Trash2, Star, X, Check, Search } from 'lucide-react';
import { loadSpellsDatabase, normalizeSpellText, getCollegePt } from './SingleSpellModal';

interface SpellsModalProps {
  isOpen: boolean;
  onClose: () => void;
  spells: Spell[];
  onSave: (updatedSpells: Spell[]) => void;
  npcName: string;
}

export const SpellsModal: React.FC<SpellsModalProps> = ({
  isOpen,
  onClose,
  spells,
  onSave,
  npcName,
}) => {
  const [spellList, setSpellList] = useState<Spell[]>([]);

  // Search in database state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [catalogSpells, setCatalogSpells] = useState<any[]>([]);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSpellList(
        spells.length > 0
          ? JSON.parse(JSON.stringify(spells))
          : [{ id: `spl-${Date.now()}-1`, name: '', nh: '', isFavorite: false }]
      );
      loadSpellsDatabase().then((data) => {
        setCatalogSpells(data);
      });
    }
  }, [isOpen, spells]);

  // Click outside search dropdown to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchResults = useMemo(() => {
    const q = normalizeSpellText(searchQuery);
    if (!q) return [];

    return catalogSpells
      .filter((s) => {
        const n1 = normalizeSpellText(s.name || '');
        const n2 = normalizeSpellText(s.namePt || '');
        const n3 = normalizeSpellText(s.displayName || '');
        const col = normalizeSpellText(s.college || '');
        const colPt = normalizeSpellText(getCollegePt(s.college));
        const cls = normalizeSpellText(s.class || '');
        return (
          n1.includes(q) ||
          n2.includes(q) ||
          n3.includes(q) ||
          col.includes(q) ||
          colPt.includes(q) ||
          cls.includes(q)
        );
      })
      .slice(0, 25);
  }, [searchQuery, catalogSpells]);

  if (!isOpen) return null;

  const handleAddRow = (customName?: string) => {
    setSpellList((prev) => [
      ...prev,
      {
        id: `spl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: typeof customName === 'string' ? customName.trim() : '',
        nh: '', // NH em branco!
        isFavorite: false,
      },
    ]);
    if (typeof customName === 'string') {
      setSearchQuery('');
      setIsSearchOpen(false);
    }
  };

  const handleSelectCatalogSpell = (s: any) => {
    const spellName = s.displayName || (s.namePt && s.namePt !== s.name ? `${s.namePt} (${s.name})` : s.name);
    setSpellList((prev) => [
      ...prev,
      {
        id: `spl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: spellName,
        nh: '', // NH em branco!
        isFavorite: false,
      },
    ]);
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  const handleUpdateRow = (index: number, field: keyof Spell, value: any) => {
    setSpellList((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveRow = (index: number) => {
    setSpellList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    // Filter out rows with empty names
    const filtered = spellList.filter((s) => s.name && s.name.trim() !== '');
    onSave(filtered);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-750 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-amber-400" />
            <h3 className="text-base font-bold text-white">
              Grimório de Magias: <span className="text-amber-400">{npcName}</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Database Search Input */}
        <div ref={searchContainerRef} className="relative shrink-0">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 focus-within:border-amber-500/70 rounded-xl px-3 py-2">
            <Search size={15} className="text-amber-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Buscar magia no catálogo para adicionar (ex: Bola de Fogo, Cura...)"
              className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchOpen(false);
                }}
                className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Search Dropdown */}
          {isSearchOpen && searchQuery.trim().length > 0 && (
            <div
              className="absolute top-full left-0 right-0 mt-1.5 z-50 border border-amber-500/50 rounded-xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto"
              style={{ backgroundColor: '#0f172a' }}
            >
              <div className="px-3 py-1.5 bg-slate-950 border-b border-slate-800 text-[10px] text-amber-400 font-semibold flex items-center justify-between">
                <span>{searchResults.length} magias encontradas</span>
                <span className="text-slate-500">Clique para adicionar à lista com NH em branco</span>
              </div>
              {searchResults.length === 0 ? (
                <div className="px-4 py-3 text-center text-xs text-slate-500 italic space-y-2">
                  <p>Nenhuma magia encontrada no catálogo para "{searchQuery}".</p>
                  <button
                    type="button"
                    onClick={() => handleAddRow(searchQuery)}
                    className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    + Adicionar "{searchQuery}" como magia manual
                  </button>
                </div>
              ) : (
                <>
                  {searchResults.map((s, idx) => (
                    <button
                      key={s.id || idx}
                      type="button"
                      onClick={() => handleSelectCatalogSpell(s)}
                      className="w-full text-left px-3 py-2 border-b border-slate-800/80 hover:bg-slate-800 flex items-center justify-between gap-2 group cursor-pointer"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white group-hover:text-amber-300">
                          {s.displayName || s.name}
                        </span>
                        {s.college && (
                          <span className="ml-2 text-[10px] bg-slate-800 text-amber-400 px-1.5 py-0.5 rounded">
                            {getCollegePt(s.college)}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-amber-400 font-bold shrink-0">
                        + Adicionar
                      </span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleAddRow(searchQuery)}
                    className="w-full text-left px-3 py-2 bg-slate-950 hover:bg-slate-800 text-xs text-amber-400 font-semibold border-t border-slate-800 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Adicionar "{searchQuery}" manualmente</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Dynamic Multi-row Table */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2">
          <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
            <span>Magias Cadastradas ({spellList.length})</span>
            <button
              type="button"
              onClick={() => handleAddRow()}
              className="text-amber-400 hover:text-amber-300 font-bold text-xs cursor-pointer"
            >
              <span>Adicionar Magia Manual</span>
            </button>
          </div>

          {spellList.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 italic">
              Nenhuma magia na lista. Digite na busca acima ou clique em "+ Adicionar Outra Magia".
            </div>
          ) : (
            <div className="space-y-2">
              {spellList.map((spell, index) => (
                <div
                  key={spell.id || index}
                  className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
                    spell.isFavorite
                      ? 'bg-amber-950/20 border-amber-500/50'
                      : 'bg-slate-950/80 border-slate-800'
                  }`}
                >
                  {/* Favorite toggle button */}
                  <button
                    type="button"
                    onClick={() => handleUpdateRow(index, 'isFavorite', !spell.isFavorite)}
                    className={`p-1.5 rounded transition-colors shrink-0 ${
                      spell.isFavorite
                        ? 'text-amber-400 hover:text-amber-300'
                        : 'text-slate-600 hover:text-slate-400'
                    }`}
                    title={spell.isFavorite ? 'Remover dos favoritos' : 'Favoritar magia'}
                  >
                    <Star size={16} fill={spell.isFavorite ? 'currentColor' : 'none'} />
                  </button>

                  {/* Spell Name */}
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      placeholder="Nome da magia..."
                      value={spell.name}
                      onChange={(e) => handleUpdateRow(index, 'name', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-750 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  {/* NH input - em branco por padrão */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-slate-400 font-mono">NH:</span>
                    <input
                      type="text"
                      placeholder="-"
                      value={spell.nh !== undefined && spell.nh !== null ? spell.nh : ''}
                      onChange={(e) => handleUpdateRow(index, 'nh', e.target.value)}
                      className="w-14 bg-slate-900 border border-amber-500/50 rounded-lg py-1.5 text-center text-xs font-mono font-bold text-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  {/* Remove row sem confirmação */}
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(index)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition-colors shrink-0 cursor-pointer"
                    title="Excluir magia"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end pt-3 border-t border-slate-800 shrink-0 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow transition-colors cursor-pointer"
          >
            <Check size={14} />
            <span>Salvar Magias</span>
          </button>
        </div>
      </div>
    </div>
  );
};
