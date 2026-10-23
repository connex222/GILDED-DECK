
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
test('CI gates deployment smoke on passing strict integration tests',()=>{
 const workflow=fs.readFileSync(path.join(root,'.github/workflows/release-check.yml'),'utf8');
 assert.match(workflow,/npm run test:release/);
 assert.match(workflow,/needs: test/);
 assert.match(workflow,/node test\/deployment-smoke\.cjs/);
 assert.match(workflow,/github\.event_name == 'push'/);
});
test('integration fixture explicitly configures allowed origins',()=>{
 const source=fs.readFileSync(path.join(root,'test/socket-integration.test.js'),'utf8');
 assert.match(source,/ALLOWED_ORIGINS:'http:\/\/localhost:3000'/);
});
