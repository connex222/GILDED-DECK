'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const {checkSocket} = require('./socket-smoke.cjs');
class FakeSocket extends EventEmitter {
  constructor(url) { super(); this.url=url; this.sent=[]; this.closed=false; FakeSocket.last=this; }
  addEventListener(type, fn) { this.on(type, fn); }
  send(data) { this.sent.push(data); }
  close() { this.closed=true; }
}
test('Phase 47: smoke completes only after Engine.IO and Socket.IO handshakes', async () => {
 const promise=checkSocket('https://example.org', {WebSocketImpl:FakeSocket,timeoutMs:1000});
 const socket=FakeSocket.last;
 assert.equal(socket.url,'wss://example.org/socket.io/?EIO=4&transport=websocket');
 socket.emit('message',{data:'0{"sid":"test","upgrades":[],"pingInterval":25000,"pingTimeout":20000}'});
 assert.deepEqual(socket.sent,['40']);
 socket.emit('message',{data:'2'}); assert.deepEqual(socket.sent,['40','3']);
 socket.emit('message',{data:'40{"sid":"test"}'});
 await promise; assert.equal(socket.closed,true);
});
test('Phase 47: handshake rejects invalid Engine.IO opening frames',async()=>{
 const promise=checkSocket('https://example.org',{WebSocketImpl:FakeSocket,timeoutMs:1000});
 FakeSocket.last.emit('message',{data:'0not-json'});
 await assert.rejects(promise,/Invalid Engine.IO/);
});
test('Phase 47: handshake rejects premature disconnect',async()=>{
 const promise=checkSocket('https://example.org',{WebSocketImpl:FakeSocket,timeoutMs:1000});
 FakeSocket.last.emit('close');
 await assert.rejects(promise,/closed before handshake/);
});
