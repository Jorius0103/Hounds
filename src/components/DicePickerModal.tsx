import React, { useState, useEffect, useRef } from 'react';
import { X, Dices } from 'lucide-react';

export interface DicePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoll: (count: number, sides: number) => void;
}

// Crisp geometric SVG icons for each polyhedral die
const DieIcon: React.FC<{ sides: number; size?: number; className?: string }> = ({ sides, size = 16, className = '' }) => {
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

  return (
    <>
      {/* Invisible backdrop to capture clicks outside */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Popover Card anchored right below the button */}
      <div
        ref={popoverRef}
        className="absolute right-0 top-full mt-1.5 z-50 w-[300px] bg-slate-900 border border-slate-750 rounded-xl shadow-2xl overflow-hidden font-sans select-none animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-950/90 border-b border-slate-800">
          <div className="flex items-center gap-1.5 text-amber-400">
            <Dices size={14} />
            <h3 className="text-[11px] font-bold text-white uppercase tracking-wider">
              Rolar Dados
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X size={14} />
          </button>
        </div>

        {/* Dice Rows */}
        <div className="divide-y divide-slate-800/80 bg-slate-900">
          {DICE_TYPES.map((die) => (
            <div
              key={die.sides}
              className="flex items-center px-2.5 py-1.5 hover:bg-slate-800/40 transition-colors"
            >
              {/* Die Badge */}
              <div className="flex items-center gap-1.5 w-16 shrink-0">
                <DieIcon
                  sides={die.sides}
                  size={15}
                  className="text-amber-400 shrink-0"
                />
                <span className="font-mono text-xs font-bold text-slate-200">
                  {die.name}
                </span>
              </div>

              {/* Identical Quantity Buttons 1 to 6 */}
              <div className="flex items-center gap-1 flex-1 justify-end">
                {QUANTITIES.map((qty) => (
                  <button
                    key={qty}
                    type="button"
                    onClick={() => handleRollClick(qty, die.sides)}
                    className="w-7 h-7 flex items-center justify-center text-xs font-mono font-bold text-slate-200 bg-slate-950 hover:bg-amber-400 hover:text-slate-950 rounded border border-slate-800 hover:border-amber-400 transition-all cursor-pointer shadow-xs active:scale-95"
                    title={`Rolar ${qty}${die.name}`}
                  >
                    {qty}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Custom Roll Bar */}
        <div className="p-2.5 bg-slate-950/90 border-t border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Personalizado</span>
          </div>
          <form onSubmit={handleCustomSubmit} className="flex items-end gap-2">
            <div className="flex items-center gap-2 flex-1">
              {/* 1º: Seleção de Dados em Lista Suspensa na frente da Quantidade */}
              <div className="flex flex-col flex-1">
                <label className="text-[9px] text-slate-400 font-semibold mb-0.5">Dado</label>
                <select
                  value={customSides}
                  onChange={(e) => setCustomSides(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg px-2 py-1 text-xs text-amber-300 font-bold font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                >
                  {DICE_TYPES.map((die) => (
                    <option key={die.sides} value={die.sides} className="bg-slate-900 text-white font-mono">
                      {die.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2º: Input de Quantidade funcionando livremente */}
              <div className="flex flex-col w-20 shrink-0">
                <label className="text-[9px] text-slate-400 font-semibold mb-0.5">Quantidade</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={customCount}
                  onChange={(e) => setCustomCount(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10) || 1))}
                  onBlur={() => {
                    if (!customCount || Number(customCount) < 1) setCustomCount(1);
                  }}
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg px-2 py-1 text-xs text-white text-center font-mono font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
                  title="Quantidade de dados a serem rolados"
                />
              </div>
            </div>
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-xs font-bold rounded-lg transition-all shadow cursor-pointer shrink-0"
            >
              Rolar
            </button>
          </form>
        </div>
      </div>
    </>
  );
};
