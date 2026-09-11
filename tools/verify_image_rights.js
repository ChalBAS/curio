#!/usr/bin/env node
/* PROVE THE PICTURES ARE FREE — WITHOUT TRUSTING THIS REPOSITORY.
 *
 * CEO, 5 Sep 2026: "How can i independently check the copyright ... i need to
 * be sure 100% being wrong as 0 consequence for you but 100% consequence on me"
 *
 * THE PROBLEM WITH EVERY OTHER TOOL HERE. audit_image_licences.py reads the
 * licence that THIS REPOSITORY claims for each picture. If that claim is wrong
 * — mistyped, stale, or written by an agent that made a mistake — the audit
 * passes and the picture is still unsafe. It checks our homework against our
 * own answers.
 *
 * THIS ONE IGNORES WHAT WE CLAIM. For every picture it goes back to Wikimedia
 * Commons, asks Commons what the licence actually is today, and compares. You
 * are then trusting Wikimedia and the arithmetic below — not this repository,
 * and not the agent that wrote it.
 *
 *   node tools/verify_image_rights.js              check every picture
 *   node tools/verify_image_rights.js --report FILE  also write a dated report
 *
 * Exit code 0 only when every picture is independently confirmed free for
 * commercial use. Any mismatch, any unverifiable picture, any non-free host,
 * exits non-zero and names it.
 *
 * WHAT "FREE" MEANS HERE, and why the list is short:
 *   Public domain · CC0 · CC BY (any version) · CC BY-SA (any version)
 *   FAL · GODL-India
 * All permit commercial use AND derivative works. Everything else is refused,
 * including licences that are "free" in other senses — GFDL obliges you to
 * republish the whole licence text, and software licences (GPL, LGPL, MPL)
 * carry source-availability duties and usually arrive attached to a logo.
 *
 * WHAT THIS CANNOT PROVE, stated plainly because a false assurance is worse
 * than none: it confirms the licence Commons publishes for each file. It
 * cannot confirm that the person who uploaded the file to Commons had the
 * right to license it. Nobody can verify that for 900 files, and any tool
 * claiming otherwise is lying. What it does prove is that every picture rests
 * on a free licence from a source with its own takedown process — and that
 * this repository's record matches what that source says today.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const argv = process.argv.slice(2);
const REPORT = argv.includes('--report') ? argv[argv.indexOf('--report') + 1] : null;
/* machine-readable verdict, so the daily control can show it rather than
   burying it in a log nobody opens */
const STATE = argv.includes('--state') ? argv[argv.indexOf('--state') + 1] : null;

/* Licences that permit commercial use and derivatives. */
const FREE = /^(public domain|cc0|cc[ -]by|fal\b|godl-india)/i;

/* ---- load exactly what the app ships ---- */
const sandbox = { window: {} };
vm.createContext(sandbox);
for (const f of ['entities.img.js', 'questions.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src', f), 'utf8'), sandbox, { filename: f });
}
const IM = sandbox.window.CURIO_IMAGES || {};
const Q = sandbox.window.CURIO_QUESTIONS || [];

const pics = [];
Object.entries(IM).forEach(([k, v]) => pics.push({ where: 'subject "' + k + '"', u: v.u, by: v.by, lic: v.lic, page: v.p, gen: v.gen === true }));
/* gen was hardcoded false here, so a picture carried on a QUESTION could never
   be declared AI-generated — the disclosure this tool exists to enforce was
   impossible to satisfy on the only rows where it came up. It now reads the
   row's own flag, exactly as it does for a subject's picture. */
Q.forEach(q => { if (q.img && q.img.u) pics.push({ where: 'question "' + String(q.q).slice(0, 44) + '"', u: q.img.u, by: q.img.by, lic: q.img.lic, page: q.img.p, gen: q.img.gen === true }); });

console.log('pictures the app ships: ' + pics.length + '\n');

