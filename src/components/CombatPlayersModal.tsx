import React, { useState, useEffect } from 'react';
import { NPC } from '../types/rpg';
import { Users, Eye, EyeOff, X, Search, Trash2 } from 'lucide-react';

interface CombatPlayersModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: NPC[];
  activePlayerIds: string[];
  onTogglePlayer: (playerId: string) => void;
  onSetAllPlayers: (show: boolean) => void;
  onAddNewPlayer: () => void;
  /** Exclui o personagem salvo de vez (some de todos os combates) */
  onDeletePlayer?: (playerId: string) => void;
}

export const CombatPlayersModal: React.FC<CombatPlayersModalProps> = ({
  isOpen,
  onClose,
  players,
  activePlayerIds,
  onTogglePlayer,
  onSetAllPlayers,
  onAddNewPlayer,
  onDeletePlayer,
}) => {
  const [search, setSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  const filteredPlayers = players
    .filter((p) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        (p.name || '').toLowerCase().includes(q) ||
        (p.playerName || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(2, 6, 23, 0.85)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        overflowY: 'auto',
      }}
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        style={{
          position: 'relative',
          margin: 'auto',
          width: '100%',
          maxWidth: '580px',
          maxHeight: '82vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#0f172a',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
          overflow: 'hidden',
        }}
      >
        {/* Cabeçalho padronizado e compacto com botão Criar Novo Personagem no topo */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 18px',
            borderBottom: '1px solid rgba(245, 158, 11, 0.2)',
            background: 'linear-gradient(to right, rgba(69, 26, 3, 0.3), #0f172a, #0f172a)',
            gap: '10px',
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
            <h2 style={{ fontSize: '15px', fontWeight: 'bold', color: '#ffffff', margin: 0, whiteSpace: 'nowrap' }}>
              Personagens na Mesa
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={onAddNewPlayer}
              className="hover:opacity-90 active:scale-95 transition-all cursor-pointer"
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
                borderRadius: '7px',
                cursor: 'pointer',
              }}
              title="Cadastrar Novo Personagem"
            >
              <span>+ Criar novo personagem</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
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
        </div>

        {/* Subheader / Busca menor à esquerda e Botões na mesma linha à direita */}
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
          {/* Campo de Busca reduzido */}
          <div style={{ position: 'relative', width: '180px', maxWidth: '45%', flexShrink: 1 }}>
            <Search
              size={12}
              style={{
                position: 'absolute',
                left: '9px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#64748b',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar personagem…"
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

          {/* Botões de Ação Rápida alinhados na mesma linha */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => onSetAllPlayers(true)}
              className="hover:opacity-90 active:scale-95 transition-all cursor-pointer"
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
              title="Habilitar todos os personagens na mesa"
            >
              <Eye size={11} />
              <span>Habilitar Todos</span>
            </button>
            <button
              type="button"
              onClick={() => onSetAllPlayers(false)}
              className="hover:opacity-90 active:scale-95 transition-all cursor-pointer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 9px',
                fontSize: '10px',
                fontWeight: 600,
                background: '#1e293b',
                color: '#cbd5e1',
                border: '1px solid #334155',
                borderRadius: '5px',
                cursor: 'pointer',
              }}
              title="Desabilitar todos os personagens da mesa"
            >
              <EyeOff size={11} />
              <span>Desabilitar Todos</span>
            </button>
          </div>
        </div>

        {/* Lista de Personagens Compacta (linhas com menor altura vertical) */}
        <div
          className="custom-scrollbar"
          style={{
            flex: '1 1 auto',
            minHeight: 0,
            overflowY: 'auto',
            padding: '8px 18px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {filteredPlayers.length === 0 ? (
            <div
              style={{
                padding: '20px 16px',
                textAlign: 'center',
                fontSize: '11px',
                color: '#94a3b8',
                background: 'rgba(2, 6, 23, 0.4)',
                borderRadius: '10px',
                border: '1px dashed #334155',
              }}
            >
              {players.length === 0 ? 'Nenhum personagem cadastrado ainda.' : 'Nenhum personagem encontrado.'}
            </div>
          ) : (
            filteredPlayers.map((player) => {
              const isInCombat = activePlayerIds.includes(player.id);
              const initials = (player.name || '?').slice(0, 2).toUpperCase();

              if (confirmDeleteId === player.id) {
                return (
                  <div
                    key={player.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      flexWrap: 'wrap',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(239,68,68,.5)',
                      background: 'rgba(127,29,29,.25)',
                      color: '#fecaca',
                      fontSize: '12px',
                    }}
                  >
                    <span style={{ flex: 1, minWidth: '160px' }}>
                      Excluir <b>{player.name}</b> de vez?
                    </span>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #334155', background: '#020617', color: '#cbd5e1', cursor: 'pointer', fontSize: '11px' }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDeletePlayer?.(player.id);
                        setConfirmDeleteId(null);
                      }}
                      style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}
                    >
                      Excluir
                    </button>
                  </div>
                );
              }

              return (
                <div key={player.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div
                  onClick={() => onTogglePlayer(player.id)}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: '3px 10px',
                    minHeight: '30px',
                    borderRadius: '7px',
                    border: isInCombat ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid #1e293b',
                    background: isInCombat ? 'rgba(6, 78, 59, 0.2)' : 'rgba(2, 6, 23, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'all 0.15s ease',
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      onTogglePlayer(player.id);
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: '1 1 auto' }}>
                    {/* Avatar / Inicial compacto */}
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '10px',
                        flexShrink: 0,
                        background: isInCombat ? 'rgba(16, 185, 129, 0.25)' : '#1e293b',
                        color: isInCombat ? '#6ee7b7' : '#94a3b8',
                        border: isInCombat ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid #334155',
                        overflow: 'hidden',
                      }}
                    >
                      {player.avatar && player.avatar.trim() !== '' ? (
                        <img
                          src={player.avatar}
                          alt={player.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span>{initials}</span>
                      )}
                    </div>

                    {/* Nome do Personagem com Nome do Jogador entre parênteses na mesma linha */}
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: isInCombat ? '#ffffff' : '#94a3b8',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {player.name || 'Sem nome'}
                      {player.playerName && player.playerName.trim() !== '' && (
                        <span style={{ fontSize: '11px', fontWeight: 'normal', color: isInCombat ? '#93c5fd' : '#64748b', marginLeft: '5px' }}>
                          ({player.playerName.trim()})
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Botão de Toggle compacto */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePlayer(player.id);
                    }}
                    style={{
                      padding: '2px 8px',
                      borderRadius: '5px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      flexShrink: 0,
                      background: isInCombat ? '#059669' : '#1e293b',
                      color: isInCombat ? '#ffffff' : '#94a3b8',
                      border: isInCombat ? '1px solid #34d399' : '1px solid #334155',
                      boxShadow: isInCombat ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                    }}
                  >
                    <span>{isInCombat ? '✓ Visível' : 'Oculto'}</span>
                  </button>
                </div>
                {onDeletePlayer && (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(player.id)}
                    title="Excluir personagem salvo"
                    aria-label={`Excluir ${player.name || ''}`}
                    style={{
                      flex: 'none',
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      border: '1px solid #1e293b',
                      background: 'transparent',
                      color: '#64748b',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    className="hover:text-rose-400 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
