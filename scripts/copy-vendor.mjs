#!/usr/bin/env node
// Copies HTMX and jQuery from node_modules into <outDir>/vendor/ so
// index.html can reference them without a bundler.

import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const PAIRS = [
  ['node_modules/htmx.org/dist/htmx.min.js', 'htmx.min.js'],
  ['node_modules/jquery/dist/jquery.min.js', 'jquery.min.js']
];

async function readVersion(pkgDir) {
  const pkg = JSON.parse(
    await readFile(path.join(root, 'node_modules', pkgDir, 'package.json'), 'utf8')
  );
  return pkg.version;
}

export async function copyVendor(outDir) {
  const vendor = path.join(outDir, 'vendor');
  await mkdir(vendor, { recursive: true });

  for (const [from, name] of PAIRS) {
    await copyFile(path.join(root, from), path.join(vendor, name));
    console.log(`copied  ${from}  →  ${path.relative(root, path.join(vendor, name))}`);
  }

  const manifest = {
    htmx: await readVersion('htmx.org'),
    jquery: await readVersion('jquery'),
    copiedAt: new Date().toISOString()
  };
  await writeFile(
    path.join(vendor, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n'
  );
  console.log('vendor manifest:', manifest);
}

// Standalone CLI: default to ./dist
if (import.meta.url === `file://${process.argv[1]}`) {
  await copyVendor(path.join(root, 'dist'));
}