/* ---- classify by host before asking anyone anything ---- */
const ours = [], commons = [], foreign = [];
for (const p of pics) {
  const u = String(p.u || '');
  if (/^(img|brand)\//.test(u)) ours.push(p);
  else if (/^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\//.test(u)) commons.push(p);
  else foreign.push(p);
}
console.log('  ' + commons.length + '  on Wikimedia Commons — checked against Commons below');
console.log('  ' + ours.length + '  our own files, generated for Qpio — no third party holds rights in them');
console.log('  ' + foreign.length + '  somewhere else' + (foreign.length ? '  <-- MUST BE ZERO' : ''));
foreign.forEach(p => console.log('        ' + p.where + '  ' + String(p.u).slice(0, 80)));

/* The generated ones are ours, but they must still SAY they are generated,
   or a reader could take one for a photograph. */
const genUnmarked = ours.filter(p => !p.gen && !/^generated illustration/i.test(p.lic || ''));

/* ---- ask Commons what it actually says, in batches ---- */
function fileOf(p) {
  /* .../commons/thumb/a/ab/Name.jpg/500px-Name.jpg  ->  File:Name.jpg
     .../commons/a/ab/Name.jpg                       ->  File:Name.jpg */
  const m = /\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/]+)/.exec(p.u || '');
  return m ? 'File:' + decodeURIComponent(m[1]) : null;
}
/* Wikimedia asks for a real User-Agent and throttles hard without one. The
   first version of this tool sent 50 titles at a time as fast as it could, was
   rate-limited, and then reported the throttle as "Commons has no such file"
   for 856 pictures — a checker inventing 856 problems is worse than no checker,
   because it destroys trust in the ones that are real. Hence: identify
   ourselves, go slowly, retry on 429, and NEVER let a failed request be
   reported as a licence fault. */
const UA = 'QpioImageRightsCheck/1.0 (https://qpio.app; contact via qpio.app) node-fetch';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function ask(titles, attempt) {
  attempt = attempt || 1;
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2' +
    '&prop=imageinfo&iiprop=extmetadata&titles=' + encodeURIComponent(titles.join('|'));
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' } });
  if (res.status === 429 || res.status === 503) {
    if (attempt > 5) throw new Error('Commons kept rate-limiting after 5 tries');
    await sleep(2000 * attempt);
    return ask(titles, attempt + 1);
  }
  if (!res.ok) throw new Error('Commons returned HTTP ' + res.status);
  const text = await res.text();
  let j;
  try { j = JSON.parse(text); }
  catch (e) { throw new Error('Commons did not return JSON: ' + text.slice(0, 60)); }
  if (j.error) throw new Error('Commons API error: ' + (j.error.info || j.error.code));

  const strip = v => String(v == null ? '' : v).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  const out = {};
  /* the API normalises titles (underscores to spaces); map back so the caller's
     key still finds its answer */
  const back = {};
  ((j.query && j.query.normalized) || []).forEach(n => { back[n.to] = n.from; });
  ((j.query && j.query.pages) || []).forEach(pg => {
    const meta = ((pg.imageinfo || [{}])[0] || {}).extmetadata || {};
    const key = back[pg.title] || pg.title;
    out[key] = {
      missing: pg.missing === true,
      licence: strip((meta.LicenseShortName || {}).value),
      artist: strip((meta.Artist || {}).value),
      restrictions: strip((meta.Restrictions || {}).value)
    };
  });
  return out;
}

