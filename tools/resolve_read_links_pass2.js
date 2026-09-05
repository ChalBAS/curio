#!/usr/bin/env node
/* THE 173 SUBJECTS THE FIRST PASS COULD NOT PLACE.
 *
 * CEO, 5 Sep 2026: "fix the 170 subjects without a book".
 *
 * The first pass required a book's title to contain TWO significant words of
 * the subject, because relevance had to beat popularity — without that rule
 * "Roman roads" resolved to Cormac McCarthy's The Road. The rule worked, and
 * it was too blunt in two specific ways:
 *
 *   PROPER NOUNS. "Rock-Hewn Churches, Lalibela" needs only "Lalibela" to be a
 *   certain match — the distinctive word carries the whole subject, and
 *   demanding two rejected the right book. Same for Chinguetti, Taghaza,
 *   Al-Khwarizmi, the Obelisk of Axum.
 *
 *   GENERIC CONCEPTS. "Ice", "Sun", "DNA", "Light-year". No title rule helps
 *   here: searching Open Library for "Ice" returns Game of Thrones and for
 *   "Sun" returns Sun Tzu. Forcing a book would be worse than the search page,
 *   because a confidently wrong book is harder to spot than an obvious gap.
 *   These get an Open Library SUBJECT SHELF instead — a real page listing
 *   books catalogued under that subject. It is a place, not a search box, and
 *   it is honest about being a shelf rather than pretending to be one book.
 *
 *   node tools/resolve_read_links_pass2.js            resolve what is missing
 *   node tools/resolve_read_links_pass2.js --dry-run  show what it would do
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'src', 'links.read.js');
const DRY = process.argv.includes('--dry-run');
const UA = 'Qpio/1.0 (https://qpio.app; content link resolver)';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'src', 'questions.js'), 'utf8'), sandbox);
try { vm.runInContext(fs.readFileSync(OUT, 'utf8'), sandbox); } catch (e) { /* first run */ }
const Q = sandbox.window.CURIO_QUESTIONS || [];
const have = sandbox.window.CURIO_READ || {};

function entityOf(q) {
  if (!q || !q.src) return null;
  const m = new RegExp('/wiki/([^"#?]+)').exec(q.src);
  if (!m) return null;
  try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; }
}
const subjects = [...new Set(Q.map(entityOf).filter(Boolean))];
const todo = subjects.filter(s => !have[s]);
console.log(subjects.length + ' subjects · ' + (subjects.length - todo.length) + ' already placed · ' + todo.length + ' to do\n');
if (!todo.length) { console.log('nothing to do'); process.exit(0); }

const JUNK = /colou?ring|workbook|note ?book|journal|word ?search|sudoku|puzzle book|activity book|sketchbook|planner|blank |lined /i;
const STOP = new Set(['the', 'and', 'for', 'from', 'with', 'that', 'this', 'list', 'bones', 'human',
  'route', 'kingdom', 'empire', 'church', 'churches', 'city', 'river', 'mount', 'lake', 'sea']);

