/* =====================================================================
   Hounds — Ficha › contas (de onde vem cada valor)
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* Every value the sheet calculates (the NH of skills, spells and combat items, the attributes, the
   derived values, the NH with a weapon or shield) is a button that opens how it was reached, in the
   modal Danos and Defesas use (dmStepsHtml, .dm-why-modal). The button keeps its explanation in
   CALC_VIEW, emptied each time the sheet's page is drawn (renderSheetPage):
     { title, sub, big, bonus, rule, steps: [[what, value]], notes: [text], roll: the number to roll
       (null: none), hint }
   NH shows the level first in weight (nhHtml): the number to roll stands out, the "IQ+1" goes small. */
var CALC_VIEW = /** @type {any[]} */ ([]);
// html: what the button shows; title: the hover text (the bonuses, already shown elsewhere).
function calcBtn(html, e, title, cls) {
  var i = CALC_VIEW.push(e) - 1;
  return '<button class="dm-why calc-why' + (cls ? ' ' + cls : '') + '" type="button" data-calc="' + i + '" title="' + esc((title ? title + ' · ' : '') + 'clique para ver a conta') + '">' + html + '</button>';
}
// "(IQ+1) 15": the relative level small and light, in parentheses; the level bold. A level that is not
// a number ("sem pontos") stays small, alone.
function nhHtml(nh) {
  var num = /^-?\d+$/.test(String(nh.lvl)), rel = nh.rel && nh.rel !== '—' ? '<span class="nh-rel">(' + esc(nh.rel) + ')</span> ' : '';
  return rel + '<span class="nh-lvl' + (num ? '' : ' none') + '">' + esc(nh.lvl) + '</span>';
}
function calcSign(n) { return (n < 0 ? '− ' : '+ ') + Math.abs(n); }
function calcModal(e) {
  showModal('<div class="skill-modal dm-why-modal"><div class="skill-modal-head"><h2 id="calcTitle">' + esc(e.title) + '</h2>' + (e.sub ? '<p class="lede">' + esc(e.sub) + '</p>' : '') + '</div>' +
    '<section class="dm-why-sec"><h3 class="sec-title">' + esc(e.what || 'Valor') + '</h3><div class="dm-why-big' + (e.bonus ? ' bonus' : '') + '">' + esc(e.big) + '</div>' +
    (e.rule ? '<p class="hint-text">' + esc(e.rule) + '</p>' : '') + dmStepsHtml(e.steps) +
    (e.notes && e.notes.length ? '<ul class="dm-fx">' + e.notes.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '') +
    (e.hint ? '<p class="hint-text">' + esc(e.hint) + '</p>' : '') +
    (e.roll != null ? '<p class="hint-text">Para ter sucesso, role 3 dados e tire ' + e.roll + ' ou menos (3 ou 4 sempre dão certo; 17 ou 18 sempre falham).</p>' : '') + '</section></div>');
  modal.setAttribute('aria-labelledby', 'calcTitle');
}
document.addEventListener('click', function (e) {
  var t = /** @type {AnyEl} */ (e.target), b = t && t.closest && t.closest('[data-calc]'); if (!b) return;
  var x = CALC_VIEW[+b.getAttribute('data-calc')]; if (x) calcModal(x);
});

