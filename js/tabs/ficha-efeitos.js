/* =====================================================================
   Hounds — Efeitos das vantagens na ficha
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   An entry of Regras › Vantagens (from the books or the Mestre's) may have
   effects: advantage.effects = [{ target, key, names, op, value, perLevel,
   max, stacks, cond, note }], set by the Mestre in its form.
     target   what it changes (ADV_FX_TARGETS): an attribute, an active
              defense, the NH of skills (by name, by attribute, all) or of
              spells (by name, by school, all)
     key      the attribute (ADV_FX_ATTRS), the defense (ADV_FX_DEFS) or the
              skills' attribute (SKILL_ATTRS); '' for the others
     names    the skills, spells or schools, by their name in the sheet; a
              name ending in * takes every name starting with it ("Guns*"),
              and a skill without its specialty takes all of them ("Guns"
              covers "Guns (Pistol)")
     op       'add' or 'sub'; value 0-99
     perLevel the value is for each level of the advantage on the sheet
     max      the most the effect gives (null: no limit), after the levels
     stacks   false: of the effects that don't stack on the same field, only
              the largest counts (the ones that stack always add up)
     cond     when it applies ("ao resistir a venenos"): an effect with a
              condition is shown beside the field and never added to it
     note     what it is, for the Mestre and the players
   Nothing is saved on the sheet: the sheet's advantages (Vantagens, and the
   traits of Combate) are read on every drawing, each name once, and their
   effects are added on top of the base values (withAdvFx for the
   attributes, applyTalents for the skills, applyMagery for the spells,
   combatDefenses for the defenses). Removing or changing an advantage, or
   its effects, changes the sheet the next time it is drawn; the base values
   are never touched, so nothing adds up twice.
   Combat Reflexes, Enhanced Defenses, Magery and the talents are applied by
   the sheet itself (see ficha-vantagens.js, ficha-combate.js and
   ficha-magias.js): their effects here are left out, so they don't count twice.
   ===================================================================== */
var ADV_FX_TARGETS = [['attr', 'Atributo'], ['def', 'Defesa ativa'], ['skill', 'Perícias pelo nome'], ['skillAttr', 'Perícias de um atributo'],
  ['skillAll', 'Todas as perícias'], ['spell', 'Magias pelo nome'], ['college', 'Magias de uma escola'], ['spellAll', 'Todas as magias']];
// liftSt: ST only for Basic Lift (Lifting ST, B65): carrying, lifting, pushing and pulling.
var ADV_FX_ATTRS = [['st', 'ST'], ['dx', 'DX'], ['iq', 'IQ'], ['ht', 'HT'], ['per', 'Percepção'], ['will', 'Vontade'],
  ['hp', 'HP'], ['fp', 'Fadiga'], ['speed', 'Velocidade Básica'], ['move', 'Deslocamento'], ['liftSt', 'ST para a Carga Básica']];
var ADV_FX_DEFS = [['dodge', 'Esquiva'], ['parry', 'Aparar'], ['block', 'Bloqueio'], ['all', 'Todas as defesas ativas']];
// The targets that take names, and the list each key comes from.
var ADV_FX_NAMED = { skill: 1, spell: 1, college: 1 };
function advFxKeys(target) { return target === 'attr' ? ADV_FX_ATTRS : target === 'def' ? ADV_FX_DEFS : target === 'skillAttr' ? SKILL_ATTRS.map(function (k) { return [k, k]; }) : []; }
function fxLabelOf(list, k) { var r = list.filter(function (x) { return x[0] === k; })[0]; return r ? r[1] : k; }

