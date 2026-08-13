/* IMAGE GAP — which questions lead to an entity with no picture.
 *
 * CEO, 2026-08-13 (#49): "please ensure all questions have an illustrative
 * picture" · "all anatomy question need to be illustrated, there are many
 * youtube videos, wiki must have many, anatomy book, there is no excuse not to
 * have pictures."
 *
 * Two different pictures exist in this app and the distinction matters:
 *   q.img          — the picture that IS the question (a flag to identify).
 *                    Only 68 questions have one, by design.
 *   CURIO_IMAGES   — the picture of the ENTITY a question points at, used on
 *                    the discovery shelf and the "keep exploring" cards. When
 *                    it is missing the tile falls back to a category emoji,
 *                    which is what the CEO photographed.
 *
 * This reports the second gap, because that is the one on screen.
 *
 *   node tools/image_gap.js            summary + the missing list
 *   node tools/image_gap.js --json     machine-readable, for the fetcher
 */
'use strict';
const path = require('path');
const fs = require('fs');

const SRC = path.join(__dirname, '..', 'src');
global.window = {};
['questions', 'entities.img', 'entities.meta', 'hooks', 'golinks'].forEach(n => {
  const p = path.join(SRC, n + '.js');
  if (fs.existsSync(p)) require(p);
});

const Q = global.window.CURIO_QUESTIONS || [];
const IM = global.window.CURIO_IMAGES || {};

const slugOf = q => {
  const m = /\/wiki\/([^"#?]+)/.exec(q.src || '');
  return m ? decodeURIComponent(m[1]) : null;
};

const bySlug = {};
Q.forEach(q => {
  const s = slugOf(q);
  if (!s) return;
  if (!bySlug[s]) bySlug[s] = { slug: s, cats: new Set(), subs: new Set(), n: 0, sample: q.q };
  bySlug[s].n++;
  bySlug[s].cats.add(q.cat);
  if (q.sub) bySlug[s].subs.add(q.sub);
});

const all = Object.values(bySlug);
const missing = all.filter(e => !IM[e.slug]);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(missing.map(e => ({
    slug: e.slug, questions: e.n,
    cat: [...e.cats].join('/'), sub: [...e.subs].join('/')
  })), null, 1));
  process.exit(0);
}

const qWithoutPic = Q.filter(q => { const s = slugOf(q); return !s || !IM[s]; }).length;

console.log('');
console.log(`  questions            ${Q.length}`);
console.log(`  distinct entities    ${all.length}`);
console.log(`  entities WITH a pic  ${all.length - missing.length}`);
console.log(`  entities MISSING     ${missing.length}`);
console.log(`  questions whose card would show an emoji instead of a picture   ${qWithoutPic}`);
console.log('');

const byGroup = {};
missing.forEach(e => {
  const k = [...e.subs][0] || [...e.cats][0] || '—';
  (byGroup[k] = byGroup[k] || []).push(e);
});
Object.entries(byGroup).sort((a, b) => b[1].length - a[1].length).forEach(([k, list]) => {
  console.log(`  ${String(list.length).padStart(3)}  ${k}`);
  list.slice(0, 60).forEach(e => console.log(`        ${e.slug}`));
});
console.log('');
