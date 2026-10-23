'use strict';
// Release runner: dependencies alone are insufficient; skipped tests fail the gate.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const root = path.resolve(__dirname, '..');
if (typeof WebSocket !== 'function') {
  console.error('Release tests require Node.js 22+ with global WebSocket.');
  process.exit(1);
}
for (const name of ['express', 'socket.io', 'pokersolver']) {
  try { require.resolve(name); } catch { console.error(`Missing release dependency: ${name}`); process.exit(1); }
}
const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js')).sort().map(f => path.join(__dirname, f));
const run = spawnSync(process.execPath, ['--test', '--test-reporter=tap', ...files], { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
process.stdout.write(run.stdout || '');
process.stderr.write(run.stderr || '');
const summary = /(?:^|\n)# skipped (\d+)(?:\r?\n|$)/.exec(run.stdout || '');
if (run.error || run.status !== 0 || !summary || Number(summary[1]) !== 0) {
  console.error(`Release gate failed: exit=${run.status}, skipped=${summary?.[1] ?? 'unknown'}`);
  process.exit(1);
}
console.log('Release gate passed: all tests executed, zero skipped.');
