import React from 'react';
import {
  Shield,
  Sparkles,
  Crosshair,
  Skull,
  Sword,
  User,
  Flame,
  Crown,
  Axe,
  HeartHandshake,
  Eye,
  PawPrint,
  Bug,
  Ghost,
} from 'lucide-react';

export interface PresetAvatarItem {
  id: string;
  label: string;
  category: 'creature' | 'humanoid';
  icon: React.ComponentType<{ size?: number; className?: string; color?: string; strokeWidth?: number }>;
  bg: string;
  border: string;
}

export const PRESET_AVATARS: PresetAvatarItem[] = [
  // 1. CRIATURAS, GOBLINS, ORCS & FERAS SELVAGENS
  {
    id: 'goblin',
    label: 'Goblin das Cavernas / Saqueador',
    category: 'creature',
    icon: Bug,
    bg: 'from-lime-800 to-emerald-950',
    border: 'border-lime-500/70',
  },
  {
    id: 'orc',
    label: 'Orc Guerreiro / Bárbaro Orc',
    category: 'creature',
    icon: Axe,
    bg: 'from-amber-900 to-stone-950',
    border: 'border-amber-600/70',
  },
  {
    id: 'hobgoblin',
    label: 'Hobgoblin / Capitão Orc',
    category: 'creature',
    icon: Sword,
    bg: 'from-red-900 to-stone-950',
    border: 'border-red-600/70',
  },
  {
    id: 'wolf',
    label: 'Lobo Feroz / Fera Selvagem',
    category: 'creature',
    icon: PawPrint,
    bg: 'from-slate-700 to-zinc-950',
    border: 'border-slate-400/70',
  },
  {
    id: 'bear',
    label: 'Urso Pardo / Urso-Coruja',
    category: 'creature',
    icon: PawPrint,
    bg: 'from-amber-950 to-neutral-950',
    border: 'border-amber-700/70',
  },
  {
    id: 'troll',
    label: 'Troll das Cavernas / Ogro',
    category: 'creature',
    icon: Axe,
    bg: 'from-emerald-950 to-stone-950',
    border: 'border-emerald-600/70',
  },
  {
    id: 'spider',
    label: 'Aranha Gigante / Peçonhenta',
    category: 'creature',
    icon: Bug,
    bg: 'from-purple-950 to-black',
    border: 'border-purple-600/70',
  },
  {
    id: 'serpent',
    label: 'Serpente Monstruosa / Hidra',
    category: 'creature',
    icon: Eye,
    bg: 'from-teal-950 to-emerald-950',
    border: 'border-teal-500/70',
  },
  {
    id: 'demon',
    label: 'Demônio / Cria das Trevas',
    category: 'creature',
    icon: Flame,
    bg: 'from-rose-950 to-neutral-950',
    border: 'border-rose-600/70',
  },
  {
    id: 'undead',
    label: 'Esqueleto / Morto-Vivo',
    category: 'creature',
    icon: Skull,
    bg: 'from-cyan-950 to-slate-950',
    border: 'border-cyan-500/70',
  },
  {
    id: 'ghost',
    label: 'Espectro / Fantasma Rastejante',
    category: 'creature',
    icon: Ghost,
    bg: 'from-indigo-950 to-slate-950',
    border: 'border-indigo-400/70',
  },

  // 2. HUMANOIDES E COMBATENTES MEDIEVAIS
  {
    id: 'knight',
    label: 'Cavaleiro em Armadura de Placas',
    category: 'humanoid',
    icon: Shield,
    bg: 'from-slate-700 to-slate-950',
    border: 'border-slate-400/60',
  },
  {
    id: 'footman',
    label: 'Guarda da Cidade / Soldado',
    category: 'humanoid',
    icon: Sword,
    bg: 'from-amber-700 to-slate-900',
    border: 'border-amber-500/60',
  },
  {
    id: 'mercenary',
    label: 'Mercenário / Salteador',
    category: 'humanoid',
    icon: Axe,
    bg: 'from-stone-700 to-stone-950',
    border: 'border-amber-600/50',
  },
  {
    id: 'archer',
    label: 'Arqueiro / Caçador da Floresta',
    category: 'humanoid',
    icon: Crosshair,
    bg: 'from-emerald-800 to-emerald-950',
    border: 'border-emerald-500/60',
  },
  {
    id: 'mage',
    label: 'Mago Rúnico / Conjurador',
    category: 'humanoid',
    icon: Sparkles,
    bg: 'from-indigo-800 to-slate-950',
    border: 'border-indigo-400/60',
  },
  {
    id: 'cleric',
    label: 'Clérigo / Templário Divino',
    category: 'humanoid',
    icon: HeartHandshake,
    bg: 'from-amber-600 to-yellow-950',
    border: 'border-yellow-400/60',
  },
  {
    id: 'rogue',
    label: 'Ladino / Assassino das Sombras',
    category: 'humanoid',
    icon: Flame,
    bg: 'from-rose-900 to-slate-950',
    border: 'border-rose-500/60',
  },
  {
    id: 'noble',
    label: 'Nobre / Senhor Feudal',
    category: 'humanoid',
    icon: Crown,
    bg: 'from-violet-800 to-slate-950',
    border: 'border-violet-400/60',
  },
];

