import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Weapon, WeaponAttackMode } from '../types/rpg';
import { Sword, X, Check, Search, Plus, Trash2 } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface WeaponModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (weapon: Weapon) => void;
  initialWeapon?: Weapon | null;
}

// Fallback catalog of common GURPS 4e weapons in case fetch is unavailable
export const GURPS_4E_WEAPONS_CATALOG = [
  {
    name: 'Espada Larga (Broadsword)',
    namePt: 'Espada Larga',
    nh: 12,
    modes: [
      { name: 'Golpe de Corte', damage: 'sw+1 corte', type: 'Corte', reach: '1' },
      { name: 'Estocada', damage: 'thr+1 perf', type: 'Perfurante', reach: '1' },
    ],
    notes: 'Espada de uma mão clássica. GURPS Basic Set B271 | ST: 10',
  },
  {
    name: 'Espada Curta (Shortsword)',
    namePt: 'Espada Curta',
    nh: 12,
    modes: [
      { name: 'Golpe de Corte', damage: 'sw corte', type: 'Corte', reach: '1' },
      { name: 'Estocada', damage: 'thr perf', type: 'Perfurante', reach: '1' },
    ],
    notes: 'Ágil e compacta. GURPS Basic Set B273 | ST: 8',
  },
  {
    name: 'Espada de Duas Mãos / Montante (Greatsword)',
    namePt: 'Espada de Duas Mãos',
    nh: 12,
    modes: [
      { name: 'Golpe de Corte (2 mãos)', damage: 'sw+3 corte', type: 'Corte', reach: '1, 2' },
      { name: 'Estocada (2 mãos)', damage: 'thr+2 perf', type: 'Perfurante', reach: '2' },
    ],
    notes: 'Requer duas mãos (†). GURPS Basic Set B274 | ST: 12†',
  },
  {
    name: 'Lança (Spear)',
    namePt: 'Lança',
    nh: 12,
    modes: [
      { name: 'Uma Mão', damage: 'thr+2 perf', type: 'Perfurante', reach: '1' },
      { name: 'Duas Mãos', damage: 'thr+3 perf', type: 'Perfurante', reach: '1, 2*' },
      { name: 'Arremesso', damage: 'thr+3 perf', type: 'Perfurante', reach: '10/20 yd' },
    ],
    notes: 'Versátil em 1 ou 2 mãos. GURPS Basic Set B273 | ST: 9',
  },
  {
    name: 'Adaga / Faca Grande (Large Knife)',
    namePt: 'Faca Grande',
    nh: 12,
    modes: [
      { name: 'Corte', damage: 'sw-2 corte', type: 'Corte', reach: 'C, 1' },
      { name: 'Estocada', damage: 'thr perf', type: 'Perfurante', reach: 'C' },
      { name: 'Arremesso', damage: 'thr perf', type: 'Perfurante', reach: '5/10 yd' },
    ],
    notes: 'Pode ser arremessada. GURPS Basic Set B272 | ST: 6',
  },
  {
    name: 'Rapieira / Florete (Rapier)',
    namePt: 'Rapieira',
    nh: 13,
    modes: [
      { name: 'Estocada', damage: 'thr+1 perf', type: 'Perfurante', reach: '1, 2' },
    ],
    notes: 'Arma de esgrima. GURPS Basic Set B273 | ST: 9',
  },
  {
    name: 'Machado de Batalha (Battleaxe)',
    namePt: 'Machado de Batalha',
    nh: 12,
    modes: [
      { name: 'Uma Mão', damage: 'sw+2 corte', type: 'Corte', reach: '1, 2' },
      { name: 'Duas Mãos', damage: 'sw+3 corte', type: 'Corte', reach: '1, 2' },
    ],
    notes: 'Desbalanceada (0U). GURPS Basic Set B271 | ST: 11',
  },
  {
    name: 'Machadinha (Small Axe)',
    namePt: 'Machadinha',
    nh: 12,
    modes: [
      { name: 'Corpo a Corpo', damage: 'sw+1 corte', type: 'Corte', reach: '1' },
      { name: 'Arremesso', damage: 'sw+1 corte', type: 'Corte', reach: '10/15 yd' },
    ],
    notes: 'Pode ser arremessada. GURPS Basic Set B271 | ST: 8',
  },
  {
    name: 'Maça / Clava (Mace)',
    namePt: 'Maça',
    nh: 12,
    modes: [
      { name: 'Golpe Contuso', damage: 'sw+3 cont', type: 'Contusão', reach: '1' },
    ],
    notes: 'Desbalanceada (0U). GURPS Basic Set B271 | ST: 12',
  },
  {
    name: 'Arco Regular / Longo (Bow)',
    namePt: 'Arco',
    nh: 12,
    modes: [
      { name: 'Disparo de Flecha', damage: 'thr+1 perf', type: 'Perfurante', reach: '150/200 yd' },
    ],
    notes: 'Penetra armaduras leves. GURPS Basic Set B275 | ST: 10†',
  },
  {
    name: 'Besta (Crossbow)',
    namePt: 'Besta',
    nh: 12,
    modes: [
      { name: 'Tiro de Virote', damage: 'thr+4 perf', type: 'Perfurante', reach: '200/250 yd' },
    ],
    notes: 'Requer 4 segundos para recarregar. GURPS Basic Set B276 | ST: 7†',
  },
  {
    name: 'Desarmado / Soco (Punch)',
    namePt: 'Soco',
    nh: 10,
    modes: [
      { name: 'Soco Direto', damage: 'thr-1 cont', type: 'Contusão', reach: 'C' },
      { name: 'Chute', damage: 'thr cont', type: 'Contusão', reach: 'C, 1' },
    ],
    notes: 'Briga, Boxe ou Karatê.',
  }
];

