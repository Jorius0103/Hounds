import React from 'react';
import { TacticalBackgroundKey } from '../../types/tactical';

interface IllustrativeMapProps {
  backgroundKey: TacticalBackgroundKey;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const TacticalIllustrativePresets: React.FC<IllustrativeMapProps> = ({
  backgroundKey,
  x,
  y,
  width,
  height,
}) => {
  if (backgroundKey === 'tavern') {
    return (
      <g id="preset-tavern" transform={`translate(${x}, ${y})`}>
        {/* Assoalho de Tábuas de Madeira Nobre */}
        <defs>
          <linearGradient id="tav-wood-plank" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#451a03" />
            <stop offset="35%" stopColor="#78350f" />
            <stop offset="50%" stopColor="#854d0e" />
            <stop offset="75%" stopColor="#78350f" />
            <stop offset="100%" stopColor="#451a03" />
          </linearGradient>
          <radialGradient id="tav-fire-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.85" />
            <stop offset="40%" stopColor="#d97706" stopOpacity="0.5" />
            <stop offset="70%" stopColor="#b45309" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#78350f" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="tav-torch-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.4" />
            <stop offset="60%" stopColor="#b45309" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Fundo base madeira */}
        <rect width={width} height={height} fill="#271004" />

        {/* Tábuas do assoalho em ripas */}
        {Array.from({ length: Math.ceil(height / 45) }).map((_, i) => {
          const plankY = i * 45;
          const isAlt = i % 2 === 0;
          return (
            <g key={`plank-${i}`}>
              <rect
                x={40}
                y={plankY + 40}
                width={width - 80}
                height={42}
                fill={isAlt ? '#5c2b09' : '#6f330b'}
                stroke="#291204"
                strokeWidth="1.5"
              />
              {/* Juntas aleatórias entre tábuas */}
              <line x1={width * 0.25 + (i % 3) * 60} y1={plankY + 40} x2={width * 0.25 + (i % 3) * 60} y2={plankY + 82} stroke="#1f0c02" strokeWidth="2" />
              <line x1={width * 0.6 + (i % 4) * 50} y1={plankY + 40} x2={width * 0.6 + (i % 4) * 50} y2={plankY + 82} stroke="#1f0c02" strokeWidth="2" />
              <line x1={width * 0.82 - (i % 2) * 80} y1={plankY + 40} x2={width * 0.82 - (i % 2) * 80} y2={plankY + 82} stroke="#1f0c02" strokeWidth="2" />
            </g>
          );
        })}

        {/* Tapete Nobre Central de Boas-Vindas */}
        <g id="tavern-rug">
          <rect
            x={width * 0.35}
            y={height * 0.45}
            width={width * 0.3}
            height={height * 0.3}
            rx={10}
            fill="#7f1d1d"
            stroke="#b45309"
            strokeWidth="6"
          />
          <rect
            x={width * 0.35 + 15}
            y={height * 0.45 + 15}
            width={width * 0.3 - 30}
            height={height * 0.3 - 30}
            rx={6}
            fill="#991b1b"
            stroke="#d97706"
            strokeWidth="2"
            strokeDasharray="8 6"
          />
          <circle cx={width * 0.5} cy={height * 0.6} r={width * 0.06} fill="#7f1d1d" stroke="#f59e0b" strokeWidth="3" />
        </g>

        {/* Paredes de Pedra do Perímetro */}
        <path
          d={`M 0 0 L ${width} 0 L ${width} ${height} L 0 ${height} Z M 40 40 L 40 ${height - 40} L ${width - 40} ${height - 40} L ${width - 40} 40 Z`}
          fill="#1c1917"
          stroke="#44403c"
          strokeWidth="3"
        />
        {/* Vigas de Carvalho das paredes */}
        <rect x={35} y={35} width={width - 70} height={12} fill="#3b1d08" stroke="#1f0d03" />
        <rect x={35} y={height - 47} width={width - 70} height={12} fill="#3b1d08" stroke="#1f0d03" />
        <rect x={35} y={35} width={12} height={height - 70} fill="#3b1d08" stroke="#1f0d03" />
        <rect x={width - 47} y={35} width={12} height={height - 70} fill="#3b1d08" stroke="#1f0d03" />

        {/* Lareira de Pedra Monumental (Norte) */}
        <g id="fireplace" transform={`translate(${width * 0.46}, 10)`}>
          {/* Luz radiante do fogo */}
          <circle cx={width * 0.04} cy={50} r={280} fill="url(#tav-fire-glow)" />
          {/* Estrutura de pedra */}
          <rect x={0} y={10} width={width * 0.08} height={60} fill="#292524" stroke="#57534e" strokeWidth="4" rx={4} />
          {/* Cavidade escura */}
          <path d={`M 15 70 L 15 35 Q ${width * 0.04} 20 ${width * 0.08 - 15} 35 L ${width * 0.08 - 15} 70 Z`} fill="#0c0a09" />
          {/* Brasas e troncos em brasa */}
          <ellipse cx={width * 0.04} cy={60} rx={22} ry={10} fill="#ea580c" />
          <ellipse cx={width * 0.04} cy={58} rx={14} ry={6} fill="#fbbf24" />
          <path d={`M ${width * 0.04 - 15} 64 L ${width * 0.04 + 15} 56 M ${width * 0.04 - 12} 56 L ${width * 0.04 + 14} 64`} stroke="#451a03" strokeWidth="5" strokeLinecap="round" />
        </g>

        {/* Balcão em L da Taverna (Canto Superior Direito) */}
        <g id="tavern-bar" transform={`translate(${width * 0.72}, 60)`}>
          {/* Balcão Principal */}
          <rect x={0} y={0} width={width * 0.22} height={42} rx={6} fill="#451a03" stroke="#78350f" strokeWidth="4" />
          <rect x={5} y={5} width={width * 0.22 - 10} height={32} rx={4} fill="#5c2406" />
          {/* Balcão Lateral */}
          <rect x={0} y={40} width={42} height={160} rx={6} fill="#451a03" stroke="#78350f" strokeWidth="4" />
          <rect x={5} y={45} width={32} height={150} rx={4} fill="#5c2406" />
          {/* Barris de Carvalho atrás do balcão */}
          <ellipse cx={width * 0.18} cy={-15} rx={20} ry={14} fill="#573312" stroke="#291606" strokeWidth="3" />
          <ellipse cx={width * 0.12} cy={-15} rx={20} ry={14} fill="#573312" stroke="#291606" strokeWidth="3" />
          <ellipse cx={width * 0.06} cy={-15} rx={20} ry={14} fill="#573312" stroke="#291606" strokeWidth="3" />
          {/* Torneiras de Cerveja de Latão */}
          <circle cx={width * 0.14} cy={20} r={5} fill="#f59e0b" stroke="#78350f" />
          <circle cx={width * 0.1} cy={20} r={5} fill="#f59e0b" stroke="#78350f" />
        </g>

        {/* Porta Dupla de Madeira (Sul) */}
        <g id="tavern-entrance" transform={`translate(${width * 0.45}, ${height - 48})`}>
          <rect x={0} y={0} width={width * 0.1} height={16} fill="#3b1d08" stroke="#f59e0b" strokeWidth="2" />
          <line x1={width * 0.05} y1={0} x2={width * 0.05} y2={16} stroke="#1f0c02" strokeWidth="3" />
          <circle cx={width * 0.04} cy={8} r={3} fill="#d97706" />
          <circle cx={width * 0.06} cy={8} r={3} fill="#d97706" />
        </g>

        {/* Tochas nas paredes laterais com brilho */}
        <circle cx={42} cy={height * 0.3} r={120} fill="url(#tav-torch-glow)" />
        <circle cx={42} cy={height * 0.7} r={120} fill="url(#tav-torch-glow)" />
        <circle cx={width - 42} cy={height * 0.65} r={120} fill="url(#tav-torch-glow)" />
      </g>
    );
  }