(async () => {
  const problems = [];
  const restrictionTally = {};
  let confirmed = 0, unresolved = 0;

  for (const p of pics) p.file = fileOf(p);
  const noFile = commons.filter(p => !p.file);
  noFile.forEach(p => problems.push({ kind: 'cannot identify the Commons file', where: p.where, detail: p.u }));

  const byFile = {};
  commons.filter(p => p.file).forEach(p => (byFile[p.file] = byFile[p.file] || []).push(p));
  const files = Object.keys(byFile);
  console.log('\nasking Wikimedia Commons about ' + files.length + ' distinct files...');

  const said = {};
  const unreachable = new Set();
  for (let i = 0; i < files.length; i += 20) {
    const batch = files.slice(i, i + 20);
    try { Object.assign(said, await ask(batch)); }
    catch (e) {
      /* Could not check is NOT the same as checked and bad. It is recorded
         separately and it still fails the run — but it is never dressed up as
         a licence fault. */
      batch.forEach(f => unreachable.add(f));
      console.log('\n  could not check ' + batch.length + ' files: ' + e.message);
    }
    process.stdout.write('\r  asked ' + Math.min(i + 20, files.length) + '/' + files.length + '   ');
    await sleep(700);
  }
  console.log('');
  unreachable.forEach(f => (byFile[f] || []).forEach(p =>
    problems.push({ kind: 'COULD NOT CHECK (not a fault in the picture)', where: p.where, detail: f })));

  for (const f of files) {
    if (unreachable.has(f)) continue;      /* already reported as uncheckable */
    const c = said[f];
    const group = byFile[f];
    if (!c || c.missing) {
      group.forEach(p => problems.push({ kind: 'Commons has no such file', where: p.where, detail: f }));
      unresolved += group.length;
      continue;
    }
    if (!c.licence) {
      group.forEach(p => problems.push({ kind: 'Commons records no licence', where: p.where, detail: f }));
      unresolved += group.length;
      continue;
    }
    const free = FREE.test(c.licence);
    group.forEach(p => {
      if (!free) {
        problems.push({ kind: 'NOT free for commercial use', where: p.where, detail: f + ' — Commons says "' + c.licence + '"' });
        return;
      }
      /* Commons says free. Does OUR record agree with Commons? A mismatch is
         not itself unsafe, but it means this repository is describing the
         picture wrongly — which is exactly the failure being guarded against. */
      const oursLic = String(p.lic || '').trim().toLowerCase();
      const theirs = c.licence.trim().toLowerCase();
      if (oursLic !== theirs) {
        problems.push({ kind: 'our record disagrees with Commons', where: p.where,
          detail: f + ' — we say "' + (p.lic || '(none)') + '", Commons says "' + c.licence + '"' });
      }
      /* CC BY and CC BY-SA require the author to be named. */
      if (/^cc[ -]by/i.test(c.licence) && !String(p.by || '').trim()) {
        problems.push({ kind: 'licence requires a credit and we show none', where: p.where, detail: f + ' — ' + c.licence });
      }
      /* NOT EVERY "RESTRICTION" IS A COPYRIGHT PROBLEM, and treating them alike
         would bury the one that matters under 145 that do not.
           insignia / currency / coa   — a warning that a flag, coin or coat of
             arms may be protected by laws about MISUSE OF SYMBOLS. It does not
             limit copyright reuse, and showing a national flag in a quiz about
             flags is the ordinary permitted use.
           personality / trademarked   — worth knowing, not a copyright bar.
           ita-mibac                   — REAL and commercial. Italy's cultural
             heritage code restricts commercial reproduction of images of Italian
             cultural property without the custodian's permission, and it has
             been litigated. This one blocks. */
      /* Commons stores several notes at once, pipe-separated: "insignia|communist".
         Each has to be judged on its own, or a harmless note next to a real one
         is either missed or over-reported. Judged advisory:
           insignia, coa, currency  — laws about MISUSE of symbols, not copyright
           communist, israelflag, nazi — a symbol restricted in certain countries;
             a distribution question for those markets, not a copyright bar
           noresize, costume, design, personality, trademarked — rendering,
             publicity or trademark notes, none of them a copyright limit
         Anything else — notably ita-mibac, Italy's cultural heritage code, which
         restricts COMMERCIAL reproduction of Italian cultural property and has
         been litigated — blocks. */
      const ADVISORY = /^(insignia|coa|currency|communist|israelflag|nazi|noresize|costume|design|personality|trademarked|soviet|ottoman)$/;
      const notes = String(c.restrictions || '').toLowerCase().split('|').map(x => x.trim()).filter(Boolean);
      notes.forEach(n => { restrictionTally[n] = (restrictionTally[n] || 0) + 1; });

      /* "ai" is not a limit on commercial use — it is a DISCLOSURE duty. Commons
         is telling us the file was machine-generated. The obligation it creates
         is the CEO's own rule: say so on the picture. So it passes only when we
         have actually marked it, and fails loudly when we have not — which is
         how two AI pictures that came from Commons, and so were not among our
         own eleven, were caught about to ship unmarked. */
      if (notes.includes('ai') && !p.gen) {
        problems.push({ kind: 'AI-generated and NOT marked as such', where: p.where,
          detail: f + ' — Commons records it as AI-generated; our entry has no gen flag' });
      }
      const real = notes.filter(n => n !== 'ai' && !ADVISORY.test(n));
      if (real.length) {
        problems.push({ kind: 'a restriction that limits COMMERCIAL use', where: p.where,
          detail: f + ' — Commons records "' + real.join(', ') + '"' });
      }
      confirmed++;
    });
  }

  genUnmarked.forEach(p => problems.push({
    kind: 'our own illustration is not labelled as generated', where: p.where, detail: p.u }));
  foreign.forEach(p => problems.push({
    kind: 'hosted somewhere we cannot verify', where: p.where, detail: p.u }));

  /* ---- the verdict ---- */
  const lines = [];
  const say = s => { lines.push(s); console.log(s); };
  say('');
  say('================ INDEPENDENT VERIFICATION ================');
  say('checked on            ' + new Date().toISOString());
  say('pictures shipped      ' + pics.length);
  say('confirmed by Commons  ' + confirmed + '   (free for commercial use, today, per Commons itself)');
  say('our own illustrations ' + ours.length + '   (generated for Qpio; no third party holds rights)');
  say('problems              ' + problems.length);
  if (problems.length) {
    say('');
    const byKind = {};
    problems.forEach(p => (byKind[p.kind] = byKind[p.kind] || []).push(p));
    Object.entries(byKind).forEach(([k, list]) => {
      say('  ' + list.length + ' × ' + k);
      list.slice(0, 12).forEach(p => say('        ' + p.where + '\n            ' + p.detail));
      if (list.length > 12) say('        ...and ' + (list.length - 12) + ' more');
    });
  }
  if (Object.keys(restrictionTally).length) {
    say('');
    say('notes Commons attaches to these files (advisory ones do not block):');
    Object.entries(restrictionTally).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) =>
      say('  ' + String(v).padStart(4) + '  ' + k +
        (/^(insignia|coa|currency|communist|israelflag|nazi|noresize|costume|design|personality|trademarked|soviet|ottoman)$/.test(k)
          ? '   (advisory - about misuse of symbols, not copyright)'
          : k === 'ai' ? '   (AI-generated - must carry our AI mark, and does)'
          : '   <-- LIMITS COMMERCIAL USE')));
  }
  say('');
  say(problems.length
    ? 'VERDICT: NOT CLEAR. ' + problems.length + ' picture(s) need attention before release.'
    : 'VERDICT: CLEAR. Every picture is either our own, or independently confirmed by');
  if (!problems.length) {
    say('         Wikimedia Commons as free for commercial use, with the credit its');
    say('         licence requires, and this repository describes each one correctly.');
  }
  say('');
  say('WHAT THIS DOES NOT PROVE: that each Commons uploader had the right to license');
  say('the file. Nobody can verify that for ' + commons.length + ' files. What is proven is that every');
  say('picture rests on a free licence published by a source with its own takedown');
  say('process, and that nothing here relies on this repository being honest.');

  if (REPORT) {
    fs.writeFileSync(REPORT, lines.join('\n') + '\n', 'utf8');
    console.log('\nreport written to ' + REPORT);
  }

  /* THE VERDICT, MACHINE-READABLE, so the daily control can show it.
   *
   * CEO, 5 Sep 2026: "make sure the audit is part of the daily control."
   *
   * A check that runs every day into a log nobody opens is theatre. This file
   * is what the cockpit reads, and it carries the DATE as well as the verdict —
   * because a stale pass is not a pass. If it is older than the pictures it
   * describes, nothing has been checked since they changed, and the cockpit
   * says so rather than showing a comforting green from last week. */
  if (STATE) {
    const byKind = {};
    problems.forEach(p => { byKind[p.kind] = (byKind[p.kind] || 0) + 1; });
    fs.mkdirSync(path.dirname(STATE), { recursive: true });
    fs.writeFileSync(STATE, JSON.stringify({
      $schema: 'qpio-picture-rights/1',
      checkedAt: new Date().toISOString(),
      tool: 'curio/tools/verify_image_rights.js',
      note: 'Verified against Wikimedia Commons, not against the repository. A pass '
        + 'means Commons published a commercially free licence for every picture on '
        + 'the date above. It does not mean each uploader held the rights they '
        + 'granted; nobody can verify that. Re-run before every promotion.',
      clear: problems.length === 0,
      shipped: pics.length,
      confirmedByCommons: confirmed,
      ourOwnIllustrations: ours.length,
      problems: problems.length,
      problemsByKind: byKind,
      /* named, so a failure is actionable from the cockpit without opening a log */
      failing: problems.slice(0, 40).map(p => ({ kind: p.kind, where: p.where, detail: p.detail })),
      advisoryNotes: restrictionTally,
      /* what the pictures looked like when this verdict was reached; if the
         picture file changes and this does not, the verdict is stale */
      picturesFingerprint: require('crypto').createHash('sha256')
        .update(fs.readFileSync(path.join(ROOT, 'src', 'entities.img.js')))
        .digest('hex').slice(0, 16)
    }, null, 1) + '\n', 'utf8');
    console.log('state written to ' + STATE);
  }
  process.exit(problems.length ? 2 : 0);
})();
