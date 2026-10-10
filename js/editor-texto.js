/* =====================================================================
   Hounds — Editor de texto formatado das anotações
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* ---------- rich text notes ----------
   A note saved by the editor has format: 'html' and its body is HTML that
   went through cleanRich (an allow-list), both when saved and when shown,
   since anyone who can write could otherwise inject markup into other
   people's browsers. Older notes are plain text and keep showing as such. */
var RTE_TAGS = { P: 1, BR: 1, H1: 1, H2: 1, H3: 1, H4: 1, B: 1, STRONG: 1, I: 1, EM: 1, U: 1, S: 1, STRIKE: 1, DEL: 1, MARK: 1, SUB: 1, SUP: 1, UL: 1, OL: 1, LI: 1, BLOCKQUOTE: 1, PRE: 1, CODE: 1, A: 1, HR: 1, SPAN: 1, DIV: 1, FONT: 1 };
var RTE_DROP = /^(SCRIPT|STYLE|IFRAME|FRAME|OBJECT|EMBED|SVG|MATH|TEMPLATE|NOSCRIPT|LINK|META|TITLE|HEAD|BASE|FORM|INPUT|BUTTON|TEXTAREA|SELECT|OPTION|IMG|PICTURE|VIDEO|AUDIO|SOURCE|CANVAS)$/;
var RTE_CSS = ['color', 'background-color', 'text-align', 'font-weight', 'font-style', 'text-decoration-line'];
function safeCss(v) { return !!v && /^[#a-z0-9\s(),.%-]+$/i.test(v) && !/url|expression|var\(/i.test(v); }
function safeHref(h) {
  h = String(h || '').trim();
  if (/^(https?:|mailto:)/i.test(h) || /^#[\w-]*$/.test(h)) return h;
  return '';
}
// paste: drop colors and weights brought from other pages, keep structure.
function cleanRich(html, paste) {
  var doc = new DOMParser().parseFromString('<!doctype html><body>' + String(html || ''), 'text/html');
  var out = doc.createElement('div');
  (function walk(src, dst) {
    [].forEach.call(src.childNodes, function (node) {
      if (node.nodeType === 3) { dst.appendChild(doc.createTextNode(node.nodeValue)); return; }
      if (node.nodeType !== 1) return;
      var tag = node.tagName.toUpperCase();
      if (RTE_DROP.test(tag)) return;
      if (!RTE_TAGS[tag]) { walk(node, dst); return; }
      var el = doc.createElement(tag === 'FONT' ? 'span' : tag.toLowerCase());
      RTE_CSS.forEach(function (p) {
        if (paste && p !== 'text-align') return;
        var v = node.style && node.style.getPropertyValue(p);
        if (safeCss(v)) el.style.setProperty(p, v);
      });
      if (tag === 'FONT' && !paste && /^#?[a-z0-9]+$/i.test(node.getAttribute('color') || '')) el.style.color = node.getAttribute('color');
      if (tag === 'A') {
        var href = safeHref(node.getAttribute('href'));
        if (href) { el.setAttribute('href', href); if (href.charAt(0) !== '#') { el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener noreferrer'); } }
      }
      walk(node, el);
      if ((tag === 'SPAN' || tag === 'FONT') && !el.getAttribute('style')) { while (el.firstChild) dst.appendChild(el.firstChild); return; }
      // Browsers leave empty <p></p> around lists; <p><br></p> is a blank line on purpose and stays.
      if (tag === 'P' && !el.firstChild) return;
      dst.appendChild(el);
    });
  })(doc.body, out);
  return out.innerHTML;
}
function textToHtml(t) {
  t = String(t || '').replace(/\r\n?/g, '\n').trim();
  return t ? t.split(/\n{2,}/).map(function (p) { return '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>'; }).join('') : '';
}
function richToText(html) {
  var spaced = String(html || '').replace(/<(br|hr)[^>]*>|<\/(p|li|h\d|div|blockquote|pre)>/gi, ' ');
  return (new DOMParser().parseFromString(spaced, 'text/html').body.textContent || '').replace(/\s+/g, ' ').trim();
}
function noteText(n) { return n.format === 'html' ? richToText(n.body) : String(n.body || '').replace(/\s+/g, ' ').trim(); }
function noteEditHtml(n) { return n.format === 'html' ? cleanRich(n.body) : textToHtml(n.body); }

var RTE_ICON = {
  undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>',
  redo: '<path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/>',
  bold: '<path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8"/>',
  italic: '<line x1="19" x2="10" y1="4" y2="4"/><line x1="14" x2="5" y1="20" y2="20"/><line x1="15" x2="9" y1="4" y2="20"/>',
  underline: '<path d="M6 4v6a6 6 0 0 0 12 0V4"/><line x1="4" x2="20" y1="20" y2="20"/>',
  strike: '<path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" x2="20" y1="12" y2="12"/>',
  hilite: '<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>',
  ul: '<line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/>',
  ol: '<line x1="10" x2="21" y1="6" y2="6"/><line x1="10" x2="21" y1="12" y2="12"/><line x1="10" x2="21" y1="18" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>',
  outdent: '<polyline points="7 8 3 12 7 16"/><line x1="21" x2="11" y1="12" y2="12"/><line x1="21" x2="11" y1="6" y2="6"/><line x1="21" x2="11" y1="18" y2="18"/>',
  indent: '<polyline points="3 8 7 12 3 16"/><line x1="21" x2="11" y1="12" y2="12"/><line x1="21" x2="11" y1="6" y2="6"/><line x1="21" x2="11" y1="18" y2="18"/>',
  left: '<line x1="21" x2="3" y1="6" y2="6"/><line x1="15" x2="3" y1="12" y2="12"/><line x1="17" x2="3" y1="18" y2="18"/>',
  center: '<line x1="21" x2="3" y1="6" y2="6"/><line x1="17" x2="7" y1="12" y2="12"/><line x1="19" x2="5" y1="18" y2="18"/>',
  right: '<line x1="21" x2="3" y1="6" y2="6"/><line x1="21" x2="9" y1="12" y2="12"/><line x1="21" x2="7" y1="18" y2="18"/>',
  justify: '<line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  hr: '<line x1="3" x2="21" y1="12" y2="12"/><line x1="8" x2="16" y1="6" y2="6" opacity=".4"/><line x1="8" x2="16" y1="18" y2="18" opacity=".4"/>',
  clear: '<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/>'
};
var RTE_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899', '#94a3b8'];
var RTE_HILITES = ['rgba(250, 204, 21, 0.4)', 'rgba(34, 197, 94, 0.35)', 'rgba(59, 130, 246, 0.35)', 'rgba(236, 72, 153, 0.35)', 'rgba(239, 68, 68, 0.35)', 'rgba(148, 163, 184, 0.35)'];
var RTE_BLOCKS = [['p', 'Parágrafo'], ['h1', 'Título 1'], ['h2', 'Título 2'], ['h3', 'Título 3'], ['blockquote', 'Citação'], ['pre', 'Código']];

// Builds the editor inside `host`. opts: { html, label, placeholder, onInput(html), onSave() }.
function richEditor(host, opts) {
  function btn(cmd, label, keys) { return '<button type="button" data-cmd="' + cmd + '" title="' + esc(label + (keys ? ' (' + keys + ')' : '')) + '" aria-label="' + esc(label) + '">' + svg(RTE_ICON[cmd], 16, 2.2) + '</button>'; }
  host.innerHTML = '<div class="rte"><div class="rte-bar" role="toolbar" aria-label="Formatação do texto">' +
    '<div class="rte-group">' + btn('undo', 'Desfazer', 'Ctrl+Z') + btn('redo', 'Refazer', 'Ctrl+Y') + '</div>' +
    '<div class="rte-group"><select data-block aria-label="Estilo do parágrafo" title="Estilo do parágrafo">' + RTE_BLOCKS.map(function (b) { return '<option value="' + b[0] + '">' + b[1] + '</option>'; }).join('') + '</select></div>' +
    '<div class="rte-group">' + btn('bold', 'Negrito', 'Ctrl+B') + btn('italic', 'Itálico', 'Ctrl+I') + btn('underline', 'Sublinhado', 'Ctrl+U') + btn('strike', 'Tachado') + '</div>' +
    '<div class="rte-group"><button type="button" data-pop="color" title="Cor do texto" aria-label="Cor do texto" aria-haspopup="true"><span class="rte-a">A</span></button>' +
      '<button type="button" data-pop="hilite" title="Marca-texto" aria-label="Marca-texto" aria-haspopup="true">' + svg(RTE_ICON.hilite, 16, 2.2) + '</button></div>' +
    '<div class="rte-group">' + btn('ul', 'Lista com marcadores') + btn('ol', 'Lista numerada') + btn('outdent', 'Diminuir recuo', 'Shift+Tab') + btn('indent', 'Aumentar recuo', 'Tab') + '</div>' +
    '<div class="rte-group">' + btn('left', 'Alinhar à esquerda') + btn('center', 'Centralizar') + btn('right', 'Alinhar à direita') + btn('justify', 'Justificar') + '</div>' +
    '<div class="rte-group"><button type="button" data-pop="link" title="Link (Ctrl+K)" aria-label="Link" aria-haspopup="true">' + svg(RTE_ICON.link, 16, 2.2) + '</button>' + btn('hr', 'Linha divisória') + btn('clear', 'Limpar formatação') + '</div>' +
    '</div><div class="rte-pop" hidden></div>' +
    '<div class="rte-area rich" contenteditable="true" role="textbox" aria-multiline="true" spellcheck="true" aria-label="' + esc(opts.label || 'Texto') + '" data-ph="' + esc(opts.placeholder || 'Escreva aqui…') + '"></div></div>';
  var root = host.firstChild, bar = root.querySelector('.rte-bar'), pop = root.querySelector('.rte-pop'), area = root.querySelector('.rte-area'), block = bar.querySelector('[data-block]');
  var CMD = { bold: 'bold', italic: 'italic', underline: 'underline', strike: 'strikeThrough', ul: 'insertUnorderedList', ol: 'insertOrderedList', outdent: 'outdent', indent: 'indent',
              left: 'justifyLeft', center: 'justifyCenter', right: 'justifyRight', justify: 'justifyFull', undo: 'undo', redo: 'redo', hr: 'insertHorizontalRule', clear: 'removeFormat' };
  var STATE = ['bold', 'italic', 'underline', 'strike', 'ul', 'ol', 'left', 'center', 'right', 'justify'];
  var saved = null, popKind = null;
  area.innerHTML = opts.html || '<p><br></p>';
  try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) {}

  function inArea(node) { return !!node && (node === area || area.contains(node)); }
  function save() { var s = window.getSelection(); if (s.rangeCount && inArea(s.anchorNode)) saved = s.getRangeAt(0).cloneRange(); }
  function restore() {
    area.focus();
    if (!saved) return;
    var s = window.getSelection(); s.removeAllRanges(); s.addRange(saved);
  }
  function changed() {
    area.classList.toggle('is-empty', !area.textContent.trim() && !area.querySelector('hr, li'));
    if (opts.onInput) opts.onInput(area.innerHTML);
  }
  function refresh() {
    var s = window.getSelection(); if (!s.rangeCount || !inArea(s.anchorNode)) return;
    STATE.forEach(function (k) {
      var on = false; try { on = document.queryCommandState(CMD[k]); } catch (e) {}
      var b = bar.querySelector('[data-cmd="' + k + '"]'); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
    });
    var v = ''; try { v = String(document.queryCommandValue('formatBlock') || '').toLowerCase(); } catch (e) {}
    block.value = RTE_BLOCKS.some(function (b) { return b[0] === v; }) ? v : 'p';
  }
  function exec(cmd, val, css) {
    restore();
    try { document.execCommand('styleWithCSS', false, !!css); } catch (e) {}
    document.execCommand(cmd, false, val);
    try { document.execCommand('styleWithCSS', false, false); } catch (e) {}
    save(); changed(); refresh();
  }
  function closePop() { pop.hidden = true; popKind = null; }
  function openPop(kind, anchor) {
    if (popKind === kind) { closePop(); return; }
    popKind = kind;
    if (kind === 'link') {
      var a = saved && (saved.startContainer.nodeType === 1 ? saved.startContainer : saved.startContainer.parentNode).closest('a');
      // A div, not a form: the editor usually sits inside a form, and forms can't nest.
      pop.innerHTML = '<div class="rte-link"><input type="text" placeholder="https://…" aria-label="Endereço do link" value="' + esc(a && inArea(a) ? a.getAttribute('href') : '') + '">' +
        '<button class="btn primary" type="button" data-apply>Aplicar</button>' + (a && inArea(a) ? '<button class="btn ghost" type="button" data-unlink>Remover</button>' : '') + '</div>';
      var f = pop.querySelector('.rte-link'), inp = f.querySelector('input');
      function apply() {
        var url = inp.value.trim(); if (!url) { closePop(); restore(); return; }
        if (!/^(https?:|mailto:|#)/i.test(url)) url = (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url) ? 'mailto:' : 'https://') + url;
        if (!safeHref(url)) { inp.focus(); return; }
        closePop();
        if (!saved || saved.collapsed) exec('insertHTML', '<a href="' + esc(url) + '">' + esc(url.replace(/^mailto:/, '')) + '</a>');
        else exec('createLink', url);
      }
      f.querySelector('[data-apply]').onclick = apply;
      var un = f.querySelector('[data-unlink]');
      if (un) un.onclick = function () { closePop(); if (a) { var r = document.createRange(); r.selectNodeContents(a); saved = r; } exec('unlink'); };
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); apply(); }
        else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePop(); restore(); }
      });
    } else {
      var list = kind === 'color' ? RTE_COLORS : RTE_HILITES;
      pop.innerHTML = '<div class="rte-swatches">' + list.map(function (c) { return '<button type="button" data-color="' + c + '" style="background:' + c + '" aria-label="' + (kind === 'color' ? 'Cor ' : 'Marca-texto ') + c + '"></button>'; }).join('') +
        '<button type="button" class="none" data-color="" aria-label="' + (kind === 'color' ? 'Cor padrão' : 'Sem marca-texto') + '" title="' + (kind === 'color' ? 'Cor padrão' : 'Sem marca-texto') + '">' + svg(ICON.x, 12, 2.6) + '</button></div>';
    }
    var rb = root.getBoundingClientRect(), ab = anchor.getBoundingClientRect();
    pop.style.top = (ab.bottom - rb.top + 4) + 'px';
    pop.style.left = Math.max(0, Math.min(ab.left - rb.left, rb.width - 260)) + 'px';
    pop.hidden = false;
    var first = pop.querySelector('input'); if (first) { first.focus(); first.select(); }
  }

  bar.addEventListener('mousedown', function (e) { if (!e.target.closest('select')) e.preventDefault(); });
  pop.addEventListener('mousedown', function (e) { if (!e.target.closest('input')) e.preventDefault(); });
  bar.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var c = b.getAttribute('data-cmd'), p = b.getAttribute('data-pop');
    if (p) { openPop(p, b); return; }
    closePop();
    if (c === 'clear') { exec('removeFormat'); exec('unlink'); exec('formatBlock', '<p>'); return; }
    if (c) exec(CMD[c]);
  });
  block.addEventListener('change', function () { closePop(); exec('formatBlock', '<' + block.value + '>'); });
  pop.addEventListener('click', function (e) {
    var b = e.target.closest('[data-color]'); if (!b) return;
    var c = b.getAttribute('data-color'), kind = popKind; closePop();
    if (kind === 'color') exec('foreColor', c || 'inherit', true);
    else exec('hiliteColor', c || 'transparent', true);
  });
  area.addEventListener('input', changed);
  area.addEventListener('keyup', refresh);
  area.addEventListener('mouseup', refresh);
  area.addEventListener('keydown', function (e) {
    var k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
    if (mod && k === 's') { e.preventDefault(); if (opts.onSave) opts.onSave(); }
    else if (mod && k === 'k') { e.preventDefault(); save(); openPop('link', bar.querySelector('[data-pop="link"]')); }
    else if (e.key === 'Tab') {
      var s = window.getSelection(), li = s.anchorNode && (s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentNode).closest('li');
      if (li && inArea(li)) { e.preventDefault(); exec(e.shiftKey ? 'outdent' : 'indent'); }
    }
    else if (e.key === 'Escape' && !pop.hidden) { e.stopPropagation(); closePop(); }
  });
  area.addEventListener('paste', function (e) {
    var cd = e.clipboardData; if (!cd) return;
    e.preventDefault();
    var h = cd.getData('text/html'), t = cd.getData('text/plain');
    document.execCommand('insertHTML', false, h ? cleanRich(h, true) : esc(t).replace(/\r?\n/g, '<br>'));
    changed();
  });
  area.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) e.preventDefault(); });
  function onSel() { if (!area.isConnected) { document.removeEventListener('selectionchange', onSel); return; } save(); }
  document.addEventListener('selectionchange', onSel);
  document.addEventListener('mousedown', function onDoc(e) { if (!root.isConnected) { document.removeEventListener('mousedown', onDoc); return; } if (!pop.hidden && !pop.contains(e.target) && !e.target.closest('[data-pop]')) closePop(); });
  changed();
  return {
    el: area,
    html: function () { var h = cleanRich(area.innerHTML); return richToText(h) || /<(hr|li)\b/i.test(h) ? h : ''; },
    focus: function () { area.focus(); var r = document.createRange(); r.selectNodeContents(area); r.collapse(false); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); save(); refresh(); }
  };
}
