const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
function functions(start,end,context={}) {
 const a=source.indexOf(start),b=source.indexOf(end,a);
 assert.ok(a>=0&&b>a,`Missing ${start}`);
 const sandbox={...context};vm.createContext(sandbox);vm.runInContext(source.slice(a,b),sandbox);return sandbox;
}
const logic=functions('function nextEligible(', 'function cardCode(');
const player=(overrides={})=>({folded:false,allIn:false,acted:false,roundBet:0,stack:100,...overrides});
test('turn order skips folded and all-in players',()=>{
 const room={players:[player(),player({folded:true}),player({allIn:true}),player()]};
 assert.equal(logic.nextEligible(room,0),3);
 assert.equal(logic.nextEligible(room,3),0);
});
test('betting round waits for unmatched active player',()=>{
 const room={currentBet:20,players:[player({acted:true,roundBet:20}),player({acted:true,roundBet:10})]};
 assert.equal(logic.roundComplete(room),false);
 room.players[1].roundBet=20;assert.equal(logic.roundComplete(room),true);
});
test('all-in players do not block completed betting round',()=>{
 const room={currentBet:40,players:[player({acted:true,roundBet:40}),player({allIn:true,stack:0,roundBet:15})]};
 assert.equal(logic.roundComplete(room),true);
});
test('folded players do not block completed betting round',()=>{
 const room={currentBet:20,players:[player({acted:true,roundBet:20}),player({folded:true,roundBet:10})]};
 assert.equal(logic.roundComplete(room),true);
});
const bets=functions('function settlePots(', 'function finishHand(');
function settle(players,comparisons){
 const hands=new Map(players.map(p=>[p.id,{compare(other){return Math.sign(comparisons[p.id]-comparisons[other.id]);},id:p.id}]));
 // Supply a comparison object with its id to allow deterministic ranking.
 const winnersByHand=new Map(players.map(p=>[p.id,{id:p.id,compare(other){return Math.sign(comparisons[p.id]-comparisons[other.id]);}}]));
 return bets.settlePots({players},winnersByHand);
}
test('side pots: short-stack winner only wins main pot',()=>{
 const players=[{id:'a',name:'A',committed:20,stack:0,folded:false},{id:'b',name:'B',committed:50,stack:0,folded:false},{id:'c',name:'C',committed:50,stack:0,folded:false}];
 const awards=settle(players,{a:3,b:2,c:1});
 assert.equal(players[0].stack,60);assert.equal(players[1].stack,60);assert.equal(players[2].stack,0);
 assert.equal(awards.reduce((sum,a)=>sum+a.amount,0),120);
});
test('folded chips remain in pots but folded player never wins',()=>{
 const players=[{id:'a',name:'A',committed:20,stack:0,folded:true},{id:'b',name:'B',committed:20,stack:0,folded:false},{id:'c',name:'C',committed:20,stack:0,folded:false}];
 settle(players,{a:100,b:2,c:1});
 assert.equal(players[0].stack,0);assert.equal(players[1].stack,60);
});
test('tied pot pays out every chip including odd chip',()=>{
 const players=[{id:'a',name:'A',committed:1,stack:0,folded:false},{id:'b',name:'B',committed:1,stack:0,folded:false},{id:'c',name:'C',committed:1,stack:0,folded:false}];
 settle(players,{a:1,b:1,c:1});
 assert.equal(players.reduce((sum,p)=>sum+p.stack,0),3);
});
