import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Spell } from '../types/rpg';
import { Sparkles, X, Check, Search, Plus } from 'lucide-react';

interface SingleSpellModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (spell: Spell) => void;
  initialSpell?: Spell | null;
}

export const SPELL_COLLEGE_PT: Record<string, string> = {
  'Air': 'Ar',
  'Animal': 'Animais',
  'Body Control': 'Controle do Corpo',
  'Communication and Empathy': 'Comunicação e Empatia',
  'Earth': 'Terra',
  'Enchantment': 'Encantamento',
  'Fire': 'Fogo',
  'Food': 'Alimentos',
  'Gate': 'Portais',
  'Healing': 'Cura',
  'Illusion and Creation': 'Ilusão e Criação',
  'Knowledge': 'Conhecimento',
  'Light and Darkness': 'Luz e Trevas',
  'Making and Breaking': 'Construção e Destruição',
  'Meta-Spells': 'Metamagia',
  'Mind Control': 'Controle da Mente',
  'Movement': 'Movimento',
  'Necromantic': 'Necromancia',
  'Plant': 'Plantas',
  'Protection and Warning': 'Proteção e Alerta',
  'Sound': 'Som',
  'Technological': 'Tecnologia',
  'Water': 'Água',
  'Weather': 'Clima',
  'Secret': 'Segredo',
  'Imbuing': 'Imbuição',
};

export function getCollegePt(college?: string): string {
  if (!college) return '';
  return college
    .split(',')
    .map((c) => {
      const trimmed = c.trim();
      return SPELL_COLLEGE_PT[trimmed] || trimmed;
    })
    .join(', ');
}

// In-memory catalog cache
let cachedSpellsCatalog: any[] | null = null;
let spellsCatalogPromise: Promise<any[]> | null = null;

