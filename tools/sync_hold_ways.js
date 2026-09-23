/* SYNC THE WAYS TO HOLD A LIST - from the sourced file into the gym module, verbatim.
 *
 * The four ways are written from their sources by the content function in
 * curio-hq/03-Engine/question-intelligence/content/memory-techniques.json. The
 * app carries a copy in src/braingym.js (HOLD_WAYS), and tools/test_braingym.js
 * fails the build if the two differ by a single character. This is the only way
 * the copy should ever change: never edit HOLD_WAYS by hand.
 *
 *   node tools/sync_hold_ways.js            (from curio)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', '..', 'curio-hq', '03-Engine', 'question-intelligence', 'content', 'memory-techniques.json');
const GYM = path.join(__dirname, '..', 'src', 'braingym.js');

const ways = JSON.parse(fs.readFileSync(SRC, 'utf8')).techniques.map(t => ({
  id: t.id, name: t.name, how: t.how, tip: t.tip, origin: t.origin
}));
const js = fs.readFileSync(GYM, 'utf8');
const start = js.indexOf('  var HOLD_WAYS = ');
if (start < 0) { console.error('  HOLD_WAYS not found in src/braingym.js'); process.exit(1); }
const end = js.indexOf('];\n', start);
if (end < 0) { console.error('  the end of HOLD_WAYS was not found'); process.exit(1); }
const block = '  var HOLD_WAYS = ' + JSON.stringify(ways, null, 2).replace(/\n/g, '\n  ') + ';\n';
const next = js.slice(0, start) + block + js.slice(end + 3);
if (next === js) { console.log('  already in step'); process.exit(0); }
fs.writeFileSync(GYM, next);
console.log('  src/braingym.js now carries the ' + ways.length + ' ways exactly as the sourced file has them');
