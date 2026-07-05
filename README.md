# PBQ — Personality Belief Questionnaire

A static, no-bundler web version of the **Personality Belief Questionnaire** (Beck & Beck, 1991) — the 126-item self-report instrument used to assess dysfunctional beliefs associated with the nine Axis-II personality disorders (plus a Borderline subset).

Built with **pnpm**, **[HTMX](https://htmx.org/) 4** (currently `4.0.0-beta5`), and **[jQuery](https://jquery.com/) 4**. There is no bundler and no framework runtime — `pnpm build` just copies the source files and the two vendor scripts into `dist/` for GitHub Pages.

> ℹ️ HTMX 4 is still in beta. If you'd rather ship the current stable, downgrade with `pnpm add -E htmx.org@2` and re-run `pnpm build`.

This project is intended for self-reflection, study, and translation into other languages. It is **not** a diagnostic tool.

## Features

- 126 belief items across 10 scales (Avoidant, Dependent, Passive-Aggressive, Obsessive-Compulsive, Antisocial, Narcissistic, Histrionic, Schizoid, Paranoid, Borderline)
- Raw scores + Z-scores against the published norms, side-by-side with reference Z-scores for patients with/without a corresponding PD diagnosis
- Answers and language preference persisted in `localStorage`
- Multilingual by design — drop a new `locales/<lang>/` folder and register it in `locales/index.json`
- Zero runtime dependencies beyond vendored HTMX + jQuery (~120 kB total, ~40 kB gzipped)
- Deploys to GitHub Pages via a bundled workflow

## Stack

| Concern            | Tool                                        |
| ------------------ | ------------------------------------------- |
| Package manager    | pnpm 9                                       |
| Interactivity      | HTMX 4 (fragment loading) + jQuery 4 (DOM)   |
| Dev server         | `sirv-cli` (plain static file server)        |
| Build              | `scripts/build.mjs` (file copy, no bundler)  |

Why no bundler? HTMX and jQuery are `<script>` tag libraries — pnpm just brings them into `node_modules`, and `scripts/copy-vendor.mjs` copies the two dist files into `./vendor/` so `index.html` can reference them directly.

## Getting started

Requires Node.js **20+** and pnpm **9+**.

```bash
pnpm install
pnpm dev       # http://localhost:5188  (runs `pnpm vendor` + `pnpm locales` first)
pnpm build     # regenerates fragments + emits dist/
```

`pnpm dev` runs `sirv` on the project root and hot-reloads on file changes. If you edit `questions.json` or `strings.json`, rerun `pnpm run locales` to regenerate the HTML fragments.

## Project layout

```
.
├── index.html                    # shell of hx-get containers
├── app.js                        # thin runtime: state, scoring, HTMX handlers
├── style.css
├── locales/
│   ├── index.json                # language manifest
│   └── en/
│       ├── questions.json        # source of truth — 126 items
│       ├── strings.json          # source of truth — all UI copy
│       └── *.html                # BUILT: header/legend/progress/questionnaire/
│                                 #        actions/attribution/results-shell
├── scripts/
│   ├── copy-vendor.mjs           # node_modules → vendor/
│   ├── build-locales.mjs         # JSON → per-language HTML fragments
│   └── build.mjs                 # root files → dist/
├── vendor/                       # jquery.min.js + htmx.min.js (gitignored)
└── .github/workflows/deploy.yml  # GitHub Pages via pnpm
```

## How HTMX drives the UI

`index.html` is just a shell. Every visible chunk of the page is loaded by HTMX from a per-locale HTML fragment:

```html
<div id="questions"
     data-hx-frag="questionnaire.html"
     hx-get="./locales/en/questionnaire.html"
     hx-trigger="load, langchange from:body"
     hx-swap="innerHTML"></div>
```

The **submit** and **restart** buttons live inside those fragments and carry their own `hx-*` attributes — clicking submit fires an HTMX request for `results-shell.html`, clicking restart fires one for `questionnaire.html`. There is no `htmx.ajax(...)` call anywhere in `app.js`.

### What jQuery does (deliberately small)

- Delegated `change` listener on radios → update in-memory answer state + `localStorage`
- Delegated `htmx:after:swap` listener on `<body>` → restore saved answers after a fragment reloads, keep the progress bar in sync, and fill the results table once `#view` receives `results-shell.html`
- The score computation itself (14 scales × 14 items) — HTMX can't do math
- The download-as-JSON button — HTMX can't create blobs

Every UI string comes from the pre-built fragment. `app.js` never reads `strings.json` at runtime; templates like `data-tpl="{answered} of {total} answered"` carry their format string in a data attribute so localization stays fully declarative.

### Language switching, HTMX-native

The language `<select>` calls `pbq.setLang(newLang)`, which:

1. Rewrites the `hx-get` URL on every element with `data-hx-frag` to the new locale path
2. Fires a `langchange` event on `<body>`

Every fragment container listens with `hx-trigger="load, langchange from:body"`, so HTMX re-fetches all six regions in one pass. Radios are wiped and re-checked from `localStorage` when the questionnaire fragment lands.

### HTMX 4 notes

Event names changed in HTMX 4: `htmx:beforeRequest` → `htmx:before:request`, `htmx:afterSwap` → `htmx:after:swap`, etc. Attribute shorthands follow suit — `hx-on::before:request`, `hx-on::after:swap`. Also, `htmx:after:swap` fires on the **source** element (the trigger), not the swap target — read `event.detail.ctx.target` to find where the content landed.

## Data files

### `locales/index.json`

The list of available languages, in display order:

```json
[
  { "code": "en", "name": "English" }
]
```

### `locales/<lang>/questions.json`

An ordered array of 126 items:

```json
[
  {
    "id": 1,
    "scale": "avoidant",
    "borderline": false,
    "text": "I am socially inept and socially undesirable in work or social situations."
  }
]
```

- `id` — 1-based ordinal (matches the paper form)
- `scale` — one of `avoidant`, `dependent`, `passive_aggressive`, `obsessive_compulsive`, `antisocial`, `narcissistic`, `histrionic`, `schizoid`, `paranoid`
- `borderline` — `true` when the item is also part of the Borderline subset (items 4, 9, 13, 15, 16, 18, 27, 60, 97, 113, 116, 119, 125, 126)
- `text` — the belief statement

### `locales/<lang>/strings.json`

All user-visible copy: title, subtitle, rating labels, button labels, results copy, scale display names.

## Adding a translation

1. Copy `locales/en/` to `locales/<lang>/` (e.g. `locales/uk/`).
2. Translate the `text` field for each question in `questions.json`. **Do not change `id`, `scale`, or `borderline`** — those drive the scoring.
3. Translate every value in `strings.json`. Set `meta.language` to the language name in its own language and `meta.languageCode` to the ISO code. Use `meta.direction: "rtl"` for right-to-left scripts.
4. Add an entry to `locales/index.json`:

   ```json
   [
     { "code": "en", "name": "English" },
     { "code": "uk", "name": "Українська" }
   ]
   ```

5. Reload — the language picker appears automatically as soon as there is more than one locale.

## Scoring

Each scale sums 14 items rated 0–4, so the maximum raw score per scale is 56. Z-scores use the norms from Butler's PBQ scoring key (mixed-diagnosis outpatient sample, N = 756):

```
z = (raw − mean) / SD
```

Reference Z-scores (columns "with PD" / "no PD") are shown so users can compare their score to the published averages. The exact constants live near the top of [`app.js`](app.js).

## Deploying to GitHub Pages

1. Push to `main`.
2. In the repo settings, enable **Pages** and set the source to **GitHub Actions**.
3. The bundled workflow ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)) installs with pnpm, runs `pnpm build`, and publishes `dist/`.

