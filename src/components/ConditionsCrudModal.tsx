import React, { useState } from 'react';
import { ConditionDefinition } from '../types/rpg';
import { Plus, Trash2, Edit2, Check, Search, AlertCircle } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { ModalHeader } from './ModalHeader';
import { MODAL_BACKDROP_STYLE, modalCardStyle } from './modalStyles';

interface ConditionsCrudModalProps {
  isOpen: boolean;
  onClose: () => void;
  conditions: ConditionDefinition[];
  activeNpcConditions: string[];
  onToggleNpcCondition: (conditionLabel: string, duration?: number) => void;
  onCreateCondition: (condition: Omit<ConditionDefinition, 'id'>) => void;
  onUpdateCondition: (id: string, updated: Omit<ConditionDefinition, 'id'>) => void;
  onDeleteCondition: (id: string) => void;
  currentRound?: number;
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
  currentRound = 0,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDuration, setNewDuration] = useState<number | ''>('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editDuration, setEditDuration] = useState<number | ''>('');
  const [deletingCondition, setDeletingCondition] = useState<ConditionDefinition | null>(null);

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    onCreateCondition({
      label: newLabel.trim(),
      description: newDesc.trim() || 'Sem descrição.',
      duration: typeof newDuration === 'number' && newDuration > 0 ? newDuration : undefined,
    });
    setNewLabel('');
    setNewDesc('');
    setNewDuration('');
    setIsCreating(false);
  };

  const startEdit = (cond: ConditionDefinition) => {
    setEditingId(cond.id);
    setEditLabel(cond.label);
    setEditDesc(cond.description);
    setEditDuration(cond.duration !== undefined ? cond.duration : '');
  };

  const saveEdit = (id: string) => {
    if (!editLabel.trim()) return;
    onUpdateCondition(id, {
      label: editLabel.trim(),
      description: editDesc.trim(),
      duration: typeof editDuration === 'number' && editDuration > 0 ? editDuration : undefined,
    });
    setEditingId(null);
  };

  const filtered = conditions.filter(
    (c) =>
      c.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={MODAL_BACKDROP_STYLE}>
      <div style={modalCardStyle('640px', { borderRadius: '18px' })}>
        <ModalHeader
          size="large"
          icon={<AlertCircle size={16} className="text-amber-400" />}
          title={<span style={{ fontSize: '16px' }}>Gerenciador de Condições & Estados (CRUD)</span>}
          subtitle="Crie, edite, exclua e ative estados de combate no NPC selecionado."
          onClose={onClose}
        />

        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
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
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
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
              <input
                type="number"
                min="1"
                placeholder="Duração (rodadas, opc.)"
                value={newDuration}
                onChange={(e) => setNewDuration(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="bg-slate-900 border border-slate-750 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                title="Duração em rodadas até alerta de finalização"
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
                    onClick={() => onToggleNpcCondition(cond.label, cond.duration)}
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
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            placeholder="Nome..."
                            className="sm:col-span-2 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                          />
                          <input
                            type="number"
                            min="1"
                            placeholder="Duração (rodadas)..."
                            value={editDuration}
                            onChange={(e) => setEditDuration(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10) || 1))}
                            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                            title="Duração em rodadas"
                          />
                        </div>
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-bold ${isActiveOnNpc ? 'text-red-300' : 'text-slate-200'}`}>
                            {cond.label}
                          </span>
                          {cond.duration !== undefined && cond.duration > 0 && (
                            <span className="text-[10px] font-mono bg-purple-950/60 text-purple-300 border border-purple-800/60 px-1.5 py-0.2 rounded" title={`Duração padrão: ${cond.duration} rodadas`}>
                              ⏱️ {cond.duration} rodada{cond.duration === 1 ? '' : 's'}
                            </span>
                          )}
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
                        type="button"
                        onClick={() => setDeletingCondition(cond)}
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
        </div>

        {/* Rodapé fixo: total de condições e quantas estão ativas no NPC */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            background: '#020617',
            borderTop: '1px solid #1e293b',
            gap: '12px',
          }}
        >
          <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 500 }}>
            <strong style={{ color: '#fbbf24', fontWeight: 'bold' }}>{conditions.length}</strong>
            {` ${conditions.length === 1 ? 'condição cadastrada' : 'condições cadastradas'}`}
            {activeNpcConditions.length > 0
              ? ` (${activeNpcConditions.length} ativa${activeNpcConditions.length > 1 ? 's' : ''} no NPC)`
              : ''}
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 'bold',
              background: '#f59e0b',
              color: '#020617',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Concluir
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={Boolean(deletingCondition)}
        title="Excluir Condição"
        message={`Deseja excluir permanentemente a condição "${deletingCondition?.label}"?`}
        confirmText="Excluir Condição"
        cancelText="Cancelar"
        isDanger={true}
        onConfirm={() => {
          if (deletingCondition) {
            onDeleteCondition(deletingCondition.id);
            setDeletingCondition(null);
          }
        }}
        onCancel={() => setDeletingCondition(null)}
      />
    </div>
  );
};
