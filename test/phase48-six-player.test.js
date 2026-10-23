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
 const port=await freePort(); const proc=spawn(process.execPath,['server.js'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,PORT:String(port),GILDED_STATE_FILE:'',ALLOWED_ORIGINS:'http://localhost:3000'},stdio:['ignore','pipe','pipe']});
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
// Phase 48: six-player November rehearsal across the actual Socket.IO transport.
test('Six-player rehearsal: seats, unique identities, private cards and chip ledger', {skip:!hasRuntime && 'Install runtime dependencies to run live Socket.IO tests'}, async t=>{
 const port=await serverFixture(t);
 const host=await client(port,t);
 let tv;
 host.on('update-tv',state=>{tv=state;});
 const room=await host.ack('create-room',{});
 assert.equal(room.ok,true);
 const players=[];
 for(let i=0;i<6;i++){
  const connection=await client(port,t);
  let personal;
  connection.on('update-player',state=>{personal=state;});
  const seat=await connection.ack('join-room',{roomCode:room.roomCode,name:`November ${i+1}`});
  assert.equal(seat.ok,true,`Player ${i+1} must join`);
  players.push({connection,seat,get personal(){return personal;}});
 }
 await delay(100);
 assert.equal(tv.players.length,6);
 assert.equal(new Set(players.map(p=>p.seat.playerId)).size,6);
 assert.equal(new Set(players.map(p=>p.seat.resumeToken)).size,6);
 for(const gameType of ['holdem','omaha','draw','blackjack','brag']){
  const selected=await host.ack('select-game',{roomCode:room.roomCode,gameType});
  assert.equal(selected.ok,true,`${gameType} selectable in six-seat lobby`);
 }
 assert.equal((await host.ack('select-game',{roomCode:room.roomCode,gameType:'brag'})).ok,true);
 host.send('start-game',{roomCode:room.roomCode});
 await delay(150);
 assert.equal(tv.status,'playing');
 assert.equal(tv.players.length,6);
 assert.equal(tv.players.reduce((sum,p)=>sum+p.stack,0)+tv.pot,6000);
 const publicState=JSON.stringify(tv);
 for(const p of players){
  assert.equal(publicState.includes(p.seat.resumeToken),false,'Recovery credentials must stay private');
  assert.ok(p.personal,'Every player receives private state');
  assert.equal(p.personal.hole.every(card=>card===null),true,'Brag cards start hidden');
 }
 assert.equal(Object.hasOwn(tv,'deck'),false);
 assert.equal(Object.hasOwn(tv,'hole'),false);
 const current=players.find(p=>p.seat.playerId===tv.turnId);
 assert.ok(current,'A seated player must have the turn');
 current.connection.send('player-action',{roomCode:room.roomCode,action:'see-cards'});
 await delay(75);
 assert.equal(current.personal.hole.every(card=>card!==null),true);
 for(const p of players.filter(p=>p!==current)){
  assert.equal(p.personal.hole.every(card=>card===null),true,'Another player cannot see this hand');
 }
 assert.equal(tv.players.reduce((sum,p)=>sum+p.stack,0)+tv.pot,6000);
});