/* ---------- NH ---------- */
var CALC_ATTR = { ST: 'ST', DX: 'DX', IQ: 'IQ', HT: 'HT', Per: 'Percepção', Will: 'Vontade' };
// The bonuses of a skill or spell: the typed one and the advantages' (k.tsrc, see applyTalents and applyMagery).
function calcBonusSteps(k, steps) {
  if (k.bonus) steps.push(['Bônus' + (k.bonusNote ? ': ' + k.bonusNote : ''), calcSign(k.bonus)]);
  (k.tsrc || []).forEach(function (x) { steps.push([x.from, calcSign(x.n)]); });
}
// What the points buy at a difficulty: "Com 1 ponto, DX−1; 2 pontos, DX+0; 4 pontos, DX+1; depois, +1 a cada 4 pontos."
function calcPtsHint(attr, d) {
  function at(n) { return attr + (n > 0 ? '+' + n : n < 0 ? '−' + -n : '+0'); }
  return 'Na dificuldade ' + d[0] + ': com 1 ponto, ' + at(d[1]) + '; 2 pontos, ' + at(d[1] + 1) + '; 4 pontos, ' + at(d[1] + 2) + '; depois, +1 a cada 4 pontos (B170).';
}
// A skill of Perícias or Combate (k: { name, attr, diff, pts, bonus, tsrc }).
function skillCalc(k, av) {
  var d = SKILL_DIFFS[k.diff], nh = skillNh(k, av), num = /^-?\d+$/.test(nh.lvl), w = skillWaste(k);
  var steps = [[CALC_ATTR[k.attr] + ', o atributo da perícia', String(av[k.attr])]];
  if (k.pts > 0) steps.push([d[0] + ' com ' + plural(k.pts, 'ponto', 'pontos') + (w ? ' (' + w + ' sem efeito: o nível é o de ' + (k.pts - w) + ')' : ''), calcSign(d[1] + skillStep(k.pts))]);
  else steps.push([d[2] == null ? 'Sem pontos: perícia ' + d[0].toLowerCase() + ' não tem nível padrão' : 'Sem pontos: o nível padrão de perícia ' + d[0].toLowerCase(), d[2] == null ? '—' : calcSign(d[2])]);
  if (num) { calcBonusSteps(k, steps); steps.push(['NH', nh.lvl]); }
  return { title: k.name, sub: 'Perícia ' + k.attr + '/' + k.diff + ' · ' + plural(k.pts, 'ponto', 'pontos'), what: 'NH', big: num ? nh.lvl : nh.lvl, bonus: !!(k.bonus || k.tbonus),
    rule: 'NH = atributo + o nível que os pontos compram na dificuldade + bônus.', steps: steps, notes: k.tcond || [], hint: calcPtsHint(k.attr, d), roll: num ? +nh.lvl : null };
}
// A spell (IQ, Hard or Very Hard, no default; Magery and the advantages in k.tsrc).
function spellCalc(k, iq) {
  var d = SKILL_DIFFS[k.diff], nh = sheetSpellNh(k, iq), num = /^-?\d+$/.test(nh.lvl), w = skillWaste(k);
  var steps = [['IQ, o atributo das magias', String(iq)]];
  if (k.pts > 0) { steps.push([d[0] + ' com ' + plural(k.pts, 'ponto', 'pontos') + (w ? ' (' + w + ' sem efeito)' : ''), calcSign(d[1] + skillStep(k.pts))]); calcBonusSteps(k, steps); steps.push(['NH', nh.lvl]); }
  else steps.push(['Sem pontos: magia não tem nível padrão', '—']);
  return { title: k.name, sub: 'Magia IQ/' + k.diff + (k.college ? ' · ' + collegeLabel(k.college) : '') + ' · ' + plural(k.pts, 'ponto', 'pontos'), what: 'NH', big: nh.lvl, bonus: !!(k.bonus || k.tbonus),
    rule: 'NH da magia = IQ + o nível que os pontos compram + Magery + bônus (B235).', steps: steps, notes: k.tcond || [], hint: calcPtsHint('IQ', d), roll: num ? +nh.lvl : null };
}
// A combat item: a skill as in Perícias; a technique from its base skill (see combatNh).
function combatCalc(x, pool, av) {
  if (x.kind === 'skill') return skillCalc(x, av);
  if (x.kind === 'spell') { combatNh(x, pool, av); return spellCalc(x, av.IQ); }
  var nh = combatNh(x, pool, av), b = scFindSkill(pool, x.base), steps = [];
  var title = { title: x.name, sub: 'Técnica de ' + (x.base || '?') + ' · ' + (x.diff === 'A' ? 'Média' : 'Difícil') + ' · ' + plural(x.pts, 'ponto', 'pontos'), what: 'NH' };
  if (!nh || nh.abs == null) return Object.assign(title, { big: nh ? nh.lvl : '—', steps: [[nh ? 'Sem NH: ' + nh.lvl : 'Sem NH', '']], roll: null });
  var babs = av[b.attr] + skillRel(b), lv = techLevels(x), cap = x.max != null && x.def + lv > x.max ? x.max - x.def : lv;
  steps.push([b.name + ', a perícia-base', String(babs)]);
  var ta = taParse(x.name);
  steps.push([ta ? 'Padrão do Targeted Attack (' + ta.why + ')' : 'Padrão da técnica', calcSign(x.def)]);
  if (x.pts) steps.push([plural(cap, 'nível comprado', 'níveis comprados') + ' com ' + plural(x.pts, 'ponto', 'pontos') + (cap < lv ? ' (o máximo para em ' + (x.max > 0 ? '+' : '') + x.max + ')' : ''), calcSign(cap)]);
  if (x.bonus) steps.push(['Bônus' + (x.bonusNote ? ': ' + x.bonusNote : ''), calcSign(x.bonus)]);
  steps.push(['NH', nh.lvl]);
  return Object.assign(title, { big: nh.lvl, bonus: !!x.bonus, steps: steps, roll: nh.abs,
    rule: 'NH da técnica = NH da perícia-base + o padrão da técnica + os níveis comprados' + (x.max != null ? ', até o máximo' : '') + '.',
    hint: (ta ? 'Targeted Attack (Martial Arts, p. 68): o padrão é a perícia com a penalidade para acertar o alvo; a técnica compra até metade dela, arredondando para cima (até ' +
      b.name + (ta.max < 0 ? '−' + -ta.max : '') + '). ' : '') +
      (x.diff === 'A' ? 'Técnica Média: cada ponto compra um nível.' : 'Técnica Difícil: o primeiro nível custa 2 pontos, os outros 1 cada (1 ponto sozinho não compra nada).') });
}
// An NH with a weapon or shield (weaponNh: { v, title }): its terms, as in Danos.
function weaponNhCalc(name, skill, nh) {
  return { title: name, sub: skill ? 'Com ' + skill : '', what: 'NH', big: String(nh.v), steps: dmNhTerms(nh.title).concat([['NH', String(nh.v)]]), roll: nh.v,
    rule: 'O NH da perícia do ataque na ficha, ou o melhor padrão do livro, o que for maior, mais os ajustes da arma.' };
}

