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
  global.window = {};
  // country.js provides window.CURIO_COUNTRY; golinks reads it inside readUrl.
  require(path.join(ROOT, 'src', 'country.js'));
  require(path.join(ROOT, 'src', 'golinks.js'));
  const GO = global.window.CURIO_GO;
  if (!GO) throw new Error('golinks.js did not register window.CURIO_GO');

  Object.keys(GO.places).forEach((k) => {
    const p = GO.places[k];
    hosts.add(new URL(p.url).hostname.toLowerCase());
    if (p.tour) hosts.add(new URL(p.tour).hostname.toLowerCase());   // verified official visitor page
  });

  // readUrl: one public destination (openlibrary.org) since 2026-08-22 (#70) —
  // the country-walk stays, so a future route change can never drift the list.
  ['US', 'GB', null].forEach((cc) => {
    global.window.CURIO_COUNTRY = { get: () => cc };
    hosts.add(new URL(GO.readUrl('probe')).hostname.toLowerCase());
  });

  ['History', 'Science', 'Geography', 'Arts', 'Tech', 'Nature'].forEach((cat) => {
    ['en', 'fr'].forEach((lang) => {
      global.window.QLANG = lang;
      const u = GO.watchUrl('probe', cat);
      if (u) hosts.add(new URL(u).hostname.toLowerCase());
    });
  });

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
