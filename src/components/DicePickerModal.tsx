import React, { useState, useEffect } from 'react';
import { X, Dices } from 'lucide-react';

export interface DicePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoll: (count: number, sides: number) => void;
}

// Crisp geometric SVG icons for each polyhedral die (matching Roll20 silhouettes)
const DieIcon: React.FC<{ sides: number; size?: number; className?: string }> = ({ sides, size = 18, className = '' }) => {
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

const QUANTITIES = [2, 3, 4, 5, 6];

export const DicePickerModal: React.FC<DicePickerModalProps> = ({
  isOpen,
  onClose,
  onRoll,
}) => {
  const [customCount, setCustomCount] = useState<number>(1);
  const [customSides, setCustomSides] = useState<number>(6);

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
    const count = Math.max(1, Math.min(100, Number(customCount) || 1));
    const sides = Math.max(2, Math.min(1000, Number(customSides) || 6));
    handleRollClick(count, sides);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-[340px] bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden font-sans select-none animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-amber-400">
              <Dices size={16} />
            </span>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Rolar Dados
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Dice Rows (Roll20 Grid Style) */}
        <div className="divide-y divide-slate-800/80 bg-slate-900">
          {DICE_TYPES.map((die) => (
            <div
              key={die.sides}
              className="flex items-center hover:bg-slate-800/40 transition-colors"
            >
              {/* Left Column: Die Icon + Name (Rolls 1 Die on click) */}
              <button
                type="button"
                onClick={() => handleRollClick(1, die.sides)}
                className="flex items-center gap-2 px-3.5 py-2.5 text-slate-200 hover:text-amber-300 font-bold text-xs flex-1 transition-colors group cursor-pointer text-left"
                title={`Rolar 1${die.name}`}
              >
                <DieIcon
                  sides={die.sides}
                  size={18}
                  className="text-slate-400 group-hover:text-amber-400 transition-colors shrink-0"
                />
                <span className="font-mono text-xs tracking-wide">
                  {die.name}
                </span>
                <span className="text-[10px] text-slate-500 font-normal ml-auto mr-1 group-hover:text-amber-400/80">
                  (1)
                </span>
              </button>

              {/* Right Columns: Quantities 2, 3, 4, 5, 6 with vertical dividers */}
              <div className="flex items-center shrink-0 border-l border-slate-800">
                {QUANTITIES.map((qty) => (
                  <button
                    key={qty}
                    type="button"
                    onClick={() => handleRollClick(qty, die.sides)}
                    className="w-8 h-9 flex items-center justify-center text-xs font-mono font-bold text-slate-300 hover:text-slate-950 hover:bg-amber-400 transition-all border-l first:border-l-0 border-slate-800/80 cursor-pointer"
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
        <form
          onSubmit={handleCustomSubmit}
          className="p-3 bg-slate-950/90 border-t border-slate-800 flex items-center gap-2"
        >
          <span className="text-[11px] font-bold text-slate-400 shrink-0">
            Outro:
          </span>
          <div className="flex items-center gap-1.5 flex-1">
            <input
              type="number"
              min="1"
              max="50"
              value={customCount}
              onChange={(e) => setCustomCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-12 bg-slate-900 border border-slate-750 rounded-lg px-2 py-1 text-xs text-white text-center font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
              title="Quantidade de dados"
            />
            <span className="text-xs font-bold text-amber-400 font-mono">D</span>
            <input
              type="number"
              min="2"
              max="1000"
              value={customSides}
              onChange={(e) => setCustomSides(Math.max(2, parseInt(e.target.value, 10) || 2))}
              className="w-14 bg-slate-900 border border-slate-750 rounded-lg px-2 py-1 text-xs text-white text-center font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
              title="Lados do dado (ex: 4, 6, 8, 10, 12, 20, 100)"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-xs font-bold rounded-lg transition-all shadow cursor-pointer shrink-0"
          >
            Rolar
          </button>
        </form>
      </div>
    </div>
  );
};
