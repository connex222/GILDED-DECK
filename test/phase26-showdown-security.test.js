const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const client = fs.readFileSync(path.join(__dirname, '..', 'public/index.html'), 'utf8');
const publicBody = server.split('function roomPublic(room) {')[1].split('\nfunction emitRoom(room) {')[0];

test('public room payload never includes dealer seat recovery token', () => {
  assert.doesNotMatch(publicBody, /dealerToken\s*:/);
  assert.doesNotMatch(publicBody, /resumeToken\s*:/);
  assert.doesNotMatch(publicBody, /hostToken\s*:/);
});
test('showdown payload is gated by completed hand status', () => {
  assert.match(publicBody, /room\.status === "complete" \? \(room\.showdown \|\| null\) : null/);
});
test('folded hands are excluded from showdown reveal', () => {
  assert.match(server, /room\.players\.filter\(p => !p\.folded && p\.hole\.length\)/);
});
test('uncontested win reveals no private cards', () => {
  assert.match(server, /: \{ revealed: \[\], winners:/);
});
test('TV renders showdown hand names and cards', () => {
  assert.match(client, /state\.showdown\?\.revealed/);
  assert.match(client, /reveal\.cards\.map\(c => cardEl\(c\)\)/);
});
