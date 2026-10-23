'use strict';
// Local, non-invasive six-player readiness checklist; no live rooms are created.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const required = ['server.js', 'public/index.html', 'test/phase48-six-player.test.js', 'test/strict-release.cjs', 'test/deployment-smoke.cjs', '.github/workflows/release-check.yml'];
const missing = required.filter(name => !fs.existsSync(path.join(root, name)));
const markdown = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
    if (['node_modules', '.git'].includes(entry.name)) continue;
    const relative = path.relative(root, path.join(dir,entry.name));
    if (entry.isDirectory()) walk(path.join(dir,entry.name));
    else if (/\.(?:md|markdown)$/.test(entry.name.toLowerCase())) markdown.push(relative);
  }
}
walk(root);
const dependencies = ['express', 'socket.io', 'pokersolver'].map(name => ({name, installed: (() => {try {require.resolve(name,{paths:[root]});return true;} catch {return false;}})()}));
const report = {
  generatedAt: new Date().toISOString(),
  game: 'The Gilded Deck',
  expectedPlayers: 6,
  requiredFilesPresent: missing.length === 0,
  missingFiles: missing,
  singleMarkdown: markdown.length === 1 && markdown[0] === 'README.md',
  markdownFiles: markdown,
  runtimeDependencies: dependencies,
  multiplayerIntegrationExecuted: false,
  realDeviceAcceptance: 'PENDING — November six-player session',
  manualChecks: [
    'Six distinct phones join once each and display correct seat and name',
    'TV host controls and all five game selections work',
    'All five games finish at least one six-person round',
    'No private hand or recovery token leaks to another player or TV',
    'Chip accounting remains correct after folds, ties, wins and rebuys',
    'Disconnect, reconnect and host handover recover correctly',
    'Portrait, landscape, TV overscan, sounds and accessible controls work'
  ]
};
console.log(JSON.stringify(report,null,2));
if (!report.requiredFilesPresent || !report.singleMarkdown) process.exitCode = 1;
