'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
test('Phase 45: smoke check is read-only and requires an explicit HTTPS target',()=>{
 const script=fs.readFileSync(path.join(__dirname,'deployment-smoke.cjs'),'utf8');
 assert.match(script,/GILDED_SMOKE_URL/);
 assert.match(script,/https:/);
 assert.match(script,/\/health/);
 assert.doesNotMatch(script,/create-room|join-room|player-action|start-game/);
});
test('Phase 45: release and smoke commands remain separate',()=>{
 const pkg=require('../package.json');
 assert.equal(pkg.scripts['test:release'],'node test/strict-release.cjs');
 assert.equal(pkg.scripts['test:smoke'],'node test/deployment-smoke.cjs');
});
