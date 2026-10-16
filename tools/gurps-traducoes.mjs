// Confere dados/traducoes.json, os nomes em português dos catálogos de GURPS que a busca do site usa
// (veja js/busca-catalogos.js): lista os nomes dos catálogos que ainda não têm tradução e as
// traduções de nomes que não estão mais em nenhum catálogo.
//
//   node tools/gurps-traducoes.mjs            só lista
//   node tools/gurps-traducoes.mjs --limpar   também tira do arquivo as traduções que sobraram
//
// O arquivo é um objeto { "nome no livro": "nome em português" }; sinônimos que o jogador também
// pode digitar vão depois de "|" ("Lightning": "Relâmpago|Raio"), e o site mostra o primeiro.
// Depois de mudar o arquivo, aumente CATALOG_VERSION em js/mundo.js (o site o baixa com ?v=).

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CATALOGOS = ['magias', 'vantagens', 'desvantagens', 'pericias', 'tecnicas', 'estilos', 'armas', 'armaduras', 'itens', 'melhoramentos'];
const arquivo = path.join(ROOT, 'dados', 'traducoes.json');
const traducoes = JSON.parse(readFileSync(arquivo, 'utf8'));

const nomes = new Map(); // nome → catálogos onde aparece
for (const c of CATALOGOS) {
  for (const x of JSON.parse(readFileSync(path.join(ROOT, 'dados', c + '.json'), 'utf8'))) {
    if (!nomes.has(x.name)) nomes.set(x.name, new Set());
    nomes.get(x.name).add(c);
  }
}
const faltam = [...nomes.keys()].filter((n) => !traducoes[n]);
const sobram = Object.keys(traducoes).filter((n) => !nomes.has(n));

console.log(`${nomes.size} nomes nos catálogos, ${Object.keys(traducoes).length} traduções.`);
if (faltam.length) {
  console.log(`\nSem tradução (${faltam.length}):`);
  faltam.forEach((n) => console.log(`  ${n}  [${[...nomes.get(n)].join(', ')}]`));
}
if (sobram.length) {
  console.log(`\nTraduções de nomes que não estão em nenhum catálogo (${sobram.length}):`);
  sobram.forEach((n) => console.log(`  ${n}`));
}
if (process.argv.includes('--limpar') && sobram.length) {
  sobram.forEach((n) => { delete traducoes[n]; });
  writeFileSync(arquivo, formatar(traducoes), 'utf8');
  console.log(`\n${sobram.length} traduções tiradas de dados/traducoes.json.`);
}
if (!faltam.length && !sobram.length) console.log('Tudo traduzido.');

// Uma tradução por linha, em ordem alfabética: fácil de revisar e de comparar no git.
function formatar(obj) {
  const chaves = Object.keys(obj).sort((a, b) => a.localeCompare(b, 'en'));
  return '{\n' + chaves.map((k) => `${JSON.stringify(k)}: ${JSON.stringify(obj[k])}`).join(',\n') + '\n}\n';
}
