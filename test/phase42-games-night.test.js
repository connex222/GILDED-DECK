const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
const modes=['holdem','omaha','draw','blackjack','brag'];
test('all five game modes appear in the selection UI',()=>{
 for(const mode of modes)assert.match(html,new RegExp(`<option value="${mode}"`));
});
test('each game mode is recognised by the authoritative server',()=>{
 for(const mode of modes)assert.ok(server.includes(`'${mode}'`)||server.includes(`"${mode}"`),`Missing ${mode}`);
});
test('Blackjack and Brag have distinct phone action controls',()=>{
 for(const id of ['blackjackActions','bragControls','bragLook','bragSee','bragPlay','bragFold','bragRaise'])assert.ok(html.includes(`id="${id}"`),id);
});
test('16 avatar files and main logo are packaged',()=>{
 for(let i=1;i<=16;i++)assert.ok(fs.existsSync(path.join(root,'public/assets',`avatar-${String(i).padStart(2,'0')}.webp`)),`Avatar ${i}`);
 assert.ok(fs.existsSync(path.join(root,'public/assets/gilded-deck-marquee.webp')));
});
test('audio remains opt-in with separate effects and ambience controls',()=>{
 assert.match(html,/let soundOn = false/);
 assert.match(html,/let ambienceOn = false/);
 for(const cue of ['deal','turn','reveal','win'])assert.ok(html.includes(`name==='${cue}'`),cue);
 assert.match(html,/visibilitychange/);
});
test('one Markdown file documents the whole project',()=>{
 const md=fs.readdirSync(root).filter(f=>f.toLowerCase().endsWith('.md'));
 assert.deepEqual(md,['README.md']);
});
