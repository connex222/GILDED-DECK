'use strict';
const DECK_SIZE = 52;
const INITIAL_CARDS = 5;
const MAX_EXCHANGES = 3;
function drawCapacity(players, exchanges = MAX_EXCHANGES) {
  if (!Number.isSafeInteger(players) || players < 0 || !Number.isSafeInteger(exchanges) || exchanges < 0 || exchanges > INITIAL_CARDS) throw new RangeError('Invalid draw configuration');
  const dealt = players * INITIAL_CARDS;
  const requested = players * exchanges;
  return { dealt, requested, remaining: DECK_SIZE - dealt, safe: dealt + requested <= DECK_SIZE };
}
function validateDrawIndices(indices, handSize = INITIAL_CARDS) {
  return Array.isArray(indices) && indices.length <= MAX_EXCHANGES && indices.every(i => Number.isInteger(i) && i >= 0 && i < handSize) && new Set(indices).size === indices.length;
}
module.exports = {drawCapacity,validateDrawIndices};
