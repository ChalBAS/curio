/* DAILY OVERRIDES — resolver contract test (release control, 2026-08-21).
 *
 * The resolver ships inside the GENERATED src/daily.overrides.js. Its
 * contract: serve a CEO-approved five for a date ONLY when every named bank
 * position maps to a card in that day's dealt window; on any mismatch return
 * null so the walk proceeds untouched. This test pins that contract.
 *
 * Run: node tools/daily_overrides.test.js   (also part of npm test)
 */

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'daily.overrides.js'), 'utf8'), sandbox);
const OV = sandbox.window.CURIO_DAILY_OVERRIDES;

let failures = 0;
function check(name, cond) {
  if (cond) console.log('  ok  ' + name);
  else { failures++; console.error('FAIL  ' + name); }
}

check('module exposes days + resolve', OV && typeof OV.resolve === 'function' && typeof OV.days === 'object');

/* a fake window of 8 cards with bank positions 101..108 */
const win = [];
for (let i = 0; i < 8; i++) win.push({ q: 'card' + i, bank: 101 + i });
const indexOf = c => c.bank;

/* no override for the date -> null */
check('unknown date -> null', OV.resolve('2099-01-01', win, indexOf, 5) === null);

/* a valid override serves exactly the named cards, in order */
OV.days['2099-01-02'] = [103, 101, 108, 105, 102];
const five = OV.resolve('2099-01-02', win, indexOf, 5);
check('valid override -> five cards', Array.isArray(five) && five.length === 5);
check('override order respected', five && five.map(c => c.bank).join(',') === '103,101,108,105,102');

/* a card outside the window -> null (fail-safe) */
OV.days['2099-01-03'] = [103, 101, 999, 105, 102];
check('out-of-window index -> null', OV.resolve('2099-01-03', win, indexOf, 5) === null);

/* wrong count -> null */
OV.days['2099-01-04'] = [103, 101];
check('wrong count -> null', OV.resolve('2099-01-04', win, indexOf, 5) === null);

/* shipped file must carry no hand-edited overrides that bypass review:
 * the committed default is empty (the exporter fills it per release) */
const shipped = JSON.parse(JSON.stringify(OV.days));
delete shipped['2099-01-02']; delete shipped['2099-01-03']; delete shipped['2099-01-04'];
check('shipped DAYS is empty by default', Object.keys(shipped).length === 0);

if (failures) { console.error(failures + ' failure(s)'); process.exit(1); }
console.log('daily overrides resolver: all checks passed');
