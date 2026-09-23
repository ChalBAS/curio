/* ONE ENGLISH STRING, ONE FRENCH TRANSLATION (v103).
 *
 * The French dictionary in src/i18n.js is a plain object keyed by the exact
 * English string. A key written twice is not an error in JavaScript - the later
 * one silently wins everywhere. On 23 Sep 2026 a new button label "Go" (« C'est
 * parti ») was added below the existing "Go" of the places shelf (« Y aller »),
 * and renamed that shelf for every French reader. The panel caught it by eye;
 * this catches it by rule.
 *   node tools/i18n_dupes.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'i18n.js'), 'utf8');
const start = src.indexOf('fr: {');
if (start < 0) { console.error('  i18n: the French dictionary was not found'); process.exit(1); }
/* the dictionary ends at the first line that closes it: two spaces, four spaces, then "}" */
const body = src.slice(start);
const keyRe = /^\s*("(?:[^"\\]|\\.)*")\s*:/gm;
const seen = new Map(), dupes = [];
let m;
while ((m = keyRe.exec(body))) {
  let k;
  try { k = JSON.parse(m[1]); } catch (e) { continue; }
  const line = src.slice(0, start + m.index).split('\n').length + 1;
  if (seen.has(k)) dupes.push(JSON.stringify(k) + ' at lines ' + seen.get(k) + ' and ' + line);
  else seen.set(k, line);
}
if (dupes.length) {
  console.log('  i18n: ' + dupes.length + ' English string(s) translated twice - the later one wins everywhere:');
  dupes.forEach((d) => console.log('    ' + d));
  process.exit(1);
}
console.log('  i18n: ' + seen.size + ' French strings, none translated twice');
