const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
function extract(startMarker,endMarker,context={}){
 const start=source.indexOf(startMarker),end=source.indexOf(endMarker,start);
 assert.ok(start>=0&&end>start,`Missing function boundary: ${startMarker}`);
 const sandbox={...context};vm.createContext(sandbox);vm.runInContext(source.slice(start,end),sandbox);return sandbox;
}
const bj=extract('function blackjackTotal(', 'function blackjackFinish(');
const cards=ranks=>ranks.map(rank=>({rank}));
test('blackjack: face cards are worth ten',()=>assert.equal(bj.blackjackTotal(cards(['K','Q'])),20));
test('blackjack: soft ace counts as eleven',()=>assert.equal(bj.blackjackTotal(cards(['A','6'])),17));
test('blackjack: ace becomes one to prevent bust',()=>assert.equal(bj.blackjackTotal(cards(['A','9','5'])),15));
test('blackjack: multiple aces adjust independently',()=>assert.equal(bj.blackjackTotal(cards(['A','A','9'])),21));
test('blackjack: 22 remains bust',()=>assert.equal(bj.blackjackTotal(cards(['K','Q','2'])),22));
const ranks=['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
const brag=extract('function bragScore(', 'function solvePlayerHand(',{RANKS:ranks});
function hand(r,s=['♠','♥','♦']){return [...r].map((rank,i)=>({rank,suit:s[i]}));}
function score(r,s){return Array.from(brag.bragScore(hand(r,s)));}
test('brag: card order does not affect score',()=>assert.deepEqual(score('AKQ'),score('QAK')));
test('brag: A23 is the highest running flush',()=>assert.ok(brag.compareScores(score('A23',['♠','♠','♠']),score('AKQ',['♠','♠','♠']))>0));
test('brag: pair of aces beats pair of kings',()=>assert.ok(brag.compareScores(score('AA2'),score('KKQ'))>0));
test('brag: flush tie-break uses descending ranks',()=>assert.ok(brag.compareScores(score('AKJ',['♠','♠','♠']),score('AKT',['♥','♥','♥']))>0));
test('brag: duplicated ranks do not form a run',()=>assert.equal(score('223')[0],2));
const persistence=extract('function snapshotRoom(', 'function persistRooms(');
test('recovery snapshot: includes identity, balances and game type only',()=>{
 const snap=persistence.snapshotRoom({code:'ABCD',hostToken:'secret',gameType:'brag',handNumber:3,dealerIndex:1,players:[{name:'Alex',resumeToken:'token',stack:975,hole:[{rank:'A'}],id:'socket-id',committed:25}]});
 assert.equal(snap.players[0].stack,975);assert.equal(snap.gameType,'brag');
 assert.equal(snap.players[0].resumeToken,'token');
 assert.equal(Object.hasOwn(snap.players[0],'hole'),false);
 assert.equal(Object.hasOwn(snap.players[0],'id'),false);
});
