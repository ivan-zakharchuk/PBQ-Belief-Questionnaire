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

export function render({ questions, scaleLabels, noData }) {
  const rows = score(questions);
  const $tbody = window.jQuery('#view tbody').empty();
  const CELL = 'px-1.5 py-2 border-b border-border';
  const NUM = `${CELL} text-right tabular-nums`;

  rows.forEach((r) => {
    const pct = r.maxRaw > 0 ? (r.raw / r.maxRaw) * 100 : 0;
    $tbody.append(
      window.jQuery('<tr></tr>')
        .append(window.jQuery(`<td class="${CELL}"></td>`).text(scaleLabels[r.scale] || r.scale))
        .append(
          window.jQuery(`<td class="${NUM} min-w-[120px]"></td>`)
            .append(window.jQuery('<div></div>').text(`${r.raw} / ${r.maxRaw}`))
            .append(
              window.jQuery('<div class="relative h-2 bg-surface-alt rounded-full overflow-hidden mt-1"></div>').append(
                window.jQuery('<div class="h-full bg-accent"></div>').css('width', `${pct}%`)
              )
            )
        )
        .append(window.jQuery(`<td class="${NUM}"></td>`).text(r.z == null ? '—' : r.z.toFixed(2)))
        .append(window.jQuery(`<td class="${NUM}"></td>`).text(r.refPd == null ? noData : r.refPd.toFixed(2)))
        .append(window.jQuery(`<td class="${NUM}"></td>`).text(r.refNoPd == null ? noData : r.refNoPd.toFixed(2)))
    );
  });

  return rows;
}

export function score(questions) {
  const sums = {}, counts = {};
  SCALE_ORDER.forEach((s) => {
    sums[s] = 0;
    counts[s] = 0;
  });

  questions.forEach((q) => {
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

  return SCALE_ORDER.map((scale) => {
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
}
