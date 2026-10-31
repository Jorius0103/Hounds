import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Spell } from '../types/rpg';
import { Sparkles, Plus, Trash2, Star, X, Check, Search } from 'lucide-react';
import { loadSpellsDatabase, normalizeSpellText, getCollegePt } from './SingleSpellModal';
import { MODAL_BACKDROP_STYLE, modalCardStyle, MODAL_FOOTER_STYLE } from './modalStyles';
import { ModalHeader } from './ModalHeader';

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
      const list = spells && Array.isArray(spells) ? spells : [];
      setSpellList(
        list.length > 0
          ? JSON.parse(JSON.stringify(list))
          : [{ id: `spl-${Date.now()}-1`, name: '', nh: '', isFavorite: false }]
      );
      loadSpellsDatabase().then((data) => {
        setCatalogSpells(data);
      });
    }
  }, [isOpen]);

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
        return (
          n1.includes(q) ||
          n2.includes(q) ||
          n3.includes(q)
        );
      })
      .slice(0, 50);
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
    const spellName = s.displayName || (s.namePt && s.namePt !== s.name ? `${s.name} (${s.namePt})` : s.name);
    const newSpell: Spell = {
      id: `spl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: spellName,
      nh: '', // NH em branco!
      isFavorite: false,
    };
    setSpellList((prev) => {
      const next = [...prev.filter((x) => x.name && x.name.trim() !== ''), newSpell];
      onSave(next); // Auto-salva imediatamente ao selecionar do catálogo!
      return next;
    });
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

  const handleClose = () => {
    const filtered = spellList.filter((s) => s.name && s.name.trim() !== '');
    if (filtered.length > 0) {
      onSave(filtered);
    }
    onClose();
  };

  return (
    <div style={MODAL_BACKDROP_STYLE}>
      <div style={modalCardStyle('680px', { height: '80vh', minHeight: '580px', maxHeight: '88vh' })}>
        {/* Header */}
        <ModalHeader
          size="standard"
          icon={<Sparkles size={18} className="text-amber-400" />}
          title={
            <>
              Grimório de Magias: <span style={{ color: '#fbbf24' }}>{npcName}</span>
            </>
          }
          subtitle="Cadastre e gerencie magias em lote, via catálogo ou manualmente"
          onClose={handleClose}
        />

        {/* Database Search Input */}
        <div
          ref={searchContainerRef}
          style={{ flexShrink: 0, padding: '10px 18px', borderBottom: '1px solid #1e293b', background: 'rgba(15, 23, 42, 0.7)', position: 'relative' }}
        >
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 focus-within:border-amber-500/70 rounded-xl px-3 py-2 transition-all shadow-inner">
            <Search size={14} className="text-amber-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Buscar magia no catálogo para adicionar (ex: Bola de Fogo, Cura, Escudo, Sono...)"
              className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchOpen(false);
                }}
                className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                title="Limpar busca"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Search Dropdown */}
          {isSearchOpen && searchQuery.trim().length > 0 && (
            <div
              className="border border-amber-500/50 rounded-xl shadow-2xl overflow-hidden mt-1"
              style={{ position: 'absolute', top: '100%', left: '18px', right: '18px', zIndex: 99999, backgroundColor: '#0f172a', maxHeight: '600px', overflowY: 'auto' }}
            >
              <div className="px-3 py-1.5 bg-slate-950 border-b border-slate-800 text-[10px] text-amber-400 font-semibold flex items-center justify-between">
                <span>{searchResults.length} magias encontradas</span>
                <span className="text-slate-500">Clique para adicionar com NH em branco</span>
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
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white group-hover:text-amber-300">
                            {s.displayName || s.name}
                          </span>
                          {s.college && (
                            <span className="text-[10px] bg-slate-800 text-amber-400 px-1.5 py-0.5 rounded border border-slate-700">
                              {getCollegePt(s.college)}
                            </span>
                          )}
                          {s.class && <span className="text-[10px] text-slate-400">({s.class})</span>}
                        </div>
                        {s.description && <p className="text-[11px] text-slate-400 truncate mt-0.5">{s.description}</p>}
                      </div>
                      <span className="shrink-0 text-[10px] text-amber-400 font-bold bg-amber-950/60 border border-amber-500/40 px-2 py-1 rounded group-hover:bg-amber-500 group-hover:text-slate-950">
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
        <div style={{ minHeight: 0, overflowY: 'auto', padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
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
              Nenhuma magia na lista. Digite na busca acima ou clique em "+ Adicionar Magia Manual".
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
        <div style={MODAL_FOOTER_STYLE}>
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