function cleanAdvEffect(e) {
  e = e || {};
  var target = ADV_FX_TARGETS.some(function (t) { return t[0] === e.target; }) ? e.target : 'attr', keys = advFxKeys(target);
  var seen = {}, names = ADV_FX_NAMED[target] ? (Array.isArray(e.names) ? e.names : String(e.names || '').split(/[,;]/))
    .map(function (n) { return String(n || '').trim().slice(0, 100); })
    .filter(function (n) { var k = norm(n); if (!n || seen[k]) return false; seen[k] = true; return true; }).slice(0, 30) : [];
  var out = { target: target, key: keys.length ? (keys.some(function (k) { return k[0] === e.key; }) ? e.key : keys[0][0]) : '', names: names,
    op: e.op === 'sub' ? 'sub' : 'add', value: cleanInt(e.value, 0, 99, 1), perLevel: !!e.perLevel,
    max: e.max === '' || e.max == null ? null : cleanInt(e.max, 0, 99, 0), stacks: e.stacks !== false,
    cond: String(e.cond || '').trim().slice(0, 200), note: String(e.note || '').trim().slice(0, 300) };
  return out;
}
// An effect by names needs at least one.
function advEffectOk(e) { return !ADV_FX_NAMED[e.target] || e.names.length > 0; }
function advEffects(c) { return (Array.isArray(c && c.effects) ? c.effects : []).map(cleanAdvEffect).filter(advEffectOk); }

// "+1 por nível (máx. +3) em ST · não acumula · só quando: ..."
function advEffectText(e) {
  var sign = e.op === 'sub' ? '−' : '+', what;
  if (e.target === 'attr') what = fxLabelOf(ADV_FX_ATTRS, e.key);
  else if (e.target === 'def') what = fxLabelOf(ADV_FX_DEFS, e.key);
  else if (e.target === 'skill' || e.target === 'spell') what = 'NH de ' + joinE(e.names);
  else if (e.target === 'skillAttr') what = 'NH das perícias de ' + e.key;
  else if (e.target === 'skillAll') what = 'NH de todas as perícias';
  else if (e.target === 'college') what = 'NH das magias de ' + joinE(e.names.map(collegeLabel));
  else what = 'NH de todas as magias';
  return sign + e.value + (e.perLevel ? ' por nível' : '') + (e.max != null ? ' (máx. ' + sign + e.max + ')' : '') + ' em ' + what +
    (e.stacks ? '' : ' · não acumula') + (e.cond ? ' · só quando: ' + e.cond : '');
}
// The advantages the sheet applies by itself (see the note above).
var ADV_FX_BUILTIN_RE = /^(Combat Reflexes|Enhanced Time Sense|Enhanced (Block|Parry|Dodge|Defenses)|Magery|Talent)\b/i;

/* ---------- the book's rules ----------
   An entry the Mestre gave no effects still counts on the sheet when the book says what it adds to
   a field the sheet has: ADV_BOOK, by the entry's name, gives its effects for the row (r: { spec,
   the text in parentheses; pts, the points before modifiers }), read from the entry's text in Regras
   › Vantagens. What depends on the moment ("to resist poison", "when motionless") is a condition:
   shown beside the field, never added. The Mestre's effects, when there are any, take their place.
   Striking ST, Weapon Master, Claws, Teeth and the Strikers count in Danos (ficha-danos.js). */
