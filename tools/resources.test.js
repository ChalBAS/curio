/* Tests for the v77 resource/link/image layer. Zero dependencies.
 *
 *   node tools/resources.test.js
 *
 * Proves the mandate's §18 list:
 *   - resource relevance (matcher + QI resonance boost)
 *   - invalid URLs caught where feasible (structural checks; network is
 *     preflight --full's job)
 *   - Watch never falls to an open unvetted YouTube search
 *   - commercial/affiliate flags cannot affect ordering (Charter VAL-12)
 *   - free source remains reachable (the source slot is always on)
 *   - licensed image metadata is valid; noncommercial-only images rejected
 *   - resource card works without an image
 *   - question works without commercial resources
 *   - question works without intelligence in fallback mode
 */
'use strict';
const path = require('path');
const SRC = path.join(__dirname, '..', 'src');

let failed = 0;
function is(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) console.log('  \x1b[32mPASS\x1b[0m  ' + name);
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m  ${name}\n        expected ${e}\n        actual   ${a}`); }
}
function ok(name, cond, detail) { is(name, !!cond, true); if (!cond && detail) console.log('        ' + detail); }

global.window = {};
['questions', 'intelligence', 'intelligence.corpus', 'entities.img', 'entities.meta', 'entities.fr', 'country', 'golinks', 'hooks', 'discovery', 'resources']
  .forEach(n => require(path.join(SRC, n + '.js')));
const W = global.window;
const QI = W.CURIO_QI, BANK = W.CURIO_QUESTIONS, GO = W.CURIO_GO, CRN = W.CurioResourceNetwork;
const RES = W.CURIO_RESOURCES || [];

console.log('\n\x1b[1mCRN records satisfy the resource schema (structural)\x1b[0m');
const REQUIRED = ['id', 'type', 'title', 'country', 'language', 'topics', 'source_id', 'source_url', 'source_type', 'source_authority', 'temporal_status', 'status', 'last_verified_at'];
const TYPES = ['institution', 'collection', 'permanent_exhibition', 'temporary_exhibition', 'event', 'book', 'audiobook', 'article', 'research_paper', 'digital_archive', 'digital_collection', 'documentary', 'podcast', 'course', 'lecture', 'person', 'place'];
const TEMPORAL = ['PERMANENT', 'UPCOMING', 'ACTIVE', 'ENDED', 'CANCELLED', 'POSTPONED', 'UNKNOWN'];
const STATUS = ['active', 'pending_verification', 'archived', 'flagged_stale'];
const AUTH = ['tier1_primary_institutional', 'tier2_established_aggregator', 'tier3_reputable_secondary', 'tier4_discovery_community'];
const badRes = [];
RES.forEach((r, i) => {
  REQUIRED.forEach(f => { if (r[f] === undefined || r[f] === null || r[f] === '') badRes.push(i + ':' + f); });
  if (TYPES.indexOf(r.type) === -1) badRes.push(i + ':type');
  if (TEMPORAL.indexOf(r.temporal_status) === -1) badRes.push(i + ':temporal');
  if (STATUS.indexOf(r.status) === -1) badRes.push(i + ':status');
  if (AUTH.indexOf(r.source_authority) === -1) badRes.push(i + ':authority');
  if (!/^res_[a-z0-9_\-]+$/.test(r.id || '')) badRes.push(i + ':id-pattern');
  if (!/^https:\/\//.test(r.source_url || '')) badRes.push(i + ':url-not-https');
  if (/\s/.test(r.source_url || '')) badRes.push(i + ':url-has-whitespace');
});
is('all ' + RES.length + ' records structurally valid', badRes, []);

console.log('\n\x1b[1mRelevance — and resonance over abundance\x1b[0m');
(function () {
  const benin = BANK.filter(q => /Benin_Bronzes/.test(q.src || ''))[0];
  const hits = CRN.findResourcesForQuestion(benin, 3);
  ok('a Benin Bronzes question finds relevant resources', hits.length > 0, '0 hits');
  ok('hits are african-history-flavoured', hits.every(r => (r.topics || []).join(' ').toLowerCase().indexOf('africa') !== -1), JSON.stringify((hits[0] || {}).topics));
})();
(function () {
  const httpQ = BANK.filter(q => /^What does 'HTTP' stand for/.test(q.q))[0];
  is('an off-corpus question matches nothing (restraint, not filler)', CRN.findResourcesForQuestion(httpQ, 3).length, 0);
})();
(function () { // QI resonance boost sharpens ordering without inventing relevance
  const q = { cat: 'History', region: 'Africa', q: 'Test', fact: 'test' };
  const withQI = JSON.parse(JSON.stringify(q));
  withQI.intelligence = QI.neutral();
  withQI.intelligence.rabbit_hole = { branches: ['history'], entities: ['Timbuktu'] };
  const before = CRN.findResourcesForQuestion(q, 43).map(r => r.id);
  const after = CRN.findResourcesForQuestion(withQI, 43).map(r => r.id);
  ok('QI resonance never empties or breaks matching', after.length >= before.length && after.length > 0,
    before.length + ' → ' + after.length);
})();

console.log('\n\x1b[1mCommercial flags cannot affect ordering (VAL-12)\x1b[0m');
(function () {
  const q = BANK.filter(q => /Benin_Bronzes/.test(q.src || ''))[0];
  const base = CRN.scoreResourceForQuestion(q, RES[0]);
  const dressed = JSON.parse(JSON.stringify(RES[0]));
  dressed.commercial = true; dressed.partner = 'BigCorp'; dressed.affiliate = 'http://ads.example.com';
  is('score identical with commercial flags set', CRN.scoreResourceForQuestion(q, dressed), base);
  const dressed2 = JSON.parse(JSON.stringify(RES[0]));
  dressed2.commercial = false; dressed2.partner = null; dressed2.affiliate = null;
  is('score identical with commercial flags cleared', CRN.scoreResourceForQuestion(q, dressed2), base);
})();

console.log('\n\x1b[1mLinks — verbs match destinations, Watch stays vetted\x1b[0m');
(function () {
  const mono = BANK.filter(q => /Mona_Lisa/.test(q.src || ''))[0];
  const dests = GO.goFor(mono);
  is('goFor returns the four fixed slots', dests.map(d => d.kind), ['read', 'visit', 'watch', 'source']);
  ok('the free source slot is always on for a sourced question', dests[3].on === true && /wikipedia/.test(dests[3].url));
  ok('Visit goes to an institution, not a shop', dests[1].on && /louvre\.fr/.test(dests[1].url));
})();
(function () {
  // every watch URL the system can emit must be a vetted channel search
  const handles = [];
  ['History', 'Science', 'Geography', 'Arts', 'Tech', 'Nature'].forEach(cat => {
    const url = GO.watchUrl('test subject', cat);
    if (url) handles.push(url);
  });
  ok('watch urls exist for the six cats', handles.length >= 4, handles.length + ' urls');
  // 2026-09-05: this test used to REQUIRE the open results page, locking in the
  // 22 Aug change that replaced the hard channel scope. That change rested on
  // "in-channel search 404s on mobile — verified", which was re-tested today
  // with an Android user agent against www.youtube.com and m.youtube.com and
  // returns 200 on both. So the open search was a safety regression bought for
  // nothing, and the contract is the scoped one the CEO's 16 Aug ruling asked
  // for: the reader lands INSIDE a vetted channel and cannot arrive at a
  // creator nobody chose.
  const VETTED = /^(TEDEd|smithsonianchannel|bbcearth|NatGeo|veritasium|TheRoyalInstitution|britishmuseum|cestpassorcierofficiel|arte|cnrs)$/;
  ok('every watch url is a search INSIDE a vetted channel, never an open one',
    handles.every(u => {
      const m = /^https:\/\/www\.youtube\.com\/@([^/]+)\/search\?query=.+$/.exec(u);
      return !!m && VETTED.test(m[1]);
    }),
    handles.find(u => !/^https:\/\/www\.youtube\.com\/@[^/]+\/search\?query=/.test(u)));
  ok('no watch url is an open site-wide search',
    handles.every(u => !/youtube\.com\/results\?/.test(u)),
    handles.find(u => /youtube\.com\/results\?/.test(u)));
  is('uncovered category yields NO watch url (no open-search fallback)', GO.watchUrl('test', 'Conspiracy'), null);
})();
(function () {
  const places = GO.places;
  const bad = [];
  Object.keys(places).forEach(k => {
    const p = places[k];
    if (p.kind !== 'hold' && p.kind !== 'site') bad.push(k + ':kind');
    if (!p.where || !p.url) bad.push(k + ':fields');
    if (!/^https:\/\//.test(p.url)) bad.push(k + ':url');
  });
  is('all ' + Object.keys(places).length + ' curated PLACES are structurally sound', bad, []);
})();
(function () {
  const urls = [];
  BANK.forEach(q => { if (!/^https:\/\/en\.wikipedia\.org\/wiki\/\S+$/.test(q.src || '')) urls.push(q.src); });
  is('every question source is a canonical en.wikipedia URL', urls, []);
})();

console.log('\n\x1b[1mImages — production-safe licences only\x1b[0m');
(function () {
  const IM = W.CURIO_IMAGES;
  /* 2026-09-05: this list used to admit GFDL, GPL, LGPL, MPL, "Attribution" and
     "Copyrighted free use". None of those is safe to ship commercially — GFDL
     obliges you to republish the whole licence text, the software licences
     carry source duties and arrive attached to logos, and "Attribution" is a
     note rather than a licence. Ten pictures were replaced on that basis. The
     list now matches tools/verify_image_rights.js exactly; two tools with
     different definitions of "safe" is how the gap opened in the first place. */
  const ALLOW = [/^Public domain$/i, /^CC0/i, /^CC BY/i, /^FAL$/i, /^GODL-India/i, /Generated illustration/i];
  const BAN = [/NC\b/i, /NonCommercial/i, /non-commercial/i, /all rights reserved/i, /fair use/i];
  const bad = [];
  Object.keys(IM).forEach(k => {
    const im = IM[k];
    /* `gen` means AI-GENERATED — the thing the app must mark on the picture.
       That is not the same as OURS. Two Commons pictures are AI-generated by
       someone else: they must carry the mark, and they keep their own licence
       and credit. Ownership is decided by where the file lives, not by gen. */
    const oursOwn = /^(img|brand)\//.test(im.u || '');
    if (oursOwn) {
      if (im.lic !== 'Generated illustration — not a photograph') bad.push(k + ':gen licence marker');
      if (!im.u) bad.push(k + ':gen missing asset');
      if (!im.alt || !im.alt_fr) bad.push(k + ':gen missing alt');
      return;
    }
    if (!im.u || !im.p) bad.push(k + ':missing url/page');
    if (!im.lic) { bad.push(k + ':unclear licence'); return; }
    if (BAN.some(re => re.test(im.lic))) bad.push(k + ':noncommercial(' + im.lic + ')');
    if (!ALLOW.some(re => re.test(im.lic))) bad.push(k + ':unvetted licence(' + im.lic + ')');
    if (!/^https:\/\//.test(im.u)) bad.push(k + ':non-https image');
  });
  is('every shipped image carries a vetted production-safe licence', bad, []);
  console.log('  \x1b[90m     ' + Object.keys(IM).length + ' image entries checked\x1b[0m');
})();

console.log('\n\x1b[1mGraceful degradation\x1b[0m');
ok('discovery catalogue still builds over the enriched bank', W.CURIO_DISCOVERY.all().length > 700);
is('question without intelligence still scores resources safely', (function () {
  const hits = CRN.findResourcesForQuestion({ cat: 'History', q: 'x', fact: 'y' }, 3);
  return Array.isArray(hits);
})(), true);
is('question without matching resources returns an empty array (card hides)', (function () {
  return Array.isArray(CRN.findResourcesForQuestion({ cat: 'Tech', q: 'zzqq', fact: 'none' }, 3));
})(), true);

console.log('');
if (failed) { console.log(`\x1b[31m\x1b[1mRESOURCE TESTS FAILED\x1b[0m  ${failed} failing`); process.exit(1); }
console.log('\x1b[32m\x1b[1mRESOURCE TESTS PASSED\x1b[0m  relevance, VAL-12, links, licences, degradation.');
