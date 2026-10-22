import React, { useState, useMemo, useEffect } from 'react';
import { Sun, Sparkles, Check, X, AlertCircle } from 'lucide-react';
import { NPC, ExtraItem } from '../types/rpg';

interface PassDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: NPC[];
  onConfirm: (selectedItemIdsByChar: { [charId: string]: string[] }, days: number) => void;
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
  const [days, setDays] = useState<number>(1);

  // Inicializa a seleção com todos os itens marcados por padrão ao abrir
  useEffect(() => {
    if (isOpen) {
      setDays(1);
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
    onConfirm(result, Math.max(1, days || 1));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header (Fixo / shrink-0) */}
        <div className="shrink-0 flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-amber-950/40 via-slate-900 to-cyan-950/40 border-b border-amber-500/25">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-sm shrink-0">
              <Sun size={18} className="animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Passar o Dia</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/90 text-cyan-300 border border-cyan-700/60 font-bold">
                  Recarga +{days} Mana
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
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Info Banner & Campo de Dias (Fixo / shrink-0) */}
        <div className="shrink-0 px-5 py-2.5 bg-slate-950/70 border-b border-slate-800/80 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Sparkles size={14} className="text-cyan-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              Ao confirmar, cada item selecionado receberá <strong>+{days} ponto{days > 1 ? 's' : ''}</strong> de mana (limitado ao máximo).
            </span>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/90 border border-amber-500/40 px-3 py-1.5 rounded-xl shadow-inner">
            <label htmlFor="passDayInput" className="text-xs font-bold text-amber-400 whitespace-nowrap">
              Passar Dias:
            </label>
            <input
              id="passDayInput"
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setDays(isNaN(val) || val < 1 ? 1 : val);
              }}
              className="w-16 bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-lg px-2 py-1 text-center text-xs font-mono font-bold text-white focus:outline-none"
            />
          </div>
        </div>

        {/* Content list com rolagem */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {charManaList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <AlertCircle size={28} className="mx-auto text-slate-500" />
              <p className="text-sm font-semibold text-slate-300">
                Nenhum Item de Mana encontrado nos Personagens
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
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
                  className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2.5 shadow-sm"
                >
                  {/* Header do Personagem */}
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <div className="w-6 h-6 rounded-lg bg-emerald-950/90 border border-emerald-600/60 flex items-center justify-center text-emerald-300 text-xs font-bold shrink-0">
                        {char.name?.charAt(0)?.toUpperCase() || 'P'}
                      </div>
                      <span className="text-xs font-bold text-white truncate">
                        {char.name}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        ({items.length} {items.length === 1 ? 'item' : 'itens'})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleAllForChar(char.id, items)}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold transition-colors shrink-0 cursor-pointer"
                    >
                      {allCharSelected ? 'Desmarcar todos' : 'Marcar todos'}
                    </button>
                  </div>

                  {/* Itens de Mana em 2 colunas proporcionais */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {items.map((item) => {
                      const isSelected = charSelectedSet.has(item.id);
                      const isFull = (item.current ?? 0) >= (item.max ?? 0);
                      const nextValue = Math.min((item.current ?? 0) + days, item.max || ((item.current ?? 0) + days));

                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleItem(char.id, item.id)}
                          className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all select-none gap-2 ${
                            isSelected
                              ? 'bg-cyan-950/30 border-cyan-500/70 text-cyan-100 shadow-xs'
                              : 'bg-slate-900/50 border-slate-800 text-slate-400 opacity-60 hover:opacity-90'
                          }`}
                        >
                          {/* Checkbox e Nome do Item (perto dos números) */}
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-3.5 h-3.5 rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <span className="font-semibold block truncate text-slate-100">
                                {item.name}
                              </span>
                              {item.notes && (
                                <span className="text-[10px] text-slate-400 block truncate leading-tight">
                                  {item.notes}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Valores numéricos e Badge */}
                          <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
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
                              <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-medium">
                                Cheio
                              </span>
                            ) : (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                                +{days}
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

        {/* Footer (Fixo / shrink-0 / z-10 com proteção contra cortes) */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-3 bg-slate-950 border-t border-slate-800">
          <span className="text-xs text-slate-400 font-medium truncate">
            <strong className="text-white">{selectedCount}</strong> de {totalManaItems} itens selecionados
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedCount === 0 || charManaList.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-slate-950 text-xs font-bold rounded-lg transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Check size={14} strokeWidth={2.5} />
              <span>Confirmar (+{days} Mana{days > 1 ? ` · ${days} Dias` : ''})</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
