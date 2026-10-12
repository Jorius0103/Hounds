// Converte as planilhas de GURPS (Gurps/magias.csv e Gurps/advantages.csv) nos arquivos
// que o site sincroniza: dados/magias.json e dados/vantagens.json.
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
// Compact: no indentation and no empty fields; the site downloads these files whole.
function write(file, list) {
  const clean = list.map((x) => Object.fromEntries(Object.entries(x).filter(([, v]) => v !== '')));
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
const spells = uniqueIds(parseCsv(readFileSync(path.join(ROOT, 'Gurps', 'magias.csv'), 'utf8')).map((r) => {
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