// In-memory catalog cache
let cachedCatalog: any[] | null = null;
let catalogLoadingPromise: Promise<any[]> | null = null;

const DAMAGE_MAP: Record<string, string> = {
  cut: 'Corte',
  cr: 'Contusão',
  imp: 'Perfurante',
  'pi-': 'Perfurante Pequeno',
  pi: 'Perfurante',
  'pi+': 'Perfurante Grande',
  'pi++': 'Perfurante Enorme',
  burn: 'Queimadura',
  fat: 'Fadiga',
  tox: 'Tóxico',
  cor: 'Corrosivo',
  spec: 'Especial'
};

function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

async function loadWeaponsDatabase(): Promise<any[]> {
  if (cachedCatalog && cachedCatalog.length > 0) {
    return cachedCatalog;
  }

  // 1. Check parent window or global W
  try {
    const parentW = (window as any).parent?.W?.weapons;
    if (Array.isArray(parentW) && parentW.length > 0) {
      cachedCatalog = parentW;
      return cachedCatalog;
    }
  } catch (e) {}

  try {
    const localW = (window as any).W?.weapons;
    if (Array.isArray(localW) && localW.length > 0) {
      cachedCatalog = localW;
      return cachedCatalog;
    }
  } catch (e) {}

  // 2. Fetch from dados/armas.json and dados/traducoes.json
  if (!catalogLoadingPromise) {
    catalogLoadingPromise = Promise.all([
      fetch('dados/armas.json').then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch('dados/traducoes.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({}))
    ]).then(([armas, traducoes]) => {
      const transMap = traducoes || {};
      const list = (armas || []).map((w: any) => {
        const pt = transMap[w.name] || '';
        const displayName = pt && pt !== w.name ? `${pt} (${w.name})` : w.name;
        return {
          ...w,
          namePt: pt,
          displayName,
        };
      });
      cachedCatalog = list.length > 0 ? list : GURPS_4E_WEAPONS_CATALOG;
      return cachedCatalog;
    }).catch(() => {
      cachedCatalog = GURPS_4E_WEAPONS_CATALOG;
      return cachedCatalog;
    });
  }

  return catalogLoadingPromise;
}

export const WeaponModal: React.FC<WeaponModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialWeapon,
}) => {
  const [name, setName] = useState('');
  const [nh, setNh] = useState<string | number>('');
  const [modes, setModes] = useState<WeaponAttackMode[]>([]);
  const [notes, setNotes] = useState('');
  const [deletingModeIndex, setDeletingModeIndex] = useState<number | null>(null);

  // Search in database state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [catalogWeapons, setCatalogWeapons] = useState<any[]>([]);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadWeaponsDatabase().then((data) => {
        setCatalogWeapons(data);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialWeapon) {
      setName(initialWeapon.name || '');
      setNh(initialWeapon.nh ?? 10);
      setNotes(initialWeapon.notes || '');

      if (initialWeapon.modes && initialWeapon.modes.length > 0) {
        setModes(JSON.parse(JSON.stringify(initialWeapon.modes)));
      } else {
        setModes([
          {
            id: `mode-${Date.now()}-1`,
            name: 'Principal',
            damage: initialWeapon.damage || '',
            type: initialWeapon.type || '',
            reach: initialWeapon.reach || '1',
          },
        ]);
      }
    } else {
      setName('');
      setNh('');
      setNotes('');
      setModes([
        {
          id: `mode-${Date.now()}-1`,
          name: '',
          damage: '',
          type: '',
          reach: '',
        },
      ]);
    }
    setSearchQuery('');
    setIsSearchOpen(false);
  }, [initialWeapon, isOpen]);

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

  // Filtered weapons from database
  const searchResults = useMemo(() => {
    const q = normalizeText(searchQuery);
    if (!q) return [];

    return catalogWeapons
      .filter((w) => {
        const n1 = normalizeText(w.name || '');
        const n2 = normalizeText(w.namePt || '');
        const n3 = normalizeText(w.displayName || '');
        const t = normalizeText(w.type || '');
        const b = normalizeText(w.book || '');
        const att = (w.attacks || []).some(
          (a: any) =>
            normalizeText(a.skill || '').includes(q) ||
            normalizeText(a.damage || '').includes(q) ||
            normalizeText(a.mode || '').includes(q)
        );
        return n1.includes(q) || n2.includes(q) || n3.includes(q) || t.includes(q) || b.includes(q) || att;
      })
      .slice(0, 25);
  }, [searchQuery, catalogWeapons]);

  const handleSelectCatalogWeapon = (w: any) => {
    const selectedName = w.displayName || (w.namePt && w.namePt !== w.name ? `${w.namePt} (${w.name})` : w.name);
    setName(selectedName);
    setNh(12);

    // Build notes
    const noteParts: string[] = [];
    if (w.book || w.page) noteParts.push(`${w.book || 'GURPS'} ${w.page || ''}`.trim());
    if (w.cost) noteParts.push(`Custo: ${w.cost}`);
    if (w.weight) noteParts.push(`Peso: ${w.weight} lb`);
    if (w.attacks && w.attacks[0]?.st) noteParts.push(`ST: ${w.attacks[0].st}`);
    if (w.notes) noteParts.push(w.notes);
    if (w.footnotes) noteParts.push(w.footnotes);
    setNotes(noteParts.join(' | '));

    // Map attack modes
    if (w.attacks && w.attacks.length > 0) {
      const mappedModes: WeaponAttackMode[] = w.attacks.map((a: any, idx: number) => {
        const dmg = a.damage || '';
        let type = a.type || '';
        if (!type && dmg) {
          const parts = dmg.trim().split(/\s+/);
          if (parts.length >= 2) {
            const code = parts[parts.length - 1].toLowerCase().replace(/[()]/g, '');
            if (DAMAGE_MAP[code]) {
              type = DAMAGE_MAP[code];
            }
          }
        }

        let modeName = a.mode || '';
        if (modeName === 'two hands') modeName = 'Duas Mãos';
        else if (modeName === 'one hand') modeName = 'Uma Mão';
        else if (modeName === 'thrown') modeName = 'Arremesso';
        else if (modeName === 'or') {
          if (type.includes('Corte')) modeName = 'Golpe de Corte';
          else if (type.includes('Perf')) modeName = 'Estocada';
          else if (type.includes('Contus')) modeName = 'Golpe Contuso';
          else modeName = 'Ataque Alternativo';
        } else if (!modeName) {
          if (type.includes('Corte')) modeName = 'Golpe de Corte';
          else if (type.includes('Perf')) modeName = 'Estocada';
          else if (type.includes('Contus')) modeName = 'Golpe Contuso';
          else if (a.skill) modeName = a.skill;
          else modeName = idx === 0 ? 'Principal' : `Modo ${idx + 1}`;
        }

        let reach = a.reach || a.range || '';
        if (a.acc && !reach.includes('Acc')) {
          reach = `Acc ${a.acc}, Alc ${reach}`.trim();
        }

        return {
          id: `mode-${Date.now()}-${idx}`,
          name: modeName,
          damage: dmg,
          type: type || 'Corte',
          reach: reach || '1',
        };
      });
      setModes(mappedModes);
    } else if (w.modes && w.modes.length > 0) {
      setModes(
        w.modes.map((m: any, idx: number) => ({
          id: `mode-${Date.now()}-${idx}`,
          name: m.name || '',
          damage: m.damage || '',
          type: m.type || '',
          reach: m.reach || '1',
        }))
      );
    }

    setSearchQuery('');
    setIsSearchOpen(false);
  };

  if (!isOpen) return null;

  const handleAddMode = () => {
    setModes((prev) => [
      ...prev,
      {
        id: `mode-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: '',
        damage: '',
        type: '',
        reach: '',
      },
    ]);
  };

  const handleUpdateMode = (index: number, field: keyof WeaponAttackMode, value: string) => {
    setModes((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveMode = (index: number) => {
    if (modes.length <= 1) return;
    setModes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const primaryMode = modes[0];

    onSave({
      id: initialWeapon ? initialWeapon.id : `wpn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      nh: typeof nh === 'string' ? (nh.trim() === '' ? 10 : isNaN(Number(nh)) ? nh.trim() : Number(nh)) : nh,
      damage: primaryMode?.damage || '',
      type: primaryMode?.type || '',
      reach: primaryMode?.reach || '',
      modes: modes.filter((m) => m.damage.trim() !== '' || m.type.trim() !== ''),
      notes: notes.trim(),
      isFavorite: initialWeapon ? !!initialWeapon.isFavorite : false,
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
          maxWidth: '640px',
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
        {/* Header no padrão Passar o Dia / Lançar Dano */}
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
              <Sword size={17} className="text-amber-400" />
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: '15px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>
                {initialWeapon ? 'Editar Arma' : 'Cadastrar Arma'}
              </h2>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                Configure estatísticas de combate, NH, modos de ataque e dano
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

        {/* Sub-header: Campo de Busca no Banco de Dados de Armas */}
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
                placeholder="Buscar arma no catálogo (ex: Espada, Machado, Spear, Arco, Adaga...)"
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
                  <span>{searchResults.length} armas encontradas</span>
                  <span className="text-slate-500">Clique para preencher os campos</span>
                </div>

                {searchResults.length === 0 ? (
                  <div
                    style={{ backgroundColor: '#0f172a', background: '#0f172a' }}
                    className="px-4 py-4 text-center text-xs text-slate-500 italic"
                  >
                    Nenhuma arma encontrada no catálogo para "{searchQuery}".
                  </div>
                ) : (
                  searchResults.map((w, idx) => (
                    <button
                      key={w.id || idx}
                      type="button"
                      onClick={() => handleSelectCatalogWeapon(w)}
                      style={{ backgroundColor: '#0f172a', background: '#0f172a' }}
                      className="w-full text-left px-3 py-2 border-b border-slate-800/80 hover:bg-slate-800/90 hover:border-amber-500/40 transition-colors flex flex-col gap-0.5 group cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                          {w.displayName || w.name}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 shrink-0">
                          {w.type && (
                            <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-300">
                              {w.type}
                            </span>
                          )}
                          {w.book && (
                            <span className="text-slate-400 font-mono">
                              {w.book} {w.page}
                            </span>
                          )}
                        </div>
                      </div>
                      {w.attacks && w.attacks.length > 0 && (
                        <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2 flex-wrap">
                          {w.attacks.slice(0, 3).map((a: any, i: number) => (
                            <span key={i} className="text-slate-300">
                              {a.damage} {a.reach ? `(Alc: ${a.reach})` : ''}
                            </span>
                          ))}
                          {w.attacks[0]?.st && <span className="text-amber-400/80">ST: {w.attacks[0].st}</span>}
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Formulário com scrollbar elegante */}
        <form
          onSubmit={handleSubmit}
          className="custom-scrollbar space-y-4 flex-1"
          style={{
            minHeight: 0,
            overflowY: 'auto',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {/* Linha 1: Nome e NH */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-3">
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Nome da Arma *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Espada Larga (Broadsword)"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Nível de Habilidade (NH) *
              </label>
              <input
                type="text"
                value={nh}
                onChange={(e) => setNh(e.target.value)}
                placeholder="Ex: 12 ou DX+2"
                className="w-full bg-slate-950 border border-amber-500/50 rounded-lg px-3 py-1.5 text-sm font-mono font-black text-amber-300 text-center focus:outline-none focus:ring-1 focus:ring-amber-500"
                required
              />
            </div>
          </div>

          {/* Linha 2: Opções de Ataque (Dano / Tipo / Alcance) */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider block">
                  Opções de Ataque (Dano / Tipo / Alcance)
                </span>
                <span className="text-[10px] text-slate-400">
                  Cadastre várias opções (ex: Corte vs Estocada, 1 Mão vs 2 Mãos, Arremesso)
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddMode}
                className="flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg transition-colors font-semibold"
              >
                <Plus size={13} />
                <span>+ Adicionar Outra Opção</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {modes.map((mode, index) => (
                <div
                  key={mode.id || index}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                >
                  <div className="sm:col-span-3">
                    <label className="text-[10px] text-slate-400 block mb-0.5">Modo / Rótulo</label>
                    <input
                      type="text"
                      placeholder="ex: Corte / 1 Mão"
                      value={mode.name || ''}
                      onChange={(e) => handleUpdateMode(index, 'name', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="text-[10px] text-slate-400 block mb-0.5">Dano</label>
                    <input
                      type="text"
                      placeholder="ex: sw+1 corte"
                      value={mode.damage}
                      onChange={(e) => handleUpdateMode(index, 'damage', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="text-[10px] text-slate-400 block mb-0.5">Tipo</label>
                    <input
                      type="text"
                      placeholder="ex: Corte, Perf"
                      value={mode.type}
                      onChange={(e) => handleUpdateMode(index, 'type', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-400 block mb-0.5">Alcance</label>
                    <input
                      type="text"
                      placeholder="ex: 1, 2"
                      value={mode.reach}
                      onChange={(e) => handleUpdateMode(index, 'reach', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div className="sm:col-span-1 flex justify-center pt-3 sm:pt-0">
                    {modes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setDeletingModeIndex(index)}
                        className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                        title="Remover este modo"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Linha 3: Observações */}
          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Observações
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anotações sobre a arma (livro, alcance, requisitos, ST...)"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Footer Fixo Moderno alinhado com Passar o Dia e Lançar Dano */}
          <div
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              padding: '12px 20px',
              background: '#020617',
              borderTop: '1px solid #1e293b',
              margin: 'auto -20px -16px -20px',
              gap: '12px',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '600',
                background: '#1e293b',
                color: '#94a3b8',
                border: '1px solid #334155',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              className="hover:text-white hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 'bold',
                background: '#f59e0b',
                color: '#020617',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
                transition: 'all 0.2s',
              }}
              className="hover:bg-amber-400 active:scale-95"
            >
              <Check size={14} />
              <span>Salvar Arma</span>
            </button>
          </div>
        </form>
      </div>

      <ConfirmModal
        isOpen={deletingModeIndex !== null}
        title="Remover Modo de Ataque"
        message={`Deseja remover o modo de ataque "${deletingModeIndex !== null ? modes[deletingModeIndex]?.name || `Modo ${deletingModeIndex + 1}` : ''}"?`}
        confirmText="Remover Modo"
        cancelText="Cancelar"
        isDanger={true}
        onConfirm={() => {
          if (deletingModeIndex !== null) {
            handleRemoveMode(deletingModeIndex);
            setDeletingModeIndex(null);
          }
        }}
        onCancel={() => setDeletingModeIndex(null)}
      />
    </div>
  );
};
