/* Kids mode offers only a book checked for children (27 Oct 2026): in Kids mode the Read door
 * opens the founder's pick or a book a children's review passed (k:1); an unchecked book, and the
 * old subject-table and search fallbacks, are greyed. In the everyday mode the door opens as before.
 * Run: node tools/kids_read.test.js   (also part of npm test) */
const fs = require('fs'), path = require('path'), vm = require('vm');
function doorsFor(mode) {
  const store = { 'curio.settings': JSON.stringify({ ageMode: mode }) };
  const w = { localStorage: { getItem: k => store[k] || null, setItem() {} }, QLANG: 'en', CURIO_DOORS_BANK: {
    B1: { read: { en: { t: 'Checked for children', a: 'A', u: 'https://books.google.com/books?vid=ISBN9780000000001', k: 1 } } },
    B2: { read: { en: { t: 'Not checked', a: 'B', u: 'https://books.google.com/books?vid=ISBN9780000000002' } } },
    B3: { read: { en: { t: 'His pick', a: 'C', u: 'https://example.org/his-pick', by: 'founder' } } },
    B4: {} } };
  w.window = w;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'golinks.js'), 'utf8'), w);
  const go = w.CURIO_GO;
  const read = id => (go.goFor({ id, q: 'x', cat: 'Science', sub: '', src: 'https://en.wikipedia.org/wiki/X' }) || []).find(d => d.kind === 'read') || {};
  return { B1: read('B1'), B2: read('B2'), B3: read('B3'), B4: read('B4') };
}
let fail = 0; const t = (ok, what) => { if (!ok) { fail++; console.log('FAIL ' + what); } };
const kids = doorsFor('kids'), all = doorsFor('all');
const opens = d => !!(d.url || d.href) && d.on !== false;
t(opens(kids.B1), 'Kids: a book checked for children opens');
t(!opens(kids.B2), 'Kids: an unchecked book is greyed');
t(opens(kids.B3), 'Kids: his own pick opens');
t(!opens(kids.B4), 'Kids: no book on the question means no search fallback either');
t(opens(all.B2), 'Everyday: an unchecked book still opens');
if (fail) { console.log('kids read: ' + fail + ' failed'); process.exit(1); }
console.log('kids read: all checks passed');
