/* SPACE AUDIT — where every vertical pixel of an answered card actually goes.
 *
 * CEO, 2026-08-13, on the French Next-under-the-tab-bar failure: "are we sure
 * we are maximizing and optimizing the space?"
 *
 * The honest answer needs a measurement, not an opinion. This drives the real
 * app in a real browser at a real phone size, answers a question, and prints
 * the height of every element in the answered card plus the overflow. Run it
 * against a build before and after a layout change and the argument is settled
 * by numbers.
 *
 *   node tools/space_audit.js [url] [lang] [w] [h]
 *   node tools/space_audit.js https://uat.qpio.app fr 360 640
 *
 * Needs a Chrome. Uses the DevTools protocol directly — no puppeteer, no
 * install, nothing unpinned (decision S-11).
 */
'use strict';
const http = require('http');
const cp = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');

const URL_ = process.argv[2] || 'https://uat.qpio.app';
const LANG = process.argv[3] || 'fr';
const W = +(process.argv[4] || 360), H = +(process.argv[5] || 640);
const PORT = 9333;

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  path.join(os.homedir(), 'AppData/Local/Google/Chrome/Application/chrome.exe')
].find(p => fs.existsSync(p));
if (!CHROME) { console.error('No Chrome found — install path not recognised.'); process.exit(2); }

const get = url => new Promise((res, rej) => {
  http.get(url, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res(d)); }).on('error', rej);
});
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* The page script. Runs inside the app: starts the daily, answers question 1,
   then measures. Kept as a string because it is evaluated in the page. */
