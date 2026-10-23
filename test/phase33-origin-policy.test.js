'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname,'..','server.js'),'utf8');
test('cross-origin Socket.IO requests require an allowlisted origin', () => {
  assert.match(source,/process\.env\.ALLOWED_ORIGINS/);
  assert.match(source,/allowRequest:\s*\(req, callback\)/);
  assert.match(source,/!origin \|\| allowedOrigins\.has\(origin\)/);
  assert.doesNotMatch(source,/cors:\s*\{\s*origin:\s*true/);
});
test('public room state does not serialise recovery credentials', () => {
  const publicState = source.split('function roomPublic(room) {')[1].split('\nfunction emitRoom(room)')[0];
  assert.ok(publicState);
  assert.doesNotMatch(publicState,/hostToken|dealerToken\s*:/);
  assert.doesNotMatch(publicState,/resumeToken\s*:/);
  assert.doesNotMatch(publicState,/deck:\s*room\.deck/);
});
