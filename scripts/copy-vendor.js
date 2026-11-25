'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist', 'vendor');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const katexDist = path.join(root, 'node_modules', 'katex', 'dist');
fs.copyFileSync(path.join(katexDist, 'katex.min.css'), path.join(out, 'katex.min.css'));
fs.cpSync(path.join(katexDist, 'fonts'), path.join(out, 'fonts'), { recursive: true });

// Mermaid is ~5 MB, so it is copied as a lazy-loaded asset instead of being
// bundled into renderer.js. It only loads when a ```mermaid block exists.
const mermaidFile = path.join(root, 'node_modules', 'mermaid', 'dist', 'mermaid.min.js');
if (fs.existsSync(mermaidFile)) {
  fs.copyFileSync(mermaidFile, path.join(out, 'mermaid.min.js'));
} else {
  console.warn('mermaid not installed, diagrams will show a fallback message');
}

for (const file of ['index.html', 'styles.css']) {
  fs.copyFileSync(
    path.join(root, 'src', 'renderer', file),
    path.join(root, 'dist', file)
  );
}

console.log('Copied KaTeX styles, fonts and renderer assets to dist');
