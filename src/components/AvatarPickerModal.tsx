import React, { useState, useRef } from 'react';
import { PRESET_AVATARS } from './NpcAvatar';
import { Upload, Link as LinkIcon, Trash2, X, Check } from 'lucide-react';

interface AvatarPickerModalProps {
  currentAvatar?: string;
  currentPreset?: string;
  npcName: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (avatarDataUrl: string, preset: string) => void;
}

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  currentAvatar,
  currentPreset = 'warrior',
  npcName,
  isOpen,
  onClose,
  onSave,
}) => {
  const [selectedPreset, setSelectedPreset] = useState(currentPreset);
  const [customAvatar, setCustomAvatar] = useState(currentAvatar || '');
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 3MB for good localStorage performance)
    if (file.size > 3 * 1024 * 1024) {
      alert('A imagem é muito grande. Escolha uma imagem de até 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setCustomAvatar(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = () => {
    if (urlInput.trim()) {
      setCustomAvatar(urlInput.trim());
      setUrlInput('');
    }
  };

  const handleConfirm = () => {
    onSave(customAvatar, selectedPreset);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-750 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white">
            Foto / Token de <span className="text-amber-400">{npcName}</span>
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current Preview */}
        <div className="flex items-center gap-4 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
          <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-700 shrink-0 flex items-center justify-center bg-slate-900">
            {customAvatar ? (
              <img
                src={customAvatar}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs text-slate-500">Preset ativo</span>
            )}
          </div>
          <div className="flex-1 text-xs text-slate-300">
            {customAvatar ? (
              <div className="flex items-center gap-2">
                <span>Imagem personalizada ativa</span>
                <button
                  onClick={() => setCustomAvatar('')}
                  className="flex items-center gap-1 text-rose-400 hover:text-rose-300 ml-auto"
                >
                  <Trash2 size={13} />
                  <span>Remover</span>
                </button>
              </div>
            ) : (
              <span>Usando ícone temático de RPG</span>
            )}
          </div>
        </div>

        {/* Option 1: File Upload */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 block">
            1. Enviar foto do computador (Upload)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg transition-colors"
            >
              <Upload size={14} className="text-amber-400" />
              <span>Escolher Arquivo do Computador...</span>
            </button>
          </div>
        </div>

        {/* Option 2: Image URL */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 block">
            2. Ou colar link de imagem (URL)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="url"
              placeholder="https://exemplo.com/token.jpg"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <button
              onClick={handleApplyUrl}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700"
            >
              <LinkIcon size={13} />
              <span>Aplicar</span>
            </button>
          </div>
        </div>

        {/* Option 3: Presets categorizados */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-300 block">
            3. Ou escolher um Token Temático de RPG:
          </label>

          {/* Criaturas, Goblins, Orcs e Feras */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
              👾 Criaturas, Feras & Monstros (Goblin, Orcs, Lobos, Feras...)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {PRESET_AVATARS.filter((p) => p.category === 'creature').map((p) => {
                const Icon = p.icon;
                const isSelected = selectedPreset === p.id && !customAvatar;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedPreset(p.id);
                      setCustomAvatar('');
                    }}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'bg-amber-950/50 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-md bg-gradient-to-br ${p.bg} flex items-center justify-center shrink-0 border ${p.border}`}
                    >
                      <Icon size={14} className="text-white" />
                    </div>
                    <span className="text-[11px] truncate font-medium">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Humanoides & Heróis */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              ⚔️ Combatentes & Heróis Medievais
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto pr-1">
              {PRESET_AVATARS.filter((p) => p.category === 'humanoid').map((p) => {
                const Icon = p.icon;
                const isSelected = selectedPreset === p.id && !customAvatar;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedPreset(p.id);
                      setCustomAvatar('');
                    }}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'bg-amber-950/50 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-md bg-gradient-to-br ${p.bg} flex items-center justify-center shrink-0 border ${p.border}`}
                    >
                      <Icon size={14} className="text-white" />
                    </div>
                    <span className="text-[11px] truncate font-medium">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg shadow-sm"
          >
            <Check size={14} />
            <span>Salvar Foto</span>
          </button>
        </div>
      </div>
    </div>
  );
};
