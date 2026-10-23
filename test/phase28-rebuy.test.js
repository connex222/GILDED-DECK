const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'server.js'), 'utf8');
const start = source.indexOf('  socket.on("rebuy",');
const end = source.indexOf('  socket.on("select-game",', start);
assert.ok(start >= 0 && end > start);
function setup(stack, status = 'complete', connected = true) {
  const player = {id:'socket-a', connected, stack, totalBuyIn:1000, rebuys:0, sittingOut:true};
  const room = {players:[player], status, message:''};
  let handler, emitted = 0;
  const socket = {id:'socket-a', on(name, fn){if(name === 'rebuy')handler=fn;}, emit(){}};
  vm.runInNewContext(source.slice(start,end), {socket, rooms:new Map([['ABCD',room]]), emitRoom(){emitted++;}});
  let response;
  function rebuy(){handler({roomCode:'abcd'}, r=>response=r);return response;}
  return {player,room,rebuy,get emitted(){return emitted;}};
}
test('rebuy restores busted seat and accounts for chips',()=>{
  const s=setup(0);assert.equal(s.rebuy().ok,true);assert.equal(s.player.stack,1000);
  assert.equal(s.player.rebuys,1);assert.equal(s.player.totalBuyIn,2000);
  assert.equal(s.player.sittingOut,false);assert.equal(s.emitted,1);
});
test('rebuy cannot occur mid-hand',()=>{const s=setup(0,'playing');assert.equal(s.rebuy().ok,false);assert.equal(s.player.stack,0);});
test('rebuy cannot top up an existing stack',()=>{const s=setup(5);assert.equal(s.rebuy().ok,false);assert.equal(s.player.rebuys,0);});
test('rebuy cannot be repeated after success',()=>{const s=setup(0);s.rebuy();assert.equal(s.rebuy().ok,false);assert.equal(s.player.rebuys,1);});
test('disconnected player cannot rebuy',()=>{const s=setup(0,'complete',false);assert.equal(s.rebuy().ok,false);});
