import React, { useState, useEffect } from 'react';
import { Spell } from '../types/rpg';
import { Sparkles, Plus, Trash2, Star, X, Check, BookOpen } from 'lucide-react';

interface SpellsModalProps {
  isOpen: boolean;
  onClose: () => void;
  spells: Spell[];
  onSave: (updatedSpells: Spell[]) => void;
  npcName: string;
}

const COMMON_GURPS_SPELLS = [
  'Bola de Fogo (Fireball)',
  'Cura Menor (Minor Healing)',
  'Cura Maior (Major Healing)',
  'Escudo Mágico (Shield)',
  'Armadura Mágica (Armor)',
  'Nuvem de Fumaça (Smoke)',
  'Nevoeiro (Fog)',
  'Luz (Light)',
  'Relâmpago (Lightning)',
  'Sono (Sleep)',
  'Silêncio (Silence)',
  'Criar Fogo (Create Fire)',
  'Telepatia (Mind-Reading)',
  'Pavor Mental (Fear)',
  'Aceleração (Haste)',
  'Detectar Magia (Detect Magic)',
];

export const SpellsModal: React.FC<SpellsModalProps> = ({
  isOpen,
  onClose,
  spells,
  onSave,
  npcName,
}) => {
  const [spellList, setSpellList] = useState<Spell[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSpellList(spells.length > 0 ? JSON.parse(JSON.stringify(spells)) : [
        { id: `spl-${Date.now()}-1`, name: '', nh: 12, isFavorite: false }
      ]);
    }
  }, [isOpen, spells]);

  if (!isOpen) return null;

  const handleAddRow = () => {
    setSpellList((prev) => [
      ...prev,
      {
        id: `spl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: '',
        nh: 12,
        isFavorite: false,
      },
    ]);
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

  const handleAddPreset = (spellName: string) => {
    setSpellList((prev) => [
      ...prev,
      {
        id: `spl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: spellName,
        nh: 12,
        isFavorite: false,
      },
    ]);
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

        {/* Quick Presets Picker */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 shrink-0 space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold">
            <BookOpen size={14} className="text-amber-400" />
            <span>Adicionar rapidamente magias clássicas do GURPS:</span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
            {COMMON_GURPS_SPELLS.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => handleAddPreset(name)}
                className="text-[11px] bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-slate-300 px-2 py-1 rounded-lg border border-slate-800 transition-colors"
              >
                + {name}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Multi-row Table */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2">
          <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
            <span>Magias Cadastradas ({spellList.length})</span>
            <button
              type="button"
              onClick={handleAddRow}
              className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-bold text-xs"
            >
              <Plus size={14} />
              <span>+ Adicionar Outra Magia</span>
            </button>
          </div>

          {spellList.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 italic">
              Nenhuma magia na lista. Clique em "+ Adicionar Outra Magia" ou escolha uma das opções acima.
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

                  {/* NH input */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-slate-400 font-mono">NH:</span>
                    <input
                      type="number"
                      value={spell.nh || 10}
                      onChange={(e) =>
                        handleUpdateRow(index, 'nh', parseInt(e.target.value, 10) || 0)
                      }
                      className="w-14 bg-slate-900 border border-amber-500/50 rounded-lg py-1.5 text-center text-xs font-mono font-bold text-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  {/* Remove row */}
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(index)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition-colors shrink-0"
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
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 shrink-0">
          <button
            type="button"
            onClick={handleAddRow}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors"
          >
            <Plus size={14} />
            <span>Adicionar Linha</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow transition-colors"
            >
              <Check size={14} />
              <span>Salvar Magias</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
