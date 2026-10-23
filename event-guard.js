'use strict';
// Fixed-window per-connection event budget; no client-supplied identity is trusted.
function createEventGuard({limit=60, windowMs=10_000, now=Date.now}={}) {
  const windows = new Map();
  return {
    check(id) {
      const time=now();
      const previous=windows.get(id);
      const state=(!previous || time-previous.start>=windowMs) ? {start:time,count:0} : previous;
      state.count++;
      windows.set(id,state);
      return state.count<=limit;
    },
    clear(id){windows.delete(id);},
    size(){return windows.size;}
  };
}
module.exports={createEventGuard};
