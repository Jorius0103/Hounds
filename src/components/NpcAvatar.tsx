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
  icon: React.ComponentType<{ size?: number; className?: string }>;
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

  const matchedPreset = PRESET_AVATARS.find((p) => p.id === preset) || PRESET_AVATARS[0];
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
