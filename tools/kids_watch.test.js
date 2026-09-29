/* Kids mode plays only a checked video (29 Sep 2026, second independent audit): in Kids
 * mode the Watch door opens a video an independent check passed, or the founder's pick;
 * any other video's door is greyed. In the everyday mode the door opens as before.
 * Run: node tools/kids_watch.test.js   (also part of npm test) */
const fs = require('fs'), path = require('path'), vm = require('vm');
function doorsFor(mode) {
  const store = { 'curio.settings': JSON.stringify({ ageMode: mode }) };
  const w = { localStorage: { getItem: k => store[k] || null, setItem() {} }, QLANG: 'en', CURIO_DOORS_BANK: {
    T1: { watch: { en: { id: 'aaaaaaaaaaa', t: 'checked', by: 'independent check' } } },
    T2: { watch: { en: { id: 'bbbbbbbbbbb', t: 'unchecked', by: 'default on his list' } } },
    T3: { watch: { en: { id: 'ccccccccccc', t: 'his pick', by: 'founder' } } } } };
  w.window = w;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'golinks.js'), 'utf8'), w);
  const go = w.CURIO_GO;
  const watch = id => (go.goFor({ id, q: 'x', cat: 'Science', sub: '', src: 'https://en.wikipedia.org/wiki/X' }) || []).find(d => d.kind === 'watch') || {};
  return { T1: watch('T1'), T2: watch('T2'), T3: watch('T3') };
}
let fail = 0; const t = (ok, what) => { if (!ok) { fail++; console.log('FAIL ' + what); } };
const kids = doorsFor('kids'), all = doorsFor('all');
t(kids.T1.video === 'aaaaaaaaaaa', 'Kids: a checked video plays');
t(!kids.T2.video && !kids.T2.on, 'Kids: an unchecked video is greyed');
t(kids.T3.video === 'ccccccccccc', 'Kids: his own pick plays');
t(all.T2.video === 'bbbbbbbbbbb', 'Everyday: the first suitable video on his list still plays');
if (fail) { console.log('kids watch: ' + fail + ' failed'); process.exit(1); }
console.log('kids watch: all checks passed');
