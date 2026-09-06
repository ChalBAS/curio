/* WHAT EACH QUESTION IS, kept beside the counts.
 *
 * CEO brief, 6 September 2026, section 3: the analytics database carries a
 * "content registry" as one of its purpose domains.
 *
 * WHY THIS EXISTS. The counters hold question ids and nothing else about the
 * question -- deliberately, because a category stored next to a count is a
 * second copy that drifts. But it means a number cannot be read without the
 * app bundle that was shipped at the time, and two things follow that are both
 * bad. Reading "Q152 was answered 400 times, 41% correct" a year later would
 * need last year's bundle to know what Q152 even was. And a question RETIRED
 * from the bank would lose its meaning entirely while its history remained.
 *
 * So the pipeline writes what a question is -- once per revision -- and the
 * counts stay clean. This is written by the release, never by a reader.
 *
 *   node tools/publish_content_registry.js          show what would be written
 *   node tools/publish_content_registry.js --write  write it to the database
 */

'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const APP = path.resolve(__dirname, '..');
const DB = 'qpio-analytics-eu';
const WRITE = process.argv.includes('--write');
const SQL_OUT = path.join(APP, 'tools', 'content-registry.sql');

global.window = {};
require(path.join(APP, 'src', 'questions.js'));
require(path.join(APP, 'src', 'questions.fr.js'));
require(path.join(APP, 'src', 'content.version.js'));
const EN = global.window.CURIO_QUESTIONS || [];
const FR = global.window.CURIO_QUESTIONS_FR || [];
const CV = global.window.CURIO_CONTENT_VERSION || 'unknown';

if (!EN.length) { console.error('  registry: the bank is empty'); process.exit(2); }

const today = new Date().toISOString().slice(0, 10);
const esc = v => (v === null || v === undefined ? 'NULL' : "'" + String(v).replace(/'/g, "''") + "'");
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 'NULL');

const lines = [];

/* first_published is only set the first time a revision is seen. Overwriting it
 * on every release would make every question look brand new for ever, which is
 * exactly the field somebody would later use to ask how a question aged. */
for (const q of EN) {
  lines.push(
    'INSERT INTO content_registry (qid,qrev,category,subcategory,region,difficulty,kids,first_published,last_published,content_version) VALUES (' +
    [esc(q.id), num(q.qrev || 1), esc(q.cat || null), esc(q.sub || null), esc(q.region || null),
      num(q.diff), q.kids ? 1 : 0, esc(today), esc(today), esc(CV)].join(',') +
    ') ON CONFLICT (qid,qrev) DO UPDATE SET category=excluded.category, subcategory=excluded.subcategory, ' +
    'region=excluded.region, difficulty=excluded.difficulty, kids=excluded.kids, ' +
    'last_published=excluded.last_published, content_version=excluded.content_version;');
}

for (const bank of [{ rows: EN, lang: 'en' }, { rows: FR, lang: 'fr' }]) {
  for (const q of bank.rows) {
    lines.push(
      'INSERT INTO content_language (qid,lang,lrev,published_at) VALUES (' +
      [esc(q.id), esc(bank.lang), num(q.lrev || 1), esc(today)].join(',') +
      ') ON CONFLICT (qid,lang,lrev) DO NOTHING;');
  }
}

fs.writeFileSync(SQL_OUT, lines.join('\n') + '\n', 'utf8');
console.log('  registry: ' + EN.length + ' questions, ' + (EN.length + FR.length) +
  ' translations, content version ' + CV);
console.log('  wrote ' + path.relative(APP, SQL_OUT) + ' (' + lines.length + ' statements)');

if (!WRITE) { console.log('\n  nothing sent. Re-run with --write to publish it.'); process.exit(0); }

/* Sent as a file rather than a command line: two thousand statements do not fit
 * in an argument, and splitting them into batches by hand is how half a
 * registry ends up published. */
const env = Object.assign({}, process.env);
delete env.CLOUDFLARE_API_TOKEN;   // wrangler falls back to the OAuth session
try {
  const out = execFileSync('npx', ['wrangler@4.120.1', 'd1', 'execute', DB, '--remote', '--file=' + SQL_OUT],
    { cwd: APP, encoding: 'utf8', env, maxBuffer: 32 * 1024 * 1024, shell: true });
  const m = /"rows_written":\s*(\d+)/.exec(out);
  console.log('  published to ' + DB + (m ? ' — ' + m[1] + ' rows written' : ''));
} catch (e) {
  console.error('  registry: publishing failed — ' + (e.stdout || e.message || '').toString().slice(-600));
  process.exit(1);
}
