import React from 'react';
import { TacticalProp, TacticalLayer } from '../../types/tactical';

export const PROP_CATALOG: Array<{
  type: TacticalProp['type'];
  name: string;
  category: 'mobília' | 'armazenamento' | 'cenário' | 'interativo';
  defaultWidth: number;
  defaultHeight: number;
  description: string;
}> = [
  // Mobília & Taverna
  { type: 'table-rect', name: 'Mesa de Taverna', category: 'mobília', defaultWidth: 120, defaultHeight: 70, description: 'Mesa retangular de madeira para tavernas e salões' },
  { type: 'table-round', name: 'Mesa Redonda', category: 'mobília', defaultWidth: 90, defaultHeight: 90, description: 'Mesa redonda rústica para tavernas' },
  { type: 'table-long', name: 'Mesa de Banquete', category: 'mobília', defaultWidth: 220, defaultHeight: 65, description: 'Mesa comprida de banquete e refeitório' },
  { type: 'chair', name: 'Cadeira / Banco', category: 'mobília', defaultWidth: 35, defaultHeight: 35, description: 'Banco de madeira para acomodar combatentes' },
  { type: 'bar-counter', name: 'Balcão de Madeira', category: 'mobília', defaultWidth: 140, defaultHeight: 45, description: 'Seção de balcão de taverna ou bar' },
  { type: 'bed', name: 'Cama / Catraca', category: 'mobília', defaultWidth: 100, defaultHeight: 60, description: 'Cama com cobertas e travesseiro' },
  { type: 'rug', name: 'Tapete Nobre', category: 'mobília', defaultWidth: 140, defaultHeight: 90, description: 'Tapete nobre vermelho com franjas' },

  // Armazenamento & Carga
  { type: 'barrel', name: 'Barril de Cerveja', category: 'armazenamento', defaultWidth: 45, defaultHeight: 45, description: 'Barril de carvalho com aros de ferro' },
  { type: 'crate', name: 'Caixote de Carga', category: 'armazenamento', defaultWidth: 50, defaultHeight: 50, description: 'Caixote reforçado de suprimentos' },
  { type: 'chest', name: 'Baú de Tesouro', category: 'armazenamento', defaultWidth: 55, defaultHeight: 36, description: 'Baú de madeira com reforços de ferro' },

  // Cenário & Construção
  { type: 'pillar', name: 'Pilar de Pedra', category: 'cenário', defaultWidth: 60, defaultHeight: 60, description: 'Coluna sólida de pedra esculpida' },
  { type: 'door-wood', name: 'Porta de Madeira', category: 'cenário', defaultWidth: 80, defaultHeight: 20, description: 'Porta rústica de tábuas de madeira' },
  { type: 'door-iron', name: 'Grade / Porta de Ferro', category: 'cenário', defaultWidth: 80, defaultHeight: 20, description: 'Porta de ferro fundido com barras' },
  { type: 'tree', name: 'Árvore com Copa', category: 'cenário', defaultWidth: 130, defaultHeight: 130, description: 'Árvore frondosa com copa verde' },
  { type: 'rock', name: 'Pedregulho / Rocha', category: 'cenário', defaultWidth: 80, defaultHeight: 60, description: 'Rocha natural de granito com musgo' },

  // Interativos
  { type: 'campfire', name: 'Fogueira / Braseiro', category: 'interativo', defaultWidth: 70, defaultHeight: 70, description: 'Fogueira acesa com lenha e brasas' },
];

interface TacticalPropsRendererProps {
  props: TacticalProp[];
  selectedPropId: string | null;
  onSelectProp: (id: string | null) => void;
  onStartDragProp: (id: string, e: React.MouseEvent) => void;
  onRotateProp: (id: string, degreesDelta: number) => void;
  onResizeProp: (id: string, factor: number) => void;
  onToggleLockProp: (id: string) => void;
  onDuplicateProp: (id: string) => void;
  onDeleteProp: (id: string) => void;
  activeLayer: TacticalLayer;
  isMaster: boolean;
}

