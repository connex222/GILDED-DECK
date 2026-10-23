'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'..','server.js'),'utf8');
test('off-turn Brag disconnect preserves current turn after grace expiry',()=>{
  assert.match(src,/const wasTurn = room\.players\[room\.turnIndex\] === p/);
  assert.match(src,/else if \(wasTurn\) \{[\s\S]*?if \(room\.gameType === "brag"\) advanceBrag\(room\)/);
  assert.match(src,/\} else emitRoom\(room\);/);
});
test('a device cannot host two active rooms',()=>{
  assert.match(src,/socket\.on\("create-room"[\s\S]*?socketHasSeat\(rooms, socket\.id\) \|\| \[\.\.\.rooms\.values\(\)\]\.some/);
});
test('a seated device cannot take over another host session',()=>{
  assert.match(src,/if\(token === room\.hostToken\)\{\s*if\(socketHasSeat\(rooms, socket\.id\)/);
});
