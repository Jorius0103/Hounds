// Revisão dos textos dos catálogos de GURPS (dados/magias.json, vantagens.json, pericias.json,
// tecnicas.json e estilos.json): conserta o que a extração dos PDFs estragou — espaço antes da
// pontuação, hífen de fim de linha ("high- Will", "pp. 242- 253"), palavras que perderam o hífen
// ("onehanded", "IQbased"), reticências espaçadas (". . ."), restos do custo no começo da
// descrição, listas com "•" num parágrafo só — sem mudar o que o texto diz.
//
//   node tools/gurps-texto.mjs        revisa os arquivos de dados/ no lugar
//
// tools/gurps-csv-para-json.mjs usa revisarItem ao gerar os arquivos, então a revisão vale
// também para os catálogos gerados de novo. Depois de revisar, aumente CATALOG_VERSION em js/mundo.js.
// Os textos estão em inglês (os livros); nomes, ids, livros e páginas não são mexidos.

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Palavras que perderam o hífen na quebra de linha do PDF: a forma com hífen é a que os
// próprios livros usam mais vezes. Palavras que o inglês escreve juntas (backpack, midair,
// handheld, shapeshifting) ficam como estão.
const HIFENS = ['long-distance', 'one-handed', 'two-handed', 'high-tech', 'one-yard', 'five-yard', 'off-balance', 'meta-trait', 'meta-spells',
  'low-mana', 'human-sized', 'full-sized', 'well-braced', 'well-suited', 'low-line', 'self-defense', 'self-inflicted', 'two-dimensional', 'three-dimensional',
  'plane-shift', 'main-gauche', 'real-world', 'full-length', 'full-fledged', 'life-support', 'close-combat', 'brute-force', 'cross-train', 'jiu-jitsu',
  'ground-fighting', 'dagger-fighting', 'high-ranking', 'non-damaging', 'combat-related', 'mana-dependent', 'fire-control', 'high-pressure', 'direct-fire',
  'single-engine', 'short-duration'];
const JUNTAS = Object.fromEntries(HIFENS.map((w) => [w.replace(/-/g, ''), w]));
const JUNTAS_RE = new RegExp('\\b(' + Object.keys(JUNTAS).join('|') + ')\\b', 'gi');
// Keeps the case of the text: "Onehanded" → "One-handed".
function hifenar(word) {
  const w = JUNTAS[word.toLowerCase()], at = w.indexOf('-');
  return word.slice(0, at) + '-' + word.slice(at);
}

export function revisarTexto(s) {
  if (typeof s !== 'string' || !s) return s;
  let t = s.replace(/\r\n?/g, '\n').replace(/[ \t ]+/g, ' ').replace(/ *\n */g, '\n');
  // Reticências: ". . ." do livro vira "…", colado na palavra de antes.
  t = t.replace(/ ?\.(?: \.){2,3}/g, '…').replace(/…(?=[A-Za-z(“])/g, '… ');
  // Sem espaço antes da pontuação, nem depois de "(" ou antes de ")".
  t = t.replace(/ +([.,;:!?])(?=[\s”’")\]]|$)/g, '$1').replace(/\( +/g, '(').replace(/ +\)/g, ')');
  // Hífen de fim de linha: "high- Will", "Mind- Reading", "pp. 242- 253", "(Spear)- 2". Fica o
  // hífen suspenso de "DX- or Speed-based", "14th- through" e "per- to" (texto embaralhado do PDF).
  t = t.replace(/([A-Za-z0-9)])- (?!(?:or|and|to|nor|through)\b)(?=[A-Za-z0-9(])/g, '$1-');
  // Sufixos separados da palavra: "kata -like", "DX -based".
  t = t.replace(/([A-Za-z]) -(like|looking|based|style|shaped|sized|handed|level|related)\b/g, '$1-$2');
  // "IQbased", "Speedbased" → "IQ-based"; e as palavras da lista acima.
  t = t.replace(/\b(ST|DX|IQ|HT|Per|Will|Speed|Move)based\b/g, '$1-based');
  t = t.replace(JUNTAS_RE, hifenar);
  // Listas: cada "•" começa uma linha.
  t = t.replace(/\n? ?• ?/g, '\n• ').replace(/^\n+/, '');
  return t.replace(/ {2,}/g, ' ').trim();
}

// Some descriptions start with what was left of the cost: "points/level You are…" (Magery,
// cost "… +10 points/level"), "of Tunneling Move You can…". The piece goes when the cost ends with it.
// The longest lowercase-led piece before a capital ("of Tunneling Move" in "of Tunneling Move You…").
function semRestoDoCusto(desc, cost) {
  if (!desc || !cost || !/^[a-z]/.test(desc)) return desc;
  const c = cost.trim();
  let cut = -1;
  for (const m of desc.slice(0, 80).matchAll(/ (?=[A-Z])/g)) if (c.endsWith(desc.slice(0, m.index))) cut = m.index;
  return cut > 0 ? desc.slice(cut + 1) : desc;
}
const INTACTOS = new Set(['id', 'name', 'book', 'source', 'page', 'type', 'attribute', 'difficulty', 'class', 'college', 'cost']);
// A catalog entry with its texts revised: the description starts with a capital and ends with
// punctuation ("see p. 23" → "See p. 23.").
export function revisarItem(x) {
  const out = { ...x };
  for (const [k, v] of Object.entries(out)) if (typeof v === 'string' && !INTACTOS.has(k)) out[k] = revisarTexto(v);
  if (typeof out.description === 'string' && out.description) {
    let d = semRestoDoCusto(out.description, out.cost);
    if (/^see\b/.test(d)) d = 'S' + d.slice(1);
    // A heading inside the text ("… 5 points. Magery 1+: Higher levels…", "Enhanced Dodge: You…")
    // starts a paragraph: up to six words, each capitalized (or a number), then ":" and a capital.
    d = d.replace(/([.!?…”):]) (?=[A-Z0-9][\w’'/+-]*(?: (?:[A-Z0-9(][\w’'/+()-]*|of|the|and|or|to|a|in|on|for|with|vs\.)){0,5}: [A-Z“(0-9])/g, '$1\n\n');
    // "Special Limitations"/"Special Enhancements" head the list of the ones that follow: a line of their own.
    d = d.replace(/(^|\n)(Special (?:Limitations|Enhancements|Modifiers)) (?=[A-Z])/g, '$1$2\n');
    // Not after a table of numbers ("0 -1 -2") nor after a closing quote, which has its own.
    if (/[A-Za-z)]$/.test(d)) d += '.';
    out.description = d;
  }
  return out;
}

// CLI: revisa os cinco arquivos no lugar, no mesmo formato compacto.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const f of ['magias', 'vantagens', 'pericias', 'tecnicas', 'estilos']) {
    const file = path.join(ROOT, 'dados', f + '.json');
    const list = JSON.parse(readFileSync(file, 'utf8'));
    let n = 0;
    const out = list.map((x) => { const y = revisarItem(x); if (JSON.stringify(y) !== JSON.stringify(x)) n++; return y; });
    writeFileSync(file, JSON.stringify(out) + '\n', 'utf8');
    console.log(`dados/${f}.json: ${n} de ${list.length} itens revisados`);
  }
}
