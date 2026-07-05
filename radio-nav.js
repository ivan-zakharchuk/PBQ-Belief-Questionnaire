const KEY_DIRECTIONS = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -1,
  ArrowDown: 1
};

export function handle(input, event) {
  const direction = KEY_DIRECTIONS[event.key];
  if (direction && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault();
    moveWithinQuestion(input, direction);
    return true;
  }
  if (direction && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
    event.preventDefault();
    moveBetweenQuestions(input, direction);
    return true;
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    selectRadio(input);
    return true;
  }
  return false;
}

function moveWithinQuestion(input, direction) {
  const q = input.closest('.question');
  const next = radiosFor(q)[radioIndex(q, input) + direction];
  if (next) selectRadio(next);
}

function moveBetweenQuestions(input, direction) {
  const q = input.closest('.question');
  const questions = [...document.querySelectorAll('.question')];
  const nextQuestion = questions[questions.indexOf(q) + direction];
  if (!nextQuestion) return;

  const next = radiosFor(nextQuestion)[radioIndex(q, input)];
  if (next) next.focus();
}

function radioIndex(q, input) {
  return radiosFor(q).indexOf(input);
}

function radiosFor(q) {
  return [...q.querySelectorAll('input[type=radio]')];
}

function selectRadio(input) {
  input.focus();
  input.checked = true;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}