// A negative value takes from the field (the disadvantages' penalties).
function bookFx(o) { if (o.value < 0) { o.op = 'sub'; o.value = -o.value; } return o; }
function bookSkills(names, value, o) { return bookFx(Object.assign({ target: 'skill', names: names, value: value }, o)); }
function bookAttr(key, value, cond, o) { return bookFx(Object.assign({ target: 'attr', key: key, value: value, cond: cond }, o)); }
function bookAll(value, cond, o) { return bookFx(Object.assign({ target: 'skillAll', value: value, cond: cond }, o)); }
var ADV_HT_ROLLS = 'em testes de HT (consciência, morte, doença, veneno), não no atributo nem nas perícias';
var ADV_BOOK = {
  'acute senses': function (r) {
    var t = norm(r.name + ' ' + r.spec), sense = /vision|visao/.test(t) ? 'a visão' : /hearing|audicao/.test(t) ? 'a audição' :
      /taste|smell|paladar|olfato/.test(t) ? 'o paladar e o olfato' : /touch|tato/.test(t) ? 'o tato' : 'o sentido escolhido';
    return [bookAttr('per', 1, 'nos testes de Sentidos com ' + sense, { perLevel: true })];
  },
  'fit': function (r) { return [bookAttr('ht', r.pts >= 15 ? 2 : 1, ADV_HT_ROLLS)]; },
  'very fit': function () { return [bookAttr('ht', 2, ADV_HT_ROLLS)]; },
  'hard to kill': function () { return [bookAttr('ht', 1, 'para sobreviver abaixo de −PV e quando falhar é morte imediata', { perLevel: true })]; },
  'hard to subdue': function () { return [bookAttr('ht', 1, 'para não cair inconsciente', { perLevel: true })]; },
  'high pain threshold': function () { return [bookAttr('ht', 3, 'para não ser derrubado nem atordoado, e para resistir a tortura')]; },
  'rapid healing': function () { return [bookAttr('ht', 5, 'para recuperar PV perdidos ou se recuperar de lesão incapacitante')]; },
  'resistant': function (r) {
    var m = /\+\s*(\d+)/.exec(r.name + ' ' + r.spec);
    return [bookAttr('ht', m ? +m[1] : 3, 'para resistir a ' + (r.spec || 'o que a vantagem cobre'))];
  },
  'fearlessness': function () { return [bookAttr('will', 1, 'em Verificações de Pânico e para resistir a Intimidação e ao medo sobrenatural', { perLevel: true })]; },
  'magic resistance': function () { return [bookAttr('will', 1, 'para resistir a magias lançadas em você (o teste de resistência, seja de HT, IQ ou Vontade)', { perLevel: true })]; },
  'mind shield': function () { return [bookAttr('will', 1, 'para resistir a telepatia e às magias de Comunicação e Empatia ou de Controle da Mente', { perLevel: true })]; },
  'lifting st': function () { return [bookAttr('liftSt', 1, '', { perLevel: true })]; },
  'charisma': function () { return [bookSkills(['Fortune-Telling', 'Leadership', 'Panhandling', 'Public Speaking'], 1, { perLevel: true })]; },
  'voice': function () { return [bookSkills(['Diplomacy', 'Fast-Talk', 'Mimicry', 'Performance', 'Politics', 'Public Speaking', 'Sex Appeal', 'Singing'], 2)]; },
  'empathy': function (r) {
    var v = r.pts && r.pts < 15 ? 1 : 3;
    return [bookSkills(['Detect Lies', 'Fortune-Telling'], v), bookSkills(['Psychology'], v, { cond: 'para analisar alguém com quem conversa' })];
  },
  'sensitive': function () { return [bookSkills(['Detect Lies', 'Fortune-Telling'], 1), bookSkills(['Psychology'], 1, { cond: 'para analisar alguém com quem conversa' })]; },
  'flexibility': function (r) {
    if (r.pts >= 15) return ADV_BOOK['double-jointed']();
    return [bookSkills(['Climbing', 'Erotic Art'], 3), bookSkills(['Escape'], 3, { cond: 'para se livrar de cordas, algemas e amarras' })];
  },
  'double-jointed': function () { return [bookSkills(['Climbing', 'Erotic Art', 'Escape'], 5)]; },
  'high manual dexterity': function () {
    return [bookSkills(['Knot-Tying', 'Leatherworking', 'Lockpicking', 'Pickpocket', 'Sewing', 'Sleight of Hand'], 1, { perLevel: true, max: 4 }),
      bookSkills(['Artist', 'Jeweler', 'Surgery', 'Machinist', 'Mechanic'], 1, { perLevel: true, max: 4, cond: 'nos testes baseados em DX de trabalho delicado' })];
  },
  'perfect balance': function () {
    return [bookSkills(['Acrobatics', 'Climbing', 'Piloting'], 1), bookAttr('dx', 4, 'em combate, para não cair nem ser derrubado (+6 em superfície molhada ou instável)')];
  },
  'absolute direction': function () { return [bookSkills(['Body Sense', 'Navigation'], 3)]; },
  'brachiator': function () { return [bookSkills(['Climbing'], 2)]; },
  'slippery': function () { return [bookSkills(['Escape'], 1, { perLevel: true, max: 5 })]; },
  'discriminatory smell': function () { return [bookSkills(['Tracking'], 4), bookAttr('per', 4, 'em tudo que usa o olfato')]; },
  'discriminatory taste': function () { return [bookAttr('per', 4, 'em tudo que usa o paladar')]; },
  'sensitive touch': function () { return [bookAttr('per', 4, 'em tudo que usa o tato')]; },
  'silence': function () {
    return [bookSkills(['Stealth'], 2, { perLevel: true, cond: 'parado, no escuro ou contra quem depende da audição' }),
      bookSkills(['Stealth'], 1, { perLevel: true, cond: 'em movimento, no escuro ou contra quem depende da audição' })];
  },
  'chameleon': function () {
    return [bookSkills(['Stealth'], 2, { perLevel: true, cond: 'parado, onde ser visto importa (com roupa, +1 por nível)' }),
      bookSkills(['Stealth'], 1, { perLevel: true, cond: 'em movimento, onde ser visto importa (com roupa, nada)' })];
  },
  'daredevil': function () { return [{ target: 'skillAll', value: 1, cond: 'ao correr um risco desnecessário' }]; },
  'higher purpose': function (r) { return [{ target: 'skillAll', value: 1, cond: 'no que for direto pelo propósito' + (r.spec ? ' (' + r.spec + ')' : '') }]; },
  'single-minded': function () { return [{ target: 'skillAll', value: 3, cond: 'em tarefas mentais longas, com toda a concentração' }]; }
};
// The book's effects of an entry for a row of the sheet (x: a row of Vantagens, or a trait of Combate).
function advBookFx(c, x) {
  var rule = c && ADV_BOOK[norm(c.name).trim()]; if (!rule) return [];
  var m = /\(([^)]*)\)/.exec(x.name || ''), pts = x.cost != null ? advBaseCost(x) : x.pts || 0;
  return rule({ name: x.name || '', spec: m ? m[1].trim() : '', pts: pts }).map(cleanAdvEffect).filter(advEffectOk);
}

