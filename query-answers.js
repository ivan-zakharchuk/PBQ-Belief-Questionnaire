const QUERY_ANSWERS_KEY = 'answers';
const ANSWER_BITS = 3n;
const UNANSWERED_CODE = 7;
const ANSWER_BASE = 36n;
const ANSWER_DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';

export function read(questions) {
  const encoded = new URLSearchParams(window.location.search).get(QUERY_ANSWERS_KEY);
  if (!encoded) return null;
  return decode(encoded, questions);
}

export function write(answers, questions) {
  if (questions.length === 0) return;

  const url = new URL(window.location.href);
  if (Object.keys(answers).length === 0) {
    url.searchParams.delete(QUERY_ANSWERS_KEY);
  } else {
    url.searchParams.set(QUERY_ANSWERS_KEY, encode(answers, questions));
  }
  window.history.replaceState(null, '', url);
}

export function encode(answers, questions) {
  let mask = 0n;
  questions.forEach((q, index) => {
    const answer = Number(answers[Number(q.dataset.id)]);
    const code = Number.isInteger(answer) && answer >= 0 && answer <= 4
      ? answer
      : UNANSWERED_CODE;
    mask |= BigInt(code) << (ANSWER_BITS * BigInt(index));
  });
  return bigIntToBase(mask, ANSWER_BASE);
}

export function decode(encoded, questions) {
  const mask = baseToBigInt(encoded, ANSWER_BASE);
  if (mask == null) return null;

  const answers = {};
  questions.forEach((q, index) => {
    const code = Number((mask >> (ANSWER_BITS * BigInt(index))) & 7n);
    if (code >= 0 && code <= 4) {
      answers[Number(q.dataset.id)] = code;
    }
  });
  return answers;
}

function bigIntToBase(value, base) {
  if (value === 0n) return '0';
  let out = '';
  let n = value;
  while (n > 0n) {
    out = ANSWER_DIGITS[Number(n % base)] + out;
    n /= base;
  }
  return out;
}

function baseToBigInt(value, base) {
  if (!/^[0-9a-z]+$/i.test(value)) return null;
  let out = 0n;
  for (const char of value.toLowerCase()) {
    const digit = ANSWER_DIGITS.indexOf(char);
    if (digit < 0 || BigInt(digit) >= base) return null;
    out = out * base + BigInt(digit);
  }
  return out;
}
