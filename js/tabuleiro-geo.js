/* =====================================================================
   Hounds — Tabuleiro: geometria (grade, linha de visão, paredes e área explorada)
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Board geometry, in the board's pixels (those of its image):
     grid      hex (pointy hexes in rows), hexc (flat hexes in columns),
               square or none. gridSize is the distance between the
               centers of two neighbouring cells; gridX/gridY move the
               grid over the image, to match a grid drawn on it.
     sight     the polygon a point sees: rays cast to every wall end,
               stopped by the nearest wall or closed door.
     explored  one bit per fog cell (half a grid cell), in base64 for
               the database (Board.explored).
   Points and polygons are flat arrays: [x0, y0, x1, y1, ...].
   ===================================================================== */
var BoardGeo = (function () {
  var R3 = Math.sqrt(3);
  function size(b) { return Math.max(8, +b.gridSize || 70); }
  function isHex(b) { return b.gridType === 'hex' || b.gridType === 'hexc'; }
  // A grid of hexes in columns is the one in rows with x and y swapped.
  function swapped(b) { return b.gridType === 'hexc'; }

  // ----- hexes (axial coordinates q, r of pointy hexes) -----
  function hexRound(q, r) {
    var s = -q - r, rq = Math.round(q), rr = Math.round(r), rs = Math.round(s);
    var dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
    if (dq > dr && dq > ds) rq = -rr - rs; else if (dr > ds) rr = -rq - rs;
    return { q: rq, r: rr };
  }
  function toHex(b, x, y) {
    var R = size(b) / R3, px = x - (+b.gridX || 0), py = y - (+b.gridY || 0);
    if (swapped(b)) { var t = px; px = py; py = t; }
    return hexRound((R3 / 3 * px - py / 3) / R, (2 / 3 * py) / R);
  }
  function hexCenter(b, q, r) {
    var R = size(b) / R3, cx = R * R3 * (q + r / 2), cy = R * 1.5 * r;
    return swapped(b) ? { x: (+b.gridX || 0) + cy, y: (+b.gridY || 0) + cx } : { x: (+b.gridX || 0) + cx, y: (+b.gridY || 0) + cy };
  }
  function hexDist(a, c) { var dq = a.q - c.q, dr = a.r - c.r; return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2; }
  // The six corners of a hex, as [x, y] pairs.
  function hexCorners(b, q, r) {
    var c = hexCenter(b, q, r), R = size(b) / R3, out = [];
    for (var i = 0; i < 6; i++) {
      var a = Math.PI / 180 * (60 * i - 30), dx = R * Math.cos(a), dy = R * Math.sin(a);
      out.push(swapped(b) ? [c.x + dy, c.y + dx] : [c.x + dx, c.y + dy]);
    }
    return out;
  }

  // ----- squares -----
  function sqCell(b, x, y) { var s = size(b); return { i: Math.floor((x - (+b.gridX || 0)) / s), j: Math.floor((y - (+b.gridY || 0)) / s) }; }

  // Where a token of `cells` cells dropped at x, y sits: the center of a hex; on squares, the center
  // of a cell for an odd size and a corner for an even one (a 2×2 token covers four cells).
  function snap(b, x, y, cells) {
    if (b.gridType === 'none') return { x: x, y: y };
    if (isHex(b)) { var h = toHex(b, x, y); return hexCenter(b, h.q, h.r); }
    var s = size(b), gx = +b.gridX || 0, gy = +b.gridY || 0, off = Math.round(cells || 1) % 2 === 1 || cells < 1 ? 0.5 : 0;
    return { x: gx + (Math.round((x - gx) / s - off) + off) * s, y: gy + (Math.round((y - gy) / s - off) + off) * s };
  }
  // Distance in cells: hexes between the two hexes; squares with a diagonal step counting as one;
  // without a grid, straight-line distance in cells (one decimal).
  function cells(b, ax, ay, bx, by) {
    if (isHex(b)) return hexDist(toHex(b, ax, ay), toHex(b, bx, by));
    if (b.gridType === 'square') { var p = sqCell(b, ax, ay), q = sqCell(b, bx, by); return Math.max(Math.abs(p.i - q.i), Math.abs(p.j - q.j)); }
    return Math.round(Math.hypot(bx - ax, by - ay) / size(b) * 10) / 10;
  }
  // Adds the grid lines inside x0..x1, y0..y1 to the current path of ctx. Returns false when there
  // would be too many cells to draw (zoomed far out).
  function gridPath(ctx, b, x0, y0, x1, y1) {
    var s = size(b), gx = +b.gridX || 0, gy = +b.gridY || 0, k;
    if (b.gridType === 'square') {
      if ((x1 - x0) / s + (y1 - y0) / s > 3000) return false;
      for (k = Math.ceil((x0 - gx) / s); gx + k * s <= x1; k++) { ctx.moveTo(gx + k * s, y0); ctx.lineTo(gx + k * s, y1); }
      for (k = Math.ceil((y0 - gy) / s); gy + k * s <= y1; k++) { ctx.moveTo(x0, gy + k * s); ctx.lineTo(x1, gy + k * s); }
      return true;
    }
    if (!isHex(b)) return true;
    if ((x1 - x0) * (y1 - y0) / (s * s) > 20000) return false;
    // The rows and columns of hexes over the region, in the grid's own (unswapped) axes.
    var R = s / R3, lx0 = x0 - gx, ly0 = y0 - gy, lx1 = x1 - gx, ly1 = y1 - gy;
    if (swapped(b)) { var t = lx0; lx0 = ly0; ly0 = t; t = lx1; lx1 = ly1; ly1 = t; }
    var r0 = Math.floor(ly0 / (1.5 * R)) - 1, r1 = Math.ceil(ly1 / (1.5 * R)) + 1;
    for (var r = r0; r <= r1; r++) {
      var q0 = Math.floor(lx0 / s - r / 2) - 1, q1 = Math.ceil(lx1 / s - r / 2) + 1;
      for (var q = q0; q <= q1; q++) {
        var c = hexCorners(b, q, r);
        ctx.moveTo(c[0][0], c[0][1]);
        for (var i = 1; i < 6; i++) ctx.lineTo(c[i][0], c[i][1]);
        ctx.closePath();
      }
    }
    return true;
  }

  // ----- walls -----
  // The walls that block (doors closed), as a flat array of segments [x1, y1, x2, y2, ...].
  function blockers(walls) {
    var out = [];
    (walls || []).forEach(function (w) { if (!(w.door && w.open)) out.push(+w.x1, +w.y1, +w.x2, +w.y2); });
    return out;
  }
  // Whether the move from a to b crosses a wall (sliding along one, or starting on it, does not).
  function crosses(ax, ay, bx, by, segs) {
    var rx = bx - ax, ry = by - ay;
    for (var k = 0; k < segs.length; k += 4) {
      var cx = segs[k], cy = segs[k + 1], sx = segs[k + 2] - cx, sy = segs[k + 3] - cy, den = rx * sy - ry * sx;
      if (Math.abs(den) < 1e-9) continue;
      var t = ((cx - ax) * sy - (cy - ay) * sx) / den, u = ((cx - ax) * ry - (cy - ay) * rx) / den;
      if (t > 1e-6 && t < 1 - 1e-6 && u >= 0 && u <= 1) return true;
    }
    return false;
  }
  function segDist(px, py, x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy, t = l ? ((px - x1) * dx + (py - y1) * dy) / l : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  // ----- line of sight -----
  // The polygon seen from px, py inside box [minX, minY, maxX, maxY], cut by the segments.
  function sight(px, py, segs, box) {
    var x0 = box[0], y0 = box[1], x1 = box[2], y1 = box[3];
    px = Math.min(x1 - 0.5, Math.max(x0 + 0.5, px)); py = Math.min(y1 - 0.5, Math.max(y0 + 0.5, py));
    // Only the walls that touch the box, plus the box itself.
    var S = [];
    for (var k = 0; k < segs.length; k += 4) {
      var a = segs[k], b = segs[k + 1], c = segs[k + 2], d = segs[k + 3];
      if (Math.max(a, c) < x0 || Math.min(a, c) > x1 || Math.max(b, d) < y0 || Math.min(b, d) > y1) continue;
      S.push(a, b, c, d);
    }
    S.push(x0, y0, x1, y0, x1, y0, x1, y1, x1, y1, x0, y1, x0, y1, x0, y0);
    var angs = [];
    for (k = 0; k < S.length; k += 2) {
      var an = Math.atan2(S[k + 1] - py, S[k] - px);
      angs.push(an - 1e-4, an, an + 1e-4);
    }
    angs.sort(function (p, q) { return p - q; });
    var out = [], last = -Infinity;
    for (var i = 0; i < angs.length; i++) {
      var A = angs[i]; if (A - last < 1e-7) continue; last = A;
      var dx = Math.cos(A), dy = Math.sin(A), best = Infinity;
      for (k = 0; k < S.length; k += 4) {
        var ax = S[k], ay = S[k + 1], sx = S[k + 2] - ax, sy = S[k + 3] - ay, den = dx * sy - dy * sx;
        if (Math.abs(den) < 1e-12) continue;
        var t = ((ax - px) * sy - (ay - py) * sx) / den;
        if (t <= 1e-9 || t >= best) continue;
        var u = ((ax - px) * dy - (ay - py) * dx) / den;
        if (u >= -1e-9 && u <= 1 + 1e-9) best = t;
      }
      if (best < Infinity) out.push(px + dx * best, py + dy * best);
    }
    return out;
  }
  function inPoly(x, y, p) {
    var inside = false;
    for (var i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
      var xi = p[i], yi = p[i + 1], xj = p[j], yj = p[j + 1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function polyPath(ctx, p) {
    if (p.length < 6) return;
    ctx.moveTo(p[0], p[1]);
    for (var i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
    ctx.closePath();
  }

  // ----- cells (the ruler's highlight, its corner snapping) -----
  // The nearest corner of a cell: a crossing of the square grid, a corner of a hex; x, y without a grid.
  function snapCorner(b, x, y) {
    if (b.gridType === 'none') return { x: x, y: y };
    if (isHex(b)) {
      var h = toHex(b, x, y), cs = hexCorners(b, h.q, h.r), best = cs[0], bd = Infinity;
      cs.forEach(function (c) { var d = Math.hypot(c[0] - x, c[1] - y); if (d < bd) { bd = d; best = c; } });
      return { x: best[0], y: best[1] };
    }
    var s = size(b), gx = +b.gridX || 0, gy = +b.gridY || 0;
    return { x: gx + Math.round((x - gx) / s) * s, y: gy + Math.round((y - gy) / s) * s };
  }
  // The centers of the cells a straight line from a to b passes through, in order.
  function lineCells(b, ax, ay, bx, by) {
    if (b.gridType === 'none') return [];
    var n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / size(b) * 2)), out = [], seen = {};
    for (var i = 0; i <= n; i++) {
      var t = i / n, c = snap(b, ax + (bx - ax) * t + 1e-3, ay + (by - ay) * t + 1e-3, 1), k = Math.round(c.x) + ',' + Math.round(c.y);
      if (!seen[k]) { seen[k] = true; out.push(c); }
    }
    return out;
  }
  // The centers of the cells inside x0..x1, y0..y1 that pass test(cx, cy) (at most 20000).
  function areaCells(b, x0, y0, x1, y1, test) {
    var out = [], s = size(b), gx = +b.gridX || 0, gy = +b.gridY || 0;
    if (b.gridType === 'square') {
      for (var i = Math.floor((x0 - gx) / s); gx + i * s <= x1 && out.length < 20000; i++)
        for (var j = Math.floor((y0 - gy) / s); gy + j * s <= y1; j++) { var cx = gx + (i + 0.5) * s, cy = gy + (j + 0.5) * s; if (test(cx, cy)) out.push({ x: cx, y: cy }); }
      return out;
    }
    if (!isHex(b)) return out;
    var R = s / R3, lx0 = x0 - gx, ly0 = y0 - gy, lx1 = x1 - gx, ly1 = y1 - gy;
    if (swapped(b)) { var t = lx0; lx0 = ly0; ly0 = t; t = lx1; lx1 = ly1; ly1 = t; }
    for (var r = Math.floor(ly0 / (1.5 * R)) - 1; r <= Math.ceil(ly1 / (1.5 * R)) + 1 && out.length < 20000; r++)
      for (var q = Math.floor(lx0 / s - r / 2) - 1; q <= Math.ceil(lx1 / s - r / 2) + 1; q++) { var c = hexCenter(b, q, r); if (test(c.x, c.y)) out.push(c); }
    return out;
  }
  // Adds the outline of the cell centered at cx, cy to the current path of ctx.
  function cellPath(ctx, b, cx, cy) {
    if (isHex(b)) {
      var h = toHex(b, cx, cy), c = hexCorners(b, h.q, h.r);
      ctx.moveTo(c[0][0], c[0][1]); for (var i = 1; i < 6; i++) ctx.lineTo(c[i][0], c[i][1]); ctx.closePath();
    } else { var s = size(b); ctx.rect(cx - s / 2, cy - s / 2, s, s); }
  }

  // ----- drawings -----
  // Fewer points for a freehand stroke, none of them farther than tol from the line kept (Ramer–Douglas–Peucker).
  function simplify(p, tol) {
    var n = p.length / 2; if (n <= 2) return p.slice();
    var keep = new Uint8Array(n), stack = [[0, n - 1]];
    keep[0] = keep[n - 1] = 1;
    while (stack.length) {
      var seg = stack.pop(), a = seg[0], z = seg[1], best = -1, bd = tol;
      for (var i = a + 1; i < z; i++) {
        var d = segDist(p[i * 2], p[i * 2 + 1], p[a * 2], p[a * 2 + 1], p[z * 2], p[z * 2 + 1]);
        if (d > bd) { bd = d; best = i; }
      }
      if (best >= 0) { keep[best] = 1; stack.push([a, best], [best, z]); }
    }
    var out = [];
    for (var k = 0; k < n; k++) if (keep[k]) out.push(p[k * 2], p[k * 2 + 1]);
    return out;
  }
  // The distance from x, y to a polyline [x0, y0, x1, y1, ...].
  function polyDist(x, y, p) {
    if (p.length < 4) return p.length === 2 ? Math.hypot(x - p[0], y - p[1]) : Infinity;
    var best = Infinity;
    for (var i = 0; i + 3 < p.length; i += 2) best = Math.min(best, segDist(x, y, p[i], p[i + 1], p[i + 2], p[i + 3]));
    return best;
  }

  // ----- explored areas -----
  // The fog raster of a board: cells of half a grid cell, fewer if the board is huge.
  function fogDims(b) {
    var w = +b.width || 2100, h = +b.height || 1400, fc = b.gridType === 'none' ? 35 : size(b) / 2;
    var cols = Math.ceil(w / fc), rows = Math.ceil(h / fc);
    while (cols * rows > 400000) { fc *= 1.5; cols = Math.ceil(w / fc); rows = Math.ceil(h / fc); }
    // The key changes with anything that moves the cells: explored bits of another layout mean nothing.
    return { fc: fc, cols: cols, rows: rows, key: [b.gridType, size(b), w, h].join('|') };
  }
  function bitsNew(n) { return new Uint8Array(Math.ceil(n / 8)); }
  function bitsDecode(s, n) {
    var out = bitsNew(n);
    if (!s) return out;
    try { var bin = atob(s); for (var i = 0; i < bin.length && i < out.length; i++) out[i] = bin.charCodeAt(i); } catch (e) {}
    return out;
  }
  // Trailing empty bytes are left out ('' when nothing was explored).
  function bitsEncode(u8) {
    var end = u8.length; while (end > 0 && !u8[end - 1]) end--;
    var s = '';
    for (var i = 0; i < end; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, Math.min(end, i + 0x8000)));
    return end ? btoa(s) : '';
  }
  // Ors b into a; whether a gained any bit.
  function bitsMerge(a, b) {
    var gained = false;
    for (var i = 0; i < a.length && i < b.length; i++) { var v = a[i] | b[i]; if (v !== a[i]) { a[i] = v; gained = true; } }
    return gained;
  }
  // Whether a has a bit that b lacks.
  function bitsHasMore(a, b) {
    for (var i = 0; i < a.length; i++) if (a[i] & ~(b[i] || 0)) return true;
    return false;
  }

  return {
    isHex: isHex, size: size, snap: snap, cells: cells, gridPath: gridPath, toHex: toHex, hexCenter: hexCenter, hexCorners: hexCorners,
    blockers: blockers, crosses: crosses, segDist: segDist, sight: sight, inPoly: inPoly, polyPath: polyPath,
    snapCorner: snapCorner, lineCells: lineCells, areaCells: areaCells, cellPath: cellPath, simplify: simplify, polyDist: polyDist,
    fogDims: fogDims, bitsNew: bitsNew, bitsDecode: bitsDecode, bitsEncode: bitsEncode, bitsMerge: bitsMerge, bitsHasMore: bitsHasMore
  };
})();
