/**
 * Tiny inline-SVG sparklines for the dashboard. No deps.
 *
 * Each function returns an HTML string ready to splice into a table cell.
 */

const W = 110;
const H = 28;
const PAD = 2;

const ACC_LINE  = '#4e7848';
const ACC_FILL  = 'rgba(160, 200, 152, 0.28)';
const LAT_LINE  = '#7a4848';

function emptyMark(label) {
  return `<span class="spark-empty" aria-label="${label}: not enough data">—</span>`;
}

/**
 * Rolling-accuracy sparkline. Each point is the % correct in a sliding
 * window ending at attempt i.
 * @param {Array<{correct:boolean}>} attempts  chronological order
 */
export function accuracySparklineSVG(attempts) {
  if (!attempts || attempts.length < 3) return emptyMark('Accuracy');

  const window = Math.min(attempts.length, Math.max(5, Math.round(attempts.length / 6)));
  const points = [];
  for (let i = 0; i < attempts.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = attempts.slice(start, i + 1);
    const acc = slice.filter(a => a.correct).length / slice.length;
    points.push(acc);
  }

  const xStep = points.length > 1 ? (W - PAD * 2) / (points.length - 1) : 0;
  const pts = points.map((p, i) => {
    const x = PAD + i * xStep;
    const y = PAD + (1 - p) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const line = `M ${pts.join(' L ')}`;
  const area = `${line} L ${(W - PAD).toFixed(1)},${(H - PAD).toFixed(1)} L ${PAD},${(H - PAD).toFixed(1)} Z`;
  const last = points[points.length - 1];
  const lastX = (PAD + (points.length - 1) * xStep).toFixed(1);
  const lastY = (PAD + (1 - last) * (H - PAD * 2)).toFixed(1);

  return `<svg viewBox="0 0 ${W} ${H}" class="spark spark-accuracy" preserveAspectRatio="none"
                role="img" aria-label="Accuracy trend: ${Math.round(last * 100)}% recent">
    <path d="${area}" fill="${ACC_FILL}"/>
    <path d="${line}" stroke="${ACC_LINE}" stroke-width="1.4" fill="none" stroke-linejoin="round"/>
    <circle cx="${lastX}" cy="${lastY}" r="2" fill="${ACC_LINE}"/>
  </svg>`;
}

/**
 * Raw-latency sparkline. Auto-scaled to min/max of provided values.
 * @param {Array<{latencyMs:number}>} attempts  chronological order
 */
export function latencySparklineSVG(attempts) {
  if (!attempts || attempts.length < 3) return emptyMark('Latency');

  const values = attempts.map(a => a.latencyMs).filter(v => Number.isFinite(v) && v > 0);
  if (values.length < 3) return emptyMark('Latency');

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);

  const xStep = values.length > 1 ? (W - PAD * 2) / (values.length - 1) : 0;
  const pts = values.map((v, i) => {
    const x = PAD + i * xStep;
    const y = PAD + ((v - min) / range) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const line = `M ${pts.join(' L ')}`;
  const lastX = (PAD + (values.length - 1) * xStep).toFixed(1);
  const lastY = (PAD + ((values[values.length - 1] - min) / range) * (H - PAD * 2)).toFixed(1);

  return `<svg viewBox="0 0 ${W} ${H}" class="spark spark-latency" preserveAspectRatio="none"
                role="img" aria-label="Latency trend">
    <path d="${line}" stroke="${LAT_LINE}" stroke-width="1.4" fill="none" stroke-linejoin="round"/>
    <circle cx="${lastX}" cy="${lastY}" r="2" fill="${LAT_LINE}"/>
  </svg>`;
}
