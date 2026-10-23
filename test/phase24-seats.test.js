const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const start = source.indexOf('function startHand(room) {');
const end = source.indexOf('function advanceTurn(', start);
const nextStart = source.indexOf('function nextEligible(');
const nextEnd = source.indexOf('function activePlayers(', nextStart);
const context = {
  snapshotRoom: () => ({}), makeDeck: () => Array.from({length: 52}, (_, i) => ({code: String(i)})),
  drawCapacity: () => ({safe:true}), postBet: (room, p, amount) => {
    const paid = Math.min(p.stack, amount); p.stack -= paid; p.roundBet += paid;
    p.committed += paid; room.pot += paid;
  }, emitRoom: () => {}, Set
};
vm.createContext(context);
vm.runInContext(`${source.slice(nextStart, nextEnd)}\n${source.slice(start, end)}`, context);
const seat = (name, connected=true, stack=1000) => ({name, resumeToken:name, id:name, connected, stack, hole:[], folded:false, allIn:false, committed:0, roundBet:0});
const room = (players) => ({players, gameType:'holdem', status:'lobby', handNumber:0, smallBlind:10, bigBlind:20, dealerIndex:0, dealerToken:null});
test('offline and bankrupt seats retain stack, identity and recovery tokens at deal', () => {
  const r = room([seat('A'),seat('B'),seat('Offline',false,555),seat('Busted',true,0)]);
  context.startHand(r);
  assert.equal(r.players.length,4);
  assert.equal(r.players[2].stack,555);
  assert.equal(r.players[2].resumeToken,'Offline');
  assert.equal(r.players[2].sittingOut,true);
  assert.equal(r.players[2].hole.length,0);
  assert.equal(r.players[3].stack,0);
  assert.equal(r.players[3].sittingOut,true);
  assert.equal(r.players[0].hole.length,2);
});
test('dealer advances by persistent identity and skips seats sitting out', () => {
  const r = room([seat('A'),seat('B'),seat('C'),seat('D')]);
  context.startHand(r);
  assert.equal(r.dealerToken,'A');
  r.status='complete';r.players[1].connected=false;
  context.startHand(r);
  assert.equal(r.dealerToken,'C');
  r.status='complete';r.players[2].connected=false;
  context.startHand(r);
  assert.equal(r.dealerToken,'D');
});
test('blackjack never removes seats from room players', () => {
  assert.doesNotMatch(source.slice(source.indexOf('function blackjackStart('),source.indexOf('function blackjackAct(')), /room\.players\s*=\s*room\.players\.filter/);
});
