'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'..','server.js'),'utf8');
test('disconnect schedules a 60 second grace instead of folding immediately',()=>{
  assert.match(src,/const DISCONNECT_GRACE_MS = 60_000/);
  const handler=src.slice(src.indexOf('socket.on("disconnect"'));
  assert.match(handler,/scheduleDisconnect\(room, p\)/);
  assert.doesNotMatch(handler,/p\.folded = true/);
});
test('resume cancels pending disconnect expiry',()=>{
  assert.match(src,/cancelDisconnectTimer\(player\.resumeToken\);\s*player\.id=socket\.id/);
});
test('expired disconnected draw player stands pat and keeps cards',()=>{
  const expiry=src.slice(src.indexOf('function expireDisconnectedPlayer'),src.indexOf('function scheduleDisconnect'));
  assert.match(expiry,/p\.drew = true/);
  assert.doesNotMatch(expiry,/p\.hole\s*=/);
});
test('expired disconnected player is not folded if already all-in',()=>{
  const expiry=src.slice(src.indexOf('function expireDisconnectedPlayer'),src.indexOf('function scheduleDisconnect'));
  assert.match(expiry,/else if \(!p\.folded && !p\.allIn\)/);
});
