// node tools/mail.test.js - hello@qpio.app reaches both inboxes, and a message is lost only
// if both refuse (worker/mail.js).
(async () => {
  const { default: W, INBOXES } = await import('../worker/mail.js');
  let failed = 0;
  const ok = (name, cond, detail) => { console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (detail && !cond ? ' - ' + detail : '')); if (!cond) failed++; };
  const msg = (refuse) => { const m = { sent: [], rejected: null,
    forward: async (to) => { if (refuse.includes(to)) throw new Error('destination address not verified'); m.sent.push(to); },
    setReject: (why) => { m.rejected = why; } }; return m; };
  const quiet = console.error; console.error = () => {};
  ok('two inboxes: the Qpio one and the founder\'s own', INBOXES.length === 2 && INBOXES.includes('qpiocorp@gmail.com') && INBOXES.includes('ukbchali@gmail.com'));
  let m = msg([]); await W.email(m);
  ok('a message goes to both inboxes', m.sent.length === 2 && !m.rejected, JSON.stringify(m.sent));
  m = msg(['ukbchali@gmail.com']); await W.email(m);
  ok('one inbox refusing still delivers to the other, with no bounce', m.sent.length === 1 && m.sent[0] === 'qpiocorp@gmail.com' && !m.rejected);
  m = msg(INBOXES); await W.email(m);
  ok('both refusing bounces it, so it is never silently lost', m.sent.length === 0 && typeof m.rejected === 'string');
  console.error = quiet;
  console.log('\n  contact mail (hello@qpio.app) - ' + (failed ? failed + ' FAILED' : 'all checks passed'));
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
