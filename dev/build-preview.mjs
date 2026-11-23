// Baut eine eigenständige Vorschau-Datei ohne Skript und ohne Server: node dev/build-preview.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { renderSections } from './preview-render.js';

const dir = new URL('./', import.meta.url);
let html = readFileSync(new URL('preview.html', dir), 'utf8');
const css = readFileSync(new URL('../css/app.css', dir), 'utf8');

html = html.replace('<link rel="stylesheet" href="../css/app.css">', `<style>\n${css}\n</style>`);
html = html.replace(/<script type="module">[\s\S]*?<\/script>\s*/, '');
for (const [id, content] of Object.entries(renderSections())) {
  html = html.replace(new RegExp(`(<div [^>]*id="${id}"[^>]*>)(</div>)`), `$1${content}$2`);
}

const out = new URL('../Vorschau.html', dir);
writeFileSync(out, html, 'utf8');
console.log('geschrieben:', out.pathname);
