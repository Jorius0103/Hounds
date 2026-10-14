import React, { useState } from 'react';
import { Combat } from '../types/rpg';
import { Swords, Plus, Trash2, Edit2, X, Eye, EyeOff, Download, Upload } from 'lucide-react';

interface CombatManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  combats: Combat[];
  activeCombatId: string;
  onSelectCombat: (id: string) => void;
  onCreateCombat: (name: string, description?: string) => void;
  onDeleteCombat: (id: string) => void;
  onRenameCombat: (id: string, name: string, description?: string) => void;
  onToggleCombatActive?: (id: string) => void;
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
  onToggleCombatActive,
}) => {
  const [newCombatName, setNewCombatName] = useState('');
  const [newCombatDesc, setNewCombatDesc] = useState('');
  const [editingCombatId, setEditingCombatId] = useState<string | null>(null);
  const [deletingCombatId, setDeletingCombatId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  if (!isOpen) return null;

  // Filtra "Combate Vazio": ele é apenas um modo de visualização sem combate, não deve aparecer no CRUD
  const validCombats = combats.filter(
    (c) => c.id !== 'combat-vazio' && !c.name?.toLowerCase().includes('vazio') && c.name?.toLowerCase().trim() !== 'sem combate'
  );

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

  const handleDownloadBackup = () => {
    const backupKeys = [
      'gurps_combat_master_data_v2',
      'gurps_fixed_personagens_v1',
      'gurps_combat_master_conditions_v2',
      'gurps_combat_master_users_v2',
      'gurps_combat_master_active_combat_id_v1',
      'gurps_combat_master_deleted_v1',
      'gurps_combat_master_editors_v1',
      'hounds_active_user',
      'hounds_mesa_backup_v1',
      'hounds_theme'
    ];
    const payload: Record<string, any> = {
      app: 'Hounds GURPS',
      exportedAt: new Date().toISOString(),
      localStorage: {},
    };
    backupKeys.forEach((k) => {
      try {
        const item = localStorage.getItem(k);
        if (item !== null) payload.localStorage[k] = JSON.parse(item);
      } catch {
        payload.localStorage[k] = localStorage.getItem(k);
      }
    });
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hounds-backup-completo-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUploadBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const backup = JSON.parse(ev.target?.result as string);
        if (backup && backup.localStorage) {
          Object.keys(backup.localStorage).forEach((k) => {
            const val = backup.localStorage[k];
            localStorage.setItem(k, typeof val === 'string' ? val : JSON.stringify(val));
          });
          alert('Backup restaurado com sucesso! A página será recarregada.');
          window.location.reload();
        } else if (backup && (backup.combats || backup.gurps_combat_master_data_v2)) {
          if (backup.gurps_combat_master_data_v2) localStorage.setItem('gurps_combat_master_data_v2', JSON.stringify(backup.gurps_combat_master_data_v2));
          else if (backup.combats) localStorage.setItem('gurps_combat_master_data_v2', JSON.stringify(backup.combats));
          if (backup.players || backup.gurps_fixed_personagens_v1) localStorage.setItem('gurps_fixed_personagens_v1', JSON.stringify(backup.players || backup.gurps_fixed_personagens_v1));
          alert('Backup restaurado com sucesso! A página será recarregada.');
          window.location.reload();
        } else {
          throw new Error('Formato de backup inválido.');
        }
      } catch (err: any) {
        alert('Erro ao restaurar backup: ' + (err?.message || 'Arquivo corrompido'));
      }
    };
    reader.readAsText(file);
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
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors ml-auto shadow-sm active:scale-95"
            >
              <Plus size={14} />
              <span>Criar</span>
            </button>
          </div>
        </form>

        {/* Existing Combats List */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Combates Cadastrados ({validCombats.length})
          </div>
          {validCombats.map((c) => {
            const isCurrentlySelected = c.id === activeCombatId;
            const isEditing = editingCombatId === c.id;
            const isDeleting = deletingCombatId === c.id;
            const isInactive = c.isActive === false;

            return (
              <div
                key={c.id}
                className={`p-3 rounded-xl border transition-all ${
                  isCurrentlySelected
                    ? 'bg-slate-850 border-amber-500/60 ring-1 ring-amber-500/40 shadow-sm'
                    : isInactive
                    ? 'bg-slate-950/40 border-slate-800/80 opacity-75 hover:opacity-100'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                {isDeleting ? (
                  /* Confirmação segura de exclusão inline: nunca fecha sozinho */
                  <div className="flex items-center justify-between gap-3 p-1">
                    <div className="text-xs text-rose-300 font-medium">
                      Excluir <strong>"{c.name}"</strong> de vez? Esta ação não pode ser desfeita.
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setDeletingCombatId(null)}
                        className="px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg font-medium"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteCombat(c.id);
                          setDeletingCombatId(null);
                        }}
                        className="px-3 py-1 text-xs text-white bg-rose-600 hover:bg-rose-500 font-bold rounded-lg shadow-sm"
                      >
                        Confirmar Exclusão
                      </button>
                    </div>
                  </div>
                ) : isEditing ? (
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
                        type="button"
                        onClick={() => setEditingCombatId(null)}
                        className="px-2 py-1 text-xs text-slate-400 hover:text-white"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold truncate ${isInactive ? 'text-slate-400 line-through' : 'text-white'}`}>
                          {c.name}
                        </span>
                        {isCurrentlySelected && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-medium">
                            Na Mesa
                          </span>
                        )}
                        {isInactive ? (
                          <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded font-medium">
                            Inativo
                          </span>
                        ) : (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded font-medium">
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
                        <span>{c.npcs?.length || 0} NPCs</span>
                        <span>·</span>
                        <span>{c.createdAt}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Botão Selecionar para Mesa (apenas se combate estiver ativo) */}
                      {!isCurrentlySelected && !isInactive && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectCombat(c.id);
                            onClose();
                          }}
                          className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg border border-slate-700"
                        >
                          Selecionar
                        </button>
                      )}

                      {/* Botão Ativar / Inativar Combate */}
                      {onToggleCombatActive && (
                        <button
                          type="button"
                          onClick={() => onToggleCombatActive(c.id)}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            isInactive
                              ? 'text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 border-emerald-800/50'
                              : 'text-slate-400 hover:text-slate-200 bg-slate-800 border-slate-700'
                          }`}
                          title={isInactive ? 'Ativar combate (exibir na barra principal)' : 'Inativar combate (ocultar da barra principal)'}
                        >
                          {isInactive ? <Eye size={13} /> : <EyeOff size={13} />}<span className="text-[11px]">{isInactive ? 'Ativar' : 'Inativar'}</span>
                        </button>
                      )}

                      {/* Editar Nome e Descrição */}
                      <button
                        type="button"
                        onClick={() => startEdit(c)}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg border border-slate-800"
                        title="Renomear ou editar descrição"
                      >
                        <Edit2 size={13} />
                      </button>

                      {/* Excluir Combate (com confirmação inline segura) */}
                      {validCombats.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setDeletingCombatId(c.id)}
                          className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg border border-rose-900/30"
                          title="Excluir combate"
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

        {/* Seção de Backup e Restauração Completa da Mesa */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-slate-400">
            <span className="font-bold text-amber-300">Backup & Segurança:</span> Baixe o estado atual da Mesa em arquivo ou restaure.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-colors shadow-sm"
              title="Baixar arquivo JSON completo com todos os combates, personagens e configurações"
            >
              <Download size={14} />
              <span>Baixar Backup (.json)</span>
            </button>
            <label
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer shadow-sm"
              title="Restaurar a Mesa a partir de um arquivo de backup (.json)"
            >
              <Upload size={14} />
              <span>Restaurar Backup</span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleUploadBackup}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
