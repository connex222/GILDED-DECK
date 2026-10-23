const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../server.js'), 'utf8');
test('host recovery is scheduled for 30 seconds', () => { assert.match(source, /HOST_TRANSFER_MS = 30_000/); assert.match(source, /scheduleHostTransfer\(room\)/); });
test('public state never exposes host recovery token', () => { const state = source.split('function roomPublic(room)')[1].split('function emitRoom(room)')[0]; assert.doesNotMatch(state, /hostToken|resumeToken\s*:/); });
test('original host can reclaim a delegated table', () => { assert.match(source, /!room.hostIsDelegate/); assert.match(source, /room.hostIsDelegate = false/); });
