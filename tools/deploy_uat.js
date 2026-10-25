#!/usr/bin/env node
/* DEPLOY TO UAT ONLY AFTER A GREEN PREFLIGHT (27 Oct 2026).
 *
 * v130 reached uat.qpio.app with PREFLIGHT FAILED on screen: the release ran preflight and the
 * deploy in one shell line, and the deploy followed the exit code of a filter that printed the
 * verdict, not of preflight itself. This runs the three steps in order and stops at the first
 * that fails: preflight (exit 0 or nothing is uploaded), wrangler deploy to uat, then the seal.
 *
 *   node tools/deploy_uat.js
 */
'use strict';
const cp = require('child_process'), path = require('path');
const ROOT = path.join(__dirname, '..');
const run = (what, cmd, args) => {
  console.log('\n== ' + what);
  const r = cp.spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) { console.error('\n' + what + ' failed (exit ' + r.status + '): nothing further was done.'); process.exit(r.status || 1); }
};
run('preflight (must be green)', process.execPath, [path.join(ROOT, 'tools', 'preflight.js')]);
run('deploy to uat.qpio.app', 'npx', ['--no-install', 'wrangler', 'deploy']);
run('seal the version served to uat', process.execPath, [path.join(ROOT, 'tools', 'seal_version.js'), 'uat']);
console.log('\nUAT deployed and sealed. Next: play it (tools/RELEASE-TEST.md), then node tools/releases.js and node tools/release_issue.js.');
