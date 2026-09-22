/* NO DRAWING MAY BE INVISIBLE, AND NONE MAY HANG OFF ITS OWN TILE.
 *
 * Found by the panel, 22 Sep 2026: the moon in the Brain Gym drew nothing at
 * all. It was a blank square on three "what changed?" grids in four, and the
 * answer in one instance in eight — where the two pictures were identical and
 * the reader was told an invisible moon had turned over. It had shipped that
 * way since the glyphs were written. Repairing it then pushed the crescent 1.9
 * units off the left of its own tile, which the panel caught on the next
 * reading. Both faults are the same kind: nobody had ever looked at the shape
 * the numbers actually describe.
 *
 * WHY NOTHING CAUGHT EITHER. The solver proves a puzzle has one answer; it does
 * not look at the drawing. The picture gate checks a drawing EXISTS and has
 * bytes; the moon had 190 bytes of perfectly valid SVG. Nobody rasterised it,
 * because rasterising needs a browser and this suite runs in Node.
 *
 * SO THIS WORKS OUT THE GEOMETRY INSTEAD, and checks two things.
 *
 * ONE — every arc must reach its end point. An elliptical arc in SVG takes a
 * radius and an end point. If the radius is smaller than half the distance to
 * that end point, no such arc exists — and SVG does NOT call that an error. It
 * silently enlarges the radius until one does, which turns the arc into a half
 * circle. The moon was two arcs on one chord, outer radius 20 and inner 15
 * against a chord of 40: the inner was enlarged to 20, both arcs became the
 * same half circle, one drawn forward and one back, and the shape enclosed no
 * area whatsoever. An arc that has to be enlarged is a shape the author did not
 * draw and did not see.
 *
 * TWO — every drawing must fit inside its own 56 by 56 tile, with a little
 * room to spare. A shape that runs past the frame is sliced flat against it,
 * which reads as a different shape. Arc bulges are found by walking the arc,
 * not by reading the numbers, because the far side of a curve is nowhere in the
 * path text.
 *
 *   node tools/glyph_arcs.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'src', 'gymart.js');
const src = fs.readFileSync(FILE, 'utf8');

const BOX = 56;
const MARGIN = -0.01;          /* a drawing may touch its frame, but not cross it */
const NUM = '-?[0-9]*\\.?[0-9]+';

/* every d="..." that is a literal, not built by concatenation */
const paths = [...src.matchAll(/d="([^"]+)"/g)].map(m => m[1]).filter(d => !/\+|\$\{/.test(d));

/* The TILE glyphs — SHAPES and OBJECTS — are the ones drawn straight into a 56 by
   56 tile, so they are the ones that must fit inside it. The arrows and markers
   further down the file are drawn inside a translated group, so their negative
   coordinates are deliberate and a bounds check on them would mean nothing. The
   arc check below applies to everything, because it does not depend on where the
   shape sits. */
function tableOf(name) {
  const at = src.indexOf('var ' + name + ' = {');
  if (at < 0) return [];
  const end = src.indexOf('\n  };', at);
  return [...src.slice(at, end < 0 ? src.length : end).matchAll(/d="([^"]+)"/g)]
    .map(m => m[1]).filter(d => !/\+|\$\{/.test(d));
}
const tileGlyphs = new Set(tableOf('SHAPES').concat(tableOf('OBJECTS')));

/* the centre and angles of an SVG arc, per the spec's endpoint-to-centre conversion */
function arcPoints(x1, y1, rx, ry, phiDeg, laf, sf, x2, y2) {
  if (rx === 0 || ry === 0) return [[x2, y2]];
  const phi = phiDeg * Math.PI / 180, cp = Math.cos(phi), sp = Math.sin(phi);
  const dx2 = (x1 - x2) / 2, dy2 = (y1 - y2) / 2;
  const x1p = cp * dx2 + sp * dy2, y1p = -sp * dx2 + cp * dy2;
  rx = Math.abs(rx); ry = Math.abs(ry);
  const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lam > 1) { const s = Math.sqrt(lam); rx *= s; ry *= s; }   /* this is the silent enlargement */
  const sign = (laf === sf) ? -1 : 1;
  let num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  if (num < 0) num = 0;
  const co = sign * Math.sqrt(den === 0 ? 0 : num / den);
  const cxp = co * (rx * y1p) / ry, cyp = co * -(ry * x1p) / rx;
  const cx = cp * cxp - sp * cyp + (x1 + x2) / 2, cy = sp * cxp + cp * cyp + (y1 + y2) / 2;
  const ang = (ux, uy, vx, vy) => {
    const d = Math.sqrt((ux * ux + uy * uy) * (vx * vx + vy * vy));
    let a = Math.acos(Math.min(1, Math.max(-1, (ux * vx + uy * vy) / d)));
    if (ux * vy - uy * vx < 0) a = -a;
    return a;
  };
  const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!sf && dt > 0) dt -= 2 * Math.PI;
  if (sf && dt < 0) dt += 2 * Math.PI;
  const pts = [];
  for (let i = 0; i <= 64; i++) {
    const t = t1 + dt * (i / 64);
    const ex = rx * Math.cos(t), ey = ry * Math.sin(t);
    pts.push([cp * ex - sp * ey + cx, sp * ex + cp * ey + cy]);
  }
  return pts;
}

