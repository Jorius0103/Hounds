/* =====================================================================
   Hounds — Busca em português nos catálogos de GURPS
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   The catalogs (magias, vantagens, desvantagens, perícias, técnicas,
   estilos, armas, armaduras, itens, melhoramentos) are in English. dados/traducoes.json gives
   each name of the books its Portuguese one ("Fireball": "Bola de Fogo",
   with synonyms after "|": "Lightning": "Relâmpago|Raio"); it is fetched
   once, at the first search or when an entry's page shows its name.
   The cards show only the book's name; the page of an entry and the
   suggestions of the sheets show the Portuguese one too.
   A search finds the entry by the English texts or by the Portuguese
   name, and lists first the names most like what was typed: the same
   name, then starting with it, every word starting a word of the name,
   having it, and last the names with words alike (plural, another form,
   one letter wrong: "invisivel" finds Invisibilidade).
   tools/gurps-traducoes.mjs lists the names that still have no Portuguese.
   ===================================================================== */
var ptNames = /** @type {Record<string, string> | null} */ (null);
var ptNamesLoading = /** @type {Promise<void> | null} */ (null);
function loadPtNames() {
  if (ptNames) return Promise.resolve();
  if (ptNamesLoading) return ptNamesLoading;
  ptNamesLoading = fetch('dados/traducoes.json?v=' + CATALOG_VERSION).then(function (res) {
    if (!res.ok) throw new Error('Não foi possível carregar dados/traducoes.json');
    return res.json();
  }).then(function (map) {
    ptNames = map || {};
    onData('translations'); // redraws the page (only the list while its search is being typed)
  }, function (er) {
    ptNames = {}; // the search goes on in English
    console.warn(er);
  });
  return ptNamesLoading;
}
// The Portuguese name shown for an entry; '' without one, or when it is the English one.
function ptName(x) {
  if (!ptNames) { loadPtNames(); return ''; }
  var t = x && ptNames[x.name];
  t = t ? t.split('|')[0].trim() : '';
  return t && norm(t) !== norm(x.name) ? t : '';
}
// tag: span (default) beside a suggestion's name, p under a page's title.
function ptNameHtml(x, tag) {
  var t = ptName(x);
  tag = tag || 'span';
  return t ? '<' + tag + ' class="pt-name" lang="pt-BR">' + esc(t) + '</' + tag + '>' : '';
}

// Words that say nothing alone ("bola de fogo" is "bola" and "fogo").
var SEARCH_STOP = { de: 1, da: 1, do: 1, das: 1, dos: 1, e: 1, a: 1, o: 1, as: 1, os: 1, em: 1, no: 1, na: 1, nos: 1, nas: 1,
  com: 1, para: 1, por: 1, um: 1, uma: 1, the: 1, of: 1, and: 1, to: 1, 'in': 1, on: 1, 'with': 1, 'for': 1 };
