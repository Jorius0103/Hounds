import React, { useState, useEffect } from 'react';
import { Weapon, WeaponAttackMode } from '../types/rpg';
import { Sword, X, Check, Sparkles, Plus, Trash2 } from 'lucide-react';

interface WeaponModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (weapon: Weapon) => void;
  initialWeapon?: Weapon | null;
}

// GURPS 4th Edition standard weapon catalog with multiple attack modes
export const GURPS_4E_WEAPONS_CATALOG: {
  name: string;
  nh: number;
  modes: Omit<WeaponAttackMode, 'id'>[];
  notes?: string;
}[] = [
  {
    name: 'Espada Larga (Broadsword)',
    nh: 12,
    modes: [
      { name: 'Golpe de Corte', damage: 'sw+1 corte', type: 'Corte', reach: '1' },
      { name: 'Estocada', damage: 'thr+1 perf', type: 'Perfurante', reach: '1' },
    ],
    notes: 'Espada de uma mão clássica.',
  },
  {
    name: 'Espada Curta (Shortsword)',
    nh: 12,
    modes: [
      { name: 'Golpe de Corte', damage: 'sw corte', type: 'Corte', reach: '1' },
      { name: 'Estocada', damage: 'thr perf', type: 'Perfurante', reach: '1' },
    ],
    notes: 'Ágil e compacta.',
  },
  {
    name: 'Espada de Duas Mãos / Montante (Greatsword)',
    nh: 12,
    modes: [
      { name: 'Golpe de Corte (2 mãos)', damage: 'sw+3 corte', type: 'Corte', reach: '1, 2' },
      { name: 'Estocada (2 mãos)', damage: 'thr+2 perf', type: 'Perfurante', reach: '2' },
    ],
    notes: 'Requer duas mãos (†).',
  },
  {
    name: 'Lança (Spear)',
    nh: 12,
    modes: [
      { name: 'Uma Mão', damage: 'thr+2 perf', type: 'Perfurante', reach: '1' },
      { name: 'Duas Mãos', damage: 'thr+3 perf', type: 'Perfurante', reach: '1, 2*' },
      { name: 'Arremesso', damage: 'thr+3 perf', type: 'Perfurante', reach: '10/20 yd' },
    ],
    notes: 'Versátil em 1 ou 2 mãos.',
  },
  {
    name: 'Adaga / Faca Grande (Large Knife)',
    nh: 12,
    modes: [
      { name: 'Corte', damage: 'sw-2 corte', type: 'Corte', reach: 'C, 1' },
      { name: 'Estocada', damage: 'thr perf', type: 'Perfurante', reach: 'C' },
      { name: 'Arremesso', damage: 'thr perf', type: 'Perfurante', reach: '5/10 yd' },
    ],
    notes: 'Pode ser arremessada.',
  },
  {
    name: 'Rapieira / Florete (Rapier)',
    nh: 13,
    modes: [
      { name: 'Estocada', damage: 'thr+1 perf', type: 'Perfurante', reach: '1, 2' },
    ],
    notes: 'Arma de esgrima.',
  },
  {
    name: 'Machado de Batalha (Battleaxe)',
    nh: 12,
    modes: [
      { name: 'Uma Mão', damage: 'sw+2 corte', type: 'Corte', reach: '1, 2' },
      { name: 'Duas Mãos', damage: 'sw+3 corte', type: 'Corte', reach: '1, 2' },
    ],
    notes: 'Desbalanceada (0U).',
  },
  {
    name: 'Machadinha de Arremesso (Small Axe)',
    nh: 12,
    modes: [
      { name: 'Corpo a Corpo', damage: 'sw+1 corte', type: 'Corte', reach: '1' },
      { name: 'Arremesso', damage: 'sw+1 corte', type: 'Corte', reach: '10/15 yd' },
    ],
    notes: 'Pode ser arremessada.',
  },
  {
    name: 'Maça / Clava (Mace)',
    nh: 12,
    modes: [
      { name: 'Golpe Contuso', damage: 'sw+3 cont', type: 'Contusão', reach: '1' },
    ],
    notes: 'Desbalanceada (0U).',
  },
  {
    name: 'Arco Composto / Longo (Regular Bow)',
    nh: 12,
    modes: [
      { name: 'Disparo de Flecha', damage: 'thr+1 perf', type: 'Perfurante', reach: '150/200 yd' },
    ],
    notes: 'Penetra armaduras leves.',
  },
  {
    name: 'Besta (Crossbow)',
    nh: 12,
    modes: [
      { name: 'Tiro de Virote', damage: 'thr+4 perf', type: 'Perfurante', reach: '200/250 yd' },
    ],
    notes: 'Requer 4 segundos para recarregar.',
  },
  {
    name: 'Desarmado / Soco (Punch)',
    nh: 10,
    modes: [
      { name: 'Soco Direto', damage: 'thr-1 cont', type: 'Contusão', reach: 'C' },
      { name: 'Chute', damage: 'thr cont', type: 'Contusão', reach: 'C, 1' },
    ],
    notes: 'Briga ou Boxe.',
  }
];

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

  useEffect(() => {
    if (initialWeapon) {
      setName(initialWeapon.name || '');
      setNh(initialWeapon.nh ?? 10);
      setNotes(initialWeapon.notes || '');

      if (initialWeapon.modes && initialWeapon.modes.length > 0) {
        setModes(JSON.parse(JSON.stringify(initialWeapon.modes)));
      } else {
        // Fallback for legacy weapons with single damage/type/reach
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
  }, [initialWeapon, isOpen]);

  if (!isOpen) return null;

  const handleApplyPreset = (indexStr: string) => {
    const idx = parseInt(indexStr, 10);
    if (isNaN(idx) || !GURPS_4E_WEAPONS_CATALOG[idx]) return;
    const item = GURPS_4E_WEAPONS_CATALOG[idx];
    setName(item.name);
    setNh(item.nh);
    setNotes(item.notes || '');
    setModes(
      item.modes.map((m, i) => ({
        id: `mode-${Date.now()}-${i}`,
        name: m.name || '',
        damage: m.damage,
        type: m.type,
        reach: m.reach,
      }))
    );
  };

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
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-750 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <Sword size={20} className="text-amber-400" />
            <h3 className="text-base font-bold text-white">
              {initialWeapon ? 'Editar Arma' : 'Cadastrar Arma'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick GURPS Catalog Preset Selector */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold">
            <Sparkles size={14} className="text-amber-400 shrink-0" />
            <span>Preencher rapidamente com modelo GURPS 4e:</span>
          </div>
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value !== '') {
                handleApplyPreset(e.target.value);
              }
            }}
            className="bg-slate-900 border border-slate-750 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="">-- Escolher modelo --</option>
            {GURPS_4E_WEAPONS_CATALOG.map((w, idx) => (
              <option key={idx} value={idx}>
                {w.name} ({w.modes.map((m) => m.damage).join(' / ')})
              </option>
            ))}
          </select>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Row 1: Name and NH */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-3">
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Nome da Arma *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                placeholder="Ex: 14 ou DX+5"
                className="w-full bg-slate-950 border border-amber-500/50 rounded-lg px-3 py-1.5 text-sm font-mono font-black text-amber-300 text-center focus:outline-none focus:ring-1 focus:ring-amber-500"
                required
              />
            </div>
          </div>

          {/* Row 2: Multiple Attack Modes (Dano / Tipo / Alcance) */}
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
                        onClick={() => handleRemoveMode(index)}
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

          {/* Row 3: Observações (Peso removido) */}
          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Observações
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800 shrink-0">
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
              <span>Salvar Arma</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
