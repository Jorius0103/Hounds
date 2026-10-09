import React, { useState } from 'react';
import { ConditionDefinition } from '../types/rpg';
import { Plus, Trash2, Edit2, Check, X, Search, AlertCircle } from 'lucide-react';

interface ConditionsCrudModalProps {
  isOpen: boolean;
  onClose: () => void;
  conditions: ConditionDefinition[];
  activeNpcConditions: string[];
  onToggleNpcCondition: (conditionLabel: string) => void;
  onCreateCondition: (condition: Omit<ConditionDefinition, 'id'>) => void;
  onUpdateCondition: (id: string, updated: Omit<ConditionDefinition, 'id'>) => void;
  onDeleteCondition: (id: string) => void;
}

export const ConditionsCrudModal: React.FC<ConditionsCrudModalProps> = ({
  isOpen,
  onClose,
  conditions,
  activeNpcConditions,
  onToggleNpcCondition,
  onCreateCondition,
  onUpdateCondition,
  onDeleteCondition,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editDesc, setEditDesc] = useState('');

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    onCreateCondition({
      label: newLabel.trim(),
      description: newDesc.trim() || 'Sem descrição.',
    });
    setNewLabel('');
    setNewDesc('');
    setIsCreating(false);
  };

  const startEdit = (cond: ConditionDefinition) => {
    setEditingId(cond.id);
    setEditLabel(cond.label);
    setEditDesc(cond.description);
  };

  const saveEdit = (id: string) => {
    if (!editLabel.trim()) return;
    onUpdateCondition(id, {
      label: editLabel.trim(),
      description: editDesc.trim(),
    });
    setEditingId(null);
  };

  const filtered = conditions.filter(
    (c) =>
      c.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-750 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertCircle size={18} className="text-amber-400" />
              <span>Gerenciador de Condições & Estados (CRUD)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Crie, edite, exclua e ative estados de combate no NPC selecionado.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search and New Button */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar condição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <button
            onClick={() => setIsCreating(!isCreating)}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-colors whitespace-nowrap"
          >
            <Plus size={14} />
            <span>{isCreating ? 'Fechar' : 'Nova Condição'}</span>
          </button>
        </div>

        {/* Create form */}
        {isCreating && (
          <form onSubmit={handleCreate} className="p-3 bg-slate-950/80 border border-amber-500/40 rounded-xl space-y-2.5">
            <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
              Criar Nova Condição / Estado
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Nome do Estado (ex: Congelado)"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="bg-slate-900 border border-slate-750 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                required
              />
              <input
                type="text"
                placeholder="Descrição / Efeitos (ex: -2 em esquiva...)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="sm:col-span-2 bg-slate-900 border border-slate-750 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 py-1 text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-1 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg"
              >
                <Check size={13} />
                <span>Salvar Condição</span>
              </button>
            </div>
          </form>
        )}

        {/* List of Conditions */}
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 italic">
              Nenhuma condição encontrada.
            </div>
          ) : (
            filtered.map((cond) => {
              const isActiveOnNpc = activeNpcConditions.includes(cond.label);
              const isEditing = editingId === cond.id;

              return (
                <div
                  key={cond.id}
                  className={`p-3 rounded-xl border transition-all flex items-start gap-3 ${
                    isActiveOnNpc
                      ? 'bg-red-950/30 border-red-700/60'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-750'
                  }`}
                >
                  {/* Checkbox to toggle on active NPC */}
                  <button
                    onClick={() => onToggleNpcCondition(cond.label)}
                    title={isActiveOnNpc ? 'Remover deste NPC' : 'Ativar neste NPC'}
                    className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border shrink-0 transition-colors ${
                      isActiveOnNpc
                        ? 'bg-red-600 border-red-500 text-white'
                        : 'bg-slate-900 border-slate-700 hover:border-slate-500 text-transparent'
                    }`}
                  >
                    <Check size={13} />
                  </button>

                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                        />
                        <textarea
                          rows={2}
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300"
                        />
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-2 py-1 text-xs text-slate-400 hover:text-white"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => saveEdit(cond.id)}
                            className="px-2.5 py-1 text-xs bg-amber-500 text-slate-950 font-bold rounded"
                          >
                            Salvar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${isActiveOnNpc ? 'text-red-300' : 'text-slate-200'}`}>
                            {cond.label}
                          </span>
                          {isActiveOnNpc && (
                            <span className="text-[10px] font-mono bg-red-950 text-red-400 border border-red-800 px-1.5 py-0.2 rounded">
                              Ativo no NPC
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                          {cond.description}
                        </div>
                      </>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => startEdit(cond)}
                        title="Editar esta condição"
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Excluir permanentemente a condição "${cond.label}"?`)) {
                            onDeleteCondition(cond.id);
                          }
                        }}
                        title="Excluir condição"
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
