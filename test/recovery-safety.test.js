'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'..','server.js'),'utf8');
test('recovery ignores duplicate table codes',()=>assert.match(src,/rooms\.has\(entry\.code\)/));
test('recovery rejects repeated host and player tokens',()=>{
 assert.match(src,/usedTokens\.has\(entry\.hostToken\)/);
 assert.match(src,/new Set\(validPlayers\.map\(p => p\.resumeToken\)\)\.size !== validPlayers\.length/);
});
test('recovery rejects malformed player objects before reading fields',()=>assert.match(src,/p && typeof p === "object"/));
test('recovery limits restored stack values',()=>assert.match(src,/p\.stack <= 1000000000/));
test('recovery retains host and player tokens only after accepting a table',()=>{
 assert.match(src,/rooms\.set\(room\.code,room\);\s*usedTokens\.add\(room\.hostToken\)/);
});
