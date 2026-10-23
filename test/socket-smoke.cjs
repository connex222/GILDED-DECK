'use strict';
// A read-only Socket.IO connection check; never emits gameplay events.
function checkSocket(origin, {WebSocketImpl = globalThis.WebSocket, timeoutMs = 10000} = {}) {
  if (typeof WebSocketImpl !== 'function') return Promise.reject(new Error('Node.js 22+ WebSocket is required'));
  const url = new URL('/socket.io/?EIO=4&transport=websocket', origin);
  url.protocol = 'wss:';
  return new Promise((resolve, reject) => {
    const socket = new WebSocketImpl(url.href);
    let finished = false;
    let opened = false;
    const finish = error => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      try { socket.close(); } catch {}
      if (error) reject(error); else resolve();
    };
    const timer = setTimeout(() => finish(new Error('Socket.IO handshake timed out')), timeoutMs);
    socket.addEventListener('message', event => {
      const frame = String(event.data);
      if (frame.startsWith('0') && !opened) {
        try { JSON.parse(frame.slice(1)); socket.send('40'); opened = true; }
        catch { finish(new Error('Invalid Engine.IO opening frame')); }
      } else if (frame === '2') socket.send('3');
      else if (frame.startsWith('40') && opened) finish();
      else if (frame.startsWith('44')) finish(new Error('Socket.IO namespace rejected connection'));
    });
    socket.addEventListener('error', () => finish(new Error('Socket.IO transport connection failed')));
    socket.addEventListener('close', () => { if (!finished) finish(new Error('Socket.IO transport closed before handshake')); });
  });
}
module.exports = {checkSocket};
