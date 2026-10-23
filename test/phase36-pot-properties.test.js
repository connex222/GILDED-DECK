'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','server.js'),'utf8');
const start=source.indexOf('function settlePots('),end=source.indexOf('function bestCardsForReveal(',start);
assert.ok(start>=0&&end>start);
const context={Map,Set,Math};vm.createContext(context);vm.runInContext(source.slice(start,end),context);
const settle=context.settlePots;
let seed=0x12345678;
function random(n){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;}
function scenario(count){
 const players=Array.from({length:count},(_,i)=>({id:String(i),name:`Seat ${i}`,stack:random(250),committed:1+random(150),folded:random(5)===0}));
 if(players.every(p=>p.folded))players[0].folded=false;
 const ranks=players.map(()=>random(12));
 const hands=new Map(players.map((p,i)=>[p.id,{rank:ranks[i],compare(other){return Math.sign(this.rank-other.rank);}}]));
 const before=players.reduce((sum,p)=>sum+p.stack+p.committed,0);
 const room={players};const awards=settle(room,hands);
 assert.equal(players.reduce((sum,p)=>sum+p.stack,0),before,'chip conservation');
 assert.equal(awards.reduce((sum,p)=>sum+p.amount,0),players.reduce((sum,p)=>sum+p.committed,0),'all contributions distributed');
 assert.ok(players.every(p=>Number.isSafeInteger(p.stack)&&p.stack>=0));
 // Folded players may receive only unmatched-contribution refunds.
 assert.equal(room.potResults.reduce((sum,p)=>sum+p.amount,0),players.reduce((sum,p)=>sum+p.committed,0));
}
test('1,000 deterministic multiway pots conserve chips, including ties, folds and unequal all-ins',()=>{
 for(let i=0;i<1000;i++)scenario(2+random(7));
});
test('repeated settlement of identical pots is deterministic',()=>{
 const players=Array.from({length:4},(_,i)=>({id:String(i),name:`Seat ${i}`,stack:100,committed:[10,30,30,45][i],folded:false}));
 const hands=new Map(players.map((p,i)=>[p.id,{rank:[4,2,2,1][i],compare(other){return Math.sign(this.rank-other.rank);}}]));
 const run=()=>{const room={players:players.map(p=>({...p}))};return {awards:settle(room,hands),stacks:room.players.map(p=>p.stack)};};
 assert.deepEqual(run(),run());
});
