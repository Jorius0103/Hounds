import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  secondaryConfirmText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onSecondaryConfirm?: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar Exclusão',
  cancelText = 'Cancelar',
  secondaryConfirmText,
  isDanger = true,
  onConfirm,
  onCancel,
  onSecondaryConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm select-none"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483000,
        padding: '16px',
        overflowY: 'auto',
        WebkitBackdropFilter: 'blur(4px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        style={{
          position: 'relative',
          margin: 'auto',
          width: '100%',
          maxWidth: secondaryConfirmText ? '480px' : '440px',
          background: '#0f172a',
          border: isDanger
            ? '1px solid rgba(239, 68, 68, 0.4)'
            : '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '16px',
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
            padding: '10px 18px',
            borderBottom: isDanger
              ? '1px solid rgba(239, 68, 68, 0.25)'
              : '1px solid rgba(245, 158, 11, 0.2)',
            background: isDanger
              ? 'linear-gradient(to right, rgba(136, 19, 55, 0.35), #0f172a, #0f172a)'
              : 'linear-gradient(to right, rgba(69, 26, 3, 0.3), #0f172a, #0f172a)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '7px',
                background: isDanger ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                border: isDanger ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isDanger ? '#f87171' : '#fbbf24',
                flexShrink: 0,
              }}
            >
              {isDanger ? <Trash2 size={16} /> : <AlertTriangle size={16} />}
            </div>
            <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>
              {title}
            </h4>
          </div>
          <button
            type="button"
            onClick={onCancel}
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

        {/* Corpo com respiro e tipografia clara */}
        <div
          style={{
            padding: '14px 18px',
            fontSize: '12px',
            color: '#cbd5e1',
            lineHeight: 1.55,
          }}
        >
          {message}
        </div>

        {/* Rodapé com botões alinhados à direita e respiro */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '8px',
            padding: '10px 18px',
            borderTop: '1px solid #1e293b',
            background: 'rgba(2, 6, 23, 0.6)',
            flexWrap: 'wrap',
          }}
        >
          {secondaryConfirmText && onSecondaryConfirm && (
            <button
              type="button"
              onClick={onSecondaryConfirm}
              className="hover:text-white active:scale-95 transition-all"
              style={{
                marginRight: 'auto',
                padding: '5px 12px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#94a3b8',
                background: 'transparent',
                border: '1px solid #334155',
                borderRadius: '7px',
                cursor: 'pointer',
              }}
            >
              {secondaryConfirmText}
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="hover:opacity-90 active:scale-95 transition-all"
            style={{
              padding: '5px 14px',
              borderRadius: '7px',
              fontSize: '11px',
              fontWeight: 600,
              color: '#cbd5e1',
              background: '#1e293b',
              border: '1px solid #334155',
              cursor: 'pointer',
            }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="hover:opacity-90 active:scale-95 transition-all"
            style={{
              padding: '5px 16px',
              borderRadius: '7px',
              fontSize: '11px',
              fontWeight: 'bold',
              background: isDanger ? '#dc2626' : '#f59e0b',
              color: isDanger ? '#ffffff' : '#020617',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