  if (backgroundKey === 'dungeon') {
    return (
      <g id="preset-dungeon" transform={`translate(${x}, ${y})`}>
        <defs>
          <radialGradient id="dung-torch" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.75" />
            <stop offset="45%" stopColor="#d97706" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="water-stream" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#022c22" />
            <stop offset="50%" stopColor="#064e3b" />
            <stop offset="100%" stopColor="#022c22" />
          </linearGradient>
        </defs>

        {/* Solo base ardósia escura */}
        <rect width={width} height={height} fill="#0b1120" />

        {/* Grandes Lajes de Pedra Esculpida (Piso da Masmorra) */}
        {Array.from({ length: Math.ceil(height / 100) }).map((_, row) => {
          return Array.from({ length: Math.ceil(width / 130) }).map((_, col) => {
            const stoneX = col * 130 + 35 + (row % 2 === 0 ? 0 : 65);
            const stoneY = row * 100 + 35;
            if (stoneX >= width - 35) return null;
            const seed = (row * 13 + col * 7) % 5;
            const stoneColor =
              seed === 0 ? '#1e293b' : seed === 1 ? '#1a2234' : seed === 2 ? '#243048' : '#172033';
            return (
              <g key={`stone-${row}-${col}`}>
                <rect
                  x={stoneX}
                  y={stoneY}
                  width={124}
                  height={94}
                  rx={4}
                  fill={stoneColor}
                  stroke="#080d1a"
                  strokeWidth="2.5"
                />
                {/* Rachaduras nas pedras */}
                {seed === 2 && (
                  <path
                    d={`M ${stoneX + 20} ${stoneY + 20} L ${stoneX + 45} ${stoneY + 38} L ${stoneX + 70} ${stoneY + 32}`}
                    stroke="#0b1120"
                    strokeWidth="1.5"
                    fill="none"
                  />
                )}
                {seed === 4 && (
                  <circle cx={stoneX + 80} cy={stoneY + 65} r={8} fill="#091e17" opacity="0.6" />
                )}
              </g>
            );
          });
        })}

        {/* Canaleta de Esgoto / Drenagem com Água e Grades */}
        <g id="dungeon-canal">
          <rect x={40} y={height * 0.48} width={width - 80} height={height * 0.08} fill="url(#water-stream)" stroke="#090d16" strokeWidth="4" />
          {/* Grades de Ferro sobre o canal */}
          {Array.from({ length: Math.ceil((width - 80) / 35) }).map((_, i) => (
            <line
              key={`grate-${i}`}
              x1={55 + i * 35}
              y1={height * 0.48}
              x2={55 + i * 35}
              y2={height * 0.56}
              stroke="#334155"
              strokeWidth="3.5"
            />
          ))}
          <line x1={40} y1={height * 0.52} x2={width - 40} y2={height * 0.52} stroke="#475569" strokeWidth="3" />
        </g>

        {/* Pilares Monumentais de Pedra Maciça */}
        {[
          { cx: width * 0.25, cy: height * 0.28 },
          { cx: width * 0.75, cy: height * 0.28 },
          { cx: width * 0.25, cy: height * 0.74 },
          { cx: width * 0.75, cy: height * 0.74 },
        ].map((pillar, idx) => (
          <g key={`pillar-${idx}`}>
            {/* Sombra projetada do pilar */}
            <ellipse cx={pillar.cx + 12} cy={pillar.cy + 14} rx={42} ry={38} fill="#020617" opacity="0.8" />
            {/* Base octogonal do pilar */}
            <rect
              x={pillar.cx - 36}
              y={pillar.cy - 36}
              width={72}
              height={72}
              rx={10}
              fill="#334155"
              stroke="#475569"
              strokeWidth="4"
            />
            {/* Núcleo do pilar chanfrado */}
            <circle cx={pillar.cx} cy={pillar.cy} r={28} fill="#1e293b" stroke="#64748b" strokeWidth="3" />
            <circle cx={pillar.cx} cy={pillar.cy} r={14} fill="#0f172a" />
          </g>
        ))}

        {/* Paredes de Cantaria Fortificada */}
        <path
          d={`M 0 0 L ${width} 0 L ${width} ${height} L 0 ${height} Z M 40 40 L 40 ${height - 40} L ${width - 40} ${height - 40} L ${width - 40} 40 Z`}
          fill="#0a0f1d"
          stroke="#334155"
          strokeWidth="4"
        />

        {/* Tocheiros nas paredes com iluminação viva */}
        {[
          { x: 40, y: height * 0.25 },
          { x: 40, y: height * 0.75 },
          { x: width - 40, y: height * 0.25 },
          { x: width - 40, y: height * 0.75 },
          { x: width * 0.5, y: 40 },
          { x: width * 0.5, y: height - 40 },
        ].map((t, idx) => (
          <g key={`torch-${idx}`}>
            <circle cx={t.x} cy={t.y} r={170} fill="url(#dung-torch)" />
            <circle cx={t.x} cy={t.y} r={8} fill="#fbbf24" stroke="#d97706" strokeWidth="2" />
          </g>
        ))}
      </g>
    );
  }

