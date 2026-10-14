// Compara, campo a campo, cada documento de hounds_docs (a cópia de antes das tabelas
// relacionais) com o item que o site lê agora das views <tabela>_doc. Só lê: não grava nada.
//
// Uso:
//   cd tools
//   node validar-migracao.mjs
//
// Usa o supabase-config.js (chave pública). Termina com código 1 se algum campo mudou.
// As diferenças esperadas aparecem como avisos, não como erro:
//   - ids de itens que não existem mais, ou repetidos, nas listas (o site já os ignorava);
//   - createdBy de uma conta que não existe mais (o item fica sem dono, como os antigos);
//   - campos que o documento não tinha e agora vêm com o valor padrão;
//   - "v" (versão do documento, que o site não usa) e "position" vazio dos locais.

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

// Coleção do site → view de leitura.
export const VIEWS = {
  users: 'usuarios_doc', maps: 'mapas_doc', locations: 'locais_doc', characters: 'personagens_doc', organizations: 'organizacoes_doc',
  sheets: 'fichas_doc', events: 'eventos_doc', notebooks: 'cadernos_doc', notes: 'anotacoes_doc', spells: 'magias_doc',
  advantages: 'vantagens_doc', skills: 'pericias_doc', techniques: 'tecnicas_doc', styles: 'estilos_doc',
  mesa: 'mesa_estado_doc', mesa_chunks: 'mesa_partes_doc'
};
const CATALOGS = ['spells', 'advantages', 'skills', 'techniques', 'styles'];
// Listas de ids e a coleção para onde apontam; [campo, coleção, chave do id quando a lista é de objetos].
const LISTS = {
  locations: [['characterIds', 'characters']],
  characters: [['mapIds', 'maps'], ['relations', 'characters', 'charId']],
  organizations: [['members', 'characters', 'charId'], ['locationIds', 'locations'], ['mapIds', 'maps']],
  events: [['characterIds', 'characters']]
};
// Campos com o id de outro item.
const REFS = {
  maps: [['parentId', 'maps']], locations: [['mapId', 'maps'], ['parentId', 'locations']], characters: [['sheetId', 'sheets']],
  events: [['locationId', 'locations']], markers: [['locationId', 'locations'], ['linkedMapId', 'maps']]
};

function viewOf(col) { return /^maps\/[^/]+\/markers$/.test(col) ? 'marcadores_doc' : VIEWS[col] || null; }
function kindOf(col) { return /^maps\/[^/]+\/markers$/.test(col) ? 'markers' : col; }
function isEmpty(v) {
  return v === null || v === undefined || v === '' || v === false || v === 0 || (Array.isArray(v) && v.every(isEmpty)) ||
    (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).every((k) => isEmpty(v[k])));
}
function same(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 1e-9;
  if (typeof a === 'number' && typeof b === 'string') return Number(b) === a;
  return JSON.stringify(a) === JSON.stringify(b);
}

// The document as the database should have kept it: lists without ids of items that don't
// exist (or repeated), references to missing items as null. Returns [expected, warnings].
function expected(col, doc, exists) {
  const kind = kindOf(col), d = JSON.parse(JSON.stringify(doc)), warn = [];
  delete d.v;
  if (kind === 'locations' && d.position == null) delete d.position;
  if (d.createdBy && !exists('users', d.createdBy)) { warn.push(`createdBy "${d.createdBy}" não existe mais: item sem dono`); d.createdBy = null; }
  if (Array.isArray(d.sharedWith)) {
    const seen = new Set();
    d.sharedWith = d.sharedWith.filter((u) => {
      if (seen.has(u)) return false; seen.add(u);
      if (!exists('users', u)) { warn.push(`sharedWith: conta "${u}" não existe mais`); return false; }
      return true;
    });
  }
  for (const [field, target, key] of LISTS[kind] || []) {
    if (!Array.isArray(d[field])) continue;
    const seen = new Set();
    d[field] = d[field].filter((x) => {
      const id = key ? x && x[key] : x;
      if (!id || seen.has(id)) { if (id) warn.push(`${field}: "${id}" repetido`); return false; }
      seen.add(id);
      if (field === 'relations' && id === doc.id) { warn.push(`${field}: relação consigo mesmo`); return false; }
      if (!exists(target, id)) { warn.push(`${field}: "${id}" não existe mais`); return false; }
      return true;
    });
  }
  for (const [field, target] of REFS[kind] || []) {
    if (d[field] && !exists(target, d[field])) { warn.push(`${field}: "${d[field]}" não existe mais`); d[field] = null; }
  }
  return [d, warn];
}

