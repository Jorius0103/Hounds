/* =====================================================================
   Hounds — Aba Tabuleiros: lista, mapa de batalha (grade, tokens, camadas,
   luz dinâmica e névoa de guerra) e formulários
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Boards: battle maps in the manner of a virtual tabletop.
     boards       the map image, the grid, the walls and doors, the areas
                  the Mestre revealed in the fog and the areas the players'
                  tokens have seen (Board in types/dados.d.ts)
     boardTokens  the tokens, one document each (a move writes only the
                  token that moved), on one of three layers:
                    map     part of the map, under the grid, seen by all
                    tokens  the usual layer
                    gm      seen only by the Mestre (its lights still shine)
   Who does what: the Mestre everything; a player moves the tokens they
   control (ownerIds) and changes their PV. The database checks the same
   (autorizar, migration 33).
   Dynamic light: a player sees only what their tokens see. Each token with
   sight looks from its center (the polygon cut by walls and closed doors,
   BoardGeo.sight); what it sees shows where it is lit: by daylight
   (globalLight), by the light of a token (bright and dim radius) or by its
   own darkvision. With the explorer mode, what was seen stays on the map,
   darker and without tokens; those areas belong to the group (explored,
   merged bit by bit by every browser that sees something new).
   Manual fog: a player sees only the rectangles the Mestre revealed.
   The Mestre sees everything, under the players' darkness at half
   strength; "Ver como jogador" shows it as they see it.
   ===================================================================== */
ICON.board = '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/>';
var BOARD_ICON = {
  select: '<path d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z"/>',
  ruler: '<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/>',
  walls: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 9v6"/><path d="M16 15v6"/><path d="M16 3v6"/><path d="M3 15h18"/><path d="M3 9h18"/><path d="M8 15v6"/><path d="M8 3v6"/>',
  fog: '<path d="M17.5 21H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
  grid: '<path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="M12 22V12"/><path d="m3 7 9 5 9-5"/>',
  gear: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  eye: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
  door: '<path d="M13 4h3a2 2 0 0 1 2 2v14"/><path d="M2 20h3"/><path d="M13 20h9"/><path d="M10 12v.01"/><path d="M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z"/>',
  erase: '<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  minus: '<path d="M5 12h14"/>',
  turnLeft: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  turnRight: '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>',
  hand: '<path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>',
  brush: '<path d="m11 10 3 3"/><path d="M6.5 21A3.5 3.5 0 1 0 3 17.5a2.62 2.62 0 0 1-.708 1.792A1 1 0 0 0 3 21z"/><path d="M9.969 17.031 21.378 5.624a1 1 0 0 0-3.002-3.002L6.967 14.031"/>',
  free: '<path d="M3 17c3-7 6 1 9-5s6 3 9-4"/>',
  line: '<path d="M5 19 19 5"/><circle cx="5" cy="19" r="1.5"/><circle cx="19" cy="5" r="1.5"/>',
  rect: '<rect width="16" height="12" x="4" y="6" rx="1"/>',
  ellipse: '<ellipse cx="12" cy="12" rx="9" ry="7"/>',
  text: '<path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>',
  radius: '<circle cx="12" cy="12" r="9"/><path d="M12 12h9"/><circle cx="12" cy="12" r="1.5"/>',
  cone: '<path d="M4 20 20 8a10 10 0 0 0-8-6z"/>',
  menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
  d20: '<path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="M12 2 7.5 14.5h9z"/><path d="m3 7 4.5 7.5L3 17"/><path d="m21 7-4.5 7.5L21 17"/><path d="M7.5 14.5 12 22l4.5-7.5"/>',
  turns: '<path d="M3 6h11"/><path d="M3 12h7"/><path d="M3 18h11"/><path d="m16 9 4 3-4 3"/>',
  pages: '<rect width="14" height="16" x="7" y="5" rx="2"/><path d="M4 16V5a2 2 0 0 1 2-2h9"/>',
  side: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 3v18"/><path d="m10 15-3-3 3-3"/>',
  chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  art: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  journal: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/><path d="M9 7h6"/><path d="M9 11h4"/>',
  layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
  crown: '<path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/><path d="M5 21h14"/>',
  mapLayer: '<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/>',
  tree: '<path d="M10 10v.2A3 3 0 0 1 8.9 16H5a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z"/><path d="M7 16v6"/><path d="M13 19v3"/><path d="M12 19h8.3a1 1 0 0 0 .7-1.7L18 14h.3a1 1 0 0 0 .7-1.7L16 9h.2a1 1 0 0 0 .8-1.7L13 3l-1.4 1.5"/>',
  bulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
  dots: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  ribbon: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
  share: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>'
};
/* Status markers on the tokens (markers, migration 34), the conditions of GURPS: each with its
   color and the paths of its icon (24 × 24, drawn on the board with Path2D). */
var BOARD_MARKERS = [
  { id: 'atordoado', label: 'Atordoado', color: '#facc15', d: ['M13 2 3 14h9l-1 8 10-12h-9l1-8z'] },
  { id: 'caido', label: 'Caído', color: '#fb923c', d: ['M12 3v12', 'm6 9 6 6 6-6', 'M5 21h14'] },
  { id: 'inconsciente', label: 'Inconsciente', color: '#94a3b8', d: ['M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z'] },
  { id: 'sangrando', label: 'Sangrando', color: '#ef4444', d: ['M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z'] },
  { id: 'envenenado', label: 'Envenenado', color: '#22c55e', d: ['M10 2v7.31', 'M14 9.3V1.99', 'M8.5 2h7', 'M14 9.3a6.5 6.5 0 1 1-4 0', 'M5.52 16h12.96'] },
  { id: 'agarrado', label: 'Agarrado', color: '#d97706', d: ['M18 11V6a2 2 0 0 0-4 0', 'M14 10V4a2 2 0 0 0-4 0v2', 'M10 10.5V6a2 2 0 0 0-4 0v8', 'M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15'] },
  { id: 'em-chamas', label: 'Em chamas', color: '#f97316', d: ['M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z'] },
  { id: 'escondido', label: 'Escondido', color: '#a78bfa', d: ['M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49', 'M14.084 14.158a3 3 0 0 1-4.242-4.242', 'M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143', 'm2 2 20 20'] },
  { id: 'concentrando', label: 'Concentrando', color: '#38bdf8', d: ['M2 12a10 10 0 1 0 20 0a10 10 0 1 0-20 0', 'M6 12a6 6 0 1 0 12 0a6 6 0 1 0-12 0', 'M10 12a2 2 0 1 0 4 0a2 2 0 1 0-4 0'] },
  { id: 'defesa-total', label: 'Defesa total', color: '#60a5fa', d: ['M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z'] },
  { id: 'lento', label: 'Lento', color: '#22d3ee', d: ['M5 22h14', 'M5 2h14', 'M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22', 'M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2'] },
  { id: 'amedrontado', label: 'Amedrontado', color: '#f472b6', d: ['M9 10h.01', 'M15 10h.01', 'M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z'] },
  { id: 'abencoado', label: 'Abençoado', color: '#fde047', d: ['M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z'] },
  { id: 'morto', label: 'Morto', color: '#111827', d: ['M18 6 6 18', 'm6 6 12 12'] }
];
var BOARD_MARKER = {}; BOARD_MARKERS.forEach(function (m) { BOARD_MARKER[m.id] = m; });
function boardMarkerSvg(m, size) { return svg(m.d.map(function (d) { return '<path d="' + d + '"/>'; }).join(''), size, 2.4); }
// The options of the tools (the box beside the toolbar), remembered in this browser.
var BOARD_SHAPES = [{ id: 'free', label: 'À mão livre', icon: BOARD_ICON.free }, { id: 'line', label: 'Linha', icon: BOARD_ICON.line },
  { id: 'rect', label: 'Retângulo', icon: BOARD_ICON.rect }, { id: 'ellipse', label: 'Elipse', icon: BOARD_ICON.ellipse }];
// Line widths and text sizes are a part of a cell, so they look the same on any map.
var BOARD_WIDTHS = [{ id: 'fine', label: 'Fino', k: 0.03 }, { id: 'regular', label: 'Regular', k: 0.06 }, { id: 'thick', label: 'Grosso', k: 0.12 }, { id: 'heavy', label: 'Muito grosso', k: 0.24 }];
var BOARD_TEXT_SIZES = [{ id: 's', label: 'Pequeno', k: 0.3 }, { id: 'm', label: 'Médio', k: 0.5 }, { id: 'l', label: 'Grande', k: 0.8 }, { id: 'xl', label: 'Enorme', k: 1.3 }];
var BOARD_FONTS = [{ id: 'sans', label: 'Sem serifa', css: '"Plus Jakarta Sans", system-ui, sans-serif' }, { id: 'serif', label: 'Com serifa', css: 'Georgia, "Times New Roman", serif' },
  { id: 'mono', label: 'Máquina de escrever', css: '"JetBrains Mono", Consolas, monospace' }, { id: 'hand', label: 'Manuscrita', css: '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive' }];
var BOARD_PALETTE = ['#ffffff', '#94a3b8', '#0b1222', '#ef4444', '#f97316', '#f59e0b', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899'];
var BOARD_DICE = [{ s: 4, label: 'D4' }, { s: 6, label: 'D6' }, { s: 8, label: 'D8' }, { s: 10, label: 'D10' }, { s: 12, label: 'D12' }, { s: 20, label: 'D20' }, { s: 100, label: 'D100' }, { s: 'F', label: 'Fudge' }];
function boardFontCss(id) { for (var i = 0; i < BOARD_FONTS.length; i++) if (BOARD_FONTS[i].id === id) return BOARD_FONTS[i].css; return BOARD_FONTS[0].css; }
function boardPick(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return list[0]; }
var BOARD_GRIDS = [{ id: 'hex', label: 'Hexágonos em fileiras' }, { id: 'hexc', label: 'Hexágonos em colunas' }, { id: 'square', label: 'Quadrados' }, { id: 'none', label: 'Sem grade' }];
// fore: the foreground, over the tokens (treetops, roofs), seen by all and hidden by the dark.
var BOARD_LAYERS = [{ id: 'map', label: 'Mapa' }, { id: 'tokens', label: 'Tokens' }, { id: 'fore', label: 'Primeiro plano' }, { id: 'gm', label: 'Mestre' }];
// What a board holds besides name and image, as the database gives a new one (migration 33).
var BOARD_DEFAULTS = { bg: '#1e293b', gridType: 'hex', gridSize: 70, gridX: 0, gridY: 0, gridColor: '#000000', gridOpacity: 0.35, scale: 1, unit: 'jd',
  dynamicLight: false, globalLight: true, explorer: true, fog: false, fogAreas: [], walls: [], explored: '', exploredEpoch: 0 };

function indexBoards() { var idx = /** @type {Record<string, Board>} */ ({}); W.boards.forEach(function (b) { idx[b.id] = b; }); W.boardIdx = idx; }
function boardById(id) { return (W.boardIdx && W.boardIdx[id]) || null; }
function boardHref(id) { return hrefFor('board:' + id); }
// A board with every field (and the size of its image, when it has one).
function boardFull(b) {
  var img = b && b.image;
  return Object.assign({}, BOARD_DEFAULTS, { width: (img && img.w) || 2100, height: (img && img.h) || 1400 }, b || {});
}
function boardGridLabel(id) { for (var i = 0; i < BOARD_GRIDS.length; i++) if (BOARD_GRIDS[i].id === id) return BOARD_GRIDS[i].label; return BOARD_GRIDS[0].label; }
function boardLayerLabel(id) { for (var i = 0; i < BOARD_LAYERS.length; i++) if (BOARD_LAYERS[i].id === id) return BOARD_LAYERS[i].label; return 'Tokens'; }
function boardNum(n) { return (Math.round(n * 10) / 10).toLocaleString('pt-BR'); }
// A color of its own for each account (pings, the chat, the people at the table).
function boardUserColor(id) { var h = 0; String(id || '').split('').forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) % 360; }); return 'hsl(' + h + ', 85%, 60%)'; }
// The image a token shows: its own, or the one of the character it represents.
function boardTokenImageRef(t) {
  if (!t) return null;
  if (t.image && t.image.ref) return t.image.ref;
  var c = t.characterId && rawGet('characters', t.characterId);
  return (c && c.image && c.image.ref) || null;
}
// Tiles (map and foreground): the image as it is, with its proportions; size counts the longer side.
function boardIsTile(t) { return t.layer === 'map' || t.layer === 'fore'; }
/* What a character's sheet says (with the advantages' effects): PV, PF, Basic Speed (the order of
   the turns in GURPS), the attributes and the stats of gurpsStats. Null without a sheet this
   person can see. */
function boardSheetVitals(charId) {
  var c = charId && rawGet('characters', charId), s = c && c.sheetId && sheetById(c.sheetId);
  if (!s || typeof sheetAttrs !== 'function') return null;
  try {
    var a = sheetAttrs(s), e = typeof withAdvFx === 'function' ? withAdvFx(s, a) : a, r = gurpsStats(e);
    return { hp: r.hp, fp: r.fp, speed: Math.round(r.speed * 100) / 100, attrs: e, stats: r, sheet: s };
  } catch (er) { return null; }
}
// A checkbox row in the forms (the look of the visibility flag).
function boardCheckHtml(id, title, help, on) {
  return '<label class="vis-flag" for="' + id + '"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '><span><b>' + esc(title) + '</b><small>' + esc(help) + '</small></span></label>';
}

/* =====================================================================
   Page: Tabuleiros (the list)
   ===================================================================== */
function renderBoardsPage() {
  var can = isMestre() && canWrite() && W.store && W.store.canUpload;
  pageRoot.innerHTML = '<div class="head-row"><div>' + crumbsHtml('boards') + '<h1>Tabuleiros</h1><p class="lede">A mesa virtual: mapas de batalha com grade, tokens e camadas, ' +
    'o chat com as rolagens, a ordem de turno e o diário. Com a luz dinâmica, cada jogador vê só o que os próprios tokens enxergam, e as paredes barram a visão e o caminho.</p></div>' +
    (can ? '<div class="btn-row"><button class="btn primary" type="button" id="newBoardBtn">' + svg(ICON.plus, 16, 2.4) + 'Novo tabuleiro</button></div>' : '') + '</div>' +
    notice() + BoardPages.bannerHtml() + '<div id="boardList"></div>';
  var nb = $('newBoardBtn'); if (nb) nb.onclick = function () { openBoardForm(null); };
  var el = $('boardList');
  if (!W.loaded.boards) { el.innerHTML = '<p class="lede">Carregando tabuleiros…</p>'; return; }
  if (!W.boards.length) {
    el.innerHTML = '<div class="empty-state">' + svg(ICON.board, 34, 1.6) + '<strong>Nenhum tabuleiro ainda</strong><span>' +
      (can ? 'Crie o primeiro com <b>Novo tabuleiro</b>. A imagem pode ser a de um mapa do Mundo.' : 'Os tabuleiros que o Mestre criar vão aparecer aqui.') + '</span></div>';
    return;
  }
  var pb = BoardPages.boardFor(me());
  el.innerHTML = '<div class="loc-grid">' + W.boards.slice().sort(byName).map(function (b) {
    var f = boardFull(b), feats = [b.id === pb ? (isMestre() ? 'Jogadores aqui' : 'O grupo está aqui') : '', boardGridLabel(f.gridType), f.dynamicLight ? 'Luz dinâmica' : '', f.fog ? 'Névoa' : ''].filter(Boolean).join(' · ');
    return '<a class="loc-card" href="' + boardHref(b.id) + '"><div class="thumb"' + (b.image ? ' data-img="' + esc(b.image.ref) + '"' : '') + '>' + svg(ICON.board, 28, 1.6) + '</div>' +
      '<div class="map-card-body"><strong>' + esc(b.name) + '</strong>' + (isSecret(b) ? secretTag(b) : '') + '<span class="meta">' + esc(feats) + '</span></div></a>';
  }).join('') + '</div>';
  fillImages(el);
}

/* =====================================================================
   Page: one board (BoardView, below, keeps it between redraws)
   ===================================================================== */
function renderBoardPage() { BoardView.open(S.route.boardId); }

/* =====================================================================
   Writes
   ===================================================================== */
/* An image of the store dropped only when nothing else uses it: another token (a copied token
   keeps the same one), the art library, or the character, map, place, organization or board it
   came from (a token made by dragging it from the Journal or the Art shares its image). */
function dropTokenImages(refs) {
  refs = refs.filter(Boolean);
  if (!refs.length) return;
  Promise.all([W.store.all('boardTokens'), W.store.all('boardArt').catch(function () { return []; })]).then(function (r) {
    var used = {};
    function mark(x) { if (x && x.image && x.image.ref) used[x.image.ref] = true; }
    r[0].forEach(mark); r[1].forEach(mark);
    ['characters', 'maps', 'locations', 'organizations', 'boards'].forEach(function (col) { (W.raw[col] || []).forEach(mark); });
    refs.forEach(function (ref) { if (!used[ref]) W.store.dropImage(ref); });
  }).catch(function () {});
}
function boardBody(x) { var b = Object.assign({}, x); delete b.id; delete b.catalog; return b; }
var BoardOps = {
  // fields: what the form edits; file/dims: a new image; removeImage: back to a plain background.
  save: function (b, fields, file, dims, removeImage) {
    var t = now();
    var up = file ? W.store.upload(file).then(function (u) { return { ref: u.ref, w: dims.w, h: dims.h, type: u.type, size: u.size }; })
      : Promise.resolve(removeImage ? null : (b && b.image) || null);
    return up.then(function (image) {
      var body = Object.assign(boardBody(boardFull(b)), fields, { v: 1, image: image, createdBy: owner(b), createdAt: (b && b.createdAt) || t, updatedAt: t });
      if (image) { body.width = image.w; body.height = image.h; }
      // Cells of another size or another board: the explored areas no longer match.
      if (b && BoardGeo.fogDims(boardFull(b)).key !== BoardGeo.fogDims(body).key) { body.explored = ''; body.exploredEpoch = (+b.exploredEpoch || 0) + 1; }
      return W.store.put('boards', b ? b.id : null, body).then(function (id) {
        var old = b && b.image && b.image.ref;
        if (old && old !== (image && image.ref)) W.store.dropImage(old);
        return id;
      }, function (e) { if (file && image) W.store.dropImage(image.ref); throw e; });
    });
  },
  patch: function (b, p) { return W.store.patch('boards', b.id, p); },
  remove: function (b) {
    return Promise.all([W.store.query('boardTokens', 'boardId', b.id).catch(function () { return []; }), W.store.query('boardDrawings', 'boardId', b.id).catch(function () { return []; })]).then(function (r) {
      var toks = r[0];
      // A relational database removes the tokens, the drawings and the turn order with the board (ON DELETE CASCADE).
      var seq = W.store.relational ? Promise.resolve() : toks.reduce(function (p, k) { return p.then(function () { return W.store.remove('boardTokens', k.id); }); }, Promise.resolve())
        .then(function () { return W.store.relational ? null : BoardOps.removeDrawings(r[1]); })
        .then(function () { return W.store.relational ? null : W.store.remove('boardTurns', b.id).catch(function () {}); });
      return seq.then(function () { return W.store.remove('boards', b.id); }).then(function () {
        if (b.image && b.image.ref) W.store.dropImage(b.image.ref);
        dropTokenImages(toks.map(function (k) { return k.image && k.image.ref; }));
      });
    });
  },
  // A new token without a file keeps fields.image (a copy of another token shares its image).
  saveToken: function (tok, fields, file, dims, removeImage) {
    var t = now();
    var up = file ? W.store.upload(file).then(function (u) { return { ref: u.ref, w: dims.w, h: dims.h, type: u.type, size: u.size }; })
      : Promise.resolve(removeImage ? null : (tok ? tok.image : fields.image) || null);
    return up.then(function (image) {
      var body = Object.assign(tok ? boardBody(tok) : {}, fields, { image: image, createdBy: owner(tok), createdAt: (tok && tok.createdAt) || t, updatedAt: t });
      return W.store.put('boardTokens', tok ? tok.id : null, body).then(function (id) {
        var old = tok && tok.image && tok.image.ref;
        if (old && old !== (image && image.ref)) dropTokenImages([old]);
        return id;
      }, function (e) { if (file && image) W.store.dropImage(image.ref); throw e; });
    });
  },
  patchToken: function (tok, p) { return W.store.patch('boardTokens', tok.id, Object.assign({ updatedAt: now() }, p)); },
  removeToken: function (tok) {
    return W.store.remove('boardTokens', tok.id).then(function () { if (tok.image && tok.image.ref) dropTokenImages([tok.image.ref]); });
  },
  // Drawings and texts (boardDrawings): body is the drawing without createdBy and the dates.
  saveDrawing: function (body) {
    var t = now();
    return W.store.put('boardDrawings', null, Object.assign({}, body, { createdBy: me(), createdAt: t, updatedAt: t }));
  },
  patchDrawing: function (d, p) { return W.store.patch('boardDrawings', d.id, Object.assign({ updatedAt: now() }, p)); },
  removeDrawing: function (d) { return W.store.remove('boardDrawings', d.id); },
  removeDrawings: function (list) {
    var ids = (list || []).map(function (d) { return d.id; });
    if (!ids.length) return Promise.resolve();
    if (typeof W.store.removeMany === 'function') return W.store.removeMany('boardDrawings', ids);
    return ids.reduce(function (p, id) { return p.then(function () { return W.store.remove('boardDrawings', id); }); }, Promise.resolve());
  }
};

// A copy of a map's image, uploaded for the board (the map can change or go away on its own).
function copyMapImage(m) {
  return W.store.imageUrl(m.image.ref).then(function (u) { return fetch(u); }).then(function (r) {
    if (!r.ok) throw new Error('imagem ' + r.status);
    return r.blob();
  }).then(function (blob) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(blob), im = new Image();
      im.onload = function () { URL.revokeObjectURL(url); res({ file: blob, dims: { w: im.naturalWidth, h: im.naturalHeight } }); };
      im.onerror = function () { URL.revokeObjectURL(url); rej({ message: 'Não foi possível abrir a imagem desse mapa.' }); };
      im.src = url;
    });
  });
}
function numVal(id, def, min, max) {
  var el = $(id), v = el ? parseFloat(String(el.value).replace(',', '.')) : NaN;
  if (!isFinite(v)) v = def;
  if (min != null) v = Math.max(min, v);
  if (max != null) v = Math.min(max, v);
  return v;
}

/* =====================================================================
   Form: board (create / settings, delete)
   ===================================================================== */
/* Deleting a board from the board's own menus (≡, Ajustes, the page bar): it asks first, and
   the tokens, the drawings and the turn order go with it. The chat's messages stay. */
function confirmDeleteBoard(b) {
  if (!b || !isMestre() || !canWrite()) return;
  showModal('<div class="bd-form"><h2 id="bdDelTitle">Excluir tabuleiro</h2>' +
    '<p class="lede">Excluir <b>' + esc(b.name) + '</b> com todos os tokens, desenhos e a ordem de turno dele? As mensagens do chat ficam. Não dá para desfazer.</p>' +
    '<div class="form-err" id="bdDelErr" role="alert"></div>' +
    '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="bdDelNo">Cancelar</button>' +
    '<button class="btn danger solid" type="button" id="bdDelYes">' + svg(ICON.trash, 15) + 'Excluir tabuleiro</button></div></div>');
  modal.setAttribute('aria-labelledby', 'bdDelTitle');
  $('bdDelNo').onclick = function () { closeModal(); };
  $('bdDelYes').onclick = function () {
    var yes = $('bdDelYes'); yes.disabled = true; modalOpen.busy = true;
    BoardOps.remove(b).then(function () {
      closeModal(true); toast('Tabuleiro excluído.');
      if (S.route && S.route.page === 'board' && S.route.boardId === b.id) go('#tabuleiros', true);
    }, function (er) { if (!modalOpen) return; modalOpen.busy = false; yes.disabled = false; $('bdDelErr').textContent = errorText(er); });
  };
  setTimeout(function () { var no = $('bdDelNo'); if (no) no.focus(); }, 30);
}