function words(slug) {
  return slug.replace(/_/g, ' ').replace(/\(.*?\)/g, '')
    .split(/[\s,]+/).map(w => w.toLowerCase().replace(/[^a-z0-9'-]/g, ''))
    .filter(w => w.length > 3 && !STOP.has(w));
}
/* The distinctive word is the longest one that is not a common qualifier —
   "Lalibela" out of "Rock-Hewn Churches, Lalibela". */
function distinctive(slug) {
  const w = words(slug);
  if (!w.length) return null;
  return w.slice().sort((a, b) => b.length - a.length)[0];
}

async function getJSON(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (res.status === 429 || res.status === 503) { await sleep(2500); return getJSON(url); }
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

/* ---- attempt A: a real book, matched on the distinctive word ---- */
async function findBook(slug) {
  const subject = slug.replace(/_/g, ' ');
  const key = distinctive(slug);
  if (!key || key.length < 5) return null;      /* too generic to trust a title match */
  const j = await getJSON('https://openlibrary.org/search.json?q=' + encodeURIComponent(subject) +
    '&limit=14&fields=key,title,author_name,first_publish_year,edition_count');
  const scored = (j.docs || []).map(d => {
    const t = String(d.title || '');
    if (JUNK.test(t) || !d.author_name || !d.author_name.length) return null;
    if (d.author_name.some(a => a.toLowerCase() === subject.toLowerCase())) return null;
    if (!t.toLowerCase().includes(key)) return null;   /* must name the distinctive word */
    return { d, score: Math.min(d.edition_count || 1, 40) };
  }).filter(Boolean).sort((a, b) => b.score - a.score);
  if (!scored.length) return null;
  const d = scored[0].d;
  return {
    u: 'https://openlibrary.org' + d.key, t: d.title, a: d.author_name[0],
    y: d.first_publish_year || null, e: d.edition_count || 1, c: 'check', k: 'book'
  };
}

/* ---- attempt B: the subject's own shelf on Open Library ---- */
async function findShelf(slug) {
  /* Open Library subject keys are lower-case, hyphen-separated */
  const cands = [];
  const base = slug.replace(/_/g, ' ').replace(/\(.*?\)/g, '').trim();
  cands.push(base.toLowerCase().replace(/[^a-z0-9 ]/gi, '').trim().replace(/\s+/g, '_'));
  const d = distinctive(slug);
  if (d) cands.push(d);
  for (const c of [...new Set(cands)].filter(Boolean)) {
    let j;
    try { j = await getJSON('https://openlibrary.org/subjects/' + encodeURIComponent(c) + '.json?limit=1'); }
    catch (e) { continue; }
    if (j && j.work_count >= 12 && j.name) {
      return {
        u: 'https://openlibrary.org/subjects/' + c,
        t: 'Books about ' + j.name, a: '', y: null, e: j.work_count,
        c: 'shelf', k: 'shelf'
      };
    }
    await sleep(300);
  }
  return null;
}

(async () => {
  let book = 0, shelf = 0, none = 0;
  const unresolved = [];
  for (let i = 0; i < todo.length; i++) {
    const slug = todo[i];
    let got = null;
    try { got = await findBook(slug); } catch (e) { /* fall through */ }
    if (!got) { await sleep(250); try { got = await findShelf(slug); } catch (e) { /* fall through */ } }
    if (got) {
      have[slug] = got;
      if (got.k === 'book') book++; else shelf++;
    } else { none++; unresolved.push(slug); }
    if ((i + 1) % 20 === 0 || i === todo.length - 1) {
      process.stdout.write('\r  ' + (i + 1) + '/' + todo.length + '  books ' + book + ' · shelves ' + shelf + ' · still none ' + none + '   ');
    }
    await sleep(320);
  }
  console.log('');

  if (DRY) { console.log('\n--dry-run: nothing written'); process.exit(0); }

  const header = '// © 2026 Qpio. GENERATED by tools/resolve_read_links.js and\n' +
    '// tools/resolve_read_links_pass2.js — do not hand-edit.\n' +
    '// Where a subject has one clearly right book, that book. Where it does not —\n' +
    '// "Ice", "Sun", "DNA" — an Open Library subject shelf, which is a real page\n' +
    '// listing books on that subject rather than a search box pretending to be one.\n' +
    'window.CURIO_READ = ';
  fs.writeFileSync(OUT, header + JSON.stringify(have, null, 0) + ';\n', 'utf8');
  console.log('\nwrote src/links.read.js — ' + Object.keys(have).length + ' of ' + subjects.length + ' subjects placed');
  console.log('  ' + book + ' newly matched to a book');
  console.log('  ' + shelf + ' given a subject shelf');
  if (unresolved.length) {
    console.log('\nSTILL NOTHING (' + unresolved.length + ') — these keep the search page:');
    unresolved.forEach(s => console.log('   ' + s.replace(/_/g, ' ')));
  }
})();