The site uses relative script paths (`./vendor/...`, `./locales/...`) so it works at any base path — no configuration needed for project-page URLs like `https://<user>.github.io/<repo>/`.

## Sources

- Beck, A. T., & Beck, J. S. (1991). *Personality Belief Questionnaire.* Unpublished assessment instrument, Bala Cynwyd, PA: The Beck Institute for Cognitive Behavior Therapy.
- Beck, A. T., Butler, A. C., Brown, G. K., Dahlsgaard, K. K., Newman, C. F., & Beck, J. S. (2001). Dysfunctional beliefs discriminate personality disorders. *Behavioural Research and Therapy, 39,* 1213–1225.
- Butler, A. C., Brown, G. K., Beck, A. T., & Grisham, J. R. (2002). Assessment of dysfunctional beliefs in borderline personality disorder. *Behavioural Research and Therapy, 40,* 1231–1240.

## Disclaimer

This project reproduces the PBQ item text and scoring key for educational and self-reflection use. The PBQ is © 1995 Aaron T. Beck, M.D. and Judith S. Beck, Ph.D. This web implementation does **not** diagnose personality disorders. If any results resonate strongly or cause distress, please consult a licensed mental-health professional.

## License

Code in this repository is released under the terms in [LICENSE](LICENSE). The questionnaire item text and scoring norms belong to their respective authors.
