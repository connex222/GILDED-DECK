const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'server.js'),'utf8');
const begin = source.indexOf('const nextHandTimers = new Map();');
const end = source.indexOf('function cancelDisconnectTimer',begin);
function timersSetup(players, gameType='holdem') {
  const pending = new Map();let n=0,dealt=0,emitted=0,now=1000;
  const ctx={Map, Date:{now:()=>now},setTimeout(fn,ms){const id=++n;pending.set(id,{fn,ms});return {id,unref(){}};},clearTimeout(t){pending.delete(t.id);},startHand(){dealt++;},emitRoom(){emitted++;}};
  vm.runInNewContext(source.slice(begin,end),ctx);
  const room={code:'ABCD',gameType,players,smallBlind:10,bigBlind:20,status:'complete',paused:false};
  return {ctx,room,pending,get dealt(){return dealt;},get emitted(){return emitted;},advance(ms){now+=ms;for(const [id,t] of [...pending]){pending.delete(id);t.fn();}}};
}
const seat=(connected=true,stack=1000,sitOutNext=false)=>({connected,stack,sitOutNext});
test('next hand is scheduled for ten seconds with enough eligible seats',()=>{
  const s=timersSetup([seat(),seat()]);s.ctx.scheduleNextHand(s.room);
  assert.equal(s.room.nextHandDeadline,11000);assert.equal(s.pending.size,1);
  s.advance(10000);assert.equal(s.dealt,1);assert.equal(s.room.nextHandDeadline,null);
});
test('paused table never schedules an automatic deal',()=>{
  const s=timersSetup([seat(),seat()]);s.room.paused=true;s.ctx.scheduleNextHand(s.room);
  assert.equal(s.pending.size,0);assert.equal(s.dealt,0);
});
test('sitting-out and disconnected seats are excluded from eligibility',()=>{
  const s=timersSetup([seat(),seat(true,1000,true),seat(false)]);
  assert.equal(s.ctx.eligibleToDeal(s.room),false);
  s.room.players[1].sitOutNext=false;assert.equal(s.ctx.eligibleToDeal(s.room),true);
});
test('a cancelled countdown does not deal another hand',()=>{
  const s=timersSetup([seat(),seat()]);s.ctx.scheduleNextHand(s.room);
  s.ctx.cancelNextHand(s.room);assert.equal(s.pending.size,0);
  s.advance(10000);assert.equal(s.dealt,0);
});
test('blackjack only requires one eligible funded seat',()=>{
  const s=timersSetup([seat(true,20)],'blackjack');assert.equal(s.ctx.eligibleToDeal(s.room),true);
  s.room.players[0].stack=19;assert.equal(s.ctx.eligibleToDeal(s.room),false);
});
