const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const server = fs.readFileSync(path.join(__dirname,'..','server.js'),'utf8');
const client = fs.readFileSync(path.join(__dirname,'..','public','index.html'),'utf8');
test('showdown settlement retains separate main and side pot awards',()=>{
 assert.match(server,/const potResults = \[\]/);
 assert.match(server,/type: potResults\.length === 0 \? "Main pot"/);
 assert.match(server,/room\.potResults = potResults/);
 assert.match(server,/pots: room\.potResults \|\| \[\]/);
});
test('TV reveal has a skip control and respects reduced motion',()=>{
 assert.match(client,/id="showdownStage"/);
 assert.match(client,/Skip reveal/);
 assert.match(client,/prefers-reduced-motion: reduce/);
 assert.match(client,/function updateRevealSeats\(/);
});
test('private cards are only added to showdown for non-folded contenders',()=>{
 assert.match(server,/room\.players\.filter\(p => !p\.folded && p\.hole\.length\)/);
 assert.match(server,/: \{ revealed: \[\], winners:/);
});
