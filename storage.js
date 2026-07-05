export const keys = {
  lang: 'pbq.lang',
  answers: 'pbq.answers',
  metadata: 'pbq.metadata'
};

export function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

export function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
