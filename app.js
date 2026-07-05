/* global jQuery, htmx, pbqQueryAnswers */
// The runtime is deliberately thin: HTMX loads every visible fragment,
// so app.js only handles what HTMX can't express — client state, scoring,
// storage sync, and a couple of imperative UI toggles.
(function ($) {
  'use strict';

  const SCALE_ORDER = [
    'avoidant', 'dependent', 'passive_aggressive', 'obsessive_compulsive',
    'antisocial', 'narcissistic', 'histrionic', 'schizoid', 'paranoid', 'borderline'
  ];

  const NORMS = {
    avoidant:             { mean: 18.8, sd: 10.9, refPd: 0.62, refNoPd: -0.69 },
    dependent:            { mean: 18.0, sd: 11.8, refPd: 0.83, refNoPd: -0.49 },
    passive_aggressive:   { mean: 19.3, sd: 10.5, refPd: null, refNoPd: -0.38 },
    obsessive_compulsive: { mean: 22.7, sd: 11.5, refPd: 0.31, refNoPd: -0.51 },
    antisocial:           { mean: 9.3,  sd: 6.8,  refPd: 0.31, refNoPd: -0.18 },
    narcissistic:         { mean: 10.0, sd: 7.6,  refPd: 1.10, refNoPd: -0.38 },
    histrionic:           { mean: 14.0, sd: 9.3,  refPd: null, refNoPd: -0.29 },
    schizoid:             { mean: 16.3, sd: 8.6,  refPd: null, refNoPd: -0.14 },
    paranoid:             { mean: 14.6, sd: 11.3, refPd: 0.51, refNoPd: -0.55 },
    borderline:           { mean: 15.8, sd: 10.5, refPd: 0.77, refNoPd: -0.65 }
  };

  // Supported locales are injected by the build (see templates/index.eta).
  // Anything not in this list — including a browser locale we don't ship
  // yet — falls back to 'en'.
  const SUPPORTED = Array.isArray(window.PBQ_LANGS) && window.PBQ_LANGS.length
    ? window.PBQ_LANGS
    : ['en'];

  const state = {
    lang: readLang(),
    answers: readAnswers()
  };

  function readLang() {
    const stored = localStorage.getItem('pbq.lang');
    if (stored && SUPPORTED.includes(stored)) return stored;
    const browser = (navigator.language || 'en').split('-')[0];
    if (SUPPORTED.includes(browser)) return browser;
    return SUPPORTED.includes('en') ? 'en' : SUPPORTED[0];
  }
  function readAnswers() {
    try {
      return JSON.parse(localStorage.getItem('pbq.answers') || '{}');
    } catch {
      return {};
    }
  }
  function saveAnswers() {
    localStorage.setItem('pbq.answers', JSON.stringify(state.answers));
  }

  // Point every fragment container at the resolved language before HTMX
  // auto-processes the page. app.js sits between jquery.min.js and htmx.min.js
  // in index.html precisely so we can rewrite hx-get here.
  document.documentElement.lang = state.lang;
  document.querySelectorAll('[data-hx-frag]').forEach((el) => {
    el.setAttribute('hx-get', `./locales/${state.lang}/${el.dataset.hxFrag}`);
  });

  // ---- Delegated handlers (things HTMX can't do on its own) ----
  $(document.body)
    .on('change', '.question input[type=radio]', function () {
      const q = this.closest('.question');
      state.answers[Number(q.dataset.id)] = Number(this.value);
      saveAnswers();
      writeAnswersToQuery();
      updateProgress();
      hideValidation();
    })
    .on('htmx:after:swap', function (e) {
      // In HTMX 4 `htmx:after:swap` fires on the sourceElement (the trigger).
      // The actual swap destination lives on event.detail.ctx.target.
      const target = e.originalEvent?.detail?.ctx?.target || e.detail?.ctx?.target;
      const id = target && target.id;
      if (id === 'questions') {
        restoreAnswersFromQuery();
        restoreAnswers();
        updateProgress();
        if (window.pbq.__pendingExit) {
          window.pbq.__pendingExit = false;
          const view = document.getElementById('view');
          view.innerHTML = '';
          view.hidden = true;
          document.getElementById('app').hidden = false;
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else if (id === 'progress-view') {
        updateProgress();
      } else if (id === 'header-view') {
        const sel = document.getElementById('lang-select');
        if (sel) sel.value = state.lang;
      } else if (id === 'view') {
        window.pbq.renderResults();
      }
    });

  function restoreAnswers() {
    for (const [id, v] of Object.entries(state.answers)) {
      const inp = document.querySelector(
        `.question[data-id="${id}"] input[value="${v}"]`
      );
      if (inp) inp.checked = true;
    }
  }

  function restoreAnswersFromQuery() {
    const answers = pbqQueryAnswers.read(getQuestions());
    if (!answers) return;

    state.answers = answers;
    saveAnswers();
  }

  function writeAnswersToQuery() {
    const questions = getQuestions();
    pbqQueryAnswers.write(state.answers, questions);
  }

  function getQuestions() {
    return [...document.querySelectorAll('.question')];
  }

  function updateProgress() {
    const label = document.querySelector('.answered-count');
    const questions = document.querySelectorAll('.question');
    const total = questions.length;
    if (!label || total === 0) return;
    const answered = [...questions].filter((q) =>
      q.querySelector('input[type=radio]:checked')
    ).length;
    const tpl = label.dataset.tpl || '{answered} of {total} answered';
    label.textContent = tpl
      .replace('{answered}', answered)
      .replace('{total}', total);
    const bar = document.querySelector('.progress-bar > div');
    if (bar) bar.style.width = `${(answered / total) * 100}%`;
  }

  function hideValidation() {
    const el = document.querySelector('.validation');
    if (el) {
      el.hidden = true;
      el.style.display = 'none';
    }
  }

  // ---- Public API used by hx-on:* attributes in the pre-built fragments ----
  window.pbq = {
    setLang(newLang) {
      if (!newLang || newLang === state.lang) return;
      state.lang = newLang;
      localStorage.setItem('pbq.lang', newLang);
      document.documentElement.lang = newLang;
      document.querySelectorAll('[data-hx-frag]').forEach((el) => {
        el.setAttribute('hx-get', `./locales/${newLang}/${el.dataset.hxFrag}`);
        htmx.process(el);
      });
      htmx.trigger(document.body, 'langchange');
    },

    validate(event) {
      const questions = document.querySelectorAll('.question');
      const missing = [...questions].filter(
        (q) => !q.querySelector('input[type=radio]:checked')
      );
      if (missing.length === 0) return true;
      const el = document.querySelector('.validation');
      if (el) {
        const tpl = el.dataset.tpl || '{count} questions still need an answer.';
        el.textContent = tpl.replace('{count}', missing.length);
        el.hidden = false;
        el.style.display = '';
      }
      missing[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      event.preventDefault();
      return false;
    },

    renderResults() {
      const view = document.getElementById('view');
      const shell = view.querySelector('.results');
      if (!shell) return;

      const scaleLabels = parseJsonAttr(shell.dataset.scaleLabels, {});
      const noData = shell.dataset.nodata || '—';

      const sums = {}, counts = {};
      SCALE_ORDER.forEach((s) => {
        sums[s] = 0;
        counts[s] = 0;
      });

      document.querySelectorAll('.question').forEach((q) => {
        const id = Number(q.dataset.id);
        const scale = q.dataset.scale;
        const chk = q.querySelector('input[type=radio]:checked');
        if (!chk) return;
        const v = Number(chk.value);
        if (SCALE_ORDER.includes(scale)) {
          sums[scale] += v;
          counts[scale] += 1;
        }
        if (q.dataset.borderline === '1') {
          sums.borderline += v;
          counts.borderline += 1;
        }
      });

      const rows = SCALE_ORDER.map((scale) => {
        const n = NORMS[scale];
        const raw = sums[scale];
        const z = (raw - n.mean) / n.sd;
        return {
          scale,
          raw,
          maxRaw: counts[scale] * 4,
          z: Number.isFinite(z) ? z : null,
          refPd: n.refPd,
          refNoPd: n.refNoPd
        };
      });

      const $tbody = $('#view tbody').empty();
      const CELL = 'px-1.5 py-2 border-b border-border';
      const NUM = `${CELL} text-right tabular-nums`;
      rows.forEach((r) => {
        const pct = r.maxRaw > 0 ? (r.raw / r.maxRaw) * 100 : 0;
        $tbody.append(
          $('<tr></tr>')
            .append($(`<td class="${CELL}"></td>`).text(scaleLabels[r.scale] || r.scale))
            .append(
              $(`<td class="${NUM} min-w-[120px]"></td>`)
                .append($('<div></div>').text(`${r.raw} / ${r.maxRaw}`))
                .append(
                  $('<div class="relative h-2 bg-surface-alt rounded-full overflow-hidden mt-1"></div>').append(
                    $('<div class="h-full bg-accent"></div>').css('width', `${pct}%`)
                  )
                )
            )
            .append($(`<td class="${NUM}"></td>`).text(r.z == null ? '—' : r.z.toFixed(2)))
            .append(
              $(`<td class="${NUM}"></td>`).text(r.refPd == null ? noData : r.refPd.toFixed(2))
            )
            .append(
              $(`<td class="${NUM}"></td>`).text(r.refNoPd == null ? noData : r.refNoPd.toFixed(2))
            )
        );
      });

      // Cache what download() needs so we don't recompute later.
      window.pbq.__lastRows = rows;

      document.getElementById('app').hidden = true;
      view.hidden = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    clearAnswers() {
      state.answers = {};
      localStorage.removeItem('pbq.answers');
      writeAnswersToQuery();
      hideValidation();
    },

    exitResults() {
      // Called from an hx-on:click before HTMX fires its own request.
      // We must NOT empty #view here — the click's source button lives inside
      // it, and detaching mid-flight breaks htmx:after:swap bubbling.
      // Cleanup happens in the after:swap handler once #questions has loaded.
      window.pbq.__pendingExit = true;
      window.pbq.clearAnswers();
    },

    download() {
      const rows = window.pbq.__lastRows || [];
      const payload = {
        completedAt: new Date().toISOString(),
        lang: state.lang,
        answers: state.answers,
        scores: rows
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pbq-results.json';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  function parseJsonAttr(str, fallback) {
    if (!str) return fallback;
    try {
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  }
})(jQuery);
