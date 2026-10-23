'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
test('release gate: live multiplayer runtime is installed', () => {
  assert.equal(typeof WebSocket, 'function', 'Use Node.js 22+ for release tests');
  for (const name of ['express', 'socket.io', 'pokersolver']) {
    assert.doesNotThrow(() => require.resolve(name), `Missing dependency: ${name}`);
  }
});
