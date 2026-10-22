import React, { useState, useEffect } from 'react';
import { UserAccount } from '../types/rpg';
import {
  ShieldCheck,
  Eye,
  EyeOff,
  X,
  Check,
  CheckCheck,
  Users,
  Search,
} from 'lucide-react';

interface PlayerPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserAccount[];
  editorUserIds: string[];
  onTogglePermission: (userId: string) => void;
  onSetAllPermissions: (allow: boolean) => void;
}

export const PlayerPermissionsModal: React.FC<PlayerPermissionsModalProps> = ({
  isOpen,
  onClose,
  users,
  editorUserIds,
  onTogglePermission,
  onSetAllPermissions,
}) => {
  const [search, setSearch] = useState('');

  // Fecha com a tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filtra apenas os usuários com perfil de jogador (apenas dois perfis no sistema: mestre e jogador)
  const playerUsers = users.filter((u) => u.role === 'jogador');

  const filteredPlayers = playerUsers.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (u.name || '').toLowerCase().includes(q);
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm"
      style={{
        padding: '16px',
        overflowY: 'auto',
        WebkitBackdropFilter: 'blur(4px)',
      }}
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        style={{
          position: 'relative',
          margin: 'auto',
          width: '100%',
          maxWidth: '580px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#0f172a',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
          overflow: 'hidden',
        }}
      >
        {/* Cabeçalho compacto */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 18px',
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
              <Users size={16} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>
                Permissões dos Jogadores na Mesa de RPG
              </h2>
              <p style={{ fontSize: '10px', color: '#94a3b8', margin: '1px 0 0 0' }}>
                Defina em tempo real quem pode editar fichas e movimentar tokens
              </p>
            </div>
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
            }}
            title="Fechar (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Subheader / Busca à esquerda e Botões à direita na mesma linha */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            padding: '8px 18px',
            background: 'rgba(2, 6, 23, 0.8)',
            borderBottom: '1px solid rgba(51, 65, 85, 0.8)',
          }}
        >
          {/* Campo de Busca à esquerda */}
          <div style={{ position: 'relative', width: '200px', maxWidth: '45%' }}>
            <Search
              size={12}
              style={{
                position: 'absolute',
                left: '9px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#64748b',
              }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar jogador..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: 'rgba(2, 6, 23, 0.9)',
                border: '1px solid #1e293b',
                borderRadius: '6px',
                padding: '4px 8px 4px 26px',
                fontSize: '11px',
                color: '#ffffff',
                outline: 'none',
              }}
            />
          </div>

          {/* Botões Liberar Todos e Bloquear Todos à direita */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => onSetAllPermissions(true)}
              className="hover:opacity-90 active:scale-95 transition-all"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                fontSize: '10px',
                fontWeight: 'bold',
                background: 'rgba(6, 78, 59, 0.8)',
                color: '#6ee7b7',
                border: '1px solid rgba(6, 95, 70, 0.8)',
                borderRadius: '5px',
                cursor: 'pointer',
              }}
              title="Conceder permissão de edição a todos os jogadores"
            >
              <CheckCheck size={11} />
              <span>Liberar Todos</span>
            </button>
            <button
              type="button"
              onClick={() => onSetAllPermissions(false)}
              className="hover:opacity-90 active:scale-95 transition-all"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                fontSize: '10px',
                fontWeight: 500,
                background: '#1e293b',
                color: '#cbd5e1',
                border: '1px solid #334155',
                borderRadius: '5px',
                cursor: 'pointer',
              }}
              title="Colocar todos os jogadores em modo espectador"
            >
              <EyeOff size={11} />
              <span>Bloquear Todos</span>
            </button>
          </div>
        </div>

        {/* Lista de jogadores: cards verticais compactos que cabem 10 itens sem rolagem */}
        <div
          style={{
            flex: '1 1 auto',
            minHeight: 0,
            overflowY: 'auto',
            padding: '8px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {playerUsers.length === 0 ? (
            <div
              style={{
                padding: '20px 16px',
                textAlign: 'center',
                fontSize: '11px',
                color: '#94a3b8',
                background: 'rgba(2, 6, 23, 0.4)',
                borderRadius: '10px',
                border: '1px dashed #334155',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid #334155',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Users size={16} />
              </div>
              <div style={{ fontWeight: 'bold', color: '#e2e8f0' }}>
                Nenhum jogador cadastrado no sistema
              </div>
              <p style={{ fontSize: '10px', color: '#64748b', maxWidth: '300px', margin: 0, lineHeight: 1.4 }}>
                Cadastre contas com o perfil <strong>Jogador</strong> na aba{' '}
                <strong>Usuários</strong> do Hub para gerenciar o acesso aqui.
              </p>
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div
              style={{
                padding: '16px',
                textAlign: 'center',
                fontSize: '11px',
                color: '#94a3b8',
                background: 'rgba(2, 6, 23, 0.4)',
                borderRadius: '10px',
                border: '1px solid #1e293b',
              }}
            >
              Nenhum jogador encontrado para "{search}".
            </div>
          ) : (
            filteredPlayers.map((u) => {
              const isAllowed =
                editorUserIds.includes(u.id) || editorUserIds.includes(u.name);
              const initials = (u.name || '?').slice(0, 2).toUpperCase();

              return (
                <div
                  key={u.id}
                  onClick={() => onTogglePermission(u.id)}
                  style={{
                    padding: '4px 10px',
                    minHeight: '34px',
                    borderRadius: '8px',
                    border: isAllowed ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid #1e293b',
                    background: isAllowed ? 'rgba(6, 78, 59, 0.2)' : 'rgba(2, 6, 23, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'all 0.15s ease',
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      onTogglePermission(u.id);
                    }
                  }}
                  title={
                    isAllowed
                      ? `Clique para retirar permissão de edição de ${u.name}`
                      : `Clique para dar permissão de edição para ${u.name}`
                  }
                >
                  {/* Avatar, Nome e Texto de Permissão ao lado do Nome */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: '1 1 auto' }}>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '10px',
                        flexShrink: 0,
                        background: isAllowed ? 'rgba(16, 185, 129, 0.2)' : '#1e293b',
                        color: isAllowed ? '#6ee7b7' : '#94a3b8',
                        border: isAllowed ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid #334155',
                      }}
                    >
                      {initials}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flexWrap: 'nowrap' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 'bold',
                          color: '#ffffff',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '160px',
                        }}
                      >
                        {u.name}
                      </span>

                      {/* Texto "Editor Liberado" ou "Modo Espectador" ao lado do nome */}
                      {isAllowed ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '10px',
                            fontWeight: 600,
                            color: '#34d399',
                            background: 'rgba(6, 78, 59, 0.5)',
                            border: '1px solid rgba(16, 185, 129, 0.35)',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          <ShieldCheck size={10} style={{ flexShrink: 0 }} />
                          Editor Liberado
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '10px',
                            fontWeight: 500,
                            color: '#94a3b8',
                            background: 'rgba(30, 41, 59, 0.5)',
                            border: '1px solid #334155',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          <Eye size={10} style={{ flexShrink: 0 }} />
                          Modo Espectador
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Controle Segmentado: Espectador vs Editor */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      background: '#020617',
                      padding: '2px',
                      borderRadius: '6px',
                      border: '1px solid #1e293b',
                      flexShrink: 0,
                    }}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isAllowed) onTogglePermission(u.id);
                      }}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: !isAllowed ? 'bold' : 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        background: !isAllowed ? '#1e293b' : 'transparent',
                        color: !isAllowed ? '#f1f5f9' : '#64748b',
                        border: !isAllowed ? '1px solid #334155' : '1px solid transparent',
                        cursor: 'pointer',
                      }}
                    >
                      <Eye size={11} />
                      <span>Espectador</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isAllowed) onTogglePermission(u.id);
                      }}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: isAllowed ? 'bold' : 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        background: isAllowed ? '#059669' : 'transparent',
                        color: isAllowed ? '#ffffff' : '#64748b',
                        border: isAllowed ? '1px solid #34d399' : '1px solid transparent',
                        cursor: 'pointer',
                        boxShadow: isAllowed ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                      }}
                    >
                      <Check size={11} strokeWidth={2.5} />
                      <span>Editor</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé compacto */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 18px',
            borderTop: '1px solid #1e293b',
            background: 'rgba(2, 6, 23, 0.6)',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: '#94a3b8' }}>
            <span
              style={{
                width: '5px',
                height: '5px',
                borderRadius: '9999px',
                background: '#34d399',
                display: 'inline-block',
                boxShadow: '0 0 5px #34d399',
              }}
            />
            <span>Sincronizado em tempo real com todos os jogadores.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="hover:opacity-90 active:scale-95 transition-all"
            style={{
              padding: '5px 14px',
              borderRadius: '7px',
              fontSize: '11px',
              fontWeight: 'bold',
              background: '#f59e0b',
              color: '#020617',
              border: 'none',
              cursor: 'pointer',
              flexShrink: 0,
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