// Fields of o must be in v with the same value; fields only in v must be empty (defaults).
function diff(o, v, at, out, info) {
  if (Array.isArray(o)) {
    if (!Array.isArray(v)) { out.push(`${at}: era lista, agora ${JSON.stringify(v)}`); return; }
    if (o.length !== v.length) { out.push(`${at}: ${o.length} itens, agora ${v.length}`); return; }
    o.forEach((x, i) => diff(x, v[i], `${at}[${i}]`, out, info));
    return;
  }
  if (o && typeof o === 'object') {
    if (!v || typeof v !== 'object' || Array.isArray(v)) { out.push(`${at}: era objeto, agora ${JSON.stringify(v)}`); return; }
    for (const k of Object.keys(o)) {
      if (!(k in v)) { if (o[k] !== null && o[k] !== undefined) out.push(`${at}.${k}: sumiu (era ${JSON.stringify(o[k])})`); continue; }
      diff(o[k], v[k], `${at}.${k}`, out, info);
    }
    for (const k of Object.keys(v)) if (!(k in o) && !isEmpty(v[k]) && !/^(createdAt|updatedAt|attrs|combat)$/.test(k) && !/\.(attrs|def)$/.test(at)) info.push(`${at}.${k}: campo novo = ${JSON.stringify(v[k]).slice(0, 60)}`);
    return;
  }
  if (!same(o, v)) out.push(`${at}: era ${JSON.stringify(o)}, agora ${JSON.stringify(v)}`);
}

// Sheets saved before the Percepção/Vontade bases kept per and will relative to IQ (sheetAttrs).
function sheetAttrsExpected(d) {
  const a = d.attrs;
  if (!a || typeof a !== 'object') return;
  for (const k of ['per', 'will']) if (k in a && !((k + 'Base') in a)) { a[k] = Math.min(50, Math.max(-50, (a.iq ?? 10) + a[k] - 10)); a[k + 'Base'] = 10; }
}

/**
 * docs: [{ col, id, data }] de hounds_docs · read(view): Promise<[{ id, data, mapa_id? }]>
 * Resolve com { erros: [texto], avisos: [texto], comparados: n }.
 */
export async function compararDocumentos(docs, read) {
  const ids = {};
  for (const d of docs) (ids[kindOf(d.col)] = ids[kindOf(d.col)] || new Set()).add(d.id);
  const exists = (col, id) => !!ids[col] && ids[col].has(id);
  const cache = {};
  async function rowsOf(view) { return cache[view] || (cache[view] = read(view).then((l) => new Map(l.map((r) => [r.id + '|' + (r.mapa_id || ''), r])))); }
  const erros = [], avisos = [];
  let comparados = 0;
  for (const doc of docs) {
    const view = viewOf(doc.col), name = `${doc.col}/${doc.id}`;
    if (!view) { erros.push(`${name}: coleção desconhecida, não foi migrada`); continue; }
    const mapId = kindOf(doc.col) === 'markers' ? doc.col.split('/')[1] : '';
    const row = (await rowsOf(view)).get(doc.id + '|' + mapId);
    if (!row) { erros.push(`${name}: não está em ${view}`); continue; }
    comparados++;
    const [exp, warn] = expected(doc.col, doc.data, exists);
    if (doc.col === 'sheets') sheetAttrsExpected(exp);
    let got = row.data;
    if (CATALOGS.includes(doc.col)) { got = Object.assign({ sharedWith: [], deleted: false }, got); if (!('deleted' in exp)) delete got.deleted; }
    const out = [], info = [];
    diff(exp, got, name, out, info);
    warn.forEach((w) => avisos.push(`${name}: ${w}`));
    info.forEach((w) => avisos.push(w));
    out.forEach((e) => erros.push(e));
  }
  return { erros, avisos, comparados };
}

async function main() {
  const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const cfgFile = path.join(ROOT, 'supabase-config.js');
  if (!existsSync(cfgFile)) { console.error('ERRO: supabase-config.js não encontrado.'); process.exit(1); }
  const sandbox = { window: {} };
  vm.runInNewContext(await readFile(cfgFile, 'utf8'), sandbox);
  const cfg = sandbox.window.HOUNDS_SUPABASE;
  if (!cfg || !cfg.url || !cfg.anonKey) { console.error('ERRO: preencha supabase-config.js com url e anonKey.'); process.exit(1); }
  const API = cfg.url.replace(/\/$/, '') + '/rest/v1/', headers = { apikey: cfg.anonKey, Authorization: `Bearer ${cfg.anonKey}` };
  async function get(table, select) {
    const res = await fetch(`${API}${table}?select=${select}`, { headers });
    if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
    return res.json();
  }
  const docs = await get('hounds_docs', 'col,id,data');
  const r = await compararDocumentos(docs, (view) => get(view, view === 'marcadores_doc' ? 'id,mapa_id,data' : 'id,data'));
  r.avisos.forEach((a) => console.log('aviso:', a));
  r.erros.forEach((e) => console.log('ERRO: ', e));
  console.log(`\n${r.comparados} de ${docs.length} documentos comparados: ${r.erros.length} diferença(s), ${r.avisos.length} aviso(s).`);
  process.exit(r.erros.length ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error('ERRO:', e.message); process.exit(1); });