export const PRESET_BG_COLORS: Record<string, { bg1: string; bg2: string; border: string }> = {
  goblin: { bg1: '#365314', bg2: '#022c22', border: '#84cc16' },
  orc: { bg1: '#78350f', bg2: '#1c1917', border: '#d97706' },
  hobgoblin: { bg1: '#7f1d1d', bg2: '#1c1917', border: '#ef4444' },
  wolf: { bg1: '#334155', bg2: '#09090b', border: '#94a3b8' },
  bear: { bg1: '#451a03', bg2: '#0a0a0a', border: '#b45309' },
  troll: { bg1: '#064e3b', bg2: '#1c1917', border: '#10b981' },
  spider: { bg1: '#3b0764', bg2: '#020617', border: '#9333ea' },
  serpent: { bg1: '#042f2e', bg2: '#064e3b', border: '#14b8a6' },
  demon: { bg1: '#4c0519', bg2: '#0a0a0a', border: '#e11d48' },
  undead: { bg1: '#083344', bg2: '#0f172a', border: '#06b6d4' },
  ghost: { bg1: '#1e1b4b', bg2: '#0f172a', border: '#818cf8' },
  knight: { bg1: '#334155', bg2: '#020617', border: '#94a3b8' },
  footman: { bg1: '#b45309', bg2: '#0f172a', border: '#f59e0b' },
  mercenary: { bg1: '#44403c', bg2: '#0c0a09', border: '#d97706' },
  archer: { bg1: '#065f46', bg2: '#022c22', border: '#10b981' },
  mage: { bg1: '#312e81', bg2: '#020617', border: '#818cf8' },
  cleric: { bg1: '#d97706', bg2: '#422006', border: '#fbbf24' },
  rogue: { bg1: '#4c0519', bg2: '#0f172a', border: '#f43f5e' },
  noble: { bg1: '#4c1d95', bg2: '#020617', border: '#a855f7' },
};

