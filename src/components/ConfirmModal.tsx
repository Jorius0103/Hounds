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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className={`relative w-full ${secondaryConfirmText ? 'max-w-md' : 'max-w-sm'} bg-slate-900 border border-slate-750 rounded-2xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150`}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          title="Fechar"
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              isDanger
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
            }`}
          >
            {isDanger ? <Trash2 size={20} /> : <AlertTriangle size={20} />}
          </div>
          <div className="min-w-0 pr-6">
            <h4 className="text-sm font-bold text-white">{title}</h4>
            <div className="text-xs text-slate-300 mt-1 leading-relaxed">
              {message}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80 flex-wrap">
          {secondaryConfirmText && onSecondaryConfirm && (
            <button
              type="button"
              onClick={onSecondaryConfirm}
              className="mr-auto px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 bg-transparent hover:bg-slate-800/80 border border-slate-750 rounded-xl transition-colors"
            >
              {secondaryConfirmText}
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 rounded-xl transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
            }}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl shadow transition-colors ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

