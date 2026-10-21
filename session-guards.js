'use strict';
function socketHasSeat(rooms, socketId) {
  if (typeof socketId !== 'string' || !socketId) return false;
  for (const room of rooms.values()) {
    if (room.players.some(p => p.id === socketId && p.connected)) return true;
  }
  return false;
}
function roomHasToken(room, token) {
  return !!room && typeof token === 'string' && (room.hostToken === token || room.players.some(p => p.resumeToken === token));
}
function canJoinRoom(room, socketId, maxPlayers) {
  if (!room) return 'Room not found.';
  if (!['lobby', 'complete'].includes(room.status)) return 'A hand is in progress. Join after it finishes.';
  if (room.players.some(p => p.id === socketId)) return 'This device already has a seat at the table.';
  if (room.players.length >= maxPlayers) return `Room is full (${maxPlayers} players maximum).`;
  return null;
}
module.exports = {socketHasSeat, roomHasToken, canJoinRoom};
