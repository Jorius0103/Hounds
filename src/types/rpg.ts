import { TacticalState } from './tactical';

export type UserRole = 'mestre' | 'jogador';

// Papel de quem está usando a Mesa: o Jogador sem permissão de edição é 'visualizador' (só assiste).
export type MesaRole = UserRole | 'visualizador';

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
  nh?: number | string; // Nível de Habilidade
  isFavorite?: boolean; // Favoritada (vai para o topo com destaque)
  notes?: string; // Efeitos / anotações
  college?: string;
  class?: string;
  duration?: string;
  cost?: string;
  timeToCast?: string;
  description?: string;
}

export interface ArmorDrModifier {
  drModifier: number; // Modificador de RD (ex: -2, +1)
  modifierDamageType: string; // Tipo de dano afetado (ex: contusao, corte)
}

export interface BodyArmorLocation {
  id: string;
  location: string; // Eye, Head, Face, Right Leg, Right Arm, Torso, Groin, Left Arm, Left Leg, Hand, Foot, Neck, Vitals
  rollTarget?: string; // -, 3-4, 5, 6-7, 8, 9-10, 11, 12, 13-14, 15, 16, 17-18, -
  penalty?: string; // -9, -7, -5, 0, etc.
  armorName: string; // Peça de armadura
  dr: number; // Resistência a Dano (RD)
  drModifier?: number; // Modificador de RD legado / primário (ex: -2, +1) contra tipo de dano específico
  modifierDamageType?: string; // Qual o tipo de dano afetado pelo modificador legado / primário (ex: contusao, corte)
  drModifiers?: ArmorDrModifier[]; // Lista de múltiplos modificadores de RD por tipo de dano
  damageTaken?: number; // Dano tomado nesta parte do corpo
  additionalRule?: string; // Regra adicional específica da parte do corpo
  notes?: string; // Observações legadas opcionais
  gurpsNotesRef?: string; // [1, 2], [1, 3], etc. da imagem
}

export interface ArmorKit {
  id: string;
  name: string;
  isActive: boolean;
  locations: BodyArmorLocation[];
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

export type ExtraItemCategory = 'mana' | 'shield' | 'arrows' | 'other';

export interface ExtraItem {
  id: string;
  name: string; // Ex: Flechas, Pedras de Mana, Escudo...
  category?: ExtraItemCategory; // Categoria do recurso
  current: number; // Atual
  max: number; // Total
  isFavorite?: boolean; // Favoritado (para listar no modal de Lançar Dano / Fadiga / Itens)
  notes?: string;
}

export interface ConditionDefinition {
  id: string;
  label: string;
  description: string;
  duration?: number; // Duração em rodadas (opcional)
  color?: string;
}

export interface ActionLogEntry {
  id: string;
  timestamp: string;
  round?: number;
  author: 'mestre' | 'assistente' | string;
  authorName?: string;
  type: 'damage' | 'fatigue' | 'heal' | 'rest' | 'note' | 'defense' | 'condition' | 'item' | 'edit' | 'spell' | 'turn' | string;
  description: string;
  amount?: number;
  npcId?: string;
  npcName?: string;
  npcAvatar?: string;
  npcPreset?: string;
  npcCharacterType?: 'player' | 'npc'; // Separa Personagens de NPCs no filtro do log geral
  combatId?: string; // Combate em que a ação aconteceu
  spellId?: string; // Instância de magia lançada (se houver)

  // Detalhes de itens extras
  itemId?: string;
  itemName?: string;
  itemBefore?: number;
  itemAfter?: number;

  // Causador do Dano / Atacante
  attackerId?: string;
  attackerName?: string;

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
  bodyPartDamage?: number; // Dano total sofrido pela parte do corpo (ex: membros)
  hpBefore?: number;
  hpAfter?: number;
  fpBefore?: number;
  fpAfter?: number;

  // Comentário ou anotação da rolagem (editável pelo mestre/jogadores autorizados)
  comment?: string;

  // Metadados para agrupamento inteligente de cliques consecutivos na mesma variável
  variableKey?: string;
  initialValue?: any;
  initialValues?: Record<string, any>;
  timestampMs?: number;
}

export interface ActiveSpell {
  id: string; // ID único da instância da magia lançada
  spellName: string;
  targetId: string;
  targetName: string;
  round: number;
  duration?: number; // Duração em rodadas (opcional)
  cost?: number;
  casterId?: string;
  casterName?: string;
  createdAt?: string;
}

export interface AffectedSpell {
  id: string; // Mesmo ID da instância lançada pelo conjurador
  spellName: string;
  casterId?: string;
  casterName: string;
  round: number;
  duration?: number; // Duração em rodadas (opcional)
  cost?: number; // Custo em FP (opcional)
  createdAt?: string;
}

export interface ConditionMetadata {
  startRound?: number;
  duration?: number;
}

export interface NPC {
  id: string;
  name: string;
  title: string;
  characterType?: 'player' | 'npc'; // 'player' = Jogador, 'npc' = NPC / Monstro / Inimigo
  userId?: string; // ID da conta do usuário vinculado (UserAccount.id)
  playerName?: string; // Nome do jogador que controla (mantido sincronizado para compatibilidade)
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
  conditionMetadata?: Record<string, ConditionMetadata>;

  // Magias Ativas e Sob Efeito
  activeSpells?: ActiveSpell[];
  affectedSpells?: AffectedSpell[];

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
  armorKits?: ArmorKit[];
  activeArmorKitId?: string;

  // Partes do Corpo (Aba de acompanhamento de dano e regras específicas)
  bodyPartDamageOverrides?: Record<string, number>;
  bodyPartCustomRules?: Record<string, string>;

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
  totalNpcs?: number; // Contagem de NPCs para combates em repouso/descarregados
  tacticalState?: TacticalState;
  currentRound?: number;
  round?: number; // O mesmo que currentRound, com o nome usado nos dados mais antigos
  events?: unknown[]; // Eventos do combate (usados só pelo mesa.html compilado)
  roundLog?: { round: number; endedAt: number }[]; // Fim de cada rodada (usado só pelo mesa.html compilado)
  editorUserIds?: string[]; // IDs dos jogadores que possuem permissão de edição
  playerIds?: string[]; // IDs dos personagens de jogadores visíveis/ativos neste combate
  customOrder?: string[]; // IDs de combatentes na ordem definida pelo Mestre (drag-and-drop)
  isActive?: boolean; // Se false, inativo: não aparece na barra principal, apenas no CRUD
}
