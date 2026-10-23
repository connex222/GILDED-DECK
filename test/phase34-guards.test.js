'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createEventGuard}=require('../event-guard');
const {shouldExpireRoom,DEFAULT_IDLE_MS}=require('../room-lifecycle');
test('per-socket event budget resets at the window boundary',()=>{
 let time=100;const guard=createEventGuard({limit:2,windowMs:1000,now:()=>time});
 assert.equal(guard.check('a'),true);assert.equal(guard.check('a'),true);
 assert.equal(guard.check('a'),false);assert.equal(guard.check('b'),true);
 time=1100;assert.equal(guard.check('a'),true);
 guard.clear('a');assert.equal(guard.size(),1);
});
test('idle room sweep protects active connections',()=>{
 const now=DEFAULT_IDLE_MS+100;
 assert.equal(shouldExpireRoom({lastActivityAt:0,hostId:null,players:[]},now),true);
 assert.equal(shouldExpireRoom({lastActivityAt:0,hostId:'host',players:[]},now),false);
 assert.equal(shouldExpireRoom({lastActivityAt:0,hostId:null,players:[{connected:true}]},now),false);
 assert.equal(shouldExpireRoom({lastActivityAt:now-100,hostId:null,players:[]},now),false);
});