  if (backgroundKey === 'forest') {
    return (
      <g id="preset-forest" transform={`translate(${x}, ${y})`}>
        <defs>
          <linearGradient id="forest-stream" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="50%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>
          <radialGradient id="tree-shadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#022c22" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#022c22" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#022c22" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Base verde densa da floresta */}
        <rect width={width} height={height} fill="#064e3b" />

        {/* Manchas de Musgo e Vegetação mais clara */}
        <ellipse cx={width * 0.25} cy={height * 0.3} rx={width * 0.2} ry={height * 0.22} fill="#047857" opacity="0.6" />
        <ellipse cx={width * 0.75} cy={height * 0.7} rx={width * 0.24} ry={height * 0.25} fill="#047857" opacity="0.5" />
        <ellipse cx={width * 0.5} cy={height * 0.85} rx={width * 0.3} ry={height * 0.15} fill="#022c22" opacity="0.7" />

        {/* Trilha de Terra Batida / Cascalho */}
        <path
          d={`M 0 ${height * 0.55} C ${width * 0.3} ${height * 0.5}, ${width * 0.4} ${height * 0.35}, ${width * 0.65} ${height * 0.4} S ${width * 0.85} ${height * 0.65}, ${width} ${height * 0.6}`}
          fill="none"
          stroke="#78350f"
          strokeWidth="90"
          strokeLinecap="round"
        />
        <path
          d={`M 0 ${height * 0.55} C ${width * 0.3} ${height * 0.5}, ${width * 0.4} ${height * 0.35}, ${width * 0.65} ${height * 0.4} S ${width * 0.85} ${height * 0.65}, ${width} ${height * 0.6}`}
          fill="none"
          stroke="#92400e"
          strokeWidth="60"
          strokeLinecap="round"
        />
        <path
          d={`M 0 ${height * 0.55} C ${width * 0.3} ${height * 0.5}, ${width * 0.4} ${height * 0.35}, ${width * 0.65} ${height * 0.4} S ${width * 0.85} ${height * 0.65}, ${width} ${height * 0.6}`}
          fill="none"
          stroke="#a16207"
          strokeWidth="25"
          strokeDasharray="30 40"
          strokeLinecap="round"
        />

        {/* Riacho na margem inferior */}
        <path
          d={`M ${width * 0.75} 0 C ${width * 0.8} ${height * 0.25}, ${width * 0.72} ${height * 0.5}, ${width * 0.88} ${height}`}
          fill="none"
          stroke="#0369a1"
          strokeWidth="50"
        />
        <path
          d={`M ${width * 0.75} 0 C ${width * 0.8} ${height * 0.25}, ${width * 0.72} ${height * 0.5}, ${width * 0.88} ${height}`}
          fill="none"
          stroke="url(#forest-stream)"
          strokeWidth="35"
        />

        {/* Rochas de Granito com Musgo */}
        {[
          { cx: width * 0.18, cy: height * 0.75, r: 38 },
          { cx: width * 0.22, cy: height * 0.78, r: 24 },
          { cx: width * 0.48, cy: height * 0.2, r: 42 },
          { cx: width * 0.53, cy: height * 0.22, r: 28 },
          { cx: width * 0.88, cy: height * 0.35, r: 35 },
        ].map((rock, idx) => (
          <g key={`rock-${idx}`}>
            <ellipse cx={rock.cx + 6} cy={rock.cy + 8} rx={rock.r} ry={rock.r * 0.8} fill="#022c22" opacity="0.6" />
            <circle cx={rock.cx} cy={rock.cy} r={rock.r} fill="#475569" stroke="#334155" strokeWidth="3" />
            {/* Musgo por cima */}
            <circle cx={rock.cx - rock.r * 0.3} cy={rock.cy - rock.r * 0.3} r={rock.r * 0.45} fill="#15803d" opacity="0.8" />
          </g>
        ))}

        {/* Árvores com Grandes Copas Frondosas */}
        {[
          { cx: width * 0.1, cy: height * 0.18, r: 110 },
          { cx: width * 0.35, cy: height * 0.12, r: 95 },
          { cx: width * 0.12, cy: height * 0.9, r: 120 },
          { cx: width * 0.4, cy: height * 0.92, r: 105 },
          { cx: width * 0.92, cy: height * 0.15, r: 125 },
          { cx: width * 0.95, cy: height * 0.85, r: 115 },
        ].map((tree, idx) => (
          <g key={`tree-${idx}`}>
            {/* Sombra da copa */}
            <circle cx={tree.cx + 20} cy={tree.cy + 25} r={tree.r + 15} fill="url(#tree-shadow)" />
            {/* Camadas da copa com tons de verde */}
            <circle cx={tree.cx} cy={tree.cy} r={tree.r} fill="#065f46" stroke="#022c22" strokeWidth="4" />
            <circle cx={tree.cx - 15} cy={tree.cy - 12} r={tree.r * 0.75} fill="#047857" />
            <circle cx={tree.cx + 18} cy={tree.cy + 10} r={tree.r * 0.6} fill="#059669" />
            <circle cx={tree.cx - 5} cy={tree.cy - 20} r={tree.r * 0.4} fill="#10b981" opacity="0.6" />
            {/* Tronco visto no centro (se transparente) */}
            <circle cx={tree.cx} cy={tree.cy} r={14} fill="#78350f" stroke="#451a03" strokeWidth="3" />
          </g>
        ))}
      </g>
    );
  }

