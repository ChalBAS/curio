//   node tools/push_probe.mjs
// Probe: do the real push services accept our VAPID signature? Sends an empty,
// signed POST to made-up subscription addresses (no real phone), once with our key
// and once with a wrong signature, and prints the status and body of each. A service
// that checks the signature before looking up the address answers differently.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { vapidHeader } from '../worker/push.js';

const env = { VAPID_PRIVATE_JWK: fs.readFileSync(path.join(os.homedir(), '.config', 'qpio', 'vapid-private.json'), 'utf8') };
const targets = [
  'https://fcm.googleapis.com/fcm/send/fake-qpio-probe:APA91bFakeTokenForQpioProbeOnly',
  'https://updates.push.services.mozilla.com/wpush/v2/gAAAAABfakeqpioprobe',
  'https://web.push.apple.com/QFakeQpioProbeToken'
];
const now = Math.floor(Date.now() / 1000);
for (const t of targets) {
  const aud = new URL(t).origin;
  const good = await vapidHeader(env, aud, now);
  const bad = good.replace(/\.([A-Za-z0-9_-]{10})([A-Za-z0-9_-]+), k=/, (m, a, b) => '.' + a.split('').reverse().join('') + b + ', k=');
  for (const [label, auth] of [['our key', good], ['broken signature', bad]]) {
    try {
      const r = await fetch(t, { method: 'POST', headers: { TTL: '60', Urgency: 'normal', Authorization: auth }, body: '' });
      const body = (await r.text()).replace(/\s+/g, ' ').slice(0, 160);
      console.log(aud.padEnd(42) + label.padEnd(18) + r.status + '  ' + body);
    } catch (e) { console.log(aud.padEnd(42) + label.padEnd(18) + 'network error ' + e.message); }
  }
}
