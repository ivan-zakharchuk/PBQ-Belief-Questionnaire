#!/usr/bin/env node
// Single entry point for dev and prod. Clears dist/, copies the static
// files GitHub Pages needs, then runs the vendor + locales builders.

import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Eta } from 'eta';
import { copyVendor } from './copy-vendor.mjs';
import { buildLocales } from './build-locales.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

// Static passthrough (no CSS here — Tailwind builds style.css below).
await cp(path.join(root, 'app.js'), path.join(dist, 'app.js'));
console.log('copied  app.js  →  dist/app.js');
await cp(path.join(root, 'query-answers.js'), path.join(dist, 'query-answers.js'));
console.log('copied  query-answers.js  →  dist/query-answers.js');

// Locales must render before Tailwind so @source can see the class names
// baked into dist/locales/*.html — but our @source directives already point
// at templates/*.eta and app.js, so the order below is fine either way.
const langs = JSON.parse(await readFile(path.join(root, 'locales/index.json'), 'utf8'));
const eta = new Eta({ views: path.join(root, 'templates'), autoEscape: true, autoTrim: false });
await writeFile(path.join(dist, 'index.html'), eta.render('index', { langs }));
console.log('rendered  templates/index.eta  →  dist/index.html');

await copyVendor(dist);
await buildLocales(dist);

// Tailwind v4 standalone CLI. Content scanning uses @source directives in
// src/tailwind.css so it picks up class names in templates and app.js.
await new Promise((resolve, reject) => {
  const cli = path.join(root, 'node_modules/.bin/tailwindcss');
  const child = spawn(
    cli,
    ['-i', 'src/tailwind.css', '-o', 'dist/style.css', '--minify'],
    { cwd: root, stdio: 'inherit' }
  );
  child.on('exit', (code) =>
    code === 0 ? resolve() : reject(new Error(`tailwindcss exited with ${code}`))
  );
});
console.log('built    src/tailwind.css  →  dist/style.css');

console.log(`\nBuilt static site → ${path.relative(root, dist)}/`);
