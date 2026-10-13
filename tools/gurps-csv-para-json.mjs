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
// The same spell appears in more than one book (Basic Set and Magic) and, inside a book, once in
// the list of each college it belongs to (the extra ones only say "As listed under ..."). One entry
// per name: the full text of the preferred book, with the colleges of all the copies.
const SPELL_BOOK_ORDER = ['GURPS Magic', 'GURPS Basic Set'];
const isReference = (x) => /As listed under/i.test(x.description) && x.description.length < 120;
function spellRank(x) {
  const b = SPELL_BOOK_ORDER.indexOf(x.source);
  return (isReference(x) ? 100 : 0) + (b < 0 ? SPELL_BOOK_ORDER.length : b);
}
function mergeSpellCopies(list) {
  const groups = new Map();
  list.forEach((x) => {
    const k = x.name.trim().toLowerCase();
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(x);
  });
  return [...groups.values()].map((copies) => {
    const main = copies.slice().sort((a, b) => spellRank(a) - spellRank(b))[0];
    const colleges = [];
    [main, ...copies].forEach((x) => x.college.split(',').map((c) => c.trim()).forEach((c) => { if (c && !colleges.includes(c)) colleges.push(c); }));
    return { ...main, college: colleges.join(', ') };
  });
}
const spells = mergeSpellCopies(parseCsv(readFileSync(path.join(ROOT, 'Gurps', 'magias.csv'), 'utf8')).map((r) => {
  const vh = /\(VH\)\s*$/.test(r.magia) || /Very Hard/i.test(r.classe);
  const name = r.magia.replace(/\s*\(VH\)\s*$/, '');
  const code = bookCode(SPELL_BOOKS, r.livro, 'magias.csv');
  return {
    id: 'spell_' + slug(name) + '_' + code.toLowerCase() + r.pagina,
    name, difficulty: vh ? 'VH' : 'H', class: r.classe, college: college(r.escola),
    timeToCast: r.tempo_de_conjuracao, duration: r.duracao, initialCost: r.custo, maintenanceCost: '',
    prerequisites: r.pre_requisitos, description: r.descricao, item: r.item, page: code + r.pagina, source: r.livro
  };
}));
write('magias.json', spells);

// ---------- vantagens ----------
const ADV_BOOKS = {
  'GURPS Basic Set (4th ed.)': 'B', 'GURPS Basic Set (4ª ed.)': 'B', 'GURPS Martial Arts': 'MA', 'GURPS Fantasy': 'F',
  'GURPS Martial Arts: Gladiators': 'MAG', 'GURPS Low-Tech': 'LT'
};
const advantages = uniqueIds(parseCsv(readFileSync(path.join(ROOT, 'Gurps', 'advantages.csv'), 'utf8')).map((r) => {
  const code = bookCode(ADV_BOOKS, r.livro, 'advantages.csv');
  return { id: 'adv_' + slug(r.advantage) + '_' + code.toLowerCase() + r.pagina, name: r.advantage, cost: r.custo, type: r.tipo,
    book: r.livro, page: code + r.pagina, description: r.descricao };
}));
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
const skills = uniqueIds(parseCsv(readFileSync(path.join(ROOT, 'Gurps', 'pericias.csv'), 'utf8')).map((r) => {
  const code = bookCode(SKILL_BOOKS, r.livro, 'pericias.csv');
  return {
    id: 'skill_' + slug(r.pericia) + '_' + code.toLowerCase() + r.pagina,
    name: r.pericia, type: r.tipo, attribute: r.atributo, difficulty: DIFFICULTY[r.dificuldade] || '',
    specialty: r.especializacao === 'sim' || '', cinematic: r.cinematica === 'sim' || '',
    defaults: r.defaults, prerequisites: r.pre_requisitos, description: r.descricao, modifiers: r.modificadores,
    book: r.livro, page: code + r.pagina
  };
}));
write('pericias.json', skills);

// ---------- técnicas ----------
// Same books (and codes) as the skills; a book that only has techniques goes here.
const TECH_BOOKS = { ...SKILL_BOOKS, 'GURPS Low-Tech Companion 1: Philosophers and Kings': 'LTC1',
  'GURPS Low-Tech Companion 2: Weapons and Warriors': 'LTC2' };
const techniques = uniqueIds(parseCsv(readFileSync(path.join(ROOT, 'Gurps', 'tecnicas.csv'), 'utf8')).map((r) => {
  const code = bookCode(TECH_BOOKS, r.livro, 'tecnicas.csv');
  return {
    id: 'tech_' + slug(r.tecnica) + '_' + code.toLowerCase() + r.pagina,
    name: r.tecnica, difficulty: DIFFICULTY[r.dificuldade] || '', cinematic: r.cinematica === 'sim' || '',
    defaults: r.defaults, prerequisites: r.pre_requisitos, description: r.descricao, modifiers: r.modificadores,
    book: r.livro, page: code + r.pagina
  };
}));
write('tecnicas.json', techniques);

// ---------- estilos ----------
const STYLE_BOOKS = { ...TECH_BOOKS };
const styles = uniqueIds(parseCsv(readFileSync(path.join(ROOT, 'Gurps', 'estilos.csv'), 'utf8')).map((r) => {
  const code = bookCode(STYLE_BOOKS, r.livro, 'estilos.csv');
  return {
    id: 'style_' + slug(r.estilo) + '_' + code.toLowerCase() + r.pagina,
    name: r.estilo, cost: r.custo, description: r.descricao,
    skills: r.pericias, techniques: r.tecnicas, cinematicSkills: r.pericias_cinematicas, cinematicTechniques: r.tecnicas_cinematicas,
    perks: r.perks, optAdvantages: r.opc_vantagens, optDisadvantages: r.opc_desvantagens, optSkills: r.opc_pericias,
    optTechniques: r.opc_tecnicas, optPerks: r.opc_perks, book: r.livro, page: code + r.pagina
  };
}));
write('estilos.json', styles);
