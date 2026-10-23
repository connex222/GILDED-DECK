'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {parseAllowedOrigins, isAllowedOrigin, safePort, DEFAULT_MAX_HTTP_BUFFER} = require('../transport-security');
test('Phase 38: local development origins permitted; foreign origins denied', () => {
 const origins=parseAllowedOrigins('https://game.example', {production:false});
 assert.equal(isAllowedOrigin('http://localhost:3000', origins),true);
 assert.equal(isAllowedOrigin('https://game.example', origins),true);
 assert.equal(isAllowedOrigin('https://evil.example', origins),false);
 assert.equal(isAllowedOrigin(undefined, origins),true);
});
test('Phase 39: production refuses insecure and malformed origin configuration', () => {
 assert.deepEqual([...parseAllowedOrigins('https://game.example', {production:true})], ['https://game.example']);
 for(const value of ['http://game.example','*','https://game.example/path','https://user:pass@game.example','javascript:alert(1)'])
   assert.throws(()=>parseAllowedOrigins(value,{production:true}));
});
test('Phase 40: bounded payload and validated port', () => {
 assert.ok(DEFAULT_MAX_HTTP_BUFFER <= 65536);
 assert.equal(safePort('3000'),3000);
 for(const value of ['0','65536','abc','12.5','-1']) assert.throws(()=>safePort(value));
});
