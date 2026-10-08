// Copia os dados exportados (JSON + imagens) para o Firebase de firebase-config.js.
//
//   cd tools
//   npm install
//   node importar-dados.mjs
//
// Opções:
//   --pasta <dir>    onde estão os JSON e as imagens (padrão: a raiz do repositório;
//                    também procura nas subpastas dados/ e imagens/)
//   --sobrescrever   importa mesmo se o banco já tiver dados
//   --emulador       usa o Firebase Emulator local (para testes)
//
// A senha da campanha é pedida no terminal, ou lida da variável HOUNDS_SENHA.

import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc, getDocs, deleteDoc, collection, query, where, limit, Bytes } from 'firebase/firestore';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const DIR = path.resolve(opt('--pasta') || ROOT);
const LOOK_IN = [DIR, path.join(DIR, 'dados'), path.join(DIR, 'imagens')];

const COLLECTIONS = ['users', 'maps', 'locations', 'characters', 'notebooks', 'notes'];
const PIECE = 900000;      // igual a FirestoreImages em index.html
const MESA_PIECE = 60000;  // igual a MesaSync em index.html
const TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' };

function fail(msg) { console.error(msg); process.exit(1); }

function find(name) {
  for (const d of LOOK_IN) { const p = path.join(d, name); if (existsSync(p)) return p; }
  return null;
}

async function findImage(ref) {
  for (const d of LOOK_IN) {
    if (!existsSync(d)) continue;
    const f = (await readdir(d)).find((x) => path.parse(x).name === ref && TYPES[path.extname(x).toLowerCase()]);
    if (f) return path.join(d, f);
  }
  return null;
}

async function readJson(name) {
  const p = find(name);
  return p ? JSON.parse(await readFile(p, 'utf8')) : null;
}

// ---------- configuração e login ----------
const cfgFile = path.join(ROOT, 'firebase-config.js');
const sandbox = { window: {} };
vm.runInNewContext(await readFile(cfgFile, 'utf8'), sandbox);
const cfg = sandbox.window.HOUNDS_FIREBASE;
if (!cfg || !cfg.apiKey || !cfg.projectId || !cfg.campaignEmail) fail('Preencha firebase-config.js primeiro, inclusive campaignEmail (veja FIREBASE.md).');

const { campaignEmail, ...options } = cfg;
const app = initializeApp(options);
const auth = getAuth(app);
const db = getFirestore(app);
if (flag('--emulador')) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

let password = process.env.HOUNDS_SENHA;
if (!password) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  password = await rl.question(`Senha da campanha (${campaignEmail}): `);
  rl.close();
}
try {
  await signInWithEmailAndPassword(auth, campaignEmail, password);
} catch (e) {
  fail(`Não foi possível entrar: ${e.code || e.message}`);
}

// ---------- não sobrescrever sem querer ----------
if (!flag('--sobrescrever')) {
  const hasUsers = !(await getDocs(query(collection(db, 'users'), limit(1)))).empty;
  const hasMesa = (await getDoc(doc(db, 'mesa', 'state'))).exists();
  if (hasUsers || hasMesa) fail('O banco já tem dados. Rode de novo com --sobrescrever para importar por cima.');
}

// ---------- documentos ----------
const docs = {};
for (const col of COLLECTIONS) {
  const data = await readJson(col + '.json');
  if (!data) { console.log(`- ${col}.json não encontrado, pulando`); continue; }
  docs[col] = data;
  for (const [id, body] of Object.entries(data)) await setDoc(doc(db, col, id), body);
  console.log(`✓ ${col}: ${Object.keys(data).length}`);
}

// ---------- imagens (em pedaços, como o site grava) ----------
const refs = new Set();
for (const col of ['maps', 'locations', 'characters']) {
  for (const d of Object.values(docs[col] || {})) if (d.image && d.image.ref) refs.add(d.image.ref);
}
let sent = 0;
for (const ref of refs) {
  const file = await findImage(ref);
  if (!file) { console.log(`! imagem ${ref} não encontrada`); continue; }
  const bytes = new Uint8Array(await readFile(file));
  const n = Math.max(1, Math.ceil(bytes.length / PIECE));
  for (let i = 0; i < n; i++) {
    await setDoc(doc(db, 'image_chunks', `${ref}_${i}`), { ref, i, data: Bytes.fromUint8Array(bytes.slice(i * PIECE, (i + 1) * PIECE)) });
  }
  await setDoc(doc(db, 'images', ref), { n, type: TYPES[path.extname(file).toLowerCase()], size: bytes.length, createdAt: Date.now() });
  sent++;
}
console.log(`✓ imagens: ${sent} de ${refs.size}`);

// ---------- Mesa de Combate (mesmo formato do MesaSync) ----------
const mesa = await readJson('mesa-de-combate.json');
if (mesa) {
  const st = { combats: mesa.combats, conditions: mesa.conditions, players: mesa.players, activeCombatId: mesa.activeCombatId || null };
  const json = JSON.stringify(st), t = Date.now(), rev = `import-${t}`;
  const parts = [];
  for (let i = 0; i < json.length; i += MESA_PIECE) parts.push(json.slice(i, i + MESA_PIECE));
  const old = await getDoc(doc(db, 'mesa', 'state'));
  for (let i = 0; i < parts.length; i++) await setDoc(doc(db, 'mesa_chunks', `${rev}_${i}`), { rev, i, part: parts[i], createdAt: t });
  await setDoc(doc(db, 'mesa', 'state'), { rev, n: parts.length, by: null, createdAt: t, updatedAt: t });
  if (old.exists()) {
    for (const o of (await getDocs(query(collection(db, 'mesa_chunks'), where('rev', '==', old.data().rev)))).docs) await deleteDoc(o.ref);
  }
  console.log(`✓ mesa de combate: ${(st.combats || []).length} combates`);
} else {
  console.log('- mesa-de-combate.json não encontrado, pulando');
}

console.log('Pronto.');
process.exit(0);
