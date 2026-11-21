import React from 'react';
import { Shield } from 'lucide-react';
import { TacticalToken } from '../../types/tactical';
import { NPC } from '../../types/rpg';
import { PRESET_AVATARS, PRESET_BG_COLORS, resolveNpcPreset } from '../NpcAvatar';

export interface TacticalTokenItemProps {
  token: TacticalToken;
  npc: NPC | null;
  centerX: number;
  centerY: number;
  tokenRotation: number;
  tokenHexRadius: number;
  tokenApothem: number;
  tokenBaseHexPoints: string;
  tokenInnerHexPoints: string;
  tokenSelectionHexPoints: string;
  displayName: string;
  displayAvatar?: string;
  displayPresetId?: string;
  maneuverBorderColor: string;
  isTokenHidden: boolean;
  isSelected: boolean;
  isMaster: boolean;
  canControl: boolean;
  onTokenClick: (e: React.MouseEvent, token: TacticalToken) => void;
  onTokenMouseDown: (e: React.MouseEvent, token: TacticalToken) => void;
  onTokenContextMenu: (e: React.MouseEvent, token: TacticalToken) => void;
  onRotationMouseDown: (e: React.MouseEvent, token: TacticalToken) => void;
}

export const TacticalTokenItem: React.FC<TacticalTokenItemProps> = React.memo(({
  token,
  npc,
  centerX,
  centerY,
  tokenRotation,
  tokenHexRadius,
  tokenApothem,
  tokenBaseHexPoints,
  tokenInnerHexPoints,
  tokenSelectionHexPoints,
  displayName,
  displayAvatar,
  displayPresetId,
  maneuverBorderColor,
  isTokenHidden,
  isSelected,
  isMaster,
  canControl,
  onTokenClick,
  onTokenMouseDown,
  onTokenContextMenu,
  onRotationMouseDown,
}) => {
  const badgeWidth = Math.min(85, Math.max(34, displayName.length * 5.8));

  const matchedPreset = !displayAvatar
    ? PRESET_AVATARS.find((p) => p.id === displayPresetId) ||
      (npc ? resolveNpcPreset(npc) : PRESET_AVATARS[0])
    : null;
  const presetColors = matchedPreset
    ? PRESET_BG_COLORS[matchedPreset.id] || PRESET_BG_COLORS['knight']
    : null;
  const PresetIcon = matchedPreset?.icon || Shield;
  const iconSize = tokenApothem * 1.2;

  return (
    <g
      transform={`translate(${centerX}, ${centerY})`}
      opacity={isTokenHidden ? 0.78 : 1}
      pointerEvents="auto"
      onClick={(e) => onTokenClick(e, token)}
      onMouseDown={(e) => onTokenMouseDown(e, token)}
      onContextMenu={(e) => onTokenContextMenu(e, token)}
      className={`${canControl ? (isSelected ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer') : 'cursor-pointer'} transition-transform`}
      style={{
        filter: isTokenHidden && isSelected
          ? 'drop-shadow(0px 0px 8px rgba(168, 85, 247, 0.9)) drop-shadow(0px 0px 6px rgba(245, 158, 11, 0.75))'
          : isTokenHidden
            ? 'drop-shadow(0px 0px 8px rgba(168, 85, 247, 0.9))'
            : isSelected
              ? 'drop-shadow(0px 0px 8px rgba(245, 158, 11, 0.8))'
              : 'drop-shadow(0px 3px 6px rgba(0, 0, 0, 0.6))',
      }}
    >
      {/* GRUPO ROTATIVO INTEGRAL: Token Hexagonal, Foto, Nome (atrás), Frente (na face frontal) e Pauzinho giram juntos */}
      <g transform={`rotate(${tokenRotation})`}>
        {/* 1. Hexágono de Base com Borda de Manobra ou Cor do Token (sem borda roxa quando oculto) */}
        <polygon
          points={tokenBaseHexPoints}
          fill="#0f172a"
          stroke={maneuverBorderColor}
          strokeWidth={isSelected ? 2 : 1.5}
          strokeLinejoin="round"
        />

        {/* Contorno Hexagonal Externo Dourado Indicador de Seleção */}
        {isSelected && (
          <polygon
            points={tokenSelectionHexPoints}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeDasharray="4,3"
          />
        )}

        {/* 2. Retrato / Avatar recortado em formato hexagonal */}
        <clipPath id={`clip-${token.id}`}>
          <polygon points={tokenInnerHexPoints} />
        </clipPath>

        {displayAvatar ? (
          <image
            href={displayAvatar}
            x={-tokenHexRadius}
            y={-tokenHexRadius}
            width={tokenHexRadius * 2}
            height={tokenHexRadius * 2}
            clipPath={`url(#clip-${token.id})`}
            preserveAspectRatio="xMidYMid slice"
          />
        ) : (
          presetColors && (
            <g clipPath={`url(#clip-${token.id})`}>
              <polygon points={tokenInnerHexPoints} fill={presetColors.bg1} />
              <polygon points={tokenInnerHexPoints} fill={presetColors.bg2} fillOpacity="0.5" />
              <g
                transform={`translate(${-iconSize / 2}, ${-iconSize / 2})`}
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8))' }}
              >
                <PresetIcon size={iconSize} color="#ffffff" strokeWidth={2} />
              </g>
            </g>
          )
        )}

        {/* MARCAÇÃO VISUAL DE VISIBILIDADE APENAS PARA O MESTRE (QUANDO OCULTO DOS JOGADORES): OLHO ROXO */}
        {isMaster && isTokenHidden && (
          <g
            transform={`translate(${badgeWidth / 2 + 7}, ${-tokenApothem - 8.5})`}
            pointerEvents="none"
          >
            <circle
              cx="0"
              cy="0"
              r="6"
              fill="#020617"
              fillOpacity="0.95"
              stroke="#a855f7"
              strokeWidth="1.5"
            />
            <path
              d="M -3.6 0 C -2 -2.2 2 -2.2 3.6 0 C 2 2.2 -2 2.2 -3.6 0 Z"
              fill="none"
              stroke="#c084fc"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="0" cy="0" r="1" fill="#c084fc" />
            <line
              x1="-3"
              y1="-3"
              x2="3"
              y2="3"
              stroke="#c084fc"
              strokeWidth="1"
              strokeLinecap="round"
            />
          </g>
        )}

        {/* 3. NOME DO PERSONAGEM NA ARESTA TRASEIRA DO HEXÁGONO */}
        <rect
          x={-badgeWidth / 2}
          y={-tokenApothem - 15}
          width={badgeWidth}
          height="13"
          rx="3.5"
          fill="#020617"
          fillOpacity="0.55"
          stroke="rgba(148, 163, 184, 0.3)"
          strokeWidth="0.7"
        />
        <text
          x="0"
          y={-tokenApothem - 6}
          fill="#f1f5f9"
          fontSize="8"
          fontWeight="600"
          textAnchor="middle"
        >
          {displayName}
        </text>

        {/* 4. MARCAÇÃO DE FRENTE NA ARESTA FRONTAL */}
        <polygon
          points={`0,${tokenApothem + 8.5} -5.5,${tokenApothem + 2} 5.5,${tokenApothem + 2}`}
          fill="#f59e0b"
          stroke="#020617"
          strokeWidth="1"
        />
        <circle cx="0" cy={tokenApothem + 3.5} r="1.2" fill="#ffffff" />

        {/* 5. "PAUZINHO" DE ROTAÇÃO (Roll20 Rotation Handle) QUANDO SELECIONADO */}
        {isSelected && canControl && (
          <g className="cursor-grab">
            <line
              x1="0"
              y1={tokenApothem + 8.5}
              x2="0"
              y2={tokenApothem + 21}
              stroke="#38bdf8"
              strokeWidth="2"
              strokeDasharray="3,2"
            />
            <circle
              cx="0"
              cy={tokenApothem + 21}
              r="5"
              fill="#0284c7"
              stroke="#ffffff"
              strokeWidth="1.5"
              className="hover:scale-125 transition-transform"
            />
            <circle cx="0" cy={tokenApothem + 21} r="1.8" fill="#ffffff" />
            <circle
              cx="0"
              cy={tokenApothem + 21}
              r="13"
              fill="transparent"
              className="cursor-grab active:cursor-grabbing"
              onMouseDown={(e) => onRotationMouseDown(e, token)}
            />
          </g>
        )}
      </g>
    </g>
  );
});

TacticalTokenItem.displayName = 'TacticalTokenItem';
