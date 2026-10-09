/* =====================================================================
   Hounds — Aba: Mesa Tática (Battle Map & Grid GURPS)
   ===================================================================== */

(function () {
  var TACTICAL_STORAGE_KEY = 'hounds_mesa_tatica_v1';

  var TACTICAL_PRESETS = [
    { id: 'ludgrim', name: 'Ludgrim (Mapa da Campanha)', img: '2e039124ddb530e855a5c2d99f4a0b95.jpg', color: '#78350f' },
    { id: 'tagmar', name: 'Tagmar (Região Hounds)', img: '715c023dfe533c931af407da5161c40f.jpg', color: '#1e3a8a' },
    { id: 'dungeon', name: 'Masmorra de Pedra', pattern: 'dungeon', color: '#334155' },
    { id: 'forest', name: 'Floresta Sombria', pattern: 'forest', color: '#14532d' },
    { id: 'tavern', name: 'Taberna de Madeira', pattern: 'tavern', color: '#713f12' },
    { id: 'arena', name: 'Arena de Areia', pattern: 'arena', color: '#854d0e' },
    { id: 'dark', name: 'Grade Tática Minimalista', pattern: 'dark', color: '#090d16' }
  ];

  var GURPS_MANEUVERS = [
    'Ataque',
    'Passo e Ataque',
    'Ataque Total (Dano)',
    'Ataque Total (Acerto)',
    'Defesa Total (+2)',
    'Concentração',
    'Espera',
    'Deslocamento Total (Sprint)'
  ];

  var FACING_NAMES = [
    'Norte (Frente Superior)',
    'Nordeste (Frente Direita)',
    'Sudeste (Flanco D.)',
    'Sul (Retaguarda)',
    'Sudoeste (Flanco E.)',
    'Noroeste (Frente Esquerda)'
  ];

  // Hex Math (Pointy-topped)
  function getHexCenter(col, row, hexSize) {
    var width = Math.sqrt(3) * hexSize;
    var x = (col + (row % 2 !== 0 ? 0.5 : 0)) * width + width / 2;
    var y = row * (1.5 * hexSize) + hexSize;
    return { x: x, y: y };
  }

  function getHexPoints(center, hexSize) {
    var pts = [];
    for (var i = 0; i < 6; i++) {
      var rad = (Math.PI / 180) * (60 * i - 30);
      pts.push((center.x + hexSize * Math.cos(rad)).toFixed(1) + ',' + (center.y + hexSize * Math.sin(rad)).toFixed(1));
    }
    return pts.join(' ');
  }

  function pixelToHex(px, py, hexSize) {
    var width = Math.sqrt(3) * hexSize;
    var approxRow = Math.round((py - hexSize) / (1.5 * hexSize));
    var isOdd = approxRow % 2 !== 0;
    var approxCol = Math.round((px - width / 2 - (isOdd ? 0.5 * width : 0)) / width);

    var bestDist = Infinity, bestCoord = { col: approxCol, row: approxRow };
    for (var r = approxRow - 1; r <= approxRow + 1; r++) {
      for (var c = approxCol - 1; c <= approxCol + 1; c++) {
        var center = getHexCenter(c, r, hexSize);
        var dist = Math.hypot(px - center.x, py - center.y);
        if (dist < bestDist) {
          bestDist = dist;
          bestCoord = { col: c, row: r };
        }
      }
    }
    return bestCoord;
  }

  function offsetToCube(col, row) {
    var q = col - Math.floor((row - (row & 1)) / 2);
    var r = row;
    return { x: q, y: -q - r, z: r };
  }

  function getHexDistance(a, b) {
    var ca = offsetToCube(a.col, a.row);
    var cb = offsetToCube(b.col, b.row);
    return Math.max(Math.abs(ca.x - cb.x), Math.abs(ca.y - cb.y), Math.abs(ca.z - cb.z));
  }

  function getGurpsRangePenalty(yards) {
    if (yards <= 2) return 0;
    if (yards <= 3) return -1;
    if (yards <= 5) return -2;
    if (yards <= 7) return -3;
    if (yards <= 10) return -4;
    if (yards <= 15) return -5;
    if (yards <= 20) return -6;
    if (yards <= 30) return -7;
    if (yards <= 50) return -8;
    if (yards <= 70) return -9;
    if (yards <= 100) return -10;
    if (yards <= 150) return -11;
    if (yards <= 200) return -12;
    return -15;
  }

  function getHexesInRange(center, radius) {
    var results = [];
    var cubeCenter = offsetToCube(center.col, center.row);
    for (var q = -radius; q <= radius; q++) {
      var r1 = Math.max(-radius, -q - radius);
      var r2 = Math.min(radius, -q + radius);
      for (var r = r1; r <= r2; r++) {
        var s = -q - r;
        var cx = cubeCenter.x + q;
        var cz = cubeCenter.z + r;
        var col = cx + Math.floor((cz - (cz & 1)) / 2);
        results.push({ col: col, row: cz });
      }
    }
    return results;
  }

  // Tactical State
  var state = {
    backgroundKey: 'ludgrim',
    gridType: 'hex',
    hexSize: 38,
    gridCols: 32,
    gridRows: 24,
    gridOpacity: 0.35,
    gridColor: '#cbd5e1',
    zoom: 1,
    panX: 40,
    panY: 40,
    activeTool: 'select', // 'select' | 'ruler' | 'area'
    rulerStart: null,
    rulerCurrent: null,
    areaCenter: null,
    areaRadius: 2,
    selectedTokenId: null,
    tokens: []
  };

  function loadState() {
    try {
      var saved = localStorage.getItem(TACTICAL_STORAGE_KEY);
      if (saved) {
        var p = JSON.parse(saved);
        Object.assign(state, p);
      }
    } catch (e) {}

    // Inicia tokens a partir dos personagens se estiver vazio
    if (!state.tokens || !state.tokens.length) {
      syncTokensFromCampanha();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(TACTICAL_STORAGE_KEY, JSON.stringify({
        backgroundKey: state.backgroundKey,
        gridType: state.gridType,
        hexSize: state.hexSize,
        gridCols: state.gridCols,
        gridRows: state.gridRows,
        gridOpacity: state.gridOpacity,
        gridColor: state.gridColor,
        zoom: state.zoom,
        panX: state.panX,
        panY: state.panY,
        tokens: state.tokens
      }));
    } catch (e) {}
  }

  function syncTokensFromCampanha() {
    var chars = (window.W && window.W.characters) || [];
    var existingIds = new Set(state.tokens.map(function (t) { return t.charId; }));
    var col = 4, row = 4;

    chars.forEach(function (c, idx) {
      if (!existingIds.has(c.id)) {
        state.tokens.push({
          id: 'token-' + c.id,
          charId: c.id,
          name: c.name,
          avatar: c.image ? c.image.ref : '',
          gridX: col + (idx % 6) * 3,
          gridY: row + Math.floor(idx / 6) * 3,
          facing: 1,
          hpCurrent: 12,
          hpMax: 12,
          fpCurrent: 10,
          fpMax: 10,
          basicMove: 5,
          maneuver: 'Ataque',
          isPlayer: (c.organization || '').toLowerCase().includes('hound')
        });
      }
    });

    // Se ainda não houver nenhum, cria 2 tokens padrão para teste
    if (!state.tokens.length) {
      state.tokens = [
        { id: 'token-duenne', name: 'Duenne', avatar: '3b0278d08eb4af32334d9e51d3c2ba35', gridX: 6, gridY: 6, facing: 1, hpCurrent: 13, hpMax: 13, fpCurrent: 11, fpMax: 11, basicMove: 6, maneuver: 'Passo e Ataque', isPlayer: true },
        { id: 'token-inimigo', name: 'Guerreiro Orc', avatar: '', gridX: 15, gridY: 8, facing: 4, hpCurrent: 11, hpMax: 11, fpCurrent: 10, fpMax: 10, basicMove: 5, maneuver: 'Ataque', isPlayer: false }
      ];
    }
  }

  // Renderizador principal da aba
  function renderMesaTatica() {
    var vTatica = $('view-tatica');
    if (!vTatica) return;

    loadState();
    syncTokensFromCampanha();

    vTatica.innerHTML =
      '<div class="tatica-wrap" id="taticaWrap">' +
        '<!-- Toolbar Superior -->' +
        '<div class="tatica-bar" id="taticaBar"></div>' +
        '<!-- Área Central: Canvas + Sidebar -->' +
        '<div class="tatica-body">' +
          '<div class="tatica-viewport" id="taticaViewport">' +
            '<svg class="tatica-svg" id="taticaSvg"></svg>' +
            '<div class="tatica-hud" id="taticaHud">1 hex = 1 jarda (0,9m)</div>' +
          '</div>' +
          '<aside class="tatica-sidebar" id="taticaSidebar"></aside>' +
        '</div>' +
        '<div class="tatica-popover" id="taticaPopover" hidden></div>' +
      '</div>';

    injectTaticaStyles();
    renderToolbar();
    renderSidebar();
    renderSvg();
    bindTaticaInteractions();
  }

  function injectTaticaStyles() {
    if ($('taticaStyles')) return;
    var s = document.createElement('style');
    s.id = 'taticaStyles';
    s.textContent =
      '.tatica-wrap { display: flex; flex-direction: column; width: 100%; height: 100%; background: #020617; overflow: hidden; position: relative; }' +
      '.tatica-bar { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 12px; background: rgba(11, 18, 34, 0.95); border-bottom: 1px solid #1e293b; z-index: 20; flex-wrap: wrap; }' +
      '.tatica-body { flex: 1; display: flex; min-height: 0; position: relative; overflow: hidden; }' +
      '.tatica-viewport { flex: 1; position: relative; overflow: hidden; cursor: crosshair; user-select: none; }' +
      '.tatica-svg { width: 100%; height: 100%; display: block; background: #090d16; }' +
      '.tatica-hud { position: absolute; bottom: 12px; left: 12px; background: rgba(2,6,23,0.85); border: 1px solid #334155; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-family: monospace; color: #fbbf24; pointer-events: none; }' +
      '.tatica-sidebar { width: 280px; flex: none; background: rgba(11, 18, 34, 0.95); border-left: 1px solid #1e293b; display: flex; flex-direction: column; overflow-y: auto; padding: 12px; gap: 10px; }' +
      '.tatica-popover { position: absolute; z-index: 40; width: 270px; background: #0b1222; border: 1px solid #334155; border-radius: 12px; padding: 12px; box-shadow: 0 16px 36px rgba(0,0,0,0.7); display: flex; flex-direction: column; gap: 8px; font-size: 12px; }' +
      '.t-tool-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: #e2e8f0; font-size: 12px; font-weight: 600; cursor: pointer; transition: all .15s; }' +
      '.t-tool-btn:hover { background: #1e293b; color: #fff; }' +
      '.t-tool-btn.active { background: #f59e0b; color: #020617; border-color: #f59e0b; font-weight: 700; }' +
      '.t-card { background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 8px 10px; cursor: pointer; display: flex; flex-direction: column; gap: 4px; transition: all .15s; }' +
      '.t-card:hover { border-color: #f59e0b; background: #131c31; }' +
      '.t-card.sel { border-color: #f59e0b; background: rgba(245,158,11,0.12); }' +
      '.t-hp-bar { height: 4px; background: #334155; border-radius: 2px; overflow: hidden; margin-top: 2px; }' +
      '.t-hp-fill { height: 100%; transition: width .2s; }';
    document.head.appendChild(s);
  }

  function renderToolbar() {
    var bar = $('taticaBar');
    if (!bar) return;

    var curPreset = TACTICAL_PRESETS.find(function (p) { return p.id === state.backgroundKey; }) || TACTICAL_PRESETS[0];

    bar.innerHTML =
      '<div style="display:flex;align-items:center;gap:4px;">' +
        '<button type="button" class="t-tool-btn ' + (state.activeTool === 'select' ? 'active' : '') + '" data-tool="select" title="Mover Tokens e Selecionar">' +
          svg(ICON.target, 14) + '<span>Mover</span>' +
        '</button>' +
        '<button type="button" class="t-tool-btn ' + (state.activeTool === 'ruler' ? 'active' : '') + '" data-tool="ruler" title="Medir Distância e Penalidade GURPS">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m2 22 20-20M13 3l8 8M9 7l4 4M5 11l4 4M3 15l2 2"/></svg><span>Régua</span>' +
        '</button>' +
        '<button type="button" class="t-tool-btn ' + (state.activeTool === 'area' ? 'active' : '') + '" data-tool="area" title="Modelo de Área / Explosão">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg><span>Área</span>' +
        '</button>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:8px;">' +
        '<label style="font-size:11px;color:#94a3b8;display:flex;align-items:center;gap:6px;">Mapa: ' +
          '<select id="tBgSelect" style="background:#0f172a;border:1px solid #334155;color:#e2e8f0;padding:4px 8px;border-radius:6px;font-size:11px;">' +
            TACTICAL_PRESETS.map(function (p) {
              return '<option value="' + p.id + '"' + (p.id === state.backgroundKey ? ' selected' : '') + '>' + esc(p.name) + '</option>';
            }).join('') +
          '</select>' +
        '</label>' +
        '<label style="font-size:11px;color:#94a3b8;display:flex;align-items:center;gap:4px;">Grid: ' +
          '<input type="range" id="tSizeRange" min="28" max="64" value="' + state.hexSize + '" style="width:70px;accent-color:#f59e0b;">' +
        '</label>' +
        '<div style="display:flex;align-items:center;gap:2px;">' +
          '<button type="button" class="t-tool-btn" id="tZoomOut" title="Afastar">-</button>' +
          '<span style="font-size:11px;font-family:monospace;color:#f59e0b;padding:0 4px;" id="tZoomVal">' + Math.round(state.zoom * 100) + '%</span>' +
          '<button type="button" class="t-tool-btn" id="tZoomIn" title="Aproximar">+</button>' +
          '<button type="button" class="t-tool-btn" id="tZoomReset" title="Restaurar Visão">100%</button>' +
        '</div>' +
      '</div>';

    bar.querySelectorAll('[data-tool]').forEach(function (btn) {
      btn.onclick = function () {
        state.activeTool = btn.getAttribute('data-tool');
        state.rulerStart = null;
        state.rulerCurrent = null;
        renderToolbar();
        renderSvg();
      };
    });

    var bgSel = $('tBgSelect');
    if (bgSel) {
      bgSel.onchange = function () {
        state.backgroundKey = bgSel.value;
        saveState();
        renderSvg();
      };
    }

    var sizeR = $('tSizeRange');
    if (sizeR) {
      sizeR.oninput = function () {
        state.hexSize = Number(sizeR.value);
        saveState();
        renderSvg();
      };
    }

    var zOut = $('tZoomOut'), zIn = $('tZoomIn'), zRes = $('tZoomReset');
    if (zOut) zOut.onclick = function () { state.zoom = Math.max(0.4, state.zoom / 1.2); applyZoom(); };
    if (zIn) zIn.onclick = function () { state.zoom = Math.min(2.5, state.zoom * 1.2); applyZoom(); };
    if (zRes) zRes.onclick = function () { state.zoom = 1; state.panX = 40; state.panY = 40; applyZoom(); };
  }

  function applyZoom() {
    var zv = $('tZoomVal');
    if (zv) zv.textContent = Math.round(state.zoom * 100) + '%';
    saveState();
    renderSvg();
  }

  function renderSidebar() {
    var sb = $('taticaSidebar');
    if (!sb) return;

    var html = '<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #1e293b;padding-bottom:8px;">' +
      '<strong style="font-size:13px;color:#fff;">Combatentes na Mesa</strong>' +
      '<span style="font-size:11px;font-family:monospace;color:#f59e0b;">' + state.tokens.length + '</span></div>';

    state.tokens.forEach(function (t) {
      var isSel = t.id === state.selectedTokenId;
      var hpPct = t.hpMax > 0 ? Math.max(0, Math.min(100, (t.hpCurrent / t.hpMax) * 100)) : 100;
      var hpColor = hpPct > 50 ? '#10b981' : hpPct > 20 ? '#f59e0b' : '#ef4444';

      html += '<div class="t-card ' + (isSel ? 'sel' : '') + '" data-tid="' + esc(t.id) + '">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;">' +
          '<strong style="font-size:12px;color:#fff;">' + esc(t.name) + '</strong>' +
          '<span style="font-size:10px;color:' + (t.isPlayer ? '#10b981' : '#f59e0b') + ';font-weight:700;">' + (t.isPlayer ? 'Jogador' : 'NPC') + '</span>' +
        '</div>' +
        '<div style="display:flex;align-items:center;justify-content:space-between;font-size:10px;color:#94a3b8;margin-top:2px;">' +
          '<span>Hex [' + t.gridX + ', ' + t.gridY + ']</span>' +
          '<span style="color:#f59e0b;font-weight:600;">' + esc(t.maneuver) + '</span>' +
        '</div>' +
        '<div class="t-hp-bar"><div class="t-hp-fill" style="width:' + hpPct + '%;background:' + hpColor + ';"></div></div>' +
      '</div>';
    });

    sb.innerHTML = html;

    sb.querySelectorAll('.t-card').forEach(function (card) {
      card.onclick = function () {
        var tid = card.getAttribute('data-tid');
        state.selectedTokenId = tid;
        renderSidebar();
        renderSvg();
        var tok = state.tokens.find(function (x) { return x.id === tid; });
        if (tok) openTokenPopover(tok);
      };
    });
  }

  function renderSvg() {
    var svgEl = $('taticaSvg');
    if (!svgEl) return;

    var curPreset = TACTICAL_PRESETS.find(function (p) { return p.id === state.backgroundKey; }) || TACTICAL_PRESETS[0];
    var hexSize = state.hexSize;
    var cols = state.gridCols;
    var rows = state.gridRows;

    var width = Math.sqrt(3) * hexSize;
    var totalW = (cols + 1) * width;
    var totalH = (rows + 1) * (1.5 * hexSize);

    var selToken = state.tokens.find(function (t) { return t.id === state.selectedTokenId; });
    var moveHexes = [];
    if (selToken) {
      var moveRange = selToken.maneuver.indexOf('Passo') >= 0 ? 1 : selToken.basicMove || 5;
      moveHexes = getHexesInRange({ col: selToken.gridX, row: selToken.gridY }, moveRange);
    }

    var html = '<g transform="translate(' + state.panX + ',' + state.panY + ') scale(' + state.zoom + ')">';

    // 1. Background
    if (curPreset.img) {
      html += '<image href="' + curPreset.img + '" x="0" y="0" width="' + totalW + '" height="' + totalH + '" preserveAspectRatio="xMidYMid slice" opacity="0.85"/>';
    } else {
      html += '<rect x="0" y="0" width="' + totalW + '" height="' + totalH + '" fill="' + curPreset.color + '"/>';
    }

    // 2. Grid Hexagonal
    html += '<g id="hexLayer">';
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var center = getHexCenter(c, r, hexSize);
        var pts = getHexPoints(center, hexSize);
        html += '<polygon points="' + pts + '" fill="transparent" stroke="' + state.gridColor + '" stroke-width="1" stroke-opacity="' + state.gridOpacity + '"/>';
      }
    }
    html += '</g>';

    // 3. Movement range highlight
    if (moveHexes.length) {
      html += '<g id="moveLayer">';
      moveHexes.forEach(function (h) {
        var cnt = getHexCenter(h.col, h.row, hexSize);
        var p = getHexPoints(cnt, hexSize);
        html += '<polygon points="' + p + '" fill="rgba(16,185,129,0.12)" stroke="rgba(16,185,129,0.5)" stroke-width="1" stroke-dasharray="3,3"/>';
      });
      html += '</g>';
    }

    // 4. Régua Tática
    if (state.rulerStart && state.rulerCurrent) {
      var pA = getHexCenter(state.rulerStart.col, state.rulerStart.row, hexSize);
      var pB = getHexCenter(state.rulerCurrent.col, state.rulerCurrent.row, hexSize);
      var distYards = getHexDistance(state.rulerStart, state.rulerCurrent);
      var pen = getGurpsRangePenalty(distYards);
      var midX = (pA.x + pB.x) / 2;
      var midY = (pA.y + pB.y) / 2;

      html += '<g id="rulerLayer">' +
        '<line x1="' + pA.x + '" y1="' + pA.y + '" x2="' + pB.x + '" y2="' + pB.y + '" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="5,4"/>' +
        '<circle cx="' + pA.x + '" cy="' + pA.y + '" r="5" fill="#f59e0b"/>' +
        '<circle cx="' + pB.x + '" cy="' + pB.y + '" r="5" fill="#f59e0b"/>' +
        '<g transform="translate(' + midX + ',' + (midY - 15) + ')">' +
          '<rect x="-80" y="-30" width="160" height="42" rx="8" fill="#020617" stroke="#f59e0b" stroke-width="1.5" opacity="0.95"/>' +
          '<text x="0" y="-12" fill="#fff" font-size="11" font-weight="bold" text-anchor="middle">Distância: ' + distYards + ' yd</text>' +
          '<text x="0" y="4" fill="#fbbf24" font-size="10" font-weight="bold" text-anchor="middle">Penalidade: ' + (pen >= 0 ? '0' : pen) + '</text>' +
        '</g>' +
      '</g>';
    }

    // 5. Tokens
    html += '<g id="tokensLayer">';
    state.tokens.forEach(function (tok) {
      var cnt = getHexCenter(tok.gridX, tok.gridY, hexSize);
      var rad = hexSize * 0.72;
      var isSel = tok.id === state.selectedTokenId;
      var facingAngle = tok.facing * 60;
      var ringColor = tok.isPlayer ? '#10b981' : '#ef4444';

      html += '<g transform="translate(' + cnt.x + ',' + cnt.y + ')" data-tokid="' + esc(tok.id) + '" style="cursor:pointer;">' +
        '<circle cx="0" cy="0" r="' + (rad + 3) + '" fill="#0b1222" stroke="' + (isSel ? '#f59e0b' : ringColor) + '" stroke-width="' + (isSel ? '3.5' : '2') + '"/>';

      if (tok.avatar) {
        html += '<clipPath id="cp_' + tok.id + '"><circle cx="0" cy="0" r="' + rad + '"/></clipPath>' +
          '<image href="' + tok.avatar + '" x="' + (-rad) + '" y="' + (-rad) + '" width="' + (rad * 2) + '" height="' + (rad * 2) + '" clip-path="url(#cp_' + tok.id + ')" preserveAspectRatio="xMidYMid slice"/>';
      } else {
        html += '<circle cx="0" cy="0" r="' + rad + '" fill="' + (tok.isPlayer ? '#047857' : '#991b1b') + '"/>' +
          '<text x="0" y="4" fill="#fff" font-size="11" font-weight="bold" text-anchor="middle">' + esc(tok.name.slice(0, 2).toUpperCase()) + '</text>';
      }

      // Seta de Facing GURPS
      html += '<g transform="rotate(' + facingAngle + ')">' +
        '<polygon points="0,' + (-rad - 8) + ' -5,' + (-rad - 2) + ' 5,' + (-rad - 2) + '" fill="#f59e0b" stroke="#020617" stroke-width="1"/>' +
      '</g>' +
      '<text x="0" y="' + (rad + 13) + '" fill="#f1f5f9" font-size="9.5" font-weight="bold" text-anchor="middle">' + esc(tok.name) + '</text>' +
      '</g>';
    });
    html += '</g>';

    html += '</g>';
    svgEl.innerHTML = html;
  }

  function openTokenPopover(tok) {
    var pop = $('taticaPopover');
    if (!pop) return;

    var cnt = getHexCenter(tok.gridX, tok.gridY, state.hexSize);
    var screenX = cnt.x * state.zoom + state.panX + 25;
    var screenY = cnt.y * state.zoom + state.panY - 40;

    pop.style.left = Math.min(window.innerWidth - 300, Math.max(10, screenX)) + 'px';
    pop.style.top = Math.min(window.innerHeight - 280, Math.max(70, screenY)) + 'px';
    pop.hidden = false;

    pop.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #1e293b;padding-bottom:6px;">' +
        '<strong style="font-size:13px;color:#fff;">' + esc(tok.name) + '</strong>' +
        '<button type="button" class="btn ghost" id="popClose" style="padding:2px 6px;">✕</button>' +
      '</div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;color:#94a3b8;">' +
        '<span>Facing: <b style="color:#f59e0b;">' + FACING_NAMES[tok.facing] + '</b></span>' +
        '<div style="display:flex;gap:4px;">' +
          '<button type="button" class="t-tool-btn" id="popTurnLeft" title="Girar -60°">↺</button>' +
          '<button type="button" class="t-tool-btn" id="popTurnRight" title="Girar +60°">↻</button>' +
        '</div>' +
      '</div>' +
      '<label style="display:flex;flex-direction:column;gap:3px;color:#94a3b8;">Manobra:' +
        '<select id="popManeuver" style="background:#0f172a;border:1px solid #334155;color:#e2e8f0;padding:4px;border-radius:6px;">' +
          GURPS_MANEUVERS.map(function (m) {
            return '<option value="' + m + '"' + (m === tok.maneuver ? ' selected' : '') + '>' + esc(m) + '</option>';
          }).join('') +
        '</select>' +
      '</label>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px;">' +
        '<span>PV: <b style="color:#fff;">' + tok.hpCurrent + '/' + tok.hpMax + '</b></span>' +
        '<div style="display:flex;gap:3px;">' +
          '<button type="button" class="btn danger" id="popHpMinus" style="padding:2px 8px;">-1</button>' +
          '<button type="button" class="btn" id="popHpPlus" style="padding:2px 8px;">+1</button>' +
        '</div>' +
      '</div>';

    $('popClose').onclick = function () { pop.hidden = true; };
    $('popTurnLeft').onclick = function () {
      tok.facing = ((tok.facing - 1 + 6) % 6);
      saveState();
      renderSvg();
      openTokenPopover(tok);
    };
    $('popTurnRight').onclick = function () {
      tok.facing = ((tok.facing + 1) % 6);
      saveState();
      renderSvg();
      openTokenPopover(tok);
    };
    $('popManeuver').onchange = function (e) {
      tok.maneuver = e.target.value;
      saveState();
      renderSidebar();
      renderSvg();
    };
    $('popHpMinus').onclick = function () {
      tok.hpCurrent = Math.max(0, tok.hpCurrent - 1);
      saveState();
      renderSidebar();
      openTokenPopover(tok);
    };
    $('popHpPlus').onclick = function () {
      tok.hpCurrent = tok.hpCurrent + 1;
      saveState();
      renderSidebar();
      openTokenPopover(tok);
    };
  }

  // Interação de Pan, Drag de Token e Régua
  function bindTaticaInteractions() {
    var vp = $('taticaViewport');
    if (!vp) return;

    var isPanning = false, panStart = { x: 0, y: 0 };
    var dragToken = null;

    vp.onmousedown = function (e) {
      if (e.target.closest('#taticaPopover')) return;
      var tokGroup = e.target.closest('[data-tokid]');
      if (tokGroup && state.activeTool === 'select') {
        var tid = tokGroup.getAttribute('data-tokid');
        dragToken = state.tokens.find(function (t) { return t.id === tid; });
        state.selectedTokenId = tid;
        renderSidebar();
        return;
      }

      if (state.activeTool === 'ruler') {
        var rect = vp.getBoundingClientRect();
        var mapX = (e.clientX - rect.left - state.panX) / state.zoom;
        var mapY = (e.clientY - rect.top - state.panY) / state.zoom;
        var hex = pixelToHex(mapX, mapY, state.hexSize);
        state.rulerStart = hex;
        state.rulerCurrent = hex;
        renderSvg();
        return;
      }

      if (e.button === 0 || e.button === 1) {
        isPanning = true;
        panStart = { x: e.clientX - state.panX, y: e.clientY - state.panY };
        var pop = $('taticaPopover');
        if (pop) pop.hidden = true;
      }
    };

    window.onmousemove = function (e) {
      if (isPanning) {
        state.panX = e.clientX - panStart.x;
        state.panY = e.clientY - panStart.y;
        renderSvg();
        return;
      }

      var rect = vp.getBoundingClientRect();
      var mapX = (e.clientX - rect.left - state.panX) / state.zoom;
      var mapY = (e.clientY - rect.top - state.panY) / state.zoom;
      var hex = pixelToHex(mapX, mapY, state.hexSize);

      if (dragToken) {
        dragToken.gridX = hex.col;
        dragToken.gridY = hex.row;
        renderSvg();
        return;
      }

      if (state.activeTool === 'ruler' && state.rulerStart) {
        state.rulerCurrent = hex;
        renderSvg();
      }
    };

    window.onmouseup = function () {
      if (isPanning) {
        isPanning = false;
        saveState();
      }
      if (dragToken) {
        dragToken = null;
        saveState();
        renderSidebar();
        renderSvg();
      }
    };

    vp.onwheel = function (e) {
      e.preventDefault();
      var factor = e.deltaY < 0 ? 1.15 : 0.85;
      state.zoom = Math.max(0.4, Math.min(2.5, state.zoom * factor));
      applyZoom();
    };
  }

  window.renderMesaTatica = renderMesaTatica;
})();
