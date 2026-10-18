/* =====================================================================
   Hounds — Tabuleiro: o chat da mesa (falas, sussurros, ações e rolagens)
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   The chat of the table, in the sidebar of the board, as in Roll20. One
   chat for every board (chatMessages; the 500 newest each one can read,
   migration 34). A message never changes once sent; the Mestre deletes.
     /r 3d6+2 · /r 3d6 vs 12 Furtividade · /r 4dF · /r 1d6!   roll (! explodes)
     /gr ...                     roll that only the Mestre (and who rolled) sees
     /w Ana texto · /w "Ana Lu" texto · /w gm texto           whisper
     /em sorri                   action, in the name of who speaks
     /desc A porta range.        the Mestre's description, with no name
     /ooc texto                  out of character: in the account's name
     [[2d6+1]]                   a roll in the middle of any message
   With the Supabase the database rolls the dice (rolar_dados): a roll goes
   without its result, shows "rolando…" and gets it in the answer. Without
   it (the browser's own database) this browser rolls (BoardDice).
   Who reads what is the database's rule (RLS): a whisper between two
   players the Mestre doesn't read; a secret roll its roller doesn't see,
   so here it shows only as a note of this browser.
   ===================================================================== */
var BoardChat = (function () {
  var TIPS_KEY = 'hounds_chat_tips_v1', AS_KEY = 'hounds_chat_as_v1';
  var root = null, scroller = null, logEl = null, input = null, asSel = null, newEl = null, tipsEl = null;
  var list = [], shown = [], un = null, ready = false, seen = {}, local = [], hist = [], histAt = -1, unread = 0;

  function gm() { return isMestre(); }
  function userOf(id) { for (var i = 0; i < W.users.length; i++) if (W.users[i].id === id) return W.users[i]; return null; }
  function userName(id) { var u = userOf(id); return u ? u.name : 'Alguém'; }
  function myName() { return (window.hubUser && window.hubUser.name) || (me() && userOf(me()) ? userName(me()) : 'Você'); }
  function timeText(t) { try { return new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  // A secret roll of this person: the database won't show it to them (only a note of this browser does).
  // And the database's rule (RLS) also here, for the browser's own database, which has none: a
  // whisper only to whom it goes, a message for the Mestre only to him.
  function hiddenForMe(m) {
    if (m.createdBy === me()) return !!m.secret && !gm();
    if (m.secret || m.gm) return !gm();
    return (m.to || []).length > 0 && (m.to || []).indexOf(me()) < 0;
  }

  // ----- the collection -----
  function start() {
    if (un || !W.store) return;
    un = W.store.watch('chatMessages', onData, function () { toast('Não foi possível carregar o chat.', true); });
  }
  function stop() {
    if (un) { un(); un = null; }
    list = []; ready = false; seen = {}; shown = []; unread = 0;
    if (logEl) logEl.innerHTML = '';
  }
  function onData(l) {
    var first = !ready, fresh = [];
    ready = true;
    l.forEach(function (m) { if (!seen[m.id]) { seen[m.id] = true; if (!first) fresh.push(m); } });
    list = l;
    render();
    // What others write while the chat is out of sight: a card over the board and the count on the tab.
    fresh.forEach(function (m) {
      if (hiddenForMe(m) || m.createdBy === me()) return;
      if (BoardView.chatShown()) return;
      unread++;
      BoardView.notify(m);
    });
    BoardView.paintUnread(unread);
  }
  function readAll() { if (unread) { unread = 0; BoardView.paintUnread(0); } scrollEnd(); }

  // ----- the panel -----
  function mount(el) {
    root = el;
    var tipsOff = lstore(TIPS_KEY) === '1';
    root.innerHTML = '<div class="bd-chat-scroll" id="bdChatScroll">' +
      '<div class="bd-chat-tips" id="bdChatTips"' + (tipsOff ? ' hidden' : '') + '><button class="icon-btn" type="button" data-chat="tips-x" aria-label="Esconder as dicas" title="Esconder as dicas">' + svg(ICON.x, 14, 2.4) + '</button>' +
        '<b>Dicas do chat</b><p>Escreva e aperte <kbd>Enter</kbd>. <kbd>Shift</kbd>+<kbd>Enter</kbd> pula linha.</p>' + helpListHtml() + '</div>' +
      '<ol class="bd-chat-log" id="bdChatLog" aria-live="polite" aria-label="Mensagens"></ol></div>' +
      '<button class="bd-chat-new" type="button" id="bdChatNew" hidden>Mensagens novas ↓</button>' +
      '<form class="bd-chat-in" id="bdChatForm"><textarea id="bdChatText" rows="2" maxlength="2000" aria-label="Mensagem do chat" placeholder="Escreva aqui. /r 3d6 rola os dados; /? mostra os comandos."></textarea>' +
        '<div class="bd-chat-row"><label class="bd-chat-as"><span>Como</span><select id="bdChatAs" aria-label="Falar como"></select></label>' +
        '<button class="btn primary" type="submit">Enviar</button></div></form>';
    scroller = $('bdChatScroll'); logEl = $('bdChatLog'); input = $('bdChatText'); asSel = $('bdChatAs'); newEl = $('bdChatNew'); tipsEl = $('bdChatTips');
    shown = [];
    refreshAs();
    $('bdChatForm').onsubmit = function (e) { e.preventDefault(); submit(); };
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); submit(); return; }
      // Up and down, with the cursor at the edge: what this person sent before.
      if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && hist.length && (e.key === 'ArrowUp' ? input.selectionStart === 0 : input.selectionEnd === input.value.length)) {
        e.preventDefault();
        histAt = e.key === 'ArrowUp' ? (histAt < 0 ? hist.length - 1 : Math.max(0, histAt - 1)) : (histAt < 0 ? -1 : histAt + 1);
        if (histAt >= hist.length) histAt = -1;
        input.value = histAt < 0 ? '' : hist[histAt];
      }
      if (e.key === 'Escape') { e.stopPropagation(); input.blur(); }
    });
    asSel.onchange = function () { lstore(AS_KEY, asSel.value); };
    scroller.addEventListener('scroll', function () { if (nearBottom()) newEl.hidden = true; });
    newEl.onclick = function () { scrollEnd(); };
    root.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.getAttribute('data-chat') === 'tips-x') { tipsEl.hidden = true; lstore(TIPS_KEY, '1'); return; }
      if (b.getAttribute('data-chat') === 'tips') { tipsEl.hidden = false; lstore(TIPS_KEY, ''); scroller.scrollTop = 0; return; }
      var del = b.getAttribute('data-del');
      if (del && gm()) W.store.remove('chatMessages', del).catch(function (er) { toast(errorText(er), true); });
    });
    render();
  }
  function submit() {
    var v = input.value;
    if (!v.trim()) return;
    if (!canWrite()) { toast('Você não pode escrever no chat por aqui.', true); return; }
    if (send(v)) { hist.push(v.trim()); if (hist.length > 50) hist.shift(); histAt = -1; input.value = ''; }
  }

  // ----- who speaks -----
  // The Mestre speaks as any character; a player, as the characters of the tokens they control on
  // this board and the ones they created.
  function myCharacters() {
    if (gm()) return W.characters.slice();
    var ids = {};
    (BoardView.tokens() || []).forEach(function (t) { if (t.characterId && (t.ownerIds || []).indexOf(me()) >= 0) ids[t.characterId] = true; });
    return W.characters.filter(function (c) { return ids[c.id] || isMine(c); });
  }
  function refreshAs() {
    if (!asSel) return;
    var keep = asSel.value || lstore(AS_KEY) || '';
    var chars = myCharacters().sort(byName);
    asSel.innerHTML = '<option value="">' + esc(myName()) + (gm() ? ' (Mestre)' : '') + '</option>' +
      chars.map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>'; }).join('');
    asSel.value = chars.some(function (c) { return c.id === keep; }) ? keep : '';
  }
  function speakAs(charId) { if (!asSel) return; refreshAs(); if (charId && [].some.call(asSel.options, function (o) { return o.value === charId; })) { asSel.value = charId; lstore(AS_KEY, charId); } }
  function speaker(charId) {
    var c = charId ? (charById(charId) || rawGet('characters', charId)) : (asSel && asSel.value ? charById(asSel.value) : null);
    return c ? { name: c.name, characterId: c.id } : { name: myName(), characterId: null };
  }

  // ----- reading what was typed -----
  function helpListHtml() {
    return '<ul><li><b>/r 3d6+2</b> rola; <b>/r 3d6 vs 12 Furtividade</b> testa contra o NH; <b>/r 1d6!</b> explode</li>' +
      '<li><b>/gr 3d6</b> rola para você e o Mestre</li><li><b>/w Ana texto</b> sussurra; <b>/w gm texto</b>, ao Mestre</li>' +
      '<li><b>/em sorri</b> ação · <b>/ooc texto</b> fora do personagem' + (gm() ? ' · <b>/desc texto</b> descrição' : '') + '</li>' +
      '<li><b>[[2d6+1]]</b> rola no meio do texto</li></ul>';
  }
  // The dice of /r: the longest start that is an expression, then "vs 12" (or "<= 12") and a label.
  // As in GURPS, "3d" is 3d6 and "2d+1", 2d6+1.
  function parseRoll(rest) {
    var words = rest.split(/\s+/).filter(Boolean);
    for (var k = words.length; k >= 1; k--) {
      var ex = boardGurpsDice(words.slice(0, k).join(' ')), explode = /!$/.test(ex);
      if (explode) ex = ex.replace(/!+$/, '');
      if (!BoardDice.parse(ex)) continue;
      var tail = words.slice(k), nh = null;
      if (tail.length >= 2 && /^(vs|nh|contra|<=|≤)$/i.test(tail[0]) && /^-?\d+$/.test(tail[1])) { nh = +tail[1]; tail = tail.slice(2); }
      else if (tail.length && /^(<=|≤)-?\d+$/.test(tail[0])) { nh = +tail[0].replace(/^(<=|≤)/, ''); tail = tail.slice(1); }
      return { expr: ex.replace(/\s+/g, ''), explode: explode, nh: nh, label: tail.join(' ').slice(0, 80) };
    }
    return null;
  }
  // The accounts a whisper goes to: an account by name (or first name), or a character with a
  // token on this board (whoever controls it).
  function recipients(name) {
    var n = norm(name).trim(), out = {};
    function first(s) { return norm(s).trim().split(/\s+/)[0]; }
    W.users.forEach(function (u) { if (norm(u.name).trim() === n || first(u.name) === n) out[u.id] = true; });
    if (!Object.keys(out).length) {
      W.characters.forEach(function (c) {
        if (norm(c.name).trim() !== n && first(c.name) !== n) return;
        (BoardView.tokens() || []).forEach(function (t) { if (t.characterId === c.id) (t.ownerIds || []).forEach(function (id) { out[id] = true; }); });
      });
    }
    return Object.keys(out);
  }
  function parse(raw) {
    var s = String(raw || '').trim();
    if (!s) return null;
    if (s.length > 2000) return { error: 'A mensagem passa de 2000 letras.' };
    if (s[0] !== '/') return { kind: 'say', text: s };
    var m = /^\/(\S+)\s*([\s\S]*)$/.exec(s), cmd = m[1].toLowerCase(), rest = m[2].trim();
    if (cmd === '?' || cmd === 'ajuda' || cmd === 'help') return { help: true };
    if (cmd === 'r' || cmd === 'roll' || cmd === 'rolar' || cmd === 'gr' || cmd === 'gmroll') {
      var r = parseRoll(rest);
      if (!r) return { error: 'Não entendi a rolagem. Use algo como /r 3d6, /r 3d6+2, /r 3d6 vs 12 Furtividade ou /r 4dF.' };
      return { kind: 'roll', roll: r, gm: cmd === 'gr' || cmd === 'gmroll' };
    }
    if (cmd === 'w' || cmd === 'whisper' || cmd === 'sussurrar') {
      var mm = /^"([^"]+)"\s*([\s\S]*)$/.exec(rest) || /^(\S+)\s*([\s\S]*)$/.exec(rest);
      if (!mm || !mm[2].trim()) return { error: 'Use /w nome mensagem, ou /w gm mensagem.' };
      var who = mm[1], msg = mm[2].trim();
      if (/^(gm|mestre)$/i.test(who)) return { kind: 'say', text: msg, gm: true };
      var ids = recipients(who).filter(function (id) { return id !== me(); });
      if (!ids.length) return { error: 'Ninguém se chama "' + who + '" (nem uma conta, nem um personagem com token neste tabuleiro).' };
      return { kind: 'say', text: msg, to: ids };
    }
    if (cmd === 'em' || cmd === 'me') return rest ? { kind: 'emote', text: rest } : { error: 'Escreva a ação: /em sorri.' };
    if (cmd === 'desc') {
      if (!gm()) return { error: 'Só o Mestre usa /desc.' };
      return rest ? { kind: 'desc', text: rest } : { error: 'Escreva a descrição: /desc A porta range.' };
    }
    if (cmd === 'ooc') return rest ? { kind: 'say', text: rest, ooc: true } : { error: 'Escreva a mensagem: /ooc volto já.' };
    return { error: 'Comando desconhecido: /' + cmd + '. Digite /? para ver os comandos.' };
  }
  function inlineExprs(text) {
    var out = [], re = /\[\[([^\]]{1,80})\]\]/g, m;
    while ((m = re.exec(text)) && out.length < 10) out.push(boardGurpsDice(m[1].trim()));
    return out;
  }
  // A roll in this browser, in the format of the database's (rolar_dados).
  function rollHere(expr, explode) {
    var spec = BoardDice.parse(expr); if (!spec) return null;
    var r = BoardDice.roll(spec, !!explode);
    return { ex: BoardDice.text(spec), g: r.groups.map(function (g) { return { s: g.fudge ? 'F' : g.sides, sg: g.sign, r: g.rolls }; }), mod: r.mod, tot: r.total };
  }

  // ----- sending -----
  // p: what parse() gives (or a roll from the dice box or a sheet); charId: speak as this character.
  function post(p, charId) {
    if (!W.store) return false;
    var who = p.ooc ? { name: myName(), characterId: null } : speaker(charId);
    var t = now();
    var body = { kind: p.kind, text: p.text || '', as: who.name, characterId: who.characterId, boardId: BoardView.boardId() || null,
      to: p.to || [], gm: !!(p.gm || p.secret), secret: !!p.secret, roll: null, inline: [], createdBy: me(), createdAt: t, updatedAt: t };
    body.inline = inlineExprs(body.text);
    if (p.roll) body.roll = { expr: p.roll.expr, nh: p.roll.nh == null ? null : Math.round(+p.roll.nh), label: p.roll.label || '', explode: !!p.roll.explode };
    if (!W.store.rollsDice) {
      if (body.roll) Object.assign(body.roll, rollHere(body.roll.expr, body.roll.explode));
      body.inline = body.inline.map(function (e) { return rollHere(e, false); });
    }
    W.store.put('chatMessages', null, body).catch(function (er) { addLocal(esc(errorText(er)), true); });
    if (body.secret && !gm()) addLocal('Você rolou <b>' + esc(body.roll ? body.roll.expr : '') + '</b> em segredo' + (body.roll && body.roll.label ? ' (' + esc(body.roll.label) + ')' : '') + ': só o Mestre vê o resultado.');
    return true;
  }
  function send(text) {
    var p = parse(text); if (!p) return false;
    if (p.error) { addLocal(esc(p.error), true); return false; }
    if (p.help) { addLocal('<b>Comandos do chat</b>' + helpListHtml()); return true; }
    return post(p);
  }
  // A roll from the dice box, a sheet or the turn order: { expr, nh, label, gm, secret, explode, charId }.
  function roll(o) {
    if (!canWrite()) { toast('Você não pode rolar por aqui.', true); return; }
    var expr = boardGurpsDice(o.expr).replace(/\s+/g, '');
    if (!BoardDice.parse(expr)) { toast('Não entendi a rolagem. Use algo como 3d6, 3d6+2, 2d10-1 ou 4dF.', true); return; }
    post({ kind: 'roll', roll: { expr: expr, nh: o.nh, label: o.label, explode: o.explode }, gm: o.gm, secret: o.secret }, o.charId);
    if (!BoardView.chatShown()) BoardView.showTab('chat');
  }
  function addLocal(html, bad) {
    local.push({ id: 'l' + uid(), kind: 'sys', html: html, bad: !!bad, createdAt: now(), local: true });
    if (local.length > 30) local.shift();
    render();
    scrollEnd();
  }

  // ----- showing -----
  function nearBottom() { return !scroller || scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 60; }
  function scrollEnd() { if (scroller) { scroller.scrollTop = scroller.scrollHeight; if (newEl) newEl.hidden = true; } }
  function items() {
    return list.filter(function (m) { return !hiddenForMe(m); }).concat(local).sort(function (a, b) { return (a.createdAt || 0) - (b.createdAt || 0); });
  }
  // What a message shows depends on whether its dice came back: a change there redraws it.
  function sigOf(m) { return m.id + '|' + (m.roll && m.roll.tot != null ? 1 : 0) + ((m.inline || []).some(function (x) { return x && typeof x === 'object'; }) ? 1 : 0); }
  function render() {
    if (!logEl) return;
    var all = items(), sigs = all.map(sigOf), i = 0;
    while (i < shown.length && i < sigs.length && shown[i] === sigs[i]) i++;
    var stick = nearBottom(), added = sigs.length > shown.length;
    while (logEl.children.length > i) logEl.removeChild(logEl.lastChild);
    var html = '';
    for (var k = i; k < all.length; k++) html += msgHtml(all[k], all[k - 1]);
    if (html) { logEl.insertAdjacentHTML('beforeend', html); fillAvatars(logEl); }
    shown = sigs;
    if (stick) scrollEnd(); else if (added && newEl) newEl.hidden = false;
  }
  function fillAvatars(el) {
    el.querySelectorAll('[data-img]:not([data-filled])').forEach(function (a) {
      a.setAttribute('data-filled', '1');
      W.store.imageUrl(a.getAttribute('data-img')).then(function (u) { if (u && a.isConnected) a.innerHTML = '<img src="' + esc(u) + '" alt="" loading="lazy">'; });
    });
  }
  function avatarHtml(m) {
    var c = m.characterId && (charById(m.characterId) || rawGet('characters', m.characterId)), ref = c && c.image && c.image.ref;
    return '<span class="bd-cav" style="--c:' + esc(boardUserColor(m.createdBy)) + '"' + (ref ? ' data-img="' + esc(ref) + '"' : '') + '>' + esc(initials(m.as || userName(m.createdBy))) + '</span>';
  }
  function namesOf(ids) { return ids.map(function (id) { return id === me() ? 'você' : userName(id); }).join(', '); }
  // Whom it goes to, in words: "(para Bruno)", "(de Ana)", "(para o Mestre)".
  function toTag(m) {
    var mine = m.createdBy === me();
    if (m.secret) return '<span class="bd-ctag gm">rolagem secreta</span>';
    if ((m.to || []).length) return '<span class="bd-ctag w">' + (mine ? 'para ' + esc(namesOf(m.to)) : 'sussurro' + ((m.to || []).length > 1 ? ' (também para ' + esc(namesOf(m.to.filter(function (x) { return x !== me(); }))) + ')' : '')) + '</span>';
    if (m.gm) return '<span class="bd-ctag gm">' + (mine && !gm() ? 'para o Mestre' : 'só o Mestre') + '</span>';
    return '';
  }
  function speakerKey(m) { return [m.kind === 'roll' || m.kind === 'say' ? 's' : m.kind, m.createdBy, m.characterId || '', m.as, (m.to || []).join(','), m.gm ? 1 : 0].join('|'); }
  function textHtml(m) {
    var i = 0, inl = m.inline || [];
    return esc(m.text || '').replace(/\[\[([^\]]{1,80})\]\]/g, function (all, ex) {
      var r = inl[i++];
      if (r && typeof r === 'object') return '<span class="bd-inl" title="' + esc(r.ex + ' = ' + diceText(r)) + '">' + esc(r.tot) + '</span>';
      if (typeof r === 'string') return '<span class="bd-inl wait" title="Rolando…">…</span>';
      return '<span class="bd-inl bad" title="Não entendi a rolagem">' + esc(ex) + '</span>';
    }).replace(/\n/g, '<br>');
  }
  function diceText(r) {
    return r.g.map(function (g, k) { return (g.sg < 0 ? '−' : k ? '+' : '') + '[' + g.r.map(function (v) { return g.s === 'F' ? (v > 0 ? '+' : v < 0 ? '−' : '0') : v; }).join(',') + ']'; }).join('') +
      (r.mod ? (r.mod > 0 ? '+' : '−') + Math.abs(r.mod) : '');
  }
  function msgHtml(m, prev) {
    if (m.local) return '<li class="bd-cm sys' + (m.bad ? ' bad' : '') + '">' + m.html + '</li>';
    var del = gm() ? '<button class="bd-cm-del" type="button" data-del="' + esc(m.id) + '" aria-label="Apagar a mensagem" title="Apagar a mensagem">' + svg(ICON.x, 12, 2.6) + '</button>' : '';
    var when = ' title="' + esc(timeText(m.createdAt)) + '"';
    if (m.kind === 'desc') return '<li class="bd-cm desc"' + when + '>' + del + textHtml(m) + '</li>';
    var color = esc(boardUserColor(m.createdBy));
    if (m.kind === 'emote') return '<li class="bd-cm emote"' + when + '>' + del + '<b style="color:' + color + '">' + esc(m.as || userName(m.createdBy)) + '</b> ' + textHtml(m) + toTag(m) + '</li>';
    var same = prev && !prev.local && speakerKey(prev) === speakerKey(m) && (m.createdAt || 0) - (prev.createdAt || 0) < 5 * 60000 && !(m.to || []).length;
    var head = same ? '' : '<div class="bd-cm-h">' + avatarHtml(m) + '<b style="color:' + color + '">' + esc(m.as || userName(m.createdBy)) + '</b>' + toTag(m) +
      '<span class="bd-cm-time">' + esc(timeText(m.createdAt)) + '</span></div>';
    var body = m.kind === 'roll' ? rollHtml(m) : '<div class="bd-cm-t">' + textHtml(m) + '</div>';
    return '<li class="bd-cm' + (same ? ' cont' : '') + ((m.to || []).length ? ' whisper' : '') + (m.gm ? ' gm' : '') + '"' + when + '>' + del + head + body + '</li>';
  }
  var VERDICT = { 'crit-success': 'Sucesso crítico', success: 'Sucesso', fail: 'Falha', 'crit-fail': 'Falha crítica' };
  function plain3d6(r) { return r.g.length === 1 && r.g[0].s === 6 && r.g[0].sg > 0 && r.g[0].r.length === 3 && !r.mod; }
  function rollHtml(m) {
    var r = m.roll || {}, label = r.label ? '<span class="lab">' + esc(r.label) + '</span>' : '<span class="lab">Rolagem</span>';
    var ex = '<span class="ex">' + esc(r.ex || r.expr || '') + (r.explode ? ' !' : '') + '</span>';
    if (r.tot == null || !Array.isArray(r.g)) return '<div class="bd-croll wait">' + '<div class="bd-croll-h">' + label + ex + '</div><div class="bd-croll-b"><span class="bd-note">Rolando…</span></div></div>';
    var dice = r.g.map(function (g, i) {
      return (g.sg < 0 ? '<span class="bd-op">−</span>' : i ? '<span class="bd-op">+</span>' : '') + g.r.map(function (v) {
        var cls = g.s === 'F' ? '' : v === g.s ? ' hi' : v === 1 ? ' lo' : '';
        return '<span class="bd-die' + cls + '">' + (g.s === 'F' ? (v > 0 ? '+' : v < 0 ? '−' : '0') : v) + '</span>';
      }).join('');
    }).join('') + (r.mod ? '<span class="bd-op">' + (r.mod > 0 ? '+' : '−') + '</span><span class="bd-mod">' + Math.abs(r.mod) + '</span>' : '');
    var verdict = '';
    if (r.nh != null && isFinite(r.nh)) {
      var gu = BoardDice.gurps(r.tot, +r.nh, plain3d6(r));
      verdict = '<div class="bd-verdict ' + gu.result + '">' + VERDICT[gu.result] + (gu.result === 'success' || gu.result === 'fail' ? ' por ' + Math.abs(gu.margin) : '') + ' · NH ' + esc(r.nh) + '</div>';
    }
    return '<div class="bd-croll"><div class="bd-croll-h">' + label + ex + '</div><div class="bd-croll-b"><span class="bd-dice">' + dice + '</span><span class="bd-total">' + esc(r.tot) + '</span></div>' + verdict + '</div>';
  }
  // The card over the board for a message that came with the chat out of sight.
  function cardHtml(m) {
    var who = '<b style="color:' + esc(boardUserColor(m.createdBy)) + '">' + esc(m.kind === 'desc' ? 'Mestre' : m.as || userName(m.createdBy)) + '</b>' + toTag(m);
    return '<div class="bd-roll bd-chat-card">' + '<div class="bd-roll-h">' + who + '</div>' + (m.kind === 'roll' ? rollHtml(m) : '<div class="bd-cm-t">' + textHtml(m) + '</div>') + '</div>';
  }

  // The Mestre empties the chat (with the Supabase, also the whispers he doesn't read).
  function clearAll() {
    var s = W.store; if (!s || !gm()) return Promise.resolve();
    if (typeof s.clearChat === 'function') return s.clearChat();
    var ids = list.map(function (m) { return m.id; });
    if (typeof s.removeMany === 'function') return s.removeMany('chatMessages', ids);
    return ids.reduce(function (p, id) { return p.then(function () { return s.remove('chatMessages', id); }); }, Promise.resolve());
  }

  return {
    start: start, stop: stop, mount: mount, send: send, roll: roll, readAll: readAll, refreshAs: refreshAs, speakAs: speakAs,
    cardHtml: cardHtml, clearAll: clearAll, count: function () { return list.length; },
    rerender: function () { shown = []; render(); },
    focus: function () { if (input) input.focus(); }
  };
})();
