import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Dices } from 'lucide-react';

export interface DicePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoll: (count: number, sides: number) => void;
  anchorRect?: { top: number; right: number } | null;
}

// Crisp geometric SVG icons for each polyhedral die
const DieIcon: React.FC<{ sides: number; size?: number; className?: string }> = ({ sides, size = 14, className = '' }) => {
  switch (sides) {
    case 4:
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M12 3L2 20h20L12 3z" />
          <path d="M12 3v17" />
        </svg>
      );
    case 6:
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <rect x="3" y="3" width="18" height="18" rx="2.5" />
          <circle cx="8" cy="8" r="1.2" fill="currentColor" />
          <circle cx="16" cy="16" r="1.2" fill="currentColor" />
          <circle cx="12" cy="12" r="1.2" fill="currentColor" />
        </svg>
      );
    case 8:
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <polygon points="12,2 21,12 12,22 3,12" />
          <line x1="3" y1="12" x2="21" y2="12" />
        </svg>
      );
    case 10:
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <polygon points="12,2 21,9 12,22 3,9" />
          <line x1="12" y1="2" x2="12" y2="22" />
          <line x1="3" y1="9" x2="21" y2="9" />
        </svg>
      );
    case 12:
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <polygon points="12,2 20,7 18,17 12,22 6,17 4,7" />
          <polygon points="12,7 16,10 15,15 9,15 8,10" />
        </svg>
      );
    case 20:
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <polygon points="12,2 21,7 21,17 12,22 3,17 3,7" />
          <polygon points="12,6 18,15 6,15" />
          <line x1="12" y1="2" x2="12" y2="6" />
          <line x1="3" y1="7" x2="6" y2="15" />
          <line x1="21" y1="7" x2="18" y2="15" />
          <line x1="6" y1="15" x2="12" y2="22" />
          <line x1="18" y1="15" x2="12" y2="22" />
        </svg>
      );
    case 100:
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <polygon points="12,2 21,9 12,22 3,9" />
          <text x="12" y="14" fontSize="8" fontWeight="bold" textAnchor="middle" fill="currentColor" stroke="none">00</text>
        </svg>
      );
    default:
      return <Dices size={size} className={className} />;
  }
};

const DICE_TYPES = [
  { sides: 4, name: 'D4' },
  { sides: 6, name: 'D6' },
  { sides: 8, name: 'D8' },
  { sides: 10, name: 'D10' },
  { sides: 12, name: 'D12' },
  { sides: 20, name: 'D20' },
  { sides: 100, name: 'D100' },
];

const QUANTITIES = [1, 2, 3, 4, 5, 6];

