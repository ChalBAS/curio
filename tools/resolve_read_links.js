#!/usr/bin/env node
/* A BOOK, NOT A SEARCH BOX.
 *
 * CEO, 5 Sep 2026: "i don't see the links to the books, video.... How do you
 * want me to check if the links are live?"
 *
 * readUrl() sends a reader to an Open Library SEARCH PAGE — a list of results
 * that may be empty, led by whatever the ranking happens to return. It answers
 * a link checker and fails a reader. This resolves each subject to an actual
 * book, once, and bakes the answer in so nothing is fetched at runtime.
 *
 *   node tools/resolve_read_links.js            resolve everything missing
 *   node tools/resolve_read_links.js --limit 40 do the first 40 only
 *   node tools/resolve_read_links.js --recheck  re-verify what is already there
 *
 * Writes src/links.read.js:  window.CURIO_READ = { "<entity slug>": {...} }
 *
 * WHAT IT REFUSES. A colouring book, a workbook, a notebook or a puzzle book is
 * not "somewhere to read more" — those flood Open Library for famous subjects.
 * A book whose only author is the subject themselves is usually a reprint mill.
 * Anything with no author, or a single edition and no subject word in the
 * title, is left unresolved rather than guessed: an unresolved subject keeps
 * the old search page, which is weak but honest.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'src', 'links.read.js');
const argv = process.argv.slice(2);
const LIMIT = argv.includes('--limit') ? parseInt(argv[argv.indexOf('--limit') + 1], 10) : null;
const RECHECK = argv.includes('--recheck');

/* ---- the subjects, taken the way the app takes them ---- */
const sandbox = { window: {} };
const vm = require('vm');
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'src', 'questions.js'), 'utf8'), sandbox);
const Q = sandbox.window.CURIO_QUESTIONS || [];

function entityOf(q) {
  if (!q || !q.src) return null;
  const m = new RegExp('/wiki/([^"#?]+)').exec(q.src);
  if (!m) return null;
  try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; }
}
const subjects = [...new Set(Q.map(entityOf).filter(Boolean))];

/* ---- what is already resolved ---- */
let have = {};
if (fs.existsSync(OUT) && !RECHECK) {
  const s = fs.readFileSync(OUT, 'utf8');
  const m = /window\.CURIO_READ\s*=\s*(\{[\s\S]*\});?\s*$/.exec(s.trim());
  if (m) { try { have = JSON.parse(m[1]); } catch (e) { have = {}; } }
}

let todo = subjects.filter(s => !have[s]);
if (LIMIT) todo = todo.slice(0, LIMIT);
console.log(subjects.length + ' subjects · ' + Object.keys(have).length + ' already resolved · ' + todo.length + ' to do');
if (!todo.length) { console.log('nothing to do'); process.exit(0); }

const JUNK = /colou?ring|workbook|note ?book|journal|word ?search|sudoku|puzzle book|activity book|sketchbook|planner|diary of|blank |lined |dot grid/i;

function titleWords(slug) {
  return slug.replace(/_/g, ' ').replace(/\(.*?\)/g, '')
    .split(/\s+/).map(w => w.toLowerCase().replace(/[^a-z0-9]/g, ''))
    .filter(w => w.length > 3);
}

async function resolve(slug) {
  const subject = slug.replace(/_/g, ' ');
  const url = 'https://openlibrary.org/search.json?q=' + encodeURIComponent(subject) +
    '&limit=12&fields=key,title,author_name,first_publish_year,edition_count,ebook_access';
  let docs;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Qpio/1.0 (content link resolver)' } });
    if (!res.ok) return { error: 'HTTP ' + res.status };
    docs = (await res.json()).docs || [];
  } catch (e) { return { error: String(e.message || e).slice(0, 60) }; }

  const words = titleWords(slug);
  const scored = docs.map(d => {
    const t = String(d.title || '');
    if (JUNK.test(t)) return null;
    if (!d.author_name || !d.author_name.length) return null;
    /* the subject listed as its own author is a reprint mill, not a book about it */
    if (d.author_name.some(a => a.toLowerCase() === subject.toLowerCase())) return null;
    const tl = t.toLowerCase();
    const hits = words.filter(w => tl.includes(w)).length;
    const eds = d.edition_count || 1;
    /* RELEVANCE BEATS POPULARITY, always. The first version of this scored a
       famous book with many editions above an obscure one about the subject,
       and sent "Roman roads" to Cormac McCarthy's The Road and "Printing press"
       to a Nora Roberts novel. A widely reprinted book about something else is
       the worst possible answer: it looks completely right in a list.
       So the title must actually name the subject — both significant words
       where there are two or more, and the single word where there is one. */
    const need = words.length >= 2 ? 2 : 1;
    if (hits < need) return null;
    return { d, score: hits * 100 + Math.min(eds, 40) + (d.ebook_access === 'public' ? 8 : 0) };
  }).filter(Boolean).sort((a, b) => b.score - a.score);

  if (!scored.length) return { none: true };
  const d = scored[0].d;
  /* A one-word subject is where this goes wrong: "Tokyo" matches "Tokyo Ghoul".
     Two or more words naming the subject is a strong match; one word is a
     guess worth a human glance. Say which, rather than pretending both are
     the same — the review card shows the weak ones for a decision. */
  const w = titleWords(slug);
  const hits = w.filter(x => String(d.title || '').toLowerCase().includes(x)).length;
  return {
    u: 'https://openlibrary.org' + d.key,
    t: d.title,
    a: d.author_name[0],
    y: d.first_publish_year || null,
    e: d.edition_count || 1,
    c: (hits >= 2 || (hits === 1 && w.length === 1 && (d.edition_count || 1) >= 8)) ? 'strong' : 'check'
  };
}

(async () => {
  let done = 0, ok = 0, none = 0, err = 0;
  const CONC = 4;                       /* polite: Open Library is a charity */
  for (let i = 0; i < todo.length; i += CONC) {
    const batch = todo.slice(i, i + CONC);
    const got = await Promise.all(batch.map(resolve));
    batch.forEach((slug, k) => {
      const r = got[k];
      done++;
      if (r.u) { have[slug] = r; ok++; }
      else if (r.none) none++;
      else err++;
    });
    if (done % 40 === 0 || done === todo.length) {
      process.stdout.write('\r  resolved ' + done + '/' + todo.length + '  (found ' + ok + ', no good match ' + none + ', failed ' + err + ')');
    }
    await new Promise(r => setTimeout(r, 260));
  }
  console.log('');

  const header = '// © 2026 Qpio. GENERATED by tools/resolve_read_links.js — do not hand-edit.\n' +
    '// One real book per subject, resolved once from Open Library, so the "read"\n' +
    '// door lands on a book instead of a search box. A subject absent from this\n' +
    '// file keeps the old search link: weak, but honest.\n' +
    'window.CURIO_READ = ';
  fs.writeFileSync(OUT, header + JSON.stringify(have, null, 0) + ';\n', 'utf8');
  console.log('\nwrote src/links.read.js — ' + Object.keys(have).length + ' subjects have a real book');
  if (none) console.log('  ' + none + ' subjects had no book worth linking; they keep the search page');
  if (err) console.log('  ' + err + ' failed to resolve (network); run again to retry');
})();
