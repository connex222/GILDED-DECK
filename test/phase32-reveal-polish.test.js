const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const server=fs.readFileSync(path.join(__dirname,'..','server.js'),'utf8');const ui=fs.readFileSync(path.join(__dirname,'..','public','index.html'),'utf8');
test('best-card selection is computed only for showdown',()=>{assert.match(server,/function bestCardsForReveal/);assert.match(server,/bestCards: bestCardsForReveal/);assert.match(server,/room\.status === "complete" \? \(room\.showdown/)});
test('showdown highlights winning cards and supports reduced motion',()=>{assert.match(ui,/winning-card/);assert.match(ui,/sameCard\(c,revealList\[index\]\.cards\[i\]\)/);assert.match(ui,/prefers-reduced-motion:reduce/)});
test('reveal uses audio and one-time phone outcome feedback',()=>{assert.match(ui,/cue\('reveal'\)/);assert.match(ui,/showdownCelebratedKey === key/);assert.match(ui,/navigator\.vibrate/)});
