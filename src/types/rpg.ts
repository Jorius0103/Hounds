import { TacticalState } from './tactical';

export type UserRole = 'mestre' | 'jogador' | 'visualizador';

export interface UserAccount {
  id: string;
  name: string; // Ex: Leandro
  role: UserRole;
  password: string; // Senha armazenada no sistema
  needsPasswordReset: boolean; // Se true, no próximo login terá que cadastrar nova senha
  createdAt: string;
}

export interface WeaponAttackMode {
  id: string;
  name?: string; // Ex: Golpe de Corte, Estocada, Duas Mãos, Arremesso...
  damage: string; // Ex: sw+1 corte, thr+1 perf
  type: string; // Ex: Corte, Perfurante, Contusão
  reach: string; // Ex: C, 1, 2...
}

export interface Weapon {
  id: string;
  name: string;
  nh: number | string; // Nível de Habilidade (número ou texto como "DX+5")
  damage?: string; // Dano primário (ou legado)
  type?: string; // Tipo primário (ou legado)
  reach?: string; // Alcance primário (ou legado)
  modes?: WeaponAttackMode[]; // Múltiplas opções de Dano / Tipo / Alcance
  notes?: string; // Propriedades especiais, observações
}

export interface Spell {
  id: string;
  name: string;
  nh: number; // Nível de Habilidade
  isFavorite?: boolean; // Favoritada (vai para o topo com destaque)
  notes?: string; // Efeitos / anotações
}

export interface BodyArmorLocation {
  id: string;
  location: string; // Eye, Skull, Face, Torso, etc.
  rollTarget?: string; // 3-4, 5, 9-10, 11, etc.
  penalty?: string; // -9, -7, -5, 0, etc.
  armorName: string; // Peça de armadura
  dr: number; // Resistência a Dano (RD)
  drModifier?: number; // Modificador de RD (ex: -2, +1) contra tipo de dano específico
  modifierDamageType?: string; // Qual o tipo de dano afetado pelo modificador (ex: contusao, corte)
  notes?: string; // Observações legadas opcionais
  gurpsNotesRef?: string; // [1, 2], [1, 3], etc. da imagem
}

export interface ParryEntry {
  id: string;
  weaponName: string; // Ex: Arma Principal, Segunda Arma, Desarmado...
  parryType?: string; // Ex: Normal, 0F (Esgrima), 0U (Desbalanceada), Desarmado...
  value: number; // Valor do Aparar
  notes?: string;
}

export interface TurnActionsTracker {
  parryCount: number; // Quantidade de vezes que usou aparar no turno
  dodgeCount: number; // Quantidade de vezes que usou esquiva no turno
  blockCount: number; // Quantidade de vezes que usou bloqueio no turno
  usedRetreat: boolean; // Se recuou nesta rodada
  usedBlockThisTurn: boolean; // Se usou bloqueio nesta rodada
  shock: number; // Número incremental de choque que começa em 0
  usedFatigueThisTurn: boolean; // Controle manual se usou fadiga no turno
  fatigueAmountUsed: number; // Quantidade de FP gasto
  notes?: string;
}

export interface ExtraItem {
  id: string;
  name: string; // Ex: Flechas, Pedras de Mana, Escudo...
  current: number; // Atual
  max: number; // Total
  notes?: string;
}

export interface ConditionDefinition {
  id: string;
  label: string;
  description: string;
  color?: string;
}

export interface ActionLogEntry {
  id: string;
  timestamp: string;
  author: 'mestre' | 'assistente';
  type: 'damage' | 'fatigue' | 'heal' | 'rest' | 'note' | 'defense' | 'condition' | 'item';
  description: string;
  amount?: number;
  npcId?: string;
  npcName?: string;
  npcAvatar?: string;
  npcPreset?: string;

  // Detalhes de itens extras
  itemId?: string;
  itemName?: string;
  itemBefore?: number;
  itemAfter?: number;

  // Detalhes aprofundados do dano
  hitLocation?: string; // Ex: Tronco, Crânio, Braço D.
  rawDamage?: number; // Dano bruto rolado
  damageType?: string; // corte, empalamento, perfurante, contusao, etc.
  naturalDr?: number; // RD Natural
  armorDr?: number; // RD da Armadura
  totalDr?: number; // RD Total considerada
  penetratingDamage?: number; // Dano penetrante após superar a RD
  woundMultiplier?: number; // Multiplicador de ferimento (ex: 1.5, 2.0)
  finalDamage?: number; // Dano final aos PV
  hpBefore?: number;
  hpAfter?: number;
  fpBefore?: number;
  fpAfter?: number;
}

export interface NPC {
  id: string;
  name: string;
  title: string;
  characterType?: 'player' | 'npc'; // 'player' = Jogador, 'npc' = NPC / Monstro / Inimigo
  playerName?: string; // Nome do jogador que controla
  weight: string; // Peso (começa vazio para input)
  height: string; // Altura (começa vazio para input)
  avatar: string;
  avatarPreset?: string;

  // Controles rápidos próximos ao nome
  isVisibleToPlayer: boolean; // Visível ou não para o jogador que ajuda
  isDead: boolean; // Morto ou vivo
  combatManeuver?: string; // Manobra de Combate ativa (Attack, Concentration, All-out Attack, etc.)
  updatedAt?: number; // Carimbo de tempo da última alteração para resolução de concorrência

  // Vitalidade & Recursos
  hpCurrent: number;
  hpMax: number;
  fpCurrent: number;
  fpMax: number;
  statusConditions: string[];

  // Itens Extras / Recursos Consumíveis (Flechas, Pedras de Mana, Escudo, etc.)
  extraItems?: ExtraItem[];

  // Controle de Ações / Defesas do Turno & Shock
  turnActions: TurnActionsTracker;

  // Atributos Primários
  st: number;
  dx: number;
  iq: number;
  ht: number;

  // Atributos Secundários
  per: number;
  will: number;
  basicSpeed: number;
  basicMove: number | string; // Permite número ou texto como "6 (-1 Peso)"
  naturalDr: number;

  // Defesas Ativas
  parries: ParryEntry[]; // Default 1, com opção de adicionar mais
  dodge: number;
  dodgeNotes?: string; // Comentário editável de Esquiva
  block: number;
  blockNotes?: string; // Comentário editável de Bloqueio

  // Armas & Ataques
  weapons: Weapon[];
  combatSkills?: string; // Perícias de combate abaixo das armas
  combatPerks?: string; // Perk / Peculiaridades de combate abaixo das armas

  // Magias
  spells: Spell[];

  // Armadura por partes do corpo
  armorLocations: BodyArmorLocation[];

  // Traços e Equipamentos
  advantages: string;
  disadvantages: string;
  skills: string; // Perícias Gerais
  equipment: string; // Equipamentos Carregados

  // Observações (agora acima de PV/Fadiga)
  masterNotes: string; // Confidencial do Mestre
  assistantNotes: string; // Compartilhado (Mestre e Jogador podem editar)

  // Histórico
  history: ActionLogEntry[];
}

export interface Combat {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  sheetSyncUrl?: string; // URL da Planilha Google (publicada como CSV ou link direto)
  npcs: NPC[];
  tacticalState?: TacticalState;
}
