// Shared localStorage helpers and keys.
(function () {
  'use strict';

  const keys = {
    lang: 'pbq.lang',
    answers: 'pbq.answers',
    metadata: 'pbq.metadata'
  };

  function readJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  window.pbqStorage = {
    keys,
    readJson,
    writeJson
  };
})();
