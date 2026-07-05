#!/usr/bin/env node
// Renders per-locale HTML fragments so HTMX can drive the whole UI with
// hx-get. Templates live in /templates/*.eta; sources live in
// /locales/<code>/{strings,questions}.json. Fragments are written to
// <outDir>/locales/<code>/*.html — the runtime never touches JSON.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Eta } from 'eta';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const eta = new Eta({
  views: path.join(root, 'templates'),
  autoEscape: true,
  autoTrim: false
});

async function loadJson(p) {
  return JSON.parse(await readFile(p, 'utf8'));
}

const FRAGMENTS = [
  'header',
  'legend',
  'progress',
  'questionnaire',
  'actions',
  'attribution',
  'results-shell'
];

export async function buildLocales(outDir) {
  const manifest = await loadJson(path.join(root, 'locales/index.json'));
  for (const { code } of manifest) {
    const srcDir = path.join(root, 'locales', code);
    const dstDir = path.join(outDir, 'locales', code);
    await mkdir(dstDir, { recursive: true });

    const strings = await loadJson(path.join(srcDir, 'strings.json'));
    const questions = await loadJson(path.join(srcDir, 'questions.json'));
    const ratingsDesc = [...strings.ratings].sort((a, b) => b.value - a.value);
    const scaleLabelsAttr = JSON.stringify(strings.scales).replace(/'/g, '&#39;');

    const data = {
      lang: code,
      langs: manifest,
      strings,
      questions,
      ratingsDesc,
      scaleLabelsAttr
    };

    for (const name of FRAGMENTS) {
      const out = eta.render(name, data);
      await writeFile(path.join(dstDir, `${name}.html`), out);
    }
    console.log(
      `built  ${path.relative(root, dstDir)}/  →  ${FRAGMENTS.map((n) => `${n}.html`).join(', ')}`
    );
  }
}

// Standalone CLI: default to ./dist
if (import.meta.url === `file://${process.argv[1]}`) {
  await buildLocales(path.join(root, 'dist'));
}