function searchWords(s) { return s.split(/[^a-z0-9]+/).filter(Boolean); }
// A typed search, normalized: the text and its words (without the empty ones, if any is left).
function catalogQuery(q) {
  var text = norm(q || '').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  var all = searchWords(text), words = all.filter(function (w) { return !SEARCH_STOP[w]; });
  return { text: text, words: words.length ? words : all };
}
// Edits between two words, up to max (more than max gives max + 1).
function editDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  var prev = [], cur = [], i, j;
  for (j = 0; j <= b.length; j++) prev[j] = j;
  for (i = 1; i <= a.length; i++) {
    cur = [i]; var low = i;
    for (j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (cur[j] < low) low = cur[j];
    }
    if (low > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}
// A word (normalized, without accents) in the singular: "racoes" -> "racao", "anais" -> "anal",
// "barris" -> "barril", "luzes" -> "luz", "tochas" -> "tocha".
function singularWord(w) {
  if (w.length < 4) return w;
  return w.replace(/(?:oes|aes|aos)$/, 'ao').replace(/ais$/, 'al').replace(/eis$/, 'el').replace(/ois$/, 'ol')
    .replace(/(?:[rzs])es$/, function (m) { return m[0]; }).replace(/ns$/, 'm').replace(/([^s])s$/, '$1');
}
// How much a typed word is like a word of a name, from 0 (not at all) to 1 (the same).
function wordLike(q, w) {
  if (q === w) return 1;
  if (singularWord(q) === singularWord(w)) return 0.95; // "racao" and "racoes"
  if (w.indexOf(q) === 0) return 0.9; // "invis" in "invisibilidade"
  var p = 0, m = Math.min(q.length, w.length);
  while (p < m && q[p] === w[p]) p++;
  // same stem: "curar" and "cura", "invisivel" and "invisibilidade" (not "escudo" and "escuridao")
  if ((p >= 4 && p >= 0.75 * m) || (p >= 5 && p >= 0.6 * m)) return 0.8;
  // a letter wrong ("invizibilidade"), but not the first ("sorte" is not "forte") nor in a short
  // word ("tocha" is not "toca")
  if (q.length >= 5 && w.length >= 5 && q[0] === w[0] && editDistance(q, w, q.length >= 8 ? 2 : 1) <= (q.length >= 8 ? 2 : 1)) return 0.7;
  return 0;
}
// A name (normalized) against the search: 0 when it does not match.
var nameWordsCache = {};
function nameScore(name, Q) {
  if (!name) return 0;
  if (name === Q.text) return 100;
  if (name.indexOf(Q.text) === 0) return 95;
  var words = nameWordsCache[name] || (nameWordsCache[name] = searchWords(name));
  if (Q.words.every(function (q) { return words.some(function (w) { return w.indexOf(q) === 0; }); })) return 85;
  var at = name.indexOf(Q.text);
  if (at > 0 && !/[a-z0-9]/.test(name[at - 1])) return 80; // at the start of a word
  var sum = 0;
  for (var i = 0; i < Q.words.length; i++) {
    var best = 0;
    for (var j = 0; j < words.length; j++) best = Math.max(best, wordLike(Q.words[i], words[j]));
    if (!best) break;
    sum += best;
  }
  if (best) return Math.round(50 + 24 * sum / Q.words.length);
  return at > 0 ? 45 : 0; // inside a word ("ball" in "fireball", "curar" in "procurar")
}
// The Portuguese names of an English one, normalized ("relampago", "raio").
var ptAltsCache = {};
function ptAlts(name) {
  if (!ptNames || !name) return [];
  if (ptAltsCache[name]) return ptAltsCache[name];
  return (ptAltsCache[name] = String(ptNames[name] || '').split('|').map(function (t) { return norm(t).trim(); }).filter(Boolean));
}
// textOf(x): the entry's English texts, normalized (searchText); without it, only the names count.
// Returns the score and the length of the name that got it (a shorter one has less besides the
// search: "Escudo Grande" before "Escudo Grande, Pesado").
function catalogScore(x, Q, textOf) {
  var en = norm(x.name), best = { s: nameScore(en, Q), len: en.length };
  ptAlts(x.name).forEach(function (t) {
    var s = nameScore(t, Q);
    if (s > best.s || (s === best.s && s && t.length < best.len)) best = { s: s, len: t.length };
  });
  if (best.s < 30 && textOf && textOf(x).indexOf(Q.text) >= 0) best = { s: 30, len: 0 };
  return best;
}
// The entries of list that match q, most alike first (then the shorter name, then the list's
// order); without q, the whole list.
function searchCatalog(list, q, textOf) {
  var Q = catalogQuery(q);
  if (!Q) return list;
  loadPtNames();
  var hits = [];
  list.forEach(function (x, i) { var r = catalogScore(x, Q, textOf); if (r.s) hits.push({ x: x, s: r.s, len: r.len, i: i }); });
  return hits.sort(function (a, b) { return b.s - a.s || a.len - b.len || a.i - b.i; }).map(function (h) { return h.x; });
}
