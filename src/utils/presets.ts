import { Combat, NPC } from '../types/rpg';
import { DEFAULT_TURN_ACTIONS } from './gurps';

export const EMPTY_COMBAT_PRESET: Combat = {
    "id":  "combat-vazio",
    "name":  "Sem combate",
    "npcs":  [

             ],
    "round":  0,
    "events":  [

               ],
    "createdAt":  "29/09/2026",
    "playerIds":  [
                      "npc-1791647017149-8h46w",
                      "npc-1791656410781-k0cy8",
                      "npc-1791656413293-ia1k7",
                      "npc-1791727000932-ki8we",
                      "npc-1791811892267-pb4qs",
                      "npc-1791812994314-3r2mi",
                      "npc-1791942567682-duoaf",
                      "npc-1791943052637-2lvgl",
                      "npc-1791943809458-8np7c",
                      "npc-1791944567767-m9e2k"
                  ],
    "description":  "Nenhum NPC neste combate. Deixa a tela dos jogadores limpa e oculta.",
    "currentRound":  0,
    "editorUserIds":  [

                      ]
};

export const INITIAL_COMBATS: Combat[] = [
    {
        "id":  "combat-vazio",
        "name":  "Sem combate",
        "npcs":  [

                 ],
        "round":  0,
        "events":  [

                   ],
        "createdAt":  "29/09/2026",
        "playerIds":  [
                          "npc-1791647017149-8h46w",
                          "npc-1791656410781-k0cy8",
                          "npc-1791656413293-ia1k7",
                          "npc-1791727000932-ki8we",
                          "npc-1791811892267-pb4qs",
                          "npc-1791812994314-3r2mi",
                          "npc-1791942567682-duoaf",
                          "npc-1791943052637-2lvgl",
                          "npc-1791943809458-8np7c",
                          "npc-1791944567767-m9e2k"
                      ],
        "description":  "Nenhum NPC neste combate. Deixa a tela dos jogadores limpa e oculta.",
        "currentRound":  0,
        "editorUserIds":  [

                          ]
    },
    {
        "id":  "combat-1791646854042-rotw",
        "name":  "Combate do Porto",
        "npcs":  [

                 ],
        "round":  0,
        "events":  [

                   ],
        "roundLog":  [
                         {
                             "round":  1,
                             "endedAt":  1791726924897
                         },
                         {
                             "round":  2,
                             "endedAt":  1791726926626
                         },
                         {
                             "round":  3,
                             "endedAt":  1791726927655
                         },
                         {
                             "round":  4,
                             "endedAt":  1791830226569
                         }
                     ],
        "createdAt":  "10/10/2026",
        "playerIds":  [
                          "npc-1791656410781-k0cy8",
                          "npc-1791656413293-ia1k7",
                          "npc-1791647017149-8h46w",
                          "npc-1791727000932-ki8we"
                      ],
        "description":  "",
        "currentRound":  0,
        "editorUserIds":  [
                              "user-mv37om22fetmwu1q",
                              "Renato",
                              "user-mv37opqxi87qtpk0",
                              "Jorio"
                          ]
    }
];

export const AZUR_CHARACTER: NPC = {
    "dx":  13,
    "ht":  12,
    "id":  "npc-1791647017149-8h46w",
    "iq":  10,
    "st":  14,
    "per":  13,
    "name":  "Azur",
    "will":  11,
    "block":  11,
    "dodge":  9,
    "fpMax":  12,
    "hpMax":  15,
    "title":  "Membro de The Hounds",
    "avatar":  "https://cjjhlorfnjspikjhsanx.supabase.co/storage/v1/object/public/hounds-images/mv3vwpc4acakibj4.png",
    "height":  "",
    "isDead":  false,
    "skills":  "",
    "spells":  [

               ],
    "weight":  "",
    "history":  [

                ],
    "parries":  [
                    {
                        "id":  "parry-npc-1791647017149-8h46w-1",
                        "notes":  "+ Bônus Escudo",
                        "value":  14,
                        "parryType":  "",
                        "weaponName":  "Greatsword"
                    }
                ],
    "weapons":  [
                    {
                        "id":  "wpn-1791940306927-tnf4",
                        "name":  "Greatsword",
                        "nh":  "DX+5",
                        "damage":  "4d+1",
                        "type":  "Swing",
                        "reach":  "1 / 2",
                        "modes":  [
                                      {
                                          "id":  "mode-1791940222532-1",
                                          "name":  "Cutting",
                                          "damage":  "4d+1",
                                          "type":  "Swing",
                                          "reach":  "1 / 2"
                                      },
                                      {
                                          "id":  "mode-1791940236601-00kx",
                                          "name":  "Crushing",
                                          "damage":  "2d+1",
                                          "type":  "Thrust",
                                          "reach":  "2"
                                      }
                                  ],
                        "notes":  "Balanced and Fine"
                    },
                    {
                        "id":  "wpn-1791940374600-fzwd",
                        "name":  "Long Knife",
                        "nh":  "DX+1",
                        "damage":  "2d-1",
                        "type":  "Swing",
                        "reach":  "",
                        "modes":  [
                                      {
                                          "id":  "mode-1791940312103-1",
                                          "name":  "Cutting",
                                          "damage":  "2d-1",
                                          "type":  "Swing",
                                          "reach":  ""
                                      },
                                      {
                                          "id":  "mode-1791940325230-fm1z",
                                          "name":  "Impalling",
                                          "damage":  "1d",
                                          "type":  "Thrust",
                                          "reach":  ""
                                      }
                                  ],
                        "notes":  ""
                    },
                    {
                        "id":  "wpn-1791940416394-2vot",
                        "name":  "Soco",
                        "nh":  "DX+2",
                        "damage":  "1d",
                        "type":  "Thrust",
                        "reach":  "",
                        "modes":  [
                                      {
                                          "id":  "mode-1791940377398-1",
                                          "name":  "Crushing",
                                          "damage":  "1d",
                                          "type":  "Thrust",
                                          "reach":  ""
                                      }
                                  ],
                        "notes":  ""
                    },
                    {
                        "id":  "wpn-1791940451887-qwp2",
                        "name":  "Chute",
                        "nh":  "DX+2",
                        "damage":  "1d+2",
                        "type":  "Thrust",
                        "reach":  "",
                        "modes":  [
                                      {
                                          "id":  "mode-1791940422100-1",
                                          "name":  "Crushing",
                                          "damage":  "1d+2",
                                          "type":  "Thrust",
                                          "reach":  ""
                                      }
                                  ],
                        "notes":  ""
                    }
                ],
    "armorKits":  [
                      {
                          "id":  "kit-1791939800700-rwgw",
                          "name":  "Kit 2",
                          "isActive":  true,
                          "locations":  [
                                            {
                                                "location":  "Eye",
                                                "rollTarget":  "-",
                                                "penalty":  "-9",
                                                "armorName":  "",
                                                "dr":  0,
                                                "notes":  "",
                                                "additionalRule":  "Só consegue acertar o olho danos de Empalamento, Perfurante ou Magia",
                                                "id":  "armor-npc-1791647017149-8h46w-0-tjo",
                                                "drModifier":  0,
                                                "modifierDamageType":  "",
                                                "damageTaken":  0
                                            },
                                            {
                                                "location":  "Head",
                                                "rollTarget":  "3-4",
                                                "penalty":  "-7",
                                                "armorName":  "Coifa (Light Mail) + Proteção",
                                                "dr":  4,
                                                "notes":  "",
                                                "additionalRule":  "Tem +2 de RD / Qualquer dano vira 4X",
                                                "id":  "armor-npc-1791647017149-8h46w-1-tme",
                                                "drModifier":  -2,
                                                "modifierDamageType":  "contusao",
                                                "damageTaken":  0
                                            },
                                            {
                                                "location":  "Face",
                                                "rollTarget":  "5",
                                                "penalty":  "-5",
                                                "armorName":  "",
                                                "dr":  0,
                                                "notes":  "",
                                                "additionalRule":  "",
                                                "id":  "armor-npc-1791647017149-8h46w-2-uax",
                                                "drModifier":  0,
                                                "modifierDamageType":  "",
                                                "damageTaken":  0
                                            },
                                            {
                                                "location":  "Left Leg",
                                                "rollTarget":  "13-14",
                                                "penalty":  "-2",
                                                "armorName":  "Fine Mail",
                                                "dr":  5,
                                                "notes":  "",
                                                "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                "id":  "armor-npc-1791647017149-8h46w-3-wzc",
                                                "drModifier":  -2,
                                                "modifierDamageType":  "contusao",
                                                "damageTaken":  0
                                            },
                                            {
                                                "location":  "Right Leg",
                                                "rollTarget":  "6-7",
                                                "penalty":  "-2",
                                                "armorName":  "Fine Mail",
                                                "dr":  5,
                                                "notes":  "",
                                                "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                "id":  "armor-npc-1791647017149-8h46w-4-lmw",
                                                "drModifier":  -2,
                                                "modifierDamageType":  "contusao",
                                                "damageTaken":  0
                                            },
                                            {
                                                "location":  "Left Shins",
                                                "rollTarget":  "13-14",
                                                "penalty":  "-2",
                                                "armorName":  "Fine Mail",
                                                "dr":  5,
                                                "notes":  "",
                                                "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                "id":  "armor-npc-1791647017149-8h46w-5-qk6",
                                                "drModifier":  -2,
                                                "modifierDamageType":  "contusao",
                                                "damageTaken":  0
                                            },
                                            {
                                                "location":  "Right Shins",
                                                "rollTarget":  "6-7",
                                                "penalty":  "-2",
                                                "armorName":  "Fine Mail",
                                                "dr":  5,
                                                "notes":  "",
                                                "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                "id":  "armor-npc-1791647017149-8h46w-6-0jo",
                                                "drModifier":  -2,
                                                "modifierDamageType":  "contusao",
                                                "damageTaken":  0
                                            },
                                            {
                                                "location":  "Left Arm",
                                                "rollTarget":  "12",
                                                "penalty":  "-2",
                                                "armorName":  "Heavy Mail",
                                                "dr":  6,
                                                "notes":  "",
                                                "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                "id":  "armor-npc-1791647017149-8h46w-7-i1e",
                                                "drModifier":  -2,
                                                "modifierDamageType":  "contusao",
                                                "damageTaken":  0
                                            },
                                            {
                                                "location":  "Right Arm",
                                                "rollTarget":  "8",
                                                "penalty":  "-2",
                                                "armorName":  "Heavy Mail",
                                                "dr":  6,
                                                "notes":  "",
                                                "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                "id":  "armor-npc-1791647017149-8h46w-8-j8t",
                                                "drModifier":  -2,
                                                "modifierDamageType":  "contusao",
                                                "damageTaken":  0
                                            },
                                            {
                                                "location":  "Left Forearm",
                                                "rollTarget":  "12",
                                                "penalty":  "-2",
                                                "armorName":  "Medium Plate",
                                                "dr":  7,
                                                "notes":  "",
                                                "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                "id":  "armor-npc-1791647017149-8h46w-9-m2q",
                                                "drModifier":  0,
                                                "modifierDamageType":  "",
                                                "damageTaken":  0
                                            },
                                            {
                                                "location":  "Right Forearm",
                                                "rollTarget":  "8",
                                                "penalty":  "-2",
                                                "armorName":  "Medium Plate",
                                                "dr":  7,
                                                "notes":  "",
                                                "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                "id":  "armor-npc-1791647017149-8h46w-10-fra",
                                                "drModifier":  0,
                                                "modifierDamageType":  "",
                                                "damageTaken":  0
                                            },
                                            {
                                                "location":  "Torso",
                                                "rollTarget":  "9-10",
                                                "penalty":  "0",
                                                "armorName":  "Heavy Mail",
                                                "dr":  6,
                                                "notes":  "",
                                                "additionalRule":  "",
                                                "id":  "armor-npc-1791647017149-8h46w-11-rzg",
                                                "drModifier":  -2,
                                                "modifierDamageType":  "",
                                                "damageTaken":  0
                                            },
                                            {
                                                "location":  "Groin",
                                                "rollTarget":  "11",
                                                "penalty":  "-3",
                                                "armorName":  "Heavy Mail",
                                                "dr":  6,
                                                "notes":  "",
                                                "additionalRule":  "",
                                                "id":  "armor-npc-1791647017149-8h46w-12-p9h",
                                                "drModifier":  -2,
                                                "modifierDamageType":  "",
                                                "damageTaken":  0
                                            },
                                            {
                                                "location":  "Hand",
                                                "rollTarget":  "15",
                                                "penalty":  "-4",
                                                "armorName":  "Medium Plate",
                                                "dr":  7,
                                                "notes":  "",
                                                "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                "id":  "armor-npc-1791647017149-8h46w-13-m6q",
                                                "drModifier":  0,
                                                "modifierDamageType":  "",
                                                "damageTaken":  0
                                            },
                                            {
                                                "location":  "Feet",
                                                "rollTarget":  "16",
                                                "penalty":  "-4",
                                                "armorName":  "Boots",
                                                "dr":  2,
                                                "notes":  "",
                                                "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                "id":  "armor-npc-1791647017149-8h46w-14-l7l",
                                                "drModifier":  0,
                                                "modifierDamageType":  "",
                                                "damageTaken":  0
                                            },
                                            {
                                                "location":  "Neck",
                                                "rollTarget":  "17-18",
                                                "penalty":  "-5",
                                                "armorName":  "",
                                                "dr":  0,
                                                "notes":  "",
                                                "additionalRule":  "Contusão vira 1,5, corte vai de 1,5 para 2.0",
                                                "id":  "armor-npc-1791647017149-8h46w-15-vvf",
                                                "drModifier":  0,
                                                "modifierDamageType":  "",
                                                "damageTaken":  0
                                            },
                                            {
                                                "location":  "Vitals",
                                                "rollTarget":  "-",
                                                "penalty":  "-3",
                                                "armorName":  "Heavy Mail",
                                                "dr":  6,
                                                "notes":  "",
                                                "additionalRule":  "Empalamento e perfuração vira x3",
                                                "id":  "armor-npc-1791647017149-8h46w-16-pix",
                                                "drModifier":  -2,
                                                "modifierDamageType":  "",
                                                "damageTaken":  0
                                            }
                                        ]
                      }
                  ],
    "basicMove":  "6 (-1 Peso)",
    "equipment":  "",
    "fpCurrent":  12,
    "hpCurrent":  15,
    "naturalDr":  0,
    "updatedAt":  1791945217140,
    "advantages":  "",
    "basicSpeed":  6.25,
    "blockNotes":  "+ Bônus Escudo",
    "dodgeNotes":  "-1 Peso",
    "extraItems":  [
                       {
                           "id":  "item-1791656564555-6jy",
                           "max":  20,
                           "name":  "Heavy Medium Shield (Casa)",
                           "current":  11,
                           "category":  "shield",
                           "isFavorite":  false
                       }
                   ],
    "playerName":  "Julio",
    "combatPerks":  "",
    "masterNotes":  "",
    "turnActions":  {
                        "notes":  "",
                        "shock":  0,
                        "blockCount":  0,
                        "dodgeCount":  0,
                        "parryCount":  0,
                        "usedRetreat":  false,
                        "fatigueAmountUsed":  0,
                        "usedBlockThisTurn":  false,
                        "usedFatigueThisTurn":  false
                    },
    "activeSpells":  [

                     ],
    "avatarPreset":  "knight",
    "combatSkills":  "",
    "characterType":  "player",
    "disadvantages":  "",
    "affectedSpells":  [

                       ],
    "armorLocations":  [
                           {
                               "location":  "Eye",
                               "rollTarget":  "-",
                               "penalty":  "-9",
                               "armorName":  "",
                               "dr":  0,
                               "notes":  "",
                               "additionalRule":  "Só consegue acertar o olho danos de Empalamento, Perfurante ou Magia",
                               "id":  "armor-npc-1791647017149-8h46w-0-tjo",
                               "drModifier":  0,
                               "modifierDamageType":  "",
                               "damageTaken":  0
                           },
                           {
                               "location":  "Head",
                               "rollTarget":  "3-4",
                               "penalty":  "-7",
                               "armorName":  "Coifa (Light Mail) + Proteção",
                               "dr":  4,
                               "notes":  "",
                               "additionalRule":  "Tem +2 de RD / Qualquer dano vira 4X",
                               "id":  "armor-npc-1791647017149-8h46w-1-tme",
                               "drModifier":  -2,
                               "modifierDamageType":  "contusao",
                               "damageTaken":  0
                           },
                           {
                               "location":  "Face",
                               "rollTarget":  "5",
                               "penalty":  "-5",
                               "armorName":  "",
                               "dr":  0,
                               "notes":  "",
                               "additionalRule":  "",
                               "id":  "armor-npc-1791647017149-8h46w-2-uax",
                               "drModifier":  0,
                               "modifierDamageType":  "",
                               "damageTaken":  0
                           },
                           {
                               "location":  "Left Leg",
                               "rollTarget":  "13-14",
                               "penalty":  "-2",
                               "armorName":  "Fine Mail",
                               "dr":  5,
                               "notes":  "",
                               "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                               "id":  "armor-npc-1791647017149-8h46w-3-wzc",
                               "drModifier":  -2,
                               "modifierDamageType":  "contusao",
                               "damageTaken":  0
                           },
                           {
                               "location":  "Right Leg",
                               "rollTarget":  "6-7",
                               "penalty":  "-2",
                               "armorName":  "Fine Mail",
                               "dr":  5,
                               "notes":  "",
                               "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                               "id":  "armor-npc-1791647017149-8h46w-4-lmw",
                               "drModifier":  -2,
                               "modifierDamageType":  "contusao",
                               "damageTaken":  0
                           },
                           {
                               "location":  "Left Shins",
                               "rollTarget":  "13-14",
                               "penalty":  "-2",
                               "armorName":  "Fine Mail",
                               "dr":  5,
                               "notes":  "",
                               "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                               "id":  "armor-npc-1791647017149-8h46w-5-qk6",
                               "drModifier":  -2,
                               "modifierDamageType":  "contusao",
                               "damageTaken":  0
                           },
                           {
                               "location":  "Right Shins",
                               "rollTarget":  "6-7",
                               "penalty":  "-2",
                               "armorName":  "Fine Mail",
                               "dr":  5,
                               "notes":  "",
                               "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                               "id":  "armor-npc-1791647017149-8h46w-6-0jo",
                               "drModifier":  -2,
                               "modifierDamageType":  "contusao",
                               "damageTaken":  0
                           },
                           {
                               "location":  "Left Arm",
                               "rollTarget":  "12",
                               "penalty":  "-2",
                               "armorName":  "Heavy Mail",
                               "dr":  6,
                               "notes":  "",
                               "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                               "id":  "armor-npc-1791647017149-8h46w-7-i1e",
                               "drModifier":  -2,
                               "modifierDamageType":  "contusao",
                               "damageTaken":  0
                           },
                           {
                               "location":  "Right Arm",
                               "rollTarget":  "8",
                               "penalty":  "-2",
                               "armorName":  "Heavy Mail",
                               "dr":  6,
                               "notes":  "",
                               "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                               "id":  "armor-npc-1791647017149-8h46w-8-j8t",
                               "drModifier":  -2,
                               "modifierDamageType":  "contusao",
                               "damageTaken":  0
                           },
                           {
                               "location":  "Left Forearm",
                               "rollTarget":  "12",
                               "penalty":  "-2",
                               "armorName":  "Medium Plate",
                               "dr":  7,
                               "notes":  "",
                               "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                               "id":  "armor-npc-1791647017149-8h46w-9-m2q",
                               "drModifier":  0,
                               "modifierDamageType":  "",
                               "damageTaken":  0
                           },
                           {
                               "location":  "Right Forearm",
                               "rollTarget":  "8",
                               "penalty":  "-2",
                               "armorName":  "Medium Plate",
                               "dr":  7,
                               "notes":  "",
                               "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                               "id":  "armor-npc-1791647017149-8h46w-10-fra",
                               "drModifier":  0,
                               "modifierDamageType":  "",
                               "damageTaken":  0
                           },
                           {
                               "location":  "Torso",
                               "rollTarget":  "9-10",
                               "penalty":  "0",
                               "armorName":  "Heavy Mail",
                               "dr":  6,
                               "notes":  "",
                               "additionalRule":  "",
                               "id":  "armor-npc-1791647017149-8h46w-11-rzg",
                               "drModifier":  -2,
                               "modifierDamageType":  "",
                               "damageTaken":  0
                           },
                           {
                               "location":  "Groin",
                               "rollTarget":  "11",
                               "penalty":  "-3",
                               "armorName":  "Heavy Mail",
                               "dr":  6,
                               "notes":  "",
                               "additionalRule":  "",
                               "id":  "armor-npc-1791647017149-8h46w-12-p9h",
                               "drModifier":  -2,
                               "modifierDamageType":  "",
                               "damageTaken":  0
                           },
                           {
                               "location":  "Hand",
                               "rollTarget":  "15",
                               "penalty":  "-4",
                               "armorName":  "Medium Plate",
                               "dr":  7,
                               "notes":  "",
                               "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                               "id":  "armor-npc-1791647017149-8h46w-13-m6q",
                               "drModifier":  0,
                               "modifierDamageType":  "",
                               "damageTaken":  0
                           },
                           {
                               "location":  "Feet",
                               "rollTarget":  "16",
                               "penalty":  "-4",
                               "armorName":  "Boots",
                               "dr":  2,
                               "notes":  "",
                               "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                               "id":  "armor-npc-1791647017149-8h46w-14-l7l",
                               "drModifier":  0,
                               "modifierDamageType":  "",
                               "damageTaken":  0
                           },
                           {
                               "location":  "Neck",
                               "rollTarget":  "17-18",
                               "penalty":  "-5",
                               "armorName":  "",
                               "dr":  0,
                               "notes":  "",
                               "additionalRule":  "Contusão vira 1,5, corte vai de 1,5 para 2.0",
                               "id":  "armor-npc-1791647017149-8h46w-15-vvf",
                               "drModifier":  0,
                               "modifierDamageType":  "",
                               "damageTaken":  0
                           },
                           {
                               "location":  "Vitals",
                               "rollTarget":  "-",
                               "penalty":  "-3",
                               "armorName":  "Heavy Mail",
                               "dr":  6,
                               "notes":  "",
                               "additionalRule":  "Empalamento e perfuração vira x3",
                               "id":  "armor-npc-1791647017149-8h46w-16-pix",
                               "drModifier":  -2,
                               "modifierDamageType":  "",
                               "damageTaken":  0
                           }
                       ],
    "assistantNotes":  "",
    "activeArmorKitId":  "kit-1791939800700-rwgw",
    "statusConditions":  [

                         ],
    "conditionMetadata":  {

                          },
    "isVisibleToPlayer":  false,
    "bodyPartDamageOverrides":  {

                                }
};

