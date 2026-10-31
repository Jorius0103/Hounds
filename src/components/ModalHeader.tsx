import React from 'react';
import { X } from 'lucide-react';

// Cabeçalho comum dos modais da Mesa: faixa em degradê âmbar, ícone num quadrado, título,
// subtítulo e botão de fechar. Os três tamanhos são os que o mesa.html usava em cada modal.
type HeaderSize = 'compact' | 'standard' | 'large';

const SIZES: Record<HeaderSize, { padding: string; gap: string; box: number; radius: number; title: number; subtitle: number; close: number }> = {
  compact: { padding: '10px 18px', gap: '8px', box: 28, radius: 7, title: 14, subtitle: 10, close: 16 },
  standard: { padding: '12px 18px', gap: '8px', box: 32, radius: 8, title: 14, subtitle: 10, close: 18 },
  large: { padding: '14px 20px', gap: '10px', box: 32, radius: 8, title: 15, subtitle: 11, close: 18 },
};

interface ModalHeaderProps {
  icon: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose?: () => void;
  size?: HeaderSize;
  /** Conteúdo extra à direita, antes do botão de fechar */
  extra?: React.ReactNode;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({ icon, title, subtitle, onClose, size = 'compact', extra }) => {
  const s = SIZES[size];
  return (
    <div
      style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: s.padding,
        borderBottom: '1px solid rgba(245, 158, 11, 0.2)',
        background: 'linear-gradient(to right, rgba(69, 26, 3, 0.3), #0f172a, #0f172a)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: s.gap, minWidth: 0 }}>
        <div
          style={{
            width: `${s.box}px`,
            height: `${s.box}px`,
            borderRadius: `${s.radius}px`,
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fbbf24',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: `${s.title}px`, fontWeight: 'bold', color: '#ffffff', margin: 0 }}>{title}</h2>
          {subtitle && (
            <p style={{ fontSize: `${s.subtitle}px`, color: '#94a3b8', margin: size === 'large' ? '2px 0 0 0' : '1px 0 0 0' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {extra}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: size === 'compact' ? '5px' : '6px',
              borderRadius: size === 'compact' ? '7px' : '8px',
              cursor: 'pointer',
              flexShrink: 0,
              background: 'transparent',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
            }}
            className="hover:text-white hover:bg-slate-800 transition-colors"
            title="Fechar (Esc)"
          >
            <X size={s.close} />
          </button>
        )}
      </div>
    </div>
  );
};
