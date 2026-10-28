import React, { useState, useEffect, useMemo } from 'react';
import { Search, Shield, X, Check } from 'lucide-react';
import {
  ArmorCatalogItem,
  loadArmorCatalog,
  parseArmorDr,
  ParsedArmorDR,
} from '../utils/armorCatalog';
import { BodyArmorLocation } from '../types/rpg';

interface ArmorSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetLocation: BodyArmorLocation | null;
  targetLocationIndex: number | null;
  allLocations: BodyArmorLocation[];
  onEquipArmor: (
    armor: {
      name: string;
      dr: string | number;
      category?: string;
      location?: string;
      notes?: string;
    },
    parsed: ParsedArmorDR,
    targetIndex: number
  ) => void;
}

export const ArmorSearchModal: React.FC<ArmorSearchModalProps> = ({
  isOpen,
  onClose,
  targetLocation,
  targetLocationIndex,
  allLocations,
  onEquipArmor,
}) => {
  const [catalog, setCatalog] = useState<ArmorCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocationIndex, setSelectedLocationIndex] = useState<number>(0);
  const [equippedFeedback, setEquippedFeedback] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      loadArmorCatalog()
        .then((data) => {
          setCatalog(data.filter((item) => item.type !== 'Shield'));
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
        });

      setSearchQuery('');
      setSelectedLocationIndex(targetLocationIndex ?? 0);
      setEquippedFeedback('');
    }
  }, [isOpen, targetLocationIndex]);

  // Selected Location
  const currentLocation = allLocations[selectedLocationIndex] || targetLocation || allLocations[0];

  // Filtered armors with tokenized search
  const filteredArmors = useMemo(() => {
    const rawQuery = searchQuery.toLowerCase().trim();
    const tokens = rawQuery.split(/\s+/).filter(Boolean);

    return catalog.filter((item) => {
      if (tokens.length > 0) {
        const fullText = `${item.name || ''} ${item.category || ''} ${item.location || ''} ${item.book || ''} ${item.notes || ''} ${item.dr || ''}`.toLowerCase();
        const matchesAll = tokens.every((tok) => fullText.includes(tok));
        if (!matchesAll) return false;
      }
      return true;
    });
  }, [catalog, searchQuery]);

  // Handler for catalog equip
  const handleCatalogEquip = (armor: ArmorCatalogItem, parsed: ParsedArmorDR) => {
    const locName = currentLocation?.location || 'Parte selecionada';
    onEquipArmor(armor, parsed, selectedLocationIndex);

    // Feedback visual sem fechar a janela
    setEquippedFeedback(`"${armor.name}" equipada em ${locName}!`);
    setTimeout(() => setEquippedFeedback(''), 3000);
  };

  if (!isOpen) return null;

  return (
    // Não fecha ao clicar fora da janela (sem onClose no backdrop)
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm"
      style={{
        padding: '16px',
        overflowY: 'auto',
        WebkitBackdropFilter: 'blur(4px)',
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        style={{
          position: 'relative',
          margin: 'auto',
          width: '100%',
          maxWidth: '780px',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#0f172a',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho no estilo Jogadores da Mesa de RPG */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 18px',
            borderBottom: '1px solid rgba(245, 158, 11, 0.2)',
            background: 'linear-gradient(to right, rgba(69, 26, 3, 0.3), #0f172a, #0f172a)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <div
              style={{
                width: '28px',
                height: '28px',
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
              <Shield size={16} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>
                Armaduras e Proteções
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            style={{
              padding: '5px',
              borderRadius: '7px',
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
            <X size={16} />
          </button>
        </div>

        {/* Barra Superior: Seleção da Parte do Corpo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: '#020617',
            borderBottom: '1px solid #1e293b',
            padding: '10px 18px',
            gap: '12px',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#cbd5e1', whiteSpace: 'nowrap' }}>
            Parte do Corpo:
          </span>
          <select
            value={selectedLocationIndex}
            onChange={(e) => setSelectedLocationIndex(Number(e.target.value))}
            style={{
              flex: 1,
              maxWidth: '420px',
              background: '#0f172a',
              border: '1px solid rgba(245, 158, 11, 0.5)',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#fcd34d',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {allLocations.map((loc, idx) => (
              <option
                key={loc.id || `${loc.location}-${idx}`}
                value={idx}
                style={{ background: '#0f172a', color: '#f8fafc' }}
              >
                {loc.location} (Roll {loc.rollTarget || '—'}) {loc.armorName ? `— Atual: ${loc.armorName} (RD ${loc.dr})` : '— Sem armadura'}
              </option>
            ))}
          </select>
        </div>

        {/* Feedback visual de equipamento realizado */}
        {equippedFeedback && (
          <div
            style={{
              padding: '8px 18px',
              background: 'rgba(6, 78, 59, 0.7)',
              borderBottom: '1px solid rgba(5, 150, 105, 0.4)',
              color: '#6ee7b7',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Check size={14} color="#34d399" />
              {equippedFeedback}
            </span>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              Selecione outra parte acima para continuar equipando
            </span>
          </div>
        )}

        {/* Barra de Busca logo acima da lista de peças de armaduras */}
        <div
          style={{
            padding: '12px 18px',
            borderBottom: '1px solid #1e293b',
            background: 'rgba(15, 23, 42, 0.4)',
            flexShrink: 0,
          }}
        >
          <div style={{ position: 'relative', width: '100%' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar armadura por nome, tipo, livro ou RD (ex: Heavy Plate, Mail, Leather, RD 9...)"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                paddingLeft: '34px',
                paddingRight: '32px',
                paddingTop: '8px',
                paddingBottom: '8px',
                background: '#020617',
                border: '1px solid #334155',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#ffffff',
                outline: 'none',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '2px',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Lista de Armaduras do Catálogo */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
          className="scrollbar-thin"
        >
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: '#94a3b8', gap: '10px' }}>
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p style={{ fontSize: '12px' }}>Carregando catálogo de armaduras...</p>
            </div>
          ) : filteredArmors.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: '#64748b', gap: '10px' }}>
              <Shield size={36} color="#334155" />
              <p style={{ fontSize: '12px', fontWeight: 500 }}>Nenhuma armadura encontrada.</p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ fontSize: '12px', color: '#fbbf24', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Limpar busca
              </button>
            </div>
          ) : (
            filteredArmors.map((armor) => {
              const parsed = parseArmorDr(armor);

              return (
                <div
                  key={armor.id || armor.name}
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: '#020617',
                    border: '1px solid #1e293b',
                    transition: 'all 0.15s ease',
                  }}
                  className="hover:border-amber-500/50 group"
                >
                  {/* Detalhes da Armadura */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 'bold', color: '#ffffff', fontSize: '13px' }}>
                        {armor.name}
                      </span>

                      {armor.category && (
                        <span style={{ fontSize: '10px', fontWeight: 500, padding: '1px 6px', borderRadius: '4px', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155' }}>
                          {armor.category}
                        </span>
                      )}

                      {armor.tl !== undefined && (
                        <span style={{ fontSize: '10px', fontFamily: 'monospace', padding: '1px 5px', borderRadius: '4px', background: '#0f172a', color: '#94a3b8', border: '1px solid #1e293b' }}>
                          TL {armor.tl}
                        </span>
                      )}

                      {armor.book && (
                        <span style={{ fontSize: '10px', color: '#64748b' }}>
                          {armor.book} {armor.page || ''}
                        </span>
                      )}
                    </div>

                    {/* Badges de RD e Modificadores */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '5px',
                          fontFamily: 'monospace',
                          fontWeight: 'bold',
                          background: 'rgba(245, 158, 11, 0.15)',
                          color: '#fcd34d',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                        }}
                      >
                        RD Base: {parsed.baseDr}
                        {armor.dr.includes('*') && (
                          <span style={{ fontSize: '9px', fontWeight: 'normal', color: '#fbbf24' }} title="Flexível">
                            *
                          </span>
                        )}
                      </span>

                      {parsed.drModifiers.map((mod, mi) => {
                        const isNeg = mod.drModifier < 0;
                        const isPos = mod.drModifier > 0;
                        const sign = isPos ? `+${mod.drModifier}` : `${mod.drModifier}`;
                        const dtLabel =
                          mod.modifierDamageType === 'contusao'
                            ? 'Contusão'
                            : mod.modifierDamageType === 'corte'
                            ? 'Corte'
                            : mod.modifierDamageType === 'empalamento'
                            ? 'Empalamento'
                            : mod.modifierDamageType === 'perfurante'
                            ? 'Perfurante'
                            : mod.modifierDamageType === 'queima'
                            ? 'Queima'
                            : mod.modifierDamageType;

                        return (
                          <span
                            key={mi}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 6px',
                              borderRadius: '5px',
                              fontFamily: 'monospace',
                              fontSize: '10px',
                              fontWeight: 'bold',
                              background: isNeg ? 'rgba(76, 5, 25, 0.6)' : 'rgba(6, 78, 59, 0.6)',
                              color: isNeg ? '#fda4af' : '#6ee7b7',
                              border: isNeg ? '1px solid rgba(225, 29, 72, 0.4)' : '1px solid rgba(5, 150, 105, 0.4)',
                            }}
                          >
                            {sign} RD vs {dtLabel}
                          </span>
                        );
                      })}

                      {armor.cost && (
                        <span style={{ fontSize: '11px', color: '#94a3b8', padding: '0 4px' }}>
                          {armor.cost}
                        </span>
                      )}
                      {armor.weight && (
                        <span style={{ fontSize: '11px', color: '#94a3b8', padding: '0 4px' }}>
                          {armor.weight} lb
                        </span>
                      )}
                    </div>

                    {(armor.footnotes || armor.notes) && (
                      <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0 0', fontStyle: 'italic' }}>
                        {armor.footnotes || armor.notes}
                      </p>
                    )}
                  </div>

                  {/* Botão de Equipar na Parte Selecionada */}
                  <div style={{ flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => handleCatalogEquip(armor, parsed)}
                      className="hover:opacity-90 active:scale-95 transition-all"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        background: '#f59e0b',
                        color: '#020617',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        borderRadius: '7px',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                      }}
                    >
                      <Check size={12} strokeWidth={2.5} />
                      <span>Equipar em {currentLocation?.location}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé no estilo Jogadores da Mesa de RPG */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '8px 18px',
            borderTop: '1px solid #1e293b',
            background: 'rgba(2, 6, 23, 0.6)',
            gap: '10px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="hover:opacity-90 active:scale-95 transition-all"
            style={{
              padding: '5px 14px',
              borderRadius: '7px',
              fontSize: '11px',
              fontWeight: 'bold',
              background: '#f59e0b',
              color: '#020617',
              border: 'none',
              cursor: 'pointer',
              flexShrink: 0,
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
            }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