export const HOUNDS_PLAYERS: NPC[] = [
    {
        "dx":  13,
        "ht":  12,
        "id":  "npc-1791647017149-8h46w",
        "iq":  10,
        "st":  14,
        "per":  13,
        "name":  "Azur",
        "will":  11,
        "block":  11,
        "dodge":  9,
        "fpMax":  12,
        "hpMax":  15,
        "title":  "Membro de The Hounds",
        "avatar":  "https://cjjhlorfnjspikjhsanx.supabase.co/storage/v1/object/public/hounds-images/mv3vwpc4acakibj4.png",
        "height":  "",
        "isDead":  false,
        "skills":  "",
        "spells":  [

                   ],
        "weight":  "",
        "history":  [

                    ],
        "parries":  [
                        {
                            "id":  "parry-npc-1791647017149-8h46w-1",
                            "notes":  "+ Bônus Escudo",
                            "value":  14,
                            "parryType":  "",
                            "weaponName":  "Greatsword"
                        }
                    ],
        "weapons":  [
                        {
                            "id":  "wpn-1791940306927-tnf4",
                            "name":  "Greatsword",
                            "nh":  "DX+5",
                            "damage":  "4d+1",
                            "type":  "Swing",
                            "reach":  "1 / 2",
                            "modes":  [
                                          {
                                              "id":  "mode-1791940222532-1",
                                              "name":  "Cutting",
                                              "damage":  "4d+1",
                                              "type":  "Swing",
                                              "reach":  "1 / 2"
                                          },
                                          {
                                              "id":  "mode-1791940236601-00kx",
                                              "name":  "Crushing",
                                              "damage":  "2d+1",
                                              "type":  "Thrust",
                                              "reach":  "2"
                                          }
                                      ],
                            "notes":  "Balanced and Fine"
                        },
                        {
                            "id":  "wpn-1791940374600-fzwd",
                            "name":  "Long Knife",
                            "nh":  "DX+1",
                            "damage":  "2d-1",
                            "type":  "Swing",
                            "reach":  "",
                            "modes":  [
                                          {
                                              "id":  "mode-1791940312103-1",
                                              "name":  "Cutting",
                                              "damage":  "2d-1",
                                              "type":  "Swing",
                                              "reach":  ""
                                          },
                                          {
                                              "id":  "mode-1791940325230-fm1z",
                                              "name":  "Impalling",
                                              "damage":  "1d",
                                              "type":  "Thrust",
                                              "reach":  ""
                                          }
                                      ],
                            "notes":  ""
                        },
                        {
                            "id":  "wpn-1791940416394-2vot",
                            "name":  "Soco",
                            "nh":  "DX+2",
                            "damage":  "1d",
                            "type":  "Thrust",
                            "reach":  "",
                            "modes":  [
                                          {
                                              "id":  "mode-1791940377398-1",
                                              "name":  "Crushing",
                                              "damage":  "1d",
                                              "type":  "Thrust",
                                              "reach":  ""
                                          }
                                      ],
                            "notes":  ""
                        },
                        {
                            "id":  "wpn-1791940451887-qwp2",
                            "name":  "Chute",
                            "nh":  "DX+2",
                            "damage":  "1d+2",
                            "type":  "Thrust",
                            "reach":  "",
                            "modes":  [
                                          {
                                              "id":  "mode-1791940422100-1",
                                              "name":  "Crushing",
                                              "damage":  "1d+2",
                                              "type":  "Thrust",
                                              "reach":  ""
                                          }
                                      ],
                            "notes":  ""
                        }
                    ],
        "armorKits":  [
                          {
                              "id":  "kit-1791939800700-rwgw",
                              "name":  "Kit 2",
                              "isActive":  true,
                              "locations":  [
                                                {
                                                    "location":  "Eye",
                                                    "rollTarget":  "-",
                                                    "penalty":  "-9",
                                                    "armorName":  "",
                                                    "dr":  0,
                                                    "notes":  "",
                                                    "additionalRule":  "Só consegue acertar o olho danos de Empalamento, Perfurante ou Magia",
                                                    "id":  "armor-npc-1791647017149-8h46w-0-tjo",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Head",
                                                    "rollTarget":  "3-4",
                                                    "penalty":  "-7",
                                                    "armorName":  "Coifa (Light Mail) + Proteção",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "Tem +2 de RD / Qualquer dano vira 4X",
                                                    "id":  "armor-npc-1791647017149-8h46w-1-tme",
                                                    "drModifier":  -2,
                                                    "modifierDamageType":  "contusao",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Face",
                                                    "rollTarget":  "5",
                                                    "penalty":  "-5",
                                                    "armorName":  "",
                                                    "dr":  0,
                                                    "notes":  "",
                                                    "additionalRule":  "",
                                                    "id":  "armor-npc-1791647017149-8h46w-2-uax",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Left Leg",
                                                    "rollTarget":  "13-14",
                                                    "penalty":  "-2",
                                                    "armorName":  "Fine Mail",
                                                    "dr":  5,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791647017149-8h46w-3-wzc",
                                                    "drModifier":  -2,
                                                    "modifierDamageType":  "contusao",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Right Leg",
                                                    "rollTarget":  "6-7",
                                                    "penalty":  "-2",
                                                    "armorName":  "Fine Mail",
                                                    "dr":  5,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791647017149-8h46w-4-lmw",
                                                    "drModifier":  -2,
                                                    "modifierDamageType":  "contusao",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Left Shins",
                                                    "rollTarget":  "13-14",
                                                    "penalty":  "-2",
                                                    "armorName":  "Fine Mail",
                                                    "dr":  5,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791647017149-8h46w-5-qk6",
                                                    "drModifier":  -2,
                                                    "modifierDamageType":  "contusao",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Right Shins",
                                                    "rollTarget":  "6-7",
                                                    "penalty":  "-2",
                                                    "armorName":  "Fine Mail",
                                                    "dr":  5,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791647017149-8h46w-6-0jo",
                                                    "drModifier":  -2,
                                                    "modifierDamageType":  "contusao",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Left Arm",
                                                    "rollTarget":  "12",
                                                    "penalty":  "-2",
                                                    "armorName":  "Heavy Mail",
                                                    "dr":  6,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791647017149-8h46w-7-i1e",
                                                    "drModifier":  -2,
                                                    "modifierDamageType":  "contusao",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Right Arm",
                                                    "rollTarget":  "8",
                                                    "penalty":  "-2",
                                                    "armorName":  "Heavy Mail",
                                                    "dr":  6,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791647017149-8h46w-8-j8t",
                                                    "drModifier":  -2,
                                                    "modifierDamageType":  "contusao",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Left Forearm",
                                                    "rollTarget":  "12",
                                                    "penalty":  "-2",
                                                    "armorName":  "Medium Plate",
                                                    "dr":  7,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791647017149-8h46w-9-m2q",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Right Forearm",
                                                    "rollTarget":  "8",
                                                    "penalty":  "-2",
                                                    "armorName":  "Medium Plate",
                                                    "dr":  7,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791647017149-8h46w-10-fra",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Torso",
                                                    "rollTarget":  "9-10",
                                                    "penalty":  "0",
                                                    "armorName":  "Heavy Mail",
                                                    "dr":  6,
                                                    "notes":  "",
                                                    "additionalRule":  "",
                                                    "id":  "armor-npc-1791647017149-8h46w-11-rzg",
                                                    "drModifier":  -2,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Groin",
                                                    "rollTarget":  "11",
                                                    "penalty":  "-3",
                                                    "armorName":  "Heavy Mail",
                                                    "dr":  6,
                                                    "notes":  "",
                                                    "additionalRule":  "",
                                                    "id":  "armor-npc-1791647017149-8h46w-12-p9h",
                                                    "drModifier":  -2,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Hand",
                                                    "rollTarget":  "15",
                                                    "penalty":  "-4",
                                                    "armorName":  "Medium Plate",
                                                    "dr":  7,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791647017149-8h46w-13-m6q",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Feet",
                                                    "rollTarget":  "16",
                                                    "penalty":  "-4",
                                                    "armorName":  "Boots",
                                                    "dr":  2,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791647017149-8h46w-14-l7l",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Neck",
                                                    "rollTarget":  "17-18",
                                                    "penalty":  "-5",
                                                    "armorName":  "",
                                                    "dr":  0,
                                                    "notes":  "",
                                                    "additionalRule":  "Contusão vira 1,5, corte vai de 1,5 para 2.0",
                                                    "id":  "armor-npc-1791647017149-8h46w-15-vvf",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Vitals",
                                                    "rollTarget":  "-",
                                                    "penalty":  "-3",
                                                    "armorName":  "Heavy Mail",
                                                    "dr":  6,
                                                    "notes":  "",
                                                    "additionalRule":  "Empalamento e perfuração vira x3",
                                                    "id":  "armor-npc-1791647017149-8h46w-16-pix",
                                                    "drModifier":  -2,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                }
                                            ]
                          }
                      ],
        "basicMove":  "6 (-1 Peso)",
        "equipment":  "",
        "fpCurrent":  12,
        "hpCurrent":  15,
        "naturalDr":  0,
        "updatedAt":  1791945217140,
        "advantages":  "",
        "basicSpeed":  6.25,
        "blockNotes":  "+ Bônus Escudo",
        "dodgeNotes":  "-1 Peso",
        "extraItems":  [
                           {
                               "id":  "item-1791656564555-6jy",
                               "max":  20,
                               "name":  "Heavy Medium Shield (Casa)",
                               "current":  11,
                               "category":  "shield",
                               "isFavorite":  false
                           }
                       ],
        "playerName":  "Julio",
        "combatPerks":  "",
        "masterNotes":  "",
        "turnActions":  {
                            "notes":  "",
                            "shock":  0,
                            "blockCount":  0,
                            "dodgeCount":  0,
                            "parryCount":  0,
                            "usedRetreat":  false,
                            "fatigueAmountUsed":  0,
                            "usedBlockThisTurn":  false,
                            "usedFatigueThisTurn":  false
                        },
        "activeSpells":  [

                         ],
        "avatarPreset":  "knight",
        "combatSkills":  "",
        "characterType":  "player",
        "disadvantages":  "",
        "affectedSpells":  [

                           ],
        "armorLocations":  [
                               {
                                   "location":  "Eye",
                                   "rollTarget":  "-",
                                   "penalty":  "-9",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "Só consegue acertar o olho danos de Empalamento, Perfurante ou Magia",
                                   "id":  "armor-npc-1791647017149-8h46w-0-tjo",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Head",
                                   "rollTarget":  "3-4",
                                   "penalty":  "-7",
                                   "armorName":  "Coifa (Light Mail) + Proteção",
                                   "dr":  4,
                                   "notes":  "",
                                   "additionalRule":  "Tem +2 de RD / Qualquer dano vira 4X",
                                   "id":  "armor-npc-1791647017149-8h46w-1-tme",
                                   "drModifier":  -2,
                                   "modifierDamageType":  "contusao",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Face",
                                   "rollTarget":  "5",
                                   "penalty":  "-5",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "",
                                   "id":  "armor-npc-1791647017149-8h46w-2-uax",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Left Leg",
                                   "rollTarget":  "13-14",
                                   "penalty":  "-2",
                                   "armorName":  "Fine Mail",
                                   "dr":  5,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791647017149-8h46w-3-wzc",
                                   "drModifier":  -2,
                                   "modifierDamageType":  "contusao",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Right Leg",
                                   "rollTarget":  "6-7",
                                   "penalty":  "-2",
                                   "armorName":  "Fine Mail",
                                   "dr":  5,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791647017149-8h46w-4-lmw",
                                   "drModifier":  -2,
                                   "modifierDamageType":  "contusao",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Left Shins",
                                   "rollTarget":  "13-14",
                                   "penalty":  "-2",
                                   "armorName":  "Fine Mail",
                                   "dr":  5,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791647017149-8h46w-5-qk6",
                                   "drModifier":  -2,
                                   "modifierDamageType":  "contusao",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Right Shins",
                                   "rollTarget":  "6-7",
                                   "penalty":  "-2",
                                   "armorName":  "Fine Mail",
                                   "dr":  5,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791647017149-8h46w-6-0jo",
                                   "drModifier":  -2,
                                   "modifierDamageType":  "contusao",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Left Arm",
                                   "rollTarget":  "12",
                                   "penalty":  "-2",
                                   "armorName":  "Heavy Mail",
                                   "dr":  6,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791647017149-8h46w-7-i1e",
                                   "drModifier":  -2,
                                   "modifierDamageType":  "contusao",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Right Arm",
                                   "rollTarget":  "8",
                                   "penalty":  "-2",
                                   "armorName":  "Heavy Mail",
                                   "dr":  6,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791647017149-8h46w-8-j8t",
                                   "drModifier":  -2,
                                   "modifierDamageType":  "contusao",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Left Forearm",
                                   "rollTarget":  "12",
                                   "penalty":  "-2",
                                   "armorName":  "Medium Plate",
                                   "dr":  7,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791647017149-8h46w-9-m2q",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Right Forearm",
                                   "rollTarget":  "8",
                                   "penalty":  "-2",
                                   "armorName":  "Medium Plate",
                                   "dr":  7,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791647017149-8h46w-10-fra",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Torso",
                                   "rollTarget":  "9-10",
                                   "penalty":  "0",
                                   "armorName":  "Heavy Mail",
                                   "dr":  6,
                                   "notes":  "",
                                   "additionalRule":  "",
                                   "id":  "armor-npc-1791647017149-8h46w-11-rzg",
                                   "drModifier":  -2,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Groin",
                                   "rollTarget":  "11",
                                   "penalty":  "-3",
                                   "armorName":  "Heavy Mail",
                                   "dr":  6,
                                   "notes":  "",
                                   "additionalRule":  "",
                                   "id":  "armor-npc-1791647017149-8h46w-12-p9h",
                                   "drModifier":  -2,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Hand",
                                   "rollTarget":  "15",
                                   "penalty":  "-4",
                                   "armorName":  "Medium Plate",
                                   "dr":  7,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791647017149-8h46w-13-m6q",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Feet",
                                   "rollTarget":  "16",
                                   "penalty":  "-4",
                                   "armorName":  "Boots",
                                   "dr":  2,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791647017149-8h46w-14-l7l",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Neck",
                                   "rollTarget":  "17-18",
                                   "penalty":  "-5",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "Contusão vira 1,5, corte vai de 1,5 para 2.0",
                                   "id":  "armor-npc-1791647017149-8h46w-15-vvf",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Vitals",
                                   "rollTarget":  "-",
                                   "penalty":  "-3",
                                   "armorName":  "Heavy Mail",
                                   "dr":  6,
                                   "notes":  "",
                                   "additionalRule":  "Empalamento e perfuração vira x3",
                                   "id":  "armor-npc-1791647017149-8h46w-16-pix",
                                   "drModifier":  -2,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               }
                           ],
        "assistantNotes":  "",
        "activeArmorKitId":  "kit-1791939800700-rwgw",
        "statusConditions":  [

                             ],
        "conditionMetadata":  {

                              },
        "isVisibleToPlayer":  false,
        "bodyPartDamageOverrides":  {

                                    }
    },
    {
        "dx":  12,
        "ht":  12,
        "id":  "npc-1791656410781-k0cy8",
        "iq":  11,
        "st":  13,
        "per":  11,
        "name":  "Duene ",
        "will":  10,
        "block":  12,
        "dodge":  9,
        "fpMax":  12,
        "hpMax":  14,
        "title":  "Membro de The Hounds",
        "avatar":  "https://cjjhlorfnjspikjhsanx.supabase.co/storage/v1/object/public/hounds-images/mv3vwpc6qoqfd0xo.png",
        "height":  "",
        "isDead":  false,
        "skills":  "",
        "spells":  [

                   ],
        "weight":  "",
        "history":  [

                    ],
        "parries":  [
                        {
                            "id":  "parry-npc-1791656410781-k0cy8-1",
                            "notes":  "+3 Bônus Escudo",
                            "value":  12,
                            "parryType":  "",
                            "weaponName":  "Thrusting Broadsword"
                        }
                    ],
        "weapons":  [
                        {
                            "id":  "wpn-1791940581092-h5h6",
                            "name":  "Thrusting Broadsword",
                            "nh":  "DX+5",
                            "damage":  "3d",
                            "type":  "Swing",
                            "reach":  "",
                            "modes":  [
                                          {
                                              "id":  "mode-1791940540316-1",
                                              "name":  "Cutting",
                                              "damage":  "3d",
                                              "type":  "Swing",
                                              "reach":  ""
                                          },
                                          {
                                              "id":  "mode-1791940563936-z86n",
                                              "name":  "Impaling",
                                              "damage":  "2d-1",
                                              "type":  "Thrust",
                                              "reach":  ""
                                          }
                                      ],
                            "notes":  ""
                        },
                        {
                            "id":  "wpn-1791940631921-dj6q",
                            "name":  "Long Knife",
                            "nh":  "DX",
                            "damage":  "2d-2",
                            "type":  "Swing",
                            "reach":  "",
                            "modes":  [
                                          {
                                              "id":  "mode-1791940587065-1",
                                              "name":  "Cutting",
                                              "damage":  "2d-2",
                                              "type":  "Swing",
                                              "reach":  ""
                                          },
                                          {
                                              "id":  "mode-1791940599889-8ikb",
                                              "name":  "Impalling",
                                              "damage":  "1d",
                                              "type":  "Thrust",
                                              "reach":  ""
                                          }
                                      ],
                            "notes":  ""
                        },
                        {
                            "id":  "wpn-1791940690621-bm7t",
                            "name":  "Long Spear",
                            "nh":  "DX-1",
                            "damage":  "1d+2",
                            "type":  "Thrust",
                            "reach":  "1",
                            "modes":  [
                                          {
                                              "id":  "mode-1791940647155-1",
                                              "name":  "Impaling",
                                              "damage":  "1d+2",
                                              "type":  "Thrust",
                                              "reach":  "1"
                                          },
                                          {
                                              "id":  "mode-1791940650233-zpfn",
                                              "name":  "Impaling",
                                              "damage":  "1d+3",
                                              "type":  "Thrust",
                                              "reach":  "2"
                                          }
                                      ],
                            "notes":  ""
                        },
                        {
                            "id":  "wpn-1791940732463-tk32",
                            "name":  "Shield Bash",
                            "nh":  "DX+2",
                            "damage":  "1d+2",
                            "type":  "Thrust",
                            "reach":  "",
                            "modes":  [
                                          {
                                              "id":  "mode-1791940701956-1",
                                              "name":  "Crushing",
                                              "damage":  "1d+2",
                                              "type":  "Thrust",
                                              "reach":  ""
                                          }
                                      ],
                            "notes":  ""
                        },
                        {
                            "id":  "wpn-1791940767068-h2r7",
                            "name":  "Crossbow",
                            "nh":  "DX",
                            "damage":  "2d",
                            "type":  "Thrust",
                            "reach":  "",
                            "modes":  [
                                          {
                                              "id":  "mode-1791940735407-1",
                                              "name":  "Impaling",
                                              "damage":  "2d",
                                              "type":  "Thrust",
                                              "reach":  ""
                                          }
                                      ],
                            "notes":  ""
                        }
                    ],
        "armorKits":  [
                          {
                              "id":  "kit-1791939354830-2pe4",
                              "name":  "Combate",
                              "isActive":  true,
                              "locations":  [
                                                {
                                                    "location":  "Eye",
                                                    "rollTarget":  "-",
                                                    "penalty":  "-9",
                                                    "armorName":  "",
                                                    "dr":  0,
                                                    "notes":  "",
                                                    "additionalRule":  "Só consegue acertar o olho danos de Empalamento, Perfurante ou Magia",
                                                    "id":  "armor-npc-1791656410781-k0cy8-0-sk3",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Head",
                                                    "rollTarget":  "3-4",
                                                    "penalty":  "-7",
                                                    "armorName":  "Light Mail",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "Tem +2 de RD / Qualquer dano vira 4X",
                                                    "id":  "armor-npc-1791656410781-k0cy8-1-wm8",
                                                    "drModifier":  -2,
                                                    "modifierDamageType":  "contusao",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Face",
                                                    "rollTarget":  "5",
                                                    "penalty":  "-5",
                                                    "armorName":  "",
                                                    "dr":  0,
                                                    "notes":  "",
                                                    "additionalRule":  "",
                                                    "id":  "armor-npc-1791656410781-k0cy8-2-5vo",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Left Leg",
                                                    "rollTarget":  "13-14",
                                                    "penalty":  "-2",
                                                    "armorName":  "Light Brigantine",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791656410781-k0cy8-3-pz6",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Right Leg",
                                                    "rollTarget":  "6-7",
                                                    "penalty":  "-2",
                                                    "armorName":  "Light Brigantine",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791656410781-k0cy8-4-5tl",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Left Shins",
                                                    "rollTarget":  "13-14",
                                                    "penalty":  "-2",
                                                    "armorName":  "Light Brigantine",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791656410781-k0cy8-5-gjz",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Right Shins",
                                                    "rollTarget":  "6-7",
                                                    "penalty":  "-2",
                                                    "armorName":  "Light Brigantine",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791656410781-k0cy8-6-n09",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Left Arm",
                                                    "rollTarget":  "12",
                                                    "penalty":  "-2",
                                                    "armorName":  "Heavy Mail",
                                                    "dr":  6,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791656410781-k0cy8-7-is9",
                                                    "drModifier":  -2,
                                                    "modifierDamageType":  "contusao",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Right Arm",
                                                    "rollTarget":  "8",
                                                    "penalty":  "-2",
                                                    "armorName":  "Heavy Mail",
                                                    "dr":  6,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791656410781-k0cy8-8-yl7",
                                                    "drModifier":  -2,
                                                    "modifierDamageType":  "contusao",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Left Forearm",
                                                    "rollTarget":  "12",
                                                    "penalty":  "-2",
                                                    "armorName":  "Heavy Mail",
                                                    "dr":  6,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791656410781-k0cy8-9-vcv",
                                                    "drModifier":  -2,
                                                    "modifierDamageType":  "contusao",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Right Forearm",
                                                    "rollTarget":  "8",
                                                    "penalty":  "-2",
                                                    "armorName":  "Heavy Mail",
                                                    "dr":  6,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791656410781-k0cy8-10-3un",
                                                    "drModifier":  -2,
                                                    "modifierDamageType":  "contusao",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Torso",
                                                    "rollTarget":  "9-10",
                                                    "penalty":  "0",
                                                    "armorName":  "Medium Plate",
                                                    "dr":  7,
                                                    "notes":  "",
                                                    "additionalRule":  "",
                                                    "id":  "armor-npc-1791656410781-k0cy8-11-qtt",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Groin",
                                                    "rollTarget":  "11",
                                                    "penalty":  "-3",
                                                    "armorName":  "Medium Plate",
                                                    "dr":  7,
                                                    "notes":  "",
                                                    "additionalRule":  "",
                                                    "id":  "armor-npc-1791656410781-k0cy8-12-w4a",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Hand",
                                                    "rollTarget":  "15",
                                                    "penalty":  "-4",
                                                    "armorName":  "Heavy Mail",
                                                    "dr":  6,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791656410781-k0cy8-13-s0q",
                                                    "drModifier":  -2,
                                                    "modifierDamageType":  "contusao",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Feet",
                                                    "rollTarget":  "16",
                                                    "penalty":  "-4",
                                                    "armorName":  "Boots",
                                                    "dr":  3,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791656410781-k0cy8-14-tyg",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Neck",
                                                    "rollTarget":  "17-18",
                                                    "penalty":  "-5",
                                                    "armorName":  "Medium Plate",
                                                    "dr":  7,
                                                    "notes":  "",
                                                    "additionalRule":  "Contusão vira 1,5, corte vai de 1,5 para 2.0",
                                                    "id":  "armor-npc-1791656410781-k0cy8-15-tzo",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Vitals",
                                                    "rollTarget":  "-",
                                                    "penalty":  "-3",
                                                    "armorName":  "Medium Plate",
                                                    "dr":  7,
                                                    "notes":  "",
                                                    "additionalRule":  "Empalamento e perfuração vira x3",
                                                    "id":  "armor-npc-1791656410781-k0cy8-16-roe",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                }
                                            ]
                          }
                      ],
        "basicMove":  "5 (-1 Peso)",
        "equipment":  "",
        "fpCurrent":  12,
        "hpCurrent":  14,
        "naturalDr":  0,
        "updatedAt":  1791945217140,
        "advantages":  "",
        "basicSpeed":  6,
        "blockNotes":  "+3 Bônus Escudo",
        "dodgeNotes":  "(-1 Peso)",
        "extraItems":  [
                           {
                               "id":  "item-1791656746146-2nm",
                               "max":  21,
                               "name":  "Kite Shield (DB 3 / DR 5)",
                               "current":  21,
                               "category":  "shield",
                               "isFavorite":  true
                           },
                           {
                               "id":  "item-1791656746442-7kw",
                               "max":  22,
                               "name":  "Heavy Large Shield (Casa)",
                               "current":  10,
                               "category":  "shield",
                               "isFavorite":  false
                           },
                           {
                               "id":  "item-1791656746642-bu9",
                               "max":  22,
                               "name":  "Kite Shield 2 (Casa)",
                               "current":  22,
                               "category":  "shield"
                           },
                           {
                               "id":  "item-1791656746850-0lf",
                               "max":  18,
                               "name":  "Shield 4 (Viagem)",
                               "current":  18,
                               "category":  "shield"
                           },
                           {
                               "id":  "item-1791656747882-ogo",
                               "max":  21,
                               "name":  "Kite Shield 1 (Casa)",
                               "current":  9,
                               "category":  "shield"
                           }
                       ],
        "playerName":  "Jorio",
        "combatPerks":  "",
        "masterNotes":  "",
        "turnActions":  {
                            "notes":  "",
                            "shock":  0,
                            "blockCount":  0,
                            "dodgeCount":  0,
                            "parryCount":  0,
                            "usedRetreat":  false,
                            "fatigueAmountUsed":  0,
                            "usedBlockThisTurn":  false,
                            "usedFatigueThisTurn":  false
                        },
        "activeSpells":  [

                         ],
        "avatarPreset":  "knight",
        "combatSkills":  "",
        "characterType":  "player",
        "disadvantages":  "",
        "affectedSpells":  [

                           ],
        "armorLocations":  [
                               {
                                   "location":  "Eye",
                                   "rollTarget":  "-",
                                   "penalty":  "-9",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "Só consegue acertar o olho danos de Empalamento, Perfurante ou Magia",
                                   "id":  "armor-npc-1791656410781-k0cy8-0-sk3",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Head",
                                   "rollTarget":  "3-4",
                                   "penalty":  "-7",
                                   "armorName":  "Light Mail",
                                   "dr":  4,
                                   "notes":  "",
                                   "additionalRule":  "Tem +2 de RD / Qualquer dano vira 4X",
                                   "id":  "armor-npc-1791656410781-k0cy8-1-wm8",
                                   "drModifier":  -2,
                                   "modifierDamageType":  "contusao",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Face",
                                   "rollTarget":  "5",
                                   "penalty":  "-5",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "",
                                   "id":  "armor-npc-1791656410781-k0cy8-2-5vo",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Left Leg",
                                   "rollTarget":  "13-14",
                                   "penalty":  "-2",
                                   "armorName":  "Light Brigantine",
                                   "dr":  4,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791656410781-k0cy8-3-pz6",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Right Leg",
                                   "rollTarget":  "6-7",
                                   "penalty":  "-2",
                                   "armorName":  "Light Brigantine",
                                   "dr":  4,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791656410781-k0cy8-4-5tl",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Left Shins",
                                   "rollTarget":  "13-14",
                                   "penalty":  "-2",
                                   "armorName":  "Light Brigantine",
                                   "dr":  4,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791656410781-k0cy8-5-gjz",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Right Shins",
                                   "rollTarget":  "6-7",
                                   "penalty":  "-2",
                                   "armorName":  "Light Brigantine",
                                   "dr":  4,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791656410781-k0cy8-6-n09",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Left Arm",
                                   "rollTarget":  "12",
                                   "penalty":  "-2",
                                   "armorName":  "Heavy Mail",
                                   "dr":  6,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791656410781-k0cy8-7-is9",
                                   "drModifier":  -2,
                                   "modifierDamageType":  "contusao",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Right Arm",
                                   "rollTarget":  "8",
                                   "penalty":  "-2",
                                   "armorName":  "Heavy Mail",
                                   "dr":  6,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791656410781-k0cy8-8-yl7",
                                   "drModifier":  -2,
                                   "modifierDamageType":  "contusao",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Left Forearm",
                                   "rollTarget":  "12",
                                   "penalty":  "-2",
                                   "armorName":  "Heavy Mail",
                                   "dr":  6,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791656410781-k0cy8-9-vcv",
                                   "drModifier":  -2,
                                   "modifierDamageType":  "contusao",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Right Forearm",
                                   "rollTarget":  "8",
                                   "penalty":  "-2",
                                   "armorName":  "Heavy Mail",
                                   "dr":  6,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791656410781-k0cy8-10-3un",
                                   "drModifier":  -2,
                                   "modifierDamageType":  "contusao",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Torso",
                                   "rollTarget":  "9-10",
                                   "penalty":  "0",
                                   "armorName":  "Medium Plate",
                                   "dr":  7,
                                   "notes":  "",
                                   "additionalRule":  "",
                                   "id":  "armor-npc-1791656410781-k0cy8-11-qtt",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Groin",
                                   "rollTarget":  "11",
                                   "penalty":  "-3",
                                   "armorName":  "Medium Plate",
                                   "dr":  7,
                                   "notes":  "",
                                   "additionalRule":  "",
                                   "id":  "armor-npc-1791656410781-k0cy8-12-w4a",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Hand",
                                   "rollTarget":  "15",
                                   "penalty":  "-4",
                                   "armorName":  "Heavy Mail",
                                   "dr":  6,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791656410781-k0cy8-13-s0q",
                                   "drModifier":  -2,
                                   "modifierDamageType":  "contusao",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Feet",
                                   "rollTarget":  "16",
                                   "penalty":  "-4",
                                   "armorName":  "Boots",
                                   "dr":  3,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791656410781-k0cy8-14-tyg",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Neck",
                                   "rollTarget":  "17-18",
                                   "penalty":  "-5",
                                   "armorName":  "Medium Plate",
                                   "dr":  7,
                                   "notes":  "",
                                   "additionalRule":  "Contusão vira 1,5, corte vai de 1,5 para 2.0",
                                   "id":  "armor-npc-1791656410781-k0cy8-15-tzo",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Vitals",
                                   "rollTarget":  "-",
                                   "penalty":  "-3",
                                   "armorName":  "Medium Plate",
                                   "dr":  7,
                                   "notes":  "",
                                   "additionalRule":  "Empalamento e perfuração vira x3",
                                   "id":  "armor-npc-1791656410781-k0cy8-16-roe",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               }
                           ],
        "assistantNotes":  "",
        "activeArmorKitId":  "kit-1791939354830-2pe4",
        "statusConditions":  [

                             ],
        "conditionMetadata":  {

                              },
        "isVisibleToPlayer":  false
    },
    {
        "dx":  10,
        "ht":  10,
        "id":  "npc-1791656413293-ia1k7",
        "iq":  15,
        "st":  10,
        "per":  10,
        "name":  "Warren",
        "will":  12,
        "block":  0,
        "dodge":  7,
        "fpMax":  10,
        "hpMax":  10,
        "title":  "Membro de The Hounds",
        "avatar":  "https://cjjhlorfnjspikjhsanx.supabase.co/storage/v1/object/public/hounds-images/mv3vwp8qfrj9becc.png",
        "height":  "",
        "isDead":  false,
        "skills":  "",
        "spells":  [
  {
    "id": "spl-warren-001",
    "name": "Light",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Light and Darkness",
    "class": "Regular",
    "duration": "1 minute.",
    "cost": "1 to cast; 1 to maintain.",
    "timeToCast": "",
    "description": "Produces a small light, like a candle flame. It stays still unless the caster concentrates on moving it; then it can travel at Move 5."
  },
  {
    "id": "spl-warren-002",
    "name": "Sense Danger",
    "nh": "IQ+2",
    "isFavorite": false,
    "notes": "",
    "college": "Protection and Warning",
    "class": "Information",
    "duration": "Instantaneous.",
    "cost": "3.",
    "timeToCast": "",
    "description": "Tells the caster if any immediate danger is nearby; can also detect a faraway danger if it threatens to come close and strike! Gives the nature of any danger that is only a minute or so away; if there is a danger within five minutes, the spell produces foreboding but no details (except possibly on a critical success)."
  },
  {
    "id": "spl-warren-003",
    "name": "Lend Energy",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Healing",
    "class": "Regular",
    "duration": "",
    "cost": "Any amount; the energy spent by the caster goes to the subject as restored FP (e.g., if the caster spends 5 energy, the subject regains 5 lost FP). Casting cost is not reduced by high skill.",
    "timeToCast": "",
    "description": "Restores the subject’s lost Fatigue Points, at an energy cost to the caster. Cannot increase the subject’s FP score above its normal maximum."
  },
  {
    "id": "spl-warren-004",
    "name": "Continual Light",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Light and Darkness",
    "class": "Regular",
    "duration": "Variable. Roll 2d for number of days. Does not count as a spell “on.”",
    "cost": "2 for a dim glow, 4 for the brightness of a fire, 6 for a glare so bright as to be painful at close range.",
    "timeToCast": "",
    "description": "When cast on a small object (up to fist-sized or 1 lb.) or a small part of a larger object, this spell makes that object glow with white light."
  },
  {
    "id": "spl-warren-005",
    "name": "Detect Poison",
    "nh": "IQ+2",
    "isFavorite": false,
    "notes": "",
    "college": "Protection and Warning, Healing",
    "class": "Area; Information",
    "duration": "",
    "cost": "2.",
    "timeToCast": "2 seconds.",
    "description": "Reveals the presence of toxins and gives a +2 on any subsequent Poisons roll to identify the exact agent(s). The caster may exclude any types of poisons he wishes upon casting (to specifically search for nerve agents, for instance, or to exclude “benign” poisons like alcohol). This is also a Healing spell."
  },
  {
    "id": "spl-warren-006",
    "name": "Recover Energy",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Healing",
    "class": "Special",
    "duration": "",
    "cost": "None.",
    "timeToCast": "",
    "description": "This spell allows the caster to rest and recover Fatigue Points more quickly than normal by drawing energy from the mana around him. A normal person recovers 1 FP every 10 minutes. A mage who knows this spell at skill 15 or higher recovers 1 FP every 5 minutes. A mage who knows this spell at skill 20 or higher recovers 1 FP every 2 minutes. No further improvement is possible. Note that this spell works on the caster himself; it cannot restore FP to others. The mage must rest quietly, but no ritual or die roll is required. While resting, he can maintain ordinary spells, but not those that require concentration. This spell does not function in low- or no-mana areas."
  },
  {
    "id": "spl-warren-007",
    "name": "Darkness",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Light and Darkness",
    "class": "Area",
    "duration": "1 minute.",
    "cost": "2 to cast; 1 to maintain.",
    "timeToCast": "",
    "description": "Cloaks the area of effect in pitch darkness. A person inside the area can see out normally, but can see nothing else within the area. Those outside the area can see only darkness within. Thus, attacks out of darkness suffer no penalty, but attacks into darkness are at a penalty; see Visibility (p. 394) for combat rules. The Dark Vision advantage lets you see through a Darkness spell, but Night Vision and Infravision do not."
  },
  {
    "id": "spl-warren-008",
    "name": "Magelock",
    "nh": "IQ+2",
    "isFavorite": false,
    "notes": "",
    "college": "Protection and Warning",
    "class": "Regular; Resists Lockmaster spell",
    "duration": "6 hours.",
    "cost": "3 to cast; 2 to maintain.",
    "timeToCast": "4 seconds.",
    "description": "Locks a door magically. The door will not open unless the spell is removed (Counterspell and Lockmaster are both able to counter it) or the door itself is destroyed."
  },
  {
    "id": "spl-warren-009",
    "name": "Blur",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Light and Darkness",
    "class": "Regular",
    "duration": "1 minute.",
    "cost": "1 to 5 to cast; the same to maintain.",
    "timeToCast": "2 seconds.",
    "description": "This spell makes the subject harder to see and therefore harder to hit with attacks. Each point of energy gives -1 to the effective skill of any attack on the subject, to a maximum of -5."
  },
  {
    "id": "spl-warren-010",
    "name": "Watchdog",
    "nh": "IQ+2",
    "isFavorite": false,
    "notes": "",
    "college": "Protection and Warning",
    "class": "Area",
    "duration": "10 hours.",
    "cost": "1 to cast. 1 to maintain.",
    "timeToCast": "10 seconds.",
    "description": "When cast around an area, this spell warns the caster of anyone or anything crossing with hostile intent. If the caster is asleep, he wakes instantly without being stunned. The spell is not destroyed if triggered; it lasts until its natural expiration."
  },
  {
    "id": "spl-warren-011",
    "name": "Bright Vision",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Light and Darkness",
    "class": "Regular",
    "duration": "1 minute.",
    "cost": "2 to cast. 1 to maintain.",
    "timeToCast": "",
    "description": "Peer safely into intense sources of light (like a roaring fire or the sun) and protect against blinding from the Flash spell, Vision-based attacks, or similar occurrences."
  },
  {
    "id": "spl-warren-012",
    "name": "Nightingale",
    "nh": "IQ+2",
    "isFavorite": false,
    "notes": "",
    "college": "Protection and Warning",
    "class": "Area",
    "duration": "10 hours.",
    "cost": "2 to cast. 2 to maintain.",
    "timeToCast": "",
    "description": "Makes a door or section of floor “noisy.” A door squeaks loudly when opened; a patch of ground becomes full of snapping sticks when someone walks over it; a floor squeaks, etc. This automatically alerts or awakes the caster if he is within hearing range, and probably alerts others nearby as well (make an IQ roll if there is other noise around)."
  },
  {
    "id": "spl-warren-013",
    "name": "Counterspell",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Meta-Spells",
    "class": "Regular; Resisted by subject spell",
    "duration": "",
    "cost": "Half that of the spell countered, not counting bonuses the other caster got for high skill.",
    "timeToCast": "5 seconds.",
    "description": "This spell nullifies any one ongoing spell. It cannot “counter” spells that make a permanent change in the world (e.g., Extinguish Fire, Flesh to Stone, or Zombie), and it cannot affect permanently enchanted items, but it can counter spells cast using magic items. The “subject” of Counterspell may be either the subject of the spell to be countered or the person who cast that spell.\n\nCounterspell is a single spell – but to counter a given spell, you must also know that spell. Roll against the lower of your Counterspell skill or your skill with the spell being countered. You must win a Quick Contest with the target spell to cancel it. You can cast multiple Counterspells to negate an Area spell piece by piece."
  },
  {
    "id": "spl-warren-014",
    "name": "Night Vision",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Light and Darkness",
    "class": "Regular",
    "duration": "One minute.",
    "cost": "3 to cast; 1 to maintain.",
    "timeToCast": "",
    "description": "Cancels all penalties to Sense and skill rolls for low light, but not for total darkness."
  },
  {
    "id": "spl-warren-015",
    "name": "Sense Observation",
    "nh": "IQ+2",
    "isFavorite": false,
    "notes": "",
    "college": "Protection and Warning",
    "class": "Area",
    "duration": "1 hour.",
    "cost": "1 to cast. Half that to maintain. When cast on a being, the cost is 3.",
    "timeToCast": "5 seconds.",
    "description": "Alerts the caster if someone or something spies or scries upon the subject area, by means magical or otherwise. A Quick Contest is rolled between the spy’s IQ or the effective skill of the Information spell’s caster (Trace, Seeker, Crystal Ball, any of the “Sense” spells…) and the effective skill of the Sense Observation spell’s caster; if the caster wins, he becomes aware that the subject area is being observed. A critical success (on the Contest) might give the caster an idea of who or what is doing the scrying or spying.\n\nIf the caster then tries to seek out the spy, the margin of success of the Sense Observation contest can be added as a bonus to the Seeker roll, up to a maximum of +5 (effectively neutralizing the -5 penalty for having nothing associated with the person sought). Another possible course of action is to Counterspell the scrying spell; distance penalties do not apply, but the -5 penalty for absent subject does.\n\nSense Observation can also be cast on a being; in that case, the caster can choose to have the spell alert the subject instead when eavesdropping is detected."
  },
  {
    "id": "spl-warren-016",
    "name": "Scryguard",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Meta-Spells",
    "class": "Regular; Resists Information spells",
    "duration": "10 hours.",
    "cost": "3 to cast; 1 to maintain.",
    "timeToCast": "Five seconds.",
    "description": "Any information spell cast on the subject must win a quick contest of spells with the Scryguard to “see” him. Identify Magic will still detect that the Scryguard is present."
  },
  {
    "id": "spl-warren-017",
    "name": "Dark Vision",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Light and Darkness",
    "class": "Regular",
    "duration": "1 minute.",
    "cost": "5 to cast. 2 to maintain.",
    "timeToCast": "",
    "description": "The subject can see even in pitch darkness, as if he had the Dark Vision advantage. He can also ignore the effects of the Darkness spell."
  },
  {
    "id": "spl-warren-018",
    "name": "Shield",
    "nh": "IQ+2",
    "isFavorite": false,
    "notes": "",
    "college": "Protection and Warning",
    "class": "Regular",
    "duration": "1 minute.",
    "cost": "Twice the Defense Bonus given to the subject, to a maximum DB of 4 (cost 8); half that to maintain.",
    "timeToCast": "",
    "description": "Conjures an invisible shield of magical force that moves to protect the subject from frontal attacks. The Defense Bonus granted by this spell is cumulative with that from an actual shield, but this spell does not allow a subject without a shield to block."
  },
  {
    "id": "spl-warren-019",
    "name": "Magic Resistance",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Meta-Spells",
    "class": "Regular; Resisted by Will+Magery",
    "duration": "1 minute.",
    "cost": "1 to 5 to cast. Same cost to maintain.",
    "timeToCast": "3 seconds.",
    "description": "For each point of energy put into the spell (up to 5), the subject’s magic resistance goes up by 2 if he is willing, or by 1 if he tried to resist. This MR works like normal Magic Resistance (p. B67) when spells are cast on the subject. The subject can still cast spells, but at a penalty equal to the MR. Spells already affecting the subject (or already cast by him) continue unchanged. He can use potions and magical items normally."
  },
  {
    "id": "spl-warren-020",
    "name": "Invisibility",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Light and Darkness",
    "class": "Regular",
    "duration": "One minute.",
    "cost": "5 to cast; 3 to maintain.",
    "timeToCast": "Three seconds.",
    "description": "The subject cannot be seen, reflected in a mirror, or photographed. He still makes sounds and can be tracked by scent or footprints. Anything he picks up becomes invisible, unless he wills it to remain visible."
  },
  {
    "id": "spl-warren-021",
    "name": "Armor",
    "nh": "IQ+2",
    "isFavorite": false,
    "notes": "",
    "college": "Protection and Warning",
    "class": "Regular",
    "duration": "1 minute.",
    "cost": "Twice the Damage Resistance given to the subject, to a maximum DR of 5 (cost 10). Half that to maintain.",
    "timeToCast": "",
    "description": "Adds to the Damage Resistance of a living subject. DR from this spell is treated for all purposes like DR from armor, and is cumulative with that from actual armor."
  },
  {
    "id": "spl-warren-022",
    "name": "Spell Shield",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Meta-Spells",
    "class": "Area; Resists all spells cast through it",
    "duration": "1 minute.",
    "cost": "3 to cast. 2 to maintain.",
    "timeToCast": "",
    "description": "Resist any spell cast through it at the Spell Shield’s Endurance (p. 10). It also acts as a Scrywall (above).\n\nException: It does not affect missile spells at all, including Thrown spells. Note that if the attacking spell wins the contest, it gets through, but the Spell Shield is not destroyed – instead, its Endurance is reduced by 1. When a Spell Shield’s Endurance is reduced to 0, the spell dissipates and cannot be maintained."
  },
  {
    "id": "spl-warren-023",
    "name": "Hawk Vision",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Light and Darkness",
    "class": "Regular",
    "duration": "1 minute.",
    "cost": "2 per level of Telescopic Vision. Half that to maintain.",
    "timeToCast": "2 seconds.",
    "description": "Grants the subject extraordinary clarity of vision and the ability to “zoom in” on distant objects, providing the equivalent of Telescopic Vision (p. B92). Each level lets the subject ignore -1 in range penalties to Vision rolls at all times, or -2 in range penalties if you take an Aim maneuver to zoom in on a particular target. This ability can also function as a telescopic sight, giving up to +1 Accuracy per level with ranged attacks provided you take an Aim maneuver for seconds equal to the bonus. These benefits of this spell are not cumulative with those of technological aids such as binoculars or scopes. If you use both, you must opt for one or the other."
  },
  {
    "id": "spl-warren-024",
    "name": "Turn Blade",
    "nh": "IQ+2",
    "isFavorite": false,
    "notes": "",
    "college": "Protection and Warning",
    "class": "Blocking",
    "duration": "",
    "cost": "1.",
    "timeToCast": "",
    "description": "Makes an incoming blade turn in its wielder’s hand, inflicting only crushing damage instead of cutting. This also unreadies the weapon. Only good against blade attacks – it is useless against a spear, club, or the teeth and claws of an animal. This spell does not count as an active defense itself; it may be combined with a normal Parry, Block, or Dodge. If the caster is not the one being attacked, apply regular range modifiers between the caster and the attacker."
  },
  {
    "id": "spl-warren-025",
    "name": "Pentagram",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Meta-Spells",
    "class": "Special; Resists attempts to cross it",
    "duration": "Permanent unless broken.",
    "cost": "1 per square foot protected (minimum 10). When the spell is cast ceremonially, the casters can spend extra energy to increase the effective skill of the Pentagram. A mage can also use the Slow and Sure Enchantment method (though Pentagram is not technically an Enchantment spell) to create a large pentagram by himself.",
    "timeToCast": "One second per square foot. This time is spent in tracing the line, and is necessary no matter how well the spell is known or how much power is available.",
    "description": "Produces a magical barrier, which blocks hostile spells and magical creatures from passing in either direction. The barrier is a star-shaped figure drawn on the floor or ground. Magical creatures (demons, golems, creations, zombies, elementals, and the like) cannot cross the border of a pentagram; neither may they cast spells, or move any physical object, across the border. Nonmagical creatures – including mages – can freely cross a pentagram, though they cannot cast spells across its border. Spells of transport (e.g., Flight, Teleport) cannot be used to enter a pentagram for hostile purposes.\n\nCertain very hostile creatures may be summoned within a pentagram; the caster stands outside and summons the creature to a spot inside the pentagram. The caster will open the pentagram only when he is sure he can control the summoned creature.\n\nIf part of the pentagram is cut or erased, its power will be lost until the caster can rejoin the pentagram – all this requires is a piece of chalk and time (usually just a second) to draw the line. No magic spell can injure the pentagram, but physical attacks – like walking up and scuffing out a line with your shoe – can succeed if they are made by nonmagical beings. A demon or creation could not do it; an ordinary person could. Likewise, an ordinary person could throw a rock into a pentagram, but a demon or golem could not.\n\nA magical creature may try to force its way through a pentagram. Roll a contest between the creature’s (ST+Will)/2 and the skill with which the pentagram was cast. If the creature wins, it destroys the pentagram! No one creature can thus “test” a pentagram more than once per day."
  },
  {
    "id": "spl-warren-026",
    "name": "Blackout",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Light and Darkness",
    "class": "Area",
    "duration": "1 minute.",
    "cost": "2 to cast. 1 to maintain.",
    "timeToCast": "",
    "description": "Shrouds the affected area in impenetrable blackness. No one can see into the affected area, and no one within the affected area can see anything; see p. B394 for combat rules. The Dark Vision advantage lets you see through a Blackout spell, but Night Vision and Infravision do not."
  },
  {
    "id": "spl-warren-027",
    "name": "Deflect Missile",
    "nh": "IQ+2",
    "isFavorite": false,
    "notes": "",
    "college": "Movement",
    "class": "Blocking",
    "duration": "",
    "cost": "1.",
    "timeToCast": "",
    "description": "Deflects one missile about to hit the subject – including any Missile spell. Counts as a parry for combat purposes. If the caster is not the subject, apply distance modifiers as for a Regular spell. Deflected attacks may still hit a target beyond the subject."
  },
  {
    "id": "spl-warren-028",
    "name": "Ward",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Meta-Spells",
    "class": "Blocking; Resisted by subject spell",
    "duration": "",
    "cost": "2 to cast it on yourself, or 3 to cast on anyone you can see. You cannot Ward someone you cannot see.",
    "timeToCast": "",
    "description": "When cast immediately after a spell is thrown at its subject, this spell can prevent the opposed spell from working. It works against only a single magical attack. If an attacking spell affects several people, each Ward can only save one subject. It does not protect against missile spells.\n\nThe caster may only Ward against a spell that he knows at skill 12 or higher; a caster who knows (for instance) Sleep may also ward a single subject against Mass Sleep. The caster rolls at the lower of his Ward skill or his skill in the spell being warded. The caster must announce he is using Ward before the opposed spell’s subject tries a resistance roll. If it turns out the spell being cast is not one the defending mage can ward against, the ward is wasted."
  },
  {
    "id": "spl-warren-029",
    "name": "See Invisible",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Light and Darkness",
    "class": "Regular",
    "duration": "1 minute.",
    "cost": "4 to cast. 2 to maintain.",
    "timeToCast": "",
    "description": "Subject can see anything concealed by the Invisibility spell or by “natural” invisibility. These things will be slightly translucent; thus, you can see through them and tell that they appear invisible to others."
  },
  {
    "id": "spl-warren-030",
    "name": "Missile Shield",
    "nh": "IQ+5",
    "isFavorite": false,
    "notes": "",
    "college": "Protection and Warning",
    "class": "Regular",
    "duration": "1 minute.",
    "cost": "5 to cast. 2 to maintain.",
    "timeToCast": "",
    "description": "Turns any missiles harmlessly aside by the tiniest fraction needed to ensure they miss the subject; the game effect is that the missile continues in a straight line past the subject. Works on all kinds of missiles – arrows, bullets, falling rocks, missile spells, shrapnel, cream pies – everything. The GM should conceal the existence of the spell from the caster’s foes as long as possible, saying they just missed!"
  },
  {
    "id": "spl-warren-031",
    "name": "Great Ward",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Meta-Spells",
    "class": "Blocking; Resisted by subject spell",
    "duration": "",
    "cost": "1 per subject protected (minimum cost 4).",
    "timeToCast": "",
    "description": "As Ward, but – if it works – protects any number of those who would have been affected by the attacking spell."
  },
  {
    "id": "spl-warren-032",
    "name": "Mage Light",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Light and Darkness",
    "class": "Regular",
    "duration": "1 minute.",
    "cost": "1 for a dim glow like candlelight, 2 for the brightness of a torch, 3 for a glare as bright as day. Same cost to maintain.",
    "timeToCast": "",
    "description": "Creates a small light. However, the illumination that it provides is only perceptible to mages, magical creatures, and those under the influence of Mage Sight. It moves just like Light does. An IQ+Magery roll is not required to see or use the light provided."
  },
  {
    "id": "spl-warren-033",
    "name": "Mystic Mist",
    "nh": "IQ+2",
    "isFavorite": false,
    "notes": "",
    "college": "Protection and Warning",
    "class": "Area",
    "duration": "10 hours.",
    "cost": "1. Cost to maintain is the same.",
    "timeToCast": "5 minutes.",
    "description": "Produces a dense, opalescent fog that confuses anyone entering it; figures more than 2 yards away cannot be seen except by Mage Sight. Those who were within it when it was cast are immune to its effects; they can sense it as a dim shimmering, but it does not affect their vision or confuse them. Others must roll vs. (IQ + Magic Resistance) every second, or use Mage Sight, to avoid losing their way and walking in randomly chosen directions, unless they have a guide. Absolute Direction avoids this problem.\n\nA Fright Check is also required of intruders first entering the mist, and again every 5 minutes. Anyone failing the first Fright Check will be very reluctant to enter! Dangerous animals simply avoid the mist, but suffer normal effects if for some reason they must enter it. Those “native” to the mist have a +1 to their defense rolls when attacked by interlopers, and interlopers have a -1 to their own defense rolls against “natives.”\n\nThis spell is an excellent defense for a party camping in dangerous territory. The caster must cast Mystic Mist in an area centered on himself. The wider an area he can cover, the better!"
  },
  {
    "id": "spl-warren-034",
    "name": "Spell Wall",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Meta-Spells",
    "class": "Regular; Resists spells cast through it",
    "duration": "1 minute.",
    "cost": "2 per one-yard piece of Wall to cast. Same cost to maintain. The Spell Wall may also be cast horizontally, as a “ceiling” or “floor”; each point of energy will then cover two hexes on a battle map.",
    "timeToCast": "",
    "description": "Creates a wall of anti-magic. The wall resists any spell cast through it from one side, specified by the caster upon casting Spell Wall. It also acts as a Scrywall.\n\nException: It does not affect Missile spells at all, including Thrown spells. If the Spell Wall fails to resist a spell cast through it, the spell breaks through, but the wall still stands, its Endurance (p. 10) weakened by 1. Upon reaching Endurance 0, the wall dissipates. Spells passing through the wall from the “safe” direction (usually the side that the caster stands on!) are not resisted or affected in any way. The wall is cast in one-yard increments, either all at once or piece by piece. When adding new segments to a weakened Spell Wall, the new segments assume the Endurance of the “weakest link.” The only way to “repair” a weakened Wall is to cast it anew. The Spell Wall is four yards high, so it is possible to cast across it from a high enough elevation. Higher walls can be created by spending proportionately more energy (double energy for double height, and so on)."
  },
  {
    "id": "spl-warren-035",
    "name": "Colors",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Light and Darkness",
    "class": "Regular",
    "duration": "1 minute.",
    "cost": "2 to cast. 1 to maintain (but the change is permanent on a Continual Light spell).",
    "timeToCast": "",
    "description": "Changes the color of any light. The spell must be cast on the source of the light. If the caster concentrates, multiple color-changes are possible with the same spell."
  },
  {
    "id": "spl-warren-036",
    "name": "Weather Dome",
    "nh": "IQ+2",
    "isFavorite": false,
    "notes": "",
    "college": "Protection and Warning, Weather",
    "class": "Area",
    "duration": "6 hours.",
    "cost": "3 to cast. 2 to maintain.",
    "timeToCast": "",
    "description": "Creates a shimmering dome that repels bad weather of all types (up to and including Windstorm spells, volcanic ash, and rains of frogs, as well as flying insects!). Floods, landslides, and similar catastrophes destroy the dome. Inside the dome, the air remains fresh and the temperature remains comfortable for the caster. This is also a Weather spell."
  },
  {
    "id": "spl-warren-037",
    "name": "Glow",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Light and Darkness",
    "class": "Area",
    "duration": "Variable. The GM should roll 2d for the number of days.",
    "cost": "",
    "timeToCast": "",
    "description": "Suffuses an area with a uniform glow. Objects and beings standing in the area won’t project any shadows unless a source of light stronger than the ambient glow is brought in."
  },
  {
    "id": "spl-warren-038",
    "name": "Force Dome",
    "nh": "IQ+2",
    "isFavorite": false,
    "notes": "",
    "college": "Protection and Warning",
    "class": "Area",
    "duration": "10 minutes.",
    "cost": "3 to cast. 2 to maintain.",
    "timeToCast": "",
    "description": "As Weather Dome, but the Force Dome repels any physical force or missile spell. Nothing can enter except light, and only enough light to see by (the interior is always in twilight). Likewise, nothing can leave the Force Dome except light – and not even that, if the caster wills it. However, magic, and magical creatures and items, pass through the Force Dome as though it did not exist. Once cast, a Force Dome takes a full second to form; anyone inside the Dome’s area at the time it is cast has one turn to leave."
  },
  {
    "id": "spl-warren-039",
    "name": "Sunlight",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Light and Darkness",
    "class": "Area",
    "duration": "1 minute.",
    "cost": "2 to cast. 1 to maintain.",
    "timeToCast": "",
    "description": "The area is illuminated in full daylight – even underground! The area extends skyward, stopping only when it hits some sort of ceiling. If cast in a cave, the area is a huge shaft of light extending upward to the rock. If cast on a cloudy day outdoors, the light appears to break through the clouds above. If cast at night, the light appears to come from an overhead star which brightens to sun level for those inside the area. Treat the light as natural sunlight for all purposes – it can be used to grow plants, get a tan, etc. Creatures who are susceptible to the effects of sunlight (such as vampires) are fully affected."
  },
  {
    "id": "spl-warren-040",
    "name": "Utter Dome",
    "nh": "IQ+2",
    "isFavorite": false,
    "notes": "",
    "college": "Protection and Warning",
    "class": "Area",
    "duration": "1 minute.",
    "cost": "6 to cast. 4 to maintain.",
    "timeToCast": "",
    "description": "Protects against physical and magical attack; has the effect of a combination Force Dome and Pentagram. However, creatures cannot be summoned within it, and there is no marking to erase. Can only be removed by Dispel Magic or Counterspell. Resists any attempt to look through with magic. Like Force Dome, an Utter Dome takes a full second to form once cast."
  },
  {
    "id": "spl-warren-041",
    "name": "Foolishness",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Mind Control",
    "class": "Regular; Resisted by Will",
    "duration": "1 minute.",
    "cost": "1 to 5 to cast. Half that to maintain (round up).",
    "timeToCast": "",
    "description": "The subject suffers -1 to his IQ and IQ-based skills (including spells) for every point of energy put into the spell. The GM may also require an IQ roll to remember complex things while under the influence of this spell."
  },
  {
    "id": "spl-warren-042",
    "name": "Sunbolt",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Light and Darkness",
    "class": "Missile",
    "duration": "",
    "cost": "Any amount up to your Magery level per second, for three seconds. The bolt does 1d-1 impaling damage per energy point.",
    "timeToCast": "1 to 3 seconds.",
    "description": "Shoot a bolt of concentrated sunlight from one fingertip. It has 1/2D 75, Max 150, Acc 2; use the Innate Attack skill. The light burns like laser light and does burning damage. Increase a shield’s DB against this spell by 50%, rounding down, if it is highly polished. Whether or not damage gets through armor, a hit to the face blinds the victim unless he makes a HT roll. A hit to the eyes does double damage and blinds the victim unless he makes a HT roll at a penalty equal to the damage suffered. Treat Sunbolt-induced blindness as a crippling injury for recovery purposes (p. B420).\n\nAny mirror will reflect a Sunbolt; if the GM is uncertain of the exact angle of incidence/reflection (if the Sunbolt hits a hand-held mirror, for instance), determine its new direction randomly. Use the rules for hitting the wrong target (p. B389) to determine if anything along the new path is hit. Deliberately reflected shots are a much trickier matter; range penalties will be for the total range to the target, with an additional -2 for each “bounce.” And unless the mirrors are very large and/or stable and/or deliberately placed for the purpose, the GM may simply declare the shot impossible.\n\nDefending characters holding mirrors may attempt to reflect the bolt back at the caster – treat this as a Block defense at a -2 penalty; also apply the normal range penalties from the defender to the caster. The DB of the mirror (if it is large enough to offer any; GM call) adds to this roll normally. The caster may defend normally, unless totally surprised.\n\nSunbolt is not affected by Missile Shield or Reverse Missiles. Force Dome and Deflect Energy do offer protection. Areas of magical Darkness or Blackout resist Sunbolt."
  },
  {
    "id": "spl-warren-043",
    "name": "Block",
    "nh": "IQ+2",
    "isFavorite": false,
    "notes": "",
    "college": "Protection and Warning",
    "class": "Blocking",
    "duration": "",
    "cost": "1 per point of DB (maximum of 5).",
    "timeToCast": "",
    "description": "An instantaneous version of the Shield spell – adds to the subject’s DB for a single defense roll. This spell is not cumulative with the effects of Shield – use the highest value."
  },
  {
    "id": "spl-warren-044",
    "name": "Daze",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Mind Control",
    "class": "Regular; Resisted by HT",
    "duration": "1 minute.",
    "cost": "3 to cast; 2 to maintain.",
    "timeToCast": "2 seconds.",
    "description": "Subject looks and acts normal, but does not notice what is going on around him, and will not remember it later. A dazed guard will stand quietly while a thief walks past! Any injury, or successful resistance to a spell, causes the subject to snap out of the daze and return to full, alert status."
  },
  {
    "id": "spl-warren-045",
    "name": "Mirror",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Light and Darkness",
    "class": "Regular",
    "duration": "1 minute.",
    "cost": "2. Same cost to maintain.",
    "timeToCast": "",
    "description": "Creates a reflective surface. It can be cast on an object or can be freestanding (in which case it is two-sided). The mirror surface is not necessarily flat; the caster could create fun-house mirrors, for example.\n\nIn a scientific-paradigm universe, casters with knowledge of physics can use this spell to create parabolic reflectors. A simple curve can be sufficient to cook meat; a large and precise one could be used to melt lead, given sufficient sunlight at appropriate angles. Against living targets, the GM can assume that such a mirror would do 1 point of burning damage per yard radius of mirror every 10 seconds. To ignite things, use the Ignite Fire guidelines (p. 72), substituting the Mirror size for the listed energy cost. An 8-yard-radius Mirror ignites heavy wood in about 10 seconds. Other, similar uses are subject to GM approval."
  },
  {
    "id": "spl-warren-046",
    "name": "Bladeturning",
    "nh": "IQ+2",
    "isFavorite": false,
    "notes": "",
    "college": "Protection and Warning",
    "class": "Regular",
    "duration": "1 minute.",
    "cost": "2. Same cost to maintain.",
    "timeToCast": "",
    "description": "A continual version of Turn Blade – all blades attacking the subject are turned, doing only crushing damage and becoming unready. For each bladed attack, roll a Quick Contest between the wielder’s DX and the caster’s effective skill to see which wins out. Useful only against blade attacks, as per Turn Blade. Note that, unlike Turn Blade, the spell is cast on the one being attacked, not on the attacker."
  },
  {
    "id": "spl-warren-047",
    "name": "Sleep",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Mind Control",
    "class": "Regular; Resisted by HT",
    "duration": "",
    "cost": "4.",
    "timeToCast": "3 seconds.",
    "description": "Subject falls asleep. If standing, he falls – but this does not wake him. He can be awakened by a blow, loud noise, etc., but will be mentally stunned (see Effects of Stun, p. 420). The Awaken spell (p. 248) arouses him instantly. If not awakened, he will sleep for around eight hours and awaken normally."
  },
  {
    "id": "spl-warren-048",
    "name": "Infravision",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Light and Darkness",
    "class": "Regular",
    "duration": "1 minute.",
    "cost": "3 to cast. 1 to maintain.",
    "timeToCast": "",
    "description": "See “infrared” or heat rays in addition to normal light, as with the Infravision advantage (p. B60). This spell does not let invisible objects be seen."
  },
  {
    "id": "spl-warren-049",
    "name": "Hardiness",
    "nh": "IQ+2",
    "isFavorite": false,
    "notes": "",
    "college": "Protection and Warning",
    "class": "Blocking",
    "duration": "",
    "cost": "1 per point of DR (maximum of 5).",
    "timeToCast": "",
    "description": "An instantaneous version of the Armor spell – adds to the Damage Resistance of the subject for one attack. This spell is not cumulative with Armor – only the stronger spell applies. Remember that only one Blocking spell may be cast in a turn. A mage cannot follow up a failed Iron Arm with a Hardiness spell, for instance."
  },
  {
    "id": "spl-warren-050",
    "name": "Flash",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Light and Darkness",
    "class": "Regular",
    "duration": "Instantaneous. Effects last as described.",
    "cost": "4. Cannot be maintained; must be recast.",
    "timeToCast": "1 second.",
    "description": "Produces a sudden, brilliant flash of light. Anyone within 10 yards who can see the flash must make an HT roll to avoid blindness. Success means 10 seconds at -3 to Vision and DX. Failure blinds the victim for 1d seconds, followed by 1 minute at -3 to Vision and DX. Critical failure causes 1 HP damage and blindness for 1d minutes!"
  },
  {
    "id": "spl-warren-051",
    "name": "Force Wall",
    "nh": "IQ+2",
    "isFavorite": false,
    "notes": "",
    "college": "Protection and Warning",
    "class": "Regular",
    "duration": "10 minutes.",
    "cost": "2 per yard length to cast. Same cost to maintain.",
    "timeToCast": "",
    "description": "Creates a shimmering barrier, which physical forces and missile spells cannot cross. Only light and non-Missile spells may pass. The Force Wall is four yards high. Higher walls are possible at a proportionately increased energy cost (double for double height, etc.)."
  },
  {
    "id": "spl-warren-052",
    "name": "Utter Wall",
    "nh": "IQ+2",
    "isFavorite": false,
    "notes": "",
    "college": "Protection and Warning",
    "class": "Regular; Resists intruding spells",
    "duration": "1 minute.",
    "cost": "4 per yard length to cast. Same cost to maintain.",
    "timeToCast": "",
    "description": "As Force Wall, but protects against physical and magical attack; has the effect of a combination Force Wall and Spell Wall."
  },
  {
    "id": "spl-warren-053",
    "name": "Detect Magic",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Knowledge",
    "class": "Regular",
    "duration": "",
    "cost": "2.",
    "timeToCast": "5 seconds.",
    "description": "Lets the caster determine whether any one object is magical. If the spell is successful, a second casting tells whether the magic is temporary or permanent. A critical success on either roll fully identifies the spell, as for Analyze Magic."
  },
  {
    "id": "spl-warren-054",
    "name": "Reflect Gaze",
    "nh": "IQ+1",
    "isFavorite": false,
    "notes": "VH",
    "college": "Protection and Warning",
    "class": "Blocking; Resists gaze attacks",
    "duration": "",
    "cost": "2.",
    "timeToCast": "",
    "description": "Resists one gaze attack (includes Lightning Stare, Fascinate, and any power which requires eye contact) about to hit the subject. If successful, the gaze attack is reflected away from the subject; a success by 10 or more, or a critical success, reflects the gaze back upon the attacker. If failed, the gaze attack affects the subject normally. Considered a parry by the caster for combat purposes. Apply Regular range modifiers if the caster is not the subject."
  },
  {
    "id": "spl-warren-055",
    "name": "Sense Mana",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Knowledge",
    "class": "Information",
    "duration": "",
    "cost": "3.",
    "timeToCast": "5 seconds.",
    "description": "Tells the caster the mana level at the point where he is standing, and whether the local mana is aspected (see GURPS Fantasy) or otherwise unusual. If the spell is successful, a second casting will reveal the precise nature and level of any aspect or other peculiarity."
  },
  {
    "id": "spl-warren-056",
    "name": "Ignite Fire",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Fire",
    "class": "Regular",
    "duration": "One second.",
    "cost": "Depends on the amount of heat desired:\n1 – for an effect as though a match had been held to the subject: lights a candle, pipe, or tinder in one second.\n2 – for an effect as though a torch had been held to the subject: ignites paper or loose cloth in one second, ordinary clothes being worn in four seconds.\n3 – for an effect as though a blowtorch had been held to the subject: ignites dry firewood or clothes being worn in one second, leather in two seconds, heavy wood in six seconds.\n4 – for an effect as though burning magnesium or phosphorus had been held to the subject: ignites coal in one second, heavy wood in two seconds.\nCost to maintain is the same as the original cost to cast.",
    "timeToCast": "",
    "description": "This spell produces a single spot of heat, and is used to set fire to a readily flammable object. It works best on paper and cloth, and cannot affect any item that would not burn in an ordinary fire. In particular, it cannot set fire to a living being! Once ignited, the fire burns normally."
  },
  {
    "id": "spl-warren-057",
    "name": "Teleport Shield",
    "nh": "IQ+2",
    "isFavorite": false,
    "notes": "",
    "college": "Protection and Warning, Gate",
    "class": "Area",
    "duration": "1 hour.",
    "cost": "1⁄3 to cast (minimum 3-yard radius). Same cost to maintain.",
    "timeToCast": "10 seconds.",
    "description": "Any attempt to Teleport (or Blink) into or out of the area of effect is at -5 to skill. Failed attempts to teleport in have the normal effects. Failed attempts to teleport out leave the caster where he started, physically stunned and having spent all the energy for the attempt! Doubling the energy cost increases the penalty to -10; tripling it increases the penalty to -15! This spell works against Teleport, Timeport, Plane Shift, Timeslip, and all their variations. This is also a Gate spell."
  },
  {
    "id": "spl-warren-058",
    "name": "Mage Sight",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Knowledge",
    "class": "Regular",
    "duration": "1 minute.",
    "cost": "3 to cast. 2 to maintain.",
    "timeToCast": "",
    "description": "Detect all magical items in your field of vision. Each such item will have a glow or “aura,” similar to the aura of a living being. This glow is visible through clothes, armor, or up to 1/2” of solid material. The aura of a permanently enchanted item will be stronger than that of something under a temporary spell.\n\nEnchanted (or magical) beings also glow, though mages themselves do not unless they actually have spells on them at the moment. The aura may also give a clue to an item’s nature. On a good roll, for instance, fire spells will have a distinctive red glow, and evil items will somehow seem to have a “black glow” in their auras.\n\nA critical success with this spell lets the caster fully identify every magic item he sees. Note that this ability is essentially a more reliable version of the magical sense that comes with Magery 0 (p. B66)."
  },
  {
    "id": "spl-warren-059",
    "name": "Create Fire",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Fire",
    "class": "Area",
    "duration": "1 minute.",
    "cost": "2. Half that to maintain. Ordinary fires set by this spell do not require maintenance.",
    "timeToCast": "",
    "description": "Fills the area of effect with fire that requires no fuel (if cast in midair, it produces a sphere of flame, which falls to the ground). This is real fire, and will eventually ignite any flammable objects it touches. Cannot be cast within rock, foes, etc."
  },
  {
    "id": "spl-warren-060",
    "name": "Identify Spell",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Knowledge",
    "class": "Information",
    "duration": "",
    "cost": "2.",
    "timeToCast": "",
    "description": "Lets the caster know what spell or spells have just been cast (within the last five seconds), or are being cast at the moment, on or by the subject. It does not identify the spells on a permanently enchanted item. One casting identifies all spells cast on or by the subject. However, if any of these spells are totally unknown to the caster – not just spells he doesn’t know, but spells he has never heard of – the GM should provide only a general, vague description; e.g., “Some kind of physical protection.” Wizards have heard of every spell in this list unless the GM rules that some are secret, but wizards have not heard of new spells created by the GM or players."
  },
  {
    "id": "spl-warren-061",
    "name": "Analyze Magic",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Knowledge",
    "class": "Information; Resisted by spells that conceal magic",
    "duration": "",
    "cost": "8.",
    "timeToCast": "1 hour.",
    "description": "Tells the caster exactly what spells are on the subject. If the subject has more than one spell on it, Analyze Magic identifies the one that took the least energy and tells the caster “there are more spells.” It can then be cast again to determine the next spell, and so on. Like Identify Spell, above, it gives limited results when faced with a spell the caster has never heard of."
  },
  {
    "id": "spl-warren-062",
    "name": "Seek Earth",
    "nh": "IQ+2",
    "isFavorite": false,
    "notes": "",
    "college": "Earth",
    "class": "Information",
    "duration": "",
    "cost": "3.",
    "timeToCast": "10 seconds.",
    "description": "This spell tells the caster the direction and approximate distance of the nearest significant amount of any one type of earth, metal, or stone. Use the long-distance modifiers (p. 241). Any known sources of that material may be excluded if the caster specifically mentions them before beginning."
  },
  {
    "id": "spl-warren-063",
    "name": "Sound",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Sound",
    "class": "Regular",
    "duration": "",
    "cost": "",
    "timeToCast": "",
    "description": "Produces any sort of meaningless sound the caster wishes; does not produce understandable speech or music. Does not produce loud sounds. Does not require concentration once cast."
  },
  {
    "id": "spl-warren-064",
    "name": "Shape Earth",
    "nh": "IQ+2",
    "isFavorite": false,
    "notes": "",
    "college": "Earth",
    "class": "Regular",
    "duration": "1 minute.",
    "cost": "1 per cubic yard of earth shaped (minimum 2); half that to maintain (round up).",
    "timeToCast": "",
    "description": "Lets the caster move earth and shape it into any form. If the form is stable (e.g., a hill), it remains permanently after shaping. An unstable form (e.g., a column or wall) lasts only while the spell continues – no special concentration is required – and then collapses.\n\nEarth moved with this spell travels at only Move 2. It can harm no one except by flowing over an immobile person and burying him. If earth is moved onto a person to bury him – or from beneath him, to create a hole – he may move normally on his next turn, to escape. He is trapped only if he fails to do so.\n\nAnyone buried by this spell may try to claw his way out of the loose earth. One roll, at ST-4, is allowed per turn. GMs may make this roll harder if the victim is buried under more than two cubic yards of earth! The victim can hold his breath (see Holding Your Breath, p. 351), but he eventually risks suffocation (see Suffocation, p. 436)."
  },
  {
    "id": "spl-warren-065",
    "name": "Silence",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Sound",
    "class": "Area",
    "duration": "One minute.",
    "cost": "2 to cast; 1 to maintain.",
    "timeToCast": "",
    "description": "Creates an area of silence, within which no one can hear anything or make any noise. This will prevent spoken spells from working."
  },
  {
    "id": "spl-warren-066",
    "name": "Create Earth",
    "nh": "IQ+2",
    "isFavorite": false,
    "notes": "",
    "college": "Earth",
    "class": "Regular",
    "duration": "Permanent.",
    "cost": "2 per cubic yard to create earth from nothingness (minimum 2); 1 per cubic yard to solidify mud into good earth (minimum 1).",
    "timeToCast": "",
    "description": "Lets the caster create good, solid earth where none existed before. This earth must be created in contact with the ground – not hanging in the air or floating in the sea!"
  },
  {
    "id": "spl-warren-067",
    "name": "Apportation",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Movement",
    "class": "Regular; Resisted by Will",
    "duration": "1 minute.",
    "cost": "1 for an object up to 1 lb. in weight; 2 for an object up to 10 lbs.; 3 for an object up to 50 lbs.; 4 for an object up to 200 lbs.; and 4 for each additional 100 lbs. Cost to maintain is the same.",
    "timeToCast": "",
    "description": "Lets the caster move physical objects without touching them. This spell levitates its subject at Move 1 – not fast enough to do damage with it. Living subjects get to resist with Will."
  },
  {
    "id": "spl-warren-068",
    "name": "Earth to Stone",
    "nh": "IQ+2",
    "isFavorite": false,
    "notes": "",
    "college": "Earth",
    "class": "Regular",
    "duration": "Permanent.",
    "cost": "3 per cubic yard (minimum 3).",
    "timeToCast": "",
    "description": "Turns an item of earth or clay into hard stone (but not gemstone)."
  },
  {
    "id": "spl-warren-069",
    "name": "Levitation",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Movement",
    "class": "Regular; Resisted by Will",
    "duration": "One minute.",
    "cost": "1 per 80 pounds, minimum 2; half cost to maintain.",
    "timeToCast": "Two seconds.",
    "description": "Subject must be a living being. Subject floats through the air, moving as the caster wills. Maximum Move for a levitated being is 3, horizontally or vertically. A caster who levitates himself uses DX-based skills normally; other subjects use them at -3."
  },
  {
    "id": "spl-warren-070",
    "name": "Earth Vision",
    "nh": "IQ+2",
    "isFavorite": false,
    "notes": "",
    "college": "Earth, Knowledge",
    "class": "Regular",
    "duration": "30 seconds.",
    "cost": "2 per 10 yards of depth to cast. Same cost to maintain.",
    "timeToCast": "",
    "description": "See through the earth – to find caves, bodies of ore, buried treasure, entombed victims, etc. Earth and uncut stone (up to 50 yards deep) are transparent to the subject, wherever he looks. Metal is not transparent; neither are cut stone, bricks, etc. Thus, this spell won’t let you look through castle walls. This is also a Knowledge spell."
  },
  {
    "id": "spl-warren-071",
    "name": "Teleport",
    "nh": "IQ-1",
    "isFavorite": false,
    "notes": "VH",
    "college": "Movement",
    "class": "Special",
    "duration": "",
    "cost": "",
    "timeToCast": "Two seconds.",
    "description": "Instantly moves the caster to a remote location. If he is not actually looking at the location, he must have been there before. Skill penalties may apply: -2 for a place not seen in the past month (except the caster’s home); -1 to -3 for a place seen only briefly; -2 for a place “seen” only indirectly, through another’s mind, television, magic, or the like.\n\nCaster can carry anything along up to heavy encumbrance. Objects must be carried; another person can be taken along by holding hands.\n\nThe spell is risky to use. A roll failed by 1 inflicts 1d of damage and physically stuns the caster on arrival. A roll failed by more than 1 teleports him to a random destination. A critical failure can send him anywhere that doesn’t kill him outright.\n\nEven a successful roll requires follow-up roll against Body Sense. On a critical failure, the caster is stunned. On an ordinary failure, he suffers disorientation and can take only defensive actions. He arrives in the same posture he was in at the start, but can change facing; this imposes a penalty to Body Sense, -2 to rotate horizontally, -5 to rotate vertically.\n\nCost depends on range, and increased range also imposes a penalty on skill in casting the spell:\n\nTeleport Table\nWithin 10 yards: Cost 3, Penalty 0.\n11 to 20 yards: Cost 4, Penalty -1.\n21 to 100 yards: Cost 5, Penalty -2.\n101 to 500 yards: Cost 6, Penalty -3.\n501 yards to 1.99 miles: Cost 7, Penalty -4.\n2 to 9.99 miles: Cost 8, Penalty -5.\n10 to 99.99 miles: Cost 9, Penalty -6.\n100 to 999.99 miles: Cost 10, Penalty -7.\n×10 range: Cost +1 additional, Penalty -1."
  },
  {
    "id": "spl-warren-072",
    "name": "Seek Water",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Water",
    "class": "Information",
    "duration": "",
    "cost": "2.",
    "timeToCast": "",
    "description": "This spell lets the caster determine the direction, distance, and general nature of the nearest significant source of water. Use the long-distance modifiers (p. 241). Any known sources of water may be excluded if the caster specifically mentions them before beginning. Requires a forked stick; roll at -3 if this is not available."
  },
  {
    "id": "spl-warren-073",
    "name": "Flesh to Stone",
    "nh": "IQ+2",
    "isFavorite": false,
    "notes": "",
    "college": "Earth",
    "class": "Regular; Resisted by HT",
    "duration": "Instantaneous, unless reversed by Stone to Flesh.",
    "cost": "10. For double cost, a subject may be turned into a metallic statue.",
    "timeToCast": "2 seconds.",
    "description": "“Petrifies” a living subject (and all his gear!), turning him to stone. Must affect the entire subject."
  },
  {
    "id": "spl-warren-074",
    "name": "Hawk Flight",
    "nh": "IQ-1",
    "isFavorite": false,
    "notes": "VH",
    "college": "Movement",
    "class": "Regular",
    "duration": "1 minute.",
    "cost": "8 to cast. 4 to maintain.",
    "timeToCast": "3 seconds.",
    "description": "A very fast Flight spell. The subject has a Move of 40 (80 mph) without encumbrance; encumbrance reduces Move normally. The subject can move and fight normally, and has a combat advantage if above his foes (p. B402)."
  },
  {
    "id": "spl-warren-075",
    "name": "Purify Water",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Water",
    "class": "Special",
    "duration": "Purified water stays pure unless re-contaminated.",
    "cost": "1 per gallon purified.",
    "timeToCast": "Usually 5 to 10 seconds per gallon, unless a large container and ring are used.",
    "description": "Lets the caster remove all impurities from water by pouring it through any hoop or ring (or, in a pinch, his own fingers) into a container. Only one skill roll is required, as long as the flow continues."
  },
  {
    "id": "spl-warren-076",
    "name": "Stone Missile",
    "nh": "IQ+2",
    "isFavorite": false,
    "notes": "",
    "college": "Earth",
    "class": "Missile",
    "duration": "",
    "cost": "Any amount up to your Magery level per second, for 3 seconds. The missile does 1d+1 crushing damage per energy point.",
    "timeToCast": "1 to 3 seconds.",
    "description": "Create a ball of stone and fire it from one hand, injuring anything it hits. This spell has 1⁄2D 40, Max 80, Acc 2."
  },
  {
    "id": "spl-warren-077",
    "name": "Flight",
    "nh": "IQ-1",
    "isFavorite": false,
    "notes": "VH",
    "college": "Movement",
    "class": "Regular",
    "duration": "One minute.",
    "cost": "5 to cast; 3 to maintain.",
    "timeToCast": "Two seconds.",
    "description": "Lets the subject fly through the air under his own control, without wings, at Move 10. Flight speed reduces normally because of encumbrance. Subject can move and fight normally and has a combat advantage if above a foe."
  },
  {
    "id": "spl-warren-078",
    "name": "Stone to Earth",
    "nh": "IQ+2",
    "isFavorite": false,
    "notes": "",
    "college": "Earth",
    "class": "Regular",
    "duration": "Permanent.",
    "cost": "6 per cubic yard (minimum 6).",
    "timeToCast": "",
    "description": "Turns any kind of stone (including gemstone) into simple earth. Must be cast on a whole stone or block, rather than a part of it."
  },
  {
    "id": "spl-warren-079",
    "name": "Blink",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Movement, Gate",
    "class": "Blocking",
    "duration": "",
    "cost": "2.",
    "timeToCast": "",
    "description": "Avoid an attack by teleporting instantly out of its way and into an open spot nearby. A spot is not open if someone is standing in it; any lesser obstruction is “open” for the purpose of this spell.\n\nThe caster may Blink to any unoccupied spot within 3 yards, in any direction. The caster’s facing remains unchanged. The caster must roll against his Body Sense skill to act on his next turn (p. B181). If there are no open spots within 3 yards, the spell will fail.\n\nFor combat purposes, the “blink” is treated as a dodge that succeeds automatically if the spell roll is made. A critical failure on this spell is treated like a Teleport critical failure, except that the caster rarely goes more than a mile. This is also a Gate spell."
  },
  {
    "id": "spl-warren-080",
    "name": "Stone to Flesh",
    "nh": "IQ+2",
    "isFavorite": false,
    "notes": "",
    "college": "Earth",
    "class": "Regular",
    "duration": "Instantaneous.",
    "cost": "10. Double cost to restore a person turned to metal.",
    "timeToCast": "5 seconds.",
    "description": "Reverses the effects of Flesh to Stone and brings the victim back to life (stunned). Cannot be used to animate a statue that was never alive."
  },
  {
    "id": "spl-warren-081",
    "name": "Blink Other",
    "nh": "IQ-1",
    "isFavorite": false,
    "notes": "VH",
    "college": "Movement, Gate",
    "class": "Blocking",
    "duration": "",
    "cost": "2.",
    "timeToCast": "",
    "description": "As Blink, but usable on others. This is also a Gate spell."
  },
  {
    "id": "spl-warren-082",
    "name": "Purify Air",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Air",
    "class": "Area",
    "duration": "Works instantly. Purification is permanent.",
    "cost": "1. Cannot be maintained; must be recast.",
    "timeToCast": "",
    "description": "This spell removes all impurities from the air in its area of effect. It is often used to neutralize the effects of poisonous gas or vapors. Note that a room full of smoke may safely be purified one section at a time – but truly deadly vapors must all be removed at once, or some may escape. This spell also turns old “stale” air into fresh breathable air. The air in a one-yard radius, if not renewed from the outside, will last 45 minutes for one person at rest, less for multiple persons or someone violently exercising (GM’s discretion)."
  },
  {
    "id": "spl-warren-083",
    "name": "Partial Petrifaction",
    "nh": "IQ+1",
    "isFavorite": false,
    "notes": "VH",
    "college": "Earth",
    "class": "Melee; Resisted by HT",
    "duration": "Permanent (until negated).",
    "cost": "12. It costs more to petrify larger subjects, just as if it were a Regular spell (i.e., 24 energy for SM +1, 36 energy for SM +2, etc.).",
    "timeToCast": "3 seconds.",
    "description": "Turns part of a living subject to stone, usually leaving him immobile but still able to talk or be tortured. The caster must touch the subject. The body parts changed are at the discretion of the caster; the spell can petrify anything from a single finger to the entire body from the neck down, but the head can never be affected. The subject’s metabolism is magically altered to survive the experience, but he understandably finds the experience intensely uncomfortable, whatever else is done to him.\n\nPetrified body parts are immobile, numb, and have DR 10. Victims of this spell suffer a DX penalty on any physical action they attempt: -1 or more, depending on details of the casting and the action. Clothes, jewelry, etc., may be “caught up” in the spell and included in the petrifaction, but magic items or anything carried in the hand or a backpack remain unchanged. Either Stone to Flesh or Remove Curse is required to negate this spell."
  },
  {
    "id": "spl-warren-084",
    "name": "Flying Carpet",
    "nh": "IQ-1",
    "isFavorite": false,
    "notes": "VH",
    "college": "Movement",
    "class": "Regular",
    "duration": "10 minutes.",
    "cost": "1 per square foot of surface. Each square foot will carry about 25 pounds (or less, if made of flimsy material). Half that to maintain.",
    "timeToCast": "5 seconds.",
    "description": "Transforms a carpet (or any other object one could reasonably stand on or in – cauldron, chair, towel, broom, etc.) into a flying vehicle. It is under the command of the first person to step aboard it. If there are several beings already aboard when the spell is cast, roll a Quick Contest of Will to see who gets control; the caster (if aboard) gets a +5 bonus to this roll. If the pilot leaves the carpet, roll another quick contest of Will between the remaining passengers to see who gets control. The carpet’s maximum Move is equal to the caster’s effective skill, and it can handle 1 G turns without skill rolls being necessary (p. B466). Use the Piloting (Contragravity) skill (p. B214) to control the carpet.\n\nIn general, a rider cannot fall from a flying carpet unless he jumps off deliberately or is knocked off by an obstacle (such as a tree branch) or attack; the carpet keeps its riders safely on board through a combination of magic and deft maneuvering. A flying carpet does not bank sharply, fold, or bend; the spell specifically provides a stable, level platform (which makes flying through narrow gaps rather hard). Any rider engaged in strenuous activity such as fighting must make a DX roll every turn to avoid falling off (the GM may modify this roll depending on the activity). In all other respects, treat anyone fighting from a flying carpet as being on the ground (ignore the special rules for flying combatants on p. B548). Characters aiming a missile weapon from a moving carpet can only take the Acc bonus; aiming for extra turns gives no further bonus. Of course, someone fighting from a flying broom or chair would be subject to the usual penalties for being seated (p. B547).\n\nGenerous GMs may stipulate that, after the caster cancels the spell, the conveyance remains airborne for 2d+2 seconds, wobbling more with every passing moment. This sometimes allows a safe, if bumpy, landing."
  },
  {
    "id": "spl-warren-085",
    "name": "No-Smell",
    "nh": "IQ",
    "isFavorite": false,
    "notes": "",
    "college": "Air",
    "class": "Regular",
    "duration": "1 hour.",
    "cost": "2 to cast. 2 to maintain.",
    "timeToCast": "",
    "description": "Removes the subject’s odor and makes it (or him) totally undetectable by smell. Any possessions are also affected. This spell changes no other properties of the subject."
  },
  {
    "id": "spl-warren-086",
    "name": "Body of Stone",
    "nh": "IQ+1",
    "isFavorite": false,
    "notes": "VH",
    "college": "Earth",
    "class": "Regular; Resisted by HT",
    "duration": "1 minute.",
    "cost": "10 to cast. 5 to maintain.",
    "timeToCast": "5 seconds.",
    "description": "Subject becomes an animated stone statue; he temporarily acquires the Body of Stone meta-trait (p. B262). Clothes also become stone, but carried equipment does not."
  },
  {
    "id": "spl-warren-087",
    "name": "Sense Foes",
    "nh": "IQ+2",
    "isFavorite": false,
    "notes": "",
    "college": "Communication and Empathy",
    "class": "Information; Area",
    "duration": "",
    "cost": "1 (minimum 2).",
    "timeToCast": "",
    "description": "Tells the caster if the subject has hostile intent, and what the degree of hostility is. Can be cast on one person or a whole area. If cast over an area, this spell only detects that someone is hostile, without telling who."
  }
],
        "weight":  "",
        "history":  [

                    ],
        "parries":  [
                        {
                            "id":  "parry-npc-1791656413293-ia1k7-1",
                            "notes":  "",
                            "value":  11,
                            "parryType":  "",
                            "weaponName":  "Quarterstaff"
                        }
                    ],
        "weapons":  [
                        {
                            "id":  "wpn-1791942300161-1mig",
                            "name":  "Quarterstaff",
                            "nh":  "DX+2",
                            "damage":  "1d+2",
                            "type":  "Swing",
                            "reach":  "1",
                            "modes":  [
                                          {
                                              "id":  "mode-1791942252094-1",
                                              "name":  "Crushing",
                                              "damage":  "1d+2",
                                              "type":  "Swing",
                                              "reach":  "1"
                                          },
                                          {
                                              "id":  "mode-1791942260742-k8tq",
                                              "name":  "Crushing",
                                              "damage":  "1d",
                                              "type":  "Thrust",
                                              "reach":  "2"
                                          }
                                      ],
                            "notes":  ""
                        }
                    ],
        "armorKits":  [
                          {
                              "id":  "kit-1791942449551-zv8f",
                              "name":  "Equipamento",
                              "isActive":  true,
                              "locations":  [
                                                {
                                                    "location":  "Eye",
                                                    "rollTarget":  "-",
                                                    "penalty":  "-9",
                                                    "armorName":  "",
                                                    "dr":  0,
                                                    "notes":  "",
                                                    "additionalRule":  "Só consegue acertar o olho danos de Empalamento, Perfurante ou Magia",
                                                    "id":  "armor-npc-1791656413293-ia1k7-0-24a",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Head",
                                                    "rollTarget":  "3-4",
                                                    "penalty":  "-7",
                                                    "armorName":  "Light Layered Leather",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "Tem +2 de RD / Qualquer dano vira 4X",
                                                    "id":  "armor-npc-1791656413293-ia1k7-1-t9q",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Face",
                                                    "rollTarget":  "5",
                                                    "penalty":  "-5",
                                                    "armorName":  "",
                                                    "dr":  0,
                                                    "notes":  "",
                                                    "additionalRule":  "",
                                                    "id":  "armor-npc-1791656413293-ia1k7-2-mvu",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Left Leg",
                                                    "rollTarget":  "13-14",
                                                    "penalty":  "-2",
                                                    "armorName":  "Light Layered Leather",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791656413293-ia1k7-3-nj4",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Right Leg",
                                                    "rollTarget":  "6-7",
                                                    "penalty":  "-2",
                                                    "armorName":  "Light Layered Leather",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791656413293-ia1k7-4-io2",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Left Shins",
                                                    "rollTarget":  "13-14",
                                                    "penalty":  "-2",
                                                    "armorName":  "Light Layered Leather",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791656413293-ia1k7-5-9wh",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Right Shins",
                                                    "rollTarget":  "6-7",
                                                    "penalty":  "-2",
                                                    "armorName":  "Light Layered Leather",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791656413293-ia1k7-6-rrh",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Left Arm",
                                                    "rollTarget":  "12",
                                                    "penalty":  "-2",
                                                    "armorName":  "Light Layered Leather",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791656413293-ia1k7-7-x37",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Right Arm",
                                                    "rollTarget":  "8",
                                                    "penalty":  "-2",
                                                    "armorName":  "Light Layered Leather",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791656413293-ia1k7-8-ju9",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Left Forearm",
                                                    "rollTarget":  "12",
                                                    "penalty":  "-2",
                                                    "armorName":  "Light Layered Leather",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791656413293-ia1k7-9-1l7",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Right Forearm",
                                                    "rollTarget":  "8",
                                                    "penalty":  "-2",
                                                    "armorName":  "Light Layered Leather",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791656413293-ia1k7-10-r79",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Torso",
                                                    "rollTarget":  "9-10",
                                                    "penalty":  "0",
                                                    "armorName":  "Light Layered Leather",
                                                    "dr":  5,
                                                    "notes":  "",
                                                    "additionalRule":  "",
                                                    "id":  "armor-npc-1791656413293-ia1k7-11-yjn",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Groin",
                                                    "rollTarget":  "11",
                                                    "penalty":  "-3",
                                                    "armorName":  "Light Layered Leather",
                                                    "dr":  5,
                                                    "notes":  "",
                                                    "additionalRule":  "",
                                                    "id":  "armor-npc-1791656413293-ia1k7-12-knl",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Hand",
                                                    "rollTarget":  "15",
                                                    "penalty":  "-4",
                                                    "armorName":  "Light Layered Leather",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791656413293-ia1k7-13-lu3",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Feet",
                                                    "rollTarget":  "16",
                                                    "penalty":  "-4",
                                                    "armorName":  "Light Layered Leather",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791656413293-ia1k7-14-zh9",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Neck",
                                                    "rollTarget":  "17-18",
                                                    "penalty":  "-5",
                                                    "armorName":  "Light Layered Leather",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "Contusão vira 1,5, corte vai de 1,5 para 2.0",
                                                    "id":  "armor-npc-1791656413293-ia1k7-15-qxb",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Vitals",
                                                    "rollTarget":  "-",
                                                    "penalty":  "-3",
                                                    "armorName":  "Light Layered Leather",
                                                    "dr":  5,
                                                    "notes":  "",
                                                    "additionalRule":  "Empalamento e perfuração vira x3",
                                                    "id":  "armor-npc-1791656413293-ia1k7-16-9of",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                }
                                            ]
                          }
                      ],
        "basicMove":  "4 (-1 Peso)",
        "equipment":  "",
        "fpCurrent":  10,
        "hpCurrent":  10,
        "naturalDr":  0,
        "updatedAt":  1791945217140,
        "advantages":  "",
        "basicSpeed":  5,
        "dodgeNotes":  "(-1 Peso)",
        "extraItems":  [
                           {
                               "id":  "item-1791657009996-ps9",
                               "max":  3,
                               "name":  "Fadiga Extra Mágica",
                               "current":  3,
                               "category":  "mana",
                               "isFavorite":  true
                           },
                           {
                               "id":  "item-1791657011712-2df",
                               "max":  10,
                               "name":  "Colar Passe (10 FP)",
                               "current":  10,
                               "category":  "mana",
                               "isFavorite":  true
                           },
                           {
                               "id":  "item-1791657012004-vfg",
                               "max":  10,
                               "name":  "Anel de Topázio Azul (10 FP)",
                               "current":  10,
                               "category":  "mana",
                               "isFavorite":  true
                           },
                           {
                               "id":  "item-1791657012264-q32",
                               "max":  10,
                               "name":  "Anel de Safira Branca (10 FP)",
                               "current":  10,
                               "category":  "mana",
                               "isFavorite":  true
                           },
                           {
                               "id":  "item-1791657012488-p40",
                               "max":  20,
                               "name":  "Rubi no Bracelete (20 FP) - Espec",
                               "current":  20,
                               "category":  "mana",
                               "isFavorite":  true
                           },
                           {
                               "id":  "item-1791657012708-45n",
                               "max":  30,
                               "name":  "Rubi no Bracelete (30 FP) - Espec",
                               "current":  30,
                               "category":  "mana",
                               "isFavorite":  true
                           },
                           {
                               "id":  "item-1791657012948-hzs",
                               "max":  30,
                               "name":  "Diamante no Bracelete (30 FP)",
                               "current":  30,
                               "category":  "mana",
                               "isFavorite":  true
                           }
                       ],
        "playerName":  "Paulinho",
        "combatPerks":  "",
        "masterNotes":  "",
        "turnActions":  {
                            "notes":  "",
                            "shock":  0,
                            "blockCount":  0,
                            "dodgeCount":  0,
                            "parryCount":  0,
                            "usedRetreat":  false,
                            "fatigueAmountUsed":  0,
                            "usedBlockThisTurn":  false,
                            "usedFatigueThisTurn":  false
                        },
        "activeSpells":  [

                         ],
        "avatarPreset":  "knight",
        "combatSkills":  "",
        "characterType":  "player",
        "disadvantages":  "",
        "affectedSpells":  [

                           ],
        "armorLocations":  [
                               {
                                   "location":  "Eye",
                                   "rollTarget":  "-",
                                   "penalty":  "-9",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "Só consegue acertar o olho danos de Empalamento, Perfurante ou Magia",
                                   "id":  "armor-npc-1791656413293-ia1k7-0-24a",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Head",
                                   "rollTarget":  "3-4",
                                   "penalty":  "-7",
                                   "armorName":  "Light Layered Leather",
                                   "dr":  4,
                                   "notes":  "",
                                   "additionalRule":  "Tem +2 de RD / Qualquer dano vira 4X",
                                   "id":  "armor-npc-1791656413293-ia1k7-1-t9q",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Face",
                                   "rollTarget":  "5",
                                   "penalty":  "-5",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "",
                                   "id":  "armor-npc-1791656413293-ia1k7-2-mvu",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Left Leg",
                                   "rollTarget":  "13-14",
                                   "penalty":  "-2",
                                   "armorName":  "Light Layered Leather",
                                   "dr":  4,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791656413293-ia1k7-3-nj4",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Right Leg",
                                   "rollTarget":  "6-7",
                                   "penalty":  "-2",
                                   "armorName":  "Light Layered Leather",
                                   "dr":  4,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791656413293-ia1k7-4-io2",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Left Shins",
                                   "rollTarget":  "13-14",
                                   "penalty":  "-2",
                                   "armorName":  "Light Layered Leather",
                                   "dr":  4,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791656413293-ia1k7-5-9wh",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Right Shins",
                                   "rollTarget":  "6-7",
                                   "penalty":  "-2",
                                   "armorName":  "Light Layered Leather",
                                   "dr":  4,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791656413293-ia1k7-6-rrh",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Left Arm",
                                   "rollTarget":  "12",
                                   "penalty":  "-2",
                                   "armorName":  "Light Layered Leather",
                                   "dr":  4,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791656413293-ia1k7-7-x37",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Right Arm",
                                   "rollTarget":  "8",
                                   "penalty":  "-2",
                                   "armorName":  "Light Layered Leather",
                                   "dr":  4,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791656413293-ia1k7-8-ju9",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Left Forearm",
                                   "rollTarget":  "12",
                                   "penalty":  "-2",
                                   "armorName":  "Light Layered Leather",
                                   "dr":  4,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791656413293-ia1k7-9-1l7",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Right Forearm",
                                   "rollTarget":  "8",
                                   "penalty":  "-2",
                                   "armorName":  "Light Layered Leather",
                                   "dr":  4,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791656413293-ia1k7-10-r79",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Torso",
                                   "rollTarget":  "9-10",
                                   "penalty":  "0",
                                   "armorName":  "Light Layered Leather",
                                   "dr":  5,
                                   "notes":  "",
                                   "additionalRule":  "",
                                   "id":  "armor-npc-1791656413293-ia1k7-11-yjn",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Groin",
                                   "rollTarget":  "11",
                                   "penalty":  "-3",
                                   "armorName":  "Light Layered Leather",
                                   "dr":  5,
                                   "notes":  "",
                                   "additionalRule":  "",
                                   "id":  "armor-npc-1791656413293-ia1k7-12-knl",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Hand",
                                   "rollTarget":  "15",
                                   "penalty":  "-4",
                                   "armorName":  "Light Layered Leather",
                                   "dr":  4,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791656413293-ia1k7-13-lu3",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Feet",
                                   "rollTarget":  "16",
                                   "penalty":  "-4",
                                   "armorName":  "Light Layered Leather",
                                   "dr":  4,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791656413293-ia1k7-14-zh9",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Neck",
                                   "rollTarget":  "17-18",
                                   "penalty":  "-5",
                                   "armorName":  "Light Layered Leather",
                                   "dr":  4,
                                   "notes":  "",
                                   "additionalRule":  "Contusão vira 1,5, corte vai de 1,5 para 2.0",
                                   "id":  "armor-npc-1791656413293-ia1k7-15-qxb",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Vitals",
                                   "rollTarget":  "-",
                                   "penalty":  "-3",
                                   "armorName":  "Light Layered Leather",
                                   "dr":  5,
                                   "notes":  "",
                                   "additionalRule":  "Empalamento e perfuração vira x3",
                                   "id":  "armor-npc-1791656413293-ia1k7-16-9of",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               }
                           ],
        "assistantNotes":  "",
        "activeArmorKitId":  "kit-1791942449551-zv8f",
        "statusConditions":  [

                             ],
        "conditionMetadata":  {

                              },
        "isVisibleToPlayer":  false
    },
    {
        "dx":  10,
        "ht":  10,
        "id":  "npc-1791727000932-ki8we",
        "iq":  15,
        "st":  9,
        "per":  10,
        "name":  "Thoren",
        "will":  12,
        "block":  0,
        "dodge":  8,
        "fpMax":  10,
        "hpMax":  9,
        "title":  "Membro de The Hounds",
        "avatar":  "https://cjjhlorfnjspikjhsanx.supabase.co/storage/v1/object/public/hounds-images/mv55yqdrwns8rfqd.jpg",
        "height":  "",
        "isDead":  false,
        "skills":  "",
        "spells":  [

                   ],
        "weight":  "",
        "history":  [

                    ],
        "parries":  [
                        {
                            "id":  "parry-npc-1791727000932-ki8we-1",
                            "notes":  "",
                            "value":  8,
                            "parryType":  "",
                            "weaponName":  "Quarterstaff"
                        }
                    ],
        "weapons":  [
                        {
                            "id":  "wpn-1791941705041-3c76",
                            "name":  "Quarterstaff",
                            "nh":  "DX",
                            "damage":  "1d+1",
                            "type":  "Swing",
                            "reach":  "1",
                            "modes":  [
                                          {
                                              "id":  "mode-1791941648828-1",
                                              "name":  "Crushing",
                                              "damage":  "1d+1",
                                              "type":  "Swing",
                                              "reach":  "1"
                                          },
                                          {
                                              "id":  "mode-1791941653932-jtxu",
                                              "name":  "Crushing",
                                              "damage":  "1d",
                                              "type":  "Thrust",
                                              "reach":  "2"
                                          }
                                      ],
                            "notes":  ""
                        }
                    ],
        "basicMove":  "5",
        "equipment":  "",
        "fpCurrent":  10,
        "hpCurrent":  9,
        "naturalDr":  0,
        "updatedAt":  1791945217140,
        "advantages":  "",
        "basicSpeed":  5,
        "extraItems":  [
                           {
                               "id":  "item-1791804333861-y7s",
                               "max":  10,
                               "name":  "Pedra Passe",
                               "current":  10,
                               "category":  "mana"
                           },
                           {
                               "id":  "item-1791804341757-4b2",
                               "max":  12,
                               "name":  "Pedra Anel Safira Laranja",
                               "current":  12,
                               "category":  "mana"
                           },
                           {
                               "id":  "item-1791804342053-bju",
                               "max":  30,
                               "name":  "Pedra Esmeralda",
                               "current":  30,
                               "category":  "mana"
                           },
                           {
                               "id":  "item-1791804342797-ir6",
                               "max":  15,
                               "name":  "Pedra Rubi Especialista",
                               "current":  15,
                               "category":  "mana"
                           },
                           {
                               "id":  "item-1791804343065-kke",
                               "max":  30,
                               "name":  "Pedra Jade Especialista",
                               "current":  30,
                               "category":  "mana"
                           },
                           {
                               "id":  "item-1791804343577-k3m",
                               "max":  10,
                               "name":  "Pedra Onix 1",
                               "current":  10,
                               "category":  "mana"
                           },
                           {
                               "id":  "item-1791804343841-vys",
                               "max":  10,
                               "name":  "Pedra Onix 2",
                               "current":  10,
                               "category":  "mana"
                           }
                       ],
        "playerName":  "Rodrigo",
        "combatPerks":  "",
        "masterNotes":  "",
        "turnActions":  {
                            "notes":  "",
                            "shock":  0,
                            "blockCount":  0,
                            "dodgeCount":  0,
                            "parryCount":  0,
                            "usedRetreat":  false,
                            "fatigueAmountUsed":  0,
                            "usedBlockThisTurn":  false,
                            "usedFatigueThisTurn":  false
                        },
        "activeSpells":  [

                         ],
        "avatarPreset":  "knight",
        "combatSkills":  "",
        "characterType":  "player",
        "disadvantages":  "",
        "affectedSpells":  [

                           ],
        "armorLocations":  [
                               {
                                   "location":  "Eye",
                                   "rollTarget":  "-",
                                   "penalty":  "-9",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "Só consegue acertar o olho danos de Empalamento, Perfurante ou Magia",
                                   "id":  "armor-npc-1791727000932-ki8we-0",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0,
                                   "gurpsNotesRef":  "[1, 2]"
                               },
                               {
                                   "location":  "Skull",
                                   "rollTarget":  "3-4",
                                   "penalty":  "-7",
                                   "armorName":  "Robe de Seda",
                                   "dr":  1,
                                   "notes":  "",
                                   "additionalRule":  "Tem +2 de RD / Qualquer dano vira 4X",
                                   "id":  "armor-npc-1791727000932-ki8we-1",
                                   "drModifier":  1,
                                   "modifierDamageType":  "corte",
                                   "damageTaken":  0,
                                   "gurpsNotesRef":  "[1, 3]"
                               },
                               {
                                   "location":  "Face",
                                   "rollTarget":  "5",
                                   "penalty":  "-5",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "",
                                   "id":  "armor-npc-1791727000932-ki8we-2",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0,
                                   "gurpsNotesRef":  "[1, 4]"
                               },
                               {
                                   "location":  "Left Leg",
                                   "rollTarget":  "13-14",
                                   "penalty":  "-2",
                                   "armorName":  "Robe de Seda",
                                   "dr":  1,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791727000932-ki8we-8",
                                   "drModifier":  1,
                                   "modifierDamageType":  "corte",
                                   "damageTaken":  0,
                                   "gurpsNotesRef":  "[5]"
                               },
                               {
                                   "location":  "Right Leg",
                                   "rollTarget":  "6-7",
                                   "penalty":  "-2",
                                   "armorName":  "Robe de Seda",
                                   "dr":  1,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791727000932-ki8we-3",
                                   "drModifier":  1,
                                   "modifierDamageType":  "corte",
                                   "damageTaken":  0,
                                   "gurpsNotesRef":  "[5]"
                               },
                               {
                                   "location":  "Left Shins",
                                   "rollTarget":  "13-14",
                                   "penalty":  "-2",
                                   "armorName":  "Robe de Seda",
                                   "dr":  1,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791727000932-ki8we-5-cgy",
                                   "drModifier":  1,
                                   "modifierDamageType":  "corte",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Right Shins",
                                   "rollTarget":  "6-7",
                                   "penalty":  "-2",
                                   "armorName":  "Robe de Seda",
                                   "dr":  1,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791727000932-ki8we-6-qo9",
                                   "drModifier":  1,
                                   "modifierDamageType":  "corte",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Left Arm",
                                   "rollTarget":  "12",
                                   "penalty":  "-2",
                                   "armorName":  "Robe de Seda",
                                   "dr":  1,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791727000932-ki8we-7",
                                   "drModifier":  1,
                                   "modifierDamageType":  "corte",
                                   "damageTaken":  0,
                                   "gurpsNotesRef":  "[5, 6]"
                               },
                               {
                                   "location":  "Right Arm",
                                   "rollTarget":  "8",
                                   "penalty":  "-2",
                                   "armorName":  "Robe de Seda",
                                   "dr":  1,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791727000932-ki8we-4",
                                   "drModifier":  1,
                                   "modifierDamageType":  "corte",
                                   "damageTaken":  0,
                                   "gurpsNotesRef":  "[5, 6]"
                               },
                               {
                                   "location":  "Left Forearm",
                                   "rollTarget":  "12",
                                   "penalty":  "-2",
                                   "armorName":  "Robe de Seda",
                                   "dr":  1,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791727000932-ki8we-9-tjr",
                                   "drModifier":  1,
                                   "modifierDamageType":  "corte",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Right Forearm",
                                   "rollTarget":  "8",
                                   "penalty":  "-2",
                                   "armorName":  "Robe de Seda",
                                   "dr":  1,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791727000932-ki8we-10-szm",
                                   "drModifier":  1,
                                   "modifierDamageType":  "corte",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Torso",
                                   "rollTarget":  "9-10",
                                   "penalty":  "0",
                                   "armorName":  "Robe de Seda",
                                   "dr":  1,
                                   "notes":  "",
                                   "additionalRule":  "",
                                   "id":  "armor-npc-1791727000932-ki8we-5",
                                   "drModifier":  1,
                                   "modifierDamageType":  "corte",
                                   "damageTaken":  0,
                                   "gurpsNotesRef":  ""
                               },
                               {
                                   "location":  "Groin",
                                   "rollTarget":  "11",
                                   "penalty":  "-3",
                                   "armorName":  "Robe de Seda",
                                   "dr":  1,
                                   "notes":  "",
                                   "additionalRule":  "",
                                   "id":  "armor-npc-1791727000932-ki8we-6",
                                   "drModifier":  1,
                                   "modifierDamageType":  "corte",
                                   "damageTaken":  0,
                                   "gurpsNotesRef":  "[1, 7]"
                               },
                               {
                                   "location":  "Hand",
                                   "rollTarget":  "15",
                                   "penalty":  "-4",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791727000932-ki8we-9",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0,
                                   "gurpsNotesRef":  "[6, 8, 9]"
                               },
                               {
                                   "location":  "Foot",
                                   "rollTarget":  "16",
                                   "penalty":  "-4",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791727000932-ki8we-10",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0,
                                   "gurpsNotesRef":  "[8, 9]"
                               },
                               {
                                   "location":  "Neck",
                                   "rollTarget":  "17-18",
                                   "penalty":  "-5",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "Contusão vira 1,5, corte vai de 1,5 para 2.0",
                                   "id":  "armor-npc-1791727000932-ki8we-11",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0,
                                   "gurpsNotesRef":  "[1, 10]"
                               },
                               {
                                   "location":  "Vitals",
                                   "rollTarget":  "-",
                                   "penalty":  "-3",
                                   "armorName":  "Robe de Seda",
                                   "dr":  1,
                                   "notes":  "",
                                   "additionalRule":  "Empalamento e perfuração vira x3",
                                   "id":  "armor-npc-1791727000932-ki8we-12",
                                   "drModifier":  1,
                                   "modifierDamageType":  "corte",
                                   "damageTaken":  0,
                                   "gurpsNotesRef":  "[1, 11]"
                               }
                           ],
        "assistantNotes":  "",
        "statusConditions":  [

                             ],
        "conditionMetadata":  {

                              },
        "isVisibleToPlayer":  false,
        "armorKits":  [
                          {
                              "id":  "kit-npc-1791727000932-ki8we-1",
                              "name":  "Kit Principal",
                              "isActive":  true,
                              "locations":  [
                                                {
                                                    "location":  "Eye",
                                                    "rollTarget":  "-",
                                                    "penalty":  "-9",
                                                    "armorName":  "",
                                                    "dr":  0,
                                                    "notes":  "",
                                                    "additionalRule":  "Só consegue acertar o olho danos de Empalamento, Perfurante ou Magia",
                                                    "id":  "armor-npc-1791727000932-ki8we-0",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0,
                                                    "gurpsNotesRef":  "[1, 2]"
                                                },
                                                {
                                                    "location":  "Skull",
                                                    "rollTarget":  "3-4",
                                                    "penalty":  "-7",
                                                    "armorName":  "Robe de Seda",
                                                    "dr":  1,
                                                    "notes":  "",
                                                    "additionalRule":  "Tem +2 de RD / Qualquer dano vira 4X",
                                                    "id":  "armor-npc-1791727000932-ki8we-1",
                                                    "drModifier":  1,
                                                    "modifierDamageType":  "corte",
                                                    "damageTaken":  0,
                                                    "gurpsNotesRef":  "[1, 3]"
                                                },
                                                {
                                                    "location":  "Face",
                                                    "rollTarget":  "5",
                                                    "penalty":  "-5",
                                                    "armorName":  "",
                                                    "dr":  0,
                                                    "notes":  "",
                                                    "additionalRule":  "",
                                                    "id":  "armor-npc-1791727000932-ki8we-2",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0,
                                                    "gurpsNotesRef":  "[1, 4]"
                                                },
                                                {
                                                    "location":  "Left Leg",
                                                    "rollTarget":  "13-14",
                                                    "penalty":  "-2",
                                                    "armorName":  "Robe de Seda",
                                                    "dr":  1,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791727000932-ki8we-8",
                                                    "drModifier":  1,
                                                    "modifierDamageType":  "corte",
                                                    "damageTaken":  0,
                                                    "gurpsNotesRef":  "[5]"
                                                },
                                                {
                                                    "location":  "Right Leg",
                                                    "rollTarget":  "6-7",
                                                    "penalty":  "-2",
                                                    "armorName":  "Robe de Seda",
                                                    "dr":  1,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791727000932-ki8we-3",
                                                    "drModifier":  1,
                                                    "modifierDamageType":  "corte",
                                                    "damageTaken":  0,
                                                    "gurpsNotesRef":  "[5]"
                                                },
                                                {
                                                    "location":  "Left Shins",
                                                    "rollTarget":  "13-14",
                                                    "penalty":  "-2",
                                                    "armorName":  "Robe de Seda",
                                                    "dr":  1,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791727000932-ki8we-5-cgy",
                                                    "drModifier":  1,
                                                    "modifierDamageType":  "corte",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Right Shins",
                                                    "rollTarget":  "6-7",
                                                    "penalty":  "-2",
                                                    "armorName":  "Robe de Seda",
                                                    "dr":  1,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791727000932-ki8we-6-qo9",
                                                    "drModifier":  1,
                                                    "modifierDamageType":  "corte",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Left Arm",
                                                    "rollTarget":  "12",
                                                    "penalty":  "-2",
                                                    "armorName":  "Robe de Seda",
                                                    "dr":  1,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791727000932-ki8we-7",
                                                    "drModifier":  1,
                                                    "modifierDamageType":  "corte",
                                                    "damageTaken":  0,
                                                    "gurpsNotesRef":  "[5, 6]"
                                                },
                                                {
                                                    "location":  "Right Arm",
                                                    "rollTarget":  "8",
                                                    "penalty":  "-2",
                                                    "armorName":  "Robe de Seda",
                                                    "dr":  1,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791727000932-ki8we-4",
                                                    "drModifier":  1,
                                                    "modifierDamageType":  "corte",
                                                    "damageTaken":  0,
                                                    "gurpsNotesRef":  "[5, 6]"
                                                },
                                                {
                                                    "location":  "Left Forearm",
                                                    "rollTarget":  "12",
                                                    "penalty":  "-2",
                                                    "armorName":  "Robe de Seda",
                                                    "dr":  1,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791727000932-ki8we-9-tjr",
                                                    "drModifier":  1,
                                                    "modifierDamageType":  "corte",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Right Forearm",
                                                    "rollTarget":  "8",
                                                    "penalty":  "-2",
                                                    "armorName":  "Robe de Seda",
                                                    "dr":  1,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791727000932-ki8we-10-szm",
                                                    "drModifier":  1,
                                                    "modifierDamageType":  "corte",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Torso",
                                                    "rollTarget":  "9-10",
                                                    "penalty":  "0",
                                                    "armorName":  "Robe de Seda",
                                                    "dr":  1,
                                                    "notes":  "",
                                                    "additionalRule":  "",
                                                    "id":  "armor-npc-1791727000932-ki8we-5",
                                                    "drModifier":  1,
                                                    "modifierDamageType":  "corte",
                                                    "damageTaken":  0,
                                                    "gurpsNotesRef":  ""
                                                },
                                                {
                                                    "location":  "Groin",
                                                    "rollTarget":  "11",
                                                    "penalty":  "-3",
                                                    "armorName":  "Robe de Seda",
                                                    "dr":  1,
                                                    "notes":  "",
                                                    "additionalRule":  "",
                                                    "id":  "armor-npc-1791727000932-ki8we-6",
                                                    "drModifier":  1,
                                                    "modifierDamageType":  "corte",
                                                    "damageTaken":  0,
                                                    "gurpsNotesRef":  "[1, 7]"
                                                },
                                                {
                                                    "location":  "Hand",
                                                    "rollTarget":  "15",
                                                    "penalty":  "-4",
                                                    "armorName":  "",
                                                    "dr":  0,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791727000932-ki8we-9",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0,
                                                    "gurpsNotesRef":  "[6, 8, 9]"
                                                },
                                                {
                                                    "location":  "Foot",
                                                    "rollTarget":  "16",
                                                    "penalty":  "-4",
                                                    "armorName":  "",
                                                    "dr":  0,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791727000932-ki8we-10",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0,
                                                    "gurpsNotesRef":  "[8, 9]"
                                                },
                                                {
                                                    "location":  "Neck",
                                                    "rollTarget":  "17-18",
                                                    "penalty":  "-5",
                                                    "armorName":  "",
                                                    "dr":  0,
                                                    "notes":  "",
                                                    "additionalRule":  "Contusão vira 1,5, corte vai de 1,5 para 2.0",
                                                    "id":  "armor-npc-1791727000932-ki8we-11",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0,
                                                    "gurpsNotesRef":  "[1, 10]"
                                                },
                                                {
                                                    "location":  "Vitals",
                                                    "rollTarget":  "-",
                                                    "penalty":  "-3",
                                                    "armorName":  "Robe de Seda",
                                                    "dr":  1,
                                                    "notes":  "",
                                                    "additionalRule":  "Empalamento e perfuração vira x3",
                                                    "id":  "armor-npc-1791727000932-ki8we-12",
                                                    "drModifier":  1,
                                                    "modifierDamageType":  "corte",
                                                    "damageTaken":  0,
                                                    "gurpsNotesRef":  "[1, 11]"
                                                }
                                            ]
                          }
                      ]
    },
    {
        "dx":  12,
        "ht":  12,
        "id":  "npc-1791811892267-pb4qs",
        "iq":  10,
        "st":  13,
        "per":  12,
        "name":  "Gildur",
        "will":  10,
        "block":  15,
        "dodge":  9,
        "fpMax":  12,
        "hpMax":  14,
        "title":  "Membro de The Hounds",
        "avatar":  "https://cjjhlorfnjspikjhsanx.supabase.co/storage/v1/object/public/hounds-images/mv5ajlch4ticz1yx.jpg",
        "height":  "",
        "isDead":  false,
        "skills":  "",
        "spells":  [

                   ],
        "weight":  "",
        "history":  [

                    ],
        "parries":  [
                        {
                            "id":  "parry-npc-1791811892267-pb4qs-1",
                            "notes":  "Com Shield +3",
                            "value":  12,
                            "parryType":  "",
                            "weaponName":  "Axe"
                        },
                        {
                            "id":  "parry-1791812027844-0jd",
                            "notes":  "",
                            "value":  10,
                            "parryType":  "",
                            "weaponName":  "Briga"
                        }
                    ],
        "weapons":  [
                        {
                            "id":  "wpn-1791938723495-egby",
                            "name":  "Axe",
                            "nh":  "DX+6",
                            "damage":  "3d+2",
                            "type":  "swing",
                            "reach":  "",
                            "modes":  [
                                          {
                                              "id":  "mode-1791938658775-1",
                                              "name":  "Cutting",
                                              "damage":  "3d+2",
                                              "type":  "swing",
                                              "reach":  ""
                                          }
                                      ],
                            "notes":  "Balanced, Fine e Dwarven"
                        },
                        {
                            "id":  "wpn-1791938773042-y05k",
                            "name":  "Crossbow",
                            "nh":  "DX",
                            "damage":  "2d",
                            "type":  "thrust",
                            "reach":  "",
                            "modes":  [
                                          {
                                              "id":  "mode-1791938729932-1",
                                              "name":  "Impale",
                                              "damage":  "2d",
                                              "type":  "thrust",
                                              "reach":  ""
                                          }
                                      ],
                            "notes":  ""
                        },
                        {
                            "id":  "wpn-1791938800767-0pzg",
                            "name":  "Soco",
                            "nh":  "DX+2",
                            "damage":  "1d+1",
                            "type":  "thrust",
                            "reach":  "",
                            "modes":  [
                                          {
                                              "id":  "mode-1791938776002-1",
                                              "name":  "Crushing",
                                              "damage":  "1d+1",
                                              "type":  "thrust",
                                              "reach":  ""
                                          }
                                      ],
                            "notes":  ""
                        },
                        {
                            "id":  "wpn-1791940846920-r1cb",
                            "name":  "Shield Bash",
                            "nh":  "DX+4",
                            "damage":  "1d+2",
                            "type":  "Thrust",
                            "reach":  "Thrust",
                            "modes":  [
                                          {
                                              "id":  "mode-1791940796369-1",
                                              "name":  "Crushing",
                                              "damage":  "1d+2",
                                              "type":  "Thrust",
                                              "reach":  "Thrust"
                                          }
                                      ],
                            "notes":  ""
                        }
                    ],
        "armorKits":  [
                          {
                              "id":  "kit-1791938068550-gerw",
                              "name":  "Plate Armor",
                              "isActive":  true,
                              "locations":  [
                                                {
                                                    "location":  "Eye",
                                                    "rollTarget":  "-",
                                                    "penalty":  "-9",
                                                    "armorName":  "",
                                                    "dr":  0,
                                                    "notes":  "",
                                                    "additionalRule":  "Só consegue acertar o olho danos de Empalamento, Perfurante ou Magia",
                                                    "id":  "armor-npc-1791811892267-pb4qs-0-9y9",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Head",
                                                    "rollTarget":  "3-4",
                                                    "penalty":  "-7",
                                                    "armorName":  "Heavy Plate + Padding",
                                                    "dr":  11,
                                                    "notes":  "",
                                                    "additionalRule":  "Tem +2 de RD / Qualquer dano vira 4X",
                                                    "id":  "armor-npc-1791811892267-pb4qs-1-ns7",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Face",
                                                    "rollTarget":  "5",
                                                    "penalty":  "-5",
                                                    "armorName":  "Heavy Plate se estiver fechado o Elmo",
                                                    "dr":  0,
                                                    "notes":  "",
                                                    "additionalRule":  "",
                                                    "id":  "armor-npc-1791811892267-pb4qs-2-8ir",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Left Leg",
                                                    "rollTarget":  "13-14",
                                                    "penalty":  "-2",
                                                    "armorName":  "Heavy Plate ",
                                                    "dr":  10,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791811892267-pb4qs-3-2q9",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Right Leg",
                                                    "rollTarget":  "6-7",
                                                    "penalty":  "-2",
                                                    "armorName":  "Heavy Plate ",
                                                    "dr":  10,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791811892267-pb4qs-4-b2h",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Left Shins",
                                                    "rollTarget":  "13-14",
                                                    "penalty":  "-2",
                                                    "armorName":  "Heavy Plate ",
                                                    "dr":  10,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791811892267-pb4qs-5-shj",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Right Shins",
                                                    "rollTarget":  "6-7",
                                                    "penalty":  "-2",
                                                    "armorName":  "Heavy Plate ",
                                                    "dr":  10,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791811892267-pb4qs-6-g8n",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Left Arm",
                                                    "rollTarget":  "12",
                                                    "penalty":  "-2",
                                                    "armorName":  "Heavy Plate ",
                                                    "dr":  10,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791811892267-pb4qs-7-quz",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Right Arm",
                                                    "rollTarget":  "8",
                                                    "penalty":  "-2",
                                                    "armorName":  "Heavy Plate ",
                                                    "dr":  10,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791811892267-pb4qs-8-8lz",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Left Forearm",
                                                    "rollTarget":  "12",
                                                    "penalty":  "-2",
                                                    "armorName":  "Heavy Plate ",
                                                    "dr":  10,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791811892267-pb4qs-9-3a5",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Right Forearm",
                                                    "rollTarget":  "8",
                                                    "penalty":  "-2",
                                                    "armorName":  "Heavy Plate ",
                                                    "dr":  10,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791811892267-pb4qs-10-rwd",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Torso",
                                                    "rollTarget":  "9-10",
                                                    "penalty":  "0",
                                                    "armorName":  "Heavy Plate ",
                                                    "dr":  10,
                                                    "notes":  "",
                                                    "additionalRule":  "",
                                                    "id":  "armor-npc-1791811892267-pb4qs-11-ply",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Groin",
                                                    "rollTarget":  "11",
                                                    "penalty":  "-3",
                                                    "armorName":  "Heavy Plate ",
                                                    "dr":  10,
                                                    "notes":  "",
                                                    "additionalRule":  "",
                                                    "id":  "armor-npc-1791811892267-pb4qs-12-xf2",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Hand",
                                                    "rollTarget":  "15",
                                                    "penalty":  "-4",
                                                    "armorName":  "Heavy Plate ",
                                                    "dr":  10,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791811892267-pb4qs-13-ccm",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Feet",
                                                    "rollTarget":  "16",
                                                    "penalty":  "-4",
                                                    "armorName":  "Heavy Plate ",
                                                    "dr":  10,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791811892267-pb4qs-14-fcx",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Neck",
                                                    "rollTarget":  "17-18",
                                                    "penalty":  "-5",
                                                    "armorName":  "Heavy Plate ",
                                                    "dr":  10,
                                                    "notes":  "",
                                                    "additionalRule":  "Contusão vira 1,5, corte vai de 1,5 para 2.0",
                                                    "id":  "armor-npc-1791811892267-pb4qs-15-zl9",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Vitals",
                                                    "rollTarget":  "-",
                                                    "penalty":  "-3",
                                                    "armorName":  "Heavy Plate ",
                                                    "dr":  10,
                                                    "notes":  "",
                                                    "additionalRule":  "Empalamento e perfuração vira x3",
                                                    "id":  "armor-npc-1791811892267-pb4qs-16-1bs",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                }
                                            ]
                          },
                          {
                              "id":  "kit-1791938229094-oowk",
                              "name":  "Mail Armor",
                              "isActive":  false,
                              "locations":  [
                                                {
                                                    "location":  "Eye",
                                                    "rollTarget":  "-",
                                                    "penalty":  "-9",
                                                    "armorName":  "",
                                                    "dr":  0,
                                                    "notes":  "",
                                                    "additionalRule":  "Só consegue acertar o olho danos de Empalamento, Perfurante ou Magia",
                                                    "id":  "armor-npc-1791811892267-pb4qs-0-lid",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Head",
                                                    "rollTarget":  "3-4",
                                                    "penalty":  "-7",
                                                    "armorName":  "Light Plate + Padding",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "Tem +2 de RD / Qualquer dano vira 4X",
                                                    "id":  "armor-npc-1791811892267-pb4qs-1-p0y",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Face",
                                                    "rollTarget":  "5",
                                                    "penalty":  "-5",
                                                    "armorName":  "",
                                                    "dr":  0,
                                                    "notes":  "",
                                                    "additionalRule":  "",
                                                    "id":  "armor-npc-1791811892267-pb4qs-2-8sd",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Left Leg",
                                                    "rollTarget":  "13-14",
                                                    "penalty":  "-2",
                                                    "armorName":  "Light Mail",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791811892267-pb4qs-3-sxu",
                                                    "drModifier":  -2,
                                                    "modifierDamageType":  "contusao",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Right Leg",
                                                    "rollTarget":  "6-7",
                                                    "penalty":  "-2",
                                                    "armorName":  "Light Mail",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791811892267-pb4qs-4-o79",
                                                    "drModifier":  -2,
                                                    "modifierDamageType":  "contusao",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Left Shins",
                                                    "rollTarget":  "13-14",
                                                    "penalty":  "-2",
                                                    "armorName":  "Light Plate",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791811892267-pb4qs-5-9ps",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Right Shins",
                                                    "rollTarget":  "6-7",
                                                    "penalty":  "-2",
                                                    "armorName":  "Light Plate",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791811892267-pb4qs-6-4d9",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Left Arm",
                                                    "rollTarget":  "12",
                                                    "penalty":  "-2",
                                                    "armorName":  "Heavy Mail",
                                                    "dr":  6,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791811892267-pb4qs-7-upf",
                                                    "drModifier":  -2,
                                                    "modifierDamageType":  "contusao",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Right Arm",
                                                    "rollTarget":  "8",
                                                    "penalty":  "-2",
                                                    "armorName":  "Heavy Mail",
                                                    "dr":  6,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791811892267-pb4qs-8-9pu",
                                                    "drModifier":  -2,
                                                    "modifierDamageType":  "contusao",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Left Forearm",
                                                    "rollTarget":  "12",
                                                    "penalty":  "-2",
                                                    "armorName":  "Light Mail",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791811892267-pb4qs-9-8m6",
                                                    "drModifier":  -2,
                                                    "modifierDamageType":  "contusao",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Right Forearm",
                                                    "rollTarget":  "8",
                                                    "penalty":  "-2",
                                                    "armorName":  "Light Mail",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791811892267-pb4qs-10-w7q",
                                                    "drModifier":  -2,
                                                    "modifierDamageType":  "contusao",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Torso",
                                                    "rollTarget":  "9-10",
                                                    "penalty":  "0",
                                                    "armorName":  "Light Mail",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "",
                                                    "id":  "armor-npc-1791811892267-pb4qs-11-xsd",
                                                    "drModifier":  -2,
                                                    "modifierDamageType":  "contusao",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Groin",
                                                    "rollTarget":  "11",
                                                    "penalty":  "-3",
                                                    "armorName":  "Light Mail",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "",
                                                    "id":  "armor-npc-1791811892267-pb4qs-12-eie",
                                                    "drModifier":  -2,
                                                    "modifierDamageType":  "contusao",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Hand",
                                                    "rollTarget":  "15",
                                                    "penalty":  "-4",
                                                    "armorName":  "Light Mail",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791811892267-pb4qs-13-89z",
                                                    "drModifier":  -2,
                                                    "modifierDamageType":  "contusao",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Feet",
                                                    "rollTarget":  "16",
                                                    "penalty":  "-4",
                                                    "armorName":  "Light Plate",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791811892267-pb4qs-14-ygu",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Neck",
                                                    "rollTarget":  "17-18",
                                                    "penalty":  "-5",
                                                    "armorName":  "Heavy Mail",
                                                    "dr":  6,
                                                    "notes":  "",
                                                    "additionalRule":  "Contusão vira 1,5, corte vai de 1,5 para 2.0",
                                                    "id":  "armor-npc-1791811892267-pb4qs-15-ccn",
                                                    "drModifier":  -2,
                                                    "modifierDamageType":  "contusao",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Vitals",
                                                    "rollTarget":  "-",
                                                    "penalty":  "-3",
                                                    "armorName":  "Light Mail",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "Empalamento e perfuração vira x3",
                                                    "id":  "armor-npc-1791811892267-pb4qs-16-5zz",
                                                    "drModifier":  -2,
                                                    "modifierDamageType":  "contusao",
                                                    "damageTaken":  0
                                                }
                                            ]
                          }
                      ],
        "basicMove":  "6 / 5",
        "equipment":  "",
        "fpCurrent":  12,
        "hpCurrent":  14,
        "naturalDr":  2,
        "updatedAt":  1791945217140,
        "advantages":  "",
        "basicSpeed":  6,
        "dodgeNotes":  "Carga 0 = 9 / Carga 1 = 8",
        "extraItems":  [
                           {
                               "id":  "item-1791812078073-yaf",
                               "max":  22,
                               "name":  "Iron Heavy Large Shield 1 (DR 5)",
                               "current":  22,
                               "category":  "shield",
                               "isFavorite":  true
                           },
                           {
                               "id":  "item-1791812078577-xn9",
                               "max":  22,
                               "name":  "Iron Heavy Large Shield 2 (DR 5)",
                               "current":  22,
                               "category":  "shield"
                           },
                           {
                               "id":  "item-1791812078860-yta",
                               "max":  18,
                               "name":  "Light Large Shield",
                               "current":  18,
                               "category":  "shield"
                           },
                           {
                               "id":  "item-1791812081569-ozo",
                               "max":  10,
                               "name":  "Bolts (Crossbow)",
                               "current":  10,
                               "category":  "arrows",
                               "isFavorite":  true
                           }
                       ],
        "playerName":  "Renato",
        "combatPerks":  "",
        "masterNotes":  "",
        "turnActions":  {
                            "notes":  "",
                            "shock":  0,
                            "blockCount":  0,
                            "dodgeCount":  0,
                            "parryCount":  0,
                            "usedRetreat":  false,
                            "fatigueAmountUsed":  0,
                            "usedBlockThisTurn":  false,
                            "usedFatigueThisTurn":  false
                        },
        "activeSpells":  [

                         ],
        "avatarPreset":  "knight",
        "combatSkills":  "",
        "characterType":  "player",
        "disadvantages":  "",
        "affectedSpells":  [

                           ],
        "armorLocations":  [
                               {
                                   "location":  "Eye",
                                   "rollTarget":  "-",
                                   "penalty":  "-9",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "Só consegue acertar o olho danos de Empalamento, Perfurante ou Magia",
                                   "id":  "armor-npc-1791811892267-pb4qs-0-9y9",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Head",
                                   "rollTarget":  "3-4",
                                   "penalty":  "-7",
                                   "armorName":  "Heavy Plate + Padding",
                                   "dr":  11,
                                   "notes":  "",
                                   "additionalRule":  "Tem +2 de RD / Qualquer dano vira 4X",
                                   "id":  "armor-npc-1791811892267-pb4qs-1-ns7",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Face",
                                   "rollTarget":  "5",
                                   "penalty":  "-5",
                                   "armorName":  "Heavy Plate se estiver fechado o Elmo",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "",
                                   "id":  "armor-npc-1791811892267-pb4qs-2-8ir",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Left Leg",
                                   "rollTarget":  "13-14",
                                   "penalty":  "-2",
                                   "armorName":  "Heavy Plate ",
                                   "dr":  10,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791811892267-pb4qs-3-2q9",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Right Leg",
                                   "rollTarget":  "6-7",
                                   "penalty":  "-2",
                                   "armorName":  "Heavy Plate ",
                                   "dr":  10,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791811892267-pb4qs-4-b2h",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Left Shins",
                                   "rollTarget":  "13-14",
                                   "penalty":  "-2",
                                   "armorName":  "Heavy Plate ",
                                   "dr":  10,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791811892267-pb4qs-5-shj",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Right Shins",
                                   "rollTarget":  "6-7",
                                   "penalty":  "-2",
                                   "armorName":  "Heavy Plate ",
                                   "dr":  10,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791811892267-pb4qs-6-g8n",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Left Arm",
                                   "rollTarget":  "12",
                                   "penalty":  "-2",
                                   "armorName":  "Heavy Plate ",
                                   "dr":  10,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791811892267-pb4qs-7-quz",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Right Arm",
                                   "rollTarget":  "8",
                                   "penalty":  "-2",
                                   "armorName":  "Heavy Plate ",
                                   "dr":  10,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791811892267-pb4qs-8-8lz",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Left Forearm",
                                   "rollTarget":  "12",
                                   "penalty":  "-2",
                                   "armorName":  "Heavy Plate ",
                                   "dr":  10,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791811892267-pb4qs-9-3a5",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Right Forearm",
                                   "rollTarget":  "8",
                                   "penalty":  "-2",
                                   "armorName":  "Heavy Plate ",
                                   "dr":  10,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791811892267-pb4qs-10-rwd",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Torso",
                                   "rollTarget":  "9-10",
                                   "penalty":  "0",
                                   "armorName":  "Heavy Plate ",
                                   "dr":  10,
                                   "notes":  "",
                                   "additionalRule":  "",
                                   "id":  "armor-npc-1791811892267-pb4qs-11-ply",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Groin",
                                   "rollTarget":  "11",
                                   "penalty":  "-3",
                                   "armorName":  "Heavy Plate ",
                                   "dr":  10,
                                   "notes":  "",
                                   "additionalRule":  "",
                                   "id":  "armor-npc-1791811892267-pb4qs-12-xf2",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Hand",
                                   "rollTarget":  "15",
                                   "penalty":  "-4",
                                   "armorName":  "Heavy Plate ",
                                   "dr":  10,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791811892267-pb4qs-13-ccm",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Feet",
                                   "rollTarget":  "16",
                                   "penalty":  "-4",
                                   "armorName":  "Heavy Plate ",
                                   "dr":  10,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791811892267-pb4qs-14-fcx",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Neck",
                                   "rollTarget":  "17-18",
                                   "penalty":  "-5",
                                   "armorName":  "Heavy Plate ",
                                   "dr":  10,
                                   "notes":  "",
                                   "additionalRule":  "Contusão vira 1,5, corte vai de 1,5 para 2.0",
                                   "id":  "armor-npc-1791811892267-pb4qs-15-zl9",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Vitals",
                                   "rollTarget":  "-",
                                   "penalty":  "-3",
                                   "armorName":  "Heavy Plate ",
                                   "dr":  10,
                                   "notes":  "",
                                   "additionalRule":  "Empalamento e perfuração vira x3",
                                   "id":  "armor-npc-1791811892267-pb4qs-16-1bs",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               }
                           ],
        "assistantNotes":  "",
        "activeArmorKitId":  "kit-1791938068550-gerw",
        "statusConditions":  [

                             ],
        "conditionMetadata":  {

                              },
        "isVisibleToPlayer":  false
    },
    {
        "dx":  11,
        "ht":  10,
        "id":  "npc-1791812994314-3r2mi",
        "iq":  14,
        "st":  10,
        "per":  11,
        "name":  "Jaher",
        "will":  12,
        "block":  0,
        "dodge":  7,
        "fpMax":  10,
        "hpMax":  10,
        "title":  "Membro de The Hounds",
        "avatar":  "https://cjjhlorfnjspikjhsanx.supabase.co/storage/v1/object/public/hounds-images/mv5b78h22o508grc.jpg",
        "height":  "",
        "isDead":  false,
        "skills":  "",
        "spells":  [

                   ],
        "weight":  "",
        "history":  [

                    ],
        "parries":  [
                        {
                            "id":  "parry-npc-1791812994314-3r2mi-1",
                            "notes":  "",
                            "value":  11,
                            "parryType":  "",
                            "weaponName":  "Rapier"
                        },
                        {
                            "id":  "parry-1791940935560-agr",
                            "weaponName":  "Main-Gauche",
                            "parryType":  "",
                            "value":  10,
                            "notes":  ""
                        }
                    ],
        "weapons":  [
                        {
                            "id":  "wpn-1791941300229-yq3d",
                            "name":  "Rapier",
                            "nh":  "DX+5",
                            "damage":  "1d",
                            "type":  "Swing",
                            "reach":  "",
                            "modes":  [
                                          {
                                              "id":  "mode-1791941245338-1",
                                              "name":  "Cut",
                                              "damage":  "1d",
                                              "type":  "Swing",
                                              "reach":  ""
                                          },
                                          {
                                              "id":  "mode-1791941247668-o3hi",
                                              "name":  "Impaling",
                                              "damage":  "1d-1",
                                              "type":  "Thrust",
                                              "reach":  ""
                                          }
                                      ],
                            "notes":  ""
                        },
                        {
                            "id":  "wpn-1791941365039-alx8",
                            "name":  "Main-Gauche",
                            "nh":  "DX+3",
                            "damage":  "1d-2",
                            "type":  "Swing",
                            "reach":  "",
                            "modes":  [
                                          {
                                              "id":  "mode-1791941304897-1",
                                              "name":  "Cut",
                                              "damage":  "1d-2",
                                              "type":  "Swing",
                                              "reach":  ""
                                          },
                                          {
                                              "id":  "mode-1791941337526-elvk",
                                              "name":  "Impaling",
                                              "damage":  "1d-1",
                                              "type":  "Thrust",
                                              "reach":  ""
                                          }
                                      ],
                            "notes":  ""
                        },
                        {
                            "id":  "wpn-1791941429658-kcgx",
                            "name":  "Crossbow (ST 13)",
                            "nh":  "DX",
                            "damage":  "2d",
                            "type":  "Thrust",
                            "reach":  "",
                            "modes":  [
                                          {
                                              "id":  "mode-1791941389514-1",
                                              "name":  "Impaling",
                                              "damage":  "2d",
                                              "type":  "Thrust",
                                              "reach":  ""
                                          }
                                      ],
                            "notes":  ""
                        },
                        {
                            "id":  "wpn-1791941459581-ke4d",
                            "name":  "Crossbow (ST 20)",
                            "nh":  "DX",
                            "damage":  "3d",
                            "type":  "Thrust",
                            "reach":  "",
                            "modes":  [
                                          {
                                              "id":  "mode-1791941431986-1",
                                              "name":  "Impaling",
                                              "damage":  "3d",
                                              "type":  "Thrust",
                                              "reach":  ""
                                          }
                                      ],
                            "notes":  ""
                        }
                    ],
        "armorKits":  [

                      ],
        "basicMove":  "4 (-1 Peso)",
        "equipment":  "",
        "fpCurrent":  10,
        "hpCurrent":  10,
        "naturalDr":  0,
        "updatedAt":  1791945217140,
        "advantages":  "",
        "basicSpeed":  5.25,
        "dodgeNotes":  "Carga 0 = 8 / Carga 1 = 7",
        "extraItems":  [
                           {
                               "id":  "item-1791941020089-hac",
                               "name":  "Colar Passe",
                               "category":  "mana",
                               "current":  10,
                               "max":  10,
                               "isFavorite":  true
                           },
                           {
                               "id":  "item-1791941020545-2mm",
                               "name":  "Pedra de Mana Ônix ",
                               "category":  "mana",
                               "current":  10,
                               "max":  10,
                               "isFavorite":  true
                           },
                           {
                               "id":  "item-1791941020853-41s",
                               "name":  "Colar de Safiras 1",
                               "category":  "mana",
                               "current":  10,
                               "max":  10,
                               "isFavorite":  true
                           },
                           {
                               "id":  "item-1791941021305-j4x",
                               "name":  "Colar de Safiras 2",
                               "category":  "mana",
                               "current":  10,
                               "max":  10,
                               "isFavorite":  true
                           },
                           {
                               "id":  "item-1791941026271-y4h",
                               "name":  "Colar de Safira",
                               "category":  "mana",
                               "current":  15,
                               "max":  15,
                               "isFavorite":  true
                           }
                       ],
        "playerName":  "Igor",
        "combatPerks":  "",
        "masterNotes":  "",
        "turnActions":  {
                            "notes":  "",
                            "shock":  0,
                            "blockCount":  0,
                            "dodgeCount":  0,
                            "parryCount":  0,
                            "usedRetreat":  false,
                            "fatigueAmountUsed":  0,
                            "usedBlockThisTurn":  false,
                            "usedFatigueThisTurn":  false
                        },
        "avatarPreset":  "knight",
        "combatSkills":  "",
        "characterType":  "player",
        "disadvantages":  "",
        "armorLocations":  [
                               {
                                   "dr":  0,
                                   "id":  "armor-npc-1791812994314-3r2mi-0",
                                   "notes":  "",
                                   "penalty":  "-9",
                                   "location":  "Eye",
                                   "armorName":  "",
                                   "rollTarget":  "—",
                                   "gurpsNotesRef":  "[1, 2]"
                               },
                               {
                                   "dr":  0,
                                   "id":  "armor-npc-1791812994314-3r2mi-1",
                                   "notes":  "",
                                   "penalty":  "-7",
                                   "location":  "Skull",
                                   "armorName":  "",
                                   "rollTarget":  "3-4",
                                   "damageTaken":  0,
                                   "gurpsNotesRef":  "[1, 3]"
                               },
                               {
                                   "dr":  0,
                                   "id":  "armor-npc-1791812994314-3r2mi-2",
                                   "notes":  "",
                                   "penalty":  "-5",
                                   "location":  "Face",
                                   "armorName":  "",
                                   "rollTarget":  "5",
                                   "gurpsNotesRef":  "[1, 4]"
                               },
                               {
                                   "dr":  0,
                                   "id":  "armor-npc-1791812994314-3r2mi-3",
                                   "notes":  "",
                                   "penalty":  "-2",
                                   "location":  "Right Leg",
                                   "armorName":  "",
                                   "rollTarget":  "6-7",
                                   "gurpsNotesRef":  "[5]"
                               },
                               {
                                   "dr":  0,
                                   "id":  "armor-npc-1791812994314-3r2mi-4",
                                   "notes":  "",
                                   "penalty":  "-2",
                                   "location":  "Right Arm",
                                   "armorName":  "",
                                   "rollTarget":  "8",
                                   "gurpsNotesRef":  "[5, 6]"
                               },
                               {
                                   "dr":  0,
                                   "id":  "armor-npc-1791812994314-3r2mi-5",
                                   "notes":  "",
                                   "penalty":  "0",
                                   "location":  "Torso",
                                   "armorName":  "",
                                   "rollTarget":  "9-10",
                                   "gurpsNotesRef":  ""
                               },
                               {
                                   "dr":  0,
                                   "id":  "armor-npc-1791812994314-3r2mi-6",
                                   "notes":  "",
                                   "penalty":  "-3",
                                   "location":  "Groin",
                                   "armorName":  "",
                                   "rollTarget":  "11",
                                   "gurpsNotesRef":  "[1, 7]"
                               },
                               {
                                   "dr":  0,
                                   "id":  "armor-npc-1791812994314-3r2mi-7",
                                   "notes":  "",
                                   "penalty":  "-2",
                                   "location":  "Left Arm",
                                   "armorName":  "",
                                   "rollTarget":  "12",
                                   "gurpsNotesRef":  "[5, 6]"
                               },
                               {
                                   "dr":  0,
                                   "id":  "armor-npc-1791812994314-3r2mi-8",
                                   "notes":  "",
                                   "penalty":  "-2",
                                   "location":  "Left Leg",
                                   "armorName":  "",
                                   "rollTarget":  "13-14",
                                   "gurpsNotesRef":  "[5]"
                               },
                               {
                                   "dr":  0,
                                   "id":  "armor-npc-1791812994314-3r2mi-9",
                                   "notes":  "",
                                   "penalty":  "-4",
                                   "location":  "Hand",
                                   "armorName":  "",
                                   "rollTarget":  "15",
                                   "gurpsNotesRef":  "[6, 8, 9]"
                               },
                               {
                                   "dr":  0,
                                   "id":  "armor-npc-1791812994314-3r2mi-10",
                                   "notes":  "",
                                   "penalty":  "-4",
                                   "location":  "Foot",
                                   "armorName":  "",
                                   "rollTarget":  "16",
                                   "gurpsNotesRef":  "[8, 9]"
                               },
                               {
                                   "dr":  0,
                                   "id":  "armor-npc-1791812994314-3r2mi-11",
                                   "notes":  "",
                                   "penalty":  "-5",
                                   "location":  "Neck",
                                   "armorName":  "",
                                   "rollTarget":  "17-18",
                                   "gurpsNotesRef":  "[1, 10]"
                               },
                               {
                                   "dr":  0,
                                   "id":  "armor-npc-1791812994314-3r2mi-12",
                                   "notes":  "",
                                   "penalty":  "-3",
                                   "location":  "Vitals",
                                   "armorName":  "",
                                   "rollTarget":  "—",
                                   "gurpsNotesRef":  "[1, 11]"
                               }
                           ],
        "assistantNotes":  "",
        "statusConditions":  [

                             ],
        "isVisibleToPlayer":  false,
        "conditionMetadata":  {

                              }
    },
    {
        "id":  "npc-1791942567682-duoaf",
        "name":  "Tuck",
        "title":  "Membro de The Hounds",
        "weight":  "",
        "height":  "",
        "avatar":  "",
        "avatarPreset":  "knight",
        "isVisibleToPlayer":  false,
        "isDead":  false,
        "hpCurrent":  9,
        "hpMax":  9,
        "fpCurrent":  10,
        "fpMax":  10,
        "statusConditions":  [

                             ],
        "turnActions":  {
                            "parryCount":  0,
                            "dodgeCount":  0,
                            "blockCount":  0,
                            "usedRetreat":  false,
                            "usedBlockThisTurn":  false,
                            "shock":  0,
                            "usedFatigueThisTurn":  false,
                            "fatigueAmountUsed":  0,
                            "notes":  ""
                        },
        "st":  9,
        "dx":  11,
        "iq":  14,
        "ht":  10,
        "per":  11,
        "will":  11,
        "basicSpeed":  5.25,
        "basicMove":  "4",
        "naturalDr":  0,
        "parries":  [
                        {
                            "id":  "parry-npc-1791942567682-duoaf-1",
                            "weaponName":  "Quarterstaff",
                            "parryType":  "",
                            "value":  12,
                            "notes":  ""
                        }
                    ],
        "dodge":  7,
        "block":  0,
        "weapons":  [
                        {
                            "id":  "wpn-1791942742918-laqx",
                            "name":  "Quarterstaff",
                            "nh":  "DX+3",
                            "damage":  "1d+1",
                            "type":  "Swing",
                            "reach":  "1",
                            "modes":  [
                                          {
                                              "id":  "mode-1791942696964-1",
                                              "name":  "Crushing",
                                              "damage":  "1d+1",
                                              "type":  "Swing",
                                              "reach":  "1"
                                          },
                                          {
                                              "id":  "mode-1791942699530-obgy",
                                              "name":  "Crushing",
                                              "damage":  "1d",
                                              "type":  "Thrust",
                                              "reach":  "2"
                                          }
                                      ],
                            "notes":  ""
                        }
                    ],
        "spells":  [

                   ],
        "armorLocations":  [
                               {
                                   "location":  "Eye",
                                   "rollTarget":  "-",
                                   "penalty":  "-9",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "Só consegue acertar o olho danos de Empalamento, Perfurante ou Magia",
                                   "id":  "armor-npc-1791942567682-duoaf-0",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Head",
                                   "rollTarget":  "3-4",
                                   "penalty":  "-7",
                                   "armorName":  "Light Layered Cloth",
                                   "dr":  3,
                                   "notes":  "",
                                   "additionalRule":  "Tem +2 de RD / Qualquer dano vira 4X",
                                   "id":  "armor-npc-1791942567682-duoaf-1",
                                   "drModifier":  1,
                                   "modifierDamageType":  "corte",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Face",
                                   "rollTarget":  "5",
                                   "penalty":  "-5",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "",
                                   "id":  "armor-npc-1791942567682-duoaf-2",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Left Leg",
                                   "rollTarget":  "13-14",
                                   "penalty":  "-2",
                                   "armorName":  "Light Layered Cloth",
                                   "dr":  3,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791942567682-duoaf-3",
                                   "drModifier":  1,
                                   "modifierDamageType":  "corte",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Right Leg",
                                   "rollTarget":  "6-7",
                                   "penalty":  "-2",
                                   "armorName":  "Light Layered Cloth",
                                   "dr":  3,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791942567682-duoaf-4",
                                   "drModifier":  1,
                                   "modifierDamageType":  "corte",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Left Shins",
                                   "rollTarget":  "13-14",
                                   "penalty":  "-2",
                                   "armorName":  "Light Layered Cloth",
                                   "dr":  3,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791942567682-duoaf-5",
                                   "drModifier":  1,
                                   "modifierDamageType":  "corte",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Right Shins",
                                   "rollTarget":  "6-7",
                                   "penalty":  "-2",
                                   "armorName":  "Light Layered Cloth",
                                   "dr":  3,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791942567682-duoaf-6",
                                   "drModifier":  1,
                                   "modifierDamageType":  "corte",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Left Arm",
                                   "rollTarget":  "12",
                                   "penalty":  "-2",
                                   "armorName":  "Light Layered Cloth",
                                   "dr":  3,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791942567682-duoaf-7",
                                   "drModifier":  1,
                                   "modifierDamageType":  "corte",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Right Arm",
                                   "rollTarget":  "8",
                                   "penalty":  "-2",
                                   "armorName":  "Light Layered Cloth",
                                   "dr":  3,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791942567682-duoaf-8",
                                   "drModifier":  1,
                                   "modifierDamageType":  "corte",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Left Forearm",
                                   "rollTarget":  "12",
                                   "penalty":  "-2",
                                   "armorName":  "Light Layered Cloth",
                                   "dr":  3,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791942567682-duoaf-9",
                                   "drModifier":  1,
                                   "modifierDamageType":  "corte",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Right Forearm",
                                   "rollTarget":  "8",
                                   "penalty":  "-2",
                                   "armorName":  "Light Layered Cloth",
                                   "dr":  3,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791942567682-duoaf-10",
                                   "drModifier":  1,
                                   "modifierDamageType":  "corte",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Torso",
                                   "rollTarget":  "9-10",
                                   "penalty":  "0",
                                   "armorName":  "Light Layered Cloth",
                                   "dr":  3,
                                   "notes":  "",
                                   "additionalRule":  "",
                                   "id":  "armor-npc-1791942567682-duoaf-11",
                                   "drModifier":  1,
                                   "modifierDamageType":  "corte",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Groin",
                                   "rollTarget":  "11",
                                   "penalty":  "-3",
                                   "armorName":  "Light Layered Cloth",
                                   "dr":  3,
                                   "notes":  "",
                                   "additionalRule":  "",
                                   "id":  "armor-npc-1791942567682-duoaf-12",
                                   "drModifier":  1,
                                   "modifierDamageType":  "corte",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Hand",
                                   "rollTarget":  "15",
                                   "penalty":  "-4",
                                   "armorName":  "Light Layered Cloth",
                                   "dr":  3,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791942567682-duoaf-13",
                                   "drModifier":  1,
                                   "modifierDamageType":  "corte",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Feet",
                                   "rollTarget":  "16",
                                   "penalty":  "-4",
                                   "armorName":  "Somente na sola",
                                   "dr":  1,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791942567682-duoaf-14",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Neck",
                                   "rollTarget":  "17-18",
                                   "penalty":  "-5",
                                   "armorName":  "Light Layered Cloth",
                                   "dr":  3,
                                   "notes":  "",
                                   "additionalRule":  "Contusão vira 1,5, corte vai de 1,5 para 2.0",
                                   "id":  "armor-npc-1791942567682-duoaf-15",
                                   "drModifier":  1,
                                   "modifierDamageType":  "corte",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Vitals",
                                   "rollTarget":  "-",
                                   "penalty":  "-3",
                                   "armorName":  "Light Layered Cloth",
                                   "dr":  3,
                                   "notes":  "",
                                   "additionalRule":  "Empalamento e perfuração vira x3",
                                   "id":  "armor-npc-1791942567682-duoaf-16",
                                   "drModifier":  1,
                                   "modifierDamageType":  "corte",
                                   "damageTaken":  0
                               }
                           ],
        "advantages":  "",
        "disadvantages":  "",
        "skills":  "",
        "combatSkills":  "",
        "combatPerks":  "",
        "equipment":  "",
        "masterNotes":  "",
        "assistantNotes":  "",
        "history":  [

                    ],
        "characterType":  "player",
        "playerName":  "Willian",
        "extraItems":  [
                           {
                               "id":  "item-1791942990087-0gl",
                               "name":  "Fadiga Extra Mágica\t",
                               "category":  "mana",
                               "current":  2,
                               "max":  2
                           },
                           {
                               "id":  "item-1791942991254-mcw",
                               "name":  "Totem do Protegido",
                               "category":  "mana",
                               "current":  11,
                               "max":  11
                           }
                       ],
        "updatedAt":  1791945217140,
        "dodgeNotes":  "(-1 Peso)",
        "armorKits":  [
                          {
                              "id":  "kit-npc-1791942567682-duoaf-1",
                              "name":  "Kit Principal",
                              "isActive":  true,
                              "locations":  [
                                                {
                                                    "location":  "Eye",
                                                    "rollTarget":  "-",
                                                    "penalty":  "-9",
                                                    "armorName":  "",
                                                    "dr":  0,
                                                    "notes":  "",
                                                    "additionalRule":  "Só consegue acertar o olho danos de Empalamento, Perfurante ou Magia",
                                                    "id":  "armor-npc-1791942567682-duoaf-0",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Head",
                                                    "rollTarget":  "3-4",
                                                    "penalty":  "-7",
                                                    "armorName":  "Light Layered Cloth",
                                                    "dr":  3,
                                                    "notes":  "",
                                                    "additionalRule":  "Tem +2 de RD / Qualquer dano vira 4X",
                                                    "id":  "armor-npc-1791942567682-duoaf-1",
                                                    "drModifier":  1,
                                                    "modifierDamageType":  "corte",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Face",
                                                    "rollTarget":  "5",
                                                    "penalty":  "-5",
                                                    "armorName":  "",
                                                    "dr":  0,
                                                    "notes":  "",
                                                    "additionalRule":  "",
                                                    "id":  "armor-npc-1791942567682-duoaf-2",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Left Leg",
                                                    "rollTarget":  "13-14",
                                                    "penalty":  "-2",
                                                    "armorName":  "Light Layered Cloth",
                                                    "dr":  3,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791942567682-duoaf-3",
                                                    "drModifier":  1,
                                                    "modifierDamageType":  "corte",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Right Leg",
                                                    "rollTarget":  "6-7",
                                                    "penalty":  "-2",
                                                    "armorName":  "Light Layered Cloth",
                                                    "dr":  3,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791942567682-duoaf-4",
                                                    "drModifier":  1,
                                                    "modifierDamageType":  "corte",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Left Shins",
                                                    "rollTarget":  "13-14",
                                                    "penalty":  "-2",
                                                    "armorName":  "Light Layered Cloth",
                                                    "dr":  3,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791942567682-duoaf-5",
                                                    "drModifier":  1,
                                                    "modifierDamageType":  "corte",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Right Shins",
                                                    "rollTarget":  "6-7",
                                                    "penalty":  "-2",
                                                    "armorName":  "Light Layered Cloth",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791942567682-duoaf-6",
                                                    "drModifier":  1,
                                                    "modifierDamageType":  "corte",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Left Arm",
                                                    "rollTarget":  "12",
                                                    "penalty":  "-2",
                                                    "armorName":  "Light Layered Cloth",
                                                    "dr":  3,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791942567682-duoaf-7",
                                                    "drModifier":  1,
                                                    "modifierDamageType":  "corte",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Right Arm",
                                                    "rollTarget":  "8",
                                                    "penalty":  "-2",
                                                    "armorName":  "Light Layered Cloth",
                                                    "dr":  3,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791942567682-duoaf-8",
                                                    "drModifier":  1,
                                                    "modifierDamageType":  "corte",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Left Forearm",
                                                    "rollTarget":  "12",
                                                    "penalty":  "-2",
                                                    "armorName":  "Light Layered Cloth",
                                                    "dr":  3,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791942567682-duoaf-9",
                                                    "drModifier":  1,
                                                    "modifierDamageType":  "corte",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Right Forearm",
                                                    "rollTarget":  "8",
                                                    "penalty":  "-2",
                                                    "armorName":  "Light Layered Cloth",
                                                    "dr":  3,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791942567682-duoaf-10",
                                                    "drModifier":  1,
                                                    "modifierDamageType":  "corte",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Torso",
                                                    "rollTarget":  "9-10",
                                                    "penalty":  "0",
                                                    "armorName":  "Light Layered Cloth",
                                                    "dr":  3,
                                                    "notes":  "",
                                                    "additionalRule":  "",
                                                    "id":  "armor-npc-1791942567682-duoaf-11",
                                                    "drModifier":  1,
                                                    "modifierDamageType":  "corte",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Groin",
                                                    "rollTarget":  "11",
                                                    "penalty":  "-3",
                                                    "armorName":  "Light Layered Cloth",
                                                    "dr":  3,
                                                    "notes":  "",
                                                    "additionalRule":  "",
                                                    "id":  "armor-npc-1791942567682-duoaf-12",
                                                    "drModifier":  1,
                                                    "modifierDamageType":  "corte",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Hand",
                                                    "rollTarget":  "15",
                                                    "penalty":  "-4",
                                                    "armorName":  "Light Layered Cloth",
                                                    "dr":  3,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791942567682-duoaf-13",
                                                    "drModifier":  1,
                                                    "modifierDamageType":  "corte",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Feet",
                                                    "rollTarget":  "16",
                                                    "penalty":  "-4",
                                                    "armorName":  "Somente na sola",
                                                    "dr":  1,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791942567682-duoaf-14",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Neck",
                                                    "rollTarget":  "17-18",
                                                    "penalty":  "-5",
                                                    "armorName":  "Light Layered Cloth",
                                                    "dr":  3,
                                                    "notes":  "",
                                                    "additionalRule":  "Contusão vira 1,5, corte vai de 1,5 para 2.0",
                                                    "id":  "armor-npc-1791942567682-duoaf-15",
                                                    "drModifier":  1,
                                                    "modifierDamageType":  "corte",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Vitals",
                                                    "rollTarget":  "-",
                                                    "penalty":  "-3",
                                                    "armorName":  "Light Layered Cloth",
                                                    "dr":  3,
                                                    "notes":  "",
                                                    "additionalRule":  "Empalamento e perfuração vira x3",
                                                    "id":  "armor-npc-1791942567682-duoaf-16",
                                                    "drModifier":  1,
                                                    "modifierDamageType":  "corte",
                                                    "damageTaken":  0
                                                }
                                            ]
                          }
                      ]
    },
    {
        "id":  "npc-1791943052637-2lvgl",
        "name":  "Vecna",
        "title":  "Membro de The Hounds",
        "weight":  "",
        "height":  "",
        "avatar":  "",
        "avatarPreset":  "knight",
        "isVisibleToPlayer":  false,
        "isDead":  false,
        "hpCurrent":  14,
        "hpMax":  14,
        "fpCurrent":  12,
        "fpMax":  12,
        "statusConditions":  [

                             ],
        "turnActions":  {
                            "parryCount":  0,
                            "dodgeCount":  0,
                            "blockCount":  0,
                            "usedRetreat":  false,
                            "usedBlockThisTurn":  false,
                            "shock":  0,
                            "usedFatigueThisTurn":  false,
                            "fatigueAmountUsed":  0,
                            "notes":  ""
                        },
        "st":  13,
        "dx":  12,
        "iq":  10,
        "ht":  12,
        "per":  13,
        "will":  10,
        "basicSpeed":  6,
        "basicMove":  "6",
        "naturalDr":  0,
        "parries":  [
                        {
                            "id":  "parry-npc-1791943052637-2lvgl-1",
                            "weaponName":  "Long Knife",
                            "parryType":  "",
                            "value":  11,
                            "notes":  ""
                        }
                    ],
        "dodge":  10,
        "block":  0,
        "weapons":  [
                        {
                            "id":  "wpn-1791943294784-eipa",
                            "name":  "Reflex Bow",
                            "nh":  "DX+5",
                            "damage":  "3d",
                            "type":  "Thrust",
                            "reach":  "",
                            "modes":  [
                                          {
                                              "id":  "mode-1791943265893-1",
                                              "name":  "Impale",
                                              "damage":  "3d",
                                              "type":  "Thrust",
                                              "reach":  ""
                                          }
                                      ],
                            "notes":  ""
                        },
                        {
                            "id":  "wpn-1791943357790-kdhc",
                            "name":  "Long Knife",
                            "nh":  "DX+3",
                            "damage":  "2d-2*",
                            "type":  "Swing",
                            "reach":  "",
                            "modes":  [
                                          {
                                              "id":  "mode-1791943297981-1",
                                              "name":  "Cut",
                                              "damage":  "2d-2*",
                                              "type":  "Swing",
                                              "reach":  ""
                                          },
                                          {
                                              "id":  "mode-1791943308387-e8s4",
                                              "name":  "Impale",
                                              "damage":  "1d*",
                                              "type":  "Thrust",
                                              "reach":  ""
                                          }
                                      ],
                            "notes":  "*Com a mão direita, os danos ficam 2d+1 cut e 1d+1 imp."
                        },
                        {
                            "id":  "wpn-1791943406621-ht65",
                            "name":  "Soco",
                            "nh":  "DX",
                            "damage":  "1d-1",
                            "type":  "Thrust",
                            "reach":  "",
                            "modes":  [
                                          {
                                              "id":  "mode-1791943366659-1",
                                              "name":  "Crushing",
                                              "damage":  "1d-1",
                                              "type":  "Thrust",
                                              "reach":  ""
                                          }
                                      ],
                            "notes":  "Com a mão direita, o dano fica 1d."
                        }
                    ],
        "spells":  [

                   ],
        "armorLocations":  [
                               {
                                   "location":  "Eye",
                                   "rollTarget":  "-",
                                   "penalty":  "-9",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "Só consegue acertar o olho danos de Empalamento, Perfurante ou Magia",
                                   "id":  "armor-npc-1791943052637-2lvgl-0",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Head",
                                   "rollTarget":  "3-4",
                                   "penalty":  "-7",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "Tem +2 de RD / Qualquer dano vira 4X",
                                   "id":  "armor-npc-1791943052637-2lvgl-1",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Face",
                                   "rollTarget":  "5",
                                   "penalty":  "-5",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "",
                                   "id":  "armor-npc-1791943052637-2lvgl-2",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Left Leg",
                                   "rollTarget":  "13-14",
                                   "penalty":  "-2",
                                   "armorName":  "Light Plate",
                                   "dr":  4,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791943052637-2lvgl-3",
                                   "drModifier":  1,
                                   "modifierDamageType":  "corte",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Right Leg",
                                   "rollTarget":  "6-7",
                                   "penalty":  "-2",
                                   "armorName":  "Light Plate",
                                   "dr":  4,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791943052637-2lvgl-4",
                                   "drModifier":  1,
                                   "modifierDamageType":  "corte",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Left Shins",
                                   "rollTarget":  "13-14",
                                   "penalty":  "-2",
                                   "armorName":  "Light Plate",
                                   "dr":  4,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791943052637-2lvgl-5",
                                   "drModifier":  1,
                                   "modifierDamageType":  "corte",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Right Shins",
                                   "rollTarget":  "6-7",
                                   "penalty":  "-2",
                                   "armorName":  "Light Plate",
                                   "dr":  4,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791943052637-2lvgl-6",
                                   "drModifier":  1,
                                   "modifierDamageType":  "corte",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Left Arm",
                                   "rollTarget":  "12",
                                   "penalty":  "-2",
                                   "armorName":  "Light Plate",
                                   "dr":  4,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791943052637-2lvgl-7",
                                   "drModifier":  1,
                                   "modifierDamageType":  "corte",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Right Arm",
                                   "rollTarget":  "8",
                                   "penalty":  "-2",
                                   "armorName":  "Light Plate",
                                   "dr":  4,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791943052637-2lvgl-8",
                                   "drModifier":  1,
                                   "modifierDamageType":  "corte",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Left Forearm",
                                   "rollTarget":  "12",
                                   "penalty":  "-2",
                                   "armorName":  "Light Plate",
                                   "dr":  4,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791943052637-2lvgl-9",
                                   "drModifier":  1,
                                   "modifierDamageType":  "corte",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Right Forearm",
                                   "rollTarget":  "8",
                                   "penalty":  "-2",
                                   "armorName":  "Light Plate",
                                   "dr":  4,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791943052637-2lvgl-10",
                                   "drModifier":  1,
                                   "modifierDamageType":  "corte",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Torso",
                                   "rollTarget":  "9-10",
                                   "penalty":  "0",
                                   "armorName":  "Light Plate",
                                   "dr":  4,
                                   "notes":  "",
                                   "additionalRule":  "",
                                   "id":  "armor-npc-1791943052637-2lvgl-11",
                                   "drModifier":  1,
                                   "modifierDamageType":  "corte",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Groin",
                                   "rollTarget":  "11",
                                   "penalty":  "-3",
                                   "armorName":  "Light Plate",
                                   "dr":  4,
                                   "notes":  "",
                                   "additionalRule":  "",
                                   "id":  "armor-npc-1791943052637-2lvgl-12",
                                   "drModifier":  1,
                                   "modifierDamageType":  "corte",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Hand",
                                   "rollTarget":  "15",
                                   "penalty":  "-4",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791943052637-2lvgl-13",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Feet",
                                   "rollTarget":  "16",
                                   "penalty":  "-4",
                                   "armorName":  "Light Layered Leather",
                                   "dr":  4,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791943052637-2lvgl-14",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Neck",
                                   "rollTarget":  "17-18",
                                   "penalty":  "-5",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "Contusão vira 1,5, corte vai de 1,5 para 2.0",
                                   "id":  "armor-npc-1791943052637-2lvgl-15",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Vitals",
                                   "rollTarget":  "-",
                                   "penalty":  "-3",
                                   "armorName":  "Light Plate",
                                   "dr":  4,
                                   "notes":  "",
                                   "additionalRule":  "Empalamento e perfuração vira x3",
                                   "id":  "armor-npc-1791943052637-2lvgl-16",
                                   "drModifier":  1,
                                   "modifierDamageType":  "corte",
                                   "damageTaken":  0
                               }
                           ],
        "advantages":  "",
        "disadvantages":  "",
        "skills":  "",
        "combatSkills":  "",
        "combatPerks":  "",
        "equipment":  "",
        "masterNotes":  "",
        "assistantNotes":  "",
        "history":  [

                    ],
        "characterType":  "player",
        "playerName":  "Rato",
        "extraItems":  [
                           {
                               "id":  "item-1791943493813-hfy",
                               "name":  "Flechas Equipadas",
                               "category":  "arrows",
                               "current":  15,
                               "max":  15,
                               "isFavorite":  true
                           },
                           {
                               "id":  "item-1791943494269-5ci",
                               "name":  "Flechas Backpack",
                               "category":  "arrows",
                               "current":  7,
                               "max":  7
                           }
                       ],
        "updatedAt":  1791945217140,
        "armorKits":  [
                          {
                              "id":  "kit-npc-1791943052637-2lvgl-1",
                              "name":  "Kit Principal",
                              "isActive":  true,
                              "locations":  [
                                                {
                                                    "location":  "Eye",
                                                    "rollTarget":  "-",
                                                    "penalty":  "-9",
                                                    "armorName":  "",
                                                    "dr":  0,
                                                    "notes":  "",
                                                    "additionalRule":  "Só consegue acertar o olho danos de Empalamento, Perfurante ou Magia",
                                                    "id":  "armor-npc-1791943052637-2lvgl-0",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Head",
                                                    "rollTarget":  "3-4",
                                                    "penalty":  "-7",
                                                    "armorName":  "",
                                                    "dr":  0,
                                                    "notes":  "",
                                                    "additionalRule":  "Tem +2 de RD / Qualquer dano vira 4X",
                                                    "id":  "armor-npc-1791943052637-2lvgl-1",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Face",
                                                    "rollTarget":  "5",
                                                    "penalty":  "-5",
                                                    "armorName":  "",
                                                    "dr":  0,
                                                    "notes":  "",
                                                    "additionalRule":  "",
                                                    "id":  "armor-npc-1791943052637-2lvgl-2",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Left Leg",
                                                    "rollTarget":  "13-14",
                                                    "penalty":  "-2",
                                                    "armorName":  "Light Plate",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791943052637-2lvgl-3",
                                                    "drModifier":  1,
                                                    "modifierDamageType":  "corte",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Right Leg",
                                                    "rollTarget":  "6-7",
                                                    "penalty":  "-2",
                                                    "armorName":  "Light Plate",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791943052637-2lvgl-4",
                                                    "drModifier":  1,
                                                    "modifierDamageType":  "corte",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Left Shins",
                                                    "rollTarget":  "13-14",
                                                    "penalty":  "-2",
                                                    "armorName":  "Light Plate",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791943052637-2lvgl-5",
                                                    "drModifier":  1,
                                                    "modifierDamageType":  "corte",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Right Shins",
                                                    "rollTarget":  "6-7",
                                                    "penalty":  "-2",
                                                    "armorName":  "Light Plate",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791943052637-2lvgl-6",
                                                    "drModifier":  1,
                                                    "modifierDamageType":  "corte",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Left Arm",
                                                    "rollTarget":  "12",
                                                    "penalty":  "-2",
                                                    "armorName":  "Light Plate",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791943052637-2lvgl-7",
                                                    "drModifier":  1,
                                                    "modifierDamageType":  "corte",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Right Arm",
                                                    "rollTarget":  "8",
                                                    "penalty":  "-2",
                                                    "armorName":  "Light Plate",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791943052637-2lvgl-8",
                                                    "drModifier":  1,
                                                    "modifierDamageType":  "corte",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Left Forearm",
                                                    "rollTarget":  "12",
                                                    "penalty":  "-2",
                                                    "armorName":  "Light Plate",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791943052637-2lvgl-9",
                                                    "drModifier":  1,
                                                    "modifierDamageType":  "corte",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Right Forearm",
                                                    "rollTarget":  "8",
                                                    "penalty":  "-2",
                                                    "armorName":  "Light Plate",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791943052637-2lvgl-10",
                                                    "drModifier":  1,
                                                    "modifierDamageType":  "corte",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Torso",
                                                    "rollTarget":  "9-10",
                                                    "penalty":  "0",
                                                    "armorName":  "Light Plate",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "",
                                                    "id":  "armor-npc-1791943052637-2lvgl-11",
                                                    "drModifier":  1,
                                                    "modifierDamageType":  "corte",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Groin",
                                                    "rollTarget":  "11",
                                                    "penalty":  "-3",
                                                    "armorName":  "Light Plate",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "",
                                                    "id":  "armor-npc-1791943052637-2lvgl-12",
                                                    "drModifier":  1,
                                                    "modifierDamageType":  "corte",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Hand",
                                                    "rollTarget":  "15",
                                                    "penalty":  "-4",
                                                    "armorName":  "",
                                                    "dr":  0,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791943052637-2lvgl-13",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Feet",
                                                    "rollTarget":  "16",
                                                    "penalty":  "-4",
                                                    "armorName":  "Light Layered Leather",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791943052637-2lvgl-14",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Neck",
                                                    "rollTarget":  "17-18",
                                                    "penalty":  "-5",
                                                    "armorName":  "",
                                                    "dr":  0,
                                                    "notes":  "",
                                                    "additionalRule":  "Contusão vira 1,5, corte vai de 1,5 para 2.0",
                                                    "id":  "armor-npc-1791943052637-2lvgl-15",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Vitals",
                                                    "rollTarget":  "-",
                                                    "penalty":  "-3",
                                                    "armorName":  "Light Plate",
                                                    "dr":  4,
                                                    "notes":  "",
                                                    "additionalRule":  "Empalamento e perfuração vira x3",
                                                    "id":  "armor-npc-1791943052637-2lvgl-16",
                                                    "drModifier":  1,
                                                    "modifierDamageType":  "corte",
                                                    "damageTaken":  0
                                                }
                                            ]
                          }
                      ]
    },
    {
        "id":  "npc-1791943809458-8np7c",
        "name":  "Khor",
        "title":  "Membro de The Hounds",
        "weight":  "",
        "height":  "",
        "avatar":  "",
        "avatarPreset":  "knight",
        "isVisibleToPlayer":  false,
        "isDead":  false,
        "hpCurrent":  11,
        "hpMax":  11,
        "fpCurrent":  12,
        "fpMax":  12,
        "statusConditions":  [

                             ],
        "turnActions":  {
                            "parryCount":  0,
                            "dodgeCount":  0,
                            "blockCount":  0,
                            "usedRetreat":  false,
                            "usedBlockThisTurn":  false,
                            "shock":  0,
                            "usedFatigueThisTurn":  false,
                            "fatigueAmountUsed":  0,
                            "notes":  ""
                        },
        "st":  11,
        "dx":  12,
        "iq":  11,
        "ht":  12,
        "per":  14,
        "will":  10,
        "basicSpeed":  6,
        "basicMove":  "5 (-1 Peso)",
        "naturalDr":  0,
        "parries":  [
                        {
                            "id":  "parry-npc-1791943809458-8np7c-1",
                            "weaponName":  "Spear",
                            "parryType":  "",
                            "value":  11,
                            "notes":  "Escudo +2"
                        },
                        {
                            "id":  "parry-1791944012022-lmh",
                            "weaponName":  "Shortsword",
                            "parryType":  "",
                            "value":  10,
                            "notes":  "Escudo +2"
                        }
                    ],
        "dodge":  9,
        "block":  10,
        "weapons":  [
                        {
                            "id":  "wpn-1791944261079-jozx",
                            "name":  "Long Spear (1 hand)",
                            "nh":  "DX+5",
                            "damage":  "1d+1",
                            "type":  "Thrust",
                            "reach":  "",
                            "modes":  [
                                          {
                                              "id":  "mode-1791944198618-1",
                                              "name":  "Armour-pierc",
                                              "damage":  "1d+1",
                                              "type":  "Thrust",
                                              "reach":  ""
                                          },
                                          {
                                              "id":  "mode-1791944202808-qdiy",
                                              "name":  "Impaling",
                                              "damage":  "1d+2",
                                              "type":  "Thrust",
                                              "reach":  ""
                                          }
                                      ],
                            "notes":  ""
                        },
                        {
                            "id":  "wpn-1791944310932-vpgt",
                            "name":  "Long Spear (2 hands)",
                            "nh":  "DX+5",
                            "damage":  "1d+2",
                            "type":  "Thrust",
                            "reach":  "",
                            "modes":  [
                                          {
                                              "id":  "mode-1791944263768-1",
                                              "name":  "Armour-pierc",
                                              "damage":  "1d+2",
                                              "type":  "Thrust",
                                              "reach":  ""
                                          },
                                          {
                                              "id":  "mode-1791944277587-mp2g",
                                              "name":  "Impaling",
                                              "damage":  "1d+3",
                                              "type":  "Thrust",
                                              "reach":  ""
                                          }
                                      ],
                            "notes":  ""
                        },
                        {
                            "id":  "wpn-1791944372557-v524",
                            "name":  "Shortsword",
                            "nh":  "DX+2",
                            "damage":  "1d+1",
                            "type":  "Swing",
                            "reach":  "",
                            "modes":  [
                                          {
                                              "id":  "mode-1791944324756-1",
                                              "name":  "Cutting",
                                              "damage":  "1d+1",
                                              "type":  "Swing",
                                              "reach":  ""
                                          },
                                          {
                                              "id":  "mode-1791944330964-a6xj",
                                              "name":  "Impaling",
                                              "damage":  "1d",
                                              "type":  "Thrust",
                                              "reach":  ""
                                          }
                                      ],
                            "notes":  ""
                        },
                        {
                            "id":  "wpn-1791944413789-28rs",
                            "name":  "Crossbow",
                            "nh":  "DX+2",
                            "damage":  "2d",
                            "type":  "Thrust",
                            "reach":  "",
                            "modes":  [
                                          {
                                              "id":  "mode-1791944375750-1",
                                              "name":  "Impaling",
                                              "damage":  "2d",
                                              "type":  "Thrust",
                                              "reach":  ""
                                          }
                                      ],
                            "notes":  ""
                        }
                    ],
        "spells":  [

                   ],
        "armorLocations":  [
                               {
                                   "location":  "Eye",
                                   "rollTarget":  "-",
                                   "penalty":  "-9",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "Só consegue acertar o olho danos de Empalamento, Perfurante ou Magia",
                                   "id":  "armor-npc-1791943809458-8np7c-0"
                               },
                               {
                                   "location":  "Head",
                                   "rollTarget":  "3-4",
                                   "penalty":  "-7",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "Tem +2 de RD / Qualquer dano vira 4X",
                                   "id":  "armor-npc-1791943809458-8np7c-1"
                               },
                               {
                                   "location":  "Face",
                                   "rollTarget":  "5",
                                   "penalty":  "-5",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "",
                                   "id":  "armor-npc-1791943809458-8np7c-2"
                               },
                               {
                                   "location":  "Left Leg",
                                   "rollTarget":  "13-14",
                                   "penalty":  "-2",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791943809458-8np7c-3"
                               },
                               {
                                   "location":  "Right Leg",
                                   "rollTarget":  "6-7",
                                   "penalty":  "-2",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791943809458-8np7c-4"
                               },
                               {
                                   "location":  "Left Shins",
                                   "rollTarget":  "13-14",
                                   "penalty":  "-2",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791943809458-8np7c-5"
                               },
                               {
                                   "location":  "Right Shins",
                                   "rollTarget":  "6-7",
                                   "penalty":  "-2",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791943809458-8np7c-6"
                               },
                               {
                                   "location":  "Left Arm",
                                   "rollTarget":  "12",
                                   "penalty":  "-2",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791943809458-8np7c-7"
                               },
                               {
                                   "location":  "Right Arm",
                                   "rollTarget":  "8",
                                   "penalty":  "-2",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791943809458-8np7c-8"
                               },
                               {
                                   "location":  "Left Forearm",
                                   "rollTarget":  "12",
                                   "penalty":  "-2",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791943809458-8np7c-9"
                               },
                               {
                                   "location":  "Right Forearm",
                                   "rollTarget":  "8",
                                   "penalty":  "-2",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791943809458-8np7c-10"
                               },
                               {
                                   "location":  "Torso",
                                   "rollTarget":  "9-10",
                                   "penalty":  "0",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "",
                                   "id":  "armor-npc-1791943809458-8np7c-11"
                               },
                               {
                                   "location":  "Groin",
                                   "rollTarget":  "11",
                                   "penalty":  "-3",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "",
                                   "id":  "armor-npc-1791943809458-8np7c-12"
                               },
                               {
                                   "location":  "Hand",
                                   "rollTarget":  "15",
                                   "penalty":  "-4",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791943809458-8np7c-13"
                               },
                               {
                                   "location":  "Feet",
                                   "rollTarget":  "16",
                                   "penalty":  "-4",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791943809458-8np7c-14"
                               },
                               {
                                   "location":  "Neck",
                                   "rollTarget":  "17-18",
                                   "penalty":  "-5",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "Contusão vira 1,5, corte vai de 1,5 para 2.0",
                                   "id":  "armor-npc-1791943809458-8np7c-15"
                               },
                               {
                                   "location":  "Vitals",
                                   "rollTarget":  "-",
                                   "penalty":  "-3",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "Empalamento e perfuração vira x3",
                                   "id":  "armor-npc-1791943809458-8np7c-16"
                               }
                           ],
        "advantages":  "",
        "disadvantages":  "",
        "skills":  "",
        "combatSkills":  "",
        "combatPerks":  "",
        "equipment":  "",
        "masterNotes":  "",
        "assistantNotes":  "",
        "history":  [

                    ],
        "characterType":  "player",
        "playerName":  "Herbert",
        "extraItems":  [
                           {
                               "id":  "item-1791944443218-0ix",
                               "name":  "Flechas Equipadas",
                               "category":  "arrows",
                               "current":  8,
                               "max":  8,
                               "isFavorite":  true
                           },
                           {
                               "id":  "item-1791944443649-fse",
                               "name":  "Bolts Backpak",
                               "category":  "arrows",
                               "current":  2,
                               "max":  2
                           },
                           {
                               "id":  "item-1791944446332-di6",
                               "name":  "Light Large Shield",
                               "category":  "shield",
                               "current":  18,
                               "max":  18,
                               "isFavorite":  true
                           }
                       ],
        "updatedAt":  1791945217140,
        "blockNotes":  "Escudo +2",
        "dodgeNotes":  "Peso -1"
    },
    {
        "id":  "npc-1791944567767-m9e2k",
        "name":  "Enviado",
        "title":  "Membro de The Hounds",
        "weight":  "",
        "height":  "",
        "avatar":  "",
        "avatarPreset":  "knight",
        "isVisibleToPlayer":  false,
        "isDead":  false,
        "hpCurrent":  14,
        "hpMax":  14,
        "fpCurrent":  12,
        "fpMax":  10,
        "statusConditions":  [

                             ],
        "turnActions":  {
                            "parryCount":  0,
                            "dodgeCount":  0,
                            "blockCount":  0,
                            "usedRetreat":  false,
                            "usedBlockThisTurn":  false,
                            "shock":  0,
                            "usedFatigueThisTurn":  false,
                            "fatigueAmountUsed":  0,
                            "notes":  ""
                        },
        "st":  11,
        "dx":  11,
        "iq":  11,
        "ht":  12,
        "per":  11,
        "will":  11,
        "basicSpeed":  5.75,
        "basicMove":  "4 (-1 Peso)",
        "naturalDr":  2,
        "parries":  [
                        {
                            "id":  "parry-npc-1791944567767-m9e2k-1",
                            "weaponName":  "",
                            "parryType":  "",
                            "value":  13,
                            "notes":  "Escudo +2"
                        }
                    ],
        "dodge":  8,
        "block":  13,
        "weapons":  [
                        {
                            "id":  "wpn-1791944910962-va1j",
                            "name":  "Thrusting Broadsword",
                            "nh":  "DX+3",
                            "damage":  "2d+2",
                            "type":  "Swing",
                            "reach":  "",
                            "modes":  [
                                          {
                                              "id":  "mode-1791944849809-1",
                                              "name":  "Cutting",
                                              "damage":  "2d+2",
                                              "type":  "Swing",
                                              "reach":  ""
                                          },
                                          {
                                              "id":  "mode-1791944871192-52e3",
                                              "name":  "Impalling",
                                              "damage":  "1d+1",
                                              "type":  "Thrust",
                                              "reach":  ""
                                          }
                                      ],
                            "notes":  ""
                        }
                    ],
        "spells":  [
          {
                    "id": "spl-enviado-001",
                    "name": "Resist Cold",
                    "nh": "IQ-1",
                    "isFavorite": false,
                    "notes": "1 pt",
                    "college": "Fire",
                    "class": "Regular",
                    "duration": "1 minute.",
                    "description": "The subject (person, creature, or object) and anything he carries become immune to the effects of cold and frostbite (but not falling ice, magical ice spears, etc.)."
          },
          {
                    "id": "spl-enviado-002",
                    "name": "Resist Lightning",
                    "nh": "IQ-1",
                    "isFavorite": false,
                    "notes": "1 pt",
                    "college": "Weather, Air, Protection and Warning",
                    "class": "Regular",
                    "duration": "1 minute.",
                    "description": "The subject and anything he carries become immune to the effects of lightning and electricity. In low-tech settings, this is most often used to guard against hostile magic; in higher-tech worlds, it becomes a valuable professional tool. This is also a Protection and Warning spell and an Air spell."
          },
          {
                    "id": "spl-enviado-003",
                    "name": "Lend Energy",
                    "nh": "IQ-1",
                    "isFavorite": false,
                    "notes": "1 pt",
                    "college": "Healing",
                    "class": "Regular",
                    "description": "Restores the subject’s lost Fatigue Points, at an energy cost to the caster. Cannot increase the subject’s FP score above its normal maximum."
          },
          {
                    "id": "spl-enviado-004",
                    "name": "Bravery",
                    "nh": "IQ-1",
                    "isFavorite": false,
                    "notes": "1 pt",
                    "college": "Mind Control",
                    "class": "Area; Resisted by Will-1",
                    "duration": "1 hour unless countered by Fear.",
                    "description": "Makes the subject(s) fearless. Anyone under this spell must make an IQ roll to avoid being brave, should caution be called for."
          },
          {
                    "id": "spl-enviado-005",
                    "name": "Sense Foes",
                    "nh": "IQ-1",
                    "isFavorite": false,
                    "notes": "1 pt",
                    "college": "Communication and Empathy",
                    "class": "Information; Area",
                    "description": "Tells the caster if the subject has hostile intent, and what the degree of hostility is. Can be cast on one person or a whole area. If cast over an area, this spell only detects that someone is hostile, without telling who."
          },
          {
                    "id": "spl-enviado-006",
                    "name": "Sense Spirit",
                    "nh": "IQ-1",
                    "isFavorite": false,
                    "notes": "1 pt",
                    "college": "Necromantic",
                    "class": "Information; Area",
                    "description": "Tells the caster if there are any ghosts, spirits, undead, or similar supernatural entities within the area of effect. On a good roll, it gives a general impression of what kind of being is present. Caster may, at the time of casting, limit the spell to a specific type of entity, or exclude a given type."
          },
          {
                    "id": "spl-enviado-007",
                    "name": "Night Vision",
                    "nh": "IQ-1",
                    "isFavorite": false,
                    "notes": "1 pt",
                    "college": "Light and Darkness",
                    "class": "Regular",
                    "duration": "One minute.",
                    "description": "Cancels all penalties to Sense and skill rolls for low light, but not for total darkness."
          },
          {
                    "id": "spl-enviado-008",
                    "name": "Resist Fire",
                    "nh": "IQ-1",
                    "isFavorite": false,
                    "notes": "1 pt",
                    "college": "Fire",
                    "class": "Regular",
                    "duration": "1 minute.",
                    "description": "The subject (person, creature, or object) and anything he carries become immune to the effects of heat and fire (but not electricity)."
          },
          {
                    "id": "spl-enviado-009",
                    "name": "Stop Bleeding",
                    "nh": "IQ-1",
                    "isFavorite": false,
                    "notes": "1 pt",
                    "college": "Healing",
                    "class": "Regular",
                    "duration": "Permanent, although later injuries will bleed normally.",
                    "timeToCast": "10 seconds.",
                    "description": "The subject stops bleeding immediately, as if bandaged by someone with the First Aid skill (see p. B195). This restores 1 HP, and prevents further HP loss from bleeding if the optional bleeding rules (p. B420) are in effect. It can also stabilize a mortal wound, at much greater cost. The subject of this spell will not subsequently benefit from bandaging of the same wounds."
          },
          {
                    "id": "spl-enviado-010",
                    "name": "Strengthen Will",
                    "nh": "IQ-1",
                    "isFavorite": false,
                    "notes": "1 pt",
                    "college": "Mind Control",
                    "class": "Regular",
                    "duration": "1 minute.",
                    "description": "Temporarily increases the subject’s Will."
          },
          {
                    "id": "spl-enviado-011",
                    "name": "Haste",
                    "nh": "IQ-1",
                    "isFavorite": false,
                    "notes": "1 pt",
                    "college": "Movement",
                    "class": "Regular",
                    "duration": "1 minute.",
                    "timeToCast": "2 seconds.",
                    "description": "Increases the subject’s Move and Dodge scores by up to 3."
          },
          {
                    "id": "spl-enviado-012",
                    "name": "Sense Life",
                    "nh": "IQ-1",
                    "isFavorite": false,
                    "notes": "1 pt",
                    "college": "Communication and Empathy",
                    "class": "Information; Area",
                    "description": "Tells the caster if there is any life in the subject area, and gives a general impression (on a good roll) of what kind. The caster can also specify he is looking for a specific sort of life: plants, elves, redheaded girls, or a named person who the caster knows."
          },
          {
                    "id": "spl-enviado-013",
                    "name": "Borrow Language",
                    "nh": "IQ-1",
                    "isFavorite": false,
                    "notes": "1 pt",
                    "college": "Communication and Empathy",
                    "class": "Regular",
                    "duration": "1 minute.",
                    "timeToCast": "3 seconds.",
                    "description": "Caster gains a language at the subject’s comprehension level or Accented – whichever is less. The subject must know the language in question."
          },
          {
                    "id": "spl-enviado-014",
                    "name": "Block",
                    "nh": "IQ",
                    "isFavorite": false,
                    "notes": "2 pts",
                    "college": "Protection and Warning",
                    "class": "Blocking",
                    "description": "An instantaneous version of the Shield spell – adds to the subject’s DB for a single defense roll. This spell is not cumulative with the effects of Shield – use the highest value."
          },
          {
                    "id": "spl-enviado-015",
                    "name": "Vigor",
                    "nh": "IQ-1",
                    "isFavorite": false,
                    "notes": "1 pt",
                    "college": "Body Control",
                    "class": "Regular",
                    "duration": "1 minute.",
                    "description": "Raises the subject’s HT temporarily. This affects his Basic Speed, FP, and ability to resist trauma and disease. A caster can raise his HT. If the subject’s FP when the spell wears off is below zero, he will immediately take 1 point of damage for every point of fatigue below zero, risking unconsciousness. High skill does not reduce cost to cast this spell."
          },
          {
                    "id": "spl-enviado-016",
                    "name": "Light",
                    "nh": "IQ-1",
                    "isFavorite": false,
                    "notes": "1 pt",
                    "college": "Light and Darkness",
                    "class": "Regular",
                    "duration": "1 minute.",
                    "description": "Produces a small light, like a candle flame. It stays still unless the caster concentrates on moving it; then it can travel at Move 5."
          }
],
        "armorLocations":  [
                               {
                                   "location":  "Eye",
                                   "rollTarget":  "-",
                                   "penalty":  "-9",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "Só consegue acertar o olho danos de Empalamento, Perfurante ou Magia",
                                   "id":  "armor-npc-1791944567767-m9e2k-0",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Head",
                                   "rollTarget":  "3-4",
                                   "penalty":  "-7",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "Tem +2 de RD / Qualquer dano vira 4X",
                                   "id":  "armor-npc-1791944567767-m9e2k-1",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Face",
                                   "rollTarget":  "5",
                                   "penalty":  "-5",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "",
                                   "id":  "armor-npc-1791944567767-m9e2k-2",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Left Leg",
                                   "rollTarget":  "13-14",
                                   "penalty":  "-2",
                                   "armorName":  "Medium Leather",
                                   "dr":  2,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791944567767-m9e2k-3",
                                   "drModifier":  -1,
                                   "modifierDamageType":  "empalamento",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Right Leg",
                                   "rollTarget":  "6-7",
                                   "penalty":  "-2",
                                   "armorName":  "Medium Leather",
                                   "dr":  2,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791944567767-m9e2k-4",
                                   "drModifier":  -1,
                                   "modifierDamageType":  "empalamento",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Left Shins",
                                   "rollTarget":  "13-14",
                                   "penalty":  "-2",
                                   "armorName":  "Medium Leather",
                                   "dr":  2,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791944567767-m9e2k-5",
                                   "drModifier":  -1,
                                   "modifierDamageType":  "empalamento",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Right Shins",
                                   "rollTarget":  "6-7",
                                   "penalty":  "-2",
                                   "armorName":  "Medium Leather",
                                   "dr":  2,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791944567767-m9e2k-6",
                                   "drModifier":  -1,
                                   "modifierDamageType":  "empalamento",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Left Arm",
                                   "rollTarget":  "12",
                                   "penalty":  "-2",
                                   "armorName":  "Light Segmented Plate",
                                   "dr":  3,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791944567767-m9e2k-7",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Right Arm",
                                   "rollTarget":  "8",
                                   "penalty":  "-2",
                                   "armorName":  "Light Segmented Plate",
                                   "dr":  3,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791944567767-m9e2k-8",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Left Forearm",
                                   "rollTarget":  "12",
                                   "penalty":  "-2",
                                   "armorName":  "Light Segmented Plate",
                                   "dr":  3,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791944567767-m9e2k-9",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Right Forearm",
                                   "rollTarget":  "8",
                                   "penalty":  "-2",
                                   "armorName":  "Light Segmented Plate",
                                   "dr":  3,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791944567767-m9e2k-10",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Torso",
                                   "rollTarget":  "9-10",
                                   "penalty":  "0",
                                   "armorName":  "Light Segmented Plate",
                                   "dr":  3,
                                   "notes":  "",
                                   "additionalRule":  "",
                                   "id":  "armor-npc-1791944567767-m9e2k-11",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Groin",
                                   "rollTarget":  "11",
                                   "penalty":  "-3",
                                   "armorName":  "Light Segmented Plate",
                                   "dr":  3,
                                   "notes":  "",
                                   "additionalRule":  "",
                                   "id":  "armor-npc-1791944567767-m9e2k-12",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Hand",
                                   "rollTarget":  "15",
                                   "penalty":  "-4",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791944567767-m9e2k-13",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Feet",
                                   "rollTarget":  "16",
                                   "penalty":  "-4",
                                   "armorName":  "Boots",
                                   "dr":  2,
                                   "notes":  "",
                                   "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                   "id":  "armor-npc-1791944567767-m9e2k-14",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Neck",
                                   "rollTarget":  "17-18",
                                   "penalty":  "-5",
                                   "armorName":  "",
                                   "dr":  0,
                                   "notes":  "",
                                   "additionalRule":  "Contusão vira 1,5, corte vai de 1,5 para 2.0",
                                   "id":  "armor-npc-1791944567767-m9e2k-15",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               },
                               {
                                   "location":  "Vitals",
                                   "rollTarget":  "-",
                                   "penalty":  "-3",
                                   "armorName":  "Light Segmented Plate",
                                   "dr":  3,
                                   "notes":  "",
                                   "additionalRule":  "Empalamento e perfuração vira x3",
                                   "id":  "armor-npc-1791944567767-m9e2k-16",
                                   "drModifier":  0,
                                   "modifierDamageType":  "",
                                   "damageTaken":  0
                               }
                           ],
        "advantages":  "",
        "disadvantages":  "",
        "skills":  "",
        "combatSkills":  "",
        "combatPerks":  "",
        "equipment":  "",
        "masterNotes":  "",
        "assistantNotes":  "",
        "history":  [

                    ],
        "characterType":  "player",
        "playerName":  "willian",
        "extraItems":  [
                           {
                               "id":  "it-shd-1791944567767",
                               "name":  "Heavy Medium Shield",
                               "current":  20,
                               "max":  20,
                               "category":  "shield"
                           }
                       ],
        "updatedAt":  1791945217140,
        "blockNotes":  "Escudo +2",
        "dodgeNotes":  "Carga 0 = 9 / Carga 1 = 8",
        "armorKits":  [
                          {
                              "id":  "kit-npc-1791944567767-m9e2k-1",
                              "name":  "Kit Principal",
                              "isActive":  true,
                              "locations":  [
                                                {
                                                    "location":  "Eye",
                                                    "rollTarget":  "-",
                                                    "penalty":  "-9",
                                                    "armorName":  "",
                                                    "dr":  0,
                                                    "notes":  "",
                                                    "additionalRule":  "Só consegue acertar o olho danos de Empalamento, Perfurante ou Magia",
                                                    "id":  "armor-npc-1791944567767-m9e2k-0",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Head",
                                                    "rollTarget":  "3-4",
                                                    "penalty":  "-7",
                                                    "armorName":  "",
                                                    "dr":  0,
                                                    "notes":  "",
                                                    "additionalRule":  "Tem +2 de RD / Qualquer dano vira 4X",
                                                    "id":  "armor-npc-1791944567767-m9e2k-1",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Face",
                                                    "rollTarget":  "5",
                                                    "penalty":  "-5",
                                                    "armorName":  "",
                                                    "dr":  0,
                                                    "notes":  "",
                                                    "additionalRule":  "",
                                                    "id":  "armor-npc-1791944567767-m9e2k-2",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Left Leg",
                                                    "rollTarget":  "13-14",
                                                    "penalty":  "-2",
                                                    "armorName":  "Medium Leather",
                                                    "dr":  2,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791944567767-m9e2k-3",
                                                    "drModifier":  -1,
                                                    "modifierDamageType":  "empalamento",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Right Leg",
                                                    "rollTarget":  "6-7",
                                                    "penalty":  "-2",
                                                    "armorName":  "Medium Leather",
                                                    "dr":  2,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791944567767-m9e2k-4",
                                                    "drModifier":  -1,
                                                    "modifierDamageType":  "empalamento",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Left Shins",
                                                    "rollTarget":  "13-14",
                                                    "penalty":  "-2",
                                                    "armorName":  "Medium Leather",
                                                    "dr":  2,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791944567767-m9e2k-5",
                                                    "drModifier":  -1,
                                                    "modifierDamageType":  "empalamento",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Right Shins",
                                                    "rollTarget":  "6-7",
                                                    "penalty":  "-2",
                                                    "armorName":  "Medium Leather",
                                                    "dr":  2,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791944567767-m9e2k-6",
                                                    "drModifier":  -1,
                                                    "modifierDamageType":  "empalamento",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Left Arm",
                                                    "rollTarget":  "12",
                                                    "penalty":  "-2",
                                                    "armorName":  "Light Segmented Plate",
                                                    "dr":  3,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791944567767-m9e2k-7",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Right Arm",
                                                    "rollTarget":  "8",
                                                    "penalty":  "-2",
                                                    "armorName":  "Light Segmented Plate",
                                                    "dr":  3,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791944567767-m9e2k-8",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Left Forearm",
                                                    "rollTarget":  "12",
                                                    "penalty":  "-2",
                                                    "armorName":  "Light Segmented Plate",
                                                    "dr":  3,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791944567767-m9e2k-9",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Right Forearm",
                                                    "rollTarget":  "8",
                                                    "penalty":  "-2",
                                                    "armorName":  "Light Segmented Plate",
                                                    "dr":  3,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791944567767-m9e2k-10",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Torso",
                                                    "rollTarget":  "9-10",
                                                    "penalty":  "0",
                                                    "armorName":  "Light Segmented Plate",
                                                    "dr":  3,
                                                    "notes":  "",
                                                    "additionalRule":  "",
                                                    "id":  "armor-npc-1791944567767-m9e2k-11",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Groin",
                                                    "rollTarget":  "11",
                                                    "penalty":  "-3",
                                                    "armorName":  "Light Segmented Plate",
                                                    "dr":  3,
                                                    "notes":  "",
                                                    "additionalRule":  "",
                                                    "id":  "armor-npc-1791944567767-m9e2k-12",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Hand",
                                                    "rollTarget":  "15",
                                                    "penalty":  "-4",
                                                    "armorName":  "",
                                                    "dr":  0,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791944567767-m9e2k-13",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Feet",
                                                    "rollTarget":  "16",
                                                    "penalty":  "-4",
                                                    "armorName":  "Boots",
                                                    "dr":  2,
                                                    "notes":  "",
                                                    "additionalRule":  "Perfurante, perfurante grande e empalamento vira x1",
                                                    "id":  "armor-npc-1791944567767-m9e2k-14",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Neck",
                                                    "rollTarget":  "17-18",
                                                    "penalty":  "-5",
                                                    "armorName":  "",
                                                    "dr":  0,
                                                    "notes":  "",
                                                    "additionalRule":  "Contusão vira 1,5, corte vai de 1,5 para 2.0",
                                                    "id":  "armor-npc-1791944567767-m9e2k-15",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                },
                                                {
                                                    "location":  "Vitals",
                                                    "rollTarget":  "-",
                                                    "penalty":  "-3",
                                                    "armorName":  "Light Segmented Plate",
                                                    "dr":  3,
                                                    "notes":  "",
                                                    "additionalRule":  "Empalamento e perfuração vira x3",
                                                    "id":  "armor-npc-1791944567767-m9e2k-16",
                                                    "drModifier":  0,
                                                    "modifierDamageType":  "",
                                                    "damageTaken":  0
                                                }
                                            ]
                          }
                      ]
    }
];