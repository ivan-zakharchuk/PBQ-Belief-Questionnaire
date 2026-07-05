/* global jQuery, htmx, pbqStorage, pbqMetadata, pbqQueryAnswers, pbqRadioNav, pbqResults */
// Coordinates HTMX fragments and delegates focused behavior to small helpers.
(function ($) {
  'use strict';

  const SUPPORTED = Array.isArray(window.PBQ_LANGS) && window.PBQ_LANGS.length
    ? window.PBQ_LANGS
    : ['en'];

  const state = {
    lang: readLang(),
    answers: pbqStorage.readJson(pbqStorage.keys.answers, {}),
    metadata: pbqMetadata.read()
  };
  pbqMetadata.save(state.metadata);

  function readLang() {
    const stored = localStorage.getItem(pbqStorage.keys.lang);
    if (stored && SUPPORTED.includes(stored)) return stored;
    const browser = (navigator.language || 'en').split('-')[0];
    if (SUPPORTED.includes(browser)) return browser;
    return SUPPORTED.includes('en') ? 'en' : SUPPORTED[0];
  }

  document.documentElement.lang = state.lang;
  document.querySelectorAll('[data-hx-frag]').forEach((el) => {
    el.setAttribute('hx-get', `./locales/${state.lang}/${el.dataset.hxFrag}`);
  });

  $(document.body)
    .on('change', '.question input[type=radio]', function () {
      const q = this.closest('.question');
      state.answers[Number(q.dataset.id)] = Number(this.value);
      saveAnswers();
      writeAnswersToQuery();
      updateProgress();
      hideValidation();
    })
    .on('keydown', '.question input[type=radio]', function (e) {
      pbqRadioNav.handle(this, e);
    })
    .on('input', '.metadata-input', function () {
      state.metadata[this.dataset.metaField] = pbqMetadata.readInput(this);
      pbqMetadata.save(state.metadata);
      pbqMetadata.writeToQuery(state.metadata);
    })
    .on('htmx:after:swap', function (e) {
      const target = e.originalEvent?.detail?.ctx?.target || e.detail?.ctx?.target;
      handleSwap(target && target.id);
    });

  window.addEventListener('scroll', updateScrollTopButtons, { passive: true });
  updateScrollTopButtons();

  function handleSwap(id) {
    if (id === 'questions') {
      restoreAnswersFromQuery();
      restoreAnswers();
      updateProgress();
      if (window.pbq.__pendingExit) exitResultsView();
    } else if (id === 'progress-view') {
      updateProgress();
    } else if (id === 'legend-view') {
      updateScrollTopButtons();
    } else if (id === 'header-view') {
      restoreHeader();
    } else if (id === 'view') {
      window.pbq.renderResults();
    }
  }

  function restoreHeader() {
    const sel = document.getElementById('lang-select');
    if (sel) sel.value = state.lang;
    pbqMetadata.restoreInputs(state.metadata);
  }

  function exitResultsView() {
    window.pbq.__pendingExit = false;
    const view = document.getElementById('view');
    view.innerHTML = '';
    view.hidden = true;
    document.getElementById('app').hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function saveAnswers() {
    pbqStorage.writeJson(pbqStorage.keys.answers, state.answers);
  }

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
    pbqQueryAnswers.write(state.answers, getQuestions());
  }

  function getQuestions() {
    return [...document.querySelectorAll('.question')];
  }

  function updateProgress() {
    const label = document.querySelector('.answered-count');
    const questions = getQuestions();
    const total = questions.length;
    if (!label || total === 0) return;

    const answered = questions.filter((q) =>
      q.querySelector('input[type=radio]:checked')
    ).length;
    label.textContent = (label.dataset.tpl || '{answered} of {total} answered')
      .replace('{answered}', answered)
      .replace('{total}', total);

    const bar = document.querySelector('.progress-bar > div');
    if (bar) bar.style.width = `${(answered / total) * 100}%`;
  }

  function hideValidation() {
    const el = document.querySelector('.validation');
    if (!el) return;
    el.hidden = true;
    el.style.display = 'none';
  }

  function updateScrollTopButtons() {
    const show = window.scrollY > 240;
    document.querySelectorAll('.scroll-top-button').forEach((button) => {
      button.hidden = !show;
    });
  }

  window.pbq = {
    setLang(newLang) {
      if (!newLang || newLang === state.lang) return;
      state.lang = newLang;
      localStorage.setItem(pbqStorage.keys.lang, newLang);
      document.documentElement.lang = newLang;
      document.querySelectorAll('[data-hx-frag]').forEach((el) => {
        el.setAttribute('hx-get', `./locales/${newLang}/${el.dataset.hxFrag}`);
        htmx.process(el);
      });
      htmx.trigger(document.body, 'langchange');
    },

    validate(event) {
      const missing = getQuestions().filter(
        (q) => !q.querySelector('input[type=radio]:checked')
      );
      if (missing.length === 0) return true;

      const el = document.querySelector('.validation');
      if (el) {
        el.textContent = (el.dataset.tpl || '{count} questions still need an answer.')
          .replace('{count}', missing.length);
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

      window.pbq.__lastRows = pbqResults.render({
        questions: getQuestions(),
        scaleLabels: parseJsonAttr(shell.dataset.scaleLabels, {}),
        noData: shell.dataset.nodata || '—'
      });

      document.getElementById('app').hidden = true;
      view.hidden = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    clearAnswers() {
      state.answers = {};
      localStorage.removeItem(pbqStorage.keys.answers);
      writeAnswersToQuery();
      hideValidation();
    },

    exitResults() {
      window.pbq.__pendingExit = true;
      window.pbq.clearAnswers();
    },

    download() {
      const payload = {
        completedAt: new Date().toISOString(),
        lang: state.lang,
        metadata: state.metadata,
        answers: state.answers,
        scores: window.pbq.__lastRows || []
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
    },

    scrollToTop() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
