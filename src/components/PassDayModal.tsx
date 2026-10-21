import React, { useState, useMemo, useEffect } from 'react';
import { Sun, Sparkles, Check, X, Shield, AlertCircle } from 'lucide-react';
import { NPC, ExtraItem } from '../types/rpg';

interface PassDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: NPC[];
  onConfirm: (selectedItemIdsByChar: { [charId: string]: string[] }) => void;
}

interface CharManaItems {
  char: NPC;
  items: ExtraItem[];
}

function isManaItem(item: ExtraItem): boolean {
  if (!item) return false;
  if (item.category === 'mana') return true;
  const name = (item.name || '').toLowerCase();
  return name.includes('mana') || name.includes('pedra de mana') || name.includes('energia');
}

export const PassDayModal: React.FC<PassDayModalProps> = ({
  isOpen,
  onClose,
  players,
  onConfirm,
}) => {
  // Coleta todos os itens de mana de cada personagem
  const charManaList: CharManaItems[] = useMemo(() => {
    return players
      .filter((p) => p.characterType === 'player' || !p.characterType)
      .map((char) => {
        const manaItems = (char.extraItems || []).filter(isManaItem);
        return { char, items: manaItems };
      })
      .filter((entry) => entry.items.length > 0);
  }, [players]);

  // Mapa de IDs selecionados por Personagem: { [charId]: Set<itemId> }
  const [selectedItems, setSelectedItems] = useState<{ [charId: string]: Set<string> }>({});

  // Inicializa a seleção com todos os itens marcados por padrão
  useEffect(() => {
    if (isOpen) {
      const initial: { [charId: string]: Set<string> } = {};
      charManaList.forEach(({ char, items }) => {
        initial[char.id] = new Set(items.map((it) => it.id));
      });
      setSelectedItems(initial);
    }
  }, [isOpen, charManaList]);

  if (!isOpen) return null;

  const toggleItem = (charId: string, itemId: string) => {
    setSelectedItems((prev) => {
      const currentSet = new Set(prev[charId] || []);
      if (currentSet.has(itemId)) {
        currentSet.delete(itemId);
      } else {
        currentSet.add(itemId);
      }
      return { ...prev, [charId]: currentSet };
    });
  };

  const toggleAllForChar = (charId: string, items: ExtraItem[]) => {
    setSelectedItems((prev) => {
      const currentSet = prev[charId] || new Set();
      const allSelected = items.every((it) => currentSet.has(it.id));
      const nextSet = allSelected ? new Set<string>() : new Set(items.map((it) => it.id));
      return { ...prev, [charId]: nextSet };
    });
  };

  const totalManaItems = charManaList.reduce((acc, c) => acc + c.items.length, 0);
  const selectedCount = Object.values(selectedItems).reduce((acc, set) => acc + set.size, 0);

  const handleConfirm = () => {
    const result: { [charId: string]: string[] } = {};
    Object.entries(selectedItems).forEach(([charId, set]) => {
      result[charId] = Array.from(set);
    });
    onConfirm(result);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-slate-900 border border-amber-500/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-amber-950/40 via-slate-900 to-cyan-950/40 border-b border-amber-500/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-xs">
              <Sun size={18} className="animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Passar o Dia</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/90 text-cyan-300 border border-cyan-700/60 font-bold">
                  Recarga +1 Mana
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Itens Extras & Recursos com tipo Mana dos Personagens
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Info Banner */}
        <div className="px-5 py-2.5 bg-slate-950/60 border-b border-slate-800/80 text-xs text-slate-300 flex items-start gap-2">
          <Sparkles size={14} className="text-cyan-400 shrink-0 mt-0.5" />
          <span>
            Ao confirmar, os itens selecionados abaixo receberão <strong>+1 ponto</strong> de mana atual (limitado ao valor total do item). Desmarque os itens que você não deseja atualizar.
          </span>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
          {charManaList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <AlertCircle size={28} className="mx-auto text-slate-500" />
              <p className="text-sm font-semibold text-slate-300">
                Nenhum Item de Mana encontrado nos Personagens
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Cadastre itens com a categoria "Mana" na seção de Itens Extras & Recursos dos Personagens para recarregá-los aqui.
              </p>
            </div>
          ) : (
            charManaList.map(({ char, items }) => {
              const charSelectedSet = selectedItems[char.id] || new Set();
              const allCharSelected = items.every((it) => charSelectedSet.has(it.id));

              return (
                <div
                  key={char.id}
                  className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2"
                >
                  {/* Personagem Header */}
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-emerald-950/80 border border-emerald-600/60 flex items-center justify-center text-emerald-400 text-xs font-bold">
                        {char.name?.charAt(0)?.toUpperCase() || 'P'}
                      </div>
                      <span className="text-xs font-bold text-white">{char.name}</span>
                      <span className="text-[10px] text-slate-500">
                        ({items.length} {items.length === 1 ? 'item' : 'itens'})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleAllForChar(char.id, items)}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
                    >
                      {allCharSelected ? 'Desmarcar todos' : 'Marcar todos'}
                    </button>
                  </div>

                  {/* Itens de Mana */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {items.map((item) => {
                      const isSelected = charSelectedSet.has(item.id);
                      const isFull = item.current >= item.max;
                      const nextValue = Math.min(item.current + 1, item.max);

                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleItem(char.id, item.id)}
                          className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all select-none ${
                            isSelected
                              ? 'bg-cyan-950/30 border-cyan-600/70 text-cyan-200 shadow-xs'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400 opacity-60 hover:opacity-90'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // tratado no onClick do container
                              className="w-3.5 h-3.5 rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                            />
                            <div className="truncate">
                              <span className="font-semibold block truncate text-slate-200">
                                {item.name}
                              </span>
                              {item.notes && (
                                <span className="text-[10px] text-slate-500 block truncate">
                                  {item.notes}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                            <span className="text-slate-400">{item.current}</span>
                            <span className="text-slate-600">➔</span>
                            <span
                              className={`font-bold ${
                                isFull ? 'text-emerald-400' : 'text-amber-400'
                              }`}
                            >
                              {nextValue}/{item.max}
                            </span>
                            {isFull ? (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                                Cheio
                              </span>
                            ) : (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                                +1
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-950 border-t border-slate-800">
          <span className="text-xs text-slate-400">
            {selectedCount} de {totalManaItems} itens selecionados
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedCount === 0 || charManaList.length === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-slate-950 text-xs font-bold rounded-lg transition-all shadow-md active:scale-95"
            >
              <Check size={14} strokeWidth={2.5} />
              <span>Confirmar (+1 Mana)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
