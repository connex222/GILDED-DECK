const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
function getFunction(begin,end,context={}){
 const a=src.indexOf(begin),b=src.indexOf(end,a);
 assert.ok(a>=0&&b>a,`Cannot locate ${begin}`);
 const scope={...context};vm.createContext(scope);vm.runInContext(src.slice(a,b),scope);return scope;
}
const crypto=require('node:crypto');
const {newPlayer}=getFunction('function newPlayer(', 'function roomPublic(',{crypto});
test('each player gets a distinct 48-character private recovery token',()=>{
 const a=newPlayer('a','Alice'),b=newPlayer('b','Bob');
 assert.match(a.resumeToken,/^[a-f0-9]{48}$/);assert.notEqual(a.resumeToken,b.resumeToken);
});
test('player display name is trimmed and limited to 18 characters',()=>{
 assert.equal(newPlayer('x','  Alice  ').name,'Alice');
 assert.equal(newPlayer('x','x'.repeat(40)).name.length,18);
});
const {snapshotRoom}=getFunction('function snapshotRoom(', 'function persistRooms(');
test('checkpoint does not persist hidden cards or transient socket IDs',()=>{
 const room={code:'ABCD',hostToken:'f'.repeat(48),gameType:'holdem',handNumber:1,dealerIndex:0,
 players:[{id:'socket-private',name:'Alice',resumeToken:'a'.repeat(48),stack:900,hole:[{code:'As'}],committed:100}]};
 const snap=snapshotRoom(room);const encoded=JSON.stringify(snap);
 assert.ok(!encoded.includes('socket-private'));
 assert.ok(!encoded.includes('As'));
 assert.ok(!encoded.includes('committed'));
 assert.equal(snap.players[0].stack,900);
});
test('public room state does not expose recovery tokens or player hole cards',()=>{
 const {roomPublic}=getFunction('function roomPublic(', 'function emitRoom(');
 const room={code:'ABCD',status:'playing',hostId:'host',hostToken:'secret',gameType:'holdem',players:[{id:'p1',name:'Alice',stack:100,committed:0,roundBet:0,folded:false,allIn:false,connected:true,resumeToken:'secret2',hole:[{code:'As'}]}],dealerCards:[],community:[],pot:0,currentBet:0,minRaise:20,street:'pre-flop',message:'',dealerIndex:0,turnIndex:0,handNumber:1,smallBlind:10,bigBlind:20,winners:[]};
 const publicData=JSON.stringify(roomPublic(room));
 assert.ok(!publicData.includes('secret'));
 assert.ok(!publicData.includes('As'));
 assert.equal(JSON.parse(publicData).players[0].isTurn,true);
});
