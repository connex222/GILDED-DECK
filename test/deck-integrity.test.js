const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const crypto=require('node:crypto');
const src=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
const start=src.indexOf('const SUITS =');
const end=src.indexOf('function newPlayer(',start);
assert.ok(start>=0&&end>start);
const scope={crypto};vm.createContext(scope);vm.runInContext(src.slice(start,end),scope);
const {makeDeck}=scope;
test('each shuffle produces exactly 52 unique cards',()=>{
 for(let i=0;i<200;i++){
  const deck=makeDeck();assert.equal(deck.length,52);
  assert.equal(new Set(deck.map(c=>c.code)).size,52);
  assert.ok(deck.every(c=>/^[2-9TJQKA][shdc]$/.test(c.code)));
 }
});
test('shuffles do not repeat the same card order',()=>{
 const orders=new Set(Array.from({length:30},()=>makeDeck().map(c=>c.code).join(',')));
 assert.equal(orders.size,30);
});
test('dealing five cards to eight players leaves enough cards for the draw',()=>{
 const deck=makeDeck();
 for(let p=0;p<8;p++)for(let c=0;c<5;c++)assert.ok(deck.pop());
 assert.equal(deck.length,12);
 // An eight-player game cannot replace three cards for everyone from a single deck.
 assert.ok(deck.length<8*3);
});
test('draw mode rejects more than six active players before dealing',()=>{
 assert.match(src,/room\.gameType === "draw" && !drawCapacity\(eligible\.length\)\.safe/);
});