export function resolveNpcPreset(npc?: { avatar?: string; avatarPreset?: string; name?: string } | null): PresetAvatarItem {
  if (!npc) return PRESET_AVATARS[0];
  if (npc.avatarPreset) {
    const found = PRESET_AVATARS.find((p) => p.id === npc.avatarPreset);
    if (found) return found;
  }
  if (npc.name) {
    const lower = npc.name.toLowerCase();
    if (
      lower.includes('espectro') ||
      lower.includes('fantasma') ||
      lower.includes('ghost') ||
      lower.includes('sombra') ||
      lower.includes('aparição') ||
      lower.includes('aparicao')
    ) {
      const g = PRESET_AVATARS.find((p) => p.id === 'ghost');
      if (g) return g;
    }
    if (lower.includes('goblin')) return PRESET_AVATARS.find((p) => p.id === 'goblin') || PRESET_AVATARS[0];
    if (lower.includes('orc')) return PRESET_AVATARS.find((p) => p.id === 'orc') || PRESET_AVATARS[0];
    if (lower.includes('hobgoblin')) return PRESET_AVATARS.find((p) => p.id === 'hobgoblin') || PRESET_AVATARS[0];
    if (lower.includes('lobo') || lower.includes('wolf')) return PRESET_AVATARS.find((p) => p.id === 'wolf') || PRESET_AVATARS[0];
    if (lower.includes('urso') || lower.includes('bear')) return PRESET_AVATARS.find((p) => p.id === 'bear') || PRESET_AVATARS[0];
    if (lower.includes('troll') || lower.includes('ogro')) return PRESET_AVATARS.find((p) => p.id === 'troll') || PRESET_AVATARS[0];
    if (lower.includes('esqueleto') || lower.includes('morto-vivo') || lower.includes('undead') || lower.includes('zumbi'))
      return PRESET_AVATARS.find((p) => p.id === 'undead') || PRESET_AVATARS[0];
    if (lower.includes('aranha') || lower.includes('spider')) return PRESET_AVATARS.find((p) => p.id === 'spider') || PRESET_AVATARS[0];
    if (lower.includes('serpente') || lower.includes('hidra') || lower.includes('snake'))
      return PRESET_AVATARS.find((p) => p.id === 'serpent') || PRESET_AVATARS[0];
    if (lower.includes('demônio') || lower.includes('demonio') || lower.includes('demon'))
      return PRESET_AVATARS.find((p) => p.id === 'demon') || PRESET_AVATARS[0];
    if (lower.includes('mago') || lower.includes('bruxo') || lower.includes('conjurador') || lower.includes('feiticeiro'))
      return PRESET_AVATARS.find((p) => p.id === 'mage') || PRESET_AVATARS[0];
    if (lower.includes('arqueiro') || lower.includes('caçador') || lower.includes('cacador'))
      return PRESET_AVATARS.find((p) => p.id === 'archer') || PRESET_AVATARS[0];
    if (lower.includes('ladino') || lower.includes('assassino')) return PRESET_AVATARS.find((p) => p.id === 'rogue') || PRESET_AVATARS[0];
    if (lower.includes('clérigo') || lower.includes('clerigo') || lower.includes('padre') || lower.includes('sacerdote'))
      return PRESET_AVATARS.find((p) => p.id === 'cleric') || PRESET_AVATARS[0];
    if (lower.includes('nobre') || lower.includes('rei') || lower.includes('príncipe') || lower.includes('principe') || lower.includes('lord'))
      return PRESET_AVATARS.find((p) => p.id === 'noble') || PRESET_AVATARS[0];
    if (lower.includes('cavaleiro') || lower.includes('paladino')) return PRESET_AVATARS.find((p) => p.id === 'knight') || PRESET_AVATARS[0];
    if (lower.includes('guarda') || lower.includes('soldado')) return PRESET_AVATARS.find((p) => p.id === 'footman') || PRESET_AVATARS[0];
    if (lower.includes('mercenário') || lower.includes('mercenario') || lower.includes('salteador'))
      return PRESET_AVATARS.find((p) => p.id === 'mercenary') || PRESET_AVATARS[0];
  }
  return PRESET_AVATARS[0];
}

interface NpcAvatarProps {
  avatar?: string;
  preset?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

export const NpcAvatar: React.FC<NpcAvatarProps> = ({
  avatar,
  preset = 'knight',
  name,
  size = 'md',
  className = '',
  onClick,
}) => {
  const sizeClasses = {
    sm: 'w-9 h-9 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base',
    xl: 'w-24 h-24 text-xl',
  }[size];

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 28,
    xl: 42,
  }[size];

  const matchedPreset =
    PRESET_AVATARS.find((p) => p.id === preset) ||
    resolveNpcPreset({ avatarPreset: preset, name });
  const IconComponent = matchedPreset.icon || User;

  return (
    <div
      onClick={onClick}
      className={`relative shrink-0 rounded-xl overflow-hidden shadow-sm flex items-center justify-center font-bold select-none ${sizeClasses} ${className} ${
        onClick ? 'cursor-pointer hover:ring-2 hover:ring-amber-500/60 transition-all' : ''
      }`}
    >
      {avatar && avatar.trim() !== '' ? (
        <img
          src={avatar}
          alt={name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback gracefully on broken image
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <div
          className={`w-full h-full bg-gradient-to-br ${matchedPreset.bg} flex items-center justify-center border ${matchedPreset.border}`}
        >
          <IconComponent size={iconSizes} className="text-white/90 drop-shadow" />
        </div>
      )}
    </div>
  );
};
