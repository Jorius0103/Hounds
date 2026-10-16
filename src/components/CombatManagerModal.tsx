import React, { useState, useEffect } from 'react';
import { Combat } from '../types/rpg';
import {
  Swords,
  Plus,
  Trash2,
  Edit2,
  X,
  Eye,
  EyeOff,
  Download,
  Upload,
  RotateCcw,
  Clock,
  Archive,
  Check,
  FileJson,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

export interface CombatBackupSnapshot {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  formattedDate: string;
  summary: {
    totalCombats: number;
    totalNpcs: number;
    totalPlayers: number;
    activeCombatName: string;
  };
  data: {
    combats: Combat[];
    players?: any[];
    conditions?: any[];
    activeCombatId?: string | null;
    deletedCombatIds?: string[];
    editors?: string[];
    [key: string]: any;
  };
}

const SNAPSHOTS_STORAGE_KEY = 'hounds_mesa_snapshots_v1';

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
  // Tabs: 'combats' ou 'backups'
  const [activeTab, setActiveTab] = useState<'combats' | 'backups'>('combats');

  // Estado do gerenciamento de combates
  const [newCombatName, setNewCombatName] = useState('');
  const [newCombatDesc, setNewCombatDesc] = useState('');
  const [editingCombatId, setEditingCombatId] = useState<string | null>(null);
  const [deletingCombatId, setDeletingCombatId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Estado do CRUD de backups / retratos
  const [snapshots, setSnapshots] = useState<CombatBackupSnapshot[]>([]);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [newSnapshotName, setNewSnapshotName] = useState('');
  const [newSnapshotDesc, setNewSnapshotDesc] = useState('');
  const [editingSnapshotId, setEditingSnapshotId] = useState<string | null>(null);
  const [editSnapshotName, setEditSnapshotName] = useState('');
  const [editSnapshotDesc, setEditSnapshotDesc] = useState('');
  const [deletingSnapshotId, setDeletingSnapshotId] = useState<string | null>(null);
  const [restoringSnapshotId, setRestoringSnapshotId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Carregar snapshots do localStorage ao abrir
  useEffect(() => {
    if (isOpen) {
      try {
        const raw = localStorage.getItem(SNAPSHOTS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setSnapshots(parsed);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar snapshots do localStorage:', err);
      }
    }
  }, [isOpen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const saveSnapshotsToStorage = (updated: CombatBackupSnapshot[]) => {
    setSnapshots(updated);
    try {
      localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Erro ao salvar snapshots no localStorage:', err);
    }
  };

  if (!isOpen) return null;

  // Filtra "Combate Vazio": ele é apenas um modo de visualização sem combate, não deve aparecer no CRUD
  const validCombats = combats.filter(
    (c) =>
      c.id !== 'combat-vazio' &&
      !c.name?.toLowerCase().includes('vazio') &&
      c.name?.toLowerCase().trim() !== 'sem combate'
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

  // Coleta todo o estado atual da mesa para o snapshot
  const captureCurrentMesaData = () => {
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
      'hounds_theme',
    ];

    const rawStorage: Record<string, any> = {};
    backupKeys.forEach((k) => {
      try {
        const item = localStorage.getItem(k);
        if (item !== null) rawStorage[k] = JSON.parse(item);
      } catch {
        rawStorage[k] = localStorage.getItem(k);
      }
    });

    const storedCombats = rawStorage['gurps_combat_master_data_v2'] || combats;
    const storedPlayers = rawStorage['gurps_fixed_personagens_v1'] || [];
    const storedConditions = rawStorage['gurps_combat_master_conditions_v2'] || [];
    const storedActiveId = rawStorage['gurps_combat_master_active_combat_id_v1'] || activeCombatId;

    let totalNpcs = 0;
    if (Array.isArray(storedCombats)) {
      storedCombats.forEach((c: any) => {
        if (Array.isArray(c.npcs)) totalNpcs += c.npcs.length;
      });
    }

    const activeCombatObj = Array.isArray(storedCombats)
      ? storedCombats.find((c: any) => c.id === storedActiveId)
      : null;

    return {
      combats: storedCombats,
      players: storedPlayers,
      conditions: storedConditions,
      activeCombatId: storedActiveId,
      deletedCombatIds: rawStorage['gurps_combat_master_deleted_v1'] || [],
      editors: rawStorage['gurps_combat_master_editors_v1'] || [],
      rawStorage,
      summary: {
        totalCombats: Array.isArray(storedCombats)
          ? storedCombats.filter(
              (c: any) =>
                c.id !== 'combat-vazio' &&
                !c.name?.toLowerCase().includes('vazio') &&
                c.name?.toLowerCase().trim() !== 'sem combate'
            ).length
          : 0,
        totalNpcs,
        totalPlayers: Array.isArray(storedPlayers) ? storedPlayers.length : 0,
        activeCombatName: activeCombatObj?.name || 'Sem combate',
      },
    };
  };

  const handleStartCreateSnapshot = () => {
    const now = new Date();
    const formatted = now.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    setNewSnapshotName(`Retrato - ${formatted}`);
    setNewSnapshotDesc('');
    setIsCreatingSnapshot(true);
  };

  const handleConfirmCreateSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date();
    const current = captureCurrentMesaData();

    const snapshot: CombatBackupSnapshot = {
      id: `snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: newSnapshotName.trim() || `Retrato - ${now.toLocaleDateString('pt-BR')}`,
      description: newSnapshotDesc.trim() || undefined,
      createdAt: now.toISOString(),
      formattedDate: now.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      summary: current.summary,
      data: {
        combats: current.combats,
        players: current.players,
        conditions: current.conditions,
        activeCombatId: current.activeCombatId,
        deletedCombatIds: current.deletedCombatIds,
        editors: current.editors,
        rawStorage: current.rawStorage,
      },
    };

    const updated = [snapshot, ...snapshots];
    saveSnapshotsToStorage(updated);
    setIsCreatingSnapshot(false);
    setNewSnapshotName('');
    setNewSnapshotDesc('');
    showToast(`Retrato "${snapshot.name}" salvo com sucesso!`);
  };

  const handleStartEditSnapshot = (snap: CombatBackupSnapshot) => {
    setEditingSnapshotId(snap.id);
    setEditSnapshotName(snap.name);
    setEditSnapshotDesc(snap.description || '');
  };

  const handleSaveEditSnapshot = (id: string) => {
    if (!editSnapshotName.trim()) return;
    const updated = snapshots.map((s) =>
      s.id === id
        ? {
            ...s,
            name: editSnapshotName.trim(),
            description: editSnapshotDesc.trim() || undefined,
          }
        : s
    );
    saveSnapshotsToStorage(updated);
    setEditingSnapshotId(null);
    showToast('Backup atualizado com sucesso!');
  };

  const handleDeleteSnapshot = (id: string) => {
    const updated = snapshots.filter((s) => s.id !== id);
    saveSnapshotsToStorage(updated);
    setDeletingSnapshotId(null);
    showToast('Backup excluído.');
  };

  const handleRestoreSnapshot = (snap: CombatBackupSnapshot) => {
    try {
      // 1. Salva um backup preventivo automático antes de sobrescrever
      const current = captureCurrentMesaData();
      try {
        localStorage.setItem(
          'hounds_mesa_safety_restore_backup',
          JSON.stringify({
            savedAt: new Date().toISOString(),
            reason: `Backup automático antes de restaurar "${snap.name}"`,
            data: current,
          })
        );
      } catch (e) {
        console.warn('Não foi possível gravar backup de segurança:', e);
      }

      // 2. Restaura no localStorage
      if (snap.data.rawStorage && typeof snap.data.rawStorage === 'object') {
        Object.keys(snap.data.rawStorage).forEach((k) => {
          const val = snap.data.rawStorage[k];
          if (val !== undefined && val !== null) {
            localStorage.setItem(k, typeof val === 'string' ? val : JSON.stringify(val));
          }
        });
      } else {
        if (snap.data.combats) {
          localStorage.setItem('gurps_combat_master_data_v2', JSON.stringify(snap.data.combats));
        }
        if (snap.data.players) {
          localStorage.setItem('gurps_fixed_personagens_v1', JSON.stringify(snap.data.players));
        }
        if (snap.data.conditions) {
          localStorage.setItem('gurps_combat_master_conditions_v2', JSON.stringify(snap.data.conditions));
        }
        if (snap.data.activeCombatId) {
          localStorage.setItem('gurps_combat_master_active_combat_id_v1', JSON.stringify(snap.data.activeCombatId));
        }
        if (snap.data.deletedCombatIds) {
          localStorage.setItem('gurps_combat_master_deleted_v1', JSON.stringify(snap.data.deletedCombatIds));
        }
        if (snap.data.editors) {
          localStorage.setItem('gurps_combat_master_editors_v1', JSON.stringify(snap.data.editors));
        }
      }

      alert(`Backup "${snap.name}" restaurado com sucesso! A Mesa de Combate será recarregada agora.`);
      window.location.reload();
    } catch (err: any) {
      alert('Erro ao restaurar o backup: ' + (err?.message || 'Falha desconhecida'));
    }
  };

  const handleExportSnapshot = (snap: CombatBackupSnapshot) => {
    const payload = {
      app: 'Hounds GURPS',
      snapshotId: snap.id,
      snapshotName: snap.name,
      exportedAt: new Date().toISOString(),
      summary: snap.summary,
      snapshot: snap,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const sanitizedName = snap.name.toLowerCase().replace(/[^a-z0-9]/gi, '-').slice(0, 30);
    a.download = `hounds-backup-${sanitizedName}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        const now = new Date();

        // Caso 1: O arquivo é um Snapshot exportado diretamente
        if (parsed && parsed.snapshot && parsed.snapshot.data) {
          const importedSnap: CombatBackupSnapshot = {
            ...parsed.snapshot,
            id: `snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: `${parsed.snapshot.name || 'Importado'} (Importado)`,
            formattedDate: now.toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
          };
          saveSnapshotsToStorage([importedSnap, ...snapshots]);
          showToast(`Backup importado para a lista com sucesso!`);
          return;
        }

        // Caso 2: O arquivo é um backup de localStorage completo
        if (parsed && parsed.localStorage) {
          const st = parsed.localStorage;
          const combatsList = st['gurps_combat_master_data_v2'] || [];
          const playersList = st['gurps_fixed_personagens_v1'] || [];
          let totalNpcs = 0;
          if (Array.isArray(combatsList)) {
            combatsList.forEach((c: any) => {
              if (Array.isArray(c.npcs)) totalNpcs += c.npcs.length;
            });
          }

          const importedSnap: CombatBackupSnapshot = {
            id: `snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: `Backup Importado - ${now.toLocaleDateString('pt-BR')}`,
            description: `Arquivo importado em ${now.toLocaleTimeString('pt-BR')}`,
            createdAt: now.toISOString(),
            formattedDate: now.toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            summary: {
              totalCombats: Array.isArray(combatsList) ? combatsList.length : 0,
              totalNpcs,
              totalPlayers: Array.isArray(playersList) ? playersList.length : 0,
              activeCombatName: 'Importado',
            },
            data: {
              combats: combatsList,
              players: playersList,
              conditions: st['gurps_combat_master_conditions_v2'] || [],
              activeCombatId: st['gurps_combat_master_active_combat_id_v1'] || null,
              deletedCombatIds: st['gurps_combat_master_deleted_v1'] || [],
              editors: st['gurps_combat_master_editors_v1'] || [],
              rawStorage: st,
            },
          };
          saveSnapshotsToStorage([importedSnap, ...snapshots]);
          showToast('Arquivo adicionado à lista de backups com sucesso!');
          return;
        }

        // Caso 3: Backup direto de combates ou array
        if (parsed && (parsed.combats || parsed.gurps_combat_master_data_v2)) {
          const combatsList = parsed.combats || parsed.gurps_combat_master_data_v2 || [];
          const playersList = parsed.players || parsed.gurps_fixed_personagens_v1 || [];
          let totalNpcs = 0;
          if (Array.isArray(combatsList)) {
            combatsList.forEach((c: any) => {
              if (Array.isArray(c.npcs)) totalNpcs += c.npcs.length;
            });
          }

          const importedSnap: CombatBackupSnapshot = {
            id: `snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: `Combates Importados - ${now.toLocaleDateString('pt-BR')}`,
            description: `Importado de arquivo JSON`,
            createdAt: now.toISOString(),
            formattedDate: now.toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            summary: {
              totalCombats: Array.isArray(combatsList) ? combatsList.length : 0,
              totalNpcs,
              totalPlayers: Array.isArray(playersList) ? playersList.length : 0,
              activeCombatName: 'Importado',
            },
            data: {
              combats: combatsList,
              players: playersList,
            },
          };
          saveSnapshotsToStorage([importedSnap, ...snapshots]);
          showToast('Backup adicionado à lista de snapshots!');
          return;
        }

        throw new Error('Formato de arquivo de backup não reconhecido.');
      } catch (err: any) {
        alert('Erro ao importar arquivo: ' + (err?.message || 'Arquivo corrompido'));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-750 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              {activeTab === 'combats' ? <Swords size={18} /> : <Archive size={18} />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Configurações da Mesa de Combate</h3>
              <p className="text-[11px] text-slate-400">
                Gerencie combates ativos ou salve retratos completos para restauração
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Notificação Toast */}
        {toastMessage && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs px-3.5 py-2 rounded-xl flex items-center gap-2 shadow-sm animate-fade-in shrink-0">
            <Check size={14} className="text-amber-400 shrink-0" />
            <span className="font-medium">{toastMessage}</span>
          </div>
        )}

        {/* Navegação entre Abas */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('combats')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'combats'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Swords size={14} />
            <span>Combates da Campanha</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'combats' ? 'bg-slate-950 text-amber-300' : 'bg-slate-700 text-slate-300'
              }`}
            >
              {validCombats.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backups')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'backups'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Archive size={14} />
            <span>Retratos & Backups da Mesa</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'backups' ? 'bg-slate-950 text-amber-300' : 'bg-slate-700 text-slate-300'
              }`}
            >
              {snapshots.length}
            </span>
          </button>
        </div>

        {/* CONTEÚDO DA ABA 1: COMBATES DA CAMPANHA */}
        {activeTab === 'combats' && (
          <div className="space-y-4 overflow-y-auto pr-1 flex-1">
            {/* Create New Combat Form */}
            <form
              onSubmit={handleCreate}
              className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-2.5"
            >
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
                  <span>Criar Combate</span>
                </button>
              </div>
            </form>

            {/* Existing Combats List */}
            <div className="space-y-2">
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
                            <span
                              className={`text-xs font-bold truncate ${
                                isInactive ? 'text-slate-400 line-through' : 'text-white'
                              }`}
                            >
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

                          {onToggleCombatActive && (
                            <button
                              type="button"
                              onClick={() => onToggleCombatActive(c.id)}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                isInactive
                                  ? 'text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 border-emerald-800/50'
                                  : 'text-slate-400 hover:text-slate-200 bg-slate-800 border-slate-700'
                              }`}
                              title={
                                isInactive
                                  ? 'Ativar combate (exibir na barra principal)'
                                  : 'Inativar combate (ocultar da barra principal)'
                              }
                            >
                              {isInactive ? <Eye size={13} /> : <EyeOff size={13} />}
                              <span className="text-[11px] ml-1">{isInactive ? 'Ativar' : 'Inativar'}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => startEdit(c)}
                            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg border border-slate-800"
                            title="Renomear ou editar descrição"
                          >
                            <Edit2 size={13} />
                          </button>

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
          </div>
        )}

        {/* CONTEÚDO DA ABA 2: CRUD DE RETRATOS & BACKUPS DA MESA */}
        {activeTab === 'backups' && (
          <div className="space-y-4 overflow-y-auto pr-1 flex-1">
            {/* Barra de Ações: Criar novo backup ou importar arquivo */}
            <div className="flex items-center justify-between gap-2 flex-wrap bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck size={15} className="text-amber-400" />
                  <span>Retratos em Tempo Real</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Salve um retrato fiel de todos os combates, NPCs, personagens e rodadas atuais.
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleStartCreateSnapshot}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-all shadow-sm active:scale-95"
                  title="Capturar o estado exato da Mesa agora"
                >
                  <Plus size={14} />
                  <span>Novo Retrato da Mesa</span>
                </button>

                <label
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer shadow-sm"
                  title="Importar um arquivo JSON de backup para a lista"
                >
                  <Upload size={14} />
                  <span>Importar Arquivo (.json)</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImportFile}
                  />
                </label>
              </div>
            </div>

            {/* Formulário Inline: Criar Retrato */}
            {isCreatingSnapshot && (
              <form
                onSubmit={handleConfirmCreateSnapshot}
                className="bg-slate-950 p-4 rounded-xl border border-amber-500/40 shadow-lg space-y-3 animate-fade-in"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Archive size={14} />
                    <span>Salvar Retrato Atual da Mesa</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCreatingSnapshot(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 font-medium mb-1">
                      Nome do Backup / Retrato:
                    </label>
                    <input
                      type="text"
                      value={newSnapshotName}
                      onChange={(e) => setNewSnapshotName(e.target.value)}
                      placeholder="Ex: Antes da batalha na floresta"
                      className="w-full bg-slate-900 border border-slate-750 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 font-medium mb-1">
                      Notas / Descrição (opcional):
                    </label>
                    <input
                      type="text"
                      value={newSnapshotDesc}
                      onChange={(e) => setNewSnapshotDesc(e.target.value)}
                      placeholder="Ex: Rodada 2, boss ferido, jogador X sob efeito de magia"
                      className="w-full bg-slate-900 border border-slate-750 rounded-lg px-3 py-1.5 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCreatingSnapshot(false)}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-sm"
                  >
                    <Check size={14} />
                    <span>Salvar Retrato</span>
                  </button>
                </div>
              </form>
            )}

            {/* Lista de Retratos Salvos (CRUD) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <span>Versões Salvas ({snapshots.length})</span>
                <span className="text-[10px] text-slate-500 normal-case">
                  Clique em "Restaurar" para voltar ao estado exato do retrato
                </span>
              </div>

              {snapshots.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/40 border border-slate-800/80 rounded-xl space-y-2">
                  <Archive size={32} className="mx-auto text-slate-600" />
                  <div className="text-xs font-bold text-slate-300">Nenhum retrato salvo ainda</div>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Faça backups preventivos clicando em <strong>"Novo Retrato da Mesa"</strong>. Você poderá
                    restaurar qualquer versão a qualquer momento.
                  </p>
                </div>
              ) : (
                snapshots.map((snap) => {
                  const isEditing = editingSnapshotId === snap.id;
                  const isDeleting = deletingSnapshotId === snap.id;
                  const isRestoring = restoringSnapshotId === snap.id;

                  return (
                    <div
                      key={snap.id}
                      className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-slate-700 transition-all space-y-2"
                    >
                      {/* Estado: Confirmação de Restauração */}
                      {isRestoring ? (
                        <div className="p-2 bg-emerald-950/40 border border-emerald-700/50 rounded-lg space-y-2">
                          <div className="flex items-center gap-2 text-xs text-emerald-300 font-bold">
                            <AlertTriangle size={15} className="text-emerald-400 shrink-0" />
                            <span>Deseja restaurar o retrato "{snap.name}"?</span>
                          </div>
                          <p className="text-[11px] text-slate-300 leading-relaxed">
                            O estado atual da Mesa será substituído por este snapshot de{' '}
                            <strong>{snap.formattedDate}</strong> ({snap.summary?.totalCombats || 0} combates,{' '}
                            {snap.summary?.totalNpcs || 0} NPCs). Um backup automático do estado atual será
                            guardado antes de aplicar.
                          </p>
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setRestoringSnapshotId(null)}
                              className="px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 rounded-lg font-medium"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleRestoreSnapshot(snap);
                                setRestoringSnapshotId(null);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1 text-xs text-slate-950 bg-emerald-400 hover:bg-emerald-300 font-bold rounded-lg shadow-sm"
                            >
                              <RotateCcw size={13} />
                              <span>Confirmar e Restaurar Mesa</span>
                            </button>
                          </div>
                        </div>
                      ) : isDeleting ? (
                        /* Estado: Confirmação de Exclusão */
                        <div className="flex items-center justify-between gap-3 p-1">
                          <div className="text-xs text-rose-300 font-medium">
                            Excluir o backup <strong>"{snap.name}"</strong>?
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setDeletingSnapshotId(null)}
                              className="px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 rounded-lg font-medium"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSnapshot(snap.id)}
                              className="px-3 py-1 text-xs text-white bg-rose-600 hover:bg-rose-500 font-bold rounded-lg shadow-sm"
                            >
                              Confirmar Exclusão
                            </button>
                          </div>
                        </div>
                      ) : isEditing ? (
                        /* Estado: Editando Nome e Descrição */
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editSnapshotName}
                            onChange={(e) => setEditSnapshotName(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-750 rounded px-2.5 py-1 text-xs text-white"
                            placeholder="Nome do Retrato"
                          />
                          <input
                            type="text"
                            value={editSnapshotDesc}
                            onChange={(e) => setEditSnapshotDesc(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-750 rounded px-2.5 py-1 text-xs text-slate-300"
                            placeholder="Descrição / Notas"
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingSnapshotId(null)}
                              className="px-2 py-1 text-xs text-slate-400 hover:text-white"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditSnapshot(snap.id)}
                              className="px-2.5 py-1 text-xs bg-amber-500 text-slate-950 font-bold rounded"
                            >
                              Salvar
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Exibição normal do Card de Backup */
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-white">{snap.name}</span>
                              <span className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                                <Clock size={11} className="text-slate-500" />
                                {snap.formattedDate}
                              </span>
                            </div>

                            {snap.description && (
                              <p className="text-[11px] text-slate-300 line-clamp-2">
                                {snap.description}
                              </p>
                            )}

                            {/* Resumo do Retrato */}
                            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 flex-wrap pt-0.5">
                              <span className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-amber-300">
                                {snap.summary?.totalCombats || 0} combates
                              </span>
                              <span className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                                {snap.summary?.totalNpcs || 0} NPCs
                              </span>
                              <span className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                                {snap.summary?.totalPlayers || 0} personagens
                              </span>
                              {snap.summary?.activeCombatName && (
                                <span className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-emerald-400">
                                  Ativo: {snap.summary.activeCombatName}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Botões de Ação do Backup */}
                          <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                            {/* Botão Restaurar */}
                            <button
                              type="button"
                              onClick={() => setRestoringSnapshotId(snap.id)}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 hover:text-emerald-200 border border-emerald-700/60 rounded-lg transition-colors shadow-sm"
                              title="Restaurar este retrato na Mesa de Combate"
                            >
                              <RotateCcw size={13} />
                              <span>Restaurar</span>
                            </button>

                            {/* Botão Baixar Arquivo */}
                            <button
                              type="button"
                              onClick={() => handleExportSnapshot(snap)}
                              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg border border-slate-800"
                              title="Baixar snapshot em arquivo JSON"
                            >
                              <Download size={13} />
                            </button>

                            {/* Botão Editar Nome */}
                            <button
                              type="button"
                              onClick={() => handleStartEditSnapshot(snap)}
                              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg border border-slate-800"
                              title="Editar nome ou notas deste backup"
                            >
                              <Edit2 size={13} />
                            </button>

                            {/* Botão Excluir */}
                            <button
                              type="button"
                              onClick={() => setDeletingSnapshotId(snap.id)}
                              className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg border border-rose-900/30"
                              title="Excluir este backup"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