/* ---------- the book's rules of the disadvantages ----------
   As ADV_BOOK, for the entries of Regras › Desvantagens (by name; r.pts: the points as a positive
   number, before modifiers), read from their text: penalties are negative values. */
var BOOK_MELEE = ['Axe/Mace', 'Two-Handed Axe/Mace', 'Broadsword', 'Two-Handed Sword', 'Flail', 'Two-Handed Flail', 'Knife', 'Main-Gauche', 'Polearm', 'Rapier',
  'Saber', 'Shortsword', 'Smallsword', 'Spear', 'Staff', 'Jitte/Sai', 'Tonfa', 'Kusari', 'Whip', 'Lance'];
var BOOK_UNARMED = ['Brawling', 'Boxing', 'Judo', 'Karate', 'Wrestling', 'Sumo Wrestling'];
var BOOK_RANGED = ['Bow', 'Crossbow', 'Sling', 'Thrown Weapon', 'Throwing', 'Blowpipe', 'Spear Thrower', 'Guns', 'Beam Weapons', 'Gunner'];
var BOOK_FINE_DX = ['Knot-Tying', 'Leatherworking', 'Lockpicking', 'Pickpocket', 'Sewing', 'Sleight of Hand'];
var BOOK_FINE_OTHER = ['Artist', 'Jeweler', 'Surgery', 'Machinist', 'Mechanic'];
var BOOK_SPEECH = ['Diplomacy', 'Fast-Talk', 'Performance', 'Public Speaking', 'Sex Appeal', 'Singing'];
function bookFat(dis, swim, st) {
  return [bookSkills(['Disguise'], -dis), bookSkills(['Shadowing'], -dis, { cond: 'ao seguir alguém na multidão' }), bookSkills(['Swimming'], swim),
    bookAttr('st', st, 'para resistir a ser empurrado (knockback)')];
}
var DISADV_BOOK = {
  'overweight': function () { return bookFat(1, 1, 1); },
  'fat': function () { return bookFat(2, 3, 2); },
  'very fat': function () { return bookFat(3, 5, 3); },
  'dwarfism (-1 sm)': function () { return [bookAttr('move', -1, ''), bookSkills(['Disguise'], -2), bookSkills(['Shadowing'], -2, { cond: 'ao seguir alguém na multidão' })]; },
  'unnatural features': function () { return [bookSkills(['Disguise', 'Shadowing'], -1, { perLevel: true, max: 5 })]; },
  'hunchback': function () { return [bookSkills(['Disguise', 'Shadowing'], -3), bookAttr('dx', -1, 'com roupa e armadura comuns (as feitas sob medida, 10% mais caras, não)')]; },
  'callous': function () {
    return [bookSkills(['Teaching'], -3), bookSkills(['Psychology'], -3, { cond: 'para ajudar alguém' }),
      bookSkills(['Interrogation', 'Intimidation'], 1, { cond: 'com ameaças ou tortura' })];
  },
  'clueless': function () { return [bookSkills(['Savoir-Faire'], -4)]; },
  'colorblindness': function () { return [bookSkills(['Artist', 'Chemistry', 'Driving', 'Merchant', 'Piloting', 'Tracking'], -1)]; },
  'gullibility': function () { return [bookSkills(['Merchant'], -3)]; },
  'ham-fisted': function (r) {
    var v = r.pts >= 10 ? -6 : -3;
    return [bookSkills(['Fast-Draw'].concat(BOOK_FINE_DX), v), bookSkills(BOOK_FINE_OTHER, v, { cond: 'nos testes baseados em DX de trabalho delicado' })];
  },
  'killjoy': function () { return [bookSkills(['Carousing', 'Connoisseur', 'Erotic Art', 'Gambling'], -3)]; },
  'low empathy': function () {
    return [bookSkills(['Acting', 'Carousing', 'Criminology', 'Detect Lies', 'Diplomacy', 'Enthrallment', 'Fast-Talk', 'Interrogation', 'Leadership', 'Merchant',
      'Politics', 'Psychology', 'Savoir-Faire', 'Sex Appeal', 'Sociology', 'Streetwise'], -3)];
  },
  'shyness': function (r) {
    return [bookSkills(['Acting', 'Carousing', 'Diplomacy', 'Fast-Talk', 'Intimidation', 'Leadership', 'Merchant', 'Panhandling', 'Performance', 'Politics',
      'Public Speaking', 'Savoir-Faire', 'Sex Appeal', 'Streetwise', 'Teaching'], r.pts >= 20 ? -4 : r.pts >= 10 ? -2 : -1)];
  },
  'stuttering': function () { return [bookSkills(BOOK_SPEECH, -2)]; },
  'disturbing voice': function () { return [bookSkills(BOOK_SPEECH, -2)]; },
  'truthfulness': function () { return [bookSkills(['Fast-Talk'], -5), bookSkills(['Acting'], -5, { cond: 'para enganar' })]; },
  'noisy': function () { return [bookSkills(['Stealth'], -2, { perLevel: true })]; },
  'oblivious': function () { return [bookSkills(['Diplomacy', 'Fast-Talk', 'Intimidation', 'Savoir-Faire', 'Sex Appeal', 'Streetwise'], -1)]; },
  'bad grip': function () { return [bookSkills(['Climbing'].concat(BOOK_MELEE), -2, { perLevel: true, max: 6 })]; },
  'lame': function (r) {
    if (r.pts >= 30) return [];
    var v = r.pts >= 20 ? -6 : -3;
    return [bookSkills(BOOK_MELEE, v), bookSkills(BOOK_UNARMED.concat(['Acrobatics', 'Climbing', 'Jumping', 'Running', 'Dancing']), v)];
  },
  'blindness': function () { return [bookSkills(BOOK_MELEE, -6), bookSkills(BOOK_UNARMED.concat(BOOK_RANGED, ['Shield']), -6)]; },
  'bad sight': function () { return [bookAttr('per', -6, 'nos testes de Visão (míope: além de 1 m; hipermetrope: a até 1 m)'), bookAll(-2, 'míope, nos ataques corpo a corpo')]; },
  'one eye': function () { return [bookAttr('dx', -1, 'em combate e em tarefas de coordenação mão-olho'), bookSkills(BOOK_RANGED, -3, { cond: 'sem mirar antes' })]; },
  'hard of hearing': function () { return [bookAttr('per', -4, 'nos testes de Audição'), bookAll(-4, 'quando é importante entender alguém')]; },
  'absent-mindedness': function () {
    return [bookAttr('iq', -5, 'nos testes de IQ fora da tarefa em que está concentrado'), { target: 'skillAttr', key: 'IQ', value: 5, op: 'sub', cond: 'fora da tarefa em que está concentrado' },
      bookAttr('per', -5, 'para notar o que acontece ao redor')];
  },
  'chronic pain': function (r) {
    var v = r.pts >= 15 ? -6 : r.pts >= 10 ? -4 : -2;
    return [bookAttr('dx', v, 'durante uma crise de dor'), bookAttr('iq', v, 'durante uma crise de dor')];
  },
  'low pain threshold': function () { return [bookAttr('ht', -4, 'para resistir a ser derrubado, atordoado e a tortura')]; },
  'easy to kill': function () { return [bookAttr('ht', -1, 'para sobreviver abaixo de −PV e quando falhar é morte imediata', { perLevel: true })]; },
  'unfit': function (r) { return [bookAttr('ht', r.pts >= 15 ? -2 : -1, ADV_HT_ROLLS)]; },
  'fearfulness': function () { return [bookAttr('will', -1, 'em Verificações de Pânico e para resistir a Intimidação e ao medo sobrenatural', { perLevel: true })]; },
  'magic susceptibility': function () { return [bookAttr('will', -1, 'para resistir a magias lançadas em você (o teste de resistência, seja de HT, IQ ou Vontade)', { perLevel: true })]; },
  'combat paralysis': function () { return [bookAttr('will', -2, 'em Verificações de Pânico')]; },
  'low self-image': function () { return [bookAll(-3, 'quando acredita que as chances estão contra ou que esperam que falhe')]; },
  'supersensitive': function () {
    var c = 'com seres inteligentes a até 20 m (−2 com 10 ou mais, −3 com 100 ou mais)';
    return [bookAttr('dx', -1, c), bookAttr('iq', -1, c)];
  },
  'slow riser': function () { return [bookAttr('iq', -1, 'na primeira hora depois de acordar'), { target: 'skillAttr', key: 'IQ', value: 1, op: 'sub', cond: 'na primeira hora depois de acordar' }]; },
  'lunacy': function () { return [bookAttr('will', -2, 'na lua cheia')]; },
  'susceptible': function (r) {
    var m = /-\s*(\d+)\s*$/.exec(r.name.replace(/\([^)]*\)/g, '').trim());
    return [bookAttr('ht', -(r.levels || (m ? +m[1] : 1)), 'para resistir a ' + (r.spec || 'o que a desvantagem cobre'))];
  },
  'wounded': function () { return [bookAttr('ht', -3, 'para resistir a infecção, sem cuidar da ferida no dia')]; },
  'missing digit': function (r) { return [bookAttr('dx', r.pts >= 5 ? -5 : -1, 'com a mão que perdeu ' + (r.pts >= 5 ? 'o polegar' : 'o dedo'))]; },
  'cold-blooded': function () { return [bookAttr('ht', 2, 'para resistir aos efeitos da temperatura'), bookAttr('dx', -1, 'no frio, por 10° abaixo do limite (e −1 na Velocidade Básica)')]; }
};
// The book's effects of a disadvantage of the sheet (x: a row of Desvantagens).
function disadvBookFx(c, x) {
  var rule = c && DISADV_BOOK[norm(c.name).trim()]; if (!rule) return [];
  var m = /\(([^)]*)\)/.exec(x.name || '');
  return rule({ name: x.name || '', spec: m ? m[1].trim() : '', pts: Math.abs((x.cost || 0) * (x.levels || 1)), levels: x.levels || 0 }).map(cleanAdvEffect).filter(advEffectOk);
}

