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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center select-none"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        background: 'rgba(2, 6, 23, 0.85)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
    >
      <div
        className="relative flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        style={{
          position: 'relative',
          margin: 'auto',
          width: '100%',
          maxWidth: '620px',
          maxHeight: '78vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#0f172a',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '18px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
          overflow: 'hidden',
        }}
      >
        {/* Header limpo com respiro nos cantos */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid rgba(245, 158, 11, 0.2)',
            background: 'linear-gradient(to right, rgba(69, 26, 3, 0.3), #0f172a, #0f172a)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fbbf24',
                flexShrink: 0,
              }}
            >
              <Sun size={18} className="animate-spin-slow" />
            </div>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>
              Passar o Dia
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            style={{
              padding: '6px',
              borderRadius: '8px',
              cursor: 'pointer',
              flexShrink: 0,
              background: 'transparent',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Subheader / Barra de Controles e Filtro */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 20px',
            background: 'rgba(2, 6, 23, 0.8)',
            borderBottom: '1px solid rgba(51, 65, 85, 0.8)',
            gap: '12px',
            fontSize: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 180px', minWidth: '180px' }}>
            <Sparkles size={14} style={{ color: '#fbbf24', flexShrink: 0 }} />
            <span style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: '1.4' }}>
              Itens selecionados recuperam mana.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Checkbox para mostrar itens já cheios */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                color: '#cbd5e1',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={showFullItems}
                onChange={(e) => setShowFullItems(e.target.checked)}
                className="accent-amber-500 cursor-pointer"
                style={{ width: '14px', height: '14px', cursor: 'pointer' }}
              />
              <span>Mostrar cheios</span>
            </label>

            {/* Input de Dias */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#0f172a',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                padding: '4px 8px',
                borderRadius: '8px',
              }}
            >
              <label htmlFor="passDayInput" style={{ fontSize: '11px', fontWeight: 'bold', color: '#fbbf24', whiteSpace: 'nowrap' }}>
                Dias:
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
                style={{
                  width: '44px',
                  background: '#020617',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '2px 4px',
                  textAlign: 'center',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  color: '#ffffff',
                  outline: 'none',
                }}
              />
            </div>
          </div>
        </div>

        {/* Lista de Personagens e seus Itens - com minHeight: 0 para garantir scroll sem estourar altura */}
        <div
          className="custom-scrollbar"
          style={{
            flex: '1 1 auto',
            minHeight: 0,
            overflowY: 'auto',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {charManaList.length === 0 ? (
            <div style={{ padding: '36px 0', textAlign: 'center', color: '#94a3b8' }}>
              <AlertCircle size={28} style={{ margin: '0 auto 8px', color: '#64748b' }} />
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', margin: '0 0 4px' }}>
                Nenhum Item de Mana encontrado nos Personagens
              </p>
              <p style={{ fontSize: '11px', color: '#64748b', maxWidth: '360px', margin: '0 auto', lineHeight: '1.4' }}>
                Cadastre itens com a categoria "Mana" na seção de Itens Extras & Recursos dos Personagens para recarregá-los aqui.
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
                  style={{
                    background: 'rgba(2, 6, 23, 0.7)',
                    border: '1px solid #1e293b',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  {/* Header do Personagem com respiro */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingBottom: '8px',
                      borderBottom: '1px solid rgba(51, 65, 85, 0.6)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          background: 'rgba(6, 78, 59, 0.9)',
                          border: '1px solid rgba(5, 150, 105, 0.6)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#6ee7b7',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          flexShrink: 0,
                        }}
                      >
                        {char.name?.charAt(0)?.toUpperCase() || 'P'}
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {char.name}
                      </span>
                      <span style={{ fontSize: '11px', color: '#94a3b8', flexShrink: 0 }}>
                        ({rechargeableItems.length} para recarga
                        {fullItems.length > 0 ? ` · ${fullItems.length} cheio${fullItems.length > 1 ? 's' : ''}` : ''})
                      </span>
                    </div>

                    {rechargeableItems.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleAllForChar(char.id, items)}
                        className="hover:bg-slate-800 transition-colors"
                        style={{
                          fontSize: '11px',
                          color: '#22d3ee',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        {allRechargeableSelected ? 'Desmarcar todos' : 'Marcar todos'}
                      </button>
                    )}
                  </div>

                  {/* Caso todos os itens estejam cheios e o checkbox esteja desmarcado */}
                  {visibleItems.length === 0 ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: 'rgba(15, 23, 42, 0.4)',
                        borderRadius: '8px',
                        border: '1px solid rgba(51, 65, 85, 0.6)',
                        fontSize: '11px',
                        color: '#94a3b8',
                      }}
                    >
                      <span style={{ fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Check size={13} style={{ color: '#34d399', flexShrink: 0 }} />
                        Itens já estão na capacidade máxima.
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          color: '#34d399',
                          fontWeight: 'bold',
                          background: 'rgba(6, 78, 59, 0.7)',
                          border: '1px solid rgba(6, 95, 70, 0.6)',
                          padding: '2px 6px',
                          borderRadius: '6px',
                        }}
                      >
                        ✓ 100% Cheio
                      </span>
                    </div>
                  ) : (
                    /* Grade de Itens compacta, com nome e números próximos */
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                        gap: '8px',
                      }}
                    >
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
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 10px',
                              borderRadius: '8px',
                              fontSize: '11px',
                              gap: '8px',
                              userSelect: 'none',
                              cursor: isFull ? 'default' : 'pointer',
                              background: isFull
                                ? 'rgba(2, 6, 23, 0.4)'
                                : isSelected
                                ? 'rgba(69, 26, 3, 0.2)'
                                : 'rgba(15, 23, 42, 0.6)',
                              border: isFull
                                ? '1px solid rgba(51, 65, 85, 0.6)'
                                : isSelected
                                ? '1px solid rgba(245, 158, 11, 0.6)'
                                : '1px solid rgba(51, 65, 85, 0.8)',
                              opacity: isFull ? 0.65 : 1,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {/* Checkbox e Nome do Item */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={isFull}
                                onChange={() => {}}
                                className="accent-amber-500 cursor-pointer disabled:cursor-not-allowed"
                                style={{ width: '13px', height: '13px', flexShrink: 0 }}
                              />
                              <span
                                style={{
                                  fontWeight: 600,
                                  color: isFull ? '#94a3b8' : '#f1f5f9',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={item.name}
                              >
                                {item.name}
                              </span>
                            </div>

                            {/* Valores numéricos ampliados e Badge bem próximos */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, fontFamily: 'monospace' }}>
                              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8' }}>
                                {curVal}
                              </span>
                              <span style={{ fontSize: '10px', color: '#475569' }}>→</span>
                              <span
                                style={{
                                  fontSize: '12px',
                                  fontWeight: 900,
                                  color: isFull ? '#34d399' : '#fcd34d',
                                }}
                              >
                                {isFull ? `${curVal}/${maxVal}` : `${nextValue}/${maxVal}`}
                              </span>
                              {isFull ? (
                                <span
                                  style={{
                                    fontSize: '9px',
                                    fontWeight: 600,
                                    padding: '2px 5px',
                                    borderRadius: '4px',
                                    background: 'rgba(6, 78, 59, 0.8)',
                                    color: '#34d399',
                                    border: '1px solid rgba(6, 95, 70, 0.6)',
                                    fontFamily: 'sans-serif',
                                  }}
                                >
                                  Cheio
                                </span>
                              ) : (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 'bold',
                                    padding: '2px 5px',
                                    borderRadius: '4px',
                                    background: 'rgba(245, 158, 11, 0.2)',
                                    color: '#fcd34d',
                                    border: '1px solid rgba(245, 158, 11, 0.4)',
                                    fontFamily: 'sans-serif',
                                  }}
                                >
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

        {/* Footer com respiro nas quinas e botões */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            background: '#020617',
            borderTop: '1px solid #1e293b',
            gap: '12px',
          }}
        >
          <span
            style={{
              fontSize: '12px',
              color: '#cbd5e1',
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            <strong style={{ color: '#fbbf24', fontWeight: 'bold' }}>{selectedCount}</strong>{' '}
            {selectedCount === 1 ? 'item selecionado' : 'itens selecionados'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={onClose}
              className="hover:text-white hover:bg-slate-800 transition-colors"
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#94a3b8',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedCount === 0 || charManaList.length === 0}
              className="hover:opacity-90 active:scale-95 transition-all"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 'bold',
                background: selectedCount === 0 || charManaList.length === 0 ? '#64748b' : '#f59e0b',
                color: '#020617',
                border: 'none',
                cursor: selectedCount === 0 || charManaList.length === 0 ? 'not-allowed' : 'pointer',
                opacity: selectedCount === 0 || charManaList.length === 0 ? 0.4 : 1,
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
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
