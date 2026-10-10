// Acusa nomes globais declarados mais de uma vez nos scripts de js/.
// Os arquivos de js/ compartilham o escopo global: um segundo `function x` ou `var x`
// substitui o primeiro sem aviso, e a checagem de tipos não acusa isso em arquivos .js.
//
// Uso: node tools/checar-globais.mjs   (sai com código 1 se achar repetidos)
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function jsFiles(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await jsFiles(p));
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

// Declarações de nível superior começam na coluna 0: `function nome(`, `var a = ..., b = ...`.
function topLevelNames(src) {
  const names = [];
  src.split(/\r?\n/).forEach((line, i) => {
    let m = /^function\s+([\w$]+)/.exec(line);
    if (m) { names.push([m[1], i + 1]); return; }
    m = /^(?:var|let|const)\s+(.*)/.exec(line);
    if (!m) return;
    // Primeiro nome e os seguintes no formato ", nome =" fora de chaves, colchetes e parênteses.
    let depth = 0, str = null, rest = m[1];
    const first = /^([\w$]+)/.exec(rest);
    if (first) names.push([first[1], i + 1]);
    for (let k = 0; k < rest.length; k++) {
      const c = rest[k];
      if (str) { if (c === '\\') k++; else if (c === str) str = null; continue; }
      if (c === '"' || c === "'" || c === '`') str = c;
      else if ('{[('.includes(c)) depth++;
      else if ('}])'.includes(c)) depth--;
      else if (c === ',' && depth === 0) {
        const n = /^\s*([\w$]+)\s*(=|,|;|$)/.exec(rest.slice(k + 1));
        if (n) names.push([n[1], i + 1]);
      }
    }
  });
  return names;
}

const seen = new Map();
for (const file of (await jsFiles(path.join(ROOT, 'js'))).sort()) {
  const src = await readFile(file, 'utf8');
  // Arquivos inteiros dentro de uma função (function () { ... })() não criam globais.
  if (/^\(function\s*\(/m.test(src) && !/^(function|var|let|const)\s/m.test(src)) continue;
  for (const [name, line] of topLevelNames(src)) {
    const where = path.relative(ROOT, file).replace(/\\/g, '/') + ':' + line;
    if (!seen.has(name)) seen.set(name, []);
    seen.get(name).push(where);
  }
}

const dups = [...seen].filter(([, w]) => w.length > 1);
if (dups.length) {
  console.error('Nomes globais declarados mais de uma vez:');
  for (const [name, w] of dups) console.error('  ' + name + ': ' + w.join(', '));
  process.exit(1);
}
console.log('OK: ' + seen.size + ' nomes globais, nenhum repetido.');