function openBoardForm(b) {
  var editing = !!b, f = boardFull(b), size = +f.gridSize || 70;
  var maps = W.maps.filter(function (m) { return m.image && m.image.ref; }).sort(byName);
  var unitTxt = esc(f.unit || 'jd');
  var html = '<form id="bdForm" class="bd-form" novalidate><h2 id="bfTitle">' + (editing ? 'Configurar tabuleiro' : 'Novo tabuleiro') + '</h2>' +
    '<div class="field" id="f_bfName"><label for="bfName">Nome</label><input type="text" id="bfName" maxlength="80" autocomplete="off" placeholder="Ex.: Ruínas de Ludgrim" value="' + esc(editing ? b.name : '') + '"><div class="err" id="err_bfName"></div></div>' +
    (W.store.canUpload ? imageFieldHtml('bimg', 'Imagem do mapa', 'Opcional. PNG, JPG, WebP ou GIF, até 20 MB. Sem imagem, o tabuleiro tem um fundo liso.') : '') +
    (maps.length ? '<div class="field"><label for="bfMap">Ou use a imagem de um mapa do Mundo</label><select id="bfMap"><option value="">Nenhum</option>' +
      maps.map(function (m) { return '<option value="' + esc(m.id) + '">' + esc(mapPathText(m.id)) + '</option>'; }).join('') + '</select><span class="hint-text">Uma cópia da imagem vai para o tabuleiro.</span></div>' : '') +
    '<div class="bd-grid2" id="bfPlain"' + (f.image ? ' hidden' : '') + '><div class="field"><label for="bfCols">Largura do fundo liso (células)</label><input type="number" id="bfCols" min="4" max="200" step="1" value="' + Math.round(f.width / size) + '"></div>' +
      '<div class="field"><label for="bfRows">Altura do fundo liso (células)</label><input type="number" id="bfRows" min="4" max="200" step="1" value="' + Math.round(f.height / size) + '"></div>' +
      '<div class="field"><label for="bfBg">Cor do fundo</label><input type="color" id="bfBg" value="' + esc(f.bg) + '"></div></div>' +
    '<h3 class="bd-sec">Grade</h3><div class="bd-grid2">' +
      '<div class="field"><label for="bfGrid">Tipo</label><select id="bfGrid">' + BOARD_GRIDS.map(function (g) { return '<option value="' + g.id + '"' + (g.id === f.gridType ? ' selected' : '') + '>' + esc(g.label) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label for="bfSize">Tamanho da célula (px)</label><input type="number" id="bfSize" min="8" max="1000" step="0.5" value="' + boardNumAttr(size) + '"></div>' +
      '<div class="field"><label for="bfGx">Deslocamento horizontal (px)</label><input type="number" id="bfGx" step="0.5" value="' + boardNumAttr(+f.gridX || 0) + '"></div>' +
      '<div class="field"><label for="bfGy">Deslocamento vertical (px)</label><input type="number" id="bfGy" step="0.5" value="' + boardNumAttr(+f.gridY || 0) + '"></div>' +
      '<div class="field"><label for="bfGc">Cor da grade</label><input type="color" id="bfGc" value="' + esc(f.gridColor) + '"></div>' +
      '<div class="field"><label for="bfGo">Opacidade da grade</label><input type="range" id="bfGo" min="0" max="100" step="5" value="' + Math.round((+f.gridOpacity || 0) * 100) + '"></div>' +
      '<div class="field"><label for="bfScale">Cada célula vale</label><input type="number" id="bfScale" min="0.1" step="0.1" value="' + boardNumAttr(+f.scale || 1) + '"></div>' +
      '<div class="field"><label for="bfUnit">Unidade</label><input type="text" id="bfUnit" maxlength="12" autocomplete="off" placeholder="jd" value="' + unitTxt + '"></div></div>' +
    '<span class="hint-text">Para alinhar com a grade desenhada na imagem, use a ferramenta <b>Grade</b> no tabuleiro e arraste por cima de uma célula.</span>' +
    '<h3 class="bd-sec">Visão</h3>' +
    boardCheckHtml('bfDyn', 'Luz dinâmica', 'Cada jogador vê só o que os próprios tokens enxergam. Paredes e portas fechadas barram a visão.', f.dynamicLight) +
    boardCheckHtml('bfDay', 'Luz do dia', 'Com a luz dinâmica, tudo que está à vista fica iluminado. Desligada, só a luz dos tokens (tochas, lanternas) e a visão no escuro mostram o mapa.', f.globalLight) +
    boardCheckHtml('bfExp', 'Modo explorador', 'O que os jogadores já viram continua no mapa, mais escuro e sem os tokens.', f.explorer) +
    boardCheckHtml('bfFog', 'Névoa manual', 'Os jogadores veem só as áreas que você revelar com a ferramenta Névoa.', f.fog) +
    flagHtml('bvis', b, true) +
    (editing ? '<div id="bfDelBox"><button class="btn danger" type="button" id="bfDel">' + svg(ICON.trash, 15) + 'Excluir tabuleiro</button></div>' : '') +
    '<div class="form-err" id="bfErr" role="alert"></div>' +
    '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="bfCancel">Cancelar</button><button class="btn primary" type="submit" id="bfSave">' + (editing ? 'Salvar' : 'Criar tabuleiro') + '</button></div></form>';
  var img = null;
  showModal(html, function () { if (img) img.dispose(); });
  modal.setAttribute('aria-labelledby', 'bfTitle');
  var name = $('bfName');
  function plainShown() { var p = $('bfPlain'); if (p) p.hidden = !!((img && (img.file || (f.image && !img.removed))) || ($('bfMap') && $('bfMap').value)); }
  if (W.store.canUpload) img = imageField('bimg', {
    removable: editing,
    existing: editing && b.image && b.image.ref ? W.store.imageUrl(b.image.ref).then(function (u) { return { url: u, name: 'Imagem atual', dims: b.image.w ? b.image.w + ' × ' + b.image.h + ' px' : '' }; }) : null,
    onPick: function (file) { if (!name.value.trim()) name.value = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 80); var ms = $('bfMap'); if (ms) ms.value = ''; plainShown(); }
  });
  var rm = $('pvrm_bimg'); if (rm) rm.addEventListener('click', function () { setTimeout(plainShown, 0); });
  var mapSel = $('bfMap');
  if (mapSel) mapSel.onchange = function () { var m = mapById(mapSel.value); if (m && !name.value.trim()) name.value = m.name; plainShown(); };
  name.addEventListener('input', function () { if (name.value.trim()) { $('err_bfName').textContent = ''; $('f_bfName').classList.remove('invalid'); } });
  $('bfCancel').onclick = function () { closeModal(); };
  var del = $('bfDel');
  if (del) del.onclick = function () {
    $('bfDelBox').innerHTML = '<div class="confirm" role="alert"><span>Excluir <b>' + esc(b.name) + '</b> e todos os tokens dele? Não dá para desfazer.</span>' +
      '<div class="btn-row"><button class="btn danger solid" type="button" id="bfDelYes">Excluir tabuleiro</button><button class="btn ghost" type="button" id="bfDelNo">Cancelar</button></div></div>';
    $('bfDelNo').onclick = function () { closeModal(); openBoardForm(boardById(b.id) || b); };
    $('bfDelYes').onclick = function () {
      var yes = $('bfDelYes'); yes.disabled = true; modalOpen.busy = true;
      BoardOps.remove(b).then(function () { closeModal(true); toast('Tabuleiro excluído.'); go('#tabuleiros', true); },
        function (er) { if (modalOpen) { modalOpen.busy = false; yes.disabled = false; } toast(errorText(er), true); });
    };
    $('bfDelYes').focus();
  };
  var btn = $('bfSave');
  $('bdForm').onsubmit = function (e) {
    e.preventDefault();
    if (modalOpen.busy) return;
    var n = name.value.trim();
    if (!n) { $('err_bfName').textContent = 'Informe o nome do tabuleiro.'; $('f_bfName').classList.add('invalid'); name.focus(); return; }
    if (img && !img.file && $('err_bimg').textContent) { img.drop.focus(); return; }
    var cell = numVal('bfSize', 70, 8, 1000);
    var fields = { name: n, gridType: $('bfGrid').value, gridSize: cell, gridX: numVal('bfGx', 0), gridY: numVal('bfGy', 0), gridColor: $('bfGc').value, gridOpacity: numVal('bfGo', 35, 0, 100) / 100,
      scale: numVal('bfScale', 1, 0.1), unit: $('bfUnit').value.trim() || 'jd', bg: $('bfBg').value,
      width: Math.round(numVal('bfCols', 30, 4, 200) * cell), height: Math.round(numVal('bfRows', 20, 4, 200) * cell),
      dynamicLight: $('bfDyn').checked, globalLight: $('bfDay').checked, explorer: $('bfExp').checked, fog: $('bfFog').checked,
      visible: flagVal('bvis', b), sharedWith: shareVal('bvis', b) };
    var fromMap = mapSel && mapSel.value && !(img && img.file) ? mapById(mapSel.value) : null;
    modalOpen.busy = true; btn.disabled = true; $('bfCancel').disabled = true; $('bfErr').textContent = '';
    btn.textContent = (img && img.file) || fromMap ? 'Enviando imagem…' : 'Salvando…';
    var pick = img && img.file ? Promise.resolve({ file: img.file, dims: img.dims }) : fromMap ? copyMapImage(fromMap) : Promise.resolve(null);
    pick.then(function (p) { return BoardOps.save(b, fields, p && p.file, p && p.dims, !!(img && img.removed)); }).then(function (id) {
      closeModal(true);
      toast(editing ? 'Tabuleiro salvo.' : 'Tabuleiro criado.');
      if (!editing) go(boardHref(id));
    }, function (er) {
      if (!modalOpen) return;
      modalOpen.busy = false; btn.disabled = false; $('bfCancel').disabled = false; btn.textContent = editing ? 'Salvar' : 'Criar tabuleiro';
      $('bfErr').textContent = errorText(er);
    });
  };
}
function boardNumAttr(n) { return String(Math.round(n * 100) / 100); }

/* =====================================================================
   Form: token (the Mestre's)
   ===================================================================== */
function openTokenForm(tok, at) {
  var editing = !!tok, b = BoardView.board(), unit = esc((b && b.unit) || 'jd');
  var t = Object.assign({ name: '', size: 1, rotation: 0, color: '#f59e0b', layer: BoardView.layer(), ownerIds: [], sight: true, sightRange: 0, darkvision: 0,
    lightBright: 0, lightDim: 0, hp: null, hpMax: null, fp: null, fpMax: null, showName: true, characterId: null }, tok || {});
  var players = W.users.filter(function (u) { return u.role !== 'mestre'; }).sort(byName);
  var chars = W.characters.slice().sort(byName);
  var num = function (id, label, v, extra) { return '<div class="field"><label for="' + id + '">' + label + '</label><input type="number" id="' + id + '" ' + (extra || 'min="0" step="0.5"') + ' value="' + (v == null ? '' : esc(v)) + '"></div>'; };
  var html = '<form id="tkForm" class="bd-form" novalidate><h2 id="tfTitle">' + (editing ? 'Editar token' : 'Novo token') + '</h2>' +
    '<div class="field" id="f_tfName"><label for="tfName">Nome</label><input type="text" id="tfName" maxlength="80" autocomplete="off" placeholder="Ex.: Bandido" value="' + esc(t.name) + '"><div class="err" id="err_tfName"></div></div>' +
    (chars.length ? '<div class="field"><label for="tfChar">Personagem que o token representa</label><select id="tfChar"><option value="">Nenhum</option>' +
      chars.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === t.characterId ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select><span class="hint-text">Sem imagem própria, o token usa a do personagem.</span></div>' : '') +
    (W.store.canUpload ? imageFieldHtml('timg', 'Imagem do token', 'Opcional. Sem imagem (nem a do personagem), o token mostra as iniciais.') : '') +
    '<div class="bd-grid2">' + num('tfSize', 'Tamanho (células)', t.size, 'min="0.25" max="20" step="0.25"') +
      '<div class="field"><label for="tfColor">Cor da borda</label><input type="color" id="tfColor" value="' + esc(t.color || '#f59e0b') + '"></div>' +
      '<div class="field"><label for="tfLayer">Camada</label><select id="tfLayer">' + BOARD_LAYERS.map(function (l) { return '<option value="' + l.id + '"' + (l.id === t.layer ? ' selected' : '') + '>' + esc(l.label) + '</option>'; }).join('') + '</select></div>' +
      num('tfRot', 'Direção (graus; 0 é para cima)', +t.rotation || 0, 'min="0" max="359.9" step="1"') +
      '<div class="field"><label for="tfHp">PV atual / máximo</label><div class="bd-pair"><input type="number" id="tfHp" step="1" value="' + (t.hp == null ? '' : esc(t.hp)) + '" aria-label="PV atual"><span>/</span><input type="number" id="tfHpMax" min="0" step="1" value="' + (t.hpMax == null ? '' : esc(t.hpMax)) + '" aria-label="PV máximo"></div></div>' +
      '<div class="field"><label for="tfFp">PF atual / máximo</label><div class="bd-pair"><input type="number" id="tfFp" step="1" value="' + (t.fp == null ? '' : esc(t.fp)) + '" aria-label="PF atual"><span>/</span><input type="number" id="tfFpMax" min="0" step="1" value="' + (t.fpMax == null ? '' : esc(t.fpMax)) + '" aria-label="PF máximo"></div></div></div>' +
    '<span class="hint-text">PV e PF aparecem como as bolhas em cima do token (e as barras embaixo dele) para você e para quem o controla. Com uma ficha no personagem, deixe em branco e use <b>Da ficha</b>.</span>' +
    (t.characterId || chars.length ? '<div><button class="btn" type="button" id="tfFromSheet">' + svg(ICON.sheet || ICON.edit, 15) + 'Da ficha</button></div>' : '') +
    (players.length ? '<div class="field"><span class="lab">Controlado por</span><div class="vis-users">' + players.map(function (u) {
      return '<label class="vis-user"><input type="checkbox" data-owner="' + esc(u.id) + '"' + ((t.ownerIds || []).indexOf(u.id) >= 0 ? ' checked' : '') + '><span>' + esc(u.name) + '</span></label>';
    }).join('') + '</div><span class="hint-text">Quem controla move o token e, com a luz dinâmica, vê pelos olhos dele.</span></div>' : '') +
    boardCheckHtml('tfShow', 'Nome à vista de todos', 'Desmarcado, só você e quem controla o token veem o nome.', t.showName !== false) +
    '<h3 class="bd-sec">Visão e luz</h3>' +
    boardCheckHtml('tfSight', 'Enxerga', 'Na luz dinâmica, quem controla o token vê o que ele vê.', t.sight) +
    '<div class="bd-grid2">' + num('tfRange', 'Alcance da visão (' + unit + ', 0 é sem limite)', t.sightRange) + num('tfDark', 'Visão no escuro (' + unit + ')', t.darkvision) +
      num('tfBright', 'Luz forte (' + unit + ')', t.lightBright) + num('tfDim', 'Luz fraca (' + unit + ')', t.lightDim) + '</div>' +
    '<span class="hint-text">Uma tocha: luz forte 2 e fraca 4. Um token na camada Mestre com luz vira uma fonte de luz que os jogadores não veem.</span>' +
    (editing ? '<div id="tfDelBox"><button class="btn danger" type="button" id="tfDel">' + svg(ICON.trash, 15) + 'Excluir token</button></div>' : '') +
    '<div class="form-err" id="tfErr" role="alert"></div>' +
    '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="tfCancel">Cancelar</button><button class="btn primary" type="submit" id="tfSave">' + (editing ? 'Salvar token' : 'Criar token') + '</button></div></form>';
  var img = null;
  showModal(html, function () { if (img) img.dispose(); });
  modal.setAttribute('aria-labelledby', 'tfTitle');
  var name = $('tfName');
  if (W.store.canUpload) img = imageField('timg', {
    removable: editing,
    existing: editing && tok.image && tok.image.ref ? W.store.imageUrl(tok.image.ref).then(function (u) { return { url: u, name: 'Imagem atual', dims: '' }; }) : null,
    onPick: function (file) { if (!name.value.trim()) name.value = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 80); }
  });
  var cs = $('tfChar');
  if (cs) cs.onchange = function () { var c = W.charIdx[cs.value]; if (c && !name.value.trim()) name.value = c.name; };
  // PV and PF of the sheet of the character picked (the maximums, and full).
  var fs = $('tfFromSheet');
  if (fs) fs.onclick = function () {
    var v = boardSheetVitals(cs ? cs.value : t.characterId);
    if (!v) { toast('Esse personagem não tem uma ficha que você possa ver.', true); return; }
    $('tfHp').value = v.hp; $('tfHpMax').value = v.hp; $('tfFp').value = v.fp; $('tfFpMax').value = v.fp;
  };
  name.addEventListener('input', function () { if (name.value.trim()) { $('err_tfName').textContent = ''; $('f_tfName').classList.remove('invalid'); } });
  $('tfCancel').onclick = function () { closeModal(); };
  var del = $('tfDel');
  if (del) del.onclick = function () {
    $('tfDelBox').innerHTML = '<div class="confirm" role="alert"><span>Excluir o token <b>' + esc(tok.name || 'sem nome') + '</b>?</span><div class="btn-row"><button class="btn danger solid" type="button" id="tfDelYes">Excluir</button><button class="btn ghost" type="button" id="tfDelNo">Cancelar</button></div></div>';
    $('tfDelNo').onclick = function () { $('tfDelBox').innerHTML = ''; };
    $('tfDelYes').onclick = function () { closeModal(true); BoardView.removeToken(tok); };
    $('tfDelYes').focus();
  };
  var btn = $('tfSave');
  $('tkForm').onsubmit = function (e) {
    e.preventDefault();
    if (modalOpen.busy) return;
    var n = name.value.trim();
    if (!n) { $('err_tfName').textContent = 'Dê um nome ao token.'; $('f_tfName').classList.add('invalid'); name.focus(); return; }
    if (img && !img.file && $('err_timg').textContent) { img.drop.focus(); return; }
    var hp = $('tfHp').value.trim(), hpMax = $('tfHpMax').value.trim(), fp = $('tfFp').value.trim(), fpMax = $('tfFpMax').value.trim();
    var bright = numVal('tfBright', 0, 0, 1000), dim = numVal('tfDim', 0, 0, 1000);
    var fields = { boardId: b.id, name: n, characterId: cs ? (cs.value || (t.characterId && !W.charIdx[t.characterId] && rawHas('characters', t.characterId) ? t.characterId : null)) : (t.characterId || null),
      size: numVal('tfSize', 1, 0.25, 20), rotation: Math.round((((numVal('tfRot', 0) % 360) + 360) % 360) * 10) / 10 % 360, color: $('tfColor').value, layer: $('tfLayer').value,
      ownerIds: [].map.call(modal.querySelectorAll('input[data-owner]:checked'), function (el) { return el.getAttribute('data-owner'); }),
      showName: $('tfShow').checked, sight: $('tfSight').checked, sightRange: numVal('tfRange', 0, 0, 1000), darkvision: numVal('tfDark', 0, 0, 1000),
      lightBright: bright, lightDim: Math.max(dim, bright), hp: hp === '' ? null : Math.round(+hp) || 0, hpMax: hpMax === '' ? null : Math.max(0, Math.round(+hpMax) || 0),
      fp: fp === '' ? null : Math.round(+fp) || 0, fpMax: fpMax === '' ? null : Math.max(0, Math.round(+fpMax) || 0) };
    if (!editing) { fields.x = at.x; fields.y = at.y; }
    modalOpen.busy = true; btn.disabled = true; $('tfCancel').disabled = true; $('tfErr').textContent = '';
    btn.textContent = img && img.file ? 'Enviando imagem…' : 'Salvando…';
    BoardOps.saveToken(tok, fields, img && img.file, img && img.dims, !!(img && img.removed)).then(function (id) {
      closeModal(true);
      toast(editing ? 'Token salvo.' : 'Token criado.');
      BoardView.select(id);
    }, function (er) {
      if (!modalOpen) return;
      modalOpen.busy = false; btn.disabled = false; $('tfCancel').disabled = false; btn.textContent = editing ? 'Salvar token' : 'Criar token';
      $('tfErr').textContent = errorText(er);
    });
  };
}

/* =====================================================================
   The board on screen, laid out as the editor of Roll20: the toolbar
   down the left (tools, the Mestre's tools and the layers), the board in
   the middle with the zoom on its right and the page bar over its top,
   the sidebar on the right (Chat, Arte, Diário, Ajustes) and the floating
   windows (dice, turn order, characters, notes) over the board.
   One canvas, redrawn on each change; the board's pixels go to the
   screen by the view (x, y, zoom z). Kept between redraws of the page
   (renderPage), so the tool, the selection and the view stay as they are
   while data arrives.
   The selected token gets, over it, the bubbles of its PV and PF and,
   under it, its buttons (markers, turn order, settings, more); a right
   click on it opens the same as a menu.
   ===================================================================== */
var BoardView = (function () {
  var root = $('view-board');
  // The toolbar. box: a window or a menu of its own (it opens over any tool); sec: a heading.
  var TOOLS = [
    { id: 'menu', label: 'Menu', icon: BOARD_ICON.menu, keys: '', box: true },
    { sep: true },
    { id: 'select', label: 'Selecionar', key: 'v', icon: BOARD_ICON.select, keys: 'V' },
    { id: 'pan', label: 'Mover a vista', key: 'h', icon: BOARD_ICON.hand, keys: 'H · botão direito' },
    { sec: 'Ferram.' },
    { id: 'draw', label: 'Desenhar', key: 'd', icon: BOARD_ICON.brush, keys: 'D' },
    { id: 'text', label: 'Texto', key: 't', icon: BOARD_ICON.text, keys: 'T' },
    { id: 'ruler', label: 'Medir', key: 'r', icon: BOARD_ICON.ruler, keys: 'R' },
    { id: 'dice', label: 'Rolador de dados', key: 'x', icon: BOARD_ICON.d20, keys: 'X', box: true },
    { id: 'turns', label: 'Ordem de turno', key: 'o', icon: BOARD_ICON.turns, keys: 'O', box: true },
    { id: 'ping', label: 'Apontar', key: 'p', icon: ICON.pin, keys: 'P · ou segure o clique' },
    { sec: 'Mestre', gm: true },
    { id: 'fog', label: 'Névoa', key: 'f', icon: BOARD_ICON.fog, keys: 'F', gm: true },
    { id: 'walls', label: 'Paredes, portas e luz', key: 'w', icon: BOARD_ICON.bulb, keys: 'W', gm: true },
    { id: 'grid', label: 'Alinhar a grade', key: 'g', icon: BOARD_ICON.grid, keys: 'G', gm: true }
  ];
  // The layers, at the foot of the toolbar (the Mestre's). Luz is the walls' tool: walls and doors
  // are where the light stops, as on Roll20's lighting layer.
  var LAYER_BTNS = [{ id: 'tokens', label: 'Tokens', icon: ICON.user }, { id: 'gm', label: 'Mestre', icon: BOARD_ICON.crown },
    { id: 'map', label: 'Mapa', icon: BOARD_ICON.mapLayer }, { id: 'fore', label: 'Frente', icon: BOARD_ICON.tree }, { id: 'light', label: 'Luz', icon: BOARD_ICON.bulb }];
  var SIDE_TABS = [{ id: 'chat', label: 'Chat', icon: BOARD_ICON.chat }, { id: 'art', label: 'Arte', icon: BOARD_ICON.art, gm: true },
    { id: 'journal', label: 'Diário', icon: BOARD_ICON.journal }, { id: 'settings', label: 'Ajustes', icon: BOARD_ICON.gear }];
  var OPT_KEY = 'hounds_board_tools_v1', opt = { shape: 'free', stroke: '#ef4444', fill: null, width: 'regular',
    tColor: '#ffffff', tBg: '#0b1222', font: 'sans', tSize: 'm', bold: false, italic: false,
    mShape: 'line', mSnap: 'center', mFade: 'linger', mShare: true, mCells: true,
    // The dice window: who sees the roll (all, gm: you and the Mestre, secret: only the Mestre).
    dMode: 'all', dExplode: false, dExpr: '3d6', dNh: '', dAdv: false,
    // The sidebar: open, the tab; the cards of messages over the board while the chat is out of sight.
    side: window.innerWidth > 760, tab: 'chat', cards: true, people: true };
  try { Object.assign(opt, JSON.parse(lstore(OPT_KEY) || '{}') || {}); } catch (e) {}
  if (window.innerWidth <= 760) opt.side = false; // on a phone the sidebar covers the board: it starts closed
  function saveOpt() { lstore(OPT_KEY, JSON.stringify(opt)); }
  var vp = null, cv = null, ctx = null, hint = null, msg = null, rail = null, opts = null, rollsEl = null, textIn = null;
  var stage = null, side = null, hud = null, ctxEl = null, menuEl = null, alertsEl = null, peopleEl = null, pagesEl = null;
  // Offscreen: the darkness and one viewer's sight (screen size), the explored areas and the probe
  // that finds them (one pixel per fog cell; no image is ever drawn there, so it can be read); the
  // foreground, cut by the darkness before it goes over the tokens.
  var dark = document.createElement('canvas'), dctx = dark.getContext('2d');
  var tmp = document.createElement('canvas'), tctx = tmp.getContext('2d');
  var fogC = document.createElement('canvas'), fogX = fogC.getContext('2d');
  var probe = document.createElement('canvas'), prx = probe.getContext('2d', { willReadFrequently: true });
  var probe2 = document.createElement('canvas'), pr2 = probe2.getContext('2d');
  var foreC = document.createElement('canvas'), foreX = foreC.getContext('2d');
  var st = { id: null, board: null, tokens: [], unTok: null, view: { x: 0, y: 0, z: 1 }, viewOk: false, fitted: false, fitZ: 1,
    // asPlayer: the Mestre sees as the players do; asUser: as that one player only (Roll20's ?viewas=).
    tool: 'select', layer: 'tokens', wallMode: 'wall', fogMode: 'show', asPlayer: false, asUser: null,
    sel: null, press: null, drag: null, hover: null, ruler: null, draft: null, rect: null, pings: [], moved: {}, confirm: null,
    rot: null, turned: {},
    // Drawings and texts (boardDrawings): the list, the selected one, one being dragged or drawn.
    drawings: [], unDraw: null, selD: null, dragD: null, dMoved: {}, sketch: null, textEdit: null,
    // The options box: an open color palette; the rulers of the others.
    palette: null, rulers: {}, optsStale: false, rulerSent: 0, optsClosed: null,
    // The buttons over the selected token: a bubble being typed, the markers' box; the right-click
    // menu; the ≡ menu; who is at the table (presence, by broadcast).
    hudEdit: null, hudMarks: false, ctx: null, menuOpen: false, here: {}, lastHere: 0,
    // The token whose turn it is (BoardTurns), for its glow; worked out on each frame.
    turnTok: null };
  var light = { dirty: true, viewers: [], lights: [], vis: {} };
  var ex = { id: null, key: null, epoch: null, dims: null, bits: null, timer: 0 };
  var imgs = {}, raf = 0, pingOn = false, viewTimer = 0, space = false, pts = {}, pinch = null, hereTimer = 0, unread = 0, markPaths = {};

  function gm() { return isMestre(); }
  function canEdit() { return gm() && canWrite(); }
  function owns(t) { return !!me() && (t.ownerIds || []).indexOf(me()) >= 0; }
  function canMove(t) { return canWrite() && (gm() || (owns(t) && t.layer === 'tokens')); }
  // As the Mestre sees as the players do: a token of the player he sees as (or of any player).
  function viewerOwns(t) { return st.asUser ? (t.ownerIds || []).indexOf(st.asUser) >= 0 : (t.ownerIds || []).length > 0; }
  function fullView() { return gm() && !st.asPlayer; }
  // The box of a tile (map, foreground): size cells on the longer side, the image's proportions.
  function tileBox(t) {
    var s = (+t.size || 1) * cell(), im = t.image && t.image.w && t.image.h ? t.image : null, k = im ? im.w / im.h : 1;
    return k >= 1 ? { w: s, h: s / k } : { w: s * k, h: s };
  }
  function tokById(id) { for (var i = 0; i < st.tokens.length; i++) if (st.tokens[i].id === id) return st.tokens[i]; return null; }
  // Where a token is drawn: being dragged (only the Mestre's drag moves the light), just moved, or saved.
  function posOf(t, forLight) {
    if (st.drag && st.drag.id === t.id && (!forLight || gm())) return { x: st.drag.x, y: st.drag.y };
    var m = st.moved[t.id]; if (m) return m;
    return { x: +t.x, y: +t.y };
  }
  /* Rotation: where a token faces, in degrees clockwise from up (north). Like posOf: being turned by
     its handle (rot), just turned (turned, until the store has it) or saved. Only the drawing turns:
     the sight of a token sees all around it. */
  function rotOf(t) {
    if (st.rot && st.rot.id === t.id) return st.rot.deg;
    var m = st.turned[t.id]; if (m) return m.deg;
    return +t.rotation || 0;
  }
  function normDeg(d) { var n = Math.round((((+d || 0) % 360) + 360) % 360 * 10) / 10; return n >= 360 ? 0 : n; }
  // The grid's facings: the six sides of a hex (hexes in rows have them at 30°, 90°...), or eight directions.
  function facingStep() { return BoardGeo.isHex(st.board) ? 60 : 45; }
  function snapFacing(d) { var off = st.board.gridType === 'hex' ? 30 : 0, s = facingStep(); return normDeg(off + Math.round((d - off) / s) * s); }
  // The next facing from the token's direction, clockwise (dir 1) or not (-1).
  function nextFacing(t, dir) { return snapFacing(rotOf(t) + dir * (facingStep() / 2 + 0.1)); }
  function tokR(t) { return Math.max(3, (+t.size || 1) * cell() / 2 * 0.9); }
  // The handle that turns the selected token: a little beyond its edge, the way it faces.
  function handlePos(t) {
    var p = posOf(t, false), a = rotOf(t) * Math.PI / 180, tb = tileBox(t), d = (boardIsTile(t) ? Math.hypot(tb.w, tb.h) / 2 : tokR(t) * 1.32) + 22 / st.view.z;
    return { x: p.x + Math.sin(a) * d, y: p.y - Math.cos(a) * d };
  }
  function onHandle(t, x, y) { var h = handlePos(t); return Math.hypot(x - h.x, y - h.y) <= 11 / st.view.z; }
  function turnTo(t, deg) {
    if (!t || !canMove(t)) return;
    deg = normDeg(deg);
    if (Math.abs(deg - rotOf(t)) < 0.05) return;
    st.turned[t.id] = { deg: deg, at: Date.now() };
    requestDraw(); renderHud();
    BoardOps.patchToken(t, { rotation: deg }).catch(function (er) { delete st.turned[t.id]; requestDraw(); renderHud(); toast(errorText(er), true); });
  }
  function cell() { return BoardGeo.size(st.board); }
  function ppu() { return cell() / (+st.board.scale || 1); }
  function requestDraw() { if (!raf) raf = requestAnimationFrame(draw); }
  function dirtyLight() { light.dirty = true; requestDraw(); }

  // ----- the frame -----
  function toolBtn(t) {
    return '<button class="bd-tool" type="button" data-tool="' + t.id + '"' + (t.gm ? ' data-gm' : '') + ' aria-pressed="false" aria-label="' + esc(t.label + (t.keys ? ' (' + t.keys + ')' : '')) +
      '" data-tip="' + esc(t.label) + '" data-keys="' + esc(t.keys || '') + '"' + (t.box ? ' aria-haspopup="true"' : '') + '>' + svg(t.icon, 19) + '</button>';
  }
  function build() {
    root.innerHTML = '<div class="bd-shell">' +
      '<nav class="bd-tools" id="bdRail" role="toolbar" aria-label="Ferramentas" aria-orientation="vertical">' +
        TOOLS.map(function (t) {
          if (t.sep) return '<span class="bd-sep"></span>';
          if (t.sec) return '<span class="bd-sec"' + (t.gm ? ' data-gm' : '') + '>' + esc(t.sec) + '</span>';
          return toolBtn(t);
        }).join('') +
        '<span class="bd-grow"></span><span class="bd-sec" data-gm>Camadas</span>' +
        LAYER_BTNS.map(function (l) {
          return '<button class="bd-layer" type="button" data-layer="' + l.id + '" data-gm aria-pressed="false" aria-label="Camada: ' + esc(l.label) + '" data-tip="Camada: ' + esc(l.label) + '" data-keys="">' + svg(l.icon, 17) + '<span>' + esc(l.label) + '</span></button>';
        }).join('') + '</nav>' +
      '<div class="bd-stage" id="bdStage">' +
        '<div class="bd-vp t-select" id="bdVp" tabindex="0" aria-label="Tabuleiro. Arraste para mover a vista; roda do mouse ou dois dedos para zoom.">' +
          '<canvas id="bdCanvas"></canvas><div class="hint" id="bdHint" hidden></div><div class="bd-msg" id="bdMsg" hidden></div>' +
          '<input class="bd-text-in" id="bdTextIn" type="text" maxlength="500" aria-label="Texto no mapa" hidden>' +
          '<div class="bd-hud" id="bdHud" hidden></div></div>' +
        '<div class="bd-opts" id="bdOpts" role="dialog" aria-label="Opções da ferramenta" hidden></div>' +
        '<div class="bd-top"><span class="bd-pagename" id="bdTitle"></span><div class="bd-alerts" id="bdAlerts"></div></div>' +
        '<button class="bd-pagesbtn" type="button" id="bdPagesBtn" data-gm aria-pressed="false" aria-label="Páginas" title="Páginas: os tabuleiros e onde estão os jogadores">' + svg(BOARD_ICON.pages, 18) + '</button>' +
        '<div class="bd-pages" id="bdPages" role="dialog" aria-label="Páginas" hidden></div>' +
        '<div class="bd-zoom" role="group" aria-label="Zoom">' +
          '<button type="button" id="bdZIn" aria-label="Aproximar" title="Aproximar (+)">' + svg(ICON.plus, 16, 2.4) + '</button>' +
          '<output id="bdZVal" aria-live="polite" title="Zoom">100%</output>' +
          '<input type="range" id="bdZRange" min="0" max="1000" step="1" aria-label="Zoom">' +
          '<button type="button" id="bdZOut" aria-label="Afastar" title="Afastar (−)">' + svg(BOARD_ICON.minus, 16, 2.4) + '</button>' +
          '<button type="button" id="bdFit" aria-label="Ajustar à tela" title="Ajustar à tela (0)">' + svg(ICON.target, 16) + '</button></div>' +
        '<div class="bd-rolls" id="bdRolls" aria-live="polite"></div>' +
        '<div class="bd-people" id="bdPeople" aria-label="Na mesa agora"></div>' +
        '<div class="bd-menu" id="bdMenu" role="menu" hidden></div>' +
        '<div class="bd-ctx" id="bdCtx" role="menu" hidden></div>' +
        '<button class="bd-side-btn" type="button" id="bdSideBtn" aria-controls="bdSide" aria-pressed="true" title="Barra lateral" aria-label="Mostrar ou ocultar a barra lateral">' + svg(BOARD_ICON.side, 16) + '</button></div>' +
      '<aside class="bd-side" id="bdSide" aria-label="Barra lateral">' +
        '<div class="bd-tabs" role="tablist">' + SIDE_TABS.map(function (t) {
          return '<button type="button" role="tab" class="bd-tab" data-tab="' + t.id + '"' + (t.gm ? ' data-gm' : '') + ' aria-selected="false" aria-controls="bdPane_' + t.id + '" title="' + esc(t.label) + '">' +
            svg(t.icon, 18) + '<span>' + esc(t.label) + '</span>' + (t.id === 'chat' ? '<b class="bd-badge" id="bdUnread" hidden></b>' : '') + '</button>';
        }).join('') + '</div>' +
        SIDE_TABS.map(function (t) { return '<div class="bd-pane" role="tabpanel" id="bdPane_' + t.id + '" data-pane="' + t.id + '" hidden></div>'; }).join('') +
      '</aside></div>';
    vp = $('bdVp'); cv = $('bdCanvas'); ctx = cv.getContext('2d'); hint = $('bdHint'); msg = $('bdMsg');
    rail = $('bdRail'); opts = $('bdOpts'); rollsEl = $('bdRolls'); textIn = $('bdTextIn');
    stage = $('bdStage'); side = $('bdSide'); hud = $('bdHud'); ctxEl = $('bdCtx'); menuEl = $('bdMenu'); alertsEl = $('bdAlerts'); peopleEl = $('bdPeople'); pagesEl = $('bdPages');
    BoardWin.setHost(stage);
    root.querySelectorAll('[data-tool]').forEach(function (el) {
      el.addEventListener('click', function () { var id = el.getAttribute('data-tool'); pickTool(id); if (id !== 'menu') vp.focus({ preventScroll: true }); });
    });
    root.querySelectorAll('[data-layer]').forEach(function (el) { el.addEventListener('click', function () { pickLayer(el.getAttribute('data-layer')); vp.focus({ preventScroll: true }); }); });
    root.querySelectorAll('[data-tab]').forEach(function (el) { el.addEventListener('click', function () { showTab(el.getAttribute('data-tab')); }); });
    $('bdZIn').onclick = function () { zoomCenter(1.3); };
    $('bdZOut').onclick = function () { zoomCenter(1 / 1.3); };
    $('bdZRange').oninput = function () {
      var r = zoomRange(), nz = Math.exp(r.lo + (r.hi - r.lo) * (+(/** @type {AnyEl} */ (this)).value / 1000)), s = vpSize();
      zoomAt(nz / st.view.z, s.w / 2, s.h / 2);
    };
    $('bdFit').onclick = fit;
    $('bdPagesBtn').onclick = function () { BoardPages.toggle(); };
    $('bdSideBtn').onclick = function () { opt.side = !opt.side; saveOpt(); paintSide(); };
    BoardPages.mount(pagesEl);
    BoardChat.mount($('bdPane_chat'));
    BoardJournal.mount($('bdPane_journal'));
    BoardArt.mount($('bdPane_art'));
    wireInput();
    wireHud();
    wireOptions();
    wireText();
    wireMenus();
    wireSettings();
    if (typeof ResizeObserver === 'function') new ResizeObserver(function () { if (st.id) { if (!st.viewOk) fitOrRestore(); else if (st.fitted) fit(); requestDraw(); } }).observe(vp);
    window.addEventListener('hub:user', function () { if (st.id) { dirtyLight(); paintBar(); paintSide(); renderHud(); BoardChat.refreshAs(); BoardChat.rerender(); } });
  }
  // ----- the sidebar -----
  function paintSide() {
    if (opt.tab === 'art' && !gm()) opt.tab = 'chat';
    side.hidden = !opt.side;
    root.querySelector('.bd-shell').classList.toggle('side-off', !opt.side);
    $('bdSideBtn').setAttribute('aria-pressed', String(!!opt.side));
    root.querySelectorAll('[data-tab]').forEach(function (el) { var on = el.getAttribute('data-tab') === opt.tab; el.setAttribute('aria-selected', String(on)); el.classList.toggle('on', on); });
    root.querySelectorAll('[data-pane]').forEach(function (el) { el.hidden = el.getAttribute('data-pane') !== opt.tab; });
    if (opt.side && opt.tab === 'chat') { BoardChat.readAll(); rollsEl.innerHTML = ''; }
    if (opt.tab === 'settings') renderSettings();
    if (opt.tab === 'journal') BoardJournal.refresh();
    if (opt.tab === 'art') BoardArt.refresh();
    requestDraw();
  }
  function showTab(id) { opt.tab = id; opt.side = true; saveOpt(); paintSide(); }
  function chatShown() { return !!opt.side && opt.tab === 'chat' && !root.hidden && !document.hidden; }
  function paintUnread(n) { unread = n; var b = $('bdUnread'); if (b) { b.hidden = !n; b.textContent = n > 99 ? '99+' : String(n); } }
  // A message that came with the chat out of sight: a card over the board for a few seconds.
  function notify(m) {
    if (!opt.cards || !rollsEl) return;
    var card = document.createElement('div'); card.className = 'bd-roll-card'; card.innerHTML = BoardChat.cardHtml(m);
    card.addEventListener('click', function () { showTab('chat'); });
    rollsEl.appendChild(card);
    while (rollsEl.children.length > 3) rollsEl.removeChild(rollsEl.firstChild);
    setTimeout(function () { card.classList.add('going'); setTimeout(function () { if (card.parentNode) card.parentNode.removeChild(card); }, 600); }, 8000);
  }

  function paintBar() {
    var b = st.board, isGm = canEdit();
    // The page's name; for the Mestre, the ribbon when the players are on it.
    $('bdTitle').innerHTML = b ? (isGm && BoardPages.playersBoard() === st.id ? '<span title="Os jogadores estão aqui">' + svg(BOARD_ICON.ribbon, 13, 2.4) + '</span>' : '') + esc(b.name) : '';
    root.querySelectorAll('[data-gm]').forEach(function (el) { el.hidden = !isGm; });
    root.querySelectorAll('[data-tool]').forEach(function (el) {
      var id = el.getAttribute('data-tool');
      el.setAttribute('aria-pressed', String(id === 'dice' ? !!BoardWin.get('dice') : id === 'turns' ? BoardTurns.shown() : id === 'menu' ? st.menuOpen : id === st.tool));
    });
    root.querySelectorAll('[data-layer]').forEach(function (el) {
      var id = el.getAttribute('data-layer');
      el.setAttribute('aria-pressed', String(st.tool === 'walls' ? id === 'light' : id === st.layer));
    });
    $('bdPagesBtn').setAttribute('aria-pressed', String(BoardPages.isOpen()));
    paintZoom();
    // The other tools explain themselves in their box.
    hint.hidden = st.tool !== 'ping'; hint.textContent = 'Clique ou toque para apontar um lugar para todos.';
    vp.className = 'bd-vp t-' + st.tool;
    renderOptions();
  }
  function paintTool(id, on) {
    var el = root.querySelector('[data-tool="' + id + '"]'); if (el) el.setAttribute('aria-pressed', String(!!on));
    if (id === 'pages') { var p = $('bdPagesBtn'); if (p) p.setAttribute('aria-pressed', String(!!on)); }
  }
  // The layer being edited (the Mestre's); Luz is the walls' tool.
  function pickLayer(id) {
    if (!canEdit()) return;
    if (id === 'light') { setTool('walls'); return; }
    if (st.tool === 'walls') setTool('select');
    if (st.layer !== id) { st.layer = id; select(null); selectDrawing(null); toast('Camada em edição: ' + boardLayerLabel(id) + '.'); }
    paintBar(); requestDraw();
  }
  function zoomRange() { return { lo: Math.log(Math.max(st.fitZ * 0.25, 0.02)), hi: Math.log(Math.max(8, st.fitZ * 4)) }; }
  function paintZoom() {
    var zv = $('bdZVal'); if (!zv) return;
    zv.textContent = Math.round(st.view.z * 100) + '%';
    var r = zoomRange(), k = (Math.log(st.view.z) - r.lo) / ((r.hi - r.lo) || 1), zr = /** @type {HTMLInputElement} */ ($('bdZRange'));
    if (zr && document.activeElement !== zr) zr.value = String(Math.round(Math.max(0, Math.min(1, k)) * 1000));
  }

  // ----- view -----
  function vpSize() { var r = vp.getBoundingClientRect(); return { w: r.width, h: r.height, left: r.left, top: r.top }; }
  function toMap(cx, cy) { var r = vp.getBoundingClientRect(), v = st.view; return { x: (cx - r.left - v.x) / v.z, y: (cy - r.top - v.y) / v.z }; }
  function clampView() {
    var b = st.board, v = st.view, s = vpSize(); if (!b || !s.w) return;
    var mx = Math.min(120, s.w * 0.3), my = Math.min(120, s.h * 0.3);
    v.x = Math.min(s.w - mx, Math.max(mx - b.width * v.z, v.x));
    v.y = Math.min(s.h - my, Math.max(my - b.height * v.z, v.y));
  }
  function fitZoom() { var b = st.board, s = vpSize(); return b && s.w ? Math.min(s.w / b.width, s.h / b.height) * 0.94 : 1; }
  // The whole board on screen; it stays so (fitted) while the screen changes size, until a zoom or a pan.
  function fit() {
    var b = st.board, s = vpSize(); if (!b || !s.w || !s.h) return;
    st.fitZ = fitZoom(); st.view.z = st.fitZ;
    st.view.x = (s.w - b.width * st.view.z) / 2; st.view.y = (s.h - b.height * st.view.z) / 2;
    st.viewOk = true; st.fitted = true; viewChanged(false, true);
  }
  // The view this browser left the board in, or the whole board.
  function fitOrRestore() {
    var s = vpSize(); if (!st.board || !s.w || !s.h) return;
    st.fitZ = fitZoom();
    var v = null; try { v = JSON.parse(lstore('hounds_board_view_' + st.id) || 'null'); } catch (e) {}
    if (v && !v.fit && isFinite(v.x) && isFinite(v.y) && v.z > 0) { st.view = { x: v.x, y: v.y, z: v.z }; st.viewOk = true; viewChanged(true); }
    else fit();
  }
  function zoomAt(f, cx, cy) {
    var v = st.view, lo = Math.max(st.fitZ * 0.25, 0.02), hi = Math.max(8, st.fitZ * 4), nz = Math.min(hi, Math.max(lo, v.z * f));
    if (nz === v.z) return;
    v.x = cx - (cx - v.x) * (nz / v.z); v.y = cy - (cy - v.y) * (nz / v.z); v.z = nz;
    viewChanged();
  }
  function zoomCenter(f) { var s = vpSize(); zoomAt(f, s.w / 2, s.h / 2); }
  function viewChanged(noSave, keepFit) {
    if (!keepFit) st.fitted = false;
    clampView(); requestDraw();
    paintZoom(); closeCtx();
    if (noSave) return;
    clearTimeout(viewTimer);
    var id = st.id, v = st.view, fitted = st.fitted;
    viewTimer = setTimeout(function () { if (id) lstore('hounds_board_view_' + id, JSON.stringify({ x: Math.round(v.x), y: Math.round(v.y), z: v.z, fit: fitted })); }, 400);
  }
  function centerOn(x, y) { var s = vpSize(); st.view.x = s.w / 2 - x * st.view.z; st.view.y = s.h / 2 - y * st.view.z; viewChanged(); }

  // ----- images -----
  function imgOf(ref) {
    if (!ref || !W.store) return null;
    var e = imgs[ref];
    if (!e) {
      e = imgs[ref] = { el: null, ok: false };
      W.store.imageUrl(ref).then(function (u) {
        if (!u) return;
        var im = new Image();
        im.onload = function () { e.el = im; e.ok = true; requestDraw(); };
        im.src = u;
      });
    }
    return e.ok ? e.el : null;
  }
  var tokRef = boardTokenImageRef;

  // ----- light: who sees what -----
  function computeLight() {
    light.dirty = false;
    var b = st.board, isGm = gm(), asP = isGm && st.asPlayer;
    light.viewers = []; light.lights = []; light.vis = {};
    var segs = BoardGeo.blockers(b.walls), W0 = b.width, H0 = b.height, u = ppu();
    function boxAround(x, y, r) { return r > 0 ? [Math.max(0, x - r), Math.max(0, y - r), Math.min(W0, x + r), Math.min(H0, y + r)] : [0, 0, W0, H0]; }
    if (b.dynamicLight) {
      st.tokens.forEach(function (t) {
        var p = posOf(t, true), bright = (+t.lightBright || 0) * u, dim = Math.max(bright, (+t.lightDim || 0) * u);
        if (dim > 0) light.lights.push({ x: p.x, y: p.y, bright: bright, dim: dim, poly: BoardGeo.sight(p.x, p.y, segs, boxAround(p.x, p.y, dim)) });
        // The Mestre looks through all the players' tokens (or the one player he sees as); a player,
        // through their own.
        if (t.sight && !boardIsTile(t) && (isGm ? viewerOwns(t) : owns(t))) {
          var range = (+t.sightRange || 0) * u;
          light.viewers.push({ id: t.id, x: p.x, y: p.y, range: range, dv: (+t.darkvision || 0) * u, poly: BoardGeo.sight(p.x, p.y, segs, boxAround(p.x, p.y, range)) });
        }
      });
    }
    st.tokens.forEach(function (t) {
      var p = posOf(t, true);
      if (boardIsTile(t)) light.vis[t.id] = true;
      else if (t.layer === 'gm') light.vis[t.id] = isGm && !asP;
      else light.vis[t.id] = (isGm && !asP) || owns(t) || (asP && viewerOwns(t)) || seenAt(p.x, p.y);
    });
    // Not along a drag: only where a token stops counts as seen.
    if (b.dynamicLight && b.explorer && light.viewers.length && !st.drag) explore();
  }
  function revealedAt(x, y) {
    var on = false;
    (st.board.fogAreas || []).forEach(function (a) { if (x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h) on = !!a.show; });
    return on;
  }
  function seenAt(x, y) {
    var b = st.board;
    if (b.fog && !revealedAt(x, y)) return false;
    if (!b.dynamicLight) return true;
    return light.viewers.some(function (v) {
      var d = Math.hypot(x - v.x, y - v.y);
      if (v.range && d > v.range) return false;
      if (!BoardGeo.inPoly(x, y, v.poly)) return false;
      if (b.globalLight || (v.dv && d <= v.dv)) return true;
      return light.lights.some(function (l) { return Math.hypot(x - l.x, y - l.y) <= l.dim && BoardGeo.inPoly(x, y, l.poly); });
    });
  }
  // What viewer v sees and is lit, in white (soft: light fading to its edge; otherwise solid).
  function paintSeen(c, v, soft) {
    var b = st.board, TAU = Math.PI * 2;
    c.save();
    c.fillStyle = '#fff';
    if (b.globalLight) { c.beginPath(); BoardGeo.polyPath(c, v.poly); c.fill(); }
    else {
      light.lights.forEach(function (l) {
        c.save(); c.beginPath(); BoardGeo.polyPath(c, l.poly); c.clip();
        if (soft) {
          var g = c.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.dim), k = l.bright / l.dim;
          g.addColorStop(0, 'rgba(255,255,255,1)');
          if (k > 0.9) g.addColorStop(0.92, 'rgba(255,255,255,1)');
          else { if (k > 0) g.addColorStop(k, 'rgba(255,255,255,1)'); g.addColorStop(Math.min(0.9, k + 0.06), 'rgba(255,255,255,0.55)'); g.addColorStop(0.93, 'rgba(255,255,255,0.5)'); }
          g.addColorStop(1, 'rgba(255,255,255,0)');
          c.fillStyle = g;
        }
        c.beginPath(); c.arc(l.x, l.y, l.dim, 0, TAU); c.fill();
        c.restore();
      });
      if (v.dv > 0) { c.globalAlpha = soft ? 0.8 : 1; c.beginPath(); c.arc(v.x, v.y, v.dv, 0, TAU); c.fill(); c.globalAlpha = 1; }
    }
    c.globalCompositeOperation = 'destination-in';
    c.beginPath(); BoardGeo.polyPath(c, v.poly); c.fill();
    if (v.range) { c.beginPath(); c.arc(v.x, v.y, v.range, 0, TAU); c.fill(); }
    c.restore();
  }

  // ----- explored areas (shared by the group) -----
  function exSync() {
    var b = st.board; if (!b) return;
    var d = BoardGeo.fogDims(b), n = d.cols * d.rows, remote = BoardGeo.bitsDecode(b.explored || '', n), epoch = +b.exploredEpoch || 0;
    if (ex.id !== b.id || ex.key !== d.key || ex.epoch !== epoch) {
      clearTimeout(ex.timer);
      ex = { id: b.id, key: d.key, epoch: epoch, dims: d, bits: remote, timer: 0 };
      paintFog(); return;
    }
    if (BoardGeo.bitsMerge(ex.bits, remote)) paintFog();
    if (BoardGeo.bitsHasMore(ex.bits, remote)) exSave();
  }
  function paintFog() {
    var d = ex.dims; if (!d) return;
    fogC.width = d.cols; fogC.height = d.rows;
    var im = fogX.createImageData(d.cols, d.rows), px = im.data;
    for (var i = 0, n = d.cols * d.rows; i < n; i++) if (ex.bits[i >> 3] & (1 << (i & 7))) { px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = px[i * 4 + 3] = 255; }
    fogX.putImageData(im, 0, 0);
    requestDraw();
  }
  function explore() {
    var b = st.board; if (ex.id !== b.id || !ex.bits) exSync(); if (!ex.bits) return;
    var d = ex.dims;
    if (probe.width !== d.cols || probe.height !== d.rows) { probe.width = probe2.width = d.cols; probe.height = probe2.height = d.rows; }
    prx.setTransform(1, 0, 0, 1, 0, 0); prx.clearRect(0, 0, d.cols, d.rows);
    light.viewers.forEach(function (v) {
      pr2.setTransform(1, 0, 0, 1, 0, 0); pr2.globalCompositeOperation = 'source-over'; pr2.clearRect(0, 0, d.cols, d.rows);
      pr2.setTransform(1 / d.fc, 0, 0, 1 / d.fc, 0, 0);
      paintSeen(pr2, v, false);
      prx.drawImage(probe2, 0, 0);
    });
    var px = prx.getImageData(0, 0, d.cols, d.rows).data, gained = false;
    for (var i = 0, n = d.cols * d.rows; i < n; i++) {
      if (px[i * 4 + 3] < 96) continue;
      var k = i >> 3, bit = 1 << (i & 7);
      if (!(ex.bits[k] & bit)) { ex.bits[k] |= bit; gained = true; }
    }
    if (gained) { paintFog(); exSave(); }
  }
  // Saved a moment after the last change: what this browser saw joins what the board has.
  function exSave(now_) {
    if (!canWrite()) return;
    clearTimeout(ex.timer);
    var run = function () {
      ex.timer = 0;
      var b = st.board; if (!b || b.id !== ex.id || !ex.bits) return;
      var remote = BoardGeo.bitsDecode(b.explored || '', ex.dims.cols * ex.dims.rows);
      if ((+b.exploredEpoch || 0) !== ex.epoch || !BoardGeo.bitsHasMore(ex.bits, remote)) return;
      BoardOps.patch(b, { explored: BoardGeo.bitsEncode(ex.bits), exploredEpoch: ex.epoch }).catch(function (er) { console.warn('Hounds: não foi possível salvar as áreas exploradas.', er); });
    };
    if (now_) run(); else ex.timer = setTimeout(run, 1500);
  }

  // ----- drawing -----
  function draw() {
    raf = 0;
    if (!st.id || root.hidden || !cv) return;
    var b = st.board, dpr = window.devicePixelRatio || 1, s = vpSize();
    var w = Math.max(1, Math.round(s.w * dpr)), h = Math.max(1, Math.round(s.h * dpr));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, w, h);
    if (!b) return;
    if (light.dirty) computeLight();
    var v = st.view, z = v.z, isGm = gm(), asP = isGm && st.asPlayer;
    ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * v.x, dpr * v.y);
    // The map.
    ctx.fillStyle = b.bg || '#1e293b'; ctx.fillRect(0, 0, b.width, b.height);
    var bg = b.image && imgOf(b.image.ref);
    if (bg) ctx.drawImage(bg, 0, 0, b.width, b.height);
    drawLayer('map', z);
    st.tokens.forEach(function (t) { if (t.layer === 'map') drawToken(t); });
    // The grid, over the visible part of the board.
    if (b.gridType !== 'none' && +b.gridOpacity > 0 && cell() * z >= 6) {
      var x0 = Math.max(0, -v.x / z), y0 = Math.max(0, -v.y / z), x1 = Math.min(b.width, (s.w - v.x) / z), y1 = Math.min(b.height, (s.h - v.y) / z);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, b.width, b.height); ctx.clip();
      ctx.beginPath();
      if (BoardGeo.gridPath(ctx, b, x0, y0, x1, y1)) { ctx.strokeStyle = b.gridColor || '#000'; ctx.globalAlpha = Math.min(1, +b.gridOpacity); ctx.lineWidth = 1 / z; ctx.stroke(); }
      ctx.restore();
    }
    // Tokens seen by someone else's token go under the darkness (dim light dims them too); the
    // viewer's own tokens (and, for the Mestre, all of them) go over it.
    var over = function (t) { return (isGm && !asP) || owns(t) || (asP && viewerOwns(t)); };
    st.turnTok = BoardTurns.activeTokenId();
    // Drawings of the tokens layer are part of the world: the dark covers them as it covers the map.
    drawLayer('tokens', z);
    var under = st.tokens.filter(function (t) { return t.layer === 'tokens' && light.vis[t.id] && !over(t); });
    under.forEach(function (t) { drawToken(t, 'body'); });
    var darkOn = drawDark(isGm && !asP);
    under.forEach(function (t) { drawToken(t, 'tags'); }); // names and PV stay readable at the edge of the dark
    st.tokens.forEach(function (t) { if ((t.layer === 'tokens' || t.layer === 'gm') && light.vis[t.id] && over(t)) drawToken(t); });
    // The foreground covers the tokens; for the players, only where they see (the dark cuts it).
    drawFore(z, dpr, darkOn && !(isGm && !asP));
    ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * v.x, dpr * v.y);
    if (isGm && !asP) drawLayer('gm', z);
    if (canEdit()) drawWalls(z);
    drawOverlays(z);
    placeHud();
    if (st.pings.length || (st.ruler && st.ruler.until) || Object.keys(st.rulers).length) requestDraw();
  }
  // The foreground layer: drawn apart, cut by the darkness when it has to be, then over the board.
  // The Mestre sees it see-through (the tokens under it stay in sight), unless he is editing it.
  function drawFore(z, dpr, mask) {
    var items = st.tokens.filter(function (t) { return t.layer === 'fore'; });
    if (!items.length && !st.drawings.some(function (d) { return d.layer === 'fore'; })) return;
    var alpha = fullView() && !(canEdit() && st.layer === 'fore' && st.tool !== 'walls') ? 0.55 : 1;
    if (!mask && alpha === 1) { drawLayer('fore', z); items.forEach(function (t) { drawToken(t); }); return; }
    if (foreC.width !== cv.width || foreC.height !== cv.height) { foreC.width = cv.width; foreC.height = cv.height; }
    foreX.setTransform(1, 0, 0, 1, 0, 0); foreX.globalCompositeOperation = 'source-over'; foreX.globalAlpha = 1; foreX.clearRect(0, 0, foreC.width, foreC.height);
    var main = ctx; ctx = foreX;
    ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * st.view.x, dpr * st.view.y);
    drawLayer('fore', z); items.forEach(function (t) { drawToken(t); });
    ctx = main;
    if (mask) { foreX.setTransform(1, 0, 0, 1, 0, 0); foreX.globalCompositeOperation = 'destination-out'; foreX.drawImage(dark, 0, 0, foreC.width, foreC.height); foreX.globalCompositeOperation = 'source-over'; }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = alpha; ctx.drawImage(foreC, 0, 0); ctx.restore();
  }
  // Returns whether there is darkness on the board (dynamic light or fog).
  function drawDark(half) {
    var b = st.board; if (!b.dynamicLight && !b.fog) return false;
    var s = vpSize(), w = Math.max(1, Math.round(s.w)), h = Math.max(1, Math.round(s.h)), v = st.view;
    if (dark.width !== w || dark.height !== h) { dark.width = tmp.width = w; dark.height = tmp.height = h; }
    dctx.setTransform(1, 0, 0, 1, 0, 0); dctx.globalCompositeOperation = 'source-over'; dctx.globalAlpha = 1; dctx.clearRect(0, 0, w, h);
    if (b.dynamicLight) {
      dctx.setTransform(v.z, 0, 0, v.z, v.x, v.y);
      dctx.fillStyle = '#000'; dctx.fillRect(0, 0, b.width, b.height);
      if (b.explorer && ex.bits && ex.id === b.id) {
        dctx.globalCompositeOperation = 'destination-out'; dctx.globalAlpha = 0.45; dctx.imageSmoothingEnabled = true;
        dctx.drawImage(fogC, 0, 0, ex.dims.cols * ex.dims.fc, ex.dims.rows * ex.dims.fc);
        dctx.globalAlpha = 1;
      }
      light.viewers.forEach(function (vw) {
        tctx.setTransform(1, 0, 0, 1, 0, 0); tctx.globalCompositeOperation = 'source-over'; tctx.clearRect(0, 0, w, h);
        tctx.setTransform(v.z, 0, 0, v.z, v.x, v.y);
        paintSeen(tctx, vw, true);
        dctx.setTransform(1, 0, 0, 1, 0, 0); dctx.globalCompositeOperation = 'destination-out'; dctx.drawImage(tmp, 0, 0);
      });
      dctx.globalCompositeOperation = 'source-over';
    }
    if (b.fog) {
      tctx.setTransform(1, 0, 0, 1, 0, 0); tctx.globalCompositeOperation = 'source-over'; tctx.clearRect(0, 0, w, h);
      tctx.setTransform(v.z, 0, 0, v.z, v.x, v.y);
      tctx.fillStyle = '#000'; tctx.fillRect(0, 0, b.width, b.height);
      (b.fogAreas || []).forEach(function (a) { tctx.globalCompositeOperation = a.show ? 'destination-out' : 'source-over'; tctx.fillRect(a.x, a.y, a.w, a.h); });
      tctx.globalCompositeOperation = 'source-over';
      dctx.setTransform(1, 0, 0, 1, 0, 0); dctx.drawImage(tmp, 0, 0);
    }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = half ? 0.6 : 1; ctx.imageSmoothingEnabled = true;
    ctx.drawImage(dark, 0, 0, cv.width, cv.height);
    ctx.restore();
    return true;
  }
  // part: 'body' (the token), 'tags' (its PV and name) or both.
  function drawToken(t, part) {
    var p = posOf(t, false), z = st.view.z, r = tokR(t), TAU = Math.PI * 2, a = rotOf(t) * Math.PI / 180;
    var im = imgOf(tokRef(t)), color = t.color || '#f59e0b', sel = st.sel === t.id;
    ctx.save();
    if (part === 'tags') { drawTags(t, p, r, z); ctx.restore(); return; }
    if (boardIsTile(t)) {
      // Part of the map (or the foreground): the image as it is (or a plain tile), turned, with no ring nor name.
      var tb = tileBox(t), hw = tb.w / 2, hh = tb.h / 2;
      ctx.translate(p.x, p.y); ctx.rotate(a);
      if (im) ctx.drawImage(im, -hw, -hh, tb.w, tb.h);
      else { ctx.globalAlpha = 0.75; ctx.fillStyle = color; ctx.fillRect(-hw, -hh, tb.w, tb.h); }
      if (sel) { ctx.globalAlpha = 1; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 / z; ctx.setLineDash([6 / z, 4 / z]); ctx.strokeRect(-hw, -hh, tb.w, tb.h); }
      ctx.restore();
      if (sel && canMove(t)) drawHandle(t, z);
      return;
    }
    // The token whose turn it is (turn order): a glow around it.
    if (st.turnTok === t.id && part !== 'tags') {
      ctx.save(); ctx.beginPath(); ctx.arc(p.x, p.y, r + 7 / z, 0, TAU);
      ctx.strokeStyle = 'rgba(245,158,11,.95)'; ctx.lineWidth = 4 / z; ctx.shadowColor = 'rgba(245,158,11,.95)'; ctx.shadowBlur = 14; ctx.stroke(); ctx.restore();
    }
    if (t.layer === 'gm') ctx.globalAlpha = 0.55;
    ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 6 / z; ctx.shadowOffsetY = 2 / z;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fillStyle = '#0b1222'; ctx.fill();
    ctx.shadowColor = 'transparent';
    if (im) {
      // The image turns with the token; the initials (no image) stay upright, to be read.
      var m = Math.min(im.naturalWidth, im.naturalHeight);
      ctx.save(); ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.clip();
      ctx.translate(p.x, p.y); ctx.rotate(a);
      ctx.drawImage(im, (im.naturalWidth - m) / 2, (im.naturalHeight - m) / 2, m, m, -r, -r, r * 2, r * 2);
      ctx.restore();
    } else {
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fillStyle = color; ctx.globalAlpha *= 0.35; ctx.fill(); ctx.globalAlpha = t.layer === 'gm' ? 0.55 : 1;
      ctx.fillStyle = '#fff'; ctx.font = '800 ' + Math.max(4, r * 0.75) + 'px ' + 'Plus Jakarta Sans, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(initials(t.name), p.x, p.y + r * 0.04);
    }
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.5 / z, r * 0.12);
    if (t.layer === 'gm') ctx.setLineDash([r * 0.3, r * 0.2]);
    ctx.stroke(); ctx.setLineDash([]);
    // Where it faces: an arrow on the ring.
    var tip = r * 1.32, base = r * 0.94, wing = Math.max(3 / z, r * 0.26);
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a);
    ctx.beginPath(); ctx.moveTo(0, -tip); ctx.lineTo(wing, -base); ctx.lineTo(-wing, -base); ctx.closePath();
    ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = 'rgba(2,6,23,.85)'; ctx.lineWidth = 1.2 / z; ctx.stroke();
    ctx.restore();
    if (sel) { ctx.beginPath(); ctx.arc(p.x, p.y, r + 4 / z, 0, TAU); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5 / z; ctx.stroke(); }
    drawMarkers(t, p, r, z);
    if (part !== 'body') drawTags(t, p, r, z);
    ctx.restore();
    if (sel && canMove(t) && part !== 'body') drawHandle(t, z);
  }
  // The status markers, small badges on the token's ring, alternating right and left of where it faces.
  function markPath(d) { return markPaths[d] || (markPaths[d] = new Path2D(d)); }
  function paleColor(c) { var n = parseInt(String(c).slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return 0.299 * r + 0.587 * g + 0.114 * b > 160; }
  function drawMarkers(t, p, r, z) {
    var ms = (t.markers || []).filter(function (id) { return BOARD_MARKER[id]; });
    if (!ms.length) return;
    var mr = Math.max(5.5 / z, r * 0.24), a0 = rotOf(t);
    ms.forEach(function (id, i) {
      var mk = BOARD_MARKER[id], k = Math.floor(i / 2), ang = (a0 + (i % 2 ? -1 : 1) * (36 + k * 30)) * Math.PI / 180;
      var cx = p.x + Math.sin(ang) * r, cy = p.y - Math.cos(ang) * r, s = mr * 1.25 / 24;
      ctx.save(); ctx.globalAlpha = t.layer === 'gm' ? 0.7 : 1;
      ctx.beginPath(); ctx.arc(cx, cy, mr, 0, Math.PI * 2); ctx.fillStyle = mk.color; ctx.fill();
      ctx.lineWidth = Math.max(1 / z, mr * 0.14); ctx.strokeStyle = 'rgba(2,6,23,.9)'; ctx.stroke();
      ctx.translate(cx - 12 * s, cy - 12 * s); ctx.scale(s, s);
      ctx.strokeStyle = paleColor(mk.color) ? '#0b1222' : '#ffffff'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      mk.d.forEach(function (d) { ctx.stroke(markPath(d)); });
      ctx.restore();
    });
  }
  // The handle that turns the token, joined to it by a thin line (and the angle, while it turns).
  function drawHandle(t, z) {
    var tb = tileBox(t), p = posOf(t, false), h = handlePos(t), a = rotOf(t) * Math.PI / 180, from = boardIsTile(t) ? Math.hypot(tb.w, tb.h) / 2 : tokR(t) * 1.32;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.5 / z;
    ctx.beginPath(); ctx.moveTo(p.x + Math.sin(a) * from, p.y - Math.cos(a) * from); ctx.lineTo(h.x, h.y); ctx.stroke();
    ctx.beginPath(); ctx.arc(h.x, h.y, 7 / z, 0, Math.PI * 2); ctx.fillStyle = st.rot && st.rot.id === t.id ? '#38bdf8' : '#fff'; ctx.fill();
    ctx.strokeStyle = 'rgba(2,6,23,.9)'; ctx.lineWidth = 1.5 / z; ctx.stroke();
    ctx.beginPath(); ctx.arc(h.x, h.y, 3.5 / z, -Math.PI * 0.9, Math.PI * 0.4); ctx.strokeStyle = '#0b1222'; ctx.lineWidth = 1.4 / z; ctx.stroke();
    ctx.restore();
    if (st.rot && st.rot.id === t.id) drawLabel(boardNum(st.rot.deg) + '°', h.x, h.y - 20 / z, z, '#38bdf8');
  }
  function drawTags(t, p, r, z) {
    ctx.globalAlpha = t.layer === 'gm' ? 0.55 : 1;
    // Under the token: the PV and the PF (the Mestre and whoever controls it), then the name.
    var y = p.y + r + 3 / z, mine = fullView() || owns(t);
    [['hp', 'hpMax', null], ['fp', 'fpMax', '#3b82f6']].forEach(function (k) {
      if (!mine || !(+t[k[1]] > 0)) return;
      var pct = Math.max(0, Math.min(1, (+t[k[0]] || 0) / +t[k[1]])), bw = r * 1.6, bh = Math.max(3 / z, r * 0.14);
      ctx.fillStyle = 'rgba(2,6,23,.85)'; ctx.fillRect(p.x - bw / 2, y, bw, bh);
      ctx.fillStyle = k[2] || (pct > 0.5 ? '#10b981' : pct > 0.2 ? '#f59e0b' : '#ef4444'); ctx.fillRect(p.x - bw / 2, y, bw * pct, bh);
      y += bh + 2 / z;
    });
    y += 1 / z;
    // The name, the same size at any zoom.
    if (t.name && (mine || t.showName !== false)) {
      var fs = 12 / z;
      ctx.font = '700 ' + fs + 'px Plus Jakarta Sans, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      var tw = ctx.measureText(t.name).width, ty = y + 1 / z;
      ctx.fillStyle = 'rgba(2,6,23,.8)'; ctx.fillRect(p.x - tw / 2 - 4 / z, ty - 1 / z, tw + 8 / z, fs + 4 / z);
      ctx.fillStyle = '#f1f5f9'; ctx.fillText(t.name, p.x, ty + 1 / z);
    }
  }
  function drawWalls(z) {
    var b = st.board, walls = b.walls || [], showAll = st.tool === 'walls';
    ctx.save(); ctx.lineCap = 'round';
    walls.forEach(function (w) {
      if (!showAll && !w.door) return;
      if (showAll) {
        ctx.beginPath(); ctx.moveTo(w.x1, w.y1); ctx.lineTo(w.x2, w.y2);
        ctx.strokeStyle = 'rgba(2,6,23,.7)'; ctx.lineWidth = 6 / z; ctx.stroke();
        ctx.strokeStyle = w.door ? (w.open ? '#86efac' : '#38bdf8') : '#f59e0b'; ctx.lineWidth = 3 / z;
        if (w.door && w.open) ctx.setLineDash([6 / z, 5 / z]);
        ctx.stroke(); ctx.setLineDash([]);
      }
      if (w.door) {
        var mx = (w.x1 + w.x2) / 2, my = (w.y1 + w.y2) / 2, q = 7 / z;
        ctx.fillStyle = w.open ? 'rgba(22,101,52,.9)' : 'rgba(12,74,110,.95)'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5 / z;
        ctx.beginPath(); ctx.rect(mx - q, my - q, q * 2, q * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(mx - q * 0.45, my + q * 0.55); ctx.lineTo(mx - q * 0.45, my - q * 0.55); ctx.lineTo(mx + (w.open ? -0.05 : 0.45) * q, my - q * 0.55);
        ctx.lineTo(mx + (w.open ? -0.05 : 0.45) * q, my + q * 0.55); ctx.stroke();
      }
    });
    if (showAll) walls.forEach(function (w) { ctx.fillStyle = '#fff'; [[w.x1, w.y1], [w.x2, w.y2]].forEach(function (pt) { ctx.beginPath(); ctx.arc(pt[0], pt[1], 2.5 / z, 0, Math.PI * 2); ctx.fill(); }); });
    ctx.restore();
  }
  function drawLabel(text, x, y, z, color) {
    var fs = 13 / z;
    ctx.font = '800 ' + fs + 'px Plus Jakarta Sans, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var tw = ctx.measureText(text).width;
    ctx.fillStyle = 'rgba(2,6,23,.9)'; ctx.fillRect(x - tw / 2 - 6 / z, y - fs * 0.75, tw + 12 / z, fs * 1.5);
    ctx.strokeStyle = color; ctx.lineWidth = 1 / z; ctx.strokeRect(x - tw / 2 - 6 / z, y - fs * 0.75, tw + 12 / z, fs * 1.5);
    ctx.fillStyle = '#fff'; ctx.fillText(text, x, y);
  }
  function distText(ax, ay, bx, by) {
    var b = st.board, n = BoardGeo.cells(b, ax, ay, bx, by);
    return boardNum(n * (+b.scale || 1)) + ' ' + (b.unit || 'jd');
  }
  function drawOverlays(z) {
    var b = st.board;
    // The move of a token being dragged: from where it was to where it will land.
    if (st.drag) {
      var t = tokById(st.drag.id);
      if (t) {
        var to = st.press && st.press.alt ? st.drag : BoardGeo.snap(b, st.drag.x, st.drag.y, t.size);
        ctx.save(); ctx.strokeStyle = 'rgba(245,158,11,.9)'; ctx.lineWidth = 2 / z; ctx.setLineDash([8 / z, 6 / z]);
        ctx.beginPath(); ctx.moveTo(st.drag.ox, st.drag.oy); ctx.lineTo(to.x, to.y); ctx.stroke(); ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(to.x, to.y, Math.max(3, (+t.size || 1) * cell() / 2 * 0.9), 0, Math.PI * 2); ctx.strokeStyle = 'rgba(245,158,11,.8)'; ctx.stroke();
        drawLabel(distText(st.drag.ox, st.drag.oy, to.x, to.y), (st.drag.ox + to.x) / 2, (st.drag.oy + to.y) / 2, z, '#f59e0b');
        ctx.restore();
      }
    }
    // Rulers: this person's (it fades in its last second once let go, with "Fica 5 s") and the others'.
    var now0 = Date.now();
    if (st.ruler && st.ruler.until && now0 >= st.ruler.until) st.ruler = null;
    if (st.ruler) drawRuler(st.ruler, '#f59e0b', '', z, st.ruler.until ? Math.min(1, (st.ruler.until - now0) / 1000) : 1);
    Object.keys(st.rulers).forEach(function (u) {
      var R2 = st.rulers[u];
      if (now0 >= R2.until) { delete st.rulers[u]; return; }
      drawRuler(R2, R2.c, R2.nm, z, Math.min(1, (R2.until - now0) / 1000));
    });
    if (st.sketch) drawShape({ kind: st.sketch.kind, pts: st.sketch.pts, stroke: st.sketch.stroke, fill: st.sketch.kind === 'rect' || st.sketch.kind === 'ellipse' ? st.sketch.fill : null, width: st.sketch.width, layer: st.sketch.layer }, false, z);
    if (st.rect) {
      var q = st.rect, x = Math.min(q.ax, q.bx), y = Math.min(q.ay, q.by), w = Math.abs(q.bx - q.ax), h = Math.abs(q.by - q.ay);
      ctx.save(); ctx.lineWidth = 2 / z; ctx.setLineDash([6 / z, 4 / z]);
      ctx.strokeStyle = st.tool === 'grid' ? '#38bdf8' : st.fogMode === 'show' ? '#86efac' : '#f87171';
      ctx.fillStyle = st.tool === 'grid' ? 'rgba(56,189,248,.12)' : st.fogMode === 'show' ? 'rgba(134,239,172,.15)' : 'rgba(248,113,113,.15)';
      ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
      ctx.restore();
    }
    if (st.draft && st.tool === 'walls') {
      var hv = st.hover || st.draft, end = snapEnd(hv.x, hv.y);
      ctx.save(); ctx.strokeStyle = st.draft.door ? '#38bdf8' : '#f59e0b'; ctx.lineWidth = 3 / z; ctx.setLineDash([6 / z, 5 / z]);
      ctx.beginPath(); ctx.moveTo(st.draft.x, st.draft.y); ctx.lineTo(end.x, end.y); ctx.stroke();
      ctx.setLineDash([]); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(st.draft.x, st.draft.y, 4 / z, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // Pings: rings that grow and fade for 2 s.
    var t0 = Date.now();
    st.pings = st.pings.filter(function (pg) { return t0 - pg.t < 2000; });
    st.pings.forEach(function (pg) {
      var k = (t0 - pg.t) / 2000;
      ctx.save(); ctx.strokeStyle = pg.c; ctx.lineWidth = 3 / z;
      for (var i = 0; i < 2; i++) {
        var kk = (k + i * 0.3) % 1;
        ctx.globalAlpha = 1 - kk; ctx.beginPath(); ctx.arc(pg.x, pg.y, (10 + 50 * kk) / z, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.fillStyle = pg.c; ctx.beginPath(); ctx.arc(pg.x, pg.y, 5 / z, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
  }

  // ----- what is under the pointer -----
  // The token on top under x, y that this person can click: the Mestre, on the layer being edited;
  // a player, on the tokens layer and in sight.
  function hitToken(x, y) {
    var isGm = canEdit();
    for (var i = st.tokens.length - 1; i >= 0; i--) {
      var t = st.tokens[i];
      if (isGm ? t.layer !== st.layer : t.layer !== 'tokens' || !light.vis[t.id]) continue;
      var p = posOf(t, false), r = Math.max(6 / st.view.z, (+t.size || 1) * cell() / 2 * 0.9);
      if (boardIsTile(t)) {
        // In the tile's own frame (it may be turned).
        var tb = tileBox(t), a = -rotOf(t) * Math.PI / 180, dx = x - p.x, dy = y - p.y;
        var lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
        if (Math.abs(lx) <= Math.max(tb.w / 2, 6 / st.view.z) && Math.abs(ly) <= Math.max(tb.h / 2, 6 / st.view.z)) return t;
      } else if (Math.hypot(x - p.x, y - p.y) <= r) return t;
    }
    return null;
  }
  function doorAt(x, y) {
    var walls = st.board.walls || [], tol = 11 / st.view.z;
    for (var i = walls.length - 1; i >= 0; i--) {
      var w = walls[i]; if (!w.door) continue;
      if (Math.abs((w.x1 + w.x2) / 2 - x) <= tol && Math.abs((w.y1 + w.y2) / 2 - y) <= tol) return i;
    }
    return -1;
  }
  function wallAt(x, y) {
    var walls = st.board.walls || [], tol = 10 / st.view.z, best = -1, bd = tol;
    walls.forEach(function (w, i) { var d = BoardGeo.segDist(x, y, w.x1, w.y1, w.x2, w.y2); if (d <= bd) { bd = d; best = i; } });
    return best;
  }
  // A wall corner near x, y (to close a room or join two walls), or x, y itself.
  function snapEnd(x, y) {
    var tol = 10 / st.view.z, best = null, bd = tol;
    var pts0 = [];
    (st.board.walls || []).forEach(function (w) { pts0.push([w.x1, w.y1], [w.x2, w.y2]); });
    if (st.draft) pts0.push([st.draft.sx, st.draft.sy]);
    pts0.forEach(function (p) { var d = Math.hypot(p[0] - x, p[1] - y); if (d <= bd) { bd = d; best = p; } });
    return best ? { x: best[0], y: best[1] } : { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  }
  // A cell near x, y with no token on it (a new token doesn't land on another one).
  function freeSpot(x, y) {
    var b = st.board, s = cell();
    x = Math.min(b.width - s / 2, Math.max(s / 2, x)); y = Math.min(b.height - s / 2, Math.max(s / 2, y));
    for (var ring = 0; ring < 6; ring++) {
      for (var i = -ring; i <= ring; i++) for (var j = -ring; j <= ring; j++) {
        if (Math.max(Math.abs(i), Math.abs(j)) !== ring) continue;
        var p = BoardGeo.snap(b, x + i * s, y + j * s, 1);
        if (p.x < 0 || p.y < 0 || p.x > b.width || p.y > b.height) continue;
        if (!st.tokens.some(function (t) { var q = posOf(t, false); return !boardIsTile(t) && Math.hypot(q.x - p.x, q.y - p.y) < s * 0.5; })) return p;
      }
    }
    return BoardGeo.snap(b, x, y, 1);
  }

  // ----- actions -----
  function setTool(t) {
    var def = TOOLS.filter(function (x) { return x.id === t && !x.box; })[0];
    if (!def || (def.gm && !canEdit())) t = 'select';
    commitText();
    st.tool = t; st.draft = null; st.rect = null; st.sketch = null; st.palette = null; st.optsClosed = null; if (t !== 'ruler') st.ruler = null;
    st.confirm = null; closeCtx();
    paintBar(); renderHud(); requestDraw();
  }
  // A button of the toolbar: the menu, the dice and the turn order open their own box; the others are tools.
  function pickTool(id) {
    if (id === 'menu') { st.menuOpen = !st.menuOpen; paintMenu(); paintBar(); return; }
    if (id === 'dice') { toggleDice(); return; }
    if (id === 'turns') { BoardTurns.toggle(); paintBar(); return; }
    // The tool already in use, with its box closed (×): the box comes back.
    if (id === st.tool) { st.optsClosed = null; paintBar(); return; }
    setTool(id);
  }
  function select(id) {
    if (st.sel === id) return;
    st.sel = id; if (id) st.selD = null; st.confirm = null; st.hudEdit = null; st.hudMarks = false;
    renderHud(); requestDraw();
  }
  function focusToken(id) {
    var t = tokById(id); if (!t) return;
    var p = posOf(t, false); centerOn(p.x, p.y);
    if ((canEdit() && t.layer === st.layer) || (t.layer === 'tokens' && light.vis[t.id])) select(id);
  }
  // A marker on or off on the token (its owners and the Mestre).
  function toggleMarker(t, id) {
    if (!t || !canMove(t)) return;
    var list = (t.markers || []).slice(), i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1); else list.push(id);
    BoardOps.patchToken(t, { markers: list }).catch(function (er) { toast(errorText(er), true); });
  }
  // A bar of the token (hp or fp): a number, or +n / -n from what it has.
  function setBar(t, key, text) {
    var s = String(text || '').trim().replace(',', '.'), cur = +t[key] || 0, v;
    if (s === '') v = null;
    else if (/^[+-]\s*\d+$/.test(s)) v = cur + parseInt(s.replace(/\s+/g, ''), 10);
    else if (/^-?\d+$/.test(s)) v = parseInt(s, 10);
    else { toast('Use um número (12) ou uma mudança (+3, -5).', true); return; }
    var p = {}; p[key] = v;
    BoardOps.patchToken(t, p).catch(function (er) { toast(errorText(er), true); });
  }
  function moveTo(t, x, y) {
    var b = st.board;
    x = Math.min(b.width, Math.max(0, x)); y = Math.min(b.height, Math.max(0, y));
    var from = posOf(t, false);
    if (Math.abs(x - from.x) < 0.01 && Math.abs(y - from.y) < 0.01) return;
    if (!gm() && BoardGeo.crosses(from.x, from.y, x, y, BoardGeo.blockers(b.walls))) { toast('Uma parede ou porta fechada bloqueia o caminho.', true); return; }
    // Shown where it went until the store has it there (see onTokens).
    st.moved[t.id] = { x: x, y: y, at: Date.now() };
    dirtyLight();
    BoardOps.patchToken(t, { x: x, y: y }).catch(function (er) { delete st.moved[t.id]; dirtyLight(); toast(errorText(er), true); });
  }
  function nudge(dx, dy) {
    var t = st.sel && tokById(st.sel), s = cell();
    if (!t || !canMove(t)) return false;
    var p = posOf(t, false), to = BoardGeo.snap(st.board, p.x + dx * s, p.y + dy * s, t.size);
    moveTo(t, to.x, to.y);
    return true;
  }
  function removeToken(t) {
    if (!t || !canEdit()) return;
    if (st.sel === t.id) select(null);
    BoardOps.removeToken(t).then(function () { toast('Token excluído.'); }, function (er) { toast(errorText(er), true); });
  }
  function duplicate(t) {
    var p = posOf(t, false), s = cell() * (+t.size || 1), to = BoardGeo.snap(st.board, p.x + s, p.y, t.size);
    var body = boardBody(t); body.x = Math.min(st.board.width, to.x); body.y = to.y;
    BoardOps.saveToken(null, body, null, null, false).then(function (id) { select(id); toast('Token duplicado.'); }, function (er) { toast(errorText(er), true); });
  }
  function ping(x, y) {
    var c = boardUserColor(me());
    st.pings.push({ x: x, y: y, t: Date.now(), c: c }); requestDraw();
    var rt = W.store && W.store.realtime;
    if (rt) rt.send('tab-ping', { b: st.id, x: Math.round(x), y: Math.round(y), c: c });
  }
  function onPing(m) {
    if (!m || m.b !== st.id || !isFinite(m.x) || !isFinite(m.y)) return;
    st.pings.push({ x: +m.x, y: +m.y, t: Date.now(), c: String(m.c || '#f59e0b').slice(0, 40) }); requestDraw();
  }
  function saveWalls(list) {
    var b = st.board;
    st.board = Object.assign({}, b, { walls: list }); dirtyLight();
    BoardOps.patch(b, { walls: list, updatedAt: now() }).catch(function (er) { toast(errorText(er), true); });
    if (st.tool === 'walls') renderOptions();
  }
  function saveFog(list) {
    var b = st.board;
    st.board = Object.assign({}, b, { fogAreas: list }); dirtyLight();
    BoardOps.patch(b, { fogAreas: list, updatedAt: now() }).catch(function (er) { toast(errorText(er), true); });
  }
  function wallClick(m) {
    var b = st.board;
    if (st.wallMode === 'erase') { var i = wallAt(m.x, m.y); if (i >= 0) saveWalls((b.walls || []).filter(function (w, k) { return k !== i; })); return; }
    var pt = snapEnd(m.x, m.y);
    if (!st.draft) { st.draft = { x: pt.x, y: pt.y, sx: pt.x, sy: pt.y, door: st.wallMode === 'door' }; renderOptions(); requestDraw(); return; }
    if (Math.hypot(pt.x - st.draft.x, pt.y - st.draft.y) < 2 / st.view.z) return;
    var seg = { x1: st.draft.x, y1: st.draft.y, x2: pt.x, y2: pt.y, door: st.draft.door, open: false };
    var closed = pt.x === st.draft.sx && pt.y === st.draft.sy;
    if (st.draft.door || closed) st.draft = null; else { st.draft.x = pt.x; st.draft.y = pt.y; }
    saveWalls((b.walls || []).concat([seg]));
    requestDraw();
  }
  function finishDraft() { if (!st.draft) return; st.draft = null; renderOptions(); requestDraw(); }
  function toggleDoor(i) {
    var walls = (st.board.walls || []).map(function (w, k) { return k === i ? Object.assign({}, w, { open: !w.open }) : w; });
    saveWalls(walls);
  }
  function finishRect() {
    var q = st.rect, b = st.board; if (!q) return;
    var x = Math.min(q.ax, q.bx), y = Math.min(q.ay, q.by), w = Math.abs(q.bx - q.ax), h = Math.abs(q.by - q.ay);
    if (w * st.view.z < 4 || h * st.view.z < 4) return;
    if (st.tool === 'fog') { saveFog((b.fogAreas || []).concat([{ x: x, y: y, w: w, h: h, show: st.fogMode === 'show' }])); return; }
    // Grid: the rectangle is one cell of the grid on the image (a hex from point to point).
    var R3 = Math.sqrt(3), cx = x + w / 2, cy = y + h / 2, mod = function (a, m) { return ((a % m) + m) % m; };
    /** @type {Record<string, any>} */
    var p;
    if (b.gridType === 'hex') { var sh = (w + h * R3 / 2) / 2; p = { gridSize: sh, gridX: mod(cx, sh), gridY: mod(cy, sh * R3) }; }
    else if (b.gridType === 'hexc') { var sv = (h + w * R3 / 2) / 2; p = { gridSize: sv, gridX: mod(cx, sv * R3), gridY: mod(cy, sv) }; }
    else { var ss = (w + h) / 2; p = { gridSize: ss, gridX: mod(x, ss), gridY: mod(y, ss) }; if (b.gridType === 'none') p.gridType = 'square'; }
    p.gridSize = Math.min(1000, Math.max(8, Math.round(p.gridSize * 100) / 100));
    p.gridX = Math.round(p.gridX * 100) / 100; p.gridY = Math.round(p.gridY * 100) / 100;
    var next = Object.assign({}, b, p);
    if (BoardGeo.fogDims(b).key !== BoardGeo.fogDims(next).key) { p.explored = ''; p.exploredEpoch = (+b.exploredEpoch || 0) + 1; }
    p.updatedAt = now();
    st.board = Object.assign({}, b, p); dirtyLight();
    BoardOps.patch(b, p).then(function () { toast('Grade alinhada: células de ' + boardNum(p.gridSize) + ' px. O ajuste fino fica em Configurar.'); }, function (er) { toast(errorText(er), true); });
    setTool('select');
  }

  // ----- input -----
  function ptList() { return Object.keys(pts).map(function (k) { return pts[k]; }); }
  function wireInput() {
    vp.addEventListener('contextmenu', function (e) { if (e.target === cv) e.preventDefault(); });
    vp.addEventListener('pointerdown', function (e) {
      // Only the board itself: the zoom buttons and the message's link sit over it and do their own thing.
      if (!st.board || e.target !== cv) return;
      vp.focus({ preventScroll: true });
      try { vp.setPointerCapture(e.pointerId); } catch (er) {}
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      var l = ptList();
      if (l.length === 2) { st.press = null; st.drag = null; st.rect = null; st.rot = null; st.sketch = null; st.dragD = null; pinch = { d: Math.hypot(l[0].x - l[1].x, l[0].y - l[1].y), mx: (l[0].x + l[1].x) / 2, my: (l[0].y + l[1].y) / 2 }; requestDraw(); return; }
      if (l.length > 2) return;
      var m = toMap(e.clientX, e.clientY), p = st.press = { id: e.pointerId, button: e.button, moved: 0, kind: 'none', alt: e.altKey, tok: null, dx: 0, dy: 0, door: -1 };
      if (e.button === 1 || e.button === 2 || space) { p.kind = 'pan'; vp.classList.add('panning'); return; }
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (st.tool === 'select') {
        // The handle of the selected token turns it.
        var sh = st.sel && tokById(st.sel);
        if (sh && canMove(sh) && onHandle(sh, m.x, m.y)) { p.kind = 'rotate'; p.tok = sh.id; st.rot = { id: sh.id, deg: rotOf(sh) }; requestDraw(); return; }
        var d = canEdit() ? doorAt(m.x, m.y) : -1;
        if (d >= 0) { p.kind = 'door'; p.door = d; return; }
        var t = hitToken(m.x, m.y);
        if (t) {
          select(t.id);
          if (canMove(t)) { var tp = posOf(t, false); p.kind = 'token'; p.tok = t.id; p.dx = m.x - tp.x; p.dy = m.y - tp.y; }
          return;
        }
        // A drawing: selected, and dragged by whoever may change it.
        var dh = hitDrawing(m.x, m.y, false);
        if (dh) { selectDrawing(dh.id); if (canEditDrawing(dh)) { p.kind = 'drawing'; p.tok = dh.id; p.dx = m.x; p.dy = m.y; } return; }
        p.kind = 'empty';
      } else if (st.tool === 'pan') { p.kind = 'pan'; vp.classList.add('panning'); }
      else if (st.tool === 'draw') {
        if (!canWrite()) return;
        st.sketch = { kind: opt.shape, pts: opt.shape === 'free' ? [m.x, m.y] : [m.x, m.y, m.x, m.y], stroke: opt.stroke, fill: opt.fill, width: strokeWidth(), layer: newLayer() };
        p.kind = 'sketch'; requestDraw();
      } else if (st.tool === 'ruler') { var a = rulerSnap(m); st.ruler = { ax: a.x, ay: a.y, bx: a.x, by: a.y, sh: opt.mShape, until: 0 }; p.kind = 'ruler'; requestDraw(); }
      else if (st.tool === 'fog' || st.tool === 'grid') { st.rect = { ax: m.x, ay: m.y, bx: m.x, by: m.y }; p.kind = 'rect'; }
      else p.kind = st.tool; // ping, walls, text: a tap acts, a drag moves the view
    });
    vp.addEventListener('pointermove', function (e) {
      if (!st.board) return;
      var m = toMap(e.clientX, e.clientY); st.hover = m;
      if (!pts[e.pointerId]) {
        if (st.tool === 'select') {
          var hs = st.sel && tokById(st.sel), turn = !!hs && canMove(hs) && onHandle(hs, m.x, m.y);
          vp.classList.toggle('over-turn', turn);
          vp.classList.toggle('over-tok', !turn && (!!hitToken(m.x, m.y) || (canEdit() && doorAt(m.x, m.y) >= 0) || !!hitDrawing(m.x, m.y, false)));
        }
        if (st.draft) requestDraw();
        return;
      }
      var prev = pts[e.pointerId]; pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      var l = ptList();
      if (l.length >= 2) {
        if (!pinch) return;
        var r = vp.getBoundingClientRect(), d = Math.hypot(l[0].x - l[1].x, l[0].y - l[1].y), mx = (l[0].x + l[1].x) / 2, my = (l[0].y + l[1].y) / 2;
        st.view.x += mx - pinch.mx; st.view.y += my - pinch.my;
        if (pinch.d > 0) zoomAt(d / pinch.d, mx - r.left, my - r.top); else viewChanged();
        pinch = { d: d, mx: mx, my: my };
        return;
      }
      var p = st.press; if (!p || p.id !== e.pointerId) return;
      var dx = e.clientX - prev.x, dy = e.clientY - prev.y; p.moved += Math.abs(dx) + Math.abs(dy);
      if (p.kind === 'sketch') { sketchTo(m, e.shiftKey); return; }
      if (p.kind === 'drawing') {
        if (p.moved < 3 && !st.dragD) return;
        st.dragD = { id: p.tok, dx: m.x - p.dx, dy: m.y - p.dy }; requestDraw(); return;
      }
      if (p.kind === 'empty' || p.kind === 'ping' || p.kind === 'walls' || p.kind === 'door' || p.kind === 'text') {
        if (p.moved < 6) return;
        p.kind = 'pan'; vp.classList.add('panning');
      }
      if (p.kind === 'pan') { st.view.x += dx; st.view.y += dy; viewChanged(); return; }
      if (p.kind === 'rotate') {
        // Toward the pointer, a degree at a time; with Shift, from one facing of the grid to the next.
        var rt = tokById(p.tok); if (!rt) return;
        var c = posOf(rt, false), deg = Math.atan2(m.x - c.x, -(m.y - c.y)) * 180 / Math.PI;
        st.rot = { id: rt.id, deg: e.shiftKey ? snapFacing(deg) : normDeg(Math.round(deg)) };
        requestDraw(); return;
      }
      if (p.kind === 'token') {
        if (p.moved < 3 && !st.drag) return;
        var t = tokById(p.tok); if (!t) return;
        var o = st.drag ? { x: st.drag.ox, y: st.drag.oy } : posOf(t, false);
        st.drag = { id: t.id, x: m.x - p.dx, y: m.y - p.dy, ox: o.x, oy: o.y };
        p.alt = e.altKey;
        if (gm()) light.dirty = true;
        requestDraw(); return;
      }
      if (p.kind === 'ruler') { var bp = rulerSnap(m); st.ruler.bx = bp.x; st.ruler.by = bp.y; shareRuler(false); requestDraw(); return; }
      if (p.kind === 'rect') { st.rect.bx = m.x; st.rect.by = m.y; requestDraw(); }
    });
    function up(e) {
      if (!pts[e.pointerId]) return;
      delete pts[e.pointerId];
      if (ptList().length) return;
      pinch = null; vp.classList.remove('panning');
      var p = st.press; st.press = null;
      if (!p || p.id !== e.pointerId) return;
      var ok = e.type === 'pointerup', tap = p.moved < 6, m = toMap(e.clientX, e.clientY);
      if (p.kind === 'pan' && tap && p.button === 2 && st.draft) finishDraft();
      // A right click (without dragging): the menu of the token or drawing under it, or of the place.
      else if (p.kind === 'pan' && tap && p.button === 2 && ok) {
        var ht = hitToken(m.x, m.y), hd = !ht && hitDrawing(m.x, m.y, false);
        if (ht) { select(ht.id); openCtx(e.clientX, e.clientY, { t: ht }); }
        else if (hd) { selectDrawing(hd.id); openCtx(e.clientX, e.clientY, { d: hd }); }
        else openCtx(e.clientX, e.clientY, { at: { x: m.x, y: m.y } });
      }
      else if (p.kind === 'empty' && tap && ok) { select(null); selectDrawing(null); }
      else if (p.kind === 'sketch') { if (ok) finishSketch(); else { st.sketch = null; requestDraw(); } }
      else if (p.kind === 'drawing') {
        var dd = st.dragD, dr = drawById(p.tok); st.dragD = null;
        if (dd && dr && ok && (dd.dx || dd.dy)) {
          var np = (dr.points || []).map(function (v, i) { return Math.round((+v + (i % 2 ? dd.dy : dd.dx)) * 10) / 10; });
          st.dMoved[dr.id] = { pts: np, at: Date.now() };
          BoardOps.patchDrawing(dr, { points: np }).catch(function (er) { delete st.dMoved[dr.id]; requestDraw(); toast(errorText(er), true); });
        }
        requestDraw();
      }
      else if (p.kind === 'text' && tap && ok) { var dt = hitDrawing(m.x, m.y, true); if (dt && canEditDrawing(dt)) openText(null, dt); else if (canWrite()) openText(m, null); }
      else if (p.kind === 'ruler') {
        shareRuler(true);
        if (st.ruler) { if (opt.mFade === 'instant' || !ok) st.ruler = null; else st.ruler.until = Date.now() + 5000; }
        requestDraw();
      }
      else if (p.kind === 'door' && tap && ok) toggleDoor(p.door);
      else if (p.kind === 'rotate') { var rd = st.rot; st.rot = null; if (rd && ok) turnTo(tokById(p.tok), rd.deg); requestDraw(); }
      else if (p.kind === 'token') {
        var d = st.drag, t = tokById(p.tok); st.drag = null;
        if (d && t && ok) { var to = p.alt ? d : BoardGeo.snap(st.board, d.x, d.y, t.size); moveTo(t, to.x, to.y); }
        dirtyLight();
      } else if (p.kind === 'ping' && tap && ok) ping(m.x, m.y);
      else if (p.kind === 'walls' && tap && ok) wallClick(m);
      else if (p.kind === 'rect') { if (ok) finishRect(); st.rect = null; requestDraw(); }
    }
    vp.addEventListener('pointerup', up);
    vp.addEventListener('pointercancel', up);
    vp.addEventListener('dblclick', function () { if (st.tool === 'walls') finishDraft(); });
    vp.addEventListener('wheel', function (e) {
      if (e.target !== cv) return; // over the options box, the wheel scrolls it
      e.preventDefault();
      var r = vp.getBoundingClientRect(), dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      zoomAt(Math.exp(-dy * 0.0016), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    document.addEventListener('keydown', function (e) {
      if (!st.id || root.hidden || modalOpen || !st.board) return;
      var tg = /** @type {AnyEl} */ (e.target);
      if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT' || tg.isContentEditable)) return;
      // The sidebar, the windows and the menus have their own keys (Space presses a button there).
      if (tg && tg.closest && tg.closest('.bd-side, .bd-win, .bd-menu, .bd-ctx, .bd-pages, .bd-opts, .bd-hud')) return;
      // Ctrl+U: the selected token into the turn order (as in Roll20).
      if ((e.ctrlKey || e.metaKey) && !e.altKey && String(e.key).toLowerCase() === 'u') {
        var tu = st.sel && tokById(st.sel);
        if (tu) { e.preventDefault(); BoardTurns.addToken(tu); }
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      var k = e.key, low = k.toLowerCase();
      if (k === ' ') { space = true; e.preventDefault(); return; }
      if (k === 'Escape') {
        if (st.sketch) { st.sketch = null; requestDraw(); } else if (st.palette) { st.palette = null; renderOptions(); } else if (st.ctx) closeCtx();
        else if (st.hudMarks) { st.hudMarks = false; renderHud(); } else if (BoardPages.isOpen()) BoardPages.setOpen(false);
        else if (st.draft) finishDraft(); else if (st.ruler) { st.ruler = null; requestDraw(); } else if (st.tool !== 'select') setTool('select'); else { select(null); selectDrawing(null); }
        return;
      }
      if ((k === 'Delete' || k === 'Backspace') && st.selD) { removeDrawing(drawById(st.selD)); e.preventDefault(); return; }
      // Q and E turn the selected token 15° (with Shift, to the next facing of the grid).
      if ((low === 'q' || low === 'e') && st.sel) {
        var tq = tokById(st.sel), dq = low === 'e' ? 1 : -1;
        if (tq && canMove(tq)) { turnTo(tq, e.shiftKey ? nextFacing(tq, dq) : rotOf(tq) + dq * 15); e.preventDefault(); }
        return;
      }
      if (k === 'Enter' && st.draft) { finishDraft(); e.preventDefault(); return; }
      if ((k === 'Delete' || k === 'Backspace') && st.sel && canEdit()) { removeToken(tokById(st.sel)); e.preventDefault(); return; }
      var dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k];
      if (dir) {
        e.preventDefault();
        if (!nudge(dir[0], dir[1])) { st.view.x -= dir[0] * 60; st.view.y -= dir[1] * 60; viewChanged(); }
        return;
      }
      if (k === '+' || k === '=') { zoomCenter(1.3); return; }
      if (k === '-' || k === '_') { zoomCenter(1 / 1.3); return; }
      if (k === '0') { fit(); return; }
      var tool = TOOLS.filter(function (x) { return x.key === low; })[0];
      if (tool && (!tool.gm || canEdit())) { pickTool(tool.id); e.preventDefault(); }
    });
    document.addEventListener('keyup', function (e) { if (e.key === ' ') space = false; });
    window.addEventListener('blur', function () { space = false; });
  }

  // ----- drawings and texts -----
  function drawById(id) { for (var i = 0; i < st.drawings.length; i++) if (st.drawings[i].id === id) return st.drawings[i]; return null; }
  function canEditDrawing(d) { return canWrite() && (canEdit() || (!!me() && d.createdBy === me())); }
  // Who sees a drawing: the Mestre's layer only the Mestre (not as a player).
  function drawingShown(d) { return d.layer !== 'gm' || (gm() && !st.asPlayer); }
  // Its points: while dragged, moved; just moved, where it went (until the store has it there).
  function dPts(d) {
    var mv = st.dMoved[d.id], p = (mv ? mv.pts : d.points || []).map(Number);
    if (st.dragD && st.dragD.id === d.id) for (var i = 0; i < p.length; i += 2) { p[i] += st.dragD.dx; p[i + 1] += st.dragD.dy; }
    return p;
  }
  function textFont(d, z) { return (d.italic ? 'italic ' : '') + (d.bold ? '700 ' : '400 ') + (+d.fontSize || 24) * (z || 1) + 'px ' + boardFontCss(d.font); }
  function textBox(d) {
    var p = dPts(d), fs = +d.fontSize || 24;
    ctx.save(); ctx.font = textFont(d); var w = ctx.measureText(d.text || '').width; ctx.restore();
    var pad = fs * 0.2;
    return { x: p[0] - pad, y: p[1] - pad, w: w + pad * 2, h: fs * 1.25 + pad * 2 };
  }
  function drawShape(d, sel, z) {
    var p = d.points ? dPts(d) : d.pts, TAU = Math.PI * 2;
    ctx.save();
    if (d.layer === 'gm') ctx.globalAlpha = 0.6;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = +d.width || 4; ctx.strokeStyle = d.stroke || '#000';
    if (d.kind === 'free' || d.kind === 'line') {
      ctx.beginPath(); ctx.moveTo(p[0], p[1]);
      for (var i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
      if (p.length === 2) ctx.lineTo(p[0] + 0.01, p[1]);
      ctx.stroke();
    } else if (d.kind === 'rect' || d.kind === 'ellipse') {
      var x = Math.min(p[0], p[2]), y = Math.min(p[1], p[3]), w = Math.abs(p[2] - p[0]), h = Math.abs(p[3] - p[1]);
      ctx.beginPath();
      if (d.kind === 'rect') ctx.rect(x, y, w, h); else ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, TAU);
      if (d.fill) { ctx.fillStyle = d.fill; ctx.fill(); }
      ctx.stroke();
    } else if (d.kind === 'text') {
      var bx = textBox(d);
      if (d.fill) { ctx.fillStyle = d.fill; ctx.fillRect(bx.x, bx.y, bx.w, bx.h); }
      ctx.font = textFont(d); ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = d.stroke || '#fff';
      ctx.fillText(d.text || '', p[0], p[1] + (+d.fontSize || 24) * 0.1);
    }
    if (sel) {
      var bb = drawBox(d);
      ctx.globalAlpha = 1; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5 / z; ctx.setLineDash([6 / z, 4 / z]);
      ctx.strokeRect(bb.x - 4 / z, bb.y - 4 / z, bb.w + 8 / z, bb.h + 8 / z);
    }
    ctx.restore();
  }
  function drawBox(d) {
    if (d.kind === 'text') return textBox(d);
    var p = dPts(d), x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, hw = (+d.width || 4) / 2;
    for (var i = 0; i < p.length; i += 2) { x0 = Math.min(x0, p[i]); x1 = Math.max(x1, p[i]); y0 = Math.min(y0, p[i + 1]); y1 = Math.max(y1, p[i + 1]); }
    return { x: x0 - hw, y: y0 - hw, w: x1 - x0 + hw * 2, h: y1 - y0 + hw * 2 };
  }
  function drawLayer(layer, z) { st.drawings.forEach(function (d) { if (d.layer === layer && drawingShown(d)) drawShape(d, st.selD === d.id, z); }); }
  // The drawing on top under x, y that this person may pick: the Mestre's on the layer being edited,
  // a player's own on the tokens layer.
  function hitDrawing(x, y, onlyText) {
    var tol = 6 / st.view.z;
    for (var i = st.drawings.length - 1; i >= 0; i--) {
      var d = st.drawings[i];
      if (onlyText && d.kind !== 'text') continue;
      if (canEdit() ? d.layer !== st.layer : d.layer !== 'tokens' || d.createdBy !== me()) continue;
      var p = dPts(d), hw = (+d.width || 4) / 2 + tol;
      if (d.kind === 'free' || d.kind === 'line') { if (BoardGeo.polyDist(x, y, p) <= hw) return d; continue; }
      if (d.kind === 'text') { var b = textBox(d); if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return d; continue; }
      var rx0 = Math.min(p[0], p[2]), ry0 = Math.min(p[1], p[3]), w = Math.abs(p[2] - p[0]), h = Math.abs(p[3] - p[1]);
      if (d.kind === 'rect') {
        var inside = x >= rx0 && x <= rx0 + w && y >= ry0 && y <= ry0 + h;
        if ((d.fill && inside) || BoardGeo.polyDist(x, y, [rx0, ry0, rx0 + w, ry0, rx0 + w, ry0 + h, rx0, ry0 + h, rx0, ry0]) <= hw) return d;
      } else {
        var ex = w / 2 || 1, ey = h / 2 || 1, k = Math.hypot((x - rx0 - ex) / ex, (y - ry0 - ey) / ey);
        if ((d.fill && k <= 1) || Math.abs(k - 1) * Math.min(ex, ey) <= hw) return d;
      }
    }
    return null;
  }
  function selectDrawing(id) {
    if (st.selD === id) return;
    st.selD = id; if (id) st.sel = null; st.confirm = null; st.hudMarks = false;
    renderHud(); requestDraw();
  }
  function removeDrawing(d) {
    if (!d || !canEditDrawing(d)) return;
    if (st.selD === d.id) selectDrawing(null);
    BoardOps.removeDrawing(d).catch(function (er) { toast(errorText(er), true); });
  }
  // A drawing being made: free collects the pointer's path; line, rect and ellipse go from where it
  // started to where it is (Shift: lines in steps of 15°, squares, circles).
  function sketchTo(m, shift) {
    var s = st.sketch; if (!s) return;
    if (s.kind === 'free') {
      var n = s.pts.length, min = 2 / st.view.z;
      if (Math.hypot(m.x - s.pts[n - 2], m.y - s.pts[n - 1]) >= min) s.pts.push(m.x, m.y);
    } else {
      var x = m.x, y = m.y, ax = s.pts[0], ay = s.pts[1];
      if (shift && s.kind === 'line') { var a = Math.round(Math.atan2(y - ay, x - ax) / (Math.PI / 12)) * (Math.PI / 12), l = Math.hypot(x - ax, y - ay); x = ax + Math.cos(a) * l; y = ay + Math.sin(a) * l; }
      else if (shift) { var side = Math.max(Math.abs(x - ax), Math.abs(y - ay)); x = ax + Math.sign(x - ax || 1) * side; y = ay + Math.sign(y - ay || 1) * side; }
      s.pts = [ax, ay, x, y];
    }
    requestDraw();
  }
  function finishSketch() {
    var s = st.sketch; st.sketch = null; requestDraw();
    if (!s) return;
    var p = s.pts, z = st.view.z, big = 3 / z;
    if (s.kind === 'free') { if (p.length < 4) return; p = BoardGeo.simplify(p, 1.2 / z); }
    else if (Math.hypot(p[2] - p[0], p[3] - p[1]) < big || (s.kind !== 'line' && (Math.abs(p[2] - p[0]) < big || Math.abs(p[3] - p[1]) < big))) return;
    var body = { boardId: st.id, kind: s.kind, layer: s.layer, points: p.map(function (v) { return Math.round(v * 10) / 10; }), stroke: s.stroke, fill: s.kind === 'rect' || s.kind === 'ellipse' ? s.fill : null, width: s.width };
    BoardOps.saveDrawing(body).catch(function (er) { toast(errorText(er), true); });
  }
  function newLayer() { return canEdit() ? st.layer : 'tokens'; }
  function strokeWidth() { return Math.max(1, Math.round(cell() * boardPick(BOARD_WIDTHS, opt.width).k * 10) / 10); }
  // ----- the text tool: a field over the map, where the text goes -----
  function openText(at, d) {
    commitText();
    var z = st.view.z, fs = d ? +d.fontSize : Math.max(4, Math.round(cell() * boardPick(BOARD_TEXT_SIZES, opt.tSize).k));
    st.textEdit = { x: d ? +d.points[0] : at.x, y: d ? +d.points[1] : at.y, id: d ? d.id : null,
      style: d ? { stroke: d.stroke, fill: d.fill, font: d.font, fontSize: fs, bold: !!d.bold, italic: !!d.italic }
        : { stroke: opt.tColor, fill: opt.tBg, font: opt.font, fontSize: fs, bold: opt.bold, italic: opt.italic } };
    var sty = st.textEdit.style;
    textIn.value = d ? d.text || '' : '';
    textIn.style.left = (st.view.x + st.textEdit.x * z) + 'px'; textIn.style.top = (st.view.y + st.textEdit.y * z) + 'px';
    textIn.style.font = textFont(sty, z); textIn.style.color = sty.stroke || '#fff'; textIn.style.background = sty.fill || 'transparent';
    textIn.hidden = false;
    if (d) { st.selD = d.id; requestDraw(); }
    setTimeout(function () { textIn.focus(); textIn.select(); }, 0);
  }
  // Saves what was typed: a new text, a changed one, or (emptied) one that goes.
  function commitText() {
    var e = st.textEdit; if (!e) return;
    st.textEdit = null; textIn.hidden = true;
    var txt = textIn.value.trim(), d = e.id && drawById(e.id);
    if (d) {
      if (!txt) removeDrawing(d);
      else if (txt !== d.text) BoardOps.patchDrawing(d, { text: txt }).catch(function (er) { toast(errorText(er), true); });
      return;
    }
    if (!txt) return;
    BoardOps.saveDrawing(Object.assign({ boardId: st.id, kind: 'text', layer: newLayer(), points: [Math.round(e.x * 10) / 10, Math.round(e.y * 10) / 10], text: txt, width: 1 }, e.style))
      .catch(function (er) { toast(errorText(er), true); });
  }
  function wireText() {
    textIn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); commitText(); vp.focus({ preventScroll: true }); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); st.textEdit = null; textIn.hidden = true; vp.focus({ preventScroll: true }); }
    });
    textIn.addEventListener('blur', function () { setTimeout(commitText, 0); });
  }

  // ----- the ruler: shape, snapping to the grid, cells, and the others' rulers -----
  function rulerSnap(m) {
    var b = st.board;
    if (opt.mSnap === 'none' || b.gridType === 'none') return { x: m.x, y: m.y };
    return opt.mSnap === 'corner' ? BoardGeo.snapCorner(b, m.x, m.y) : BoardGeo.snap(b, m.x, m.y, 1);
  }
  function rulerCells(R) {
    var b = st.board; if (b.gridType === 'none') return [];
    var n = BoardGeo.cells(b, R.ax, R.ay, R.bx, R.by), len = Math.hypot(R.bx - R.ax, R.by - R.ay), s = cell();
    if (R.sh === 'radius') return BoardGeo.areaCells(b, R.ax - len - s, R.ay - len - s, R.ax + len + s, R.ay + len + s, function (x, y) { return BoardGeo.cells(b, R.ax, R.ay, x, y) <= n; });
    if (R.sh === 'cone') {
      var a = Math.atan2(R.by - R.ay, R.bx - R.ax);
      return BoardGeo.areaCells(b, R.ax - len - s, R.ay - len - s, R.ax + len + s, R.ay + len + s, function (x, y) {
        var d = Math.hypot(x - R.ax, y - R.ay); if (d < 1) return true;
        var da = Math.abs(((Math.atan2(y - R.ay, x - R.ax) - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        return d <= len + s * 0.3 && da <= Math.PI / 6 + 0.02;
      });
    }
    return BoardGeo.lineCells(b, R.ax, R.ay, R.bx, R.by);
  }
  function drawRuler(R, color, name, z, alpha) {
    var b = st.board, len = Math.hypot(R.bx - R.ax, R.by - R.ay), a = Math.atan2(R.by - R.ay, R.bx - R.ax);
    ctx.save(); ctx.globalAlpha = alpha;
    if (opt.mCells && b.gridType !== 'none' && len > 0) {
      var cs = rulerCells(R);
      ctx.beginPath(); cs.forEach(function (c) { BoardGeo.cellPath(ctx, b, c.x, c.y); });
      ctx.fillStyle = color; ctx.globalAlpha = alpha * 0.22; ctx.fill(); ctx.globalAlpha = alpha * 0.6; ctx.strokeStyle = color; ctx.lineWidth = 1 / z; ctx.stroke();
      ctx.globalAlpha = alpha;
    }
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2.5 / z; ctx.setLineDash([8 / z, 5 / z]);
    ctx.beginPath();
    if (R.sh === 'radius') ctx.arc(R.ax, R.ay, len, 0, Math.PI * 2);
    else if (R.sh === 'cone') { ctx.moveTo(R.ax, R.ay); ctx.arc(R.ax, R.ay, len, a - Math.PI / 6, a + Math.PI / 6); ctx.closePath(); }
    ctx.moveTo(R.ax, R.ay); ctx.lineTo(R.bx, R.by);
    ctx.stroke(); ctx.setLineDash([]);
    [[R.ax, R.ay], [R.bx, R.by]].forEach(function (pt) { ctx.beginPath(); ctx.arc(pt[0], pt[1], 4 / z, 0, Math.PI * 2); ctx.fill(); });
    var what = R.sh === 'radius' ? 'Raio ' : R.sh === 'cone' ? 'Cone ' : '';
    drawLabel((name ? name + ': ' : '') + what + distText(R.ax, R.ay, R.bx, R.by), R.bx, R.by - 18 / z, z, color);
    ctx.restore();
  }
  // The ruler to the others (a few times a second while it moves, and when it ends).
  function shareRuler(end) {
    var rt = W.store && W.store.realtime, R = st.ruler;
    if (!rt || !opt.mShare || !R) return;
    var t = Date.now(); if (!end && t - st.rulerSent < 70) return;
    st.rulerSent = t;
    rt.send('tab-ruler', { b: st.id, u: me(), nm: (window.hubUser && window.hubUser.name) || '', c: boardUserColor(me()), sh: R.sh,
      p: [R.ax, R.ay, R.bx, R.by].map(function (v) { return Math.round(v); }), end: !!end, linger: opt.mFade === 'linger' });
  }
  function onRuler(m) {
    if (!m || m.b !== st.id || !m.u || m.u === me() || !Array.isArray(m.p) || m.p.length !== 4 || !m.p.every(isFinite)) return;
    var keep = m.end ? (m.linger ? 5000 : 0) : 3000;
    if (!keep) delete st.rulers[m.u];
    else st.rulers[m.u] = { ax: +m.p[0], ay: +m.p[1], bx: +m.p[2], by: +m.p[3], sh: ['line', 'radius', 'cone'].indexOf(m.sh) >= 0 ? m.sh : 'line',
      c: safeColor(m.c), nm: String(m.nm || '').slice(0, 40), until: Date.now() + keep };
    requestDraw();
  }
  function safeColor(c) { c = String(c || ''); return /^(#[0-9a-f]{6}|hsl\(\d{1,3}, \d{1,3}%, \d{1,3}%\))$/i.test(c) ? c : '#f59e0b'; }

  // ----- the dice window (Roll20's Dice Roller): every roll goes to the chat -----
  var DICE_MODES = [['all', 'Todos', 'Todos veem a rolagem.'], ['gm', 'Mestre', 'Só você e o Mestre veem.'], ['secret', 'Secreto', 'Só o Mestre vê o resultado: nem você.']];
  function toggleDice() { if (BoardWin.get('dice')) BoardWin.close('dice'); else paintDice(); paintBar(); }
  function diceRoll(expr, nh, label) {
    var mode = opt.dMode;
    BoardChat.roll({ expr: expr, nh: nh, label: label || '', gm: mode === 'gm', secret: mode === 'secret', explode: !!opt.dExplode });
  }
  function paintDice() {
    var w = BoardWin.open('dice', { title: 'Rolador de dados', cls: 'bd-dicewin', width: 330, x: Math.max(12, stage.clientWidth - 410), y: 12, onClose: function () { paintTool('dice', false); } });
    var a = document.activeElement;
    if (a && w.body.contains(a) && a.tagName === 'INPUT') return;
    w.body.innerHTML = '<div class="bd-dice-modes" role="radiogroup" aria-label="Quem vê a rolagem">' + DICE_MODES.map(function (m) {
      return '<button type="button" role="radio" aria-checked="' + (opt.dMode === m[0]) + '" class="bd-chip' + (opt.dMode === m[0] ? ' on' : '') + '" data-dmode="' + m[0] + '" title="' + esc(m[2]) + '">' + m[1] + '</button>';
    }).join('') + '</div>' +
      '<table class="bd-dice-t"><tbody>' + BOARD_DICE.map(function (d) {
        var e = function (n) { return n + 'd' + d.s; };
        return '<tr><th><button type="button" class="bd-dlab" data-roll="' + e(1) + '" title="Rolar 1 ' + d.label + '">' + esc(d.label) + '</button></th>' +
          [2, 3, 4, 5, 6].map(function (n) { return '<td><button type="button" data-roll="' + e(n) + '" title="Rolar ' + e(n) + '">' + n + '</button></td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table>' +
      '<div class="bd-dice-foot"><button type="button" class="bd-adv-btn' + (opt.dAdv ? ' on' : '') + '" data-dact="adv" aria-expanded="' + !!opt.dAdv + '">Rolagem avançada</button>' +
        '<button type="button" class="bd-chip sq' + (opt.dExplode ? ' on' : '') + '" data-dact="explode" aria-pressed="' + !!opt.dExplode + '" title="Explodir: o dado no valor mais alto rola de novo e soma">!</button></div>' +
      (opt.dAdv ? '<form class="bd-adv"><label class="bd-olab grow"><span>Expressão</span><input type="text" id="bdExpr" value="' + esc(opt.dExpr) + '" placeholder="3d6+2" autocomplete="off" spellcheck="false"></label>' +
        '<label class="bd-olab nh"><span>NH</span><input type="number" id="bdNh" value="' + esc(opt.dNh) + '" placeholder="—" step="1"></label>' +
        '<label class="bd-olab grow"><span>Rótulo</span><input type="text" id="bdLabel" maxlength="80" placeholder="Ex.: Espada larga" autocomplete="off"></label>' +
        '<button class="btn primary" type="submit">Rolar</button></form>' +
        '<p class="bd-note">Com NH, um 3d6 é um teste de GURPS: sucesso ou falha, a margem e os críticos (B348). "2d+1" vale 2d6+1. As rolagens vão para o chat.</p>' : '');
    paintTool('dice', true);
    if (w.wired) return;
    w.wired = true;
    w.body.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var r = b.getAttribute('data-roll'); if (r) { diceRoll(r, null, ''); return; }
      var m = b.getAttribute('data-dmode'); if (m) { opt.dMode = m; saveOpt(); paintDice(); return; }
      var act = b.getAttribute('data-dact');
      if (act === 'adv') { opt.dAdv = !opt.dAdv; saveOpt(); paintDice(); if (opt.dAdv && $('bdExpr')) $('bdExpr').focus(); }
      else if (act === 'explode') { opt.dExplode = !opt.dExplode; saveOpt(); paintDice(); }
    });
    w.body.addEventListener('submit', function (e) {
      e.preventDefault();
      opt.dExpr = $('bdExpr').value.trim() || '3d6'; opt.dNh = $('bdNh').value.trim(); saveOpt();
      var n = opt.dNh !== '' && isFinite(+opt.dNh) ? Math.round(+opt.dNh) : null;
      diceRoll(opt.dExpr, n, $('bdLabel').value.trim());
    });
    w.body.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); vp.focus({ preventScroll: true }); } });
  }

  // ----- the options box (beside the toolbar) -----
  function swatchHtml(key, label, none) {
    var c = opt[key];
    return '<button type="button" class="bd-swatch' + (c ? '' : ' none') + (st.palette === key ? ' open' : '') + '" data-pal="' + key + '" style="--c:' + esc(c || 'transparent') + '" aria-label="' + esc(label + ': ' + (c || 'sem cor')) + '" aria-expanded="' + (st.palette === key) + '" title="' + esc(label) + '"></button>';
  }
  function paletteHtml(key, none) {
    if (st.palette !== key) return '';
    return '<div class="bd-palette" role="group" aria-label="Cores">' + BOARD_PALETTE.map(function (c) {
      return '<button type="button" class="bd-swatch' + (opt[key] === c ? ' on' : '') + '" data-color="' + c + '" style="--c:' + c + '" aria-label="' + c + '"></button>';
    }).join('') + (none ? '<button type="button" class="bd-swatch none' + (!opt[key] ? ' on' : '') + '" data-color="" aria-label="Sem cor" title="Sem cor"></button>' : '') +
      '<label class="bd-swatch custom" title="Outra cor" aria-label="Outra cor"><input type="color" data-color-input value="' + esc(opt[key] || '#ffffff') + '"></label></div>';
  }
  function switchHtml(key, label) {
    return '<label class="bd-switch"><input type="checkbox" data-o="' + key + '"' + (opt[key] ? ' checked' : '') + '><span class="bd-knob"></span>' + esc(label) + '</label>';
  }
  function selectHtml(key, label, list) {
    return '<label class="bd-olab"><span>' + esc(label) + '</span><select data-o="' + key + '">' + list.map(function (x) { return '<option value="' + x.id + '"' + (opt[key] === x.id ? ' selected' : '') + '>' + esc(x.label) + '</option>'; }).join('') + '</select></label>';
  }
  function optsHead(title) {
    return '<div class="bd-ohead"><b>' + esc(title) + '</b><button class="icon-btn" type="button" data-act="opts-x" aria-label="Fechar as opções" title="Fechar (a ferramenta continua)">' + svg(ICON.x, 16) + '</button></div>';
  }
  function renderOptions() {
    if (!opts || !st.board) { if (opts) opts.hidden = true; return; }
    var a = document.activeElement;
    if (a && opts.contains(a) && (a.tagName === 'INPUT' || a.tagName === 'SELECT') && !opts.hidden) { st.optsStale = true; return; }
    st.optsStale = false;
    var b = st.board, isGm = canEdit(), html = '', which = st.optsClosed === st.tool ? '' : st.tool;
    if (which === 'draw') {
      html = optsHead('Desenhar') +
        '<div class="bd-orow bd-chips" role="group" aria-label="Forma">' + BOARD_SHAPES.map(function (s) {
          return '<button type="button" class="bd-chip' + (opt.shape === s.id ? ' on' : '') + '" data-o="shape" data-v="' + s.id + '" aria-pressed="' + (opt.shape === s.id) + '">' + svg(s.icon, 15) + esc(s.label) + '</button>';
        }).join('') + '</div>' +
        '<div class="bd-orow"><span class="bd-olab"><span>Traço</span>' + swatchHtml('stroke', 'Cor do traço') + '</span>' +
          '<span class="bd-olab"><span>Preenchimento</span>' + swatchHtml('fill', 'Preenchimento', true) + '</span>' + selectHtml('width', 'Espessura', BOARD_WIDTHS) + '</div>' +
        paletteHtml('stroke', false) + paletteHtml('fill', true) +
        '<p class="bd-note">' + (isGm ? 'Na camada em edição (' + esc(boardLayerLabel(st.layer)) + '). ' : 'Na camada dos tokens; só você e o Mestre apagam os seus desenhos. ') +
          'Shift: linha de 15° em 15°, quadrado, círculo. Para apagar um, use Selecionar, clique nele e aperte Delete.</p>' +
        (st.confirm === 'draw-all' ? '<div class="confirm" role="alert"><span>Apagar todos os desenhos e textos deste tabuleiro?</span><div class="btn-row"><button class="btn danger solid" type="button" data-act="draw-all-yes">Apagar todos</button><button class="btn ghost" type="button" data-act="cancel">Cancelar</button></div></div>'
          : '<div class="btn-row"><button class="btn" type="button" data-act="draw-mine">' + svg(BOARD_ICON.erase, 15) + 'Apagar os meus</button>' + (isGm ? '<button class="btn danger" type="button" data-act="draw-all">' + svg(ICON.trash, 15) + 'Apagar todos</button>' : '') + '</div>');
    } else if (which === 'text') {
      html = optsHead('Texto') +
        '<div class="bd-orow"><span class="bd-olab"><span>Cor</span>' + swatchHtml('tColor', 'Cor do texto') + '</span><span class="bd-olab"><span>Fundo</span>' + swatchHtml('tBg', 'Fundo do texto', true) + '</span>' +
          selectHtml('font', 'Fonte', BOARD_FONTS) + selectHtml('tSize', 'Tamanho', BOARD_TEXT_SIZES) +
          '<span class="bd-olab"><span>Estilo</span><span class="bd-pair"><button type="button" class="bd-chip sq' + (opt.bold ? ' on' : '') + '" data-o="bold" aria-pressed="' + opt.bold + '" title="Negrito"><b>N</b></button>' +
          '<button type="button" class="bd-chip sq' + (opt.italic ? ' on' : '') + '" data-o="italic" aria-pressed="' + opt.italic + '" title="Itálico"><i>I</i></button></span></span></div>' +
        paletteHtml('tColor', false) + paletteHtml('tBg', true) +
        '<p class="bd-note">Clique no mapa e escreva: Enter salva, Esc desiste. Clique num texto seu para mudar o que diz; apagado o texto, ele some.</p>';
    } else if (which === 'ruler') {
      var rt = !!(W.store && W.store.realtime);
      html = optsHead('Medir') +
        '<div class="bd-orow">' + selectHtml('mShape', 'Forma', [{ id: 'line', label: 'Linha' }, { id: 'radius', label: 'Raio (explosão)' }, { id: 'cone', label: 'Cone' }]) +
          selectHtml('mSnap', 'Encaixe na grade', [{ id: 'center', label: 'Centro da célula' }, { id: 'corner', label: 'Canto da célula' }, { id: 'none', label: 'Sem encaixe' }]) + '</div>' +
        '<div class="bd-orow"><span class="bd-olab"><span>Ao soltar</span><span class="bd-pair">' +
          [['instant', 'Some'], ['linger', 'Fica 5 s']].map(function (f) { return '<button type="button" class="bd-chip' + (opt.mFade === f[0] ? ' on' : '') + '" data-o="mFade" data-v="' + f[0] + '" aria-pressed="' + (opt.mFade === f[0]) + '">' + f[1] + '</button>'; }).join('') + '</span></span></div>' +
        (rt ? switchHtml('mShare', 'Mostrar aos outros') : '<p class="bd-note">Mostrar a régua aos outros precisa do banco do site (Supabase).</p>') +
        (b.gridType !== 'none' ? switchHtml('mCells', 'Destacar as células') : '') +
        '<div class="bd-ofoot"><span>' + (BoardGeo.isHex(b) ? 'Conta em hexágonos' : b.gridType === 'square' ? 'Diagonal conta 1' : 'Em linha reta') + '</span><span>1 célula = ' + boardNum(+b.scale || 1) + ' ' + esc(b.unit || 'jd') + '</span></div>';
    } else if (which === 'walls' && isGm) {
      var walls = b.walls || [], doors = walls.filter(function (w) { return w.door; }).length;
      html = optsHead('Paredes e portas') + '<div class="bd-orow bd-chips" role="group" aria-label="O que o clique faz">' +
        [['wall', 'Parede', BOARD_ICON.walls], ['door', 'Porta', BOARD_ICON.door], ['erase', 'Apagar', BOARD_ICON.erase]].map(function (m) {
          return '<button type="button" class="bd-chip' + (st.wallMode === m[0] ? ' on' : '') + '" data-wmode="' + m[0] + '" aria-pressed="' + (st.wallMode === m[0]) + '">' + svg(m[2], 15) + m[1] + '</button>';
        }).join('') + '</div>' +
        '<p class="bd-note">' + (st.wallMode === 'door' ? 'Clique nas duas pontas da porta.' : st.wallMode === 'erase' ? 'Clique numa parede ou porta para apagar.' : 'Clique onde a parede começa e em cada canto. Duplo clique, Enter ou Esc termina.') + ' ' +
          plural(walls.length - doors, 'parede', 'paredes') + ' e ' + plural(doors, 'porta', 'portas') + '. Elas barram a visão (na luz dinâmica) e o caminho dos jogadores. Para abrir ou fechar uma porta, use Selecionar e clique no quadradinho dela.</p>' +
        (st.draft ? '<div><button class="btn" type="button" data-act="finish">Terminar a linha</button></div>' : '') +
        (!b.dynamicLight ? '<p class="bd-note warn">A luz dinâmica está desligada: as paredes barram só o caminho. Ligue em <b>Configurar</b>.</p>' : '') +
        (walls.length ? (st.confirm === 'walls' ? '<div class="confirm" role="alert"><span>Apagar todas as paredes e portas?</span><div class="btn-row"><button class="btn danger solid" type="button" data-act="walls-yes">Apagar todas</button><button class="btn ghost" type="button" data-act="cancel">Cancelar</button></div></div>'
          : '<div><button class="btn danger" type="button" data-act="walls-all">' + svg(ICON.trash, 15) + 'Apagar todas</button></div>') : '');
    } else if (which === 'fog' && isGm) {
      html = optsHead('Névoa') +
        (!b.fog ? '<p class="bd-note warn">A névoa manual está desligada: os jogadores veem o mapa inteiro (fora da luz dinâmica).</p><div><button class="btn primary" type="button" data-act="fog-on">Ligar a névoa manual</button></div>' : '') +
        '<div class="bd-orow bd-chips" role="group" aria-label="O que o arraste faz">' +
        [['show', 'Revelar'], ['hide', 'Esconder']].map(function (m) { return '<button type="button" class="bd-chip' + (st.fogMode === m[0] ? ' on' : '') + '" data-fmode="' + m[0] + '" aria-pressed="' + (st.fogMode === m[0]) + '">' + m[1] + '</button>'; }).join('') + '</div>' +
        '<p class="bd-note">Arraste um retângulo no mapa para ' + (st.fogMode === 'show' ? 'revelar' : 'esconder') + ' a área. Você vê a névoa mais fraca; os jogadores, inteira.</p>' +
        '<div class="btn-row"><button class="btn" type="button" data-act="fog-all">Revelar tudo</button><button class="btn" type="button" data-act="fog-none">Cobrir tudo</button></div>' +
        (b.dynamicLight && b.explorer ? '<h4 class="sec-title" style="margin:6px 0 0">Áreas exploradas</h4><p class="bd-note">O que os tokens dos jogadores já viram fica no mapa, escurecido.</p>' +
          (st.confirm === 'explored' ? '<div class="confirm" role="alert"><span>Esquecer o que os jogadores já exploraram?</span><div class="btn-row"><button class="btn danger solid" type="button" data-act="explored-yes">Esquecer</button><button class="btn ghost" type="button" data-act="cancel">Cancelar</button></div></div>'
            : '<div><button class="btn" type="button" data-act="explored">Esquecer áreas exploradas</button></div>') : '');
    } else if (which === 'grid' && isGm) {
      html = optsHead('Alinhar a grade') +
        '<p class="bd-note">Arraste de canto a canto de uma célula da grade desenhada na imagem (num hexágono, de uma ponta à outra). O tamanho e a posição da grade se ajustam a ela.</p>' +
        '<p class="bd-note">Agora: ' + esc(boardGridLabel(b.gridType)) + ', células de ' + boardNum(cell()) + ' px; cada uma vale ' + boardNum(+b.scale || 1) + ' ' + esc(b.unit || 'jd') + '.</p>' +
        '<div><button class="btn" type="button" data-act="cfg">' + svg(BOARD_ICON.gear, 15) + 'Configurar</button></div>';
    }
    opts.hidden = !html;
    opts.innerHTML = html;
  }
  function wireOptions() {
    opts.addEventListener('click', function (e) {
      var el = e.target.closest('button'); if (!el) return;
      var pal = el.getAttribute('data-pal');
      if (pal) { st.palette = st.palette === pal ? null : pal; renderOptions(); return; }
      if (el.hasAttribute('data-color')) { opt[st.palette] = el.getAttribute('data-color') || null; st.palette = null; saveOpt(); renderOptions(); return; }
      var o = el.getAttribute('data-o');
      if (o) {
        if (el.hasAttribute('data-v')) opt[o] = el.getAttribute('data-v'); else opt[o] = !opt[o];
        saveOpt(); renderOptions(); return;
      }
      onAct(e);
    });
    opts.addEventListener('change', function (e) {
      var el = /** @type {AnyEl} */ (e.target);
      if (el.hasAttribute('data-color-input')) { opt[st.palette] = el.value; saveOpt(); st.palette = null; renderOptions(); return; }
      var o = el.getAttribute('data-o'); if (!o) return;
      opt[o] = el.type === 'checkbox' ? el.checked : el.value;
      saveOpt(); requestDraw();
      setTimeout(renderOptions, 0);
    });
    opts.addEventListener('focusout', function () { setTimeout(function () { if (st.optsStale && !opts.contains(document.activeElement)) renderOptions(); }, 0); });
    // Typing in the box doesn't reach the board's shortcuts (see the keydown of wireInput).
    opts.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); vp.focus({ preventScroll: true }); } });
  }

  // ----- the selected token's buttons (HUD) -----
  var LAYER_ICON = {}; LAYER_BTNS.forEach(function (l) { LAYER_ICON[l.id] = l.icon; });
  function tokThumb(t) {
    var ref = tokRef(t);
    return '<span class="bd-dot" style="border-color:' + esc(t.color || '#f59e0b') + '"' + (ref ? ' data-img="' + esc(ref) + '"' : '') + '>' + esc(initials(t.name)) + '</span>';
  }
  function ownersText(t) {
    var names = (t.ownerIds || []).map(function (id) { var u = W.users.filter(function (x) { return x.id === id; })[0]; return u ? u.name : null; }).filter(Boolean);
    return names.length ? 'Controlado por ' + names.join(', ') : 'Sem jogador';
  }
  // What the HUD is about: the selected token (if this person sees it) or the selected drawing.
  function hudTarget() {
    var t = st.sel && tokById(st.sel);
    if (t && (fullView() || (t.layer === 'tokens' && (owns(t) || light.vis[t.id])))) return { t: t, d: null };
    var d = st.selD && drawById(st.selD);
    if (d && drawingShown(d)) return { t: null, d: d };
    return null;
  }
  function bubbleHtml(t, k, can) {
    var key = k[0], max = +t[k[1]] || 0, v = t[key] == null ? '–' : t[key];
    if (st.hudEdit === key) return '<input class="bd-bubble ' + key + '" data-bar="' + key + '" value="' + esc(t[key] == null ? '' : t[key]) + '" aria-label="' + k[2] + ': um número, ou +n / -n" inputmode="numeric" autocomplete="off">';
    return '<button type="button" class="bd-bubble ' + key + '" data-bar="' + key + '"' + (can ? '' : ' disabled') + ' title="' + k[2] + ': ' + esc(v) + (max ? ' de ' + max : '') + (can ? '. Clique para mudar (+3, -5).' : '') + '">' +
      '<b>' + esc(v) + '</b>' + (max ? '<small>' + max + '</small>' : '') + '<span>' + k[2] + '</span></button>';
  }
  function marksHtml(t) {
    var on = t.markers || [];
    return '<div class="bd-marks" role="group" aria-label="Marcadores de estado">' + BOARD_MARKERS.map(function (m) {
      var sel = on.indexOf(m.id) >= 0;
      return '<button type="button" class="bd-mark' + (sel ? ' on' : '') + '" data-mark="' + m.id + '" aria-pressed="' + sel + '" title="' + esc(m.label) + '" style="--c:' + m.color + ';--i:' + (paleColor(m.color) ? '#0b1222' : '#ffffff') + '">' + boardMarkerSvg(m, 14) + '</button>';
    }).join('') + '</div>';
  }
  function renderHud() {
    if (!hud || !st.board) return;
    renderAlerts();
    if (light.dirty) computeLight();
    // A selection this person can't see goes (a token of the Mestre's layer, after a change of user).
    var selT = st.sel && tokById(st.sel);
    if (selT && !fullView() && !(selT.layer === 'tokens' && (owns(selT) || light.vis[selT.id]))) { st.sel = null; requestDraw(); }
    var a = document.activeElement;
    if (a && hud.contains(a) && a.tagName === 'INPUT') return; // a bubble being typed
    var tg = hudTarget(), html = '';
    if (tg && tg.t) {
      var t = tg.t, mine = owns(t), can = canMove(t), isGm = canEdit();
      if ((fullView() || mine) && !boardIsTile(t)) {
        var bars = [['hp', 'hpMax', 'PV'], ['fp', 'fpMax', 'PF']].filter(function (k) { return isGm || +t[k[1]] > 0 || t[k[0]] != null; });
        if (bars.length) html += '<div class="bd-hud-bars">' + bars.map(function (k) { return bubbleHtml(t, k, can); }).join('') + '</div>';
      }
      html += '<div class="bd-hud-acts">' +
        (can && !boardIsTile(t) ? '<button type="button" class="bd-hud-btn' + (st.hudMarks ? ' on' : '') + '" data-hud="marks" aria-expanded="' + st.hudMarks + '" title="Marcadores de estado">' + svg(BOARD_ICON.tag, 15) + '</button>' : '') +
        (!boardIsTile(t) && canWrite() && (isGm || mine) ? '<button type="button" class="bd-hud-btn' + (BoardTurns.has(t.id) ? ' on' : '') + '" data-hud="turn" title="' + (BoardTurns.has(t.id) ? 'Está na ordem de turno' : 'Adicionar à ordem de turno (Ctrl+U)') + '">' + svg(BOARD_ICON.turns, 15) + '</button>' : '') +
        (t.characterId && charById(t.characterId) ? '<button type="button" class="bd-hud-btn" data-hud="sheet" title="Abrir o personagem">' + svg(BOARD_ICON.journal, 15) + '</button>' : '') +
        (isGm ? '<button type="button" class="bd-hud-btn" data-hud="edit" title="Configurar o token">' + svg(BOARD_ICON.gear, 15) + '</button>' : '') +
        '<button type="button" class="bd-hud-btn" data-hud="more" title="Mais (ou clique com o botão direito no token)">' + svg(BOARD_ICON.dots, 15) + '</button></div>' +
        (st.hudMarks && can ? marksHtml(t) : '');
    } else if (tg && tg.d && canEditDrawing(tg.d)) {
      html = '<div class="bd-hud-acts">' + (tg.d.kind === 'text' ? '<button type="button" class="bd-hud-btn" data-hud="text-edit" title="Mudar o texto">' + svg(ICON.edit, 15) + '</button>' : '') +
        '<button type="button" class="bd-hud-btn" data-hud="more" title="Mais (ou clique com o botão direito)">' + svg(BOARD_ICON.dots, 15) + '</button>' +
        '<button type="button" class="bd-hud-btn danger" data-hud="draw-del" title="Apagar (Delete)">' + svg(ICON.trash, 15) + '</button></div>';
    }
    hud.hidden = !html;
    hud.innerHTML = html;
    var inp = /** @type {HTMLInputElement} */ (hud.querySelector('input.bd-bubble')); if (inp) { inp.focus(); inp.select(); }
    placeHud();
  }
  // The HUD follows what it is about: the bubbles over it, the buttons under it (and its name).
  function placeHud() {
    if (!hud || hud.hidden) return;
    var tg = hudTarget(); if (!tg) { hud.hidden = true; return; }
    var v = st.view, z = v.z, x, top, bottom;
    if (tg.t) {
      var p = posOf(tg.t, false), tb = tileBox(tg.t), rr = boardIsTile(tg.t) ? Math.max(tb.w, tb.h) / 2 : tokR(tg.t);
      x = v.x + p.x * z; top = v.y + (p.y - rr) * z; bottom = v.y + (p.y + rr) * z + (boardIsTile(tg.t) ? 0 : 24);
    } else { var bb = drawBox(tg.d); x = v.x + (bb.x + bb.w / 2) * z; top = v.y + bb.y * z; bottom = v.y + (bb.y + bb.h) * z; }
    hud.style.left = Math.round(x) + 'px';
    hud.style.setProperty('--top', Math.round(top) + 'px');
    hud.style.setProperty('--bottom', Math.round(bottom) + 'px');
  }
  function commitBar(el) {
    var t = st.sel && tokById(st.sel), key = el.getAttribute('data-bar');
    st.hudEdit = null;
    if (t && key && el.value.trim() !== String(t[key] == null ? '' : t[key])) setBar(t, key, el.value);
    renderHud(); vp.focus({ preventScroll: true });
  }
  function wireHud() {
    hud.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var t = st.sel && tokById(st.sel), d = st.selD && drawById(st.selD);
      var bar = b.getAttribute('data-bar'); if (bar && t) { st.hudEdit = bar; renderHud(); return; }
      var mk = b.getAttribute('data-mark'); if (mk && t) { toggleMarker(t, mk); return; }
      var act = b.getAttribute('data-hud');
      if (act === 'marks') { st.hudMarks = !st.hudMarks; renderHud(); }
      else if (act === 'turn' && t) BoardTurns.addToken(t);
      else if (act === 'edit' && t) openTokenForm(t, null);
      else if (act === 'sheet' && t) BoardJournal.openChar(t.characterId);
      else if (act === 'more') { var r = b.getBoundingClientRect(); openCtx(r.left, r.bottom + 4, t ? { t: t } : { d: d }); }
      else if (act === 'text-edit' && d) { setTool('text'); openText(null, d); }
      else if (act === 'draw-del' && d) removeDrawing(d);
    });
    hud.addEventListener('keydown', function (e) {
      var el = /** @type {AnyEl} */ (e.target); if (!el.matches || !el.matches('input.bd-bubble')) return;
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); commitBar(el); }
      else if (e.key === 'Escape') { e.preventDefault(); st.hudEdit = null; renderHud(); vp.focus({ preventScroll: true }); }
    });
    hud.addEventListener('focusout', function (e) {
      var el = /** @type {AnyEl} */ (e.target);
      if (el.matches && el.matches('input.bd-bubble')) setTimeout(function () { if (st.hudEdit) commitBar(el); }, 0);
    });
  }

  // ----- the right-click menu -----
  // tg: { t } a token, { d } a drawing or { at } a place on the board.
  function ctxItems(tg) {
    var items = [], isGm = canEdit();
    if (tg.t) {
      var t = tg.t;
      if (isGm) items.push(['edit', 'Configurar o token…', BOARD_ICON.gear]);
      if (!boardIsTile(t) && canWrite() && (isGm || owns(t))) items.push(BoardTurns.has(t.id) ? ['turn', 'Está na ordem de turno', BOARD_ICON.turns, true] : ['turn', 'Adicionar ao turno', BOARD_ICON.turns]);
      if (canMove(t) && !boardIsTile(t)) items.push(['marks', 'Marcadores de estado…', BOARD_ICON.tag]);
      if (t.characterId && charById(t.characterId)) items.push(['sheet', 'Abrir o personagem', BOARD_ICON.journal]);
      items.push(['center', 'Centralizar', ICON.target]);
      if (canMove(t)) items.push(['turn-l', 'Girar uma face à esquerda (Shift+Q)', BOARD_ICON.turnLeft], ['turn-r', 'Girar uma face à direita (Shift+E)', BOARD_ICON.turnRight]);
      if (isGm) {
        items.push(['sep']);
        BOARD_LAYERS.forEach(function (l) { items.push(['layer:' + l.id, 'Camada: ' + l.label, LAYER_ICON[l.id], t.layer === l.id]); });
        items.push(['sep'], ['dup', 'Duplicar', BOARD_ICON.copy], ['del', 'Excluir', ICON.trash]);
      }
    } else if (tg.d) {
      if (tg.d.kind === 'text') items.push(['text-edit', 'Mudar o texto', ICON.edit]);
      if (isGm) { BOARD_LAYERS.forEach(function (l) { items.push(['dlayer:' + l.id, 'Camada: ' + l.label, LAYER_ICON[l.id], tg.d.layer === l.id]); }); items.push(['sep']); }
      items.push(['draw-del', 'Apagar', ICON.trash]);
    } else if (tg.at) {
      if (isGm) items.push(['new-token', 'Novo token aqui…', ICON.plus]);
      items.push(['ping-here', 'Apontar aqui', ICON.pin]);
    }
    return items;
  }
  function openCtx(cx, cy, tg) {
    var items = ctxItems(tg); if (!items.length) return;
    st.ctx = tg;
    ctxEl.innerHTML = (tg.t ? '<div class="bd-ctx-h">' + tokThumb(tg.t) + '<span><b>' + esc(tg.t.name || 'Sem nome') + '</b><small>' + esc((canEdit() ? boardLayerLabel(tg.t.layer) + ' · ' : '') + ownersText(tg.t)) + '</small></span></div>' : '') +
      items.map(function (it) {
        if (it[0] === 'sep') return '<hr>';
        return '<button type="button" role="menuitem" data-ctx="' + esc(it[0]) + '"' + (it[3] ? ' class="on"' : '') + '>' + svg(it[2], 15) + '<span>' + esc(it[1]) + '</span></button>';
      }).join('');
    ctxEl.hidden = false;
    fillImages(ctxEl);
    var sr = stage.getBoundingClientRect(), w = ctxEl.offsetWidth, h = ctxEl.offsetHeight;
    ctxEl.style.left = Math.max(6, Math.min(cx - sr.left, sr.width - w - 6)) + 'px';
    ctxEl.style.top = Math.max(6, Math.min(cy - sr.top, sr.height - h - 6)) + 'px';
    var f = /** @type {HTMLElement} */ (ctxEl.querySelector('button')); if (f) f.focus({ preventScroll: true });
  }
  function closeCtx() { if (ctxEl && !ctxEl.hidden) { ctxEl.hidden = true; ctxEl.innerHTML = ''; } st.ctx = null; }
  function onCtx(a) {
    var tg = st.ctx || {}, t = tg.t && tokById(tg.t.id), d = tg.d && drawById(tg.d.id), at = tg.at;
    closeCtx();
    if (a === 'edit' && t) openTokenForm(t, null);
    else if (a === 'turn' && t) BoardTurns.addToken(t);
    else if (a === 'marks' && t) { select(t.id); st.hudMarks = true; renderHud(); }
    else if (a === 'sheet' && t) BoardJournal.openChar(t.characterId);
    else if (a === 'center' && t) { var p = posOf(t, false); centerOn(p.x, p.y); }
    else if ((a === 'turn-l' || a === 'turn-r') && t) turnTo(t, nextFacing(t, a === 'turn-r' ? 1 : -1));
    else if (a.indexOf('layer:') === 0 && t) {
      var to = a.slice(6);
      BoardOps.patchToken(t, { layer: to }).then(function () { toast('Token na camada ' + boardLayerLabel(to) + '.'); }, function (er) { toast(errorText(er), true); });
      if (st.sel === t.id && to !== st.layer) select(null);
    }
    else if (a === 'dup' && t) duplicate(t);
    else if (a === 'del' && t) removeToken(t);
    else if (a === 'text-edit' && d) { setTool('text'); openText(null, d); }
    else if (a.indexOf('dlayer:') === 0 && d) BoardOps.patchDrawing(d, { layer: a.slice(7) }).catch(function (er) { toast(errorText(er), true); });
    else if (a === 'draw-del' && d) removeDrawing(d);
    else if (a === 'new-token' && at) openTokenForm(null, freeSpot(at.x, at.y));
    else if (a === 'ping-here' && at) ping(at.x, at.y);
  }

  // ----- the ≡ menu -----
  function paintMenu() {
    if (!menuEl) return;
    if (!st.menuOpen) { menuEl.hidden = true; menuEl.innerHTML = ''; return; }
    var isGm = canEdit(), b = st.board, items = [['back', 'Sair para a lista de tabuleiros', BOARD_ICON.back]];
    if (isGm && b) items.push(['sep'], ['pages', 'Páginas', BOARD_ICON.pages], ['cfg', 'Configurar esta página…', BOARD_ICON.gear], ['new-token', 'Novo token no centro…', ICON.plus],
      ['as', st.asPlayer ? 'Voltar a ver como Mestre' : 'Ver como os jogadores', BOARD_ICON.eye]);
    items.push(['sep'], ['side', opt.side ? 'Esconder a barra lateral' : 'Mostrar a barra lateral', BOARD_ICON.side], ['keys', 'Atalhos do teclado', BOARD_ICON.menu]);
    if (isGm && b) items.push(['sep'], ['delete', 'Excluir este tabuleiro…', ICON.trash]);
    menuEl.innerHTML = '<div class="bd-menu-h"><b>' + esc(b ? b.name : 'Tabuleiro') + '</b><small>' + (isGm ? 'Mestre' : 'Jogador') + '</small></div>' + items.map(function (it) {
      return it[0] === 'sep' ? '<hr>' : '<button type="button" role="menuitem" data-menu="' + it[0] + '"' + (it[0] === 'delete' ? ' class="danger"' : '') + '>' + svg(it[2], 15) + '<span>' + esc(it[1]) + '</span></button>';
    }).join('');
    menuEl.hidden = false;
    var f = /** @type {HTMLElement} */ (menuEl.querySelector('button')); if (f) f.focus({ preventScroll: true });
  }
  function onMenu(a) {
    st.menuOpen = false; paintMenu(); paintBar();
    if (a === 'back') go('#tabuleiros');
    else if (a === 'pages') BoardPages.setOpen(true);
    else if (a === 'cfg' && st.board) openBoardForm(boardById(st.id) || st.board);
    else if (a === 'new-token') { var v = vpSize(), c = toMap(v.left + v.w / 2, v.top + v.h / 2); openTokenForm(null, freeSpot(c.x, c.y)); }
    else if (a === 'as') viewAs(st.asPlayer ? '' : '*');
    else if (a === 'side') { opt.side = !opt.side; saveOpt(); paintSide(); }
    else if (a === 'keys') { showTab('settings'); var k = $('bdKeys'); if (k && k.scrollIntoView) k.scrollIntoView({ block: 'start' }); }
    else if (a === 'delete' && st.board) confirmDeleteBoard(boardById(st.id) || st.board);
  }
  function wireMenus() {
    ctxEl.addEventListener('click', function (e) { var b = e.target.closest('[data-ctx]'); if (b) onCtx(b.getAttribute('data-ctx')); });
    menuEl.addEventListener('click', function (e) { var b = e.target.closest('[data-menu]'); if (b) onMenu(b.getAttribute('data-menu')); });
    [ctxEl, menuEl].forEach(function (m) {
      m.addEventListener('keydown', function (e) {
        var btns = [].slice.call(m.querySelectorAll('button')), i = btns.indexOf(document.activeElement);
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (m === ctxEl) closeCtx(); else { st.menuOpen = false; paintMenu(); paintBar(); } vp.focus({ preventScroll: true }); }
        else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); var n = btns[(i + (e.key === 'ArrowDown' ? 1 : -1) + btns.length) % btns.length]; if (n) n.focus(); }
      });
    });
    // A click elsewhere closes them.
    document.addEventListener('pointerdown', function (e) {
      var tg = /** @type {AnyEl} */ (e.target);
      if (ctxEl && !ctxEl.hidden && !ctxEl.contains(tg)) closeCtx();
      if (st.menuOpen && menuEl && !menuEl.contains(tg) && !(tg.closest && tg.closest('[data-tool="menu"]'))) { st.menuOpen = false; paintMenu(); paintBar(); }
    }, true);
    alertsEl.addEventListener('click', onAct);
  }

  // ----- seeing as a player (Roll20's ?viewas=) -----
  // '' the Mestre's own view; '*' as the players together; an id, as that one player.
  function viewAs(v) {
    st.asPlayer = !!v; st.asUser = v && v !== '*' ? v : null;
    var u = st.asUser && W.users.filter(function (x) { return x.id === st.asUser; })[0];
    toast(!v ? 'Vendo como o Mestre.' : u ? 'Vendo como ' + u.name + '.' : 'Vendo como os jogadores.');
    dirtyLight(); paintBar(); renderHud(); if (opt.tab === 'settings') renderSettings();
  }

  // ----- the Settings tab -----
  var KEYS = [['V', 'Selecionar'], ['H · botão direito · espaço', 'Mover a vista'], ['D', 'Desenhar'], ['T', 'Texto'], ['R', 'Medir'], ['X', 'Rolador de dados'], ['O', 'Ordem de turno'],
    ['P', 'Apontar'], ['F · W · G', 'Névoa · paredes · grade (Mestre)'], ['Setas', 'Mover o token uma célula'], ['Q · E', 'Girar o token (Shift: de face em face)'],
    ['Ctrl+U', 'Pôr o token na ordem de turno'], ['Delete', 'Excluir o token ou o desenho'], ['+ · − · 0', 'Zoom · ajustar à tela'], ['Esc', 'Cancelar · voltar a Selecionar']];
  function setSwitch(key, label) { return '<label class="bd-switch"><input type="checkbox" data-set="' + key + '"' + (opt[key] ? ' checked' : '') + '><span class="bd-knob"></span>' + esc(label) + '</label>'; }
  function renderSettings() {
    var el = $('bdPane_settings'); if (!el) return;
    var isGm = canEdit(), players = W.users.filter(function (u) { return u.role !== 'mestre'; }).sort(byName);
    var cur = !st.asPlayer ? '' : st.asUser || '*';
    el.innerHTML = '<div class="bd-set">' +
      (isGm ? '<section><h4>Ver como</h4><select data-set="viewas" aria-label="Ver o tabuleiro como">' +
        '<option value=""' + (cur === '' ? ' selected' : '') + '>Mestre (tudo)</option><option value="*"' + (cur === '*' ? ' selected' : '') + '>Todos os jogadores</option>' +
        players.map(function (u) { return '<option value="' + esc(u.id) + '"' + (cur === u.id ? ' selected' : '') + '>' + esc(u.name) + '</option>'; }).join('') + '</select>' +
        '<p class="bd-note">O mapa como aquele jogador vê, com a luz dinâmica, a névoa e só os tokens à vista dele (o <code>?viewas=</code> do Roll20).</p></section>' : '') +
      '<section><h4>Nesta tela</h4>' + setSwitch('cards', 'Mensagens novas sobre o mapa com o chat fechado') + setSwitch('people', 'Quem está na mesa, no canto do mapa') +
        (W.store && W.store.realtime ? setSwitch('mShare', 'Mostrar a minha régua aos outros') : '') + '</section>' +
      (isGm ? '<section><h4>Mestre</h4><div class="btn-row">' +
        '<button class="btn" type="button" data-setact="cfg">' + svg(BOARD_ICON.gear, 15) + 'Configurar a página</button>' +
        '<button class="btn" type="button" data-setact="token">' + svg(ICON.plus, 15, 2.4) + 'Novo token</button>' +
        '<button class="btn" type="button" data-setact="pages">' + svg(BOARD_ICON.pages, 15) + 'Páginas</button></div>' +
        (st.confirm === 'chat' ? '<div class="confirm" role="alert"><span>Apagar o chat inteiro, para todos? Não dá para desfazer.</span><div class="btn-row"><button class="btn danger solid" type="button" data-setact="chat-yes">Apagar o chat</button><button class="btn ghost" type="button" data-setact="cancel">Cancelar</button></div></div>'
          : '<div class="btn-row"><button class="btn danger" type="button" data-setact="chat">' + svg(ICON.trash, 15) + 'Apagar o chat</button>' +
            '<button class="btn danger" type="button" data-setact="delete">' + svg(ICON.trash, 15) + 'Excluir este tabuleiro</button></div>') + '</section>' : '') +
      '<section id="bdKeys"><h4>Atalhos do teclado</h4><dl class="bd-keys">' + KEYS.map(function (k) { return '<dt><kbd>' + esc(k[0]) + '</kbd></dt><dd>' + esc(k[1]) + '</dd>'; }).join('') + '</dl></section></div>';
  }
  function wireSettings() {
    var el = $('bdPane_settings');
    el.addEventListener('change', function (e) {
      var i = /** @type {AnyEl} */ (e.target), k = i.getAttribute('data-set'); if (!k) return;
      if (k === 'viewas') { viewAs(i.value); return; }
      opt[k] = !!i.checked; saveOpt();
      if (k === 'people') paintPeople();
    });
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-setact]'); if (!b) return;
      var a = b.getAttribute('data-setact');
      if (a === 'cfg' && st.board) openBoardForm(boardById(st.id) || st.board);
      else if (a === 'token') onMenu('new-token');
      else if (a === 'pages') BoardPages.setOpen(true);
      else if (a === 'delete' && st.board) confirmDeleteBoard(boardById(st.id) || st.board);
      else if (a === 'chat') { st.confirm = 'chat'; renderSettings(); }
      else if (a === 'cancel') { st.confirm = null; renderSettings(); }
      else if (a === 'chat-yes') { st.confirm = null; renderSettings(); BoardChat.clearAll().then(function () { toast('O chat foi apagado.'); }, function (er) { toast(errorText(er), true); }); }
    });
  }

  // ----- the alerts over the board -----
  function renderAlerts() {
    if (!alertsEl || !st.board) return;
    var html = statusHtml();
    if (st.asPlayer) {
      var u = st.asUser && W.users.filter(function (x) { return x.id === st.asUser; })[0];
      html = '<div class="bd-note warn">' + svg(BOARD_ICON.eye, 14) + ' Vendo como <b>' + esc(u ? u.name : 'os jogadores') + '</b>. <button class="btn" type="button" data-act="as-off">Voltar</button></div>' + html;
    }
    alertsEl.innerHTML = html;
  }
  // What the light shows, in words, when it may surprise someone.
  function statusHtml() {
    var b = st.board, isGm = gm();
    var hidden = isGm && isSecret(b) ? '<div class="bd-note warn">Só ' + esc(seenBy(b)) + ' ' + seenVerb(b) + ' este tabuleiro.' +
      (canEdit() ? ' <button class="btn" type="button" data-act="reveal">' + svg(BOARD_ICON.eye, 15) + 'Revelar aos jogadores</button>' : '') + '</div>' : '';
    if (!b.dynamicLight) return hidden;
    return hidden + lightStatus(b, isGm && !st.asPlayer);
  }
  function lightStatus(b, isGm) {
    var viewers = st.tokens.filter(function (t) { return t.sight && !boardIsTile(t) && (isGm ? (t.ownerIds || []).length > 0 : gm() ? viewerOwns(t) : owns(t)); });
    if (isGm && !viewers.length) return '<p class="bd-note warn">Luz dinâmica ligada, mas nenhum token de jogador enxerga: os jogadores veem só escuridão. Num token deles, marque <b>Enxerga</b> e quem o controla.</p>';
    if (!isGm && !viewers.length) return '<p class="bd-note warn">' + (gm() ? 'Esse jogador não controla nenhum token que enxerga.' : 'Você não controla nenhum token que enxerga. Peça ao Mestre.') + '</p>';
    if (!b.globalLight && !st.tokens.some(function (t) { return +t.lightDim > 0; }) && !viewers.some(function (t) { return +t.darkvision > 0; })) return '<p class="bd-note warn">Está escuro: sem luz do dia, sem tokens com luz e sem visão no escuro, nada fica à vista.</p>';
    return '';
  }
  function refresh() { renderHud(); renderOptions(); }
  // The buttons of the options box and of the alerts.
  function onAct(e) {
    var el = e.target.closest('button'); if (!el) return;
    var b = st.board;
    var wm = el.getAttribute('data-wmode'); if (wm) { st.wallMode = wm; st.draft = null; paintBar(); requestDraw(); return; }
    var fm = el.getAttribute('data-fmode'); if (fm) { st.fogMode = fm; paintBar(); return; }
    var act = el.getAttribute('data-act');
    if (act === 'cancel') { st.confirm = null; refresh(); }
    else if (act === 'as-off') viewAs('');
    else if (act === 'opts-x') { st.optsClosed = st.tool; st.palette = null; paintBar(); vp.focus({ preventScroll: true }); }
    else if (act === 'finish') finishDraft();
    else if (act === 'walls-all') { st.confirm = 'walls'; renderOptions(); }
    else if (act === 'walls-yes') { st.confirm = null; st.draft = null; saveWalls([]); }
    else if (act === 'fog-on') { st.board = Object.assign({}, b, { fog: true }); dirtyLight(); BoardOps.patch(b, { fog: true, updatedAt: now() }).catch(function (er) { toast(errorText(er), true); }); renderOptions(); }
    else if (act === 'fog-all') saveFog([{ x: 0, y: 0, w: b.width, h: b.height, show: true }]);
    else if (act === 'fog-none') saveFog([]);
    else if (act === 'explored') { st.confirm = 'explored'; renderOptions(); }
    else if (act === 'explored-yes') {
      st.confirm = null; var ep = (+b.exploredEpoch || 0) + 1;
      st.board = Object.assign({}, b, { explored: '', exploredEpoch: ep }); exSync(); dirtyLight();
      BoardOps.patch(b, { explored: '', exploredEpoch: ep }).then(function () { toast('As áreas exploradas foram esquecidas.'); }, function (er) { toast(errorText(er), true); });
      renderOptions();
    } else if (act === 'cfg') openBoardForm(b);
    else if (act === 'reveal') {
      el.disabled = true;
      BoardOps.patch(b, { visible: true, updatedAt: now() }).then(function () { toast('Agora todos podem ver o tabuleiro.'); }, function (er) { el.disabled = false; toast(errorText(er), true); });
    }
    else if (act === 'draw-mine') {
      var mineD = st.drawings.filter(function (d) { return d.createdBy === me(); });
      if (!mineD.length) { toast('Você não tem desenhos neste tabuleiro.'); return; }
      BoardOps.removeDrawings(mineD).then(function () { toast(plural(mineD.length, 'desenho apagado', 'desenhos apagados') + '.'); }, function (er) { toast(errorText(er), true); });
    }
    else if (act === 'draw-all') { st.confirm = 'draw-all'; renderOptions(); }
    else if (act === 'draw-all-yes') {
      st.confirm = null; var all = st.drawings.slice();
      BoardOps.removeDrawings(all).then(function () { toast(plural(all.length, 'desenho apagado', 'desenhos apagados') + '.'); }, function (er) { toast(errorText(er), true); });
      renderOptions();
    }
  }

  // ----- who is at the table (a broadcast every 15 s while a board is open) -----
  function heartbeat() {
    var rt = W.store && W.store.realtime, u = /** @type {any} */ (window.hubUser || {});
    if (!st.id || !me()) return;
    st.here[me()] = { u: me(), nm: u.name || 'Você', b: st.id, c: boardUserColor(me()), gm: gm(), t: Date.now() };
    if (rt) rt.send('tab-here', { u: me(), nm: u.name || '', b: st.id, c: boardUserColor(me()), gm: gm() });
    paintPeople();
  }
  function onHere(m) {
    if (!m || typeof m.u !== 'string' || !m.u || m.u === me()) return;
    var was = st.here[m.u];
    if (m.gone) delete st.here[m.u];
    else st.here[m.u] = { u: m.u, nm: String(m.nm || 'Alguém').slice(0, 40), b: typeof m.b === 'string' ? m.b : null, c: safeColor(m.c), gm: !!m.gm, t: Date.now() };
    // Someone who just arrived at this board learns at once who is here (not in 15 s).
    if (!m.gone && !m.reply && st.id && m.b === st.id && (!was || was.b !== m.b)) {
      var rt = W.store && W.store.realtime, u = /** @type {any} */ (window.hubUser || {});
      if (rt && me()) rt.send('tab-here', { u: me(), nm: u.name || '', b: st.id, c: boardUserColor(me()), gm: gm(), reply: true });
    }
    paintPeople(); BoardPages.refresh();
  }
  function paintPeople() {
    var t = Date.now();
    Object.keys(st.here).forEach(function (k) { if (k !== me() && t - st.here[k].t > 40000) delete st.here[k]; });
    if (!peopleEl) return;
    var list = Object.keys(st.here).map(function (k) { return st.here[k]; }).filter(function (p) { return p.b === st.id; })
      .sort(function (a, b) { return (b.gm ? 1 : 0) - (a.gm ? 1 : 0) || String(a.nm).localeCompare(String(b.nm)); });
    peopleEl.hidden = !opt.people || !list.length;
    peopleEl.innerHTML = list.map(function (p) {
      return '<span class="bd-person' + (p.u === me() ? ' me' : '') + '" style="--c:' + esc(p.c) + '" title="' + esc(p.nm + (p.gm ? ' (Mestre)' : '')) + '">' +
        '<b>' + (p.gm ? svg(BOARD_ICON.crown, 12, 2.4) : esc(initials(p.nm))) + '</b><span>' + esc(p.nm) + '</span></span>';
    }).join('');
  }

  // ----- dragging from the Journal and the Art onto the board -----
  // d: { kind: 'char', id } or { kind: 'img', ref, w, h, name }; at: where (the middle of the screen
  // if null); alt: the image keeps its size and doesn't snap to the grid.
  function dropAt(d, at, alt) {
    var b = st.board;
    if (!b || !canEdit()) { toast('Só o Mestre põe tokens no mapa.', true); return; }
    if (!at) { var v = vpSize(); at = toMap(v.left + v.w / 2, v.top + v.h / 2); }
    var layer = st.tool === 'walls' ? 'tokens' : st.layer;
    var body = { boardId: b.id, name: '', x: at.x, y: at.y, size: 1, rotation: 0, color: '#f59e0b', layer: layer, ownerIds: [], sight: layer === 'tokens',
      sightRange: 0, darkvision: 0, lightBright: 0, lightDim: 0, hp: null, hpMax: null, fp: null, fpMax: null, markers: [], showName: true, characterId: null, image: null };
    if (d.kind === 'char') {
      var c = charById(d.id) || rawGet('characters', d.id);
      if (!c) { toast('Esse personagem não está mais no Mundo.', true); return; }
      body.name = c.name; body.characterId = c.id;
      var vit = boardSheetVitals(c.id); if (vit) { body.hp = body.hpMax = vit.hp; body.fp = body.fpMax = vit.fp; }
      // A character of the players: the same owners as its other token on this board.
      var other = st.tokens.filter(function (k) { return k.characterId === c.id && (k.ownerIds || []).length; })[0];
      if (other) body.ownerIds = other.ownerIds.slice();
    } else if (d.kind === 'img' && d.ref) {
      body.name = String(d.name || '').slice(0, 80);
      body.image = { ref: d.ref, w: +d.w || 0, h: +d.h || 0, type: d.type || '', size: +d.size || 0 };
      // With Alt, scenery: the image's own size, on the map layer (unless the foreground is the one being edited).
      if (alt && d.w && d.h) {
        body.size = Math.max(0.25, Math.min(20, Math.round(Math.max(d.w, d.h) / cell() * 4) / 4));
        if (layer !== 'fore' && layer !== 'map') { layer = 'map'; body.layer = 'map'; body.sight = false; }
      }
    } else return;
    var p = alt ? at : BoardGeo.snap(b, at.x, at.y, body.size);
    if (!alt && !boardIsTile(body) && body.size === 1) p = freeSpot(p.x, p.y);
    body.x = Math.min(b.width, Math.max(0, p.x)); body.y = Math.min(b.height, Math.max(0, p.y));
    BoardOps.saveToken(null, body, null, null, false).then(function (id) { select(id); toast((body.name || 'Token') + ' no mapa, na camada ' + boardLayerLabel(layer) + '.'); }, function (er) { toast(errorText(er), true); });
  }
  function hasDrag(e) { var ty = e.dataTransfer && e.dataTransfer.types; return !!ty && ([].indexOf.call(ty, BoardJournal.DRAG) >= 0 || [].indexOf.call(ty, 'Files') >= 0); }
  function wireDrop() {
    vp.addEventListener('dragover', function (e) { if (!hasDrag(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = canEdit() ? 'copy' : 'none'; vp.classList.add('drop'); });
    vp.addEventListener('dragleave', function (e) { if (!vp.contains(/** @type {Node} */ (e.relatedTarget))) vp.classList.remove('drop'); });
    vp.addEventListener('drop', function (e) {
      vp.classList.remove('drop');
      if (!hasDrag(e)) return;
      e.preventDefault();
      if (!canEdit()) { toast('Só o Mestre põe tokens no mapa.', true); return; }
      var m = toMap(e.clientX, e.clientY), alt = e.altKey, files = [].slice.call(e.dataTransfer.files || []).filter(function (f) { return /^image\//.test(f.type); });
      if (files.length) {
        files.forEach(function (f, i) { BoardArt.addFile(f).then(function (d) { dropAt(d, { x: m.x + i * cell(), y: m.y }, alt); }, function (er) { toast(errorText(er), true); }); });
        return;
      }
      var raw = e.dataTransfer.getData(BoardJournal.DRAG), d = null;
      try { d = raw ? JSON.parse(raw) : null; } catch (er) { d = null; }
      if (d) dropAt(d, m, alt);
    });
  }

  // ----- data -----
  function onDrawings(list) {
    if (!st.id) return;
    st.drawings = list.filter(function (d) { return d.boardId === st.id; });
    Object.keys(st.dMoved).forEach(function (id) {
      var m = st.dMoved[id], d = drawById(id);
      if (!d || JSON.stringify((d.points || []).map(Number)) === JSON.stringify(m.pts) || Date.now() - m.at > 4000) delete st.dMoved[id];
    });
    if (st.selD && !drawById(st.selD)) st.selD = null;
    requestDraw(); renderHud();
  }
  function onTokens(list) {
    if (!st.id) return;
    var mine = list.filter(function (t) { return t.boardId === st.id; });
    // A move shows where it went until the token arrives there (or 4 s pass).
    Object.keys(st.moved).forEach(function (id) {
      var m = st.moved[id], t = mine.filter(function (x) { return x.id === id; })[0];
      if (!t || (Math.abs(+t.x - m.x) < 0.02 && Math.abs(+t.y - m.y) < 0.02) || Date.now() - m.at > 4000) delete st.moved[id];
    });
    Object.keys(st.turned).forEach(function (id) {
      var m = st.turned[id], t = mine.filter(function (x) { return x.id === id; })[0];
      if (!t || Math.abs((+t.rotation || 0) - m.deg) < 0.06 || Date.now() - m.at > 4000) delete st.turned[id];
    });
    st.tokens = mine;
    if (st.sel && !tokById(st.sel)) st.sel = null;
    dirtyLight(); renderHud();
    // The chat's "Como" follows the tokens one controls; the turn order, their names and images.
    BoardChat.refreshAs(); BoardTurns.refresh();
  }
  // The board's document changed (or arrived).
  function sync() {
    if (!st.id) return;
    var b = boardById(st.id);
    if (!b) {
      st.board = null; st.sel = null; msg.hidden = false;
      hud.hidden = true; hud.innerHTML = ''; alertsEl.innerHTML = '';
      msg.innerHTML = !W.loaded.boards ? '<span>Carregando tabuleiro…</span>'
        : '<strong>' + (rawHas('boards', st.id) ? 'Este tabuleiro ainda não foi revelado' : 'Tabuleiro não encontrado') + '</strong><span>' +
          (rawHas('boards', st.id) ? 'Só o Mestre o vê por enquanto.' : 'Ele foi excluído, ou o link está incompleto.') + '</span><a class="btn" href="#tabuleiros">Voltar para Tabuleiros</a>';
      paintBar(); requestDraw(); return;
    }
    msg.hidden = true;
    var full = boardFull(b);
    st.board = full;
    if (!canEdit() && ['walls', 'fog', 'grid'].indexOf(st.tool) >= 0) st.tool = 'select';
    if (!st.viewOk) fitOrRestore();
    exSync(); dirtyLight(); paintBar(); renderHud();
    // Who sees which token depends on the board (light, fog): the turn order follows it.
    BoardTurns.refresh();
  }
  // What the sidebar shows follows the hub's data (characters, notes, images).
  function refreshSide() {
    if (!opt.side) return;
    if (opt.tab === 'journal') BoardJournal.refresh();
    else if (opt.tab === 'art') BoardArt.refresh();
    else if (opt.tab === 'settings') renderSettings();
  }
  function open(id) {
    if (!root) return;
    if (!vp) { build(); wireDrop(); }
    if (!pingOn && W.store && W.store.realtime) {
      pingOn = true;
      var rt = W.store.realtime;
      rt.on('tab-ping', onPing); rt.on('tab-ruler', onRuler); rt.on('tab-here', onHere);
      rt.on('tab-show', function (m) { if (st.id) BoardJournal.onShow(m); });
    }
    if (st.id !== id) {
      leaveBoard();
      st.id = id; st.sel = null; st.tool = 'select'; st.layer = 'tokens'; st.asPlayer = false; st.asUser = null; st.viewOk = false; st.tokens = []; st.moved = {}; st.pings = []; st.confirm = null;
      st.ruler = st.draft = st.rect = st.drag = st.press = st.rot = null; st.turned = {};
      st.drawings = []; st.selD = st.dragD = st.sketch = st.textEdit = null; st.dMoved = {}; st.rulers = {}; st.palette = null; st.optsClosed = null;
      st.hudEdit = null; st.hudMarks = false; st.menuOpen = false;
      if (textIn) textIn.hidden = true; if (rollsEl) rollsEl.innerHTML = '';
      closeCtx(); paintMenu(); paintSide();
      BoardTurns.setBoard(id);
      clearInterval(hereTimer); hereTimer = setInterval(heartbeat, 15000); heartbeat();
    }
    if (W.store) { BoardChat.start(); BoardTurns.start(); BoardArt.start(); BoardPages.start(); }
    if (!st.unTok && W.store) st.unTok = W.store.watch('boardTokens', onTokens, function () { toast('Não foi possível carregar os tokens.', true); });
    if (!st.unDraw && W.store) st.unDraw = W.store.watch('boardDrawings', onDrawings, function () { toast('Não foi possível carregar os desenhos.', true); });
    sync();
    refreshSide();
    BoardChat.refreshAs();
    BoardPages.refresh();
  }
  // From one board to another: what belongs to the board goes; the chat stays.
  function leaveBoard() {
    if (!st.id) return;
    if (ex.timer) exSave(true);
    commitText();
    if (st.unTok) { st.unTok(); st.unTok = null; }
    if (st.unDraw) { st.unDraw(); st.unDraw = null; }
    st.id = null; st.board = null; st.tokens = []; st.drawings = [];
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }
  // Out of the boards: the chat, the turn order, the windows and the presence go too.
  function close() {
    if (!st.id) return;
    leaveBoard();
    clearInterval(hereTimer); hereTimer = 0;
    var rt = W.store && W.store.realtime;
    if (rt && me()) rt.send('tab-here', { u: me(), gone: true });
    st.here = {};
    // The turn order first: closing its window by hand would close it for everyone.
    BoardTurns.stop(); BoardChat.stop(); BoardArt.stop();
    BoardWin.closeAll(); BoardPages.setOpen(false);
    closeCtx(); st.menuOpen = false; paintMenu();
  }
  function tokenVisible(t) {
    if (light.dirty && st.board) computeLight();
    return fullView() || (t.layer === 'tokens' && (owns(t) || !!light.vis[t.id]));
  }
  return {
    open: open, close: close, sync: sync,
    board: function () { return st.board; },
    boardId: function () { return st.id; },
    layer: function () { return st.layer; },
    tokens: function () { return st.tokens; },
    tokenById: tokById,
    tokenVisible: tokenVisible,
    select: function (id) { if (st.id) { st.sel = null; select(id); } },
    focusToken: focusToken,
    removeToken: removeToken,
    dropAt: dropAt,
    chatShown: chatShown,
    showTab: showTab,
    notify: notify,
    paintUnread: paintUnread,
    paintTool: paintTool,
    paintRibbon: function () { if (st.id && st.board) paintBar(); },
    presence: function () { return st.here; },
    redraw: function () { requestDraw(); if (st.id) renderHud(); }
  };
})();
