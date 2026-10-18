/* =====================================================================
   Hounds — Tabuleiro: rolagem de dados (expressões como 3d6+2 e o teste de GURPS)
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Dice of the board's roller (the Dados tool):
     parse   "3d6+2", "2d10 - 1", "d20", "4dF" (Fudge: -1, 0 or +1 each)
             into groups of dice and a modifier, or null
     roll    each die from the browser's crypto, the same chance for every
             face; exploding dice (!) roll again on their top face
     gurps   a success roll of GURPS: 3d6 against the effective skill
             (NH), with the margin and the criticals of p. B348
   ===================================================================== */
var BoardDice = (function () {
  var MAX_DICE = 200;
  // A whole number from 1 to n, without the bias of a plain modulo.
  function die(n) {
    var c = window.crypto;
    if (c && c.getRandomValues) {
      var lim = Math.floor(4294967296 / n) * n, a = new Uint32Array(1);
      do { c.getRandomValues(a); } while (a[0] >= lim);
      return (a[0] % n) + 1;
    }
    return Math.floor(Math.random() * n) + 1;
  }
  function parse(expr) {
    // Spaces only around the signs: "3d6 2" is not 3d62.
    var s = String(expr || '').toLowerCase();
    if (/[\dfd]\s+[\dfd]/.test(s)) return null;
    s = s.replace(/\s+/g, '');
    if (!s || s.length > 80) return null;
    var re = /([+-])?(?:(\d*)d(\d+|f)|(\d+))/g, m, pos = 0, first = true, count = 0, out = { dice: [], mod: 0 };
    while ((m = re.exec(s))) {
      if (m.index !== pos) return null;
      pos = re.lastIndex;
      // Only the first term goes without a sign.
      if (!first && !m[1]) return null;
      first = false;
      var sign = m[1] === '-' ? -1 : 1;
      if (m[4] != null) { out.mod += sign * Number(m[4]); continue; }
      var n = m[2] === '' ? 1 : Number(m[2]), fudge = m[3] === 'f', sides = fudge ? 3 : Number(m[3]);
      if (n < 1 || n > 100 || (!fudge && (sides < 2 || sides > 1000))) return null;
      count += n;
      if (count > MAX_DICE) return null;
      out.dice.push({ n: n, sides: sides, fudge: fudge, sign: sign });
    }
    if (first || pos !== s.length || Math.abs(out.mod) > 100000) return null;
    return out;
  }
  // The expression as it is shown: "3d6+2", "4dF-1".
  function text(spec) {
    var out = '';
    spec.dice.forEach(function (g, i) { out += (g.sign < 0 ? '-' : i ? '+' : '') + g.n + 'd' + (g.fudge ? 'F' : g.sides); });
    if (spec.mod) out += (spec.mod > 0 ? (out ? '+' : '') : '-') + Math.abs(spec.mod);
    return out || '0';
  }
  // groups: [{ n, sides, fudge, sign, rolls: [faces], sum }]; a die that explodes adds its rolls to the group.
  function roll(spec, explode) {
    var total = spec.mod;
    var groups = spec.dice.map(function (g) {
      var rolls = [], sum = 0;
      for (var i = 0; i < g.n; i++) {
        if (g.fudge) { var f = die(3) - 2; rolls.push(f); sum += f; continue; }
        var v = die(g.sides), extra = 0;
        rolls.push(v); sum += v;
        while (explode && v === g.sides && extra < 20) { v = die(g.sides); rolls.push(v); sum += v; extra++; }
      }
      total += g.sign * sum;
      return { n: g.n, sides: g.sides, fudge: g.fudge, sign: g.sign, rolls: rolls, sum: sum };
    });
    return { groups: groups, mod: spec.mod, total: total };
  }
  // Whether the expression is a plain 3d6, the roll GURPS tests against a skill.
  function isPlain3d6(spec) { return spec.dice.length === 1 && spec.mod === 0 && spec.dice[0].n === 3 && spec.dice[0].sides === 6 && !spec.dice[0].fudge && spec.dice[0].sign > 0; }
  /* A success roll against nh (B348): 3 and 4 are always critical successes, 5 with NH 15 and 6 with
     NH 16 too; 18 is always a critical failure, 17 too with NH 15 or less (otherwise a plain failure,
     as 17 and 18 always fail), and so is missing by 10 or more. Result: 'crit-success', 'success',
     'fail' or 'crit-fail', and the margin (how much under the NH). */
  function gurps(total, nh, criticals) {
    var margin = nh - total, r = margin >= 0 ? 'success' : 'fail';
    if (criticals) {
      if (total >= 17) r = total === 18 || nh <= 15 ? 'crit-fail' : 'fail';
      else if (total <= 4 || (total === 5 && nh >= 15) || (total === 6 && nh >= 16)) r = 'crit-success';
      else if (margin <= -10) r = 'crit-fail';
    }
    return { result: r, margin: margin };
  }
  return { parse: parse, text: text, roll: roll, isPlain3d6: isPlain3d6, gurps: gurps };
})();
