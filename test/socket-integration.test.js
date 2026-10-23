'use strict';
// Real Engine.IO/Socket.IO wire-protocol smoke tests, using Node's built-in WebSocket.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const net = require('node:net');
const path = require('node:path');
const hasRuntime = typeof WebSocket === 'function' && ['express','socket.io','pokersolver'].every(name=>{try{require.resolve(name);return true;}catch{return false;}});

async function freePort(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
async function serverFixture(t){
 const port=await freePort(); const proc=spawn(process.execPath,['server.js'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,PORT:String(port),GILDED_STATE_FILE:''},stdio:['ignore','pipe','pipe']});
 let output='';proc.stdout.on('data',d=>output+=d);proc.stderr.on('data',d=>output+=d);
 t.after(()=>{proc.kill();});
 for(let i=0;i<100;i++){if(proc.exitCode!==null)throw Error('Server quit: '+output);try{const r=await fetch(`http://127.0.0.1:${port}/health`);if(r.ok)return port;}catch{}await new Promise(r=>setTimeout(r,30));}
 throw Error('Server did not start: '+output);
}
async function client(port,t){
 const ws=new WebSocket(`ws://127.0.0.1:${port}/socket.io/?EIO=4&transport=websocket`);
 let ready=false;let ackId=0;const pending=new Map();const listeners=new Map();
 ws.addEventListener('message',e=>{
  const m=String(e.data);
  if(m[0]==='0'){ws.send('40');return;}
  if(m==='2'){ws.send('3');return;}
  if(m.startsWith('40')){ready=true;const f=listeners.get('__ready');if(f)f();return;}
  if(m.startsWith('43')){const match=/^43(\d+)(.*)$/.exec(m);if(!match)return;const cb=pending.get(Number(match[1]));if(cb){pending.delete(Number(match[1]));cb(JSON.parse(match[2])[0]);}return;}
  if(m.startsWith('42')){const payload=JSON.parse(m.slice(2));const f=listeners.get(payload[0]);if(f)f(payload[1]);}
 });
 await new Promise((resolve,reject)=>{listeners.set('__ready',resolve);ws.addEventListener('error',reject,{once:true});setTimeout(()=>{if(!ready)reject(Error('Socket handshake timed out'));},3000);});
 t.after(()=>ws.close());
 return {on:(event,fn)=>listeners.set(event,fn),send:(event,data)=>ws.send('42'+JSON.stringify([event,data])),ack:(event,data)=>new Promise((resolve,reject)=>{const id=ackId++;pending.set(id,resolve);ws.send('42'+id+JSON.stringify([event,data]));setTimeout(()=>{if(pending.has(id)){pending.delete(id);reject(Error('Ack timed out: '+event));}},3000);}),close:()=>ws.close()};
}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
test('Socket.IO host and players: room, privacy, Brag blind/seen, challenge and chip conservation',{skip:!hasRuntime && 'Install runtime dependencies to run live Socket.IO tests'},async t=>{
 const port=await serverFixture(t);const host=await client(port,t),a=await client(port,t),b=await client(port,t);
 let tv,pa,pb;host.on('update-tv',s=>tv=s);a.on('update-player',s=>pa=s);b.on('update-player',s=>pb=s);
 const h=await host.ack('create-room',{});assert.equal(h.ok,true);
 const aj=await a.ack('join-room',{roomCode:h.roomCode,name:'Alice'}),bj=await b.ack('join-room',{roomCode:h.roomCode,name:'Bob'});
 assert.equal(aj.ok,true);assert.equal(bj.ok,true);
 assert.equal((await a.ack('join-room',{roomCode:h.roomCode,name:'Again'})).ok,false);
 assert.equal((await host.ack('select-game',{roomCode:h.roomCode,gameType:'brag'})).ok,true);
 host.send('start-game',{roomCode:h.roomCode});await delay(80);
 assert.equal(tv.status,'playing');assert.equal(tv.players.length,2);
 assert.equal(tv.pot,20);assert.equal(tv.players.reduce((n,p)=>n+p.stack,0)+tv.pot,2000);
 assert.ok(pa.hole.every(c=>c===null));assert.ok(pb.hole.every(c=>c===null));
 assert.equal(JSON.stringify(tv).includes(aj.resumeToken),false);
 const turn=()=>tv.turnId===aj.playerId?a:b;
 const playerState=()=>tv.turnId===aj.playerId?pa:pb;
 turn().send('player-action',{roomCode:h.roomCode,action:'see-cards'});await delay(40);
 assert.equal(playerState().hole.every(c=>c!==null),true);
 turn().send('player-action',{roomCode:h.roomCode,action:'see'});await delay(60);
 assert.equal(tv.status,'complete');assert.equal(tv.pot,0);
 assert.equal(tv.players.reduce((n,p)=>n+p.stack,0),2000);
 assert.equal(tv.winners.length,1);
});
test('Socket.IO rejects invalid game selection and allows session recovery after disconnect',{skip:!hasRuntime && 'Install runtime dependencies to run live Socket.IO tests'},async t=>{
 const port=await serverFixture(t);const host=await client(port,t),a=await client(port,t);
 const h=await host.ack('create-room',{}),seat=await a.ack('join-room',{roomCode:h.roomCode,name:'Reconnect'});
 assert.equal((await a.ack('select-game',{roomCode:h.roomCode,gameType:'brag'})).ok,false);
 assert.equal((await host.ack('select-game',{roomCode:h.roomCode,gameType:'invalid'})).ok,false);
 a.close();await delay(80);
 const rejoin=await client(port,t);const result=await rejoin.ack('resume-session',{roomCode:h.roomCode,resumeToken:seat.resumeToken});
 assert.equal(result.ok,true);assert.equal(result.isHost,false);
});

// Phase 35: an invalid recovery credential must never seize a player's seat.
test('Socket.IO rejects forged recovery tokens without evicting the seated player',{skip:!hasRuntime && 'Install runtime dependencies to run live Socket.IO tests'},async t=>{
 const port=await serverFixture(t);const host=await client(port,t),owner=await client(port,t),attacker=await client(port,t);
 const room=await host.ack('create-room',{});assert.equal(room.ok,true);
 const seat=await owner.ack('join-room',{roomCode:room.roomCode,name:'Owner'});assert.equal(seat.ok,true);
 const forged=await attacker.ack('resume-session',{roomCode:room.roomCode,resumeToken:'invalid-token'});
 assert.equal(forged.ok,false);
 const second=await owner.ack('join-room',{roomCode:room.roomCode,name:'Duplicate'});
 assert.equal(second.ok,false);
 const other=await attacker.ack('join-room',{roomCode:room.roomCode,name:'Other'});
 assert.equal(other.ok,true);assert.notEqual(other.playerId,seat.playerId);
});
