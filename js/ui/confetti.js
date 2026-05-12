/**
 * Lightweight canvas confetti — burst of rotating rectangles that fall under
 * gravity and clean up after themselves. No deps.
 */

let enabled = true;

export function setConfettiEnabled(on) { enabled = !!on; }
export function isConfettiEnabled()    { return enabled; }

const DEFAULT_COLORS = [
  '#a0c898', '#4e7848', '#c8b89a', '#786858',
  '#d8a0a0', '#7a4848', '#f4ebd6',
];

/**
 * Fire a celebration burst.
 * @param {Object} [opts]
 * @param {number} [opts.count=110]
 * @param {number} [opts.duration=1900]
 * @param {string[]} [opts.colors]
 * @param {number} [opts.spreadX=0.55]  fraction of viewport width
 * @param {number} [opts.originY=0.32]  fraction of viewport height
 */
export function fireConfetti(opts = {}) {
  if (!enabled) return;
  if (typeof document === 'undefined') return;

  // Respect prefers-reduced-motion — collapse to a single quick puff.
  const reduced = matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const count    = reduced ? 12 : (opts.count ?? 110);
  const duration = reduced ? 600 : (opts.duration ?? 1900);
  const colors   = opts.colors ?? DEFAULT_COLORS;
  const spreadX  = opts.spreadX ?? 0.55;
  const originY  = opts.originY ?? 0.32;

  const canvas = document.createElement('canvas');
  canvas.className = 'confetti-canvas';
  Object.assign(canvas.style, {
    position: 'fixed', inset: '0', width: '100%', height: '100%',
    pointerEvents: 'none', zIndex: '10000',
  });
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = window.innerWidth  * dpr;
  canvas.height = window.innerHeight * dpr;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const W = window.innerWidth;
  const H = window.innerHeight;

  const particles = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x:   W * 0.5 + (Math.random() - 0.5) * W * spreadX,
      y:   H * originY,
      vx:  (Math.random() - 0.5) * 11,
      vy:  -Math.random() * 13 - 4,
      g:   0.38,
      drag: 0.992,
      w:   Math.random() * 8 + 5,
      h:   Math.random() * 4 + 4,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.32,
      color: colors[(Math.random() * colors.length) | 0],
    });
  }

  const startedAt = performance.now();
  let rafId = 0;

  function frame(now) {
    const elapsed = now - startedAt;
    if (elapsed > duration) {
      canvas.remove();
      return;
    }
    ctx.clearRect(0, 0, W, H);
    for (const p of particles) {
      p.vx *= p.drag;
      p.vy = p.vy * p.drag + p.g;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vrot;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      // Fade out in the last 30% of duration.
      const fadeStart = duration * 0.7;
      ctx.globalAlpha = elapsed < fadeStart ? 1 : Math.max(0, 1 - (elapsed - fadeStart) / (duration - fadeStart));
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    rafId = requestAnimationFrame(frame);
  }
  rafId = requestAnimationFrame(frame);
}