const tooSmall = [], outside = [];

for (const d of paths) {
  const tokens = d.match(new RegExp('[MmLlHhVvCcSsQqTtAaZz]|' + NUM, 'g')) || [];
  let x = 0, y = 0, startX = 0, startY = 0, cmd = null, i = 0;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const see = (px, py) => { if (px < minX) minX = px; if (px > maxX) maxX = px; if (py < minY) minY = py; if (py > maxY) maxY = py; };
  const num = () => parseFloat(tokens[i++]);
  while (i < tokens.length) {
    const t = tokens[i];
    if (/[A-Za-z]/.test(t)) { cmd = t; i++; if (cmd === 'Z' || cmd === 'z') { x = startX; y = startY; continue; } }
    if (!cmd) { i++; continue; }
    const rel = cmd === cmd.toLowerCase();
    switch (cmd.toUpperCase()) {
      case 'M': { const a = num(), b = num(); x = rel ? x + a : a; y = rel ? y + b : b; startX = x; startY = y; see(x, y); cmd = rel ? 'l' : 'L'; break; }
      case 'L': { const a = num(), b = num(); x = rel ? x + a : a; y = rel ? y + b : b; see(x, y); break; }
      case 'H': { const a = num(); x = rel ? x + a : a; see(x, y); break; }
      case 'V': { const a = num(); y = rel ? y + a : a; see(x, y); break; }
      /* control points over-approximate a bezier's extent, which is the safe direction */
      case 'C': { const p = [num(), num(), num(), num(), num(), num()]; for (let k = 0; k < 6; k += 2) see(rel ? x + p[k] : p[k], rel ? y + p[k + 1] : p[k + 1]); x = rel ? x + p[4] : p[4]; y = rel ? y + p[5] : p[5]; break; }
      case 'S': case 'Q': { const p = [num(), num(), num(), num()]; for (let k = 0; k < 4; k += 2) see(rel ? x + p[k] : p[k], rel ? y + p[k + 1] : p[k + 1]); x = rel ? x + p[2] : p[2]; y = rel ? y + p[3] : p[3]; break; }
      case 'T': { const a = num(), b = num(); x = rel ? x + a : a; y = rel ? y + b : b; see(x, y); break; }
      case 'A': {
        const rx = Math.abs(num()), ry = Math.abs(num()), rot = num(), laf = num(), sf = num();
        const ex = num(), ey = num();
        const nx = rel ? x + ex : ex, ny = rel ? y + ey : ey;
        const half = Math.hypot(nx - x, ny - y) / 2;
        const smallest = Math.min(rx, ry);
        if (rx > 0 && ry > 0 && half > 0 && smallest < half - 0.001) {
          tooSmall.push({ path: d.length > 66 ? d.slice(0, 66) + '...' : d,
            detail: 'radius ' + smallest + ' against a half-chord of ' + half.toFixed(2)
              + ' — SVG will quietly enlarge it to ' + half.toFixed(2) + ', so the arc drawn is not the arc written' });
        }
        for (const p of arcPoints(x, y, rx, ry, rot, laf, sf, nx, ny)) see(p[0], p[1]);
        x = nx; y = ny; break;
      }
      default: i++;
    }
  }
  if (tileGlyphs.has(d) && (minX < MARGIN || minY < MARGIN || maxX > BOX - MARGIN || maxY > BOX - MARGIN)) {
    outside.push({ path: d.length > 66 ? d.slice(0, 66) + '...' : d,
      detail: 'spans x ' + minX.toFixed(1) + ' to ' + maxX.toFixed(1) + ', y ' + minY.toFixed(1) + ' to ' + maxY.toFixed(1)
        + ' in a 0-' + BOX + ' tile — the part outside is sliced flat against the frame' });
  }
}

let failed = false;
if (tooSmall.length) {
  failed = true;
  console.error('\n  ARCS THAT DO NOT REACH THEIR END POINT — ' + tooSmall.length + ':\n');
  for (const p of tooSmall) console.error('    ' + p.path + '\n      ' + p.detail + '\n');
  console.error('  Two such arcs on one chord collapse into the same half circle and the shape encloses');
  console.error('  nothing — which is how the moon shipped as a blank square.\n');
}
if (outside.length) {
  failed = true;
  console.error('\n  DRAWINGS THAT RUN OFF THEIR OWN TILE — ' + outside.length + ':\n');
  for (const p of outside) console.error('    ' + p.path + '\n      ' + p.detail + '\n');
}
if (failed) process.exit(1);

console.log('  glyph arcs: ' + paths.length + ' drawings checked, ' + tileGlyphs.size
  + ' of them tile glyphs — every arc reaches its end point, and every tile glyph fits inside its tile');
