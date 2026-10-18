/* =====================================================================
   Hounds — Tabuleiro: o Diário (personagens e anotações na barra lateral)
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   The Journal of the board, as Roll20's: the hub's own characters and
   notes (what this person can see), not copies.
     A character opens in a window with its portrait, its sheet's values
     (each one rolls 3d6 against it in the chat, in the character's name;
     the damage rolls its dice) and its description. Dragged onto the
     board, the Mestre gets its token (image, name, PV and PF of the sheet).
     A note opens in a window; the Mestre can show it to everyone at the
     table (it opens on their screens, if they can see it).
   ===================================================================== */
var BoardJournal = (function () {
  var root = null, q = '', DRAG = 'application/x-hounds-board';

  function gm() { return isMestre(); }
  function charRef(c) { return c && c.image && c.image.ref; }
  function match(s) { return !q || norm(s).indexOf(norm(q)) >= 0; }

  // ----- the panel -----
  function mount(el) {
    root = el;
    root.innerHTML = '<div class="bd-side-top"><input type="search" id="bdJrQ" placeholder="Buscar por nome…" aria-label="Buscar no diário" autocomplete="off">' +
      '<a class="icon-btn" href="#personagens" target="_blank" rel="noopener" title="Abrir Personagens numa aba nova" aria-label="Abrir Personagens numa aba nova">' + svg(ICON.explore, 16) + '</a></div>' +
      '<div class="bd-side-list" id="bdJrList"></div>';
    var qi = $('bdJrQ');
    qi.value = q;
    qi.oninput = function () { q = qi.value.trim(); renderList(); };
    var list = $('bdJrList');
    list.addEventListener('click', function (e) {
      var it = e.target.closest('[data-char],[data-note]'); if (!it) return;
      if (it.hasAttribute('data-char')) openChar(it.getAttribute('data-char'));
      else openNote(it.getAttribute('data-note'));
    });
    list.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var it = e.target.closest('[data-char],[data-note]'); if (!it) return;
      e.preventDefault(); it.click();
    });
    list.addEventListener('dragstart', function (e) {
      var it = e.target.closest('[data-char]'); if (!it || !e.dataTransfer) return;
      e.dataTransfer.setData(DRAG, JSON.stringify({ kind: 'char', id: it.getAttribute('data-char') }));
      e.dataTransfer.setData('text/plain', it.getAttribute('data-name') || '');
      e.dataTransfer.effectAllowed = 'copy';
    });
    renderList();
  }
  function renderList() {
    var el = root && $('bdJrList'); if (!el) return;
    var chars = W.characters.filter(function (c) { return match(c.name); }).sort(byName);
    var nbs = (W.notebooks || []).slice().sort(byName), notes = (W.notes || []).filter(function (n) { return match(n.title); });
    var html = '<details class="bd-jr-sec" open><summary>Personagens <span class="count">' + chars.length + '</span></summary>' +
      (chars.length ? '<ul class="bd-jr-items">' + chars.map(function (c) {
        var ref = charRef(c), sub = [c.race, c.sheetId && sheetById(c.sheetId) ? 'Ficha' : ''].filter(Boolean).join(' · ');
        return '<li tabindex="0" draggable="true" data-char="' + esc(c.id) + '" data-name="' + esc(c.name) + '" title="Clique para abrir' + (gm() ? '; arraste para o mapa para criar o token' : '') + '">' +
          '<span class="bd-dot"' + (ref ? ' data-img="' + esc(ref) + '"' : '') + '>' + esc(initials(c.name)) + '</span><span class="t"><b>' + esc(c.name) + '</b>' + (sub ? '<span>' + esc(sub) + '</span>' : '') + '</span>' +
          (isSecret(c) ? svg(EYE_OFF, 13, 2.2) : '') + '</li>';
      }).join('') + '</ul>' : '<p class="bd-note">' + (q ? 'Nenhum personagem com esse nome.' : 'Nenhum personagem ainda. Crie em <a class="inline" href="#personagens" target="_blank" rel="noopener">Personagens</a>.') + '</p>') + '</details>';
    var groups = nbs.map(function (nb) { return { nb: nb, notes: notes.filter(function (n) { return n.notebookId === nb.id; }).sort(function (a, b) { return String(a.title || '').localeCompare(String(b.title || ''), 'pt', { numeric: true }); }) }; })
      .filter(function (g) { return g.notes.length; });
    html += '<details class="bd-jr-sec" open><summary>Anotações <span class="count">' + notes.length + '</span></summary>' +
      (groups.length ? groups.map(function (g) {
        return '<h5>' + esc(g.nb.name) + '</h5><ul class="bd-jr-items notes">' + g.notes.map(function (n) {
          return '<li tabindex="0" data-note="' + esc(n.id) + '"><span class="bd-dot sq">' + svg(ICON.note, 14, 2) + '</span><span class="t"><b>' + esc(n.title || 'Sem título') + '</b></span>' + (isSecret(n) ? svg(EYE_OFF, 13, 2.2) : '') + '</li>';
        }).join('') + '</ul>';
      }).join('') : '<p class="bd-note">' + (q ? 'Nenhuma anotação com esse título.' : 'Nenhuma anotação ainda. Crie em <a class="inline" href="#anotacoes" target="_blank" rel="noopener">Anotações</a>.') + '</p>') + '</details>' +
      (gm() ? '<p class="bd-note">Arraste um personagem para o mapa para criar o token dele.</p>' : '');
    el.innerHTML = html;
    fillImages(el);
  }
  function refresh() {
    renderList();
    // The open windows follow the changes (a character renamed, a note edited).
    [].forEach.call(document.querySelectorAll('.bd-win[data-jr]'), function (w) {
      var k = w.getAttribute('data-jr'), id = k.slice(k.indexOf(':') + 1);
      if (k.indexOf('char:') === 0) openChar(id, true); else openNote(id, true);
    });
  }

  // ----- a character -----
  // The values of the sheet that roll: [key, label, value, what is rolled].
  function sheetRows(v) {
    var e = v.attrs, r = v.stats;
    return [['st', 'ST', e.st], ['dx', 'DX', e.dx], ['iq', 'IQ', e.iq], ['ht', 'HT', e.ht], ['per', 'Percepção', r.per], ['will', 'Vontade', r.will], ['dodge', 'Esquiva', r.dodge]];
  }
  function charBodyHtml(c, tab) {
    var ref = charRef(c), v = boardSheetVitals(c.id), sheet = c.sheetId && sheetById(c.sheetId);
    var head = '<div class="bd-cw-head"><span class="bd-cw-av"' + (ref ? ' data-img="' + esc(ref) + '"' : '') + '>' + esc(initials(c.name)) + '</span><div class="t"><b>' + esc(c.name) + '</b>' +
      '<span class="meta">' + esc([c.race, isSecret(c) ? 'só ' + seenBy(c) : ''].filter(Boolean).join(' · ')) + '</span>' +
      '<div class="bd-cw-links"><a class="btn" href="' + esc(charHref(c.id)) + '" target="_blank" rel="noopener">' + svg(ICON.user, 14) + 'Página</a>' +
      (sheet ? '<a class="btn" href="' + esc(sheetHref(sheet.id)) + '" target="_blank" rel="noopener">' + svg(ICON.sheet || ICON.edit, 14) + 'Ficha</a>' : '') + '</div></div></div>';
    var tabs = '<div class="bd-cw-tabs" role="tablist">' + [['attrs', 'Atributos'], ['bio', 'Descrição']].map(function (x) {
      return '<button type="button" role="tab" data-cw="' + x[0] + '" aria-selected="' + (tab === x[0]) + '">' + x[1] + '</button>';
    }).join('') + '</div>';
    var pane;
    if (tab === 'bio') pane = c.description ? '<p class="bd-cw-bio">' + esc(c.description).replace(/\n/g, '<br>') + '</p>' : '<p class="bd-note">Sem descrição.</p>';
    else if (!v) pane = '<p class="bd-note">' + (c.sheetId ? 'A ficha deste personagem não está visível para você.' : 'Este personagem não tem ficha.') + '</p>';
    else {
      var r = v.stats, can = canWrite();
      pane = '<div class="bd-cw-grid">' + sheetRows(v).map(function (x) {
        return '<button type="button" class="bd-cw-stat" data-roll="3d6" data-nh="' + esc(x[2]) + '" data-label="' + esc(x[1]) + '"' + (can ? '' : ' disabled') + ' title="Rolar 3d6 contra ' + esc(x[1]) + ' ' + esc(x[2]) + '"><span>' + esc(x[1]) + '</span><b>' + esc(x[2]) + '</b></button>';
      }).join('') + '</div>' +
        '<div class="bd-cw-sec"><span><span class="lab">PV</span> <b>' + esc(r.hp) + '</b></span><span><span class="lab">PF</span> <b>' + esc(r.fp) + '</b></span>' +
          '<span><span class="lab">VB</span> <b>' + esc(String(v.speed).replace('.', ',')) + '</b></span><span><span class="lab">Desl.</span> <b>' + esc(r.moveNow) + '</b></span></div>' +
        '<div class="bd-cw-dmg"><span class="lab">Dano</span>' +
          '<button type="button" class="btn" data-roll="' + esc(r.dmg.thr) + '" data-label="Dano GdP"' + (can ? '' : ' disabled') + '>GdP <b>' + esc(r.dmg.thr) + '</b></button>' +
          '<button type="button" class="btn" data-roll="' + esc(r.dmg.sw) + '" data-label="Dano GeB"' + (can ? '' : ' disabled') + '>GeB <b>' + esc(r.dmg.sw) + '</b></button></div>' +
        '<p class="bd-note">Clique num valor para rolar 3d6 contra ele no chat, como ' + esc(c.name) + '.</p>';
    }
    var foot = '<div class="bd-cw-foot">' + (canWrite() ? '<button class="btn" type="button" data-cw="as">' + svg(BOARD_ICON.chat, 14) + 'Falar como</button>' : '') +
      (gm() && canWrite() && BoardView.board() ? '<button class="btn" type="button" data-cw="token">' + svg(ICON.plus, 14, 2.4) + 'Token no centro</button>' : '') +
      (gm() ? '<button class="btn" type="button" data-cw="show" title="Abre este personagem na tela de todos que podem vê-lo">' + svg(BOARD_ICON.share, 14) + 'Mostrar a todos</button>' : '') + '</div>';
    return head + tabs + '<div class="bd-cw-pane">' + pane + '</div>' + foot;
  }
  function openChar(id, onlyIfOpen) {
    var c = charById(id);
    var w = BoardWin.get('char:' + id);
    if (onlyIfOpen && !w) return;
    if (!c) { if (w) BoardWin.close('char:' + id); else toast('Esse personagem não está visível para você.', true); return; }
    var tab = (w && w.el.getAttribute('data-tab')) || 'attrs';
    w = BoardWin.open('char:' + id, { title: c.name, cls: 'bd-charwin', width: 330, x: 360, y: 70 });
    w.el.setAttribute('data-jr', 'char:' + id); w.el.setAttribute('data-tab', tab);
    w.body.innerHTML = charBodyHtml(c, tab);
    fillImages(w.body);
    if (w.wired) return;
    w.wired = true;
    w.body.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var cc = charById(id); if (!cc) return;
      var roll = b.getAttribute('data-roll');
      if (roll) {
        var nh = b.getAttribute('data-nh');
        BoardChat.roll({ expr: boardGurpsDice(roll), nh: nh == null ? null : +nh, label: b.getAttribute('data-label'), charId: cc.id });
        return;
      }
      var act = b.getAttribute('data-cw');
      if (act === 'attrs' || act === 'bio') { w.el.setAttribute('data-tab', act); w.body.innerHTML = charBodyHtml(cc, act); fillImages(w.body); }
      else if (act === 'as') { BoardChat.speakAs(cc.id); BoardView.showTab('chat'); BoardChat.focus(); }
      else if (act === 'token') BoardView.dropAt({ kind: 'char', id: cc.id }, null, false);
      else if (act === 'show') show('char', cc.id);
    });
  }

  // ----- a note -----
  function openNote(id, onlyIfOpen) {
    var n = noteById(id), w = BoardWin.get('note:' + id);
    if (onlyIfOpen && !w) return;
    if (!n) { if (w) BoardWin.close('note:' + id); else toast('Essa anotação não está visível para você.', true); return; }
    var nb = nbById(n.notebookId);
    w = BoardWin.open('note:' + id, { title: n.title || 'Anotação', cls: 'bd-notewin', width: 420, x: 340, y: 60 });
    w.el.setAttribute('data-jr', 'note:' + id);
    var body = n.format === 'html' ? cleanRich(n.body) : '';
    w.body.innerHTML = '<div class="bd-nw-meta">' + (nb ? 'Em ' + esc(nb.name) + ' · ' : '') + '<a class="inline" href="' + esc(hrefFor('note:' + n.id)) + '" target="_blank" rel="noopener">Abrir na página</a>' +
      (gm() ? '<button class="btn" type="button" data-nw="show" title="Abre esta anotação na tela de todos que podem vê-la">' + svg(BOARD_ICON.share, 14) + 'Mostrar a todos</button>' : '') + '</div>' +
      (body ? '<div class="note-body rich bd-nw-body">' + body + '</div>' : n.body && n.format !== 'html' ? '<p class="note-body bd-nw-body">' + esc(n.body).replace(/\n/g, '<br>') + '</p>' : '<p class="bd-note">Anotação vazia.</p>');
    if (w.wired) return;
    w.wired = true;
    w.body.addEventListener('click', function (e) { var b = e.target.closest('[data-nw="show"]'); if (b) show('note', id); });
  }

  // ----- showing to everyone -----
  function show(kind, id) {
    var rt = W.store && W.store.realtime;
    if (!rt) { toast('Mostrar a todos precisa do banco do site (Supabase).', true); return; }
    rt.send('tab-show', { kind: kind, id: id, from: me() });
    toast('Mostrado a todos que podem ver.');
  }
  function onShow(m) {
    if (!m || m.from === me() || typeof m.id !== 'string') return;
    if (m.kind === 'char' && charById(m.id)) { openChar(m.id); toast('O Mestre mostrou ' + charById(m.id).name + '.'); }
    else if (m.kind === 'note' && noteById(m.id)) { openNote(m.id); toast('O Mestre mostrou a anotação ' + (noteById(m.id).title || '') + '.'); }
    else if (m.kind === 'img' && typeof m.ref === 'string') BoardArt.showImage(m.ref, String(m.name || '').slice(0, 80));
  }

  return { mount: mount, refresh: refresh, openChar: openChar, openNote: openNote, onShow: onShow, DRAG: DRAG };
})();

// GURPS dice: "2d+1" is 2d6+1 (a "d" with no number of sides is a d6).
function boardGurpsDice(expr) { return String(expr || '').replace(/(\d*)d(?![0-9f])/gi, function (m, n) { return (n || '1') + 'd6'; }); }