// Walks the WHOLE daily five, not question one. The failure the CEO hit was on
// a single card out of five — the one carrying a "go deeper" button whose long
// French label wraps the button row onto a second line. Measuring only the
// first question is how a layout bug hides in plain sight.
const SCRIPT = `(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const $ = s => document.querySelector(s);
  const box = el => { if (!el) return null; const r = el.getBoundingClientRect();
    return { h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom) }; };
  // Wait for a CONDITION, never for a duration. Fixed sleeps made this tool
  // report "no question rendered" on two of four screen sizes purely by racing
  // the boot — a measuring instrument that is flaky is worse than none.
  const until = async (fn, ms) => { const end = Date.now() + (ms || 8000);
    while (Date.now() < end) { if (fn()) return true; await sleep(80); } return false; };

  if (!await until(() => window.CURIO_QUESTIONS && document.querySelector('.tabbar')))
    return { error: 'app never booted' };
  location.hash = 'daily';
  await until(() => $('.opt'), 2500);
  if (!$('.opt')) { const b = document.querySelector('#startDaily'); if (b) b.click(); await until(() => $('.opt'), 2500); }
  if (!$('.opt')) return { error: 'no question rendered' };

  const bar = $('.tabbar');
  const barHidden = !bar || getComputedStyle(bar).display === 'none';
  const barTop = barHidden ? window.innerHeight : Math.round(bar.getBoundingClientRect().top);

  const shots = [];
  for (let n = 0; n < 5; n++) {
    if (!$('.opt')) break;
    $('.opt').click();                     // right or wrong, the layout is identical
    // The card re-fits itself several times as images land; measure only once
    // it has settled, or the numbers describe a layout no reader ever saw.
    await until(() => $('#next'), 3000);
    await sleep(450);
    const card = $('.card.answered-view') || $('.card');
    const next = $('#next');
    const fact = $('.answerblock .fact');
    const rows = {};
    [['quizhead','.quizhead'],['qcat','.qcat'],['qart','.qart'],['qtext','.qtext'],
     ['opts','.opts'],['answerblock','.answerblock'],['fact','.answerblock .fact'],
     ['answerfoot','.answerfoot'],['gflink','.gf-link'],['btnrow','.answerfoot .btnrow'],
     ['deeper','#deeper'],['next','#next']].forEach(([k,s]) => rows[k] = box($(s)));
    const row = $('.answerfoot .btnrow');
    shots.push({
      q: n + 1,
      cardTop: card ? Math.round(card.getBoundingClientRect().top) : null,
      cardH: card ? Math.round(card.getBoundingClientRect().height) : null,
      cardMaxHeight: card ? card.style.maxHeight : null,
      nextBottom: next ? Math.round(next.getBoundingClientRect().bottom) : null,
      overflow: next ? Math.round(next.getBoundingClientRect().bottom - barTop) : null,
      factScrollH: fact ? fact.scrollHeight : null,
      factClipped: fact ? fact.scrollHeight - fact.clientHeight : null,
      hasDeeper: !!$('#deeper'),
      deeperW: $('#deeper') ? Math.round($('#deeper').getBoundingClientRect().width) : null,
      nextW: next ? Math.round(next.getBoundingClientRect().width) : null,
      rowW: row ? Math.round(row.getBoundingClientRect().width) : null,
      btnrowWraps: (() => { if (!row) return null;
        const kids = [].slice.call(row.children).map(c => c.getBoundingClientRect());
        return kids.length > 1 && Math.abs(kids[0].top - kids[1].top) > 4; })(),
      rows
    });
    if (next) { next.click(); await until(() => $('.opt') || $('.card.result'), 3000); }
  }
  return { lang: window.QLANG, vw: window.innerWidth, vh: window.innerHeight, barTop, barHidden, shots };
})()`;

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qpio-audit-'));
  const chrome = cp.spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${dir}`,
    `--window-size=${W},${H}`, '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', 'about:blank'
  ], { stdio: 'ignore' });

  let target = null;
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(250);
    try { target = JSON.parse(await get(`http://127.0.0.1:${PORT}/json/list`)).find(t => t.type === 'page'); } catch {}
  }
  if (!target) { chrome.kill(); console.error('Chrome did not expose a debug target'); process.exit(2); }

  const WSStub = require('http');           // minimal CDP over the websocket
  const ws = await openWs(target.webSocketDebuggerUrl);
  let id = 0;
  const send = (method, params) => new Promise(res => {
    const mid = ++id;
    ws.on('message', function h(data) {
      const m = JSON.parse(data);
      if (m.id === mid) { ws.off('message', h); res(m.result); }
    });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });

  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: true });
  const url = URL_ + (URL_.includes('?') ? '&' : '?') + 'lang=' + LANG;
  await send('Page.navigate', { url });
  await sleep(3500);
  // curio.lang is stored RAW, not JSON — app.js reads it with a bare
  // localStorage.getItem and compares to "fr"/"en". Writing JSON.stringify here
  // wrote `"fr"` with quotes, which fell through to "auto" and audited the
  // English build while claiming to audit French.
  // A fresh browser profile is a FIRST RUN, and on first run the tab bar is
  // hidden until onboarding completes — so the first version of this audit
  // measured against a screen with no tab bar and cheerfully reported PASS.
  // Marking the reader as onboarded measures what everyone except a first-timer
  // actually sees, which is the state the acceptance suite tests.
  await send('Runtime.evaluate', {
    expression: `localStorage.setItem('curio.lang','${LANG}');` +
                `localStorage.setItem('curio.onboarded','true');`
  });
  await send('Page.navigate', { url });
  await sleep(3500);

  const r = await send('Runtime.evaluate', { expression: SCRIPT, awaitPromise: true, returnByValue: true });
  ws.close(); chrome.kill();
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}

  const v = r && r.result && r.result.value;
  if (!v || v.error) { console.error('audit failed:', v && v.error || JSON.stringify(r)); process.exit(1); }
  if (v.barHidden) { console.error('  tab bar not visible — the measurement would be meaningless'); process.exit(2); }

  const pad = (s, n) => String(s).padEnd(n);
  const num = (s, n) => String(s).padStart(n);
  console.log(`\n  ${URL_}  ·  ${v.lang}  ·  ${v.vw}x${v.vh}  ·  tab bar top ${v.barTop}\n`);
  console.log('   Q   over   card              fact          button row');
  v.shots.forEach(s => {
    const flag = s.overflow > 0 ? '\x1b[31m' : '\x1b[32m';
    console.log(`  ${s.q}  ${flag}${num((s.overflow > 0 ? '+' : '') + s.overflow, 5)}\x1b[0m   ` +
      `${num(s.cardH, 3)}px max ${pad(s.cardMaxHeight || '—', 6)}  ` +
      `${num(s.factClipped, 3)} clipped  ` +
      `${s.hasDeeper ? num(s.deeperW, 3) + '+' + num(s.nextW, 3) + ' in ' + num(s.rowW, 3) : 'next only'}` +
      `${s.btnrowWraps ? ' \x1b[31mWRAPS\x1b[0m' : ''}`);
  });

  const worst = v.shots.reduce((a, b) => (b.overflow > a.overflow ? b : a));
  console.log(`\n  worst: question ${worst.q}, ${worst.overflow > 0 ? worst.overflow + 'px BELOW' : Math.abs(worst.overflow) + 'px clear of'} the tab bar\n`);
  Object.entries(worst.rows).forEach(([k, b]) => {
    if (!b) { console.log(`  ${pad(k, 13)} ${num('—', 6)}`); return; }
    console.log(`  ${pad(k, 13)} ${num(b.h + 'px', 6)}   ${num(b.top, 4)} → ${num(b.bottom, 4)}`);
  });
  const bad = v.shots.filter(s => s.overflow > 0).length;
  console.log(`\n  ${bad ? '\x1b[31mFAIL' : '\x1b[32mPASS'}  ${bad} of ${v.shots.length} questions hid Next behind the tab bar\x1b[0m\n`);
  process.exit(bad ? 1 : 0);
})();

