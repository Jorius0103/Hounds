// Converte as planilhas de GURPS (Gurps/magias.csv, Gurps/advantages.csv, Gurps/pericias.csv e
// Gurps/tecnicas.csv e Gurps/estilos.csv) nos arquivos que o site sincroniza: dados/magias.json,
// dados/vantagens.json, dados/pericias.json, dados/tecnicas.json e dados/estilos.json.
//
//   node tools/gurps-csv-para-json.mjs
//
// Depois de gerar, aumente CATALOG_VERSION em js/mundo.js: o site baixa os arquivos com
// ?v=<versão>, e a versão nova faz os navegadores pegarem os arquivos novos em vez do cache.
// Os catálogos não vão para o banco; lá ficam só as magias e vantagens que o Mestre criou
// ou alterou (veja "Catálogos de GURPS" em js/mundo.js).
//
// CSV separado por ";", com aspas em volta dos campos que têm ";" ("" é uma aspa).
// Os ids saem do nome, do livro e da página, para não mudarem quando a ordem das linhas mudar.

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { revisarItem } from './gurps-texto.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseCsv(text) {
  const t = text.replace(/^﻿/, '');
  const rows = [];
  let row = [], f = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c;
      continue;
    }
    if (c === '"' && f === '') q = true;
    else if (c === ';') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      row.push(f); f = '';
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else f += c;
  }
  row.push(f);
  if (row.some((x) => x.trim())) rows.push(row);
  const head = rows.shift().map((h) => h.trim());
  return rows.map((r, n) => {
    if (r.length !== head.length) throw new Error(`Linha ${n + 2}: ${r.length} colunas, esperava ${head.length}`);
    const o = {};
    head.forEach((h, i) => { o[h] = (r[i] || '').trim(); });
    return o;
  });
}
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// Same name, book and page twice: the second gets _2, and so on.
function uniqueIds(list) {
  const seen = {};
  list.forEach((x) => { seen[x.id] = (seen[x.id] || 0) + 1; if (seen[x.id] > 1) x.id += '_' + seen[x.id]; });
  return list;
}
function bookCode(codes, book, file) {
  const c = codes[book];
  if (!c) throw new Error(`${file}: livro sem sigla em BOOKS: "${book}"`);
  return c;
}
// Compact: no indentation and no empty fields; the site downloads these files whole. The texts
// go through the revision of tools/gurps-texto.mjs (punctuation, hyphens, lists, paragraphs).
function write(file, list) {
  const clean = list.map(revisarItem).map((x) => Object.fromEntries(Object.entries(x).filter(([, v]) => v !== '')));
  writeFileSync(path.join(ROOT, 'dados', file), JSON.stringify(clean) + '\n', 'utf8');
  console.log(`dados/${file}: ${list.length} itens`);
}

