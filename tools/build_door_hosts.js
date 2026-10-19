/* DOOR_HOSTS generator — Gate 5 door instrument (GATE-5-DOOR-INSTRUMENT.md §2.1B).
 *
 * DOOR_HOSTS is a SECURITY CONTROL, not an analytics convenience. Without it
 * /go/read/lead?u=… is an open redirector under Qpio's own domain, immediately
 * usable for phishing. The allow-list is therefore GENERATED from the one file
 * that decides where a door may point — src/golinks.js — so the redirect
 * allow-list and the renderer can never drift apart. Same one-array-two-
 * consumers discipline robots.txt already uses in worker/index.js.
 *
 *   node tools/build_door_hosts.js            regenerate worker/door_hosts.js
 *   node tools/build_door_hosts.js --check    exit 1 if the generated file is stale
 *
 * Sources of truth read out of golinks.js by executing it under a window shim
 * (the same technique tools/resources.test.js uses):
 *   - every curated PLACES url            → the visit door's destinations
 *   - readUrl() (any route)                  → openlibrary.org (public, no login — #70)
 *   - watchUrl() for every category       → www.youtube.com (vetted channel searches)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'worker', 'door_hosts.js');

function collectHosts() {
  const hosts = new Set();
  /* only an absolute http(s) address names a host; anything else is skipped rather than
     crashing the build (20 Oct 2026: a non-absolute readUrl stopped this tool from v124 on,
     and the list sat on its 22 Aug contents) */
  const addUrl = (u) => { if (typeof u === 'string' && /^https?:\/\//i.test(u)) { try { hosts.add(new URL(u).hostname.toLowerCase()); } catch (e) { /* not an address */ } } };
  global.window = {};
  // country.js provides window.CURIO_COUNTRY; golinks reads it inside readUrl.
  require(path.join(ROOT, 'src', 'country.js'));
  /* the per-question doors that, since 6 Oct 2026, decide what a reader actually gets
     (doors.chosen.js wins over doors.bank.js, which wins over golinks.js's own tables) */
  for (const f of ['doors.chosen.js', 'doors.bank.js']) { const fp = path.join(ROOT, 'src', f); if (fs.existsSync(fp)) require(fp); }
  require(path.join(ROOT, 'src', 'golinks.js'));
  const GO = global.window.CURIO_GO;
  if (!GO) throw new Error('golinks.js did not register window.CURIO_GO');

  Object.keys(GO.places).forEach((k) => {
    const p = GO.places[k];
    addUrl(p.url);
    if (p.tour) addUrl(p.tour);   // verified official visitor page
  });

  // readUrl: one public destination (openlibrary.org) since 2026-08-22 (#70) —
  // the country-walk stays, so a future route change can never drift the list.
  ['US', 'GB', null].forEach((cc) => {
    global.window.CURIO_COUNTRY = { get: () => cc };
    addUrl(GO.readUrl('probe'));
  });

  ['History', 'Science', 'Geography', 'Arts', 'Tech', 'Nature'].forEach((cat) => {
    ['en', 'fr'].forEach((lang) => {
      global.window.QLANG = lang;
      addUrl(GO.watchUrl('probe', cat));
    });
  });

  /* every address in the two door files (read, visit and source links, both languages) */
  const walk = (o) => {
    if (!o || typeof o !== 'object') return;
    for (const [k, v] of Object.entries(o)) {
      if ((k === 'u' || k === 'url' || k === 'tour') && typeof v === 'string') addUrl(v);
      else if (v && typeof v === 'object') walk(v);
    }
  };
  walk(global.window.CURIO_DOORS_CHOSEN);
  walk(global.window.CURIO_DOORS_BANK);

  return [...hosts].sort();
}

function render(hosts) {
  return `// GENERATED FILE — do not hand-edit.
// Regenerate:  node tools/build_door_hosts.js
// Verify:      node tools/build_door_hosts.js --check   (run it in CI/preflight)
//
// The outbound destination allow-list for /go/ (Gate 5 §2.1B). Derived from
// src/golinks.js — the only file that decides where a door may point — so the
// redirect allow-list cannot drift from the renderer. This is the OUTBOUND
// (destination) list: it is a security control against an open redirector and
// reads nothing about the reader. It needs no privacy ruling
// (GATE-5-DOOR-INSTRUMENT.md Part 4 draws that distinction).
export const DOOR_HOSTS = ${JSON.stringify(hosts, null, 2)};
`;
}

const fresh = render(collectHosts());
if (process.argv.includes('--check')) {
  const onDisk = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (onDisk.replace(/\r\n/g, '\n') !== fresh.replace(/\r\n/g, '\n')) {
    console.error('DOOR_HOSTS is STALE: worker/door_hosts.js no longer matches src/golinks.js.');
    console.error('Regenerate with: node tools/build_door_hosts.js');
    process.exit(1);
  }
  console.log('DOOR_HOSTS in sync with src/golinks.js (' + (fresh.match(/"/g).length / 2) + ' strings).');
} else {
  fs.writeFileSync(OUT, fresh, 'utf8');
  console.log('Wrote ' + OUT);
}
