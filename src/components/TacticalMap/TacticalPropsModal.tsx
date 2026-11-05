import React, { useState, useRef } from 'react';
import { TacticalProp, TacticalLayer } from '../../types/tactical';
import { PROP_CATALOG } from './TacticalPropsRenderer';
import {
  X,
  Plus,
  Trash2,
  Lock,
  Unlock,
  RotateCw,
  Maximize2,
  Minimize2,
  Copy,
  Upload,
  Image as ImageIcon,
  Armchair,
  Layers,
  Sparkles,
} from 'lucide-react';

interface TacticalPropsModalProps {
  isOpen: boolean;
  onClose: () => void;
  props: TacticalProp[];
  onAddProp: (newProp: Omit<TacticalProp, 'id'>) => void;
  selectedPropId: string | null;
  onSelectProp: (id: string | null) => void;
  onRotateProp: (id: string, degrees: number) => void;
  onResizeProp: (id: string, factor: number) => void;
  onToggleLockProp: (id: string) => void;
  onDuplicateProp: (id: string) => void;
  onDeleteProp: (id: string) => void;
  onClearAllProps: () => void;
  mapWidth: number;
  mapHeight: number;
  activeLayer: TacticalLayer;
}

export const TacticalPropsModal: React.FC<TacticalPropsModalProps> = ({
  isOpen,
  onClose,
  props,
  onAddProp,
  selectedPropId,
  onSelectProp,
  onRotateProp,
  onResizeProp,
  onToggleLockProp,
  onDuplicateProp,
  onDeleteProp,
  onClearAllProps,
  mapWidth,
  mapHeight,
  activeLayer,
}) => {
  const [activeCategory, setActiveCategory] = useState<'todos' | 'mobília' | 'armazenamento' | 'cenário' | 'interativo' | 'personalizado'>('todos');
  const [customName, setCustomName] = useState('Novo Elemento');
  const [customImageUrl, setCustomImageUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const selectedProp = props.find((p) => p.id === selectedPropId);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        // Obter dimensões naturais
        const img = new Image();
        img.onload = () => {
          const maxDim = 150;
          let w = img.naturalWidth || 100;
          let h = img.naturalHeight || 100;
          if (w > maxDim || h > maxDim) {
            const ratio = Math.min(maxDim / w, maxDim / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
          }

          onAddProp({
            name: file.name.replace(/\.[^/.]+$/, ''),
            type: 'custom',
            imageUrl: dataUrl,
            x: Math.round(mapWidth / 2 - w / 2),
            y: Math.round(mapHeight / 2 - h / 2),
            width: w,
            height: h,
            rotation: 0,
            locked: false,
            layer: activeLayer === 'gm' ? 'gm' : 'map',
          });
        };
        img.src = dataUrl;
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddCatalogItem = (item: (typeof PROP_CATALOG)[0]) => {
    onAddProp({
      name: item.name,
      type: item.type,
      x: Math.round(mapWidth / 2 - item.defaultWidth / 2 + (Math.random() * 60 - 30)),
      y: Math.round(mapHeight / 2 - item.defaultHeight / 2 + (Math.random() * 60 - 30)),
      width: item.defaultWidth,
      height: item.defaultHeight,
      rotation: 0,
      locked: false,
      layer: activeLayer === 'gm' ? 'gm' : 'map',
    });
  };

  const filteredCatalog =
    activeCategory === 'todos'
      ? PROP_CATALOG
      : PROP_CATALOG.filter((i) => i.category === activeCategory);

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50" onClick={onClose} />
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-2xl max-h-[85vh] bg-slate-950 border border-amber-500/40 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400">
              <Armchair size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Elementos & Cenário (Props / Mobília)</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono font-semibold">
                  Estilo Roll20
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Posicione mesas, barris, baús, colunas e objetos sobre a imagem de fundo.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Barra de Filtro de Categorias */}
        <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/40 flex items-center gap-1.5 overflow-x-auto">
          {(['todos', 'mobília', 'armazenamento', 'cenário', 'interativo', 'personalizado'] as const).map(
            (cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {cat === 'todos' ? 'Todos os Itens' : cat === 'personalizado' ? 'Upload Personalizado' : cat}
              </button>
            )
          )}
        </div>

        {/* Conteúdo Principal */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeCategory === 'personalizado' ? (
            <div className="p-4 bg-slate-900/60 border border-dashed border-amber-500/40 rounded-xl space-y-3 text-center">
              <div className="mx-auto w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-400">
                <Upload size={22} />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-200">
                  Fazer Upload de Mobília ou Objeto
                </div>
                <div className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Carregue uma imagem PNG transparente do seu computador para adicionar qualquer elemento ao mapa.
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs inline-flex items-center gap-2 shadow-md transition-transform active:scale-95"
              >
                <Upload size={14} />
                <span>Escolher Imagem do Computador (PNG/JPG)</span>
              </button>

              <div className="pt-2 border-t border-slate-800/80 text-left space-y-2">
                <span className="text-[11px] text-slate-400 font-semibold block">
                  Ou adicione via URL da Web:
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customImageUrl}
                    onChange={(e) => setCustomImageUrl(e.target.value)}
                    placeholder="https://exemplo.com/mesa-transparente.png"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                  <button
                    onClick={() => {
                      if (!customImageUrl.trim()) return;
                      onAddProp({
                        name: customName || 'Objeto Web',
                        type: 'custom',
                        imageUrl: customImageUrl.trim(),
                        x: Math.round(mapWidth / 2 - 40),
                        y: Math.round(mapHeight / 2 - 40),
                        width: 80,
                        height: 80,
                        rotation: 0,
                        locked: false,
                        layer: activeLayer === 'gm' ? 'gm' : 'map',
                      });
                      setCustomImageUrl('');
                    }}
                    disabled={!customImageUrl.trim()}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-xs"
                  >
                    Inserir
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {filteredCatalog.map((item) => (
                <button
                  key={item.type}
                  onClick={() => handleAddCatalogItem(item)}
                  className="p-3 bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/60 rounded-xl text-left transition-all group flex flex-col justify-between h-28"
                >
                  <div>
                    <div className="font-bold text-slate-200 group-hover:text-amber-400 text-xs flex items-center justify-between">
                      <span>{item.name}</span>
                      <Plus size={13} className="text-slate-500 group-hover:text-amber-400" />
                    </div>
                    <div className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-tight">
                      {item.description}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-800/60">
                    <span className="capitalize">{item.category}</span>
                    <span>{item.defaultWidth}×{item.defaultHeight}px</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Painel do Elemento Selecionado atualmente no mapa */}
          {selectedProp && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/40 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between font-bold text-slate-100">
                <span className="flex items-center gap-1.5 text-amber-300">
                  <Sparkles size={14} /> Elemento Selecionado: {selectedProp.name}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Pos: ({selectedProp.x}, {selectedProp.y}) • {selectedProp.width}×{selectedProp.height}px
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => onRotateProp(selectedProp.id, 45)}
                  className="px-2.5 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-200 rounded-lg flex items-center gap-1.5 border border-slate-750 font-semibold"
                  title="Girar 45° no sentido horário"
                >
                  <RotateCw size={13} className="text-amber-400" />
                  <span>Girar 45° ({selectedProp.rotation || 0}°)</span>
                </button>

                <button
                  onClick={() => onResizeProp(selectedProp.id, 1.15)}
                  className="px-2 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-200 rounded-lg flex items-center gap-1 border border-slate-750"
                  title="Aumentar tamanho"
                >
                  <Maximize2 size={13} className="text-amber-400" />
                  <span>+15%</span>
                </button>

                <button
                  onClick={() => onResizeProp(selectedProp.id, 0.85)}
                  className="px-2 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-200 rounded-lg flex items-center gap-1 border border-slate-750"
                  title="Diminuir tamanho"
                >
                  <Minimize2 size={13} className="text-amber-400" />
                  <span>-15%</span>
                </button>

                <button
                  onClick={() => onToggleLockProp(selectedProp.id)}
                  className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 border font-semibold ${
                    selectedProp.locked
                      ? 'bg-red-500/20 text-red-300 border-red-500/40'
                      : 'bg-slate-850 text-slate-300 border-slate-750 hover:bg-slate-800'
                  }`}
                >
                  {selectedProp.locked ? <Lock size={13} /> : <Unlock size={13} />}
                  <span>{selectedProp.locked ? 'Travado' : 'Destravado'}</span>
                </button>

                <button
                  onClick={() => onDuplicateProp(selectedProp.id)}
                  className="px-2.5 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-200 rounded-lg flex items-center gap-1.5 border border-slate-750"
                  title="Duplicar elemento"
                >
                  <Copy size={13} className="text-blue-400" />
                  <span>Duplicar</span>
                </button>

                <button
                  onClick={() => onDeleteProp(selectedProp.id)}
                  className="px-2.5 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-300 rounded-lg flex items-center gap-1.5 border border-red-500/30 ml-auto"
                  title="Remover elemento do mapa"
                >
                  <Trash2 size={13} />
                  <span>Excluir</span>
                </button>
              </div>
            </div>
          )}

          {/* Lista de Elementos no Mapa */}
          {props.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px]">
                <span>Elementos posicionados no tabuleiro ({props.length}):</span>
                <button
                  onClick={onClearAllProps}
                  className="text-red-400 hover:text-red-300 text-[10px] flex items-center gap-1"
                >
                  <Trash2 size={11} />
                  <span>Limpar Todos os Elementos</span>
                </button>
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                {props.map((p) => {
                  const isSel = p.id === selectedPropId;
                  return (
                    <div
                      key={p.id}
                      onClick={() => onSelectProp(p.id)}
                      className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                        isSel
                          ? 'bg-amber-500/20 border-amber-500 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{p.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {p.width}×{p.height}px
                        </span>
                        {p.locked && (
                          <span className="text-[9px] bg-red-950 text-red-300 border border-red-800 px-1 rounded">
                            Travado
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onToggleLockProp(p.id)}
                          className="p-1 text-slate-400 hover:text-white"
                          title={p.locked ? 'Destravar' : 'Travar'}
                        >
                          {p.locked ? <Lock size={12} className="text-red-400" /> : <Unlock size={12} />}
                        </button>
                        <button
                          onClick={() => onDeleteProp(p.id)}
                          className="p-1 text-slate-400 hover:text-red-400"
                          title="Excluir"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