// The effects a row of the sheet gets from its entry: the Mestre's, or without them the book's.
// { list, book }. None for the ones the sheet applies by itself.
function advRowFx(c, x) {
  if (!c || x.size || ADV_FX_BUILTIN_RE.test(x.name)) return { list: [], book: false };
  var own = advEffects(c);
  return own.length ? { list: own, book: false } : { list: advBookFx(c, x), book: true };
}

// The effects of the sheet's advantages, each with its value for the advantage's level:
// [{ e, v, from }]. Vantagens first, then Combate's traits; a name only once. Kept while the sheet
// and the list of advantages are the same objects (both are replaced when they change).
var advFxCache = { s: null, list: null, dlist: null, out: null };
function sheetFx(s) {
  if (!s) return [];
  if (advFxCache.s === s && advFxCache.list === W.advantages && advFxCache.dlist === W.disadvantages) return advFxCache.out;
  var seen = {}, out = [], traits = scAllItems(sheetCombat(s)).filter(function (x) { return x.kind === 'trait'; }), advs = sheetAdvs(s), dis = sheetDisadvs(s);
  if (advs.length || traits.length) loadCatalog('advantages'); // the page redraws when it arrives
  if (dis.length) loadCatalog('disadvantages');
  function add(x, levels) {
    var key = norm(x.name); if (seen[key]) return; seen[key] = true;
    var c = advEntryOf(x); if (!c) return;
    // The level: the sheet's levels, or the number after the name ("Acute Vision 2"); 1 without.
    var m = /\s(\d+)$/.exec(x.name), lv = levels || (m ? +m[1] : 0) || 1;
    advRowFx(c, x).list.forEach(function (e) {
      var v = e.value * (e.perLevel ? lv : 1);
      if (e.max != null) v = Math.min(v, e.max);
      out.push({ e: e, v: e.op === 'sub' ? -v : v, from: x.name + (levels ? ' ' + levels : '') });
    });
  }
  advs.forEach(function (x) { add(x, x.levels); });
  traits.forEach(function (x) { add(x, 0); });
  // Desvantagens: the book's rules (DISADV_BOOK), each name once, with its level as the advantages'.
  dis.forEach(function (x) {
    var key = 'd:' + norm(x.name); if (seen[key]) return; seen[key] = true;
    var m = /\s(\d+)$/.exec(x.name), lv = x.levels || (m ? +m[1] : 0) || 1;
    disadvBookFx(disadvEntryOf(x), x).forEach(function (e) {
      var v = e.value * (e.perLevel ? lv : 1);
      if (e.max != null) v = Math.min(v, e.max);
      out.push({ e: e, v: e.op === 'sub' ? -v : v, from: x.name + (x.levels ? ' ' + x.levels : '') });
    });
  });
  advFxCache = { s: s, list: W.advantages, dlist: W.disadvantages, out: out };
  return out;
}
// What a field gets from the effects that reach it: the ones with a condition are only listed;
// the ones that stack add up; of the ones that don't, only the largest. { n, used, conds }.
function fxSum(list) {
  var n = 0, best = /** @type {any} */ (null), used = [], conds = [];
  list.forEach(function (m) {
    if (m.e.cond) conds.push(m);
    else if (m.e.stacks) { n += m.v; used.push(m); }
    else if (!best || Math.abs(m.v) > Math.abs(best.v)) best = m;
  });
  if (best) { n += best.v; used.push(best); }
  return { n: n, used: used, conds: conds };
}
function fxSigned(v) { return (v > 0 ? '+' : v < 0 ? '−' : '+') + Math.abs(v); }
// Each source written out: ["+1 de Treinamento Especial", "+2 de Ambidexterity só quando: ... (não somado)"].
function fxParts(r) {
  return r.used.map(function (m) { return fxSigned(m.v) + ' de ' + m.from; })
    .concat(r.conds.map(function (m) { return fxSigned(m.v) + ' de ' + m.from + ' só quando ' + m.e.cond + ' (não somado)'; }));
}
function fxEmpty(r) { return !r || (!r.used.length && !r.conds.length); }

