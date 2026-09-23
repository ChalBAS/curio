/* A DEMO VIDEO MUST PLAY ON AN IPHONE (v103).
 *
 * Safari plays a video only if the server answers a request for part of the file
 * with that part (206). The asset layer does not, so worker/index.js cuts the
 * routine demos itself. This checks the cutting against a stand-in asset layer:
 * the pieces an iPhone asks for, a piece past the end, no Range at all, and a
 * path the asset layer does not have (which it answers with the app's own page).
 *   node tools/video_range.test.js
 */
'use strict';
const path = require('path');
const { pathToFileURL } = require('url');

const SIZE = 1000;
const BYTES = new Uint8Array(SIZE).map((_, i) => i % 256);
const env = { ASSETS: { fetch: async (req) => {
  const p = new URL(req.url).pathname;
  if (req.headers.get('range')) throw new Error('the asset layer was asked for a piece: ' + req.headers.get('range'));
  if (p === '/img/gen/moves/hands.mp4') return new Response(BYTES, { status: 200, headers: { 'content-type': 'video/mp4' } });
  return new Response('<!doctype html><title>Qpio</title>', { status: 200, headers: { 'content-type': 'text/html' } });
} } };

let pass = 0, fail = 0;
const t = (name, ok, detail) => { if (ok) pass++; else { fail++; console.log('  FAIL ' + name + (detail ? '  -  ' + detail : '')); } };

(async () => {
  const app = (await import(pathToFileURL(path.join(__dirname, '..', 'worker', 'index.js')).href)).default;
  const get = (p, range, method) => app.fetch(new Request('https://uat.qpio.app' + p, { method: method || 'GET', headers: range ? { range } : {} }), env);

  let r = await get('/img/gen/moves/hands.mp4', 'bytes=0-1');
  let b = new Uint8Array(await r.arrayBuffer());
  t('the first two bytes, as Safari asks first', r.status === 206 && b.length === 2 && b[1] === 1 && r.headers.get('content-range') === 'bytes 0-1/' + SIZE, r.status + ' ' + r.headers.get('content-range'));
  t('it says it serves pieces', r.headers.get('accept-ranges') === 'bytes');
  t('it says it is a video', r.headers.get('content-type') === 'video/mp4');

  r = await get('/img/gen/moves/hands.mp4', 'bytes=500-');
  b = new Uint8Array(await r.arrayBuffer());
  t('from a point to the end', r.status === 206 && b.length === 500 && b[0] === 500 % 256 && r.headers.get('content-length') === '500');

  r = await get('/img/gen/moves/hands.mp4', 'bytes=900-5000');
  t('an end past the file is shortened', r.status === 206 && r.headers.get('content-range') === 'bytes 900-999/' + SIZE);

  r = await get('/img/gen/moves/hands.mp4', 'bytes=-100');
  b = new Uint8Array(await r.arrayBuffer());
  t('the last hundred bytes', r.status === 206 && b.length === 100 && r.headers.get('content-range') === 'bytes 900-999/' + SIZE);

  r = await get('/img/gen/moves/hands.mp4', 'bytes=2000-');
  t('a piece past the end is refused', r.status === 416 && r.headers.get('content-range') === 'bytes */' + SIZE);

  r = await get('/img/gen/moves/hands.mp4');
  b = new Uint8Array(await r.arrayBuffer());
  t('no Range: the whole file', r.status === 200 && b.length === SIZE);

  r = await get('/img/gen/moves/hands.mp4', 'bytes=0-1', 'HEAD');
  t('HEAD: the headers, no body', r.status === 206 && (await r.arrayBuffer()).byteLength === 0);

  r = await get('/img/gen/moves/missing.mp4', 'bytes=0-1');
  t('a missing video is a 404, never the app page sent as a video', r.status === 404);

  console.log('\n  video pieces - ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
