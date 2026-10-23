'use strict';
// Read-only production smoke check; does not create rooms or modify live game state.
const assert = require('node:assert/strict');
const target = process.env.GILDED_SMOKE_URL;
if (!target) { console.error('Set GILDED_SMOKE_URL to the HTTPS deployment origin.'); process.exit(2); }
let origin;
try {
  const parsed = new URL(target);
  assert.equal(parsed.protocol, 'https:', 'Deployment URL must use HTTPS');
  assert.equal(parsed.username, ''); assert.equal(parsed.password, '');
  assert.equal(parsed.pathname, '/'); assert.equal(parsed.search, ''); assert.equal(parsed.hash, '');
  origin = parsed.origin;
} catch (error) { console.error('Invalid deployment URL:', error.message); process.exit(2); }
(async () => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const health = await fetch(`${origin}/health`, {signal:controller.signal,redirect:'error',headers:{accept:'application/json'}});
    assert.equal(health.status, 200, '/health must return HTTP 200');
    const data = await health.json();
    assert.equal(data.ok, true, '/health must report ok:true');
    const home = await fetch(`${origin}/`, {signal:controller.signal,redirect:'error'});
    assert.equal(home.status, 200, 'Homepage must return HTTP 200');
    const html = await home.text();
    assert.match(html, /Gilded Deck/i, 'Homepage must contain the game name');
    console.log(`Deployment smoke passed: ${origin} (health and homepage)`);
  } finally { clearTimeout(timer); }
})().catch(error => { console.error('Deployment smoke FAILED:', error.message); process.exitCode=1; });
