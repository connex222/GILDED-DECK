'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
test('November readiness report is valid, non-invasive and preserves one README',()=>{
 const result=spawnSync(process.execPath,['test/november-readiness.cjs'],{cwd:root,encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 const report=JSON.parse(result.stdout);
 assert.equal(report.expectedPlayers,6);
 assert.equal(report.requiredFilesPresent,true);
 assert.equal(report.singleMarkdown,true);
 assert.equal(report.multiplayerIntegrationExecuted,false);
 assert.equal(report.manualChecks.length,7);
});