export const TacticalPropsRenderer: React.FC<TacticalPropsRendererProps> = ({
  props,
  selectedPropId,
  onSelectProp,
  onStartDragProp,
  onRotateProp,
  onResizeProp,
  onToggleLockProp,
  onDuplicateProp,
  onDeleteProp,
  activeLayer,
  isMaster,
}) => {
  if (!props || props.length === 0) return null;

  return (
    <g id="tactical-props-layer">
      {props.map((prop) => {
        // Se pertencer à camada GM e não for mestre, oculta
        if (prop.layer === 'gm' && !isMaster) return null;

        const isSelected = selectedPropId === prop.id;
        const w = prop.width || 80;
        const h = prop.height || 60;
        const rot = prop.rotation || 0;
        const canEdit = isMaster || activeLayer === 'map' || activeLayer === 'tokens';

        return (
          <g
            key={prop.id}
            id={`prop-${prop.id}`}
            transform={`translate(${prop.x}, ${prop.y}) rotate(${rot}, ${w / 2}, ${h / 2})`}
            opacity={prop.opacity ?? 1}
            className={canEdit && !prop.locked ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}
            onMouseDown={(e) => {
              if (canEdit && e.button === 0) {
                e.stopPropagation();
                onSelectProp(prop.id);
                if (!prop.locked) {
                  onStartDragProp(prop.id, e);
                }
              }
            }}
          >
            {/* Visual do Elemento por Tipo */}
            {(() => {
              if (prop.imageUrl || prop.type === 'custom') {
                return (
                  <image
                    href={prop.imageUrl}
                    x={0}
                    y={0}
                    width={w}
                    height={h}
                    preserveAspectRatio="xMidYMid meet"
                  />
                );
              }

              if (prop.type === 'table-rect' || prop.type === 'table-long') {
                return (
                  <g>
                    {/* Sombra da mesa */}
                    <rect x={4} y={5} width={w} height={h} rx={6} fill="#000000" opacity="0.45" />
                    {/* Tampo da mesa */}
                    <rect x={0} y={0} width={w} height={h} rx={6} fill="#5c2b09" stroke="#291204" strokeWidth="3" />
                    {/* Tábuas de madeira */}
                    <line x1={0} y1={h * 0.33} x2={w} y2={h * 0.33} stroke="#3b1704" strokeWidth="2" />
                    <line x1={0} y1={h * 0.66} x2={w} y2={h * 0.66} stroke="#3b1704" strokeWidth="2" />
                    {/* Copos / Canecas estilizadas */}
                    <circle cx={w * 0.25} cy={h * 0.5} r={w * 0.04} fill="#d97706" opacity="0.7" />
                    <circle cx={w * 0.75} cy={h * 0.5} r={w * 0.04} fill="#d97706" opacity="0.7" />
                  </g>
                );
              }

              if (prop.type === 'table-round') {
                const r = Math.min(w, h) / 2;
                return (
                  <g>
                    {/* Sombra redonda */}
                    <circle cx={w / 2 + 4} cy={h / 2 + 4} r={r} fill="#000000" opacity="0.45" />
                    {/* Tampo redondo */}
                    <circle cx={w / 2} cy={h / 2} r={r} fill="#5c2b09" stroke="#291204" strokeWidth="3" />
                    <circle cx={w / 2} cy={h / 2} r={r * 0.8} fill="#6f330b" stroke="#3b1704" strokeWidth="1.5" />
                    <circle cx={w / 2} cy={h / 2} r={r * 0.3} fill="#78350f" />
                  </g>
                );
              }

              if (prop.type === 'chair') {
                return (
                  <g>
                    <rect x={2} y={3} width={w} height={h} rx={4} fill="#000000" opacity="0.4" />
                    <rect x={0} y={0} width={w} height={h} rx={4} fill="#78350f" stroke="#451a03" strokeWidth="2" />
                    <circle cx={w / 2} cy={h / 2} r={w * 0.25} fill="#92400e" />
                  </g>
                );
              }

              if (prop.type === 'bar-counter') {
                return (
                  <g>
                    <rect x={3} y={4} width={w} height={h} rx={5} fill="#000000" opacity="0.45" />
                    <rect x={0} y={0} width={w} height={h} rx={5} fill="#451a03" stroke="#78350f" strokeWidth="3" />
                    <rect x={4} y={4} width={w - 8} height={h - 8} rx={3} fill="#5c2406" />
                    <line x1={w * 0.5} y1={4} x2={w * 0.5} y2={h - 4} stroke="#381504" strokeWidth="2" />
                  </g>
                );
              }

              if (prop.type === 'barrel') {
                const r = Math.min(w, h) / 2;
                return (
                  <g>
                    <circle cx={w / 2 + 3} cy={h / 2 + 3} r={r} fill="#000000" opacity="0.5" />
                    <circle cx={w / 2} cy={h / 2} r={r} fill="#78350f" stroke="#334155" strokeWidth="3.5" />
                    <circle cx={w / 2} cy={h / 2} r={r * 0.75} fill="#92400e" stroke="#475569" strokeWidth="2" />
                    <circle cx={w / 2} cy={h / 2} r={r * 0.25} fill="#451a03" />
                  </g>
                );
              }

              if (prop.type === 'crate') {
                return (
                  <g>
                    <rect x={3} y={3} width={w} height={h} rx={3} fill="#000000" opacity="0.5" />
                    <rect x={0} y={0} width={w} height={h} rx={3} fill="#854d0e" stroke="#451a03" strokeWidth="3" />
                    <rect x={5} y={5} width={w - 10} height={h - 10} fill="#a16207" stroke="#713f12" strokeWidth="2" />
                    <line x1={5} y1={5} x2={w - 5} y2={h - 5} stroke="#451a03" strokeWidth="2.5" />
                    <line x1={w - 5} y1={5} x2={5} y2={h - 5} stroke="#451a03" strokeWidth="2.5" />
                  </g>
                );
              }

              if (prop.type === 'chest') {
                return (
                  <g>
                    <rect x={3} y={3} width={w} height={h} rx={4} fill="#000000" opacity="0.5" />
                    <rect x={0} y={0} width={w} height={h} rx={4} fill="#78350f" stroke="#0f172a" strokeWidth="3" />
                    {/* Tiras de ferro */}
                    <rect x={w * 0.2} y={0} width={w * 0.12} height={h} fill="#334155" />
                    <rect x={w * 0.68} y={0} width={w * 0.12} height={h} fill="#334155" />
                    {/* Fechadura de latão */}
                    <circle cx={w * 0.5} cy={h * 0.5} r={h * 0.18} fill="#f59e0b" stroke="#78350f" strokeWidth="1.5" />
                  </g>
                );
              }

              if (prop.type === 'pillar') {
                return (
                  <g>
                    <ellipse cx={w / 2 + 5} cy={h / 2 + 6} rx={w / 2} ry={h / 2} fill="#000000" opacity="0.6" />
                    <rect x={0} y={0} width={w} height={h} rx={8} fill="#334155" stroke="#64748b" strokeWidth="3" />
                    <circle cx={w / 2} cy={h / 2} r={Math.min(w, h) * 0.36} fill="#1e293b" stroke="#94a3b8" strokeWidth="2" />
                    <circle cx={w / 2} cy={h / 2} r={Math.min(w, h) * 0.18} fill="#0f172a" />
                  </g>
                );
              }

              if (prop.type === 'campfire') {
                const r = Math.min(w, h) / 2;
                return (
                  <g>
                    {/* Brilho da fogueira */}
                    <circle cx={w / 2} cy={h / 2} r={r * 1.5} fill="#f59e0b" opacity="0.25" />
                    {/* Pedras circulares */}
                    <circle cx={w / 2} cy={h / 2} r={r} fill="#1c1917" stroke="#44403c" strokeWidth="4" />
                    {/* Lenhas */}
                    <line x1={w * 0.2} y1={h * 0.2} x2={w * 0.8} y2={h * 0.8} stroke="#451a03" strokeWidth="5" strokeLinecap="round" />
                    <line x1={w * 0.8} y1={h * 0.2} x2={w * 0.2} y2={h * 0.8} stroke="#451a03" strokeWidth="5" strokeLinecap="round" />
                    {/* Brasas e chamas */}
                    <circle cx={w / 2} cy={h / 2} r={r * 0.45} fill="#ea580c" />
                    <circle cx={w / 2} cy={h / 2} r={r * 0.28} fill="#fbbf24" />
                  </g>
                );
              }

              if (prop.type === 'tree') {
                const r = Math.min(w, h) / 2;
                return (
                  <g>
                    <circle cx={w / 2 + 8} cy={h / 2 + 10} r={r} fill="#022c22" opacity="0.55" />
                    <circle cx={w / 2} cy={h / 2} r={r} fill="#065f46" stroke="#022c22" strokeWidth="3" />
                    <circle cx={w * 0.4} cy={h * 0.38} r={r * 0.65} fill="#047857" />
                    <circle cx={w * 0.62} cy={h * 0.58} r={r * 0.55} fill="#059669" />
                    <circle cx={w / 2} cy={h / 2} r={r * 0.18} fill="#78350f" stroke="#451a03" />
                  </g>
                );
              }

              if (prop.type === 'rock') {
                return (
                  <g>
                    <ellipse cx={w / 2 + 5} cy={h / 2 + 6} rx={w / 2} ry={h / 2} fill="#020617" opacity="0.5" />
                    <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill="#475569" stroke="#1e293b" strokeWidth="3" />
                    <circle cx={w * 0.35} cy={h * 0.4} r={Math.min(w, h) * 0.25} fill="#15803d" opacity="0.75" />
                  </g>
                );
              }

              if (prop.type === 'door-wood' || prop.type === 'door-iron') {
                const isIron = prop.type === 'door-iron';
                return (
                  <g>
                    <rect x={2} y={2} width={w} height={h} rx={2} fill="#000000" opacity="0.4" />
                    <rect
                      x={0}
                      y={0}
                      width={w}
                      height={h}
                      rx={2}
                      fill={isIron ? '#334155' : '#78350f'}
                      stroke={isIron ? '#64748b' : '#3b1d08'}
                      strokeWidth="2.5"
                    />
                    <circle cx={w * 0.8} cy={h / 2} r={h * 0.2} fill="#f59e0b" />
                  </g>
                );
              }

              if (prop.type === 'bed') {
                return (
                  <g>
                    <rect x={3} y={4} width={w} height={h} rx={4} fill="#000000" opacity="0.4" />
                    <rect x={0} y={0} width={w} height={h} rx={4} fill="#451a03" stroke="#291204" strokeWidth="2.5" />
                    {/* Lençol */}
                    <rect x={w * 0.28} y={3} width={w * 0.68} height={h - 6} rx={3} fill="#1e3a8a" />
                    {/* Travesseiro */}
                    <rect x={4} y={5} width={w * 0.22} height={h - 10} rx={4} fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
                  </g>
                );
              }

              if (prop.type === 'rug') {
                return (
                  <g>
                    <rect x={0} y={0} width={w} height={h} rx={6} fill="#7f1d1d" stroke="#d97706" strokeWidth="3" />
                    <rect x={6} y={6} width={w - 12} height={h - 12} rx={4} fill="#991b1b" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 3" />
                    <ellipse cx={w / 2} cy={h / 2} rx={w * 0.25} ry={h * 0.25} fill="#7f1d1d" stroke="#f59e0b" strokeWidth="2" />
                  </g>
                );
              }

              return <rect width={w} height={h} fill="#64748b" rx={4} />;
            })()}

            {/* Borda de Seleção e Controles quando Selecionado */}
            {isSelected && canEdit && (
              <g id="prop-controls">
                {/* Borda pontilhada amarela */}
                <rect
                  x={-4}
                  y={-4}
                  width={w + 8}
                  height={h + 8}
                  rx={6}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2.5"
                  strokeDasharray="5 3"
                />

                {/* Marcador de Rotação Superior */}
                <line x1={w / 2} y1={-4} x2={w / 2} y2={-20} stroke="#f59e0b" strokeWidth="2" />
                <circle
                  cx={w / 2}
                  cy={-24}
                  r={8}
                  fill="#f59e0b"
                  stroke="#000000"
                  strokeWidth="2"
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRotateProp(prop.id, 45);
                  }}
                >
                  <title>Clique para girar 45°</title>
                </circle>

                {/* Ícone de Cadeado se Travado */}
                {prop.locked && (
                  <circle cx={w + 4} cy={-4} r={6} fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
                )}
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
};
