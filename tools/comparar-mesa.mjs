// Compara o mesa.html que está no ar com o dist/mesa.html gerado pelo src/ (npm run build:mesa),
// pelo que sobrevive à minificação: textos do JS, classes do CSS e integrações com o hub.
// Serve para montar e conferir a lista de docs/diferencas-mesa.md; nomes de variáveis não
// entram, porque o minificador os encurta de um jeito diferente em cada build.
//
// Uso: npm run build:mesa && node tools/comparar-mesa.mjs [--json saida.json]
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseAst } from 'rolldown/parseAst';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Só nomes lidos como propriedade (window.parent.x, window.x) sobrevivem à minificação do build;
// funções internas como hubConfirm são renomeadas e não dá para contá-las aqui.
const HUB_NAMES = ['hubUser', 'hubMesaBus', 'hubMesaFlush', 'hubOnlineUsers', 'DiceRoller3D', 'audioStreamSync'];

const inlineScripts = html =>
  [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(s => s.length > 10000);
const styles = html => [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');

function strings(js) {
  const found = [];
  const walk = n => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) return n.forEach(walk);
    if (n.type === 'Literal' && typeof n.value === 'string') found.push(n.value);
    if (n.type === 'TemplateLiteral') for (const q of n.quasis) found.push(q.value.cooked ?? q.value.raw);
    for (const k in n) if (k !== 'start' && k !== 'end') walk(n[k]);
  };
  walk(parseAst(js));
  return found.map(s => s.replace(/\s+/g, ' ').trim()).filter(s => s.length >= 3);
}

// Texto de tela: tem palavras e não é só uma lista de classes do Tailwind nem um identificador.
const isText = s => /[A-Za-zÀ-ÿ]{3,} [A-Za-zÀ-ÿ]{2,}/.test(s) && !/^[a-z0-9:_\-\[\]\/.%#!]+(?: [a-z0-9:_\-\[\]\/.%#!]+)*$/.test(s);
const cssClasses = css =>
  new Set([...css.matchAll(/\.((?:\\.|[A-Za-z0-9_-])+)/g)].map(m => m[1].replace(/\\(.)/g, '$1')).filter(n => !/^\d/.test(n)));
const count = (js, name) => (js.match(new RegExp(`\\b${name}\\b`, 'g')) || []).length;

async function srcText(dir) {
  const parts = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) parts.push(await srcText(p));
    else if (/\.(tsx?|css|html)$/.test(e.name)) parts.push((await readFile(p, 'utf8')).replace(/\s+/g, ' '));
  }
  return parts.join('\n');
}

const live = await readFile(path.join(ROOT, 'mesa.html'), 'utf8');
const built = await readFile(path.join(ROOT, 'dist', 'mesa.html'), 'utf8');
const src = await srcText(path.join(ROOT, 'src'));
const jsLive = inlineScripts(live).join('\n');
const jsBuilt = inlineScripts(built).join('\n');
const textsLive = new Set(strings(jsLive).filter(isText));
const textsBuilt = new Set(strings(jsBuilt).filter(isText));
const cssLive = cssClasses(styles(live));
const cssBuilt = cssClasses(styles(built));
const onlyLive = [...textsLive].filter(s => !textsBuilt.has(s)).sort();

const report = {
  textosSoNoAr: {
    // não aparecem em nenhum arquivo do src/: funcionalidade ou texto que falta
    faltamNoSrc: onlyLive.filter(s => !src.includes(s)),
    // aparecem no src/ mas não no build: código que nada usa, ou texto montado de outro jeito
    existemNoSrc: onlyLive.filter(s => src.includes(s)),
  },
  textosSoNoGerado: [...textsBuilt].filter(s => !textsLive.has(s) && src.includes(s)).sort(),
  classesCssSoNoAr: [...cssLive].filter(c => !cssBuilt.has(c)).sort(),
  classesCssSoNoGerado: [...cssBuilt].filter(c => !cssLive.has(c)).sort(),
  hub: Object.fromEntries(HUB_NAMES.map(n => [n, { noAr: count(jsLive, n), gerado: count(jsBuilt, n) }])),
};

console.log(`Textos só no ar: ${report.textosSoNoAr.faltamNoSrc.length} faltam no src/, ${report.textosSoNoAr.existemNoSrc.length} existem no src/ mas não entram no build`);
console.log(`Textos só no gerado (vindos do src/): ${report.textosSoNoGerado.length}`);
console.log(`Classes CSS só no ar: ${report.classesCssSoNoAr.length} | só no gerado: ${report.classesCssSoNoGerado.length}`);
for (const [n, c] of Object.entries(report.hub)) if (c.noAr !== c.gerado) console.log(`  ${n}: ${c.noAr} no ar, ${c.gerado} no gerado`);

const i = process.argv.indexOf('--json');
if (i > 0 && process.argv[i + 1]) {
  await writeFile(process.argv[i + 1], JSON.stringify(report, null, 2));
  console.log(`Detalhes em ${process.argv[i + 1]}`);
}
