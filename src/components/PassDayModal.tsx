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
  const [showFullItems, setShowFullItems] = useState<boolean>(false);

  // Inicializa a seleção marcando por padrão apenas itens que NÃO estão cheios
  useEffect(() => {
    if (isOpen) {
      setDays(1);
      setShowFullItems(false);
      const initial: { [charId: string]: Set<string> } = {};
      charManaList.forEach(({ char, items }) => {
        const needRecharge = items.filter((it) => (it.current ?? 0) < (it.max ?? 0));
        initial[char.id] = new Set(needRecharge.map((it) => it.id));
      });
      setSelectedItems(initial);
    }
  }, [isOpen, charManaList]);

  if (!isOpen) return null;

  const toggleItem = (charId: string, item: ExtraItem) => {
    const isFull = (item.current ?? 0) >= (item.max ?? 0);
    if (isFull) return; // Itens já cheios não são selecionáveis para recarga

    setSelectedItems((prev) => {
      const currentSet = new Set(prev[charId] || []);
      if (currentSet.has(item.id)) {
        currentSet.delete(item.id);
      } else {
        currentSet.add(item.id);
      }
      return { ...prev, [charId]: currentSet };
    });
  };

  const toggleAllForChar = (charId: string, items: ExtraItem[]) => {
    const rechargeableItems = items.filter((it) => (it.current ?? 0) < (it.max ?? 0));
    if (rechargeableItems.length === 0) return;

    setSelectedItems((prev) => {
      const currentSet = prev[charId] || new Set();
      const allSelected = rechargeableItems.every((it) => currentSet.has(it.id));
      const nextSet = allSelected
        ? new Set<string>()
        : new Set(rechargeableItems.map((it) => it.id));
      return { ...prev, [charId]: nextSet };
    });
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-amber-500/35 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header limpo com título elegante */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 border-b border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-sm shrink-0">
              <Sun size={20} className="animate-spin-slow" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Passar o Dia
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Fechar"
          >
            <X size={19} />
          </button>
        </div>

        {/* Subheader / Barra de Controles e Filtro */}
        <div className="shrink-0 px-6 py-3 bg-slate-950/80 border-b border-slate-800/80 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[220px]">
            <Sparkles size={14} className="text-amber-400 shrink-0" />
            <span className="leading-relaxed text-slate-300">
              Ao avançar o dia, cada item selecionado recupera mana até o seu limite.
            </span>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Checkbox para mostrar itens já cheios */}
            <label className="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer select-none transition-colors">
              <input
                type="checkbox"
                checked={showFullItems}
                onChange={(e) => setShowFullItems(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-amber-500 accent-amber-500 focus:ring-0 cursor-pointer"
              />
              <span className="text-[11px] font-medium text-slate-300">Mostrar itens já cheios</span>
            </label>

            {/* Input de Dias */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-750 px-3 py-1.5 rounded-xl shadow-inner">
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
                className="w-14 bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-lg px-2 py-1 text-center text-xs font-mono font-bold text-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Lista de Personagens e seus Itens */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 custom-scrollbar">
          {charManaList.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2.5">
              <AlertCircle size={32} className="mx-auto text-slate-500" />
              <p className="text-sm font-semibold text-slate-200">
                Nenhum Item de Mana encontrado nos Personagens
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Cadastre itens com categoria "Mana" na seção de Itens Extras & Recursos dos Personagens para recarregá-los aqui.
              </p>
            </div>
          ) : (
            charManaList.map(({ char, items }) => {
              const charSelectedSet = selectedItems[char.id] || new Set();
              const fullItems = items.filter((it) => (it.current ?? 0) >= (it.max ?? 0));
              const rechargeableItems = items.filter((it) => (it.current ?? 0) < (it.max ?? 0));
              const visibleItems = showFullItems ? items : rechargeableItems;
              const allRechargeableSelected =
                rechargeableItems.length > 0 &&
                rechargeableItems.every((it) => charSelectedSet.has(it.id));

              return (
                <div
                  key={char.id}
                  className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 space-y-3 shadow-sm hover:border-slate-750 transition-colors"
                >
                  {/* Header do Personagem */}
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-950/90 border border-emerald-600/60 flex items-center justify-center text-emerald-300 text-xs font-bold shrink-0">
                        {char.name?.charAt(0)?.toUpperCase() || 'P'}
                      </div>
                      <span className="text-sm font-bold text-white truncate">
                        {char.name}
                      </span>
                      <span className="text-xs text-slate-400 shrink-0">
                        ({rechargeableItems.length} para recarga
                        {fullItems.length > 0 ? ` · ${fullItems.length} cheio${fullItems.length > 1 ? 's' : ''}` : ''})
                      </span>
                    </div>

                    {rechargeableItems.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleAllForChar(char.id, items)}
                        className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold transition-colors shrink-0 cursor-pointer"
                      >
                        {allRechargeableSelected ? 'Desmarcar todos' : 'Marcar todos'}
                      </button>
                    )}
                  </div>

                  {/* Caso todos os itens estejam cheios e o checkbox esteja desmarcado */}
                  {visibleItems.length === 0 ? (
                    <div className="flex items-center justify-between py-2.5 px-3.5 bg-slate-900/40 rounded-xl border border-slate-800/60 text-xs text-slate-400">
                      <span className="italic flex items-center gap-2">
                        <Check size={14} className="text-emerald-400 shrink-0" />
                        Todos os itens de mana já estão com a capacidade máxima.
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 rounded-md font-sans">
                        ✓ 100% Cheio
                      </span>
                    </div>
                  ) : (
                    /* Grade de Itens com espaço generoso */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {visibleItems.map((item) => {
                        const isFull = (item.current ?? 0) >= (item.max ?? 0);
                        const isSelected = charSelectedSet.has(item.id);
                        const curVal = item.current ?? 0;
                        const maxVal = item.max ?? curVal;
                        const potentialGain = isFull ? 0 : Math.min(days, maxVal - curVal);
                        const nextValue = Math.min(curVal + days, maxVal);

                        return (
                          <div
                            key={item.id}
                            onClick={() => !isFull && toggleItem(char.id, item)}
                            className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all select-none gap-3 ${
                              isFull
                                ? 'bg-slate-950/40 border-slate-800/70 text-slate-400 opacity-70 cursor-default'
                                : isSelected
                                ? 'bg-amber-950/20 border-amber-500/60 text-amber-100 shadow-sm cursor-pointer hover:border-amber-400'
                                : 'bg-slate-900/60 border-slate-800/80 text-slate-400 opacity-65 hover:opacity-95 cursor-pointer'
                            }`}
                          >
                            {/* Checkbox e Nome do Item */}
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={isFull}
                                onChange={() => {}}
                                className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 accent-amber-500 focus:ring-0 cursor-pointer disabled:cursor-not-allowed shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <span
                                  className={`font-semibold block truncate ${
                                    isFull ? 'text-slate-400' : 'text-slate-100'
                                  }`}
                                  title={item.name}
                                >
                                  {item.name}
                                </span>
                                {item.notes && (
                                  <span
                                    className="text-[10px] text-slate-400 block truncate mt-0.5 leading-tight"
                                    title={item.notes}
                                  >
                                    {item.notes}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Valores numéricos e Badge */}
                            <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                              <span className="text-slate-400">{curVal}</span>
                              <span className="text-slate-600">→</span>
                              <span
                                className={`font-bold ${
                                  isFull ? 'text-emerald-400' : 'text-amber-300'
                                }`}
                              >
                                {isFull ? `${curVal}/${maxVal}` : `${nextValue}/${maxVal}`}
                              </span>
                              {isFull ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-semibold font-sans">
                                  Cheio
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/40 font-bold font-sans">
                                  +{potentialGain}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer elegante e espaçoso */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-6 py-3.5 bg-slate-950 border-t border-slate-800">
          <span className="text-xs text-slate-300 font-medium truncate">
            <strong className="text-amber-400 font-bold">{selectedCount}</strong>{' '}
            {selectedCount === 1 ? 'item selecionado' : 'itens selecionados'} para recarga
          </span>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedCount === 0 || charManaList.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Check size={15} strokeWidth={2.5} />
              <span>Confirmar (+{days} Mana{days > 1 ? ` · ${days} Dias` : ''})</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