// A name of the sheet against a name of an effect: the same, the same without the specialty in
// parentheses, or starting with it when it ends in *.
function fxNameMatch(pattern, name) {
  var p = norm(pattern).trim(), n = norm(name).trim();
  if (!p) return false;
  if (p.slice(-1) === '*') return n.indexOf(p.slice(0, -1).trim()) === 0;
  return n === p || n.replace(/\s*\([^)]*\)\s*$/, '') === p;
}
// The effects on a skill (k: { name, attr }) or a spell (k: { name, college }; colleges: its schools).
function fxForSkill(s, k) {
  return fxSum(sheetFx(s).filter(function (m) {
    var e = m.e;
    return e.target === 'skillAll' || (e.target === 'skillAttr' && e.key === k.attr) ||
      (e.target === 'skill' && e.names.some(function (n) { return fxNameMatch(n, k.name); }));
  }));
}
function fxForSpell(s, k, colleges) {
  return fxSum(sheetFx(s).filter(function (m) {
    var e = m.e;
    return e.target === 'spellAll' || (e.target === 'spell' && e.names.some(function (n) { return fxNameMatch(n, k.name); })) ||
      (e.target === 'college' && e.names.some(function (n) { return colleges.some(function (c) { return fxNameMatch(n, c) || norm(collegeLabel(c)) === norm(n); }); }));
  }));
}

