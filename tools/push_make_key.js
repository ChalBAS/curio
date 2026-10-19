//   node tools/push_make_key.js
// One-off (launch plan N4): make the VAPID key pair for the morning question.
// The private key goes to ~/.config/qpio/vapid-private.json (readable by this
// Windows user only) and is never printed; it is put to each worker as the secret
// VAPID_PRIVATE_JWK. The public key is printed: it is public, and the app ships it
// as PUSH_KEY. Refuses to overwrite an existing key - a new key would orphan every
// phone already subscribed.
const fs = require('fs');
const os = require('os');
const path = require('path');
const dir = path.join(os.homedir(), '.config', 'qpio');
const file = path.join(dir, 'vapid-private.json');
(async () => {
  if (fs.existsSync(file)) {
    const jwk = JSON.parse(fs.readFileSync(file, 'utf8'));
    console.log('exists; public key: ' + publicOf(jwk));
    return;
  }
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const j = await crypto.subtle.exportKey('jwk', kp.privateKey);
  const jwk = { kty: 'EC', crv: 'P-256', x: j.x, y: j.y, d: j.d };
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(jwk), { mode: 0o600 });
  console.log('written; public key: ' + publicOf(jwk));
})();
function publicOf(jwk) {
  return Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, 'base64url'), Buffer.from(jwk.y, 'base64url')]).toString('base64url');
}
