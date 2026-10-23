'use strict';
const DEFAULT_IDLE_MS=6*60*60*1000;
function shouldExpireRoom(room,now=Date.now(),idleMs=DEFAULT_IDLE_MS){
  if(!room || !Number.isFinite(room.lastActivityAt))return false;
  if(now-room.lastActivityAt<idleMs)return false;
  // Never evict a table while any connected player or host can still use it.
  return !room.hostId && room.players.every(p=>!p.connected);
}
module.exports={DEFAULT_IDLE_MS,shouldExpireRoom};