  if (backgroundKey === 'arena') {
    return (
      <g id="preset-arena" transform={`translate(${x}, ${y})`}>
        <defs>
          <radialGradient id="arena-sand-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ca8a04" />
            <stop offset="50%" stopColor="#b45309" />
            <stop offset="90%" stopColor="#78350f" />
            <stop offset="100%" stopColor="#451a03" />
          </radialGradient>
        </defs>

        {/* Solo de Areia Batida do Coliseu */}
        <rect width={width} height={height} fill="#78350f" />
        <rect width={width} height={height} fill="url(#arena-sand-grad)" opacity="0.9" />

        {/* Parede Circular do Coliseu */}
        <circle
          cx={width * 0.5}
          cy={height * 0.5}
          r={Math.min(width, height) * 0.46}
          fill="none"
          stroke="#451a03"
          strokeWidth="38"
        />
        <circle
          cx={width * 0.5}
          cy={height * 0.5}
          r={Math.min(width, height) * 0.46}
          fill="none"
          stroke="#78350f"
          strokeWidth="30"
        />
        <circle
          cx={width * 0.5}
          cy={height * 0.5}
          r={Math.min(width, height) * 0.46}
          fill="none"
          stroke="#d97706"
          strokeWidth="4"
          strokeDasharray="25 15"
        />

        {/* Círculo Central de Combate Tático */}
        <circle
          cx={width * 0.5}
          cy={height * 0.5}
          r={Math.min(width, height) * 0.22}
          fill="#854d0e"
          fillOpacity="0.4"
          stroke="#fef08a"
          strokeWidth="4"
          strokeDasharray="16 10"
        />
        <circle
          cx={width * 0.5}
          cy={height * 0.5}
          r={Math.min(width, height) * 0.08}
          fill="#92400e"
          fillOpacity="0.6"
          stroke="#fef08a"
          strokeWidth="3"
        />

        {/* Manchas de Batalha e Sangue Seco no Solo */}
        <ellipse cx={width * 0.45} cy={height * 0.48} rx={45} ry={30} fill="#450a0a" opacity="0.55" />
        <ellipse cx={width * 0.58} cy={height * 0.55} rx={35} ry={22} fill="#450a0a" opacity="0.6" />
        <ellipse cx={width * 0.38} cy={height * 0.62} rx={28} ry={18} fill="#450a0a" opacity="0.45" />

        {/* Portões de Entrada dos Gladiadores (Oeste e Leste) */}
        <rect
          x={width * 0.5 - Math.min(width, height) * 0.46 - 25}
          y={height * 0.5 - 45}
          width={50}
          height={90}
          fill="#1c1917"
          stroke="#eab308"
          strokeWidth="4"
        />
        <rect
          x={width * 0.5 + Math.min(width, height) * 0.46 - 25}
          y={height * 0.5 - 45}
          width={50}
          height={90}
          fill="#1c1917"
          stroke="#eab308"
          strokeWidth="4"
        />
      </g>
    );
  }

  // Dark / Grade Minimalista
  return (
    <rect
      id="map-background"
      x={x}
      y={y}
      width={width}
      height={height}
      fill="#090d16"
      stroke="#1e293b"
      strokeWidth="4"
    />
  );
};

