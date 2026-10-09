import React, { useState } from 'react';
import { Combat } from '../types/rpg';
import { Swords, Plus, Trash2, Edit2, X, EyeOff } from 'lucide-react';

interface CombatManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  combats: Combat[];
  activeCombatId: string;
  onSelectCombat: (id: string) => void;
  onCreateCombat: (name: string, description?: string) => void;
  onDeleteCombat: (id: string) => void;
  onRenameCombat: (id: string, name: string, description?: string) => void;
}

export const CombatManagerModal: React.FC<CombatManagerModalProps> = ({
  isOpen,
  onClose,
  combats,
  activeCombatId,
  onSelectCombat,
  onCreateCombat,
  onDeleteCombat,
  onRenameCombat,
}) => {
  const [newCombatName, setNewCombatName] = useState('');
  const [newCombatDesc, setNewCombatDesc] = useState('');
  const [editingCombatId, setEditingCombatId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCombatName.trim()) return;
    onCreateCombat(newCombatName.trim(), newCombatDesc.trim());
    setNewCombatName('');
    setNewCombatDesc('');
  };

  const startEdit = (combat: Combat) => {
    setEditingCombatId(combat.id);
    setEditName(combat.name);
    setEditDesc(combat.description || '');
  };

  const saveEdit = (id: string) => {
    if (!editName.trim()) return;
    onRenameCombat(id, editName.trim(), editDesc.trim());
    setEditingCombatId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-750 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Swords size={20} className="text-amber-400" />
            <h3 className="text-base font-bold text-white">Gerenciar Combates da Campanha</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Create New Combat Form */}
        <form onSubmit={handleCreate} className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
          <div className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
            + Criar Novo Combate
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Nome do Combate (ex: Emboscada na Ponte)"
              value={newCombatName}
              onChange={(e) => setNewCombatName(e.target.value)}
              className="bg-slate-900 border border-slate-750 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              required
            />
            <input
              type="text"
              placeholder="Descrição / Cenário (opcional)"
              value={newCombatDesc}
              onChange={(e) => setNewCombatDesc(e.target.value)}
              className="bg-slate-900 border border-slate-750 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                onCreateCombat('Combate Vazio (Ocultar Tela)', 'Cena vazia e oculta para os jogadores.');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs rounded-lg border border-slate-700 transition-colors"
              title="Criar um combate sem nenhum NPC para ocultar a tela dos jogadores"
            >
              <EyeOff size={13} className="text-amber-400" />
              <span>+ Combate Vazio (Oculto)</span>
            </button>

            <button
              type="submit"
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors ml-auto shadow-sm active:scale-95"
            >
              <Plus size={14} />
              <span>Criar e Abrir Combate</span>
            </button>
          </div>
        </form>

        {/* Existing Combats List */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Combates Cadastrados ({combats.length})
          </div>
          {combats.map((c) => {
            const isActive = c.id === activeCombatId;
            const isEditing = editingCombatId === c.id;

            return (
              <div
                key={c.id}
                className={`p-3 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-slate-850 border-amber-500/60 ring-1 ring-amber-500/40 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-750 rounded px-2 py-1 text-xs text-white"
                    />
                    <input
                      type="text"
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-750 rounded px-2 py-1 text-xs text-slate-300"
                      placeholder="Descrição"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => setEditingCombatId(null)}
                        className="px-2 py-1 text-xs text-slate-400 hover:text-white"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => saveEdit(c.id)}
                        className="px-2.5 py-1 text-xs bg-amber-500 text-slate-950 font-bold rounded"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">
                          {c.name}
                        </span>
                        {isActive && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-medium">
                            Ativo
                          </span>
                        )}
                      </div>
                      {c.description && (
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {c.description}
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1 font-mono">
                        <span>{c.npcs.length} NPCs</span>
                        <span>·</span>
                        <span>{c.createdAt}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {!isActive && (
                        <button
                          onClick={() => {
                            onSelectCombat(c.id);
                            onClose();
                          }}
                          className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg border border-slate-700"
                        >
                          Selecionar
                        </button>
                      )}
                      <button
                        onClick={() => startEdit(c)}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg"
                      >
                        <Edit2 size={13} />
                      </button>
                      {combats.length > 1 && (
                        <button
                          onClick={() => {
                            if (confirm(`Tem certeza que deseja excluir o combate "${c.name}"?`)) {
                              onDeleteCombat(c.id);
                            }
                          }}
                          className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
