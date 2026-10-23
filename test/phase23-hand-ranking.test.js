const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'server.js'), 'utf8');
// Run the real normalisation function in isolation, with mock pokersolver results.
const start = source.indexOf('function pokerHand(hand) {');
const end = source.indexOf('function solvePlayerHand(', start);
assert.ok(start >= 0 && end > start);
const pokerHand = vm.runInNewContext(`${source.slice(start, end)}; pokerHand`);

test('stronger poker hand wins after pokersolver comparison normalisation', () => {
  const aces = { descr: 'Four of a Kind', compare: () => -1 };
  const jackHigh = { descr: 'High Card', compare: () => 1 };
  assert.equal(pokerHand(aces).compare(pokerHand(jackHigh)), 1);
  assert.equal(pokerHand(jackHigh).compare(pokerHand(aces)), -1);
});

test('equal poker hands still tie', () => {
  const a = { descr: 'Straight', compare: () => 0 };
  const b = { descr: 'Straight', compare: () => 0 };
  assert.equal(pokerHand(a).compare(pokerHand(b)), 0);
});

test('all poker solve branches wrap pokersolver hands', () => {
  const body = source.slice(end, source.indexOf('function resetStreet(', end));
  assert.match(body, /gameType === "draw"\) return pokerHand\(Hand\.solve/);
  assert.match(body, /gameType !== "omaha"\) return pokerHand\(Hand\.solve/);
  assert.match(body, /return pokerHand\(Hand\.winners\(candidates\)\[0\]\)/);
});

test('fractional raises are rejected at the input guard', () => {
  assert.match(source, /!Number\.isSafeInteger\(target\)/);
});