/* ---------- attributes ---------- */
// The attributes with the effects: a copy of a (the base: saved, or being edited) with each bonus
// added to its field, and fx = { base: a, b: { st: fxSum }, def: { dodge, parry, block } }.
// gurpsStats counts the points from fx.base, so the advantages' bonuses cost nothing here.
function withAdvFx(s, a) {
  var fx = sheetFx(s), out = /** @type {SheetAttrs} */ (Object.assign({}, a)), b = {}, def = {};
  ADV_FX_ATTRS.forEach(function (r) {
    var k = r[0], x = fxSum(fx.filter(function (m) { return m.e.target === 'attr' && m.e.key === k; }));
    if (fxEmpty(x)) return;
    b[k] = x;
    out[k] = (a[k] || 0) + x.n;
    // ST, DX, IQ and HT stay at 1 or more, like the base (the damage table starts at ST 1).
    if (/^(st|dx|iq|ht)$/.test(k)) out[k] = Math.max(1, out[k]);
  });
  out.liftSt = Math.max(0, out.liftSt || 0);
  ['dodge', 'parry', 'block'].forEach(function (k) {
    var x = fxSum(fx.filter(function (m) { return m.e.target === 'def' && (m.e.key === k || m.e.key === 'all'); }));
    if (!fxEmpty(x)) def[k] = x;
  });
  // Peso from the ST the effects leave (Basic Lift, with Lifting ST), as sheetAttrs does from the base.
  out.enc = sheetEncLevel(s, out.st + out.liftSt);
  out.fx = { base: a, b: b, def: def };
  return out;
}
// The attributes the sheet uses everywhere: the ones being edited, or the saved ones, with the effects.
function sheetAttrsNow(s) { return withAdvFx(s, S.ui.attrDraft || sheetAttrs(s)); }
// Beside a defense's sum (see scCalc): [value, "vantagens: ..."].
function fxCalcPart(r) { return [r ? r.n : 0, r && r.n ? 'vantagens: ' + r.used.map(function (m) { return m.from; }).join(', ') : '']; }
// The conditional ones of a defense, for its notes.
function fxCondNotes(r) { return r ? r.conds.map(function (m) { return fxSigned(m.v) + ' de ' + m.from + ' só quando ' + m.e.cond; }) : []; }
