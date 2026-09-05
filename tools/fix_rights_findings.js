#!/usr/bin/env node
/* CLOSE WHAT THE INDEPENDENT CHECK FOUND.
 *
 * verify_image_rights.js goes back to Wikimedia Commons rather than trusting
 * this repository, and found four things the repository's own audit had missed.
 * This fixes each one, then the check is run again to prove it.
 *
 *   1. THE COLOSSEUM carries "ita-mibac" — Italy's cultural heritage code,
 *      which restricts COMMERCIAL reproduction of images of Italian cultural
 *      property without the custodian's permission. It has been litigated
 *      (the Uffizi and the Accademia have both sued over it). Replaced.
 *
 *   2. TWO PICTURES ARE THEMSELVES AI-GENERATED and came from Commons, so they
 *      were not among our own eleven generated illustrations and would have
 *      shipped WITHOUT the "AI generated" mark. Commons labels them; we did not.
 *      Marked.
 *
 *   3. ONE LICENCE RECORD IS WRONG — we describe the Majapahit naval flag as
 *      CC BY-SA 3.0; Commons says public domain. Not unsafe, but the repository
 *      describing a picture wrongly is the exact failure being guarded against.
 *
 *   4. EIGHT FLAGS are served from en.wikipedia rather than Commons, where the
 *      licence cannot be checked by the tool. Repointed at Commons.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const P = path.join(ROOT, 'src', 'entities.img.js');
let text = fs.readFileSync(P, 'utf8');
const UA = 'QpioImageRightsCheck/1.0 (https://qpio.app) node-fetch';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const strip = v => String(v == null ? '' : v).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const FREE = /^(public domain|cc0|cc[ -]by|fal\b|godl-india)/i;

const ENTRY = slug => new RegExp('^\\s*"' + slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
  '":\\s*\\{[^\\n]*\\},\\s*$', 'm');

function readEntry(slug) {
  const m = ENTRY(slug).exec(text);
  return m ? m[0] : null;
}
function writeEntry(slug, obj) {
  const line = '  ' + JSON.stringify(slug) + ': {u:' + JSON.stringify(obj.u) +
    ',by:' + JSON.stringify(obj.by || '') + ',lic:' + JSON.stringify(obj.lic || '') +
    ',p:' + JSON.stringify(obj.p || '') +
    (obj.alt ? ',alt:' + JSON.stringify(obj.alt) : '') +
    (obj.gen ? ',gen:true' : '') + '},';
  const cur = readEntry(slug);
  if (!cur) { console.log('  ! no entry for ' + slug); return false; }
  text = text.replace(cur, line);
  return true;
}
function currentOf(slug) {
  const line = readEntry(slug);
  if (!line) return null;
  const g = (k) => { const m = new RegExp(k + ':("(?:[^"\\\\]|\\\\.)*")').exec(line); return m ? JSON.parse(m[1]) : ''; };
  const alt = /alt:("(?:[^"\\]|\\.)*")/.exec(line);
  return { u: g('u'), by: g('by'), lic: g('lic'), p: g('p'), alt: alt ? JSON.parse(alt[1]) : '' };
}

async function commonsInfo(titles) {
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2' +
    '&prop=imageinfo&iiprop=extmetadata|url&iiurlwidth=500&titles=' + encodeURIComponent(titles.join('|'));
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const j = await res.json();
  const out = {};
  const back = {};
  ((j.query && j.query.normalized) || []).forEach(n => { back[n.to] = n.from; });
  ((j.query && j.query.pages) || []).forEach(pg => {
    const ii = (pg.imageinfo || [{}])[0] || {};
    const meta = ii.extmetadata || {};
    out[back[pg.title] || pg.title] = {
      missing: pg.missing === true,
      url: (ii.thumburl || ii.url || '').split('?')[0]
        .replace('https://thumb.wikimedia.org/', 'https://upload.wikimedia.org/'),
      licence: strip((meta.LicenseShortName || {}).value),
      artist: strip((meta.Artist || {}).value).split('\n')[0].slice(0, 60),
      restrictions: strip((meta.Restrictions || {}).value)
    };
  });
  return out;
}

async function findReplacement(term, rejectRestriction) {
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2' +
    '&generator=search&gsrnamespace=6&gsrlimit=24&gsrsearch=' + encodeURIComponent(term) +
    '&prop=imageinfo&iiprop=extmetadata|url&iiurlwidth=500';
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const j = await res.json();
  for (const pg of ((j.query && j.query.pages) || [])) {
    const t = pg.title || '';
    if (!/\.(jpg|jpeg|png)$/i.test(t)) continue;
    if (/logo|screenshot|wordmark/i.test(t)) continue;
    const ii = (pg.imageinfo || [{}])[0] || {};
    const meta = ii.extmetadata || {};
    const lic = strip((meta.LicenseShortName || {}).value);
    const restr = strip((meta.Restrictions || {}).value).toLowerCase();
    const artist = strip((meta.Artist || {}).value).split('\n')[0].slice(0, 60);
    const u = (ii.thumburl || ii.url || '').split('?')[0]
      .replace('https://thumb.wikimedia.org/', 'https://upload.wikimedia.org/');
    if (!u.includes('/wikipedia/commons/')) continue;
    if (!FREE.test(lic)) continue;
    if (rejectRestriction && rejectRestriction.test(restr)) continue;
    if (/^cc[ -]by/i.test(lic) && (!artist || /no machine-readable|unknown/i.test(artist))) continue;
    return { u, by: artist, lic, p: 'https://commons.wikimedia.org/wiki/' + t.replace(/ /g, '_').replace(':', '%3A') };
  }
  return null;
}

(async () => {
  let changed = 0;

  /* ---- 1. the Colosseum: Italian cultural heritage restriction ---- */
  console.log('1. Colosseum — replacing a picture restricted for commercial use in Italy');
  const cur = currentOf('Colosseum');
  const rep = await findReplacement('Colosseum Rome amphitheatre', /ita-mibac/);
  if (rep) {
    rep.alt = cur && cur.alt;
    if (writeEntry('Colosseum', rep)) { changed++; console.log('   -> ' + rep.lic + ' · ' + (rep.by || 'public domain') + '\n      ' + rep.u.slice(0, 78)); }
  } else console.log('   ! no unrestricted Colosseum picture found on Commons — needs a human');
  await sleep(700);

  /* ---- 2. Commons pictures that are themselves AI-generated ---- */
  console.log('\n2. Pictures Commons marks as AI-generated — adding our AI mark');
  for (const slug of ['Hallucination_(artificial_intelligence)', 'Prompt_engineering']) {
    const c = currentOf(slug);
    if (!c) { console.log('   ! no entry: ' + slug); continue; }
    c.gen = true;
    /* the reader-facing legend comes from the gen flag; the licence line still
       records where it came from, because it is still someone else's file */
    if (writeEntry(slug, c)) { changed++; console.log('   -> ' + slug + ' now marked as AI-generated'); }
  }

  /* ---- 3. our record disagrees with Commons ---- */
  console.log('\n3. Correcting a licence this repository had recorded wrongly');
  const maj = currentOf('Majapahit');
  if (maj) {
    const info = await commonsInfo(['File:Naval_flag_of_Majapahit_Kingdom.svg']);
    const t = info['File:Naval_flag_of_Majapahit_Kingdom.svg'];
    if (t && t.licence) {
      console.log('   we said "' + maj.lic + '", Commons says "' + t.licence + '"');
      maj.lic = t.licence;
      if (t.artist) maj.by = t.artist;
      if (writeEntry('Majapahit', maj)) changed++;
    }
  }
  await sleep(700);

  /* ---- 4. flags served from en.wikipedia rather than Commons ---- */
  console.log('\n4. Eight flags served from en.wikipedia — repointing at Commons');
  const flags = ['Flag_of_Brazil', 'Flag_of_France', 'Flag_of_Germany', 'Flag_of_India',
                 'Flag_of_Italy', 'Flag_of_Japan', 'Flag_of_Poland', 'Flag_of_Sweden'];
  for (const slug of flags) {
    const c = currentOf(slug);
    if (!c) { console.log('   ! no entry: ' + slug); continue; }
    const file = 'File:' + slug + '.svg';
    let info;
    try { info = await commonsInfo([file]); } catch (e) { console.log('   ! ' + slug + ': ' + e.message); continue; }
    const t = info[file];
    if (!t || t.missing || !t.url) { console.log('   ! ' + slug + ': not on Commons under that name'); continue; }
    if (!FREE.test(t.licence)) { console.log('   ! ' + slug + ': Commons licence is "' + t.licence + '" — not free, left alone'); continue; }
    c.u = t.url; c.lic = t.licence; c.by = t.artist || c.by;
    c.p = 'https://commons.wikimedia.org/wiki/' + file.replace(/ /g, '_').replace(':', '%3A');
    if (writeEntry(slug, c)) { changed++; console.log('   -> ' + slug + '  ' + t.licence); }
    await sleep(600);
  }

  if (changed) {
    fs.writeFileSync(P, text, 'utf8');
    console.log('\nwrote ' + changed + ' corrections to src/entities.img.js');
    console.log('now run: node tools/verify_image_rights.js');
  } else {
    console.log('\nnothing changed');
  }
})();