/* ---------- attributes and derived values ---------- */
// The row k of Atributos (a: the base, r its stats; e and re with the advantages' effects).
function attrCalc(k, label, a, r, e, re) {
  var own = e.fx && e.fx.b[k], steps = [], rule = '', fmt = function (v) { return k === 'speed' ? fmtDec(v, 2) : String(v); };
  function fx() { (own ? own.used : []).forEach(function (m) { steps.push([m.from, calcSign(m.v)]); }); }
  if (/^(st|dx|iq|ht)$/.test(k)) {
    steps.push([label + ' comprado', String(a[k])]); fx();
    rule = label + ' começa em 10; cada nível acima custa ' + (k === 'st' || k === 'ht' ? 10 : 20) + ' pontos.';
  } else if (k === 'per' || k === 'will') {
    steps.push(['Base', String(a[k + 'Base'])]); if (a[k]) steps.push([plural(Math.abs(a[k]), 'nível', 'níveis') + (a[k] > 0 ? ' comprados' : ' vendidos'), calcSign(a[k])]); fx();
    rule = label + ' = base + os níveis comprados; cada nível custa 5 pontos.';
  } else if (k === 'hp' || k === 'fp') {
    var from = k === 'hp' ? 'st' : 'ht';
    steps.push([(k === 'hp' ? 'ST' : 'HT') + (e[from] !== a[from] ? ' (com as vantagens)' : ''), String(e[from])]);
    if (a[k]) steps.push([plural(Math.abs(a[k]), 'nível', 'níveis') + (a[k] > 0 ? ' comprados' : ' vendidos'), calcSign(a[k])]); fx();
    rule = label + ' = ' + (k === 'hp' ? 'ST' : 'HT') + ' + os níveis comprados; cada nível custa ' + (k === 'hp' ? 2 : 3) + ' pontos.';
  } else if (k === 'speed') {
    steps.push(['(HT ' + e.ht + ' + DX ' + e.dx + ') ÷ 4', fmtDec((e.ht + e.dx) / 4, 2)]);
    if (a.speed) steps.push(['Níveis comprados', (a.speed < 0 ? '− ' : '+ ') + fmtDec(Math.abs(a.speed), 2)]);
    (own ? own.used : []).forEach(function (m) { steps.push([m.from, (m.v < 0 ? '− ' : '+ ') + fmtDec(Math.abs(m.v), 2)]); });
    rule = 'Velocidade Básica = (HT + DX) ÷ 4; cada 0,25 comprado custa 5 pontos.';
  } else if (k === 'move') {
    steps.push(['Velocidade Básica ' + fmtDec(re.speed, 2) + ', sem a fração', String(Math.floor(re.speed))]);
    if (a.move) steps.push([plural(Math.abs(a.move), 'nível', 'níveis') + (a.move > 0 ? ' comprados' : ' vendidos'), calcSign(a.move)]); fx();
    if (e.enc) steps.push(['Peso (nível de carga ' + e.enc + ')', calcSign(-e.enc)]);
    rule = 'Deslocamento = Velocidade Básica sem a fração + os níveis comprados − o nível de carga.';
  } else return null;
  var v = k === 'move' ? re.moveNow : attrValue(k, e, re);
  steps.push([label, fmt(v)]);
  return { title: label, sub: 'Atributo da ficha', big: fmt(v), bonus: !!(own && own.n), rule: rule, steps: steps, notes: fxCondNotes(own), roll: null };
}
function derivedCalc(kind, a, r) {
  if (kind === 'dodge') return { title: 'Esquiva', big: String(r.dodge), rule: 'Esquiva = Velocidade Básica sem a fração + 3 − o nível de carga (B374).',
    steps: [['Velocidade Básica ' + fmtDec(r.speed, 2) + ', sem a fração', String(Math.floor(r.speed))], ['Base de toda defesa ativa', '+ 3']].concat(a.enc ? [['Peso (nível de carga ' + a.enc + ')', calcSign(-a.enc)]] : []).concat([['Esquiva', String(r.dodge)]]),
    hint: 'Combat Reflexes, Enhanced Dodge e os bônus de Defesas entram na Esquiva de Combate › Defesas.', roll: r.dodge };
  if (kind === 'move') return attrCalc('move', 'Deslocamento', a.fx ? a.fx.base : a, gurpsStats(a.fx ? a.fx.base : a), a, r);
  if (kind === 'lift') {
    var st = a.st + (a.liftSt || 0), bl = st * st / 5;
    return { title: 'Carga Básica', big: String(r.lift).replace('.', ',') + ' lbs', rule: 'Carga Básica = (ST × ST) ÷ 5, em libras; de 10 para cima, arredondada (B15).',
      steps: [['ST' + (a.liftSt ? ' ' + a.st + ' + ' + a.liftSt + ' de Lifting ST' : ''), String(st)], ['ST × ST ÷ 5', fmtDec(bl, bl % 1 ? 1 : 0).replace(/,0$/, '')], ['Carga Básica', String(r.lift).replace('.', ',') + ' lbs']],
      hint: 'Os níveis de carga são múltiplos dela: até 1× Nenhuma, 2× Leve, 3× Média, 6× Pesada, 10× Muito Pesada.', roll: null };
  }
  return { title: 'Dano', big: r.dmg.thr + ' / ' + r.dmg.sw, rule: 'O dano de golpe com as mãos ou com uma arma sai da ST, pela tabela do Basic Set (B16).',
    steps: [['ST', String(a.st)], ['Estocada (thr)', r.dmg.thr], ['Balanço (sw)', r.dmg.sw]], hint: 'Cada arma soma o dela: "sw+1 cut" com balanço ' + r.dmg.sw + ' é ' + dmgAdd(r.dmg.sw, 1) + ' de corte. A conta de cada arma está em Danos.', roll: null };
}
