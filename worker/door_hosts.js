// GENERATED FILE — do not hand-edit.
// Regenerate:  node tools/build_door_hosts.js
// Verify:      node tools/build_door_hosts.js --check   (run it in CI/preflight)
//
// The outbound destination allow-list for /go/ (Gate 5 §2.1B). Derived from
// src/golinks.js — the only file that decides where a door may point — so the
// redirect allow-list cannot drift from the renderer. This is the OUTBOUND
// (destination) list: it is a security control against an open redirector and
// reads nothing about the reader. It needs no privacy ruling
// (GATE-5-DOOR-INSTRUMENT.md Part 4 draws that distinction).
export const DOOR_HOSTS = [
  "bookshop.org",
  "en.wikipedia.org",
  "hokusai-museum.jp",
  "pancanal.com",
  "pompeiisites.org",
  "search.worldcat.org",
  "titanicbelfast.com",
  "uk.bookshop.org",
  "visit-gem.com",
  "whc.unesco.org",
  "www.bl.uk",
  "www.britishmuseum.org",
  "www.guggenheim.org",
  "www.kws.go.ke",
  "www.louvre.fr",
  "www.metmuseum.org",
  "www.moma.org",
  "www.munchmuseet.no",
  "www.museivaticani.va",
  "www.nps.gov",
  "www.rijksmuseum.nl",
  "www.slub-dresden.de",
  "www.sydneyoperahouse.com",
  "www.toureiffel.paris",
  "www.visitstockholm.com",
  "www.youtube.com"
];
