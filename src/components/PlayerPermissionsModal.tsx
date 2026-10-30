import React, { useState, useEffect } from 'react';
import { UserAccount, NPC } from '../types/rpg';
import {
  ShieldCheck,
  Eye,
  EyeOff,
  X,
  Check,
  CheckCheck,
  Users,
  Search,
  UserCheck,
  Plus,
  Trash2,
} from 'lucide-react';

interface PlayerPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserAccount[];
  editorUserIds: string[];
  onTogglePermission: (userId: string) => void;
  onSetAllPermissions: (allow: boolean) => void;
  characters?: NPC[];
  onLinkCharacter?: (characterId: string, userId: string | null) => void;
  onlinePlayerNames?: Set<string>;
  activePlayerIds?: string[];
  onTogglePlayerVisibility?: (characterId: string) => void;
  onSetAllPlayersVisibility?: (visible: boolean) => void;
  onAddNewPlayer?: () => void;
  onDeleteCharacter?: (characterId: string) => void;
}

export const PlayerPermissionsModal: React.FC<PlayerPermissionsModalProps> = ({
  isOpen,
  onClose,
  users,
  editorUserIds,
  onTogglePermission,
  onSetAllPermissions,
  characters = [],
  onLinkCharacter,
  onlinePlayerNames,
  activePlayerIds,
  onTogglePlayerVisibility,
  onSetAllPlayersVisibility,
  onAddNewPlayer,
  onDeleteCharacter,
}) => {
  const [activeTab, setActiveTab] = useState<'permissions' | 'characters'>('permissions');
  const [charSearch, setCharSearch] = useState('');
  const [permSearch, setPermSearch] = useState('');

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

  // Personagens filtrados pela busca
  const filteredCharacters = characters.filter((c) => {
    const q = charSearch.trim().toLowerCase();
    if (!q) return true;
    const charName = (c.name || '').toLowerCase();
    const playerName = (c.playerName || '').toLowerCase();
    return charName.includes(q) || playerName.includes(q);
  });

  // Jogadores filtrados pela busca de permissões
  const filteredPlayers = playerUsers.filter((u) => {
    const q = permSearch.trim().toLowerCase();
    if (!q) return true;
    return (u.name || '').toLowerCase().includes(q);
  });

  // Helper para verificar se um usuário está online
  const isUserOnline = (userName?: string): boolean => {
    if (!userName || !onlinePlayerNames) return false;
    return onlinePlayerNames.has(userName.trim().toLowerCase());
  };

  // Helper para encontrar o usuário vinculado a um personagem
  const getLinkedUserForChar = (char: NPC): UserAccount | null => {
    if (char.userId) {
      const u = users.find((x) => x.id === char.userId);
      if (u) return u;
    }
    if (char.playerName && char.playerName.trim()) {
      const u = users.find(
        (x) => x.name.trim().toLowerCase() === char.playerName!.trim().toLowerCase()
      );
      if (u) return u;
    }
    return null;
  };

  // Helper para encontrar todos os personagens vinculados a um usuário
  const getCharactersForUser = (user: UserAccount): NPC[] => {
    return characters.filter((c) => {
      if (c.userId && c.userId === user.id) return true;
      if (!c.userId && c.playerName && c.playerName.trim().toLowerCase() === user.name.trim().toLowerCase()) {
        return true;
      }
      return false;
    });
  };

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
          maxWidth: '680px',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#0f172a',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
          overflow: 'hidden',
        }}
      >
        {/* Cabeçalho */}
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
                Jogadores da Mesa de RPG
              </h2>
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

        {/* Abas Superiores: Permissões vs Personagens & Vínculo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: '#020617',
            borderBottom: '1px solid #1e293b',
            padding: '0 18px',
            gap: '8px',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('permissions')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 12px',
              fontSize: '11px',
              fontWeight: 'bold',
              color: activeTab === 'permissions' ? '#34d399' : '#94a3b8',
              borderBottom: activeTab === 'permissions' ? '2px solid #34d399' : '2px solid transparent',
              background: 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <ShieldCheck size={13} />
            <span>Permissões</span>
            <span
              style={{
                fontSize: '9px',
                padding: '1px 5px',
                borderRadius: '9999px',
                background: activeTab === 'permissions' ? 'rgba(16, 185, 129, 0.2)' : '#1e293b',
                color: activeTab === 'permissions' ? '#34d399' : '#64748b',
              }}
            >
              {playerUsers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('characters')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 12px',
              fontSize: '11px',
              fontWeight: 'bold',
              color: activeTab === 'characters' ? '#fbbf24' : '#94a3b8',
              borderBottom: activeTab === 'characters' ? '2px solid #fbbf24' : '2px solid transparent',
              background: 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <UserCheck size={13} />
            <span>Personagens & Vínculo</span>
            <span
              style={{
                fontSize: '9px',
                padding: '1px 5px',
                borderRadius: '9999px',
                background: activeTab === 'characters' ? 'rgba(245, 158, 11, 0.2)' : '#1e293b',
                color: activeTab === 'characters' ? '#fbbf24' : '#64748b',
              }}
            >
              {characters.length}
            </span>
          </button>
        </div>

        {/* Subheader / Busca e Ações Rápidas */}
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
          {/* Campo de Busca */}
          <div style={{ position: 'relative', width: '220px', maxWidth: '45%' }}>
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
              value={activeTab === 'characters' ? charSearch : permSearch}
              onChange={(e) => {
                if (activeTab === 'characters') setCharSearch(e.target.value);
                else setPermSearch(e.target.value);
              }}
              placeholder={activeTab === 'characters' ? 'Buscar personagem...' : 'Buscar jogador...'}
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

          {/* Ações da Aba Ativa */}
          {activeTab === 'permissions' ? (
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
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                <strong style={{ color: '#fbbf24' }}>{filteredCharacters.length}</strong> de {characters.length}
              </span>
              {onAddNewPlayer && (
                <button
                  type="button"
                  onClick={onAddNewPlayer}
                  className="hover:opacity-90 active:scale-95 transition-all"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    background: '#059669',
                    color: '#ffffff',
                    border: '1px solid rgba(16, 185, 129, 0.5)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                  title="Cadastrar Novo Personagem na Campanha"
                >
                  <Plus size={12} />
                  <span>Criar novo personagem</span>
                </button>
              )}
              {onSetAllPlayersVisibility && (
                <>
                  <button
                    type="button"
                    onClick={() => onSetAllPlayersVisibility(true)}
                    className="hover:opacity-90 active:scale-95 transition-all"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 9px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      background: 'rgba(6, 78, 59, 0.8)',
                      color: '#6ee7b7',
                      border: '1px solid rgba(6, 95, 70, 0.8)',
                      borderRadius: '5px',
                      cursor: 'pointer',
                    }}
                    title="Tornar todos os personagens visíveis na mesa de RPG"
                  >
                    <Eye size={11} />
                    <span>Habilitar Todos</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetAllPlayersVisibility(false)}
                    className="hover:opacity-90 active:scale-95 transition-all"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 9px',
                      fontSize: '10px',
                      fontWeight: 500,
                      background: '#1e293b',
                      color: '#cbd5e1',
                      border: '1px solid #334155',
                      borderRadius: '5px',
                      cursor: 'pointer',
                    }}
                    title="Ocultar todos os personagens da mesa de RPG"
                  >
                    <EyeOff size={11} />
                    <span>Ocultar Todos</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Conteúdo Principal com Rolagem */}
        <div
          style={{
            flex: '1 1 auto',
            minHeight: 0,
            overflowY: 'auto',
            padding: '8px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
          }}
        >
          {activeTab === 'characters' ? (
            /* ======================================================= */
            /* ABA 1: LISTA DE PERSONAGENS & VÍNCULO A USUÁRIOS       */
            /* ======================================================= */
            filteredCharacters.length === 0 ? (
              <div
                style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  fontSize: '11px',
                  color: '#94a3b8',
                  background: 'rgba(2, 6, 23, 0.4)',
                  borderRadius: '10px',
                  border: '1px dashed #334155',
                }}
              >
                Nenhum personagem encontrado{charSearch ? ` para "${charSearch}"` : ''}.
              </div>
            ) : (
              filteredCharacters.map((char) => {
                const linkedUser = getLinkedUserForChar(char);
                const isOnline = linkedUser ? isUserOnline(linkedUser.name) : false;
                const isEditor = linkedUser
                  ? editorUserIds.includes(linkedUser.id) || editorUserIds.includes(linkedUser.name)
                  : false;
                const isVisible = activePlayerIds ? activePlayerIds.includes(char.id) : true;

                return (
                  <div
                    key={char.id}
                    style={{
                      padding: '6px 12px',
                      minHeight: '40px',
                      borderRadius: '8px',
                      border: linkedUser ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid #1e293b',
                      background: linkedUser ? 'rgba(6, 78, 59, 0.15)' : 'rgba(2, 6, 23, 0.6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {/* Lado Esquerdo: Identificação do Personagem */}
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
                          background: linkedUser ? 'rgba(16, 185, 129, 0.25)' : 'rgba(30, 41, 59, 0.8)',
                          color: linkedUser ? '#6ee7b7' : '#94a3b8',
                          border: linkedUser ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid #334155',
                        }}
                      >
                        {(char.name || '?').slice(0, 2).toUpperCase()}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 'bold',
                              color: '#ffffff',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '180px',
                            }}
                          >
                            {char.name}
                          </span>
                          <span
                            style={{
                              fontSize: '9px',
                              padding: '1px 4px',
                              borderRadius: '4px',
                              background: '#1e293b',
                              color: '#94a3b8',
                              border: '1px solid #334155',
                            }}
                          >
                            {char.characterType === 'npc' ? 'NPC' : 'Personagem'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Lado Direito: Seleção do Jogador Vinculado e Toggle de Visibilidade */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 500 }}>
                        Jogador:
                      </span>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <select
                          value={linkedUser?.id || ''}
                          onChange={(e) => {
                            const val = e.target.value || null;
                            onLinkCharacter?.(char.id, val);
                          }}
                          style={{
                            fontSize: '11px',
                            fontWeight: linkedUser ? 'bold' : 'normal',
                            padding: '4px 22px 4px 8px',
                            borderRadius: '6px',
                            background: linkedUser ? 'rgba(6, 78, 59, 0.5)' : 'rgba(15, 23, 42, 0.9)',
                            color: linkedUser ? '#6ee7b7' : '#94a3b8',
                            border: linkedUser ? '1px solid rgba(16, 185, 129, 0.6)' : '1px solid #334155',
                            outline: 'none',
                            cursor: 'pointer',
                            minWidth: '140px',
                            maxWidth: '170px',
                            appearance: 'none',
                            WebkitAppearance: 'none',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          <option value="" style={{ background: '#0f172a', color: '#94a3b8' }}>
                            — Nenhum (Sem jogador) —
                          </option>
                          {playerUsers.map((u) => (
                            <option key={u.id} value={u.id} style={{ background: '#0f172a', color: '#ffffff' }}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                        <span
                          style={{
                            position: 'absolute',
                            right: '7px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '9px',
                            color: linkedUser ? '#6ee7b7' : '#64748b',
                            pointerEvents: 'none',
                          }}
                        >
                          ▾
                        </span>
                      </div>

                      {/* Status do Jogador Vinculado: Online/Offline e Modo Editor/Espectador */}
                      {linkedUser ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: '75px' }}>
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '9999px',
                              background: isOnline ? '#10b981' : '#64748b',
                              display: 'inline-block',
                              boxShadow: isOnline ? '0 0 4px #10b981' : 'none',
                            }}
                            title={isOnline ? `${linkedUser.name} está Online` : `${linkedUser.name} está Offline`}
                          />
                          {isEditor ? (
                            <span
                              style={{
                                fontSize: '9px',
                                fontWeight: 'bold',
                                color: '#34d399',
                                background: 'rgba(6, 78, 59, 0.6)',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                padding: '1px 5px',
                                borderRadius: '4px',
                              }}
                            >
                              Editor
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: '9px',
                                fontWeight: 500,
                                color: '#94a3b8',
                                background: '#1e293b',
                                border: '1px solid #334155',
                                padding: '1px 5px',
                                borderRadius: '4px',
                              }}
                            >
                              Espectador
                            </span>
                          )}
                        </div>
                      ) : (
                        <div style={{ minWidth: '75px' }} />
                      )}

                      {/* Botão de Toggle de Visibilidade na Mesa de RPG */}
                      {onTogglePlayerVisibility && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onTogglePlayerVisibility(char.id);
                          }}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '5px',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            flexShrink: 0,
                            background: isVisible ? '#059669' : '#1e293b',
                            color: isVisible ? '#ffffff' : '#94a3b8',
                            border: isVisible ? '1px solid #34d399' : '1px solid #334155',
                            boxShadow: isVisible ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                            transition: 'all 0.15s ease',
                          }}
                          title={
                            isVisible
                              ? 'Personagem visível na Mesa de RPG. Clique para ocultar.'
                              : 'Personagem oculto da Mesa de RPG. Clique para tornar visível.'
                          }
                        >
                          {isVisible ? <Eye size={11} /> : <EyeOff size={11} />}
                          <span>{isVisible ? 'Visível' : 'Oculto'}</span>
                        </button>
                      )}

                      {/* Botão de Excluir Personagem */}
                      {onDeleteCharacter && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              window.confirm(
                                `Tem certeza que deseja excluir o personagem "${char.name}"? Esta ação removerá o personagem da campanha.`
                              )
                            ) {
                              onDeleteCharacter(char.id);
                            }
                          }}
                          style={{
                            padding: '4px 6px',
                            borderRadius: '5px',
                            fontSize: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0,
                            background: 'rgba(159, 18, 57, 0.4)',
                            color: '#f43f5e',
                            border: '1px solid rgba(225, 29, 72, 0.4)',
                            transition: 'all 0.15s ease',
                          }}
                          title={`Excluir personagem ${char.name} da campanha`}
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )
          ) : (
            /* ======================================================= */
            /* ABA 2: LISTA DE PERMISSÕES DOS JOGADORES (ESPECT/EDITOR) */
            /* ======================================================= */
            filteredPlayers.length === 0 ? (
              <div
                style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  fontSize: '11px',
                  color: '#94a3b8',
                  background: 'rgba(2, 6, 23, 0.4)',
                  borderRadius: '10px',
                  border: '1px dashed #334155',
                }}
              >
                Nenhum jogador encontrado{permSearch ? ` para "${permSearch}"` : ''}.
              </div>
            ) : (
              filteredPlayers.map((u) => {
                const isAllowed =
                  editorUserIds.includes(u.id) || editorUserIds.includes(u.name);
                const initials = (u.name || '?').slice(0, 2).toUpperCase();
                const isOnline = isUserOnline(u.name);
                const userChars = getCharactersForUser(u);

                return (
                  <div
                    key={u.id}
                    style={{
                      padding: '5px 12px',
                      minHeight: '38px',
                      borderRadius: '8px',
                      border: isAllowed ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid #1e293b',
                      background: isAllowed ? 'rgba(6, 78, 59, 0.15)' : 'rgba(2, 6, 23, 0.6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      userSelect: 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {/* Avatar, Nome e Personagens que ele controla (SEM ONCLICK NA LINHA!) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: '1 1 auto' }}>
                      <div
                        style={{
                          position: 'relative',
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
                        {isOnline && (
                          <span
                            style={{
                              position: 'absolute',
                              bottom: '-1px',
                              right: '-1px',
                              width: '7px',
                              height: '7px',
                              borderRadius: '9999px',
                              background: '#10b981',
                              border: '1px solid #0f172a',
                              boxShadow: '0 0 4px #10b981',
                            }}
                            title="Online"
                          />
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 'bold',
                            color: '#ffffff',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '120px',
                          }}
                        >
                          {u.name}
                        </span>

                        {/* Personagens controlados por este usuário */}
                        {userChars.length > 0 ? (
                          <span
                            style={{
                              fontSize: '9px',
                              color: '#6ee7b7',
                              background: 'rgba(6, 78, 59, 0.4)',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              whiteSpace: 'nowrap',
                            }}
                            title={`Personagens de ${u.name}: ${userChars.map((c) => c.name).join(', ')}`}
                          >
                            Controla: {userChars.map((c) => c.name).join(', ')}
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '9px',
                              color: '#64748b',
                              fontStyle: 'italic',
                            }}
                          >
                            (Nenhum personagem)
                          </span>
                        )}

                        {/* Badge de Modo */}
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
                              padding: '1px 5px',
                              borderRadius: '4px',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                            }}
                          >
                            <ShieldCheck size={10} style={{ flexShrink: 0 }} />
                            Modo Editor
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
                              padding: '1px 5px',
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

                    {/* Botões Segmentados: Espectador vs Editor (Apenas eles trocam o status) */}
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
                        onClick={() => {
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
                        onClick={() => {
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
            justifyContent: 'flex-end',
            padding: '8px 18px',
            borderTop: '1px solid #1e293b',
            background: 'rgba(2, 6, 23, 0.6)',
            gap: '10px',
          }}
        >
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
