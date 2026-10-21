import React, { useState, useMemo, useEffect } from 'react';
import { Sun, Sparkles, Check, X, AlertCircle } from 'lucide-react';
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
  // Coleta todos os itens de mana de cada personagem (apenas personagens de jogadores)
  const charManaList: CharManaItems[] = useMemo(() => {
    return (players || [])
      .filter((p) => p.characterType === 'player' || !p.characterType)
      .map((char) => {
        const manaItems = (char.extraItems || []).filter(isManaItem);
        return { char, items: manaItems };
      })
      .filter((entry) => entry.items.length > 0);
  }, [players]);

  // Mapa de IDs selecionados por Personagem: { [charId]: Set<itemId> }
  const [selectedItems, setSelectedItems] = useState<{ [charId: string]: Set<string> }>({});

  // Inicializa a seleção com todos os itens marcados por padrão ao abrir
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-950/40 via-slate-900 to-cyan-950/40 border-b border-amber-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-sm">
              <Sun size={20} className="animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2.5">
                <span>Passar o Dia</span>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-950/90 text-cyan-300 border border-cyan-700/60 font-bold">
                  Recarga +1 Mana
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Recuperação de pontos de mana nos Itens Extras & Recursos dos Personagens
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Info Banner */}
        <div className="px-6 py-3 bg-slate-950/70 border-b border-slate-800/80 text-xs text-slate-300 flex items-start gap-2.5">
          <Sparkles size={15} className="text-cyan-400 shrink-0 mt-0.5" />
          <span className="leading-relaxed">
            Ao confirmar, cada item selecionado receberá <strong>+1 ponto</strong> de mana atual (limitado à capacidade máxima do item). Você pode desmarcar itens individualmente para não atualizá-los.
          </span>
        </div>

        {/* Content list (2 colunas de personagens) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar">
          {charManaList.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2.5">
              <AlertCircle size={32} className="mx-auto text-slate-500" />
              <p className="text-sm font-semibold text-slate-300">
                Nenhum Item de Mana encontrado nos Personagens
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Cadastre itens com o tipo ou categoria "Mana" na ficha dos Personagens para gerenciá-los nesta janela.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {charManaList.map(({ char, items }) => {
                const charSelectedSet = selectedItems[char.id] || new Set();
                const allCharSelected = items.every((it) => charSelectedSet.has(it.id));

                return (
                  <div
                    key={char.id}
                    className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3 shadow-md hover:border-slate-750 transition-colors"
                  >
                    {/* Header do Personagem */}
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-950/90 border border-emerald-600/60 flex items-center justify-center text-emerald-300 text-xs font-bold shrink-0">
                          {char.name?.charAt(0)?.toUpperCase() || 'P'}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs sm:text-sm font-bold text-white block truncate">
                            {char.name}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {items.length} {items.length === 1 ? 'recurso de mana' : 'recursos de mana'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleAllForChar(char.id, items)}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold transition-colors shrink-0 cursor-pointer"
                      >
                        {allCharSelected ? 'Desmarcar todos' : 'Marcar todos'}
                      </button>
                    </div>

                    {/* Lista de Itens de Mana do Personagem */}
                    <div className="space-y-2">
                      {items.map((item) => {
                        const isSelected = charSelectedSet.has(item.id);
                        const isFull = (item.current ?? 0) >= (item.max ?? 0);
                        const nextValue = Math.min((item.current ?? 0) + 1, item.max || ((item.current ?? 0) + 1));

                        return (
                          <div
                            key={item.id}
                            onClick={() => toggleItem(char.id, item.id)}
                            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs cursor-pointer transition-all select-none gap-3 ${
                              isSelected
                                ? 'bg-cyan-950/25 border-cyan-500/60 text-cyan-100 shadow-sm'
                                : 'bg-slate-900/40 border-slate-800/80 text-slate-400 opacity-60 hover:opacity-90'
                            }`}
                          >
                            {/* Checkbox e Nome do Item */}
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <span className="font-semibold block truncate text-slate-100">
                                  {item.name}
                                </span>
                                {item.notes && (
                                  <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                                    {item.notes}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Valores e Badges */}
                            <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                              <span className="text-slate-400">{item.current ?? 0}</span>
                              <span className="text-slate-600">➔</span>
                              <span
                                className={`font-bold ${
                                  isFull ? 'text-emerald-400' : 'text-amber-400'
                                }`}
                              >
                                {nextValue}/{item.max}
                              </span>
                              {isFull ? (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold tracking-wider">
                                  Cheio
                                </span>
                              ) : (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-950 text-amber-300 border border-amber-800 font-black">
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
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-950 border-t border-slate-800">
          <span className="text-xs text-slate-400 font-medium">
            <strong className="text-white">{selectedCount}</strong> de {totalManaItems} itens selecionados
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedCount === 0 || charManaList.length === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-slate-950 text-xs font-bold rounded-lg transition-all shadow-md active:scale-95 cursor-pointer"
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