export const DicePickerModal: React.FC<DicePickerModalProps> = ({
  isOpen,
  onClose,
  onRoll,
  anchorRect,
}) => {
  const [customCount, setCustomCount] = useState<number | string>(1);
  const [customSides, setCustomSides] = useState<number>(6);
  const popoverRef = useRef<HTMLDivElement>(null);

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

  const handleRollClick = (count: number, sides: number) => {
    onRoll(count, sides);
    onClose();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const count = Math.max(1, Math.min(100, parseInt(String(customCount), 10) || 1));
    const sides = Math.max(2, Math.min(1000, Number(customSides) || 6));
    handleRollClick(count, sides);
  };

  return createPortal(
    <div
      className="fixed inset-0 select-none pointer-events-auto"
      style={{ zIndex: 99999 }}
    >
      {/* Backdrop invisível para fechar ao clicar fora */}
      <div
        className="fixed inset-0 bg-transparent"
        style={{ position: 'fixed', inset: 0, zIndex: 99998, background: 'transparent' }}
        onClick={onClose}
      />
      {/* Popover Card estilizado no padrão unificado da Mesa */}
      <div
        ref={popoverRef}
        style={{
          position: 'fixed',
          top: anchorRect ? `${anchorRect.top}px` : '56px',
          right: anchorRect ? `${anchorRect.right}px` : '16px',
          zIndex: 99999,
          width: '340px',
          maxWidth: 'calc(100vw - 24px)',
          background: '#0f172a',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.85)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho unificado com badge ambar e ícone de dados limpo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            background: 'linear-gradient(to right, rgba(69, 26, 3, 0.3), #0f172a, #0f172a)',
            borderBottom: '1px solid rgba(245, 158, 11, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '26px',
                height: '26px',
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
              <Dices size={15} />
            </div>
            <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>
              Rolar Dados
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
              background: 'transparent',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
            }}
            title="Fechar (Esc)"
          >
            <X size={15} />
          </button>
        </div>

        {/* Linhas organizadas em divs separadas com botões pill */}
        <div
          style={{
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            background: '#0f172a',
          }}
        >
          {DICE_TYPES.map((die) => (
            <div
              key={die.sides}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 8px',
                background: 'rgba(2, 6, 23, 0.55)',
                border: '1px solid #1e293b',
                borderRadius: '8px',
              }}
            >
              {/* Die Badge */}
              <div style={{ width: '56px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <DieIcon sides={die.sides} size={13} className="text-amber-400 shrink-0" />
                <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 'bold', color: '#fbbf24' }}>
                  {die.name}
                </span>
              </div>

              {/* Botões de quantidade 1 a 6 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {QUANTITIES.map((qty) => (
                  <button
                    key={qty}
                    type="button"
                    onClick={() => handleRollClick(qty, die.sides)}
                    className="hover:bg-amber-500 hover:text-slate-950 hover:border-amber-400 active:scale-95 transition-all"
                    style={{
                      width: '26px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      fontWeight: 'bold',
                      color: '#e2e8f0',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                    title={`Rolar ${qty}${die.name}`}
                  >
                    {qty}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Rodapé: Rolo Personalizado (sem texto 'PERSONALIZADO', select do tamanho do D100, alinhado com o botão) */}
        <div
          style={{
            padding: '10px 12px',
            background: 'rgba(2, 6, 23, 0.75)',
            borderTop: '1px solid #1e293b',
          }}
        >
          <form
            onSubmit={handleCustomSubmit}
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '8px',
              width: '100%',
            }}
          >
            {/* Campo Dado (mesmo tamanho da coluna de dados ~64px) */}
            <div style={{ display: 'flex', flexDirection: 'column', width: '64px', flexShrink: 0 }}>
              <label style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, marginBottom: '3px' }}>
                Dado
              </label>
              <select
                value={customSides}
                onChange={(e) => setCustomSides(Number(e.target.value))}
                style={{
                  width: '100%',
                  height: '32px',
                  boxSizing: 'border-box',
                  background: '#0f172a',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  borderRadius: '7px',
                  padding: '0 4px',
                  fontSize: '11px',
                  color: '#fbbf24',
                  fontWeight: 'bold',
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {DICE_TYPES.map((die) => (
                  <option key={die.sides} value={die.sides} style={{ background: '#0f172a', color: '#ffffff' }}>
                    {die.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Campo Quantidade */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
              <label style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, marginBottom: '3px' }}>
                Quantidade
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={customCount}
                onChange={(e) => setCustomCount(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10) || 1))}
                onBlur={() => {
                  if (!customCount || Number(customCount) < 1) setCustomCount(1);
                }}
                style={{
                  width: '100%',
                  height: '32px',
                  boxSizing: 'border-box',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '7px',
                  padding: '0 8px',
                  fontSize: '12px',
                  color: '#ffffff',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontFamily: 'monospace',
                  outline: 'none',
                }}
                title="Quantidade de dados a serem rolados"
              />
            </div>

            {/* Botão Rolar perfeitamente alinhado com os inputs */}
            <button
              type="submit"
              className="hover:opacity-90 active:scale-95 transition-all"
              style={{
                height: '32px',
                padding: '0 18px',
                background: '#f59e0b',
                color: '#020617',
                fontSize: '12px',
                fontWeight: 'bold',
                borderRadius: '7px',
                border: 'none',
                cursor: 'pointer',
                flexShrink: 0,
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              Rolar
            </button>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
};