/* A 120-line websocket client so the audit needs no dependency at all. */
function openWs(url) {
  return new Promise((resolve, reject) => {
    const net = require('net'), crypto = require('crypto'), { EventEmitter } = require('events');
    const u = new URL(url);
    const key = crypto.randomBytes(16).toString('base64');
    const sock = net.connect(+u.port, u.hostname, () => {
      sock.write(`GET ${u.pathname} HTTP/1.1\r\nHost: ${u.host}\r\nUpgrade: websocket\r\n` +
                 `Connection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`);
    });
    const em = new EventEmitter();
    let buf = Buffer.alloc(0), handshook = false;
    em.send = s => {
      const p = Buffer.from(s), len = p.length;
      let head;
      if (len < 126) head = Buffer.from([0x81, 0x80 | len]);
      else if (len < 65536) { head = Buffer.alloc(4); head[0] = 0x81; head[1] = 0xFE; head.writeUInt16BE(len, 2); }
      else { head = Buffer.alloc(10); head[0] = 0x81; head[1] = 0xFF; head.writeBigUInt64BE(BigInt(len), 2); }
      const mask = crypto.randomBytes(4), out = Buffer.alloc(p.length);
      for (let i = 0; i < p.length; i++) out[i] = p[i] ^ mask[i % 4];
      sock.write(Buffer.concat([head, mask, out]));
    };
    em.close = () => { try { sock.destroy(); } catch {} };
    em.off = em.removeListener.bind(em);
    sock.on('data', d => {
      buf = Buffer.concat([buf, d]);
      if (!handshook) {
        const i = buf.indexOf('\r\n\r\n');
        if (i < 0) return;
        handshook = true; buf = buf.slice(i + 4); resolve(em);
      }
      while (buf.length >= 2) {
        const len0 = buf[1] & 127;
        let off = 2, len = len0;
        if (len0 === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
        else if (len0 === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
        if (buf.length < off + len) return;
        const payload = buf.slice(off, off + len);
        buf = buf.slice(off + len);
        if ((buf.length || true) && payload.length) em.emit('message', payload.toString('utf8'));
      }
    });
    sock.on('error', reject);
  });
}
