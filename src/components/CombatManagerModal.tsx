import React, { useState, useEffect, useRef } from 'react';
import {
  Swords,
  Archive,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Upload,
  Download,
  RotateCcw,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react';

export interface CombatSnapshotSummary {
  totalCombats: number;
  totalNpcs: number;
  totalPlayers: number;
  activeCombatName?: string;
}

export interface CombatSnapshot {
  id: string;
  name: string;
  createdAt: number;
  formattedDate: string;
  description?: string;
  summary?: CombatSnapshotSummary;
  data: {
    combats: any[];
    activeCombatId: string | null;
    players?: any[];
  };
}

export interface CombatManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  combats: any[];
  activeCombatId: string | null;
  onSelectCombat: (id: string) => void;
  onCreateCombat: (name: string, description?: string) => void;
  onDeleteCombat: (id: string) => void;
  onRenameCombat: (id: string, newName: string, newDescription?: string) => void;
  onToggleCombatActive?: (id: string) => void;
  onRestoreFullSnapshot?: (data: { combats: any[]; activeCombatId: string | null; players?: any[] }) => void;
  players?: any[];
}

const STORAGE_KEY = 'hounds_combat_snapshots_v1';
const REPO_DATA_PATH = 'dados/retratos-mesa.json';

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
  onRestoreFullSnapshot,
  players = [],
}) => {
  const [activeTab, setActiveTab] = useState<'combats' | 'backups'>('combats');

  // Aba 1: Estados de criação e edição de combates
  const [newCombatName, setNewCombatName] = useState('');
  const [newCombatDesc, setNewCombatDesc] = useState('');
  const [editingCombatId, setEditingCombatId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [deletingCombatId, setDeletingCombatId] = useState<string | null>(null);

  // Aba 2: Estados de Snapshots
  const [snapshots, setSnapshots] = useState<CombatSnapshot[]>([]);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [newSnapshotName, setNewSnapshotName] = useState('');
  const [newSnapshotDesc, setNewSnapshotDesc] = useState('');
  const [restoringSnapshotId, setRestoringSnapshotId] = useState<string | null>(null);
  const [deletingSnapshotId, setDeletingSnapshotId] = useState<string | null>(null);
  const [editingSnapshotId, setEditingSnapshotId] = useState<string | null>(null);
  const [editSnapshotName, setEditSnapshotName] = useState('');
  const [editSnapshotDesc, setEditSnapshotDesc] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Feedback Toast temporário
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Carregar snapshots do localStorage ou do repo ao abrir
  useEffect(() => {
    if (!isOpen) return;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSnapshots(parsed);
          return;
        }
      }
    } catch (e) {
      console.warn('Erro ao ler snapshots do localStorage:', e);
    }

    fetch(REPO_DATA_PATH)
      .then((res) => {
        if (!res.ok) throw new Error('Não foi possível carregar retratos padrão do repositório');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setSnapshots(data);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          } catch (e) {
            console.warn('Erro ao salvar no localStorage:', e);
          }
        }
      })
      .catch(() => {});
  }, [isOpen]);

  // Salvar snapshots no localStorage
  const persistSnapshots = (updated: CombatSnapshot[]) => {
    setSnapshots(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Erro ao salvar snapshots no localStorage:', e);
    }
  };

  // Fechar com ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const validCombats = Array.isArray(combats)
    ? combats.filter(
        (c) =>
          c &&
          c.id !== 'combat-vazio' &&
          !c.name?.toLowerCase().includes('vazio') &&
          c.name?.toLowerCase().trim() !== 'sem combate'
      )
    : [];

  // Handlers da Aba 1: Combates
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCombatName.trim()) return;
    onCreateCombat(newCombatName.trim(), newCombatDesc.trim() || undefined);
    setNewCombatName('');
    setNewCombatDesc('');
    showToast('Novo combate criado com sucesso!');
  };

  const startEdit = (c: any) => {
    setEditingCombatId(c.id);
    setEditName(c.name || '');
    setEditDesc(c.description || '');
  };

  const saveEdit = (id: string) => {
    if (!editName.trim()) return;
    onRenameCombat(id, editName.trim(), editDesc.trim() || undefined);
    setEditingCombatId(null);
    showToast('Combate renomeado com sucesso!');
  };

  // Handlers da Aba 2: Snapshots
  const handleStartCreateSnapshot = () => {
    const activeCombat = validCombats.find((c) => c.id === activeCombatId);
    const defaultName = activeCombat
      ? `Retrato: ${activeCombat.name}`
      : `Retrato da Mesa - ${new Date().toLocaleDateString('pt-BR')}`;
    setNewSnapshotName(defaultName);
    setNewSnapshotDesc('');
    setIsCreatingSnapshot(true);
  };

  const handleConfirmCreateSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSnapshotName.trim()) return;

    let totalNpcs = 0;
    validCombats.forEach((c) => {
      if (Array.isArray(c.npcs)) totalNpcs += c.npcs.length;
      else if (typeof c.totalNpcs === 'number') totalNpcs += c.totalNpcs;
    });

    const activeCombat = validCombats.find((c) => c.id === activeCombatId);

    const now = Date.now();
    const newSnapshot: CombatSnapshot = {
      id: `snap-${now}-${Math.random().toString(36).slice(2, 7)}`,
      name: newSnapshotName.trim(),
      createdAt: now,
      formattedDate: new Date(now).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      description: newSnapshotDesc.trim() || undefined,
      summary: {
        totalCombats: validCombats.length,
        totalNpcs,
        totalPlayers: Array.isArray(players) ? players.length : 0,
        activeCombatName: activeCombat ? activeCombat.name : undefined,
      },
      data: {
        combats: JSON.parse(JSON.stringify(validCombats)),
        activeCombatId,
        players: JSON.parse(JSON.stringify(players || [])),
      },
    };

    const updated = [newSnapshot, ...snapshots];
    persistSnapshots(updated);
    setIsCreatingSnapshot(false);
    setNewSnapshotName('');
    setNewSnapshotDesc('');
    showToast('Retrato da mesa salvo com sucesso!');
  };

  const handleDeleteSnapshot = (id: string) => {
    const updated = snapshots.filter((s) => s.id !== id);
    persistSnapshots(updated);
    setDeletingSnapshotId(null);
    showToast('Retrato excluído.');
  };

  const handleStartEditSnapshot = (snap: CombatSnapshot) => {
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
    persistSnapshots(updated);
    setEditingSnapshotId(null);
    showToast('Retrato atualizado!');
  };

  const handleRestoreSnapshot = (snap: CombatSnapshot) => {
    if (!onRestoreFullSnapshot) {
      alert('Restauração não implementada no callback da mesa.');
      return;
    }

    try {
      const totalNpcs = validCombats.reduce((acc, c) => acc + (c.npcs?.length || 0), 0);
      const autoBackup: CombatSnapshot = {
        id: `snap-auto-${Date.now()}`,
        name: `Backup Automático (Pré-restauração de "${snap.name}")`,
        createdAt: Date.now(),
        formattedDate: new Date().toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        description: 'Criado automaticamente antes de restaurar um retrato antigo.',
        summary: {
          totalCombats: validCombats.length,
          totalNpcs,
          totalPlayers: players.length,
          activeCombatName: validCombats.find((c) => c.id === activeCombatId)?.name,
        },
        data: {
          combats: JSON.parse(JSON.stringify(validCombats)),
          activeCombatId,
          players: JSON.parse(JSON.stringify(players || [])),
        },
      };
      persistSnapshots([autoBackup, ...snapshots]);
    } catch (e) {
      console.warn('Erro ao criar backup automático:', e);
    }

    onRestoreFullSnapshot(snap.data);
    setRestoringSnapshotId(null);
    showToast(`Retrato "${snap.name}" restaurado com sucesso na Mesa!`);
  };

  const handleExportSnapshot = (snap: CombatSnapshot) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(snap, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    const safeName = snap.name.toLowerCase().replace(/[^a-z0-9]/gi, '_');
    dlAnchorElem.setAttribute('download', `retrato_mesa_${safeName}.json`);
    dlAnchorElem.click();
  };

  const handleExportAllForRepo = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(snapshots, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', 'retratos-mesa.json');
    dlAnchorElem.click();
    showToast('Arquivo retratos-mesa.json pronto para ser salvo na pasta dados/');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (!file) return;

    fileReader.readAsText(file, 'UTF-8');
    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);

        if (Array.isArray(parsed)) {
          const valid = parsed.filter((item) => item && item.id && item.data && item.data.combats);
          if (valid.length === 0) throw new Error('Arquivo JSON não contém retratos válidos.');
          persistSnapshots([...valid, ...snapshots]);
          showToast(`${valid.length} retratos importados com sucesso!`);
        } else if (parsed && parsed.id && parsed.data && parsed.data.combats) {
          persistSnapshots([parsed, ...snapshots]);
          showToast(`Retrato "${parsed.name}" importado com sucesso!`);
        } else {
          throw new Error('Formato de arquivo incompatível.');
        }
      } catch (err: any) {
        alert('Erro ao importar arquivo: ' + (err.message || 'JSON inválido'));
      }
    };
    e.target.value = '';
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
        overflowY: 'auto',
      }}
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          position: 'relative',
          margin: 'auto',
          width: '100%',
          maxWidth: '640px',
          maxHeight: '82vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#0f172a',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '18px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
          overflow: 'hidden',
        }}
      >
        {/* Cabeçalho compacto com gradiente e badge */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '7px',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fbbf24',
                flexShrink: 0,
              }}
            >
              {activeTab === 'combats' ? <Swords size={16} /> : <Archive size={16} />}
            </div>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>
              Configurações da Mesa de Combate
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            style={{
              padding: '5px',
              borderRadius: '7px',
              cursor: 'pointer',
              flexShrink: 0,
              background: 'transparent',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
            }}
            title="Fechar (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Notificação Toast */}
        {toastMessage && (
          <div
            style={{
              margin: '6px 18px 0',
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              color: '#fcd34d',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexShrink: 0,
            }}
          >
            <Check size={13} className="text-amber-400 shrink-0" />
            <span style={{ fontWeight: 500 }}>{toastMessage}</span>
          </div>
        )}

        {/* Navegação entre Abas */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 20px',
            background: 'rgba(2, 6, 23, 0.8)',
            borderBottom: '1px solid #1e293b',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('combats')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '7px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              border: '1px solid',
              transition: 'all 0.15s ease',
              background: activeTab === 'combats' ? '#f59e0b' : '#1e293b',
              color: activeTab === 'combats' ? '#020617' : '#cbd5e1',
              borderColor: activeTab === 'combats' ? '#f59e0b' : '#334155',
            }}
          >
            <Swords size={13} />
            <span>Combates da Campanha</span>
            <span
              style={{
                fontSize: '9px',
                padding: '1px 6px',
                borderRadius: '9999px',
                fontWeight: 'bold',
                background: activeTab === 'combats' ? '#020617' : '#0f172a',
                color: activeTab === 'combats' ? '#fcd34d' : '#94a3b8',
              }}
            >
              {validCombats.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backups')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '7px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              border: '1px solid',
              transition: 'all 0.15s ease',
              background: activeTab === 'backups' ? '#f59e0b' : '#1e293b',
              color: activeTab === 'backups' ? '#020617' : '#cbd5e1',
              borderColor: activeTab === 'backups' ? '#f59e0b' : '#334155',
            }}
          >
            <Archive size={13} />
            <span>Retratos & Backups da Mesa</span>
            <span
              style={{
                fontSize: '9px',
                padding: '1px 6px',
                borderRadius: '9999px',
                fontWeight: 'bold',
                background: activeTab === 'backups' ? '#020617' : '#0f172a',
                color: activeTab === 'backups' ? '#fcd34d' : '#94a3b8',
              }}
            >
              {snapshots.length}
            </span>
          </button>
        </div>

        {/* CONTEÚDO DA ABA 1: COMBATES DA CAMPANHA */}
        {activeTab === 'combats' && (
          <div
            className="custom-scrollbar"
            style={{
              flex: '1 1 auto',
              minHeight: 0,
              overflowY: 'auto',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            {/* Form: Criar Novo Combate em div organizada */}
            <form
              onSubmit={handleCreate}
              style={{
                background: 'rgba(2, 6, 23, 0.55)',
                border: '1px solid #1e293b',
                borderRadius: '10px',
                padding: '10px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                + Criar Novo Combate
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Nome do Combate (ex: Emboscada na Ponte)"
                  value={newCombatName}
                  onChange={(e) => setNewCombatName(e.target.value)}
                  style={{
                    flex: '1 1 180px',
                    height: '32px',
                    boxSizing: 'border-box',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '7px',
                    padding: '0 10px',
                    fontSize: '11px',
                    color: '#ffffff',
                    outline: 'none',
                  }}
                  required
                />
                <input
                  type="text"
                  placeholder="Descrição / Cenário (opcional)"
                  value={newCombatDesc}
                  onChange={(e) => setNewCombatDesc(e.target.value)}
                  style={{
                    flex: '1 1 180px',
                    height: '32px',
                    boxSizing: 'border-box',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '7px',
                    padding: '0 10px',
                    fontSize: '11px',
                    color: '#ffffff',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  className="hover:opacity-90 active:scale-95 transition-all"
                  style={{
                    height: '32px',
                    padding: '0 14px',
                    background: '#f59e0b',
                    color: '#020617',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    borderRadius: '7px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    flexShrink: 0,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  }}
                >
                  <Plus size={14} />
                  <span>Criar Combate</span>
                </button>
              </div>
            </form>

            {/* Lista de Combates Cadastrados em divs organizadas */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Combates Cadastrados ({validCombats.length})
              </div>
              {validCombats.length === 0 ? (
                <div
                  style={{
                    padding: '24px 16px',
                    textAlign: 'center',
                    background: 'rgba(2, 6, 23, 0.4)',
                    border: '1px dashed #334155',
                    borderRadius: '10px',
                    color: '#94a3b8',
                  }}
                >
                  <Swords size={28} style={{ margin: '0 auto 8px', color: '#64748b', opacity: 0.7 }} />
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#cbd5e1', marginBottom: '4px' }}>
                    Nenhum combate cadastrado
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', maxWidth: '380px', margin: '0 auto' }}>
                    A mesa está funcionando no modo livre para acompanhamento dos personagens. Crie um combate acima quando for iniciar um encontro com NPCs.
                  </div>
                </div>
              ) : (
                validCombats.map((c) => {
                const isCurrentlySelected = c.id === activeCombatId;
                const isEditing = editingCombatId === c.id;
                const isDeleting = deletingCombatId === c.id;
                const isInactive = c.isActive === false;

                return (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: isCurrentlySelected
                        ? 'rgba(245, 158, 11, 0.08)'
                        : isInactive
                        ? 'rgba(2, 6, 23, 0.35)'
                        : 'rgba(2, 6, 23, 0.55)',
                      border: isCurrentlySelected
                        ? '1px solid rgba(245, 158, 11, 0.5)'
                        : '1px solid #1e293b',
                      borderRadius: '10px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isDeleting ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', width: '100%' }}>
                        <div style={{ fontSize: '11px', color: '#fda4af', fontWeight: 500 }}>
                          Excluir <strong>"{c.name}"</strong> de vez? Esta ação não pode ser desfeita.
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => setDeletingCombatId(null)}
                            style={{
                              height: '26px',
                              padding: '0 10px',
                              fontSize: '11px',
                              color: '#cbd5e1',
                              background: '#1e293b',
                              border: '1px solid #334155',
                              borderRadius: '6px',
                              cursor: 'pointer',
                            }}
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteCombat(c.id);
                              setDeletingCombatId(null);
                            }}
                            style={{
                              height: '26px',
                              padding: '0 10px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              color: '#ffffff',
                              background: '#dc2626',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                            }}
                          >
                            Confirmar Exclusão
                          </button>
                        </div>
                      </div>
                    ) : isEditing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            style={{
                              flex: 1,
                              height: '28px',
                              boxSizing: 'border-box',
                              background: '#0f172a',
                              border: '1px solid rgba(245, 158, 11, 0.4)',
                              borderRadius: '6px',
                              padding: '0 8px',
                              fontSize: '11px',
                              color: '#ffffff',
                              outline: 'none',
                            }}
                          />
                          <input
                            type="text"
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            style={{
                              flex: 1,
                              height: '28px',
                              boxSizing: 'border-box',
                              background: '#0f172a',
                              border: '1px solid #334155',
                              borderRadius: '6px',
                              padding: '0 8px',
                              fontSize: '11px',
                              color: '#cbd5e1',
                              outline: 'none',
                            }}
                            placeholder="Descrição"
                          />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => setEditingCombatId(null)}
                            style={{
                              height: '24px',
                              padding: '0 8px',
                              fontSize: '10px',
                              color: '#94a3b8',
                              background: '#1e293b',
                              border: '1px solid #334155',
                              borderRadius: '5px',
                              cursor: 'pointer',
                            }}
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => saveEdit(c.id)}
                            style={{
                              height: '24px',
                              padding: '0 10px',
                              fontSize: '10px',
                              fontWeight: 'bold',
                              background: '#f59e0b',
                              color: '#020617',
                              border: 'none',
                              borderRadius: '5px',
                              cursor: 'pointer',
                            }}
                          >
                            Salvar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontSize: '12px',
                                fontWeight: 'bold',
                                color: isInactive ? '#94a3b8' : '#ffffff',
                                textDecoration: isInactive ? 'line-through' : 'none',
                              }}
                            >
                              {c.name}
                            </span>
                            {isCurrentlySelected && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 'bold',
                                  padding: '1px 6px',
                                  borderRadius: '5px',
                                  background: 'rgba(245, 158, 11, 0.15)',
                                  border: '1px solid rgba(245, 158, 11, 0.4)',
                                  color: '#fbbf24',
                                }}
                              >
                                Na Mesa
                              </span>
                            )}
                            {isInactive ? (
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 'bold',
                                  padding: '1px 6px',
                                  borderRadius: '5px',
                                  background: '#1e293b',
                                  border: '1px solid #334155',
                                  color: '#94a3b8',
                                }}
                              >
                                Inativo
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 'bold',
                                  padding: '1px 6px',
                                  borderRadius: '5px',
                                  background: 'rgba(16, 185, 129, 0.15)',
                                  border: '1px solid rgba(16, 185, 129, 0.4)',
                                  color: '#34d399',
                                }}
                              >
                                Ativo
                              </span>
                            )}
                          </div>
                          {c.description && (
                            <div
                              style={{
                                fontSize: '10px',
                                color: '#94a3b8',
                                margin: '2px 0 0 0',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {c.description}
                            </div>
                          )}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontSize: '10px',
                              color: '#64748b',
                              marginTop: '3px',
                              fontFamily: 'monospace',
                            }}
                          >
                            <span>
                              {c.totalNpcs != null
                                ? c.totalNpcs
                                : Array.isArray(c.npcs)
                                ? c.npcs.length
                                : 0}{' '}
                              NPCs
                            </span>
                            <span>·</span>
                            <span>{c.createdAt}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                          {isCurrentlySelected ? (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectCombat('');
                                onClose();
                              }}
                              className="hover:bg-slate-700 active:scale-95 transition-all"
                              style={{
                                height: '26px',
                                padding: '0 8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                background: '#1e293b',
                                border: '1px solid #334155',
                                color: '#94a3b8',
                                borderRadius: '6px',
                                cursor: 'pointer',
                              }}
                              title="Sair deste combate e retornar para o Modo Sessão (sem combate ativo)"
                            >
                              Sair (Modo Sessão)
                            </button>
                          ) : !isInactive ? (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectCombat(c.id);
                                onClose();
                              }}
                              className="hover:bg-amber-400 hover:text-slate-950 active:scale-95 transition-all"
                              style={{
                                height: '26px',
                                padding: '0 10px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                background: '#1e293b',
                                border: '1px solid rgba(245, 158, 11, 0.4)',
                                color: '#fbbf24',
                                borderRadius: '6px',
                                cursor: 'pointer',
                              }}
                            >
                              Selecionar
                            </button>
                          ) : null}
                          {onToggleCombatActive && (
                            <button
                              type="button"
                              onClick={() => onToggleCombatActive(c.id)}
                              style={{
                                height: '26px',
                                padding: '0 8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                background: isInactive ? 'rgba(16, 185, 129, 0.15)' : '#0f172a',
                                border: isInactive ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid #334155',
                                color: isInactive ? '#34d399' : '#94a3b8',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              title={isInactive ? 'Ativar combate' : 'Inativar combate'}
                            >
                              {isInactive ? <Eye size={13} /> : <EyeOff size={13} />}
                              <span>{isInactive ? 'Ativar' : 'Inativar'}</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => startEdit(c)}
                            style={{
                              width: '26px',
                              height: '26px',
                              background: '#0f172a',
                              border: '1px solid #334155',
                              color: '#94a3b8',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Renomear ou editar"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingCombatId(c.id)}
                            style={{
                              width: '26px',
                              height: '26px',
                              background: '#0f172a',
                              border: '1px solid rgba(244, 63, 94, 0.3)',
                              color: '#fb7185',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Excluir combate"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
            </div>
          </div>
        )}

        {/* CONTEÚDO DA ABA 2: RETRATOS & BACKUPS DA MESA */}
        {activeTab === 'backups' && (
          <div
            className="custom-scrollbar"
            style={{
              flex: '1 1 auto',
              minHeight: 0,
              overflowY: 'auto',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            {/* Top Toolbar: Actions em div organizada */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '8px',
                flexWrap: 'wrap',
                background: 'rgba(2, 6, 23, 0.55)',
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1px solid #1e293b',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={handleStartCreateSnapshot}
                  className="hover:opacity-90 active:scale-95 transition-all"
                  style={{
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '0 12px',
                    background: '#f59e0b',
                    color: '#020617',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    borderRadius: '7px',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  }}
                >
                  <Plus size={13} />
                  <span>Novo Retrato</span>
                </button>
                <label
                  style={{
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '0 10px',
                    background: '#1e293b',
                    color: '#cbd5e1',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '7px',
                    border: '1px solid #334155',
                    cursor: 'pointer',
                  }}
                >
                  <Upload size={12} />
                  <span>Importar (.json)</span>
                  <input
                    type="file"
                    accept=".json"
                    style={{ display: 'none' }}
                    onChange={handleImportFile}
                  />
                </label>
                <button
                  type="button"
                  onClick={handleExportAllForRepo}
                  style={{
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '0 10px',
                    background: '#1e293b',
                    color: '#fbbf24',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '7px',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    cursor: 'pointer',
                  }}
                  title="Baixar retratos-mesa.json"
                >
                  <Download size={12} />
                  <span>Exportar</span>
                </button>
              </div>
            </div>

            {/* Form: Criar Novo Snapshot */}
            {isCreatingSnapshot && (
              <form
                onSubmit={handleConfirmCreateSnapshot}
                style={{
                  background: 'rgba(2, 6, 23, 0.65)',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Archive size={13} />
                    <span>Salvar Retrato Atual da Mesa</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCreatingSnapshot(false)}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                  >
                    <X size={14} />
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={newSnapshotName}
                    onChange={(e) => setNewSnapshotName(e.target.value)}
                    placeholder="Nome do Retrato (ex: Antes da Batalha)"
                    style={{
                      flex: '1 1 180px',
                      height: '32px',
                      boxSizing: 'border-box',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '7px',
                      padding: '0 10px',
                      fontSize: '11px',
                      color: '#ffffff',
                      outline: 'none',
                    }}
                    required
                  />
                  <input
                    type="text"
                    value={newSnapshotDesc}
                    onChange={(e) => setNewSnapshotDesc(e.target.value)}
                    placeholder="Descrição / Notas (opcional)"
                    style={{
                      flex: '1 1 180px',
                      height: '32px',
                      boxSizing: 'border-box',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '7px',
                      padding: '0 10px',
                      fontSize: '11px',
                      color: '#ffffff',
                      outline: 'none',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', paddingTop: '2px' }}>
                  <button
                    type="button"
                    onClick={() => setIsCreatingSnapshot(false)}
                    style={{
                      height: '26px',
                      padding: '0 10px',
                      fontSize: '11px',
                      color: '#94a3b8',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    style={{
                      height: '26px',
                      padding: '0 14px',
                      background: '#f59e0b',
                      color: '#020617',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <Check size={13} />
                    <span>Salvar Retrato</span>
                  </button>
                </div>
              </form>
            )}

            {/* Lista de Snapshots em divs organizadas */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span>Versões Salvas ({snapshots.length})</span>
                <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'none', fontWeight: 'normal' }}>
                  Clique em "Restaurar" para aplicar na Mesa
                </span>
              </div>

              {snapshots.length === 0 ? (
                <div
                  style={{
                    padding: '24px',
                    textAlign: 'center',
                    background: 'rgba(2, 6, 23, 0.4)',
                    border: '1px solid #1e293b',
                    borderRadius: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Archive size={28} className="text-slate-600" />
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#e2e8f0' }}>
                    Nenhum retrato salvo ainda
                  </div>
                  <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                    Faça backups preventivos clicando em <strong>"Novo Retrato"</strong>.
                  </p>
                </div>
              ) : (
                snapshots.map((snap) => {
                  const isRestoring = restoringSnapshotId === snap.id;
                  const isDeleting = deletingSnapshotId === snap.id;
                  const isEditing = editingSnapshotId === snap.id;

                  return (
                    <div
                      key={snap.id}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '10px',
                        border: '1px solid #1e293b',
                        background: 'rgba(2, 6, 23, 0.55)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {/* Modo Confirmação de Restauração */}
                      {isRestoring ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: '#fcd34d', fontSize: '11px' }}>
                            <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <div style={{ fontWeight: 'bold' }}>
                                Restaurar retrato "{snap.name}"?
                              </div>
                              <div style={{ fontSize: '10px', color: '#cbd5e1', marginTop: '2px' }}>
                                O estado atual da Mesa será substituído por este snapshot.
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => setRestoringSnapshotId(null)}
                              style={{
                                height: '26px',
                                padding: '0 10px',
                                fontSize: '11px',
                                color: '#cbd5e1',
                                background: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '6px',
                                cursor: 'pointer',
                              }}
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleRestoreSnapshot(snap);
                                setRestoringSnapshotId(null);
                              }}
                              style={{
                                height: '26px',
                                padding: '0 12px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                color: '#020617',
                                background: '#34d399',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                              }}
                            >
                              <RotateCcw size={12} />
                              <span>Confirmar e Restaurar</span>
                            </button>
                          </div>
                        </div>
                      ) : isDeleting ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <div style={{ fontSize: '11px', color: '#fda4af', fontWeight: 500 }}>
                            Excluir o backup <strong>"{snap.name}"</strong>?
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={() => setDeletingSnapshotId(null)}
                              style={{
                                height: '26px',
                                padding: '0 10px',
                                fontSize: '11px',
                                color: '#cbd5e1',
                                background: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '6px',
                                cursor: 'pointer',
                              }}
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSnapshot(snap.id)}
                              style={{
                                height: '26px',
                                padding: '0 10px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                color: '#ffffff',
                                background: '#dc2626',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                              }}
                            >
                              Confirmar Exclusão
                            </button>
                          </div>
                        </div>
                      ) : isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <input
                              type="text"
                              value={editSnapshotName}
                              onChange={(e) => setEditSnapshotName(e.target.value)}
                              style={{
                                flex: 1,
                                height: '28px',
                                boxSizing: 'border-box',
                                background: '#0f172a',
                                border: '1px solid rgba(245, 158, 11, 0.4)',
                                borderRadius: '6px',
                                padding: '0 8px',
                                fontSize: '11px',
                                color: '#ffffff',
                                outline: 'none',
                              }}
                              placeholder="Nome do Retrato"
                            />
                            <input
                              type="text"
                              value={editSnapshotDesc}
                              onChange={(e) => setEditSnapshotDesc(e.target.value)}
                              style={{
                                flex: 1,
                                height: '28px',
                                boxSizing: 'border-box',
                                background: '#0f172a',
                                border: '1px solid #334155',
                                borderRadius: '6px',
                                padding: '0 8px',
                                fontSize: '11px',
                                color: '#cbd5e1',
                                outline: 'none',
                              }}
                              placeholder="Descrição / Notas"
                            />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => setEditingSnapshotId(null)}
                              style={{
                                height: '24px',
                                padding: '0 8px',
                                fontSize: '10px',
                                color: '#94a3b8',
                                background: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '5px',
                                cursor: 'pointer',
                              }}
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditSnapshot(snap.id)}
                              style={{
                                height: '24px',
                                padding: '0 10px',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                background: '#f59e0b',
                                color: '#020617',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer',
                              }}
                            >
                              Salvar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#ffffff' }}>{snap.name}</span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>
                                <Clock size={10} />
                                <span>{snap.formattedDate}</span>
                              </span>
                            </div>
                            {snap.description && (
                              <p style={{ fontSize: '10px', color: '#94a3b8', margin: '2px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {snap.description}
                              </p>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontFamily: 'monospace', color: '#64748b', marginTop: '3px', flexWrap: 'wrap' }}>
                              <span style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '1px 5px', borderRadius: '4px', color: '#fbbf24' }}>
                                {snap.summary?.totalCombats || 0} combates
                              </span>
                              <span style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '1px 5px', borderRadius: '4px', color: '#cbd5e1' }}>
                                {snap.summary?.totalNpcs || 0} NPCs
                              </span>
                              <span style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '1px 5px', borderRadius: '4px', color: '#cbd5e1' }}>
                                {snap.summary?.totalPlayers || 0} personagens
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={() => setRestoringSnapshotId(snap.id)}
                              className="hover:opacity-90 active:scale-95 transition-all"
                              style={{
                                height: '26px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '0 8px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#34d399',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                borderRadius: '6px',
                                cursor: 'pointer',
                              }}
                              title="Restaurar este retrato"
                            >
                              <RotateCcw size={11} />
                              <span>Restaurar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExportSnapshot(snap)}
                              style={{
                                width: '26px',
                                height: '26px',
                                background: '#0f172a',
                                border: '1px solid #334155',
                                color: '#94a3b8',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title="Baixar arquivo JSON"
                            >
                              <Download size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStartEditSnapshot(snap)}
                              style={{
                                width: '26px',
                                height: '26px',
                                background: '#0f172a',
                                border: '1px solid #334155',
                                color: '#94a3b8',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title="Editar nome ou notas"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingSnapshotId(snap.id)}
                              style={{
                                width: '26px',
                                height: '26px',
                                background: '#0f172a',
                                border: '1px solid rgba(244, 63, 94, 0.3)',
                                color: '#fb7185',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title="Excluir este backup"
                            >
                              <Trash2 size={12} />
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

        {/* Rodapé com botão Concluir e respiro */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '12px 20px',
            borderTop: '1px solid #1e293b',
            background: '#020617',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="hover:opacity-90 active:scale-95 transition-all"
            style={{
              padding: '5px 16px',
              borderRadius: '7px',
              fontSize: '11px',
              fontWeight: 'bold',
              background: '#f59e0b',
              color: '#020617',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
