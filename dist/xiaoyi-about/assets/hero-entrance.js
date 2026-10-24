(() => {
  'use strict';
  const root = document.documentElement;
  const hero = document.querySelector('#top.hero');
  const portrait = hero?.querySelector('.hero-photo');
  const image = portrait?.querySelector('img');
  const title = hero?.querySelector('#hero-title');
  if (!hero || !portrait || !image || !title) {
    root.classList.remove('hero-entrance-pending');
    return;
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  title.querySelectorAll(':scope > span').forEach((letter, index) => {
    letter.dataset.glyph = letter.textContent;
    letter.style.setProperty('--glyph-index', index);
  });
  const duration = 1950; // Same gathering rhythm as Xiaoteng's portrait.
  let frame = 0, started = 0, lastPaint = 0, near = false, played = false;
  let context, canvas, groups = [], width = 0, height = 0, prepared = false;
  let preparation;
  const finish = () => {
    cancelAnimationFrame(frame); frame = 0;
    root.classList.remove('hero-entrance-pending');
    hero.classList.remove('hero-entrance-playing');
    hero.classList.add('hero-portrait-resolved', 'hero-entrance-finished');
    hero.dataset.entranceState = 'finished';
    context?.clearRect(0, 0, width, height);
  };
  const prepare = () => {
    try {
      const bounds = portrait.getBoundingClientRect();
      width = bounds.width; height = bounds.height;
      if (!width || !height || !image.naturalWidth) return false;
      const step = Math.max(7, Math.sqrt(width * height / 2600));
      const sample = document.createElement('canvas');
      sample.width = Math.ceil(width / step); sample.height = Math.ceil(height / step);
      const reader = sample.getContext('2d', { willReadFrequently: true });
      if (!reader) return false;
      // Sample the original image in its existing contain / center-bottom frame.
      // No mirroring, recoloring, replacement portrait or permanent crop.
      const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
      const iw = image.naturalWidth * scale, ih = image.naturalHeight * scale;
      reader.setTransform(sample.width / width, 0, 0, sample.height / height, 0, 0);
      reader.drawImage(image, (width - iw) / 2, height - ih, iw, ih);
      const pixels = reader.getImageData(0, 0, sample.width, sample.height).data;
      const palette = new Map();
      let seed = 194073;
      const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      for (let y = 0; y < sample.height; y++) for (let x = 0; x < sample.width; x++) {
        const offset = (y * sample.width + x) * 4;
        const r = pixels[offset], g = pixels[offset + 1], b = pixels[offset + 2];
        if (pixels[offset + 3] < 150) continue;
        // Omit the orange photographic backdrop from the temporary grains.
        if (r > g * 1.8 && g > b * 1.35) continue;
        const tx = (x + .5) / sample.width * width, ty = (y + .5) / sample.height * height;
        const angle = random() * Math.PI * 2, radius = 45 + random() * 165;
        const color = `rgb(${Math.min(255, Math.round(r / 24) * 24)} ${Math.min(255, Math.round(g / 24) * 24)} ${Math.min(255, Math.round(b / 24) * 24)})`;
        if (!palette.has(color)) palette.set(color, []);
        palette.get(color).push({ x: tx, y: ty, sx: tx + Math.cos(angle) * radius, sy: ty + Math.sin(angle) * radius, bend: (random() - .5) * 60, delay: random() * .16, size: 3.2 + random() * 3.8 });
      }
      groups = [...palette.entries()];
      if (!groups.length) return false;
      canvas = document.createElement('canvas'); canvas.className = 'hero-portrait-grains';
      canvas.setAttribute('aria-hidden', 'true'); portrait.append(canvas);
      const ratio = Math.min(devicePixelRatio || 1, 1.5);
      canvas.width = Math.ceil(width * ratio); canvas.height = Math.ceil(height * ratio);
      context = canvas.getContext('2d', { alpha: true });
      if (!context) { canvas.remove(); return false; }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      hero.dataset.particleCount = String(groups.reduce((sum, [, particles]) => sum + particles.length, 0));
      prepared = true;
      return true;
    } catch { return false; }
  };
  const tick = now => {
    if (document.hidden || reduced.matches || root.classList.contains('page-editing')) { finish(); return; }
    const progress = Math.min(1, (now - started) / duration);
    if (now - lastPaint >= 30 || progress === 1) {
      lastPaint = now;
      if (context) {
        context.clearRect(0, 0, width, height);
        const reveal = Math.max(0, Math.min(1, (progress - .65) / .3));
        context.globalAlpha = Math.min(1, progress * 7) * (1 - reveal);
        for (const [color, particles] of groups) {
          context.fillStyle = color; context.beginPath();
          for (const particle of particles) {
            const local = Math.max(0, Math.min(1, (progress - particle.delay) / .66));
            if (!local) continue;
            const ease = 1 - Math.pow(1 - local, 3), curl = Math.sin(local * Math.PI) * particle.bend;
            const x = particle.sx + (particle.x - particle.sx) * ease + curl;
            const y = particle.sy + (particle.y - particle.sy) * ease;
            const size = particle.size * Math.min(1, local * 5);
            context.rect(x - size / 2, y - size / 2, size, size);
          }
          context.fill();
        }
      }
      if (progress >= .65) hero.classList.add('hero-portrait-resolved');
    }
    if (progress < 1) frame = requestAnimationFrame(tick); else finish();
  };
  const play = () => {
    if (played || !near || document.hidden || root.classList.contains('ticket-intro-ready')) return;
    if (reduced.matches || root.classList.contains('page-editing')) { played = true; finish(); return; }
    if (!image.complete) return;
    if (!image.naturalWidth) { played = true; finish(); return; }
    if (!prepared && !prepare()) { played = true; finish(); return; }
    played = true;
    root.classList.remove('hero-entrance-pending');
    hero.classList.remove('hero-entrance-finished', 'hero-portrait-resolved');
    hero.classList.add('hero-entrance-playing');
    hero.dataset.entranceState = 'assembling';
    started = performance.now(); lastPaint = 0;
    frame = requestAnimationFrame(tick);
  };
  const ready = () => {
    // Font readiness keeps the split glyphs aligned with the original title.
    preparation = Promise.all([image.decode?.().catch(() => {}), document.fonts?.ready]);
    preparation.then(play).catch(finish);
  };
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    near = entries[0].isIntersecting;
    if (near) { if (preparation) preparation.then(play); }
    else if (frame) finish();
  }, { threshold: .15 }).observe(portrait);
  else near = true;
  document.addEventListener('xiaoyi:cover-enter', () => { if (preparation) preparation.then(play); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && frame) finish();
    else if (!document.hidden && preparation) preparation.then(play);
  });
  addEventListener('resize', () => { if (frame) finish(); });
  image.addEventListener('error', finish, { once: true });
  reduced.addEventListener('change', () => { if (reduced.matches) { played = true; finish(); } });
  if (reduced.matches) { played = true; finish(); }
  else if (image.complete) ready();
  else image.addEventListener('load', ready, { once: true });
})();