export function normalizeSpellText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export async function loadSpellsDatabase(): Promise<any[]> {
  if (cachedSpellsCatalog && cachedSpellsCatalog.length > 0) {
    return cachedSpellsCatalog;
  }

  // 1. Check parent window or global W
  try {
    const parentW = (window as any).parent?.W?.spells;
    if (Array.isArray(parentW) && parentW.length > 0) {
      cachedSpellsCatalog = parentW;
      return cachedSpellsCatalog;
    }
  } catch (e) {}

  try {
    const localW = (window as any).W?.spells;
    if (Array.isArray(localW) && localW.length > 0) {
      cachedSpellsCatalog = localW;
      return cachedSpellsCatalog;
    }
  } catch (e) {}

  // 2. Fetch from dados/magias.json and dados/traducoes.json
  if (!spellsCatalogPromise) {
    spellsCatalogPromise = Promise.all([
      fetch('dados/magias.json').then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch('dados/traducoes.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
    ])
      .then(([magias, traducoes]) => {
        const transMap: Record<string, string> = traducoes || {};
        const list = (magias || []).map((s: any) => {
          const pt = transMap[s.name] || '';
          const displayName = pt && pt !== s.name ? `${s.name} (${pt})` : s.name;
          return {
            ...s,
            namePt: pt,
            displayName,
          };
        });
        cachedSpellsCatalog = list;
        return list;
      })
      .catch(() => {
        cachedSpellsCatalog = [];
        return [];
      });
  }

  return spellsCatalogPromise;
}


export function matchSpellInCatalog(name: string, catalog?: any[]): any | null {
  if (!name) return null;
  const cat = catalog || cachedSpellsCatalog;
  if (!cat || !cat.length) return null;
  const norm = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  const raw = String(name || '');
  const target = norm(raw);
  const pm = raw.match(/^([^(]+)\s*(?:\(([^)]+)\))?/);
  const beforeParen = pm && pm[1] ? norm(pm[1]) : '';
  const insideParen = pm && pm[2] ? norm(pm[2]) : '';

  for (let i = 0; i < cat.length; i++) {
    const s = cat[i];
    const sNorm = norm(s.name || '');
    const ptNorm = norm(s.namePt || '');
    if (beforeParen && sNorm && sNorm === beforeParen) return s;
    if (beforeParen && ptNorm && ptNorm === beforeParen) return s;
    if (insideParen && sNorm && sNorm === insideParen) return s;
    if (insideParen && ptNorm && ptNorm === insideParen) return s;
    if (s.displayName && norm(s.displayName) === target) return s;
    if (s.name && norm(s.name) === target) return s;
    if (s.namePt && norm(s.namePt) === target) return s;
    if (sNorm && (target.includes(sNorm) || sNorm.includes(target))) return s;
    if (ptNorm && (target.includes(ptNorm) || ptNorm.includes(target))) return s;
    if (s.namePt && s.namePt.includes('|')) {
      const parts = s.namePt.split('|');
      for (const p of parts) {
        const pNorm = norm(p);
        if (pNorm && (target.includes(pNorm) || pNorm.includes(target))) return s;
      }
    }
    if (raw.includes('|') || raw.includes('/')) {
      const rawParts = raw.split(/[|\/]/);
      for (const rp of rawParts) {
        const rpNorm = norm(rp);
        if (rpNorm && (sNorm === rpNorm || ptNorm === rpNorm || (sNorm && rpNorm.includes(sNorm)) || (ptNorm && rpNorm.includes(ptNorm)))) return s;
      }
    }
  }
  return null;
}

export function getSpellEnglishName(name: string, catalog?: any[]): string {
  if (!name) return '';
  const raw = String(name).trim();
  const cat = matchSpellInCatalog(raw, catalog);
  if (cat && cat.name) return cat.name;
  const m = raw.match(/^([^(]+)\s*(?:\(([^)]+)\))?/);
  if (m && m[2]) {
    const p1 = m[1].trim();
    const p2 = m[2].trim();
    if (/[áàâãéêíóôõúç]/i.test(p1) && !/[áàâãéêíóôõúç]/i.test(p2)) {
      return p2;
    }
    return p1;
  }
  return raw;
}

export function formatSpellNameEnPt(name: string, catalog?: any[]): string {
  if (!name) return '';
  const raw = String(name).trim();
  const cat = matchSpellInCatalog(raw, catalog);
  if (cat && cat.name && cat.namePt && cat.namePt !== cat.name) {
    return `${cat.name} (${cat.namePt})`;
  }
  const m = raw.match(/^([^(]+)\s*\(([^)]+)\)$/);
  if (m) {
    const p1 = m[1].trim();
    const p2 = m[2].trim();
    if (/[áàâãéêíóôõúç]/i.test(p1) && !/[áàâãéêíóôõúç]/i.test(p2)) {
      return `${p2} (${p1})`;
    }
    return raw;
  }
  return raw;
}

export const SingleSpellModal: React.FC<SingleSpellModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSpell,
}) => {
  const [name, setName] = useState('');
  const [nh, setNh] = useState<string | number>('');
  const [notes, setNotes] = useState('');

  // Search in database state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [catalogSpells, setCatalogSpells] = useState<any[]>([]);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadSpellsDatabase().then((data) => {
        setCatalogSpells(data);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialSpell) {
      setName(initialSpell.name || '');
      setNh(initialSpell.nh ?? '');
      setNotes(initialSpell.notes || '');
    } else {
      setName('');
      setNh(''); // NH em branco por padrão ao criar nova magia!
      setNotes('');
    }
    setSearchQuery('');
    setIsSearchOpen(false);
  }, [initialSpell, isOpen]);

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

  // Filtered spells from database
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
      .slice(0, 30);
  }, [searchQuery, catalogSpells]);

  const handleSelectCatalogSpell = (s: any) => {
    const selectedName = s.displayName || (s.namePt && s.namePt !== s.name ? `${s.name} (${s.namePt})` : s.name);
    setName(selectedName);
    // NH permanece em branco como solicitado pelo usuário
    setNh('');
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: initialSpell ? initialSpell.id : `spl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      nh: typeof nh === 'string' ? (nh.trim() === '' ? '' : isNaN(Number(nh)) ? nh.trim() : Number(nh)) : nh,
      notes: notes.trim(),
      isFavorite: initialSpell ? !!initialSpell.isFavorite : false,
    });
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        background: 'rgba(2, 6, 23, 0.85)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative flex flex-col overflow-hidden"
        style={{
          position: 'relative',
          margin: 'auto',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#0f172a',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '18px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
          overflow: 'hidden',
        }}
      >
        {/* Header no padrão Armas & Ataques */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid rgba(245, 158, 11, 0.2)',
            background: 'linear-gradient(to right, rgba(69, 26, 3, 0.3), #0f172a, #0f172a)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fbbf24',
                flexShrink: 0,
              }}
            >
              <Sparkles size={17} className="text-amber-400" />
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: '15px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>
                {initialSpell ? 'Editar Magia' : 'Cadastrar Magia'}
              </h2>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                Configure o nome, Nível de Habilidade (NH) e anotações da magia
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px',
              borderRadius: '8px',
              cursor: 'pointer',
              flexShrink: 0,
              background: 'transparent',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
            }}
            className="hover:text-white hover:bg-slate-800 transition-colors"
            title="Fechar (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sub-header: Campo de Busca no Banco de Dados de Magias */}
        <div
          ref={searchContainerRef}
          style={{
            flexShrink: 0,
            padding: '12px 20px',
            borderBottom: '1px solid rgba(51, 65, 85, 0.8)',
            background: 'rgba(2, 6, 23, 0.8)',
          }}
          className="relative"
        >
          <div className="relative">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-750 focus-within:border-amber-500/70 focus-within:ring-1 focus-within:ring-amber-500/40 rounded-xl px-3 py-2 transition-all shadow-inner">
              <Search size={15} className="text-amber-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                placeholder="Buscar magia no catálogo (ex: Bola de Fogo, Cura, Escudo, Sono...)"
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
                  title="Limpar busca"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Dropdown de resultados de busca do banco de dados */}
            {isSearchOpen && searchQuery.trim().length > 0 && (
              <div
                className="absolute top-full left-0 right-0 mt-1.5 z-50 border border-amber-500/50 rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto custom-scrollbar"
                style={{
                  backgroundColor: '#0f172a',
                  background: '#0f172a',
                  opacity: 1,
                  zIndex: 99999,
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.95), 0 10px 15px -3px rgba(0, 0, 0, 0.9)',
                }}
              >
                <div
                  style={{ backgroundColor: '#020617', background: '#020617' }}
                  className="px-3 py-1.5 border-b border-slate-800 text-[10px] text-amber-400 font-semibold flex items-center justify-between"
                >
                  <span>{searchResults.length} magias encontradas</span>
                  <span className="text-slate-500">Clique para preencher os campos</span>
                </div>

                {searchResults.length === 0 ? (
                  <div
                    style={{ backgroundColor: '#0f172a', background: '#0f172a' }}
                    className="px-4 py-4 text-center text-xs text-slate-500 italic"
                  >
                    Nenhuma magia encontrada no catálogo para "{searchQuery}".
                  </div>
                ) : (
                  searchResults.map((s, idx) => (
                    <button
                      key={s.id || idx}
                      type="button"
                      onClick={() => handleSelectCatalogSpell(s)}
                      style={{ backgroundColor: '#0f172a', background: '#0f172a' }}
                      className="w-full text-left px-3 py-2 border-b border-slate-800/80 hover:bg-slate-800/90 hover:border-amber-500/40 transition-colors flex flex-col gap-0.5 group cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                          {s.displayName || s.name}
                        </span>
                        {s.college && (
                          <span className="text-[10px] bg-slate-800 text-amber-400/90 px-1.5 py-0.5 rounded border border-slate-700 shrink-0">
                            {getCollegePt(s.college)}
                          </span>
                        )}
                      </div>
                      {s.description && (
                        <span className="text-[10px] text-slate-400 font-normal line-clamp-1 truncate">
                          {s.description}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Nome da Magia */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">
              Nome da Magia *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Bola de Fogo, Cura Menor, Escudo Mágico..."
              className="w-full bg-slate-900 border border-slate-750 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          {/* NH (Nível de Habilidade) */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">
              Nível de Habilidade (NH)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={nh}
                onChange={(e) => setNh(e.target.value)}
                placeholder="Em branco ou número (ex: 12, 14...)"
                className="w-32 bg-slate-900 border border-amber-500/40 focus:border-amber-500 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-300 placeholder-slate-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-400 italic">
                (Pode ficar em branco se o personagem ainda não comprou NH)
              </span>
            </div>
          </div>

          {/* Anotações / Notas */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">
              Anotações / Efeitos da Magia
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Custo: 1 a 3 FP. Duração: Instantânea. Dano 1d por FP..."
              className="w-full bg-slate-900 border border-slate-750 focus:border-amber-500 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
            />
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow transition-colors"
            >
              <Check size={14} />
              <span>{initialSpell ? 'Salvar Alterações' : 'Adicionar Magia'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

