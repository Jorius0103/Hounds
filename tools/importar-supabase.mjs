// Copia os dados exportados (JSON + imagens) para o Supabase configurado em supabase-config.js.
//
// Uso:
//   cd tools
//   node importar-supabase.mjs
//
// Opções:
//   --pasta <dir>    onde estão os JSON e as imagens (padrão: a raiz do repositório)
//   --sobrescrever   importa mesmo se já houver registros no banco

import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const DIR = path.resolve(opt('--pasta') || ROOT);
const LOOK_IN = [DIR, path.join(DIR, 'dados'), path.join(DIR, 'imagens')];

const COLLECTIONS = ['users', 'maps', 'locations', 'characters', 'notebooks', 'notes'];
const MESA_PIECE = 60000;
const TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' };

function fail(msg) { console.error('ERRO:', msg); process.exit(1); }

function find(name) {
  for (const d of LOOK_IN) { const p = path.join(d, name); if (existsSync(p)) return p; }
  return null;
}

async function findImage(ref) {
  for (const d of LOOK_IN) {
    if (!existsSync(d)) continue;
    const files = await readdir(d);
    const f = files.find((x) => (x === ref || path.parse(x).name === ref) && TYPES[path.extname(x).toLowerCase()]);
    if (f) return path.join(d, f);
  }
  return null;
}

async function readJson(name) {
  const p = find(name);
  return p ? JSON.parse(await readFile(p, 'utf8')) : null;
}

// 1. Carrega supabase-config.js
const cfgFile = path.join(ROOT, 'supabase-config.js');
if (!existsSync(cfgFile)) fail('Arquivo supabase-config.js não encontrado.');

const sandbox = { window: {} };
vm.runInNewContext(await readFile(cfgFile, 'utf8'), sandbox);
const cfg = sandbox.window.HOUNDS_SUPABASE;
if (!cfg || !cfg.url || !cfg.anonKey) fail('Preencha supabase-config.js com url e anonKey válidos.');

const API_URL = cfg.url.replace(/\/$/, '');
const KEY = cfg.anonKey;
const BUCKET = cfg.bucket || 'hounds-images';

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json'
};

// 2. Testa se a tabela hounds_docs existe
const testRes = await fetch(`${API_URL}/rest/v1/hounds_docs?limit=1`, { headers });
if (testRes.status === 404) {
  fail('A tabela "hounds_docs" não foi encontrada no Supabase.\nExecute o script supabase-setup.sql no SQL Editor do Supabase primeiro!');
} else if (!testRes.ok) {
  fail(`Erro ao conectar com o Supabase: ${testRes.status} ${await testRes.text()}`);
}

// 3. Verifica se já existem dados
if (!flag('--sobrescrever')) {
  const existing = await testRes.json();
  if (Array.isArray(existing) && existing.length > 0) {
    fail('O banco já possui documentos gravados. Use --sobrescrever para atualizar.');
  }
}

// 4. Importa documentos JSON
const docs = {};
for (const col of COLLECTIONS) {
  const data = await readJson(col + '.json');
  if (!data) { console.log(`- ${col}.json não encontrado, pulando`); continue; }
  docs[col] = data;

  const records = Object.entries(data).map(([id, body]) => ({
    col: col,
    id: id,
    data: body,
    updated_at: new Date().toISOString()
  }));

  if (records.length > 0) {
    const postRes = await fetch(`${API_URL}/rest/v1/hounds_docs`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify(records)
    });
    if (!postRes.ok) {
      console.warn(`! Falha ao inserir ${col}:`, await postRes.text());
    } else {
      console.log(`✓ ${col}: ${records.length} registros`);
    }
  }
}

// 5. Importa imagens para o Supabase Storage
const refs = new Set();
for (const col of ['maps', 'locations', 'characters']) {
  for (const d of Object.values(docs[col] || {})) {
    if (d.image && d.image.ref) refs.add(d.image.ref);
  }
}

let sentImgs = 0;
for (const ref of refs) {
  const file = await findImage(ref);
  if (!file) { console.log(`! imagem ${ref} não encontrada localmente`); continue; }
  const bytes = await readFile(file);
  const ext = path.extname(file).toLowerCase();
  const mime = TYPES[ext] || 'application/octet-stream';

  const upRes = await fetch(`${API_URL}/storage/v1/object/${BUCKET}/${ref}`, {
    method: 'POST',
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': mime,
      'x-upsert': 'true'
    },
    body: bytes
  });

  if (upRes.ok) {
    sentImgs++;
  } else {
    console.warn(`! Erro ao subir imagem ${ref}: ${await upRes.text()}`);
  }
}
console.log(`✓ imagens enviadas para storage: ${sentImgs} de ${refs.size}`);

// 6. Importa a Mesa de Combate
const mesa = await readJson('mesa-de-combate.json');
if (mesa) {
  const st = { combats: mesa.combats, conditions: mesa.conditions, players: mesa.players, activeCombatId: mesa.activeCombatId || null };
  const json = JSON.stringify(st);
  const parts = [];
  for (let i = 0; i < json.length; i += MESA_PIECE) parts.push(json.slice(i, i + MESA_PIECE));
  const t = Date.now(), rev = `import-${t}`;

  const chunkRecords = parts.map((part, i) => ({
    col: 'mesa_chunks',
    id: `${rev}_${i}`,
    data: { rev, i, part, createdAt: t },
    updated_at: new Date().toISOString()
  }));

  await fetch(`${API_URL}/rest/v1/hounds_docs`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify(chunkRecords)
  });

  await fetch(`${API_URL}/rest/v1/hounds_docs`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify([{
      col: 'mesa',
      id: 'state',
      data: { rev, n: parts.length, by: null, createdAt: t, updatedAt: t },
      updated_at: new Date().toISOString()
    }])
  });

  console.log(`✓ mesa de combate: ${(st.combats || []).length} combates importados`);
}

console.log('Importação concluída com sucesso!');
process.exit(0);

