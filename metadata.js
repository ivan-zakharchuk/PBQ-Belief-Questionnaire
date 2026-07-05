import { keys, readJson, writeJson } from './storage.js';

const FIELDS = ['name', 'date'];
const STORED_DATE_RE = /^\d{2}-\d{2}-\d{4}$/;
const INPUT_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function read() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = Object.fromEntries(
    FIELDS.map((field) => [field, params.get(field) || ''])
  );
  const source = Object.values(fromQuery).some(Boolean)
    ? fromQuery
    : readJson(keys.metadata, {});
  return normalize(source);
}

export function save(metadata) {
  writeJson(keys.metadata, metadata);
}

export function restoreInputs(metadata) {
  document.querySelectorAll('.metadata-input').forEach((input) => {
    writeInput(input, metadata[input.dataset.metaField] || '');
  });
}

export function writeToQuery(metadata) {
  const url = new URL(window.location.href);
  FIELDS.forEach((key) => {
    const value = metadata[key] || '';
    if (value) {
      url.searchParams.set(key, value);
    } else {
      url.searchParams.delete(key);
    }
  });
  window.history.replaceState(null, '', url);
}

export function readInput(input) {
  return input.type === 'date' ? dateInputToStored(input.value) : input.value;
}

function normalize(metadata) {
  return {
    ...metadata,
    date: normalizeStoredDate(metadata.date) || todayStoredDate()
  };
}

function writeInput(input, value) {
  input.value = input.type === 'date' ? storedDateToInput(value) : value;
}

function todayStoredDate() {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${d.getFullYear()}`;
}

function normalizeStoredDate(value) {
  if (STORED_DATE_RE.test(value || '')) return value;
  if (INPUT_DATE_RE.test(value || '')) return dateInputToStored(value);
  return '';
}

function dateInputToStored(value) {
  if (!INPUT_DATE_RE.test(value || '')) return '';
  const [year, month, day] = value.split('-');
  return `${day}-${month}-${year}`;
}

function storedDateToInput(value) {
  if (!STORED_DATE_RE.test(value || '')) return '';
  const [day, month, year] = value.split('-');
  return `${year}-${month}-${day}`;
}
