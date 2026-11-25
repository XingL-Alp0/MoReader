'use strict';

const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets', 'public');
if (!fs.existsSync(publicDir)) {
  console.log('android web assets not found, nothing to clean');
  process.exit(0);
}

let removed = 0;
for (const entry of fs.readdirSync(publicDir)) {
  if (entry.endsWith('.map')) {
    fs.rmSync(path.join(publicDir, entry), { force: true });
    removed += 1;
  }
}

console.log(`cleaned ${removed} source map(s) from Android assets`);