// ---------- remissões e cópias ----------
// The books send the reader to another page: a spell of more than one college is printed in full
// once and the other colleges only say "As listed under Air Spells, p. 243"; the alphabetical list of
// skills says "see Melee Weapon, p. 208"; a supplement says "see p. B72" or "see Martial Arts, p. 49".
// The entry gets the text of that page: the entry of the same name there, or else the one it names.
// A field that is only the reference is replaced; a reference inside a text of its own ("See GURPS
// Magic, p. 126. Always costs 3 FP…") gets the text of that page as a paragraph after it.
const NOT_TEXT = new Set(['id', 'name', 'page', 'book', 'source']);
const BOOK_NAMES = { 'gurps magic': 'M', magic: 'M', 'martial arts': 'MA', 'gurps martial arts': 'MA' };
const nameKey = (s) => s.trim().toLowerCase().replace(/\/tl$/, '');
// To find the page's entry: without the specialty or the plural ("Alchemy (Infusions)" is under
// Alchemy/TL, "Patron" under Patrons).
const baseKey = (s) => nameKey(s.replace(/\s*\(.*\)\s*$/, '')).replace(/s$/, '');
const codeOf = (x) => x.page.replace(/\d+$/, '');
const pageOf = (x) => Number(x.page.replace(/^\D+/, ''));
function parseReference(cited, code, from, to, above) {
  if (above && !cited) return null; // "See above." in a field: the text before it, not another entry
  const book = cited && BOOK_NAMES[cited.trim().toLowerCase()];
  return { name: book ? '' : (cited || '').trim(), code: book || code || '', from: Number(from) || 0, to: Number(to || from) || 0, above: !!above };
}
// The field of the entry that is only a reference, and where it points.
function pointerOf(x) {
  for (const [k, v] of Object.entries(x)) {
    if (typeof v !== 'string' || NOT_TEXT.has(k)) continue;
    if (k === 'description' && /(listed|described|description) under/i.test(v.slice(0, 80))) {
      const m = v.slice(0, 80).match(/pp?\.\s*(\d+)(?:\s*[-–]\s*(\d+))?/);
      if (m) return { field: k, ref: parseReference('', '', m[1], m[2]) };
    }
    const m = v.length < 100 && v.trim().match(/^see\s+(?:(?!pp?\.)(.+?)\s*,\s*)?(?:pp?\.\s*([A-Z]*)(\d+)(?:\s*[-–]\s*(\d+))?|(above))/i);
    // Only the reference: nothing after it but punctuation ("See GURPS Magic, p. 126. Always costs…" has a text of its own).
    const ref = m && !/[.;]\s*\S/.test(v.trim().slice(m[0].length).replace(/pp?\.\s*[A-Z]*\d+/g, '')) && parseReference(m[1], m[2], m[3], m[4], m[5]);
    if (ref) return { field: k, ref };
  }
  return null;
}
// "See Mounted Shooting (p. 77)", "See GURPS Magic, p. 126. Always costs…": a reference that is what
// the description is about (at its start, or in a short one). In a long text it is only a pointer to
// a rule, and the text of that page would bury the entry's own.
function seeInText(x) {
  const d = x.description || '';
  const m = d.match(/\b[Ss]ee\s+(?:([A-Z][^.;()]*?)\s*(?:,\s*|\(\s*))?pp?\.\s*([A-Z]*)(\d+)(?:\s*[-–]\s*(\d+))?/);
  return m && (m.index < 40 || d.length < 200) ? parseReference(m[1], m[2], m[3], m[4]) : null;
}
function findReferenced(x, ref, list, pointers, spellList) {
  const pool = ref.code === 'M' && spellList && list !== spellList ? spellList : list;
  const code = ref.code || codeOf(x);
  // A section can go on to the next page ("Melee Weapon, p. 208" lists Kusari on p. 209).
  const from = ref.above ? pageOf(x) : ref.from, to = ref.above ? pageOf(x) : ref.to + 1;
  const at = pool.filter((y) => y !== x && codeOf(y) === code && pageOf(y) >= from && pageOf(y) <= to && !pointers.has(y));
  return at.find((y) => nameKey(y.name) === nameKey(x.name)) || (ref.name && at.find((y) => nameKey(y.name) === nameKey(ref.name))) ||
    at.find((y) => baseKey(y.name) === baseKey(x.name)) || (ref.name && at.find((y) => baseKey(y.name) === baseKey(ref.name)));
}
const withText = (x, t) => (x ? x + '\n\n' : '') + `${t.name} (${t.page}): ${t.description}`;
function resolveReferences(list, spellList) {
  const pointers = new Map();
  list.forEach((x) => { const p = pointerOf(x); if (p) pointers.set(x, p); });
  list.forEach((x) => {
    const p = pointers.get(x);
    if (!p) {
      const ref = seeInText(x), t = ref && findReferenced(x, ref, list, pointers, spellList);
      if (t && t.description) x.description = withText(x.description, t);
      return;
    }
    const t = findReferenced(x, p.ref, list, pointers, spellList);
    if (!t) { console.warn(`  ${x.id}: ${p.field} "${x[p.field].slice(0, 60)}" sem a página no CSV`); return; }
    // In the same book, the reference is all the entry has (what else is there is the PDF's leftovers).
    // Only the fields of the entry's own catalog (a skill that points to a spell gets its text, not its college).
    const sameBook = codeOf(t) === codeOf(x);
    Object.keys(x).filter((k) => !NOT_TEXT.has(k) && k in t).forEach((k) => {
      if (k === p.field || (k === 'description' && sameBook) || !x[k]) x[k] = t[k];
      else if (k === 'description' && t.description) x.description = withText(x.description, t);
    });
    x.referenced = true;
  });
  return list;
}
// Same name and same text (another listing of the same page, or the same text in two books): one
// entry. Same name with another text stays. The one kept is the page the text was printed on, in the
// order of `books`, then of the CSV; `merge` lists the fields that join the values of all of them.
const sameText = (s) => s.toLowerCase().replace(/[‘’“”"']/g, '').replace(/\s+/g, ' ').replace(/[\s.]+$/, '').trim();
function mergeSame(list, { books = [], bookField = 'book', merge = [] } = {}) {
  const rank = (x) => (x.referenced ? 100 : 0) + (books.includes(x[bookField]) ? books.indexOf(x[bookField]) : books.length);
  const kept = new Map();
  list.map((x, i) => ({ x, i })).sort((a, b) => rank(a.x) - rank(b.x) || a.i - b.i).forEach(({ x, i }) => {
    const k = x.description ? nameKey(x.name) + '|' + sameText(x.description) : i;
    const main = kept.get(k);
    if (!main) { kept.set(k, x); return; }
    merge.forEach((f) => (x[f] || '').split(',').map((c) => c.trim()).forEach((c) => { if (c && !main[f].split(', ').includes(c)) main[f] += (main[f] ? ', ' : '') + c; }));
    Object.keys(x).forEach((f) => { if (!main[f]) main[f] = x[f]; });
  });
  const keep = new Set(kept.values());
  return list.filter((x) => keep.has(x)).map(({ referenced, ...x }) => x);
}

// ---------- magias ----------
const SPELL_BOOKS = {
  'GURPS Basic Set': 'B', 'GURPS Magic': 'M', 'GURPS Fantasy': 'F', 'GURPS Magic: Death Spells': 'DS',
  'GURPS Magic: Plant Spells': 'PS', 'GURPS Mass Combat': 'MC', 'GURPS: Dungeon Fantasy 3: The Next Level': 'DF3',
  'GURPS Thaumatology: Magical Styles': 'TMS', 'GURPS 4th: Power Ups 1: Imbuements': 'PU1'
};
// The college names the site already uses ("Light and Darkness", "Meta-Spells").
function college(c) {
  if (c === 'Meta') return 'Meta-Spells';
  if (c === 'Illusion') return 'Illusion and Creation';
  return c.replace(/ And /g, ' and ');
}
// A spell of more than one college: one entry, with the colleges of all the listings.
const spells = uniqueIds(mergeSame(resolveReferences(parseCsv(readFileSync(path.join(ROOT, 'Gurps', 'magias.csv'), 'utf8')).map((r) => {
  const vh = /\(VH\)\s*$/.test(r.magia) || /Very Hard/i.test(r.classe);
  const name = r.magia.replace(/\s*\(VH\)\s*$/, '');
  const code = bookCode(SPELL_BOOKS, r.livro, 'magias.csv');
  return {
    id: 'spell_' + slug(name) + '_' + code.toLowerCase() + r.pagina,
    name, difficulty: vh ? 'VH' : 'H', class: r.classe, college: college(r.escola),
    timeToCast: r.tempo_de_conjuracao, duration: r.duracao, initialCost: r.custo, maintenanceCost: '',
    prerequisites: r.pre_requisitos, description: r.descricao, item: r.item, page: code + r.pagina, source: r.livro
  };
})), { books: ['GURPS Magic', 'GURPS Basic Set'], bookField: 'source', merge: ['college'] }));
write('magias.json', spells);

// ---------- vantagens ----------
const ADV_BOOKS = {
  'GURPS Basic Set (4th ed.)': 'B', 'GURPS Basic Set (4ª ed.)': 'B', 'GURPS Martial Arts': 'MA', 'GURPS Fantasy': 'F',
  'GURPS Martial Arts: Gladiators': 'MAG', 'GURPS Low-Tech': 'LT'
};
const advantages = uniqueIds(mergeSame(resolveReferences(parseCsv(readFileSync(path.join(ROOT, 'Gurps', 'advantages.csv'), 'utf8')).map((r) => {
  const code = bookCode(ADV_BOOKS, r.livro, 'advantages.csv');
  return { id: 'adv_' + slug(r.advantage) + '_' + code.toLowerCase() + r.pagina, name: r.advantage, cost: r.custo, type: r.tipo,
    book: r.livro, page: code + r.pagina, description: r.descricao };
}))));
write('vantagens.json', advantages);

// ---------- perícias ----------
const SKILL_BOOKS = {
  'GURPS Basic Set': 'B', 'GURPS Martial Arts': 'MA', 'GURPS Fantasy': 'F', 'GURPS Low-Tech': 'LT',
  'GURPS Low-Tech Companion 3: Daily Life And Economics': 'LTC3', 'GURPS Social Engineering': 'SE',
  'GURPS 4th: Power Ups 1: Imbuements': 'PU1', 'GURPS: Dungeon Fantasy 14: Psi': 'DF14',
  'GURPS: Dungeon Fantasy 19: Incantation Magic': 'DF19', 'GURPS: Dungeon Fantasy 20: Slayers': 'DF20',
  'Martial Arts: Yrth Fighting Styles': 'MAY'
};
// Same abbreviations the spells use (H, VH).
const DIFFICULTY = { Easy: 'E', Average: 'A', Hard: 'H', 'Very Hard': 'VH' };
const skills = uniqueIds(mergeSame(resolveReferences(parseCsv(readFileSync(path.join(ROOT, 'Gurps', 'pericias.csv'), 'utf8')).map((r) => {
  const code = bookCode(SKILL_BOOKS, r.livro, 'pericias.csv');
  return {
    id: 'skill_' + slug(r.pericia) + '_' + code.toLowerCase() + r.pagina,
    name: r.pericia, type: r.tipo, attribute: r.atributo, difficulty: DIFFICULTY[r.dificuldade] || '',
    specialty: r.especializacao === 'sim' || '', cinematic: r.cinematica === 'sim' || '',
    defaults: r.defaults, prerequisites: r.pre_requisitos, description: r.descricao, modifiers: r.modificadores,
    book: r.livro, page: code + r.pagina
  };
}), spells)));
write('pericias.json', skills);

// ---------- técnicas ----------
// Same books (and codes) as the skills; a book that only has techniques goes here.
const TECH_BOOKS = { ...SKILL_BOOKS, 'GURPS Low-Tech Companion 1: Philosophers and Kings': 'LTC1',
  'GURPS Low-Tech Companion 2: Weapons and Warriors': 'LTC2' };
const techniques = uniqueIds(mergeSame(resolveReferences(parseCsv(readFileSync(path.join(ROOT, 'Gurps', 'tecnicas.csv'), 'utf8')).map((r) => {
  const code = bookCode(TECH_BOOKS, r.livro, 'tecnicas.csv');
  return {
    id: 'tech_' + slug(r.tecnica) + '_' + code.toLowerCase() + r.pagina,
    name: r.tecnica, difficulty: DIFFICULTY[r.dificuldade] || '', cinematic: r.cinematica === 'sim' || '',
    defaults: r.defaults, prerequisites: r.pre_requisitos, description: r.descricao, modifiers: r.modificadores,
    book: r.livro, page: code + r.pagina
  };
}))));
write('tecnicas.json', techniques);

// ---------- estilos ----------
const STYLE_BOOKS = { ...TECH_BOOKS };
const styles = uniqueIds(mergeSame(resolveReferences(parseCsv(readFileSync(path.join(ROOT, 'Gurps', 'estilos.csv'), 'utf8')).map((r) => {
  const code = bookCode(STYLE_BOOKS, r.livro, 'estilos.csv');
  return {
    id: 'style_' + slug(r.estilo) + '_' + code.toLowerCase() + r.pagina,
    name: r.estilo, cost: r.custo, description: r.descricao,
    skills: r.pericias, techniques: r.tecnicas, cinematicSkills: r.pericias_cinematicas, cinematicTechniques: r.tecnicas_cinematicas,
    perks: r.perks, optAdvantages: r.opc_vantagens, optDisadvantages: r.opc_desvantagens, optSkills: r.opc_pericias,
    optTechniques: r.opc_tecnicas, optPerks: r.opc_perks, book: r.livro, page: code + r.pagina
  };
}))));
write('estilos.json', styles);
